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
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise', 'trial'],
    default: 'trial'
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
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
    default: 'trialing'
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
    fromName: { type: String, default: 'VoiceFlow CRM' }
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
