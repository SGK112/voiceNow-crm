import mongoose from 'mongoose';

const connectedAccountSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: [
      // Social Media
      'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'snapchat', 'youtube',
      // Entertainment
      'spotify', 'apple_music', 'netflix', 'hulu', 'disney_plus', 'amazon_prime',
      // Productivity
      'google', 'microsoft', 'apple', 'dropbox', 'notion',
      // Communication
      'slack', 'discord', 'telegram', 'whatsapp'
    ]
  },
  accountId: String,
  accountName: String,
  accountEmail: String,
  accessToken: String, // Encrypted
  refreshToken: String, // Encrypted
  tokenExpiry: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [String],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSync: Date
});

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: 'default'
  },

  // Personal Information
  personalInfo: {
    firstName: String,
    lastName: String,
    fullName: String,
    displayName: String,
    email: {
      type: String,
      lowercase: true
    },
    phone: String,
    dateOfBirth: Date,
    profilePicture: String,
    bio: String,
    timezone: {
      type: String,
      default: 'America/Denver'
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  // Contact Preferences
  contactPreferences: {
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'sms', 'notification'],
      default: 'notification'
    },
    allowCalls: {
      type: Boolean,
      default: true
    },
    allowSMS: {
      type: Boolean,
      default: true
    },
    allowEmail: {
      type: Boolean,
      default: true
    },
    allowNotifications: {
      type: Boolean,
      default: true
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      start: String, // "22:00"
      end: String // "08:00"
    }
  },

  // Connected Accounts
  connectedAccounts: [connectedAccountSchema],

  // Device Access Permissions
  permissions: {
    contacts: {
      granted: {
        type: Boolean,
        default: false
      },
      grantedAt: Date,
      lastSync: Date,
      contactCount: {
        type: Number,
        default: 0
      }
    },
    calendar: {
      granted: {
        type: Boolean,
        default: false
      },
      grantedAt: Date,
      lastSync: Date,
      calendars: [String] // Array of calendar IDs
    },
    callLog: {
      granted: {
        type: Boolean,
        default: false
      },
      grantedAt: Date,
      lastSync: Date
    },
    sms: {
      granted: {
        type: Boolean,
        default: false
      },
      grantedAt: Date,
      lastSync: Date
    },
    location: {
      granted: {
        type: Boolean,
        default: false
      },
      grantedAt: Date
    }
  },

  // Aria Preferences
  ariaPreferences: {
    voiceStyle: {
      type: String,
      enum: ['professional', 'friendly', 'casual', 'energetic'],
      default: 'friendly'
    },
    responseLength: {
      type: String,
      enum: ['concise', 'normal', 'detailed'],
      default: 'normal'
    },
    personality: {
      type: String,
      enum: ['helpful', 'witty', 'empathetic', 'direct'],
      default: 'helpful'
    },
    autoCallBack: {
      enabled: {
        type: Boolean,
        default: false
      },
      delayMinutes: {
        type: Number,
        default: 5
      },
      maxAttempts: {
        type: Number,
        default: 2
      }
    },
    interactiveVoicemail: {
      enabled: {
        type: Boolean,
        default: false
      },
      greeting: String,
      captureIntent: {
        type: Boolean,
        default: true
      },
      transcribeMessage: {
        type: Boolean,
        default: true
      },
      smartResponse: {
        type: Boolean,
        default: true
      }
    },
    learningMode: {
      enabled: {
        type: Boolean,
        default: true
      },
      storeConversations: {
        type: Boolean,
        default: true
      },
      personalizeResponses: {
        type: Boolean,
        default: true
      }
    }
  },

  // Work/Business Information
  workInfo: {
    company: String,
    position: String,
    industry: String,
    workEmail: String,
    workPhone: String,
    workHours: {
      start: String,
      end: String,
      timezone: String
    },
    workDays: [String] // ['monday', 'tuesday', ...]
  },

  // Interests and Preferences
  interests: {
    topics: [String], // Array of topics user is interested in
    hobbies: [String],
    favoriteApps: [String],
    newsPreferences: [String],
    musicGenres: [String],
    movieGenres: [String]
  },

  // Usage Stats
  stats: {
    totalConversations: {
      type: Number,
      default: 0
    },
    totalCallsHandled: {
      type: Number,
      default: 0
    },
    totalMessagesProcessed: {
      type: Number,
      default: 0
    },
    lastActiveAt: Date,
    accountCreatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Privacy Settings
  privacy: {
    shareDataForImprovement: {
      type: Boolean,
      default: true
    },
    storeVoiceRecordings: {
      type: Boolean,
      default: false
    },
    allowThirdPartyIntegrations: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes
userProfileSchema.index({ 'personalInfo.email': 1 });
userProfileSchema.index({ 'personalInfo.phone': 1 });
userProfileSchema.index({ 'stats.lastActiveAt': -1 });

// Methods

/**
 * Get user's full profile with all connected accounts
 */
userProfileSchema.methods.getFullProfile = function() {
  return {
    userId: this.userId,
    personalInfo: this.personalInfo,
    contactPreferences: this.contactPreferences,
    connectedAccounts: this.connectedAccounts.filter(acc => acc.isActive).map(acc => ({
      provider: acc.provider,
      accountName: acc.accountName,
      accountEmail: acc.accountEmail,
      permissions: acc.permissions,
      connectedAt: acc.connectedAt,
      lastSync: acc.lastSync
    })),
    permissions: this.permissions,
    ariaPreferences: this.ariaPreferences,
    workInfo: this.workInfo,
    interests: this.interests,
    stats: this.stats
  };
};

/**
 * Add or update connected account
 */
userProfileSchema.methods.addConnectedAccount = function(provider, accountData) {
  const existingIndex = this.connectedAccounts.findIndex(
    acc => acc.provider === provider && acc.accountId === accountData.accountId
  );

  if (existingIndex >= 0) {
    // Update existing
    this.connectedAccounts[existingIndex] = {
      ...this.connectedAccounts[existingIndex].toObject(),
      ...accountData,
      lastSync: new Date()
    };
  } else {
    // Add new
    this.connectedAccounts.push({
      provider,
      ...accountData,
      connectedAt: new Date()
    });
  }

  return this.save();
};

/**
 * Remove connected account
 */
userProfileSchema.methods.removeConnectedAccount = function(provider, accountId) {
  this.connectedAccounts = this.connectedAccounts.filter(
    acc => !(acc.provider === provider && acc.accountId === accountId)
  );
  return this.save();
};

/**
 * Update permission status
 */
userProfileSchema.methods.updatePermission = function(permissionType, granted) {
  if (this.permissions[permissionType]) {
    this.permissions[permissionType].granted = granted;
    if (granted) {
      this.permissions[permissionType].grantedAt = new Date();
    }
  }
  return this.save();
};

/**
 * Update last active timestamp
 */
userProfileSchema.methods.updateActivity = function() {
  this.stats.lastActiveAt = new Date();
  return this.save();
};

/**
 * Increment conversation count
 */
userProfileSchema.methods.incrementConversations = function() {
  this.stats.totalConversations += 1;
  this.stats.lastActiveAt = new Date();
  return this.save();
};

/**
 * Check if user is in quiet hours
 */
userProfileSchema.methods.isInQuietHours = function() {
  if (!this.contactPreferences.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const { start, end } = this.contactPreferences.quietHours;

  if (start < end) {
    return currentTime >= start && currentTime < end;
  } else {
    // Quiet hours cross midnight
    return currentTime >= start || currentTime < end;
  }
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
