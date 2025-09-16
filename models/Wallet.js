import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN',
    uppercase: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique wallet per user-project-currency combination
walletSchema.index({ userId: 1, projectId: 1, currency: 1 }, { unique: true });

// Method to credit wallet
walletSchema.methods.credit = function(amount) {
  this.balance += amount;
  return this.save();
};

// Method to debit wallet
walletSchema.methods.debit = function(amount) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  return this.save();
};

export default mongoose.model('Wallet', walletSchema);
