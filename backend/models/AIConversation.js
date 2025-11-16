import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
});

const aiConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    index: true
  },
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  type: {
    type: String,
    enum: ['voice', 'chat', 'sms', 'email'],
    default: 'voice'
  },
  messages: [messageSchema],
  transcript: String,
  summary: String,
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'mixed'],
    default: 'neutral'
  },
  sentimentScore: Number,
  keyPoints: [String],
  actionItems: [{
    description: String,
    completed: { type: Boolean, default: false },
    dueDate: Date
  }],
  duration: Number, // in seconds
  recordingUrl: String,
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'cancelled'],
    default: 'active'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

aiConversationSchema.index({ userId: 1, createdAt: -1 });
aiConversationSchema.index({ leadId: 1, createdAt: -1 });
aiConversationSchema.index({ agentId: 1, status: 1 });

const AIConversation = mongoose.model('AIConversation', aiConversationSchema);

export default AIConversation;
