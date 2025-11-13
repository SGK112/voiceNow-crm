import mongoose from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

// Utility functions for encryption/decryption
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const integrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  service: {
    type: String,
    enum: [
      'google',
      'gmail',
      'google-calendar',
      'google-sheets',
      'google-drive',
      'slack',
      'microsoft',
      'outlook',
      'teams',
      'hubspot',
      'salesforce',
      'shopify',
      'mailchimp',
      'zoom',
      'calendly',
      'stripe',
      'zapier',
      'custom'
    ],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['connected', 'expired', 'revoked', 'error'],
    default: 'connected'
  },
  credentials: {
    accessToken: {
      type: String,
      required: true
    },
    refreshToken: {
      type: String
    },
    tokenType: {
      type: String,
      default: 'Bearer'
    },
    expiresAt: {
      type: Date
    },
    scope: {
      type: String
    }
  },
  metadata: {
    email: String,
    accountId: String,
    accountName: String,
    workspace: String,
    domain: String,
    userId: String
  },
  scopes: [{
    type: String
  }],
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  lastError: {
    message: String,
    code: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Indexes
integrationSchema.index({ userId: 1, service: 1 });
integrationSchema.index({ userId: 1, status: 1 });
integrationSchema.index({ 'credentials.expiresAt': 1 });

// Pre-save hook to encrypt tokens
integrationSchema.pre('save', function(next) {
  if (this.isModified('credentials.accessToken') && this.credentials.accessToken) {
    // Only encrypt if not already encrypted (doesn't contain ':')
    if (!this.credentials.accessToken.includes(':')) {
      this.credentials.accessToken = encrypt(this.credentials.accessToken);
    }
  }
  if (this.isModified('credentials.refreshToken') && this.credentials.refreshToken) {
    if (!this.credentials.refreshToken.includes(':')) {
      this.credentials.refreshToken = encrypt(this.credentials.refreshToken);
    }
  }
  next();
});

// Method to get decrypted access token
integrationSchema.methods.getAccessToken = function() {
  try {
    return decrypt(this.credentials.accessToken);
  } catch (error) {
    console.error('Failed to decrypt access token:', error);
    return null;
  }
};

// Method to get decrypted refresh token
integrationSchema.methods.getRefreshToken = function() {
  try {
    if (this.credentials.refreshToken) {
      return decrypt(this.credentials.refreshToken);
    }
    return null;
  } catch (error) {
    console.error('Failed to decrypt refresh token:', error);
    return null;
  }
};

// Method to update tokens
integrationSchema.methods.updateTokens = async function(accessToken, refreshToken, expiresIn) {
  this.credentials.accessToken = accessToken; // Will be encrypted by pre-save hook
  if (refreshToken) {
    this.credentials.refreshToken = refreshToken;
  }
  if (expiresIn) {
    this.credentials.expiresAt = new Date(Date.now() + expiresIn * 1000);
  }
  this.status = 'connected';
  this.errorCount = 0;
  this.lastError = undefined;
  await this.save();
};

// Method to check if token is expired
integrationSchema.methods.isExpired = function() {
  if (!this.credentials.expiresAt) {
    return false;
  }
  return new Date() >= this.credentials.expiresAt;
};

// Method to mark as used
integrationSchema.methods.markUsed = async function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  await this.save();
};

// Method to record error
integrationSchema.methods.recordError = async function(error) {
  this.errorCount += 1;
  this.lastError = {
    message: error.message,
    code: error.code || 'UNKNOWN',
    timestamp: new Date()
  };
  if (error.code === 'invalid_grant' || error.code === 'token_revoked') {
    this.status = 'revoked';
  } else {
    this.status = 'error';
  }
  await this.save();
};

// Static method to find or create integration
integrationSchema.statics.findOrCreate = async function(userId, service, data) {
  let integration = await this.findOne({ userId, service });
  if (integration) {
    integration.credentials = data.credentials;
    integration.metadata = { ...integration.metadata, ...data.metadata };
    integration.scopes = data.scopes;
    integration.status = 'connected';
    await integration.save();
  } else {
    integration = await this.create({
      userId,
      service,
      ...data
    });
  }
  return integration;
};

const Integration = mongoose.model('Integration', integrationSchema);

export default Integration;
