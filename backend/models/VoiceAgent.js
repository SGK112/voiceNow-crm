import mongoose from 'mongoose';

const voiceAgentSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['lead_gen', 'booking', 'collections', 'promo', 'support'],
    required: true
  },
  elevenLabsAgentId: {
    type: String,
    required: true
  },
  voiceId: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String
  },
  script: {
    type: String,
    default: ''
  },
  availability: {
    enabled: { type: Boolean, default: true },
    timezone: { type: String, default: 'America/New_York' },
    hours: {
      monday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      thursday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      friday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      sunday: { start: String, end: String, enabled: { type: Boolean, default: false } }
    }
  },
  enabled: {
    type: Boolean,
    default: false
  },
  configuration: {
    temperature: { type: Number, default: 0.8 },
    maxDuration: { type: Number, default: 300 },
    language: { type: String, default: 'en' },
    qualificationQuestions: [String],
    targetAudience: {
      type: String,
      default: ''
    }
  },
  performance: {
    totalCalls: { type: Number, default: 0 },
    successfulCalls: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

voiceAgentSchema.index({ userId: 1, type: 1 });

const VoiceAgent = mongoose.model('VoiceAgent', voiceAgentSchema);

export default VoiceAgent;
