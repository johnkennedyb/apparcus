import mongoose from 'mongoose';

const supportRequestSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amountNeeded: {
    type: Number,
    required: true,
    min: 0
  },
  amountRaised: {
    type: Number,
    default: 0,
    min: 0
  },
  mediaUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  customColumns: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
supportRequestSchema.index({ requesterId: 1 });
supportRequestSchema.index({ projectId: 1 });
supportRequestSchema.index({ status: 1 });
supportRequestSchema.index({ createdAt: -1 });

// Virtual for funding percentage
supportRequestSchema.virtual('fundingPercentage').get(function() {
  return this.amountNeeded > 0 ? (this.amountRaised / this.amountNeeded) * 100 : 0;
});

export default mongoose.model('SupportRequest', supportRequestSchema);
