import mongoose from 'mongoose';

const agentSMSSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  agentId: {
    type: String, // Can be MongoDB ObjectId OR ElevenLabs agent ID string
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    index: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true,
    index: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'accepted', 'sending', 'sent', 'delivered', 'failed', 'undelivered', 'received', 'read'],
    default: 'queued',
    index: true
  },
  twilioSid: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for common queries
agentSMSSchema.index({ userId: 1, createdAt: -1 });
agentSMSSchema.index({ agentId: 1, createdAt: -1 });
agentSMSSchema.index({ leadId: 1, createdAt: -1 });
agentSMSSchema.index({ twilioSid: 1 });

const AgentSMS = mongoose.model('AgentSMS', agentSMSSchema);

export default AgentSMS;
