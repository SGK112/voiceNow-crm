import mongoose from 'mongoose';

const teamMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    index: true
  },
  channel: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: String,
  senderEmail: String,
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'mention', 'file', 'system'],
    default: 'text'
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],
  slackMessageId: String,
  slackThreadId: String,
  slackChannelId: String,
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    readAt: Date
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

teamMessageSchema.index({ channel: 1, createdAt: -1 });
teamMessageSchema.index({ leadId: 1, createdAt: -1 });
teamMessageSchema.index({ mentions: 1 });

const TeamMessage = mongoose.model('TeamMessage', teamMessageSchema);

export default TeamMessage;
