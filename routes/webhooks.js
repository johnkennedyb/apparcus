import express from 'express';
import crypto from 'crypto';
import SupportPayment from '../models/SupportPayment.js';
import SupportRequest from '../models/SupportRequest.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Paystack webhook handler
router.post('/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
    const signature = req.get('x-paystack-signature');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body);
    console.log('Paystack webhook received:', event.event);

    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulPayment(event.data);
        break;
      
      case 'charge.failed':
        await handleFailedPayment(event.data);
        break;
      
      case 'transfer.success':
        await handleSuccessfulTransfer(event.data);
        break;
      
      case 'transfer.failed':
        await handleFailedTransfer(event.data);
        break;
      
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful payment
async function handleSuccessfulPayment(data) {
  try {
    const { reference, amount, customer, metadata } = data;
    
    console.log('Processing successful payment:', reference);

    // Find and update payment record
    const payment = await SupportPayment.findOne({ paystackReference: reference });
    
    if (payment) {
      payment.paymentStatus = 'completed';
      await payment.save();

      // Update support request if applicable
      if (payment.supportRequestId) {
        const supportRequest = await SupportRequest.findById(payment.supportRequestId)
          .populate('projectId');
        if (supportRequest) {
          supportRequest.amountRaised = (supportRequest.amountRaised || 0) + payment.amount;
          
          // Check if funding goal is reached
          if (supportRequest.amountRaised >= supportRequest.amountNeeded) {
            supportRequest.status = 'completed';
          }
          
          await supportRequest.save();
          console.log('Support request updated:', supportRequest._id);

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
              console.log('Project funding updated:', project._id, 'New amount:', project.currentFunding);
            }
          }
        }
      }

      console.log('Payment marked as completed:', payment._id);
    } else {
      console.warn('Payment record not found for reference:', reference);
    }

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

// Handle failed payment
async function handleFailedPayment(data) {
  try {
    const { reference } = data;
    
    console.log('Processing failed payment:', reference);

    // Find and update payment record
    const payment = await SupportPayment.findOne({ paystackReference: reference });
    
    if (payment) {
      payment.paymentStatus = 'failed';
      await payment.save();
      console.log('Payment marked as failed:', payment._id);
    } else {
      console.warn('Payment record not found for reference:', reference);
    }

  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

// Handle successful transfer (for payouts)
async function handleSuccessfulTransfer(data) {
  try {
    const { reference, amount, recipient } = data;
    console.log('Transfer successful:', reference, amount);
    
    // Add logic for handling successful transfers/payouts
    // This could update user wallet balances, transaction records, etc.
    
  } catch (error) {
    console.error('Error handling successful transfer:', error);
    throw error;
  }
}

// Handle failed transfer
async function handleFailedTransfer(data) {
  try {
    const { reference, amount, recipient } = data;
    console.log('Transfer failed:', reference, amount);
    
    // Add logic for handling failed transfers
    // This could notify users, retry transfers, etc.
    
  } catch (error) {
    console.error('Error handling failed transfer:', error);
    throw error;
  }
}

export default router;
