import mongoose from 'mongoose';

const ariaMemorySchema = new mongoose.Schema({
  // Memory identification
  userId: {
    type: String,
    default: 'default',
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },

  // Memory content
  key: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: String,
    required: true
  },
  summary: {
    type: String // Short summary for quick reference
  },

  // Categorization
  category: {
    type: String,
    enum: ['preference', 'fact', 'task', 'personal', 'business', 'conversation', 'context'],
    default: 'fact',
    index: true
  },

  // Importance and relevance
  importance: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },

  // Semantic search support
  embedding: {
    type: [Number], // Vector embedding for semantic search
    default: undefined
  },

  // Usage tracking
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },

  // Expiration
  expiresAt: {
    type: Date,
    default: null // null = never expires
  },

  // Context
  source: {
    type: String, // 'voice', 'chat', 'api', 'slack'
    default: 'voice'
  },
  relatedMemories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AriaMemory'
  }],

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
ariaMemorySchema.index({ userId: 1, category: 1 });
ariaMemorySchema.index({ userId: 1, createdAt: -1 });
ariaMemorySchema.index({ userId: 1, importance: -1 });
ariaMemorySchema.index({ userId: 1, accessCount: -1 });
ariaMemorySchema.index({ key: 'text', value: 'text', summary: 'text' });

// Auto-expire old memories
ariaMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
ariaMemorySchema.methods.incrementAccess = function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

ariaMemorySchema.methods.updateImportance = function(delta) {
  this.importance = Math.max(1, Math.min(10, this.importance + delta));
  return this.save();
};

const AriaMemory = mongoose.model('AriaMemory', ariaMemorySchema);

export default AriaMemory;
