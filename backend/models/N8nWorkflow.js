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
  }
}, {
  timestamps: true
});

const N8nWorkflow = mongoose.model('N8nWorkflow', n8nWorkflowSchema);

export default N8nWorkflow;
