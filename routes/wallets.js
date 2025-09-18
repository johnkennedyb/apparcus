import express from 'express';
import { body, validationResult } from 'express-validator';
import Wallet from '../models/Wallet.js';
import TransferRecipient from '../models/TransferRecipient.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

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
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

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

    // Convert amount to kobo for Paystack
    const amountInKobo = Math.round(amount * 100);
    const reference = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let transferRecipient;
    let transferResponse;

    // If Paystack is configured, create real transfer
    if (paystackSecretKey) {
      try {
        // Check if we have a cached recipient for this bank account
        transferRecipient = await TransferRecipient.findOne({
          userId: req.user._id,
          accountNumber,
          bankCode,
          isActive: true
        });

        // Create recipient if not exists
        if (!transferRecipient) {
          console.log('Creating new transfer recipient for user:', req.user._id);
          const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${paystackSecretKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'nuban',
              name: accountName,
              account_number: accountNumber,
              bank_code: bankCode,
              currency: 'NGN'
            })
          });

          const recipientData = await recipientResponse.json();

          if (!recipientResponse.ok || !recipientData.status) {
            throw new Error(recipientData.message || 'Failed to create transfer recipient');
          }

          // Save recipient to database
          transferRecipient = new TransferRecipient({
            userId: req.user._id,
            recipientCode: recipientData.data.recipient_code,
            accountNumber,
            accountName,
            bankCode,
            bankName: recipientData.data.details?.bank_name || 'Unknown Bank',
            paystackData: recipientData.data
          });
          await transferRecipient.save();
          console.log('Transfer recipient created:', transferRecipient.recipientCode);
        }

        // Initiate transfer
        console.log('Initiating Paystack transfer:', reference, amountInKobo);
        const transferResponseRaw = await fetch('https://api.paystack.co/transfer', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: 'balance',
            amount: amountInKobo,
            recipient: transferRecipient.recipientCode,
            reason: `Withdrawal by ${req.user.firstName} ${req.user.lastName}`,
            reference: reference
          })
        });

        transferResponse = await transferResponseRaw.json();

        if (!transferResponseRaw.ok || !transferResponse.status) {
          throw new Error(transferResponse.message || 'Failed to initiate transfer');
        }

        console.log('Paystack transfer initiated successfully:', transferResponse.data.transfer_code);

      } catch (paystackError) {
        console.error('Paystack transfer failed:', paystackError.message);
        return res.status(400).json({ 
          message: `Transfer failed: ${paystackError.message}`,
          error: paystackError.message
        });
      }
    }

    // Deduct amount from wallet (for both real and mock transfers)
    wallet.balance -= amount;
    await wallet.save();

    // Create withdrawal transaction record
    const Transaction = (await import('../models/Transaction.js')).default;
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'debit',
      amount: amount,
      description: `Withdrawal to ${accountName} - ${accountNumber}`,
      status: paystackSecretKey && transferResponse ? 'pending' : 'completed', // Pending for real transfers, completed for mock
      reference: reference,
      paystackReference: transferResponse?.data?.transfer_code || null,
      metadata: {
        bankCode,
        accountNumber,
        accountName,
        withdrawalType: 'bank_transfer',
        transferRecipientId: transferRecipient?._id || null,
        paystackTransferCode: transferResponse?.data?.transfer_code || null,
        isRealTransfer: !!paystackSecretKey
      }
    });
    await transaction.save();

    const responseMessage = paystackSecretKey 
      ? 'Withdrawal initiated successfully. Transfer is being processed.'
      : 'Withdrawal successful (mock transfer)';

    console.log('Withdrawal transaction created:', transaction._id, 'Status:', transaction.status);

    res.json({
      message: responseMessage,
      transaction,
      newBalance: wallet.balance,
      transferCode: transferResponse?.data?.transfer_code || null,
      isRealTransfer: !!paystackSecretKey
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
