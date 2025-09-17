import express from 'express';
import { body, validationResult } from 'express-validator';
import SupportRequest from '../models/SupportRequest.js';
import SupportComment from '../models/SupportComment.js';
import SupportPayment from '../models/SupportPayment.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get support requests by requester ID (or current user if no requesterId provided)
router.get('/', authenticate, async (req, res) => {
  try {
    const { requesterId } = req.query;
    
    // Use provided requesterId or default to current user's ID
    const targetRequesterId = requesterId || req.user._id;

    console.log('Fetching support requests for user:', targetRequesterId);
    console.log('Current authenticated user:', req.user._id);

    const supportRequests = await SupportRequest.find({ requesterId: targetRequesterId })
      .populate('requesterId', 'firstName lastName email avatarUrl coverPhotoUrl')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    console.log('Found support requests:', supportRequests.length);

    res.json(supportRequests);
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all support requests
router.get('/requests', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, search } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (projectId) query.projectId = projectId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const supportRequests = await SupportRequest.find(query)
      .populate('requesterId', 'firstName lastName email avatarUrl coverPhotoUrl')
      .populate('projectId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await SupportRequest.countDocuments(query);

    res.json({
      supportRequests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get support requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get support request by ID
router.get('/requests/:id', optionalAuth, async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findById(req.params.id)
      .populate('requesterId', 'firstName lastName email avatarUrl coverPhotoUrl')
      .populate('projectId', 'name');
    
    if (!supportRequest) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    res.json({ supportRequest });
  } catch (error) {
    console.error('Get support request by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create support request (root endpoint)
router.post('/', authenticate, [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('amountNeeded').isNumeric().isFloat({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, amountNeeded, projectId, mediaUrl, customColumns } = req.body;

    const supportRequest = new SupportRequest({
      title,
      description,
      amountNeeded,
      projectId: projectId || null,
      requesterId: req.user._id,
      mediaUrl,
      customColumns
    });

    await supportRequest.save();
    await supportRequest.populate('requesterId', 'firstName lastName email avatarUrl coverPhotoUrl');
    await supportRequest.populate('projectId', 'name');

    res.status(201).json({
      message: 'Support request created successfully',
      supportRequest
    });
  } catch (error) {
    console.error('Create support request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create support request (legacy endpoint)
router.post('/requests', authenticate, [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('amountNeeded').isNumeric().isFloat({ min: 0 }),
  body('projectId').optional().isMongoId(),
  body('mediaUrl').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, amountNeeded, projectId, mediaUrl, customColumns } = req.body;

    const supportRequest = new SupportRequest({
      title,
      description,
      amountNeeded,
      projectId: projectId || null,
      requesterId: req.user._id,
      mediaUrl,
      customColumns
    });

    await supportRequest.save();
    await supportRequest.populate('requesterId', 'firstName lastName email');
    await supportRequest.populate('projectId', 'name');

    res.status(201).json({
      message: 'Support request created successfully',
      supportRequest
    });
  } catch (error) {
    console.error('Create support request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update support request
router.put('/requests/:id', authenticate, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim().isLength({ min: 1 }),
  body('amountNeeded').optional().isNumeric().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'completed', 'cancelled']),
  body('mediaUrl').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supportRequest = await SupportRequest.findById(req.params.id);
    
    if (!supportRequest) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    // Check if user is the requester
    if (supportRequest.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this support request' });
    }

    const { title, description, amountNeeded, status, mediaUrl, customColumns } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amountNeeded !== undefined) updateData.amountNeeded = amountNeeded;
    if (status !== undefined) updateData.status = status;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (customColumns !== undefined) updateData.customColumns = customColumns;

    const updatedSupportRequest = await SupportRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('requesterId', 'firstName lastName email avatarUrl coverPhotoUrl')
    .populate('projectId', 'name');

    res.json({
      message: 'Support request updated successfully',
      supportRequest: updatedSupportRequest
    });
  } catch (error) {
    console.error('Update support request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for a support request
router.get('/requests/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const comments = await SupportComment.find({ supportRequestId: req.params.id })
      .populate('userId', 'firstName lastName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await SupportComment.countDocuments({ supportRequestId: req.params.id });

    res.json({
      comments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get support comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to support request
router.post('/requests/:id/comments', authenticate, [
  body('comment').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { comment } = req.body;

    // Check if support request exists
    const supportRequest = await SupportRequest.findById(req.params.id);
    if (!supportRequest) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    const supportComment = new SupportComment({
      supportRequestId: req.params.id,
      userId: req.user._id,
      comment
    });

    await supportComment.save();
    await supportComment.populate('userId', 'firstName lastName email');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: supportComment
    });
  } catch (error) {
    console.error('Add support comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payments for a support request
router.get('/requests/:id/payments', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const payments = await SupportPayment.find({ 
      supportRequestId: req.params.id,
      paymentStatus: 'completed'
    })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

    const total = await SupportPayment.countDocuments({ 
      supportRequestId: req.params.id,
      paymentStatus: 'completed'
    });

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get support payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create support payment
router.post('/requests/:id/payments', [
  body('donorName').trim().isLength({ min: 1 }),
  body('donorEmail').isEmail().normalizeEmail(),
  body('amount').isNumeric().isFloat({ min: 0 }),
  body('paystackReference').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { donorName, donorEmail, amount, paystackReference, customData } = req.body;

    // Check if support request exists
    const supportRequest = await SupportRequest.findById(req.params.id);
    if (!supportRequest) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    // Check if payment with this reference already exists
    const existingPayment = await SupportPayment.findOne({ paystackReference });
    if (existingPayment) {
      return res.status(400).json({ message: 'Payment with this reference already exists' });
    }

    const supportPayment = new SupportPayment({
      supportRequestId: req.params.id,
      donorName,
      donorEmail,
      amount,
      paystackReference,
      customData,
      paymentStatus: 'pending'
    });

    await supportPayment.save();

    res.status(201).json({
      message: 'Support payment created successfully',
      payment: supportPayment
    });
  } catch (error) {
    console.error('Create support payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status (for Paystack webhook)
router.put('/payments/:reference/status', [
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const { reference } = req.params;

    const payment = await SupportPayment.findOne({ paystackReference: reference });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // For cancellations and failures, no verification needed
    if (status === 'cancelled' || status === 'failed') {
      payment.paymentStatus = status;
      await payment.save();
      return res.json({ message: 'Payment status updated', payment });
    }

    // If marking as completed, verify with Paystack first
    if (status === 'completed') {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return res.status(500).json({ message: 'Paystack secret key not configured on server' });
      }

      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
          }
        });

        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok || !verifyData || verifyData.status !== true) {
          return res.status(400).json({ message: 'Unable to verify transaction with Paystack' });
        }

        const data = verifyData.data || {};
        // Basic validations: status, reference, amount, currency
        const amountMatches = Number(data.amount) === Math.round(Number(payment.amount) * 100);
        const currencyMatches = (data.currency || '').toUpperCase() === 'NGN';
        const referenceMatches = (data.reference || '') === reference;
        const statusSuccess = (data.status || '').toLowerCase() === 'success';

        if (!statusSuccess || !referenceMatches || !amountMatches || !currencyMatches) {
          return res.status(400).json({
            message: 'Transaction verification failed: mismatch or unsuccessful status',
            details: {
              status: data.status,
              amount: data.amount,
              currency: data.currency,
              reference: data.reference
            }
          });
        }

        // Mark as completed only after verification
        payment.paymentStatus = 'completed';
        await payment.save();

        const supportRequest = await SupportRequest.findByIdAndUpdate(
          payment.supportRequestId,
          { $inc: { amountRaised: payment.amount } },
          { new: true }
        ).populate('projectId').populate('requesterId');

        // Credit the user's wallet and create transaction record
        if (supportRequest && supportRequest.requesterId) {
          const Wallet = (await import('../models/Wallet.js')).default;
          const Transaction = (await import('../models/Transaction.js')).default;
          
          // Get or create user's wallet (project-specific if linked to project)
          let wallet = await Wallet.findOne({
            userId: supportRequest.requesterId._id,
            projectId: supportRequest.projectId ? supportRequest.projectId._id : null
          });

          if (!wallet) {
            wallet = new Wallet({
              userId: supportRequest.requesterId._id,
              projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
              balance: 0,
              currency: 'NGN'
            });
          }

          // Credit the wallet
          wallet.balance += payment.amount;
          await wallet.save();

          // Create transaction record
          const transaction = new Transaction({
            userId: supportRequest.requesterId._id,
            type: 'credit',
            amount: payment.amount,
            description: `Support payment received for "${supportRequest.title}"`,
            reference: payment.reference || `SUP_${Date.now()}`,
            status: 'completed',
            projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
            paystackReference: payment.paystackReference
          });
          await transaction.save();

          console.log('Wallet credited:', wallet.balance, 'Transaction created:', transaction._id);
        }

        // Update associated project funding if linked to a project
        if (supportRequest && supportRequest.projectId) {
          const Project = (await import('../models/Project.js')).default;
          const project = await Project.findById(supportRequest.projectId._id);
          if (project) {
            project.currentFunding = (project.currentFunding || 0) + payment.amount;
            
            // Check if project funding goal is reached
            if (project.currentFunding >= project.fundingGoal) {
              project.status = 'completed';
            }
            
            await project.save();
            console.log('Project funding updated via support payment verification:', project._id, 'New amount:', project.currentFunding);
          }
        }

        return res.json({ message: 'Payment verified and completed', payment });
      } catch (err) {
        console.error('Paystack verification error:', err);
        return res.status(500).json({ message: 'Verification error' });
      }
    }

    // For pending -> just update status
    payment.paymentStatus = status;
    await payment.save();
    return res.json({ message: 'Payment status updated', payment });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
