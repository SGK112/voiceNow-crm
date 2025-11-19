import mongoose from 'mongoose';

const n8nWorkflowSchema = new mongoose.Schema({
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
    enum: ['save_lead', 'send_sms', 'book_appointment', 'update_invoice', 'send_email', 'slack_notification', 'custom'],
    required: true
  },
  description: String,
  workflowJson: {
    type: Object,
    required: true
  },
  n8nWorkflowId: String,
  webhookUrl: String, // The webhook URL for inbound workflows
  webhookPath: String, // The custom webhook path (e.g., /call/16028335307)
  enabled: {
    type: Boolean,
    default: false
  },
  triggerConditions: {
    agentTypes: [String],
    callStatus: [String],
    leadQualified: Boolean
  },
  executionCount: {
    type: Number,
    default: 0
  },
  lastExecutedAt: Date,
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  // Marketplace-specific fields
  marketplaceId: {
    type: String,
    index: true,
    sparse: true // Only marketplace workflows have this
  },
  category: String, // crm, construction, communication, etc.
  tags: [String] // For search and filtering
}, {
  timestamps: true
});

const N8nWorkflow = mongoose.model('N8nWorkflow', n8nWorkflowSchema);

export default N8nWorkflow;
