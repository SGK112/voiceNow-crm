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
  company: {
    type: String,
    required: [true, 'Company name is required']
  },
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise', 'trial'],
    default: 'trial'
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
