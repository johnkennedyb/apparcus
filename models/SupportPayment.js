import mongoose from 'mongoose';

const supportPaymentSchema = new mongoose.Schema({
  supportRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportRequest',
    required: true
  },
  donorName: {
    type: String,
    required: true,
    trim: true
  },
  donorEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paystackReference: {
    type: String,
    required: true,
    unique: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  customData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
supportPaymentSchema.index({ supportRequestId: 1 });
supportPaymentSchema.index({ paystackReference: 1 });
supportPaymentSchema.index({ paymentStatus: 1 });
supportPaymentSchema.index({ createdAt: -1 });

export default mongoose.model('SupportPayment', supportPaymentSchema);
