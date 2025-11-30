import mongoose from 'mongoose';

/**
 * CopilotRevision Model
 *
 * Stores every code change made by the AI Copilot system.
 * Enables:
 * - Version history for each user's customizations
 * - Rollback to previous versions
 * - Audit trail of all AI-assisted changes
 * - Per-user app customization tracking
 */

const fileChangeSchema = new mongoose.Schema({
  filePath: {
    type: String,
    required: true
  },
  oldContent: {
    type: String,
    required: true
  },
  newContent: {
    type: String,
    required: true
  },
  diff: {
    type: String // Optional: unified diff format
  }
}, { _id: false });

const copilotRevisionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // The voice command that triggered this change
  command: {
    type: String,
    required: true
  },

  // Original transcription (before cleanup)
  transcription: {
    type: String
  },

  // Status of the revision
  status: {
    type: String,
    enum: ['pending', 'processing', 'applied', 'failed', 'reverted'],
    default: 'pending',
    index: true
  },

  // Files changed in this revision
  changes: [fileChangeSchema],

  // Summary of what was changed (AI-generated)
  summary: {
    type: String
  },

  // Error message if failed
  error: {
    type: String
  },

  // Revision number for this user (auto-increment per user)
  revisionNumber: {
    type: Number,
    required: true
  },

  // Reference to parent revision (for rollbacks)
  parentRevision: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopilotRevision'
  },

  // Was this a rollback?
  isRollback: {
    type: Boolean,
    default: false
  },

  // Rollback target (if this is a rollback, which revision did we revert to?)
  rollbackTarget: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopilotRevision'
  },

  // Processing metadata
  processingStartedAt: {
    type: Date
  },
  processingCompletedAt: {
    type: Date
  },
  processingDurationMs: {
    type: Number
  },

  // AI model used
  aiModel: {
    type: String,
    default: 'claude-code'
  },

  // Token usage (for cost tracking)
  tokenUsage: {
    input: Number,
    output: Number,
    total: Number
  }
}, {
  timestamps: true
});

// Compound index for efficient user revision queries
copilotRevisionSchema.index({ userId: 1, createdAt: -1 });
copilotRevisionSchema.index({ userId: 1, revisionNumber: -1 });
copilotRevisionSchema.index({ status: 1, createdAt: -1 });

// Static method to get next revision number for a user
copilotRevisionSchema.statics.getNextRevisionNumber = async function(userId) {
  const lastRevision = await this.findOne({ userId })
    .sort({ revisionNumber: -1 })
    .select('revisionNumber');

  return lastRevision ? lastRevision.revisionNumber + 1 : 1;
};

// Static method to create a new pending revision
copilotRevisionSchema.statics.createPending = async function(userId, command, transcription) {
  const revisionNumber = await this.getNextRevisionNumber(userId);

  return this.create({
    userId,
    command,
    transcription,
    status: 'pending',
    revisionNumber
  });
};

// Instance method to mark as processing
copilotRevisionSchema.methods.markProcessing = function() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  return this.save();
};

// Instance method to mark as applied
copilotRevisionSchema.methods.markApplied = function(changes, summary) {
  this.status = 'applied';
  this.changes = changes;
  this.summary = summary;
  this.processingCompletedAt = new Date();
  this.processingDurationMs = this.processingCompletedAt - this.processingStartedAt;
  return this.save();
};

// Instance method to mark as failed
copilotRevisionSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = error;
  this.processingCompletedAt = new Date();
  this.processingDurationMs = this.processingStartedAt
    ? this.processingCompletedAt - this.processingStartedAt
    : 0;
  return this.save();
};

const CopilotRevision = mongoose.model('CopilotRevision', copilotRevisionSchema);

export default CopilotRevision;
