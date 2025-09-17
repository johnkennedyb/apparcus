import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import SupportPayment from '../models/SupportPayment.js';
import SupportRequest from '../models/SupportRequest.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Paystack payment
router.post('/initialize', [
  body('email').isEmail().normalizeEmail(),
  body('amount').isNumeric().isFloat({ min: 50 }), // Minimum 50 kobo (₦0.50)
  body('supportRequestId').optional().isMongoId(),
  body('donorName').optional().trim().isLength({ min: 1 }),
  body('metadata').optional().isObject()
], authenticate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, amount, supportRequestId, donorName, metadata } = req.body;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return res.status(500).json({
        status: false,
        message: 'Payment service not configured',
        error: 'Missing Paystack API key'
      });
    }

    // Generate unique reference
    const reference = `APPARCUS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare payment payload
    const paymentPayload = {
      email,
      amount: Math.round(amount), // Ensure amount is in kobo
      currency: 'NGN',
      reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/verify`,
      metadata: {
        user_id: req.user._id,
        support_request_id: supportRequestId,
        donor_name: donorName || `${req.user.firstName} ${req.user.lastName}`,
        ...metadata
      }
    };

    console.log('Initializing Paystack payment:', { reference, email, amount });

    // Call Paystack API
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paystackResponse.json();

    if (!paystackResponse.ok || !paymentData.status) {
      console.error('Paystack initialization failed:', paymentData);
      return res.status(400).json({
        status: false,
        message: paymentData.message || 'Payment initialization failed',
        error: paymentData.message
      });
    }

    // Create payment record in database
    if (supportRequestId) {
      const supportPayment = new SupportPayment({
        supportRequestId,
        donorName: donorName || `${req.user.firstName} ${req.user.lastName}`,
        donorEmail: email,
        amount: amount / 100, // Convert kobo to naira for storage
        paystackReference: reference,
        paymentStatus: 'pending'
      });

      await supportPayment.save();
      console.log('Payment record created:', supportPayment._id);
    }

    res.json({
      status: true,
      message: 'Payment initialized successfully',
      data: paymentData.data
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Verify Paystack payment
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return res.status(500).json({
        status: false,
        message: 'Payment service not configured',
        error: 'Missing Paystack API key'
      });
    }

    console.log('Verifying payment:', reference);

    // Verify with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const verificationData = await paystackResponse.json();

    if (!paystackResponse.ok || !verificationData.status) {
      console.error('Paystack verification failed:', verificationData);
      return res.status(400).json({
        status: false,
        message: verificationData.message || 'Payment verification failed',
        error: verificationData.message
      });
    }

    const transaction = verificationData.data;
    console.log('Payment verification successful:', transaction.reference);

    // Update payment record in database
    const supportPayment = await SupportPayment.findOne({ paystackReference: reference });
    
    if (supportPayment) {
      supportPayment.paymentStatus = transaction.status === 'success' ? 'completed' : 'failed';
      await supportPayment.save();

      // If payment is successful and for a support request, update the support request
      if (transaction.status === 'success' && supportPayment.supportRequestId) {
        const supportRequest = await SupportRequest.findById(supportPayment.supportRequestId)
          .populate('projectId')
          .populate('requesterId');
        if (supportRequest) {
          supportRequest.amountRaised = (supportRequest.amountRaised || 0) + supportPayment.amount;
          await supportRequest.save();
          console.log('Support request updated with payment:', supportRequest._id);

          // Credit the support request owner's wallet
          const Wallet = (await import('../models/Wallet.js')).default;
          const Transaction = (await import('../models/Transaction.js')).default;
          
          // Get or create the wallet for the support request owner
          let wallet = await Wallet.findOne({
            userId: supportRequest.requesterId._id,
            projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
            currency: 'NGN'
          });

          if (!wallet) {
            wallet = new Wallet({
              userId: supportRequest.requesterId._id,
              projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
              currency: 'NGN',
              balance: 0
            });
            await wallet.save();
            console.log('Created new wallet for user:', supportRequest.requesterId._id);
          }

          // Credit the wallet
          await wallet.credit(supportPayment.amount);
          console.log('Wallet credited:', wallet._id, 'Amount:', supportPayment.amount, 'New balance:', wallet.balance);

          // Create transaction record
          const transactionRecord = new Transaction({
            userId: supportRequest.requesterId._id,
            type: 'credit',
            amount: supportPayment.amount,
            description: `Payment received for support request: ${supportRequest.title}`,
            reference: `PAY_${reference}`,
            paystackReference: reference,
            status: 'completed',
            projectId: supportRequest.projectId ? supportRequest.projectId._id : null
          });
          await transactionRecord.save();
          console.log('Transaction record created:', transactionRecord._id);

          // Update associated project funding if linked to a project
          if (supportRequest.projectId) {
            const Project = (await import('../models/Project.js')).default;
            const project = await Project.findById(supportRequest.projectId._id);
            if (project) {
              project.currentFunding = (project.currentFunding || 0) + supportPayment.amount;
              
              // Check if project funding goal is reached
              if (project.currentFunding >= project.fundingGoal) {
                project.status = 'completed';
              }
              
              await project.save();
              console.log('Project funding updated:', project._id, 'New amount:', project.currentFunding);
            }
          }
        }
      }
    }

    res.json({
      status: true,
      message: 'Payment verification successful',
      data: {
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
        paid_at: transaction.paid_at,
        customer: transaction.customer,
        metadata: transaction.metadata
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get payment by reference
router.get('/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    
    const payment = await SupportPayment.findOne({ paystackReference: reference })
      .populate('supportRequestId', 'title description amountNeeded')
      .exec();

    if (!payment) {
      return res.status(404).json({
        status: false,
        message: 'Payment not found'
      });
    }

    res.json({
      status: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update payment status (for webhooks or manual updates)
router.put('/:reference/status', [
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled'])
], authenticate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reference } = req.params;
    const { status } = req.body;

    const payment = await SupportPayment.findOne({ paystackReference: reference });
    
    if (!payment) {
      return res.status(404).json({
        status: false,
        message: 'Payment not found'
      });
    }

    payment.paymentStatus = status;
    await payment.save();

    // If payment completed, update support request
    if (status === 'completed' && payment.supportRequestId) {
      const supportRequest = await SupportRequest.findById(payment.supportRequestId)
        .populate('projectId')
        .populate('requesterId');
      if (supportRequest) {
        supportRequest.amountRaised = (supportRequest.amountRaised || 0) + payment.amount;
        await supportRequest.save();

        // Credit the support request owner's wallet
        const Wallet = (await import('../models/Wallet.js')).default;
        const Transaction = (await import('../models/Transaction.js')).default;
        
        // Get or create the wallet for the support request owner
        let wallet = await Wallet.findOne({
          userId: supportRequest.requesterId._id,
          projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
          currency: 'NGN'
        });

        if (!wallet) {
          wallet = new Wallet({
            userId: supportRequest.requesterId._id,
            projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
            currency: 'NGN',
            balance: 0
          });
          await wallet.save();
          console.log('Created new wallet for user via status update:', supportRequest.requesterId._id);
        }

        // Credit the wallet
        await wallet.credit(payment.amount);
        console.log('Wallet credited via status update:', wallet._id, 'Amount:', payment.amount, 'New balance:', wallet.balance);

        // Create transaction record
        const transactionRecord = new Transaction({
          userId: supportRequest.requesterId._id,
          type: 'credit',
          amount: payment.amount,
          description: `Payment received for support request: ${supportRequest.title}`,
          reference: `PAY_${payment.paystackReference}`,
          paystackReference: payment.paystackReference,
          status: 'completed',
          projectId: supportRequest.projectId ? supportRequest.projectId._id : null
        });
        await transactionRecord.save();
        console.log('Transaction record created via status update:', transactionRecord._id);

        // Update associated project funding if linked to a project
        if (supportRequest.projectId) {
          const Project = (await import('../models/Project.js')).default;
          const project = await Project.findById(supportRequest.projectId._id);
          if (project) {
            project.currentFunding = (project.currentFunding || 0) + payment.amount;
            
            // Check if project funding goal is reached
            if (project.currentFunding >= project.fundingGoal) {
              project.status = 'completed';
            }
            
            await project.save();
            console.log('Project funding updated via status update:', project._id, 'New amount:', project.currentFunding);
          }
        }
      }
    }

    res.json({
      status: true,
      message: 'Payment status updated successfully',
      data: payment
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
