import express from 'express';
import { body, validationResult } from 'express-validator';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get user's transactions (for useTransactions hook)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const query = {
      $or: [
        { userId: req.user._id },
        { recipientId: req.user._id }
      ]
    };
    
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')
      .populate('projectId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Return just the transactions array for frontend compatibility
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')
      .populate('projectId', 'name');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user is involved in this transaction
    if (transaction.userId.toString() !== req.user._id.toString() && 
        transaction.recipientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this transaction' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create transaction (credit/debit)
router.post('/', authenticate, [
  body('type').isIn(['credit', 'debit', 'transfer']),
  body('amount').isNumeric().isFloat({ min: 0 }),
  body('description').optional().trim(),
  body('projectId').optional().isMongoId(),
  body('recipientId').optional().isMongoId(),
  body('paystackReference').optional().trim()
], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, amount, description, projectId, recipientId, paystackReference } = req.body;

    // Generate unique reference
    const reference = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction = new Transaction({
      userId: req.user._id,
      type,
      amount,
      description,
      reference,
      projectId: projectId || null,
      recipientId: recipientId || null,
      paystackReference,
      status: 'pending'
    });

    await transaction.save({ session });

    // Handle wallet operations based on transaction type
    if (type === 'credit') {
      // Credit user's wallet
      let wallet = await Wallet.findOne({ 
        userId: req.user._id, 
        projectId: projectId || null 
      }).session(session);

      if (!wallet) {
        wallet = new Wallet({
          userId: req.user._id,
          projectId: projectId || null,
          balance: 0
        });
      }

      wallet.balance += amount;
      await wallet.save({ session });

    } else if (type === 'debit') {
      // Debit user's wallet
      const wallet = await Wallet.findOne({ 
        userId: req.user._id, 
        projectId: projectId || null 
      }).session(session);

      if (!wallet || wallet.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      wallet.balance -= amount;
      await wallet.save({ session });

    } else if (type === 'transfer') {
      if (!recipientId) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Recipient ID required for transfer' });
      }

      // Debit sender's wallet
      const senderWallet = await Wallet.findOne({ 
        userId: req.user._id, 
        projectId: projectId || null 
      }).session(session);

      if (!senderWallet || senderWallet.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      senderWallet.balance -= amount;
      await senderWallet.save({ session });

      // Credit recipient's wallet
      let recipientWallet = await Wallet.findOne({ 
        userId: recipientId, 
        projectId: projectId || null 
      }).session(session);

      if (!recipientWallet) {
        recipientWallet = new Wallet({
          userId: recipientId,
          projectId: projectId || null,
          balance: 0
        });
      }

      recipientWallet.balance += amount;
      await recipientWallet.save({ session });
    }

    // Mark transaction as completed
    transaction.status = 'completed';
    await transaction.save({ session });

    await session.commitTransaction();

    await transaction.populate('userId', 'firstName lastName email');
    await transaction.populate('recipientId', 'firstName lastName email');
    await transaction.populate('projectId', 'name');

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    session.endSession();
  }
});

// Update transaction status (for external payment confirmations)
router.put('/:id/status', authenticate, [
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user owns this transaction
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this transaction' });
    }

    transaction.status = status;
    await transaction.save();

    await transaction.populate('userId', 'firstName lastName email');
    await transaction.populate('recipientId', 'firstName lastName email');
    await transaction.populate('projectId', 'name');

    res.json({
      message: 'Transaction status updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
