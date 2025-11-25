import mongoose from 'mongoose';

const pushTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  },
  pushToken: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  deviceInfo: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
pushTokenSchema.index({ userId: 1, isActive: 1 });
pushTokenSchema.index({ pushToken: 1 });

// Update lastUsed when token is used
pushTokenSchema.methods.markAsUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Deactivate token
pushTokenSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

const PushToken = mongoose.model('PushToken', pushTokenSchema);

export default PushToken;
