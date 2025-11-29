import mongoose from 'mongoose';

const extensionSchema = new mongoose.Schema({
  // Extension metadata
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  longDescription: String,
  category: {
    type: String,
    enum: ['accounting', 'crm', 'payment', 'communication', 'productivity', 'marketing', 'analytics', 'other'],
    required: true,
    index: true
  },
  icon: String, // URL to icon
  logo: String, // URL to logo
  screenshots: [String],

  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['free', 'freemium', 'paid', 'usage-based'],
      default: 'free'
    },
    price: Number, // Monthly price
    trialDays: Number,
    features: {
      free: [String],
      paid: [String]
    }
  },

  // Developer info
  developer: {
    name: String,
    email: String,
    website: String,
    support: String
  },

  // Integration details
  integration: {
    type: {
      type: String,
      enum: ['oauth', 'api_key', 'webhook', 'embedded'],
      required: true
    },
    oauthConfig: {
      authUrl: String,
      tokenUrl: String,
      scopes: [String],
      clientId: String,
      clientSecret: String
    },
    apiConfig: {
      baseUrl: String,
      authType: String,
      headers: mongoose.Schema.Types.Mixed
    },
    webhookConfig: {
      events: [String],
      endpoint: String,
      secret: String
    },
    requiredFields: [{
      name: String,
      label: String,
      type: String,
      required: Boolean,
      secure: Boolean
    }]
  },

  // Features and capabilities
  features: [String],
  capabilities: {
    sync: Boolean,
    webhook: Boolean,
    realtime: Boolean,
    bidirectional: Boolean
  },

  // Sync configuration
  syncConfig: {
    enabled: Boolean,
    frequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'manual'],
      default: 'manual'
    },
    entities: [{
      type: String,
      enum: ['invoices', 'estimates', 'contacts', 'products', 'payments', 'expenses']
    }],
    direction: {
      type: String,
      enum: ['push', 'pull', 'bidirectional'],
      default: 'bidirectional'
    }
  },

  // Status and availability
  status: {
    type: String,
    enum: ['active', 'beta', 'deprecated', 'maintenance'],
    default: 'active',
    index: true
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Metrics
  stats: {
    installs: {
      type: Number,
      default: 0
    },
    activeInstalls: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },

  // Version control
  version: {
    type: String,
    default: '1.0.0'
  },
  changelog: [{
    version: String,
    date: Date,
    changes: [String]
  }],

  // Documentation
  documentation: {
    setupGuide: String,
    apiDocs: String,
    faq: [{ question: String, answer: String }],
    videoUrl: String
  },

  // Tags for search
  tags: [String]
}, {
  timestamps: true
});

// Indexes
// Note: slug already has a unique index from schema definition
extensionSchema.index({ category: 1, status: 1 });
extensionSchema.index({ isPublished: 1, isFeatured: 1 });
extensionSchema.index({ 'stats.rating': -1 });
extensionSchema.index({ 'stats.installs': -1 });

// User's installed extensions
const userExtensionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  extension: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Extension',
    required: true
  },
  // Installation status
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'pending'],
    default: 'pending',
    index: true
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: Date,

  // Authentication credentials (encrypted)
  credentials: {
    type: mongoose.Schema.Types.Mixed,
    select: false // Don't include by default
  },

  // OAuth tokens
  oauth: {
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: Date,
    tokenType: String,
    scope: [String]
  },

  // Sync status
  syncStatus: {
    lastSyncAt: Date,
    nextSyncAt: Date,
    status: {
      type: String,
      enum: ['idle', 'syncing', 'success', 'error'],
      default: 'idle'
    },
    error: String,
    syncedEntities: [{
      entity: String,
      count: Number,
      lastSyncAt: Date
    }]
  },

  // Configuration
  config: mongoose.Schema.Types.Mixed,

  // Settings customization
  settings: {
    autoSync: {
      type: Boolean,
      default: true
    },
    syncFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'manual'],
      default: 'manual'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    enabledFeatures: [String]
  },

  // Trial and subscription
  trial: {
    isActive: Boolean,
    startDate: Date,
    endDate: Date
  },
  subscription: {
    plan: String,
    status: String,
    startDate: Date,
    renewalDate: Date,
    canceledAt: Date
  },

  // Error tracking (renamed from 'errors' to avoid Mongoose reserved keyword warning)
  errorLogs: [{
    message: String,
    code: String,
    timestamp: Date,
    resolved: Boolean
  }]
}, {
  timestamps: true
});

// Indexes for user extensions
userExtensionSchema.index({ user: 1, extension: 1 }, { unique: true });
userExtensionSchema.index({ user: 1, status: 1 });
userExtensionSchema.index({ 'subscription.status': 1 });

// Methods for user extensions
userExtensionSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

userExtensionSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

userExtensionSchema.methods.updateSyncStatus = function(status, error = null) {
  this.syncStatus.status = status;
  this.syncStatus.lastSyncAt = new Date();
  if (error) {
    this.syncStatus.error = error;
  }
  return this.save();
};

userExtensionSchema.methods.recordError = function(message, code) {
  this.errors.push({
    message,
    code,
    timestamp: new Date(),
    resolved: false
  });

  // Keep only last 50 errors
  if (this.errors.length > 50) {
    this.errors = this.errors.slice(-50);
  }

  return this.save();
};

const Extension = mongoose.model('Extension', extensionSchema);
const UserExtension = mongoose.model('UserExtension', userExtensionSchema);

export { Extension, UserExtension };
