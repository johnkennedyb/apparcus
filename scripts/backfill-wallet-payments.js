import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SupportPayment from '../models/SupportPayment.js';
import SupportRequest from '../models/SupportRequest.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

dotenv.config();

async function backfillWalletPayments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apparcus');
    console.log('Connected to MongoDB');

    // Find all completed payments that haven't been credited to wallets yet
    const completedPayments = await SupportPayment.find({
      paymentStatus: 'completed'
    }).populate({
      path: 'supportRequestId',
      populate: [
        { path: 'requesterId' },
        { path: 'projectId' }
      ]
    });

    console.log(`Found ${completedPayments.length} completed payments to process`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const payment of completedPayments) {
      if (!payment.supportRequestId || !payment.supportRequestId.requesterId) {
        console.log(`Skipping payment ${payment._id} - missing support request or requester`);
        skippedCount++;
        continue;
      }

      const supportRequest = payment.supportRequestId;
      const requesterId = supportRequest.requesterId._id;
      const projectId = supportRequest.projectId ? supportRequest.projectId._id : null;

      // Check if transaction already exists for this payment
      const existingTransaction = await Transaction.findOne({
        paystackReference: payment.paystackReference,
        type: 'credit',
        userId: requesterId
      });

      if (existingTransaction) {
        console.log(`Skipping payment ${payment._id} - transaction already exists`);
        skippedCount++;
        continue;
      }

      // Get or create wallet for the support request owner
      let wallet = await Wallet.findOne({
        userId: requesterId,
        projectId: projectId,
        currency: 'NGN'
      });

      if (!wallet) {
        wallet = new Wallet({
          userId: requesterId,
          projectId: projectId,
          currency: 'NGN',
          balance: 0
        });
        await wallet.save();
        console.log(`Created new wallet for user ${requesterId}`);
      }

      // Credit the wallet
      await wallet.credit(payment.amount);
      console.log(`Credited wallet ${wallet._id} with ₦${payment.amount}. New balance: ₦${wallet.balance}`);

      // Create transaction record
      const transactionRecord = new Transaction({
        userId: requesterId,
        type: 'credit',
        amount: payment.amount,
        description: `Payment received for support request: ${supportRequest.title}`,
        reference: `PAY_${payment.paystackReference}`,
        paystackReference: payment.paystackReference,
        status: 'completed',
        projectId: projectId,
        createdAt: payment.createdAt // Use original payment date
      });
      await transactionRecord.save();
      console.log(`Created transaction record ${transactionRecord._id}`);

      processedCount++;
    }

    console.log(`\nBackfill completed:`);
    console.log(`- Processed: ${processedCount} payments`);
    console.log(`- Skipped: ${skippedCount} payments`);
    console.log(`- Total: ${completedPayments.length} payments`);

    // Display summary of wallet balances
    const wallets = await Wallet.find({}).populate('userId', 'firstName lastName email');
    console.log(`\nWallet Summary:`);
    for (const wallet of wallets) {
      console.log(`- ${wallet.userId.firstName} ${wallet.userId.lastName}: ₦${wallet.balance} (Project: ${wallet.projectId || 'General'})`);
    }

  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the backfill
backfillWalletPayments();
