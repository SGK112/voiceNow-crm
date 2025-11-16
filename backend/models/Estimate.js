import mongoose from 'mongoose';

const estimateItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
  category: String,
  notes: String
});

const estimateSchema = new mongoose.Schema({
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
  estimateNumber: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  items: [estimateItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'],
    default: 'draft'
  },
  validUntil: Date,
  sentAt: Date,
  viewedAt: Date,
  acceptedAt: Date,
  declinedAt: Date,
  notes: String,
  termsAndConditions: String,
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

estimateSchema.index({ userId: 1, createdAt: -1 });
estimateSchema.index({ leadId: 1, status: 1 });
estimateSchema.index({ estimateNumber: 1 });

const Estimate = mongoose.model('Estimate', estimateSchema);

export default Estimate;
