import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  paystackReference: {
    type: String,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for better performance
transactionSchema.index({ userId: 1 });
transactionSchema.index({ recipientId: 1 });
transactionSchema.index({ projectId: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ paystackReference: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
