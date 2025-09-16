import mongoose from 'mongoose';

const supportCommentSchema = new mongoose.Schema({
  supportRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportRequest',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
supportCommentSchema.index({ supportRequestId: 1 });
supportCommentSchema.index({ userId: 1 });
supportCommentSchema.index({ createdAt: -1 });

export default mongoose.model('SupportComment', supportCommentSchema);
