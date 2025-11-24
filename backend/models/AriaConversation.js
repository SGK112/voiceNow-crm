import mongoose from 'mongoose';

const ariaConversationSchema = new mongoose.Schema({
  // Conversation identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: 'default',
    index: true
  },

  // Conversation content
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }],

  // Summary and context
  summary: {
    type: String
  },
  topic: {
    type: String
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative']
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'ended', 'archived'],
    default: 'active',
    index: true
  },

  // Timing
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },

  // Performance metrics
  metrics: {
    messageCount: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    capabilitiesUsed: [String],
    totalDuration: { type: Number, default: 0 }
  },

  // Context
  contextWindow: [{
    memoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AriaMemory'
    },
    relevance: Number
  }]
}, {
  timestamps: true
});

// Indexes
ariaConversationSchema.index({ userId: 1, status: 1, lastActivity: -1 });
ariaConversationSchema.index({ sessionId: 1, status: 1 });

// Methods
ariaConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({ role, content, metadata, timestamp: new Date() });
  this.metrics.messageCount = this.messages.length;
  this.lastActivity = new Date();
  return this.save();
};

ariaConversationSchema.methods.endConversation = function() {
  this.status = 'ended';
  this.endTime = new Date();
  this.metrics.totalDuration = this.endTime - this.startTime;
  return this.save();
};

ariaConversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

const AriaConversation = mongoose.model('AriaConversation', ariaConversationSchema);

export default AriaConversation;
