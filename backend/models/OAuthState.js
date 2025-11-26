import mongoose from 'mongoose';

const OAuthStateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  service: {
    type: String,
    enum: ['google', 'quickbooks', 'shopify', 'slack', 'facebook'],
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'error'],
    default: 'pending'
  },
  extended: {
    type: Boolean,
    default: false
  },
  result: {
    token: String,
    user: mongoose.Schema.Types.Mixed,
    error: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired documents after 1 hour
OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model('OAuthState', OAuthStateSchema);
