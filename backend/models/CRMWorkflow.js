import mongoose from 'mongoose';

const crmWorkflowSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  // React Flow nodes
  nodes: [{
    id: String,
    type: String,
    position: {
      x: Number,
      y: Number
    },
    data: mongoose.Schema.Types.Mixed
  }],
  // React Flow edges
  edges: [{
    id: String,
    source: String,
    target: String,
    sourceHandle: String,
    targetHandle: String,
    animated: Boolean,
    type: String,
    markerEnd: mongoose.Schema.Types.Mixed,
    style: mongoose.Schema.Types.Mixed
  }],
  // Workflow metadata
  enabled: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['lead_nurture', 'sales_automation', 'follow_up', 'qualification', 'custom'],
    default: 'custom'
  },
  tags: [String],
  // Execution stats
  execution: {
    totalRuns: { type: Number, default: 0 },
    successfulRuns: { type: Number, default: 0 },
    failedRuns: { type: Number, default: 0 },
    lastRunAt: Date,
    lastRunStatus: String,
    lastRunError: String
  },
  // Template info
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateId: String,
  // Version control
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes
crmWorkflowSchema.index({ userId: 1, createdAt: -1 });
crmWorkflowSchema.index({ enabled: 1 });
crmWorkflowSchema.index({ isTemplate: 1 });

// Virtual for success rate
crmWorkflowSchema.virtual('successRate').get(function() {
  if (this.execution.totalRuns === 0) return 0;
  return ((this.execution.successfulRuns / this.execution.totalRuns) * 100).toFixed(2);
});

const CRMWorkflow = mongoose.model('CRMWorkflow', crmWorkflowSchema);

export default CRMWorkflow;
