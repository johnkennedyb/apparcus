import express from 'express';
import { body, validationResult } from 'express-validator';
import Wallet from '../models/Wallet.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user's main wallet (for useWallet hook)
router.get('/', authenticate, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({
      userId: req.user._id,
      projectId: null // Main wallet has no project
    });

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = new Wallet({
        userId: req.user._id,
        projectId: null,
        currency: 'NGN',
        balance: 0
      });
      await wallet.save();
    }

    res.json(wallet);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's all wallets
router.get('/all', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = { userId: req.user._id };
    
    if (projectId) {
      query.projectId = projectId;
    }

    const wallets = await Wallet.find(query)
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    res.json({ wallets });
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get or create wallet
router.post('/get-or-create', authenticate, [
  body('projectId').optional().isMongoId(),
  body('currency').optional().isLength({ min: 3, max: 3 }).toUpperCase()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, currency = 'NGN' } = req.body;

    let wallet = await Wallet.findOne({
      userId: req.user._id,
      projectId: projectId || null,
      currency
    }).populate('projectId', 'name');

    if (!wallet) {
      wallet = new Wallet({
        userId: req.user._id,
        projectId: projectId || null,
        currency,
        balance: 0
      });
      await wallet.save();
      await wallet.populate('projectId', 'name');
    }

    res.json({
      message: 'Wallet retrieved successfully',
      wallet
    });
  } catch (error) {
    console.error('Get or create wallet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wallet by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id)
      .populate('projectId', 'name');
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Check if user owns this wallet
    if (wallet.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this wallet' });
    }

    res.json({ wallet });
  } catch (error) {
    console.error('Get wallet by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wallet balance
router.get('/:id/balance', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Check if user owns this wallet
    if (wallet.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this wallet' });
    }

    res.json({ 
      balance: wallet.balance,
      currency: wallet.currency
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Withdraw from wallet
router.post('/withdraw', authenticate, [
  body('amount').isNumeric().isFloat({ min: 0.01 }),
  body('bankCode').trim().isLength({ min: 1 }),
  body('accountNumber').trim().isLength({ min: 10, max: 10 }),
  body('accountName').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, bankCode, accountNumber, accountName } = req.body;

    // Get user's main wallet
    const wallet = await Wallet.findOne({
      userId: req.user._id,
      projectId: null
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct amount from wallet
    wallet.balance -= amount;
    await wallet.save();

    // Create withdrawal transaction record
    const Transaction = (await import('../models/Transaction.js')).default;
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'debit',
      amount: amount,
      description: `Withdrawal to ${accountName} - ${accountNumber}`,
      status: 'completed',
      reference: `WD_${Date.now()}`,
      metadata: {
        bankCode,
        accountNumber,
        accountName,
        withdrawalType: 'bank_transfer'
      }
    });
    await transaction.save();

    res.json({
      message: 'Withdrawal successful',
      transaction,
      newBalance: wallet.balance
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
