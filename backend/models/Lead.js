import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  // Additional Contact Info
  alternatePhone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  company: String,
  jobTitle: String,

  // Lead Classification
  source: {
    type: String,
    enum: ['lead_gen', 'booking', 'collections', 'promo', 'support', 'manual', 'referral', 'website', 'social_media', 'ai_call', 'import'],
    required: true
  },
  qualified: {
    type: Boolean,
    default: false
  },
  qualificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  value: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'converted', 'lost', 'on_hold'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Assignment & Ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToName: String,
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Activity Tracking
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  lastActivityType: {
    type: String,
    enum: ['call', 'email', 'sms', 'meeting', 'note', 'ai_call']
  },
  lastActivityAt: Date,
  lastContactedAt: Date,
  convertedAt: Date,

  // Financial
  totalRevenue: {
    type: Number,
    default: 0
  },
  estimatedValue: Number,

  // Project/Service Details
  projectType: String,
  serviceCategory: String,
  projectDescription: String,
  preferredStartDate: Date,
  budget: {
    min: Number,
    max: Number
  },

  // Engagement Stats
  emailsSent: { type: Number, default: 0 },
  emailsOpened: { type: Number, default: 0 },
  smsSent: { type: Number, default: 0 },
  callsReceived: { type: Number, default: 0 },
  callsMade: { type: Number, default: 0 },
  meetingsScheduled: { type: Number, default: 0 },

  // AI & Automation
  aiCallsScheduled: [{
    date: Date,
    agentId: mongoose.Schema.Types.ObjectId,
    topic: String,
    status: String
  }],
  nextScheduledCall: Date,

  // Tags & Custom Fields
  tags: [String],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Images & Files
  avatar: String,
  files: [{
    filename: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],

  // Notes (deprecated - use Note model instead, kept for backward compatibility)
  notes: [{
    content: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Slack Integration
  slackChannelId: String,
  slackThreadId: String,

  // Metadata
  importBatchId: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ userId: 1, createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
