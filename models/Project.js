import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fundingGoal: {
    type: Number,
    required: true,
    min: 0
  },
  currentFunding: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ adminId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'members.userId': 1 });

// Virtual for funding percentage
projectSchema.virtual('fundingPercentage').get(function() {
  return this.fundingGoal > 0 ? (this.currentFunding / this.fundingGoal) * 100 : 0;
});

// Method to add member
projectSchema.methods.addMember = function(userId) {
  const existingMember = this.members.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (!existingMember) {
    this.members.push({ userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove member
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.userId.toString() !== userId.toString()
  );
  return this.save();
};

export default mongoose.model('Project', projectSchema);
