import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['note', 'call_summary', 'email', 'sms', 'meeting', 'task'],
    default: 'note'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: String,
  isPinned: {
    type: Boolean,
    default: false
  },
  tags: [String],
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

noteSchema.index({ leadId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, isPinned: -1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;
