import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  name: {
    type: String,
    required: [true, 'Project name is required']
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'pending'
  },

  // Project Details
  projectType: {
    type: String,
    enum: ['kitchen', 'bathroom', 'basement', 'addition', 'exterior', 'roofing', 'flooring', 'custom', 'other'],
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'USA' }
  },

  // Timeline
  startDate: {
    type: Date
  },
  estimatedEndDate: {
    type: Date
  },
  actualEndDate: {
    type: Date
  },

  // Financial
  estimate: {
    labor: { type: Number, default: 0 },
    materials: { type: Number, default: 0 },
    permits: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  actualCost: {
    labor: { type: Number, default: 0 },
    materials: { type: Number, default: 0 },
    permits: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  depositDate: {
    type: Date
  },

  // Materials
  materials: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'unit' }, // unit, sqft, linear ft, etc.
    costPerUnit: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    supplier: String,
    ordered: { type: Boolean, default: false },
    orderedDate: Date,
    received: { type: Boolean, default: false },
    receivedDate: Date,
    notes: String
  }],

  // Photos
  photos: [{
    type: {
      type: String,
      enum: ['before', 'during', 'after', 'inspection', 'damage', 'other'],
      default: 'during'
    },
    url: { type: String, required: true },
    publicId: String, // Cloudinary public_id for deletion
    caption: String,
    takenAt: { type: Date, default: Date.now },
    uploadedBy: String
  }],

  // Permits & Inspections
  permits: [{
    type: { type: String, required: true }, // building, electrical, plumbing, etc.
    number: String,
    appliedDate: Date,
    approvedDate: Date,
    expiryDate: Date,
    cost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not_applied', 'pending', 'approved', 'rejected', 'expired'],
      default: 'not_applied'
    },
    notes: String
  }],

  inspections: [{
    type: { type: String, required: true }, // rough, final, electrical, etc.
    scheduledDate: Date,
    completedDate: Date,
    inspector: String,
    result: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'conditional'],
      default: 'pending'
    },
    notes: String,
    issues: [String]
  }],

  // Team & Contractors
  teamMembers: [{
    name: { type: String, required: true },
    role: String, // Project Manager, Electrician, Plumber, etc.
    phone: String,
    email: String,
    rate: Number,
    hoursWorked: { type: Number, default: 0 }
  }],

  // Milestones
  milestones: [{
    name: { type: String, required: true },
    description: String,
    targetDate: Date,
    completedDate: Date,
    completed: { type: Boolean, default: false },
    percentComplete: { type: Number, default: 0, min: 0, max: 100 }
  }],

  // Tasks/Checklist
  tasks: [{
    title: { type: String, required: true },
    description: String,
    assignedTo: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedDate: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  }],

  // Notes & Updates
  notes: [{
    content: { type: String, required: true },
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['general', 'issue', 'update', 'change_order'],
      default: 'general'
    }
  }],

  // Change Orders
  changeOrders: [{
    description: { type: String, required: true },
    costImpact: { type: Number, default: 0 },
    timeImpact: { type: Number, default: 0 }, // in days
    requestedDate: { type: Date, default: Date.now },
    approvedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: String
  }],

  // Weather Impact
  weatherDelays: [{
    date: { type: Date, required: true },
    daysLost: { type: Number, default: 1 },
    reason: String
  }],

  // Customer Satisfaction
  customerSatisfaction: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    reviewDate: Date,
    wouldRecommend: Boolean
  },

  // Warranty
  warranty: {
    duration: { type: Number, default: 12 }, // months
    startDate: Date,
    endDate: Date,
    terms: String
  }

}, {
  timestamps: true
});

// Calculate total estimate
projectSchema.pre('save', function(next) {
  if (this.estimate) {
    this.estimate.total =
      (this.estimate.labor || 0) +
      (this.estimate.materials || 0) +
      (this.estimate.permits || 0) +
      (this.estimate.other || 0) +
      (this.estimate.tax || 0);
  }

  if (this.actualCost) {
    this.actualCost.total =
      (this.actualCost.labor || 0) +
      (this.actualCost.materials || 0) +
      (this.actualCost.permits || 0) +
      (this.actualCost.other || 0) +
      (this.actualCost.tax || 0);
  }

  next();
});

// Index for faster queries
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ leadId: 1 });
projectSchema.index({ dealId: 1 });
projectSchema.index({ startDate: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
