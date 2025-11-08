import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['lead_gen', 'booking', 'collections', 'promo', 'support', 'manual'],
    required: true
  },
  qualified: {
    type: Boolean,
    default: false
  },
  qualificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  value: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new'
  },
  assignedTo: {
    type: String
  },
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallLog'
  },
  notes: [{
    content: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  customFields: {
    type: Map,
    of: String
  },
  lastContactedAt: Date,
  convertedAt: Date
}, {
  timestamps: true
});

leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ userId: 1, createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
