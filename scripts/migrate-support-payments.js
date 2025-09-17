import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SupportRequest from '../models/SupportRequest.js';
import SupportPayment from '../models/SupportPayment.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';

dotenv.config();

async function migrateSupportPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all completed support payments that haven't been credited to wallets
    const completedPayments = await SupportPayment.find({
      paymentStatus: 'completed'
    }).populate({
      path: 'supportRequestId',
      populate: {
        path: 'requesterId projectId'
      }
    });

    console.log(`Found ${completedPayments.length} completed payments to process`);

    for (const payment of completedPayments) {
      const supportRequest = payment.supportRequestId;
      
      if (!supportRequest || !supportRequest.requesterId) {
        console.log(`Skipping payment ${payment._id} - missing support request or requester`);
        continue;
      }

      // Check if transaction already exists for this payment
      const existingTransaction = await Transaction.findOne({
        paystackReference: payment.paystackReference,
        userId: supportRequest.requesterId._id,
        type: 'credit'
      });

      if (existingTransaction) {
        console.log(`Transaction already exists for payment ${payment._id}, skipping`);
        continue;
      }

      // Get or create user's wallet
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
        description: `Support payment received for "${supportRequest.title}" (Migrated)`,
        reference: payment.reference || `SUP_MIGRATED_${Date.now()}`,
        status: 'completed',
        projectId: supportRequest.projectId ? supportRequest.projectId._id : null,
        paystackReference: payment.paystackReference,
        createdAt: payment.createdAt // Use original payment date
      });
      await transaction.save();

      console.log(`✅ Migrated payment ${payment._id}: ₦${payment.amount} credited to wallet ${wallet._id}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the migration
migrateSupportPayments();
