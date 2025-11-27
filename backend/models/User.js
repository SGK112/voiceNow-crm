import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minlength: 8,
    select: false
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  phone: {
    type: String,
    sparse: true,
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Company name is required']
  },
  // Credits/Tokens System (replaces subscription)
  credits: {
    type: Number,
    default: 100, // Free starting credits
    min: 0
  },
  creditBalance: {
    type: Number,
    default: 100,
    min: 0
  },
  totalCreditsUsed: {
    type: Number,
    default: 0
  },
  totalCreditsPurchased: {
    type: Number,
    default: 100 // Includes free starting credits
  },

  // Legacy subscription fields (keeping for migration)
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise', 'trial', 'pay-as-you-go'],
    default: 'pay-as-you-go'
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'pay-as-you-go'],
    default: 'pay-as-you-go'
  },
  subscriptionId: {
    type: String
  },
  subscriptionEndDate: {
    type: Date
  },
  apiKeys: {
    elevenlabs: { type: String, select: false },
    twilio: { type: String, select: false },
    sendgrid: { type: String, select: false }
  },
  emailConfig: {
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String },
    smtpPassword: { type: String, select: false }, // Gmail app password
    fromEmail: { type: String },
    fromName: { type: String, default: 'VoiceNow CRM' }
  },
  phoneNumbers: [{
    number: String,
    provider: String,
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceAgent' }
  }],
  teamMembers: [{
    email: String,
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    addedAt: { type: Date, default: Date.now }
  }],
  savedVoices: [{
    voiceId: { type: String, required: true },
    publicOwnerId: String,
    name: { type: String, required: true },
    gender: String,
    age: String,
    accent: String,
    useCase: String,
    category: String,
    language: String,
    locale: String,
    description: String,
    previewUrl: String,
    freeUsersAllowed: Boolean,
    clonedByCount: Number,
    addedAt: { type: Date, default: Date.now },
    tags: [String], // Custom user tags
    notes: String // User notes about the voice
  }],
  userApiKeys: [{
    name: { type: String, required: true },
    key: { type: String, required: true, select: false },
    prefix: { type: String, required: true }, // First 8 chars for display
    scopes: [{
      type: String,
      enum: [
        'agents.read', 'agents.write', 'agents.delete',
        'calls.read', 'calls.write',
        'leads.read', 'leads.write', 'leads.delete',
        'workflows.read', 'workflows.write', 'workflows.execute',
        'webhooks.read', 'webhooks.write',
        'all'
      ]
    }],
    environment: { type: String, enum: ['production', 'development'], default: 'production' },
    lastUsedAt: Date,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  settings: {
    webhookUrl: String,
    notifications: {
      email: { type: Boolean, default: true },
      slack: { type: Boolean, default: false },
      slackWebhook: String
    }
  },
  // Onboarding & Profile Data for AI Personalization
  profile: {
    // Onboarding Status
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 0 },
    onboardingSkipped: { type: Boolean, default: false },

    // Business Information
    businessName: String,
    industry: {
      type: String,
      enum: ['Real Estate', 'Insurance', 'Healthcare', 'Legal', 'Finance', 'E-commerce', 'SaaS', 'Automotive', 'Home Services', 'Retail', 'Other']
    },
    businessSize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    website: String,
    timezone: { type: String, default: 'America/New_York' },

    // Contact & Location
    firstName: String,
    lastName: String,
    jobTitle: String,
    phoneNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'United States' }
    },

    // Use Case & Goals
    primaryUseCase: {
      type: String,
      enum: ['Lead Qualification', 'Appointment Setting', 'Customer Support', 'Follow-ups', 'Surveys', 'Outbound Sales', 'Other']
    },
    targetAudience: String, // e.g., "homeowners", "small businesses"
    monthlyCallVolume: {
      type: String,
      enum: ['0-100', '101-500', '501-1000', '1001-5000', '5000+']
    },

    // Brand Voice & Messaging
    brandVoice: {
      type: String,
      enum: ['Professional', 'Friendly', 'Casual', 'Authoritative', 'Empathetic']
    },
    companyDescription: String, // AI uses this for context
    valuePropositio: String, // What makes their business unique
    keyProducts: [String], // Products/services they offer

    // Agent Preferences
    preferredVoiceGender: {
      type: String,
      enum: ['Male', 'Female', 'No Preference']
    },
    preferredVoiceAccent: String,
    agentPersonality: String, // e.g., "professional but warm"

    // Integration Preferences
    existingCRM: {
      type: String,
      enum: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho', 'Close', 'None', 'Other']
    },
    existingTools: [String], // Slack, Google Calendar, etc.

    // Custom Variables (user-defined data for AI)
    customVariables: {
      type: Map,
      of: String,
      default: {}
    },

    // AI Context & Preferences
    aiInstructions: String, // Global AI instructions for this user
    complianceRequirements: String, // Legal/compliance notes
    doNotMention: [String], // Topics to avoid

    // Onboarding metadata
    completedAt: Date,
    lastUpdated: Date
  },

  // Media Generation Credits (Replicate AI)
  mediaCredits: {
    balance: {
      type: Number,
      default: 10, // Free starter credits
      min: 0
    },
    used: {
      type: Number,
      default: 0
    },
    purchased: {
      type: Number,
      default: 0
    },
    lastPurchaseDate: Date,
    lastUsageDate: Date
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
