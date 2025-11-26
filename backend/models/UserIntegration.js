import mongoose from 'mongoose';

/**
 * UserIntegration Model
 * Stores encrypted user credentials for third-party services
 * Each user can connect their own Twilio, OpenAI, Gmail, Slack, etc.
 */
const userIntegrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  service: {
    type: String,
    enum: [
      'twilio',
      'openai',
      'anthropic',
      'gmail',
      'smtp',
      'slack',
      'quickbooks',
      'stripe',
      'google_calendar',
      'google_sheets',
      'google_contacts',
      'hubspot',
      'salesforce',
      'zapier',
      'make',
      'airtable',
      'shopify'
    ],
    required: true
  },
  // Service-specific credentials (will be encrypted)
  credentials: {
    type: Object,
    required: true
    // Examples:
    // Twilio: { accountSid, authToken, from }
    // OpenAI: { apiKey, organization }
    // Gmail: { accessToken, refreshToken, email }
    // Slack: { webhookUrl, botToken, channelId }
  },
  // Display info
  displayName: String, // e.g., "My Twilio Account", "Work Gmail"

  // Connection status
  enabled: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error', 'pending'],
    default: 'connected'
  },
  lastError: String,

  // OAuth specific fields
  isOAuth: {
    type: Boolean,
    default: false
  },
  tokenExpiresAt: Date,

  // Usage tracking
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date,
  usageCount: {
    type: Number,
    default: 0
  },

  // n8n credential reference
  n8nCredentialId: String, // ID of credential in n8n
  n8nCredentialName: String // Name in n8n (e.g., "twilio-userId")
}, {
  timestamps: true
});

// Compound index for unique service per user
userIntegrationSchema.index({ userId: 1, service: 1 }, { unique: true });

// Encrypt sensitive credentials field
// Note: We'll use basic encryption here. For production, use mongoose-field-encryption
// or encrypt-decrypt library with proper key management
userIntegrationSchema.pre('save', function(next) {
  if (this.isModified('credentials')) {
    // Basic encryption placeholder
    // In production, implement proper encryption:
    // this.credentials = encrypt(JSON.stringify(this.credentials), process.env.ENCRYPTION_SECRET);
  }
  next();
});

// Method to check if OAuth token needs refresh
userIntegrationSchema.methods.needsTokenRefresh = function() {
  if (!this.isOAuth || !this.tokenExpiresAt) return false;
  return new Date() >= new Date(this.tokenExpiresAt - 5 * 60 * 1000); // 5 min buffer
};

// Method to increment usage
userIntegrationSchema.methods.recordUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  await this.save();
};

// Static method to get user's credential for a service
userIntegrationSchema.statics.getUserCredential = async function(userId, service) {
  return await this.findOne({ userId, service, enabled: true, status: 'connected' });
};

// Static method to get all user's integrations
userIntegrationSchema.statics.getUserIntegrations = async function(userId) {
  return await this.find({ userId }).sort({ createdAt: -1 });
};

const UserIntegration = mongoose.model('UserIntegration', userIntegrationSchema);

export default UserIntegration;
