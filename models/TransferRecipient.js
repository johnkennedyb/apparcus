import mongoose from 'mongoose';

const transferRecipientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientCode: {
    type: String,
    required: true,
    unique: true // Paystack recipient code
  },
  accountNumber: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  bankCode: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  paystackData: {
    type: mongoose.Schema.Types.Mixed, // Store full Paystack response
    default: {}
  }
}, {
  timestamps: true
});

// Index for faster lookups
transferRecipientSchema.index({ userId: 1, accountNumber: 1, bankCode: 1 });
transferRecipientSchema.index({ recipientCode: 1 });

const TransferRecipient = mongoose.model('TransferRecipient', transferRecipientSchema);

export default TransferRecipient;
