import mongoose from 'mongoose';

const voiceEstimateItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
    default: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: String,
  notes: String,
  extractedFromVoice: {
    type: Boolean,
    default: true
  }
});

const voiceEstimateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  estimateNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,

  // Voice conversation data
  conversationId: {
    type: String,
    index: true
  },
  elevenLabsAgentId: String,
  voiceTranscript: String,
  conversationDuration: Number, // in seconds
  conversationMetadata: mongoose.Schema.Types.Mixed,

  // Client information collected via voice
  client: {
    name: String,
    email: String,
    phone: String,
    company: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    }
  },

  // Project details
  projectType: String,
  projectScope: String,
  projectTimeline: String,

  // Line items
  items: [voiceEstimateItemSchema],

  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  discount: {
    type: Number,
    min: 0,
    default: 0
  },
  discountType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  total: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'processing', 'reviewed', 'sent', 'accepted', 'declined', 'converted_to_invoice', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Dates
  validUntil: Date,
  sentDate: Date,
  acceptedDate: Date,
  declinedDate: Date,

  // Notes and terms
  notes: String,
  terms: String,

  // AI Processing
  aiProcessed: {
    type: Boolean,
    default: false
  },
  aiConfidenceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  aiSuggestions: [String],
  needsReview: {
    type: Boolean,
    default: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,

  // Integration sync
  quickbooksId: String,
  quickbooksCustomerId: String,
  syncToken: String,
  lastSyncedAt: Date,
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'synced', 'error'],
    default: 'pending'
  },
  syncError: String,

  // Invoice conversion
  convertedToInvoice: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  convertedAt: Date,

  // File attachments
  pdfUrl: String,
  attachments: [{
    name: String,
    url: String,
    size: Number,
    uploadedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for better performance
voiceEstimateSchema.index({ user: 1, createdAt: -1 });
voiceEstimateSchema.index({ user: 1, status: 1 });
voiceEstimateSchema.index({ conversationId: 1 });
voiceEstimateSchema.index({ 'client.email': 1 });
voiceEstimateSchema.index({ 'client.phone': 1 });

// Pre-save middleware to calculate totals
voiceEstimateSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate tax
  if (this.taxRate > 0) {
    this.taxAmount = (this.subtotal * this.taxRate) / 100;
  } else {
    this.taxAmount = 0;
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (this.discount > 0) {
    if (this.discountType === 'percentage') {
      discountAmount = (this.subtotal * this.discount) / 100;
    } else {
      discountAmount = this.discount;
    }
  }

  // Calculate total
  this.total = this.subtotal + this.taxAmount - discountAmount;

  next();
});

// Generate estimate number if not provided
voiceEstimateSchema.pre('save', async function(next) {
  if (this.isNew && !this.estimateNumber) {
    const prefix = 'VEST'; // Voice Estimate
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find the last estimate for this user
    const lastEstimate = await this.constructor.findOne({
      user: this.user,
      estimateNumber: new RegExp(`^${prefix}-${year}${month}`)
    }).sort({ estimateNumber: -1 });

    let sequence = 1;
    if (lastEstimate) {
      const match = lastEstimate.estimateNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    this.estimateNumber = `${prefix}-${year}${month}${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Methods
voiceEstimateSchema.methods.markAsReviewed = function(userId) {
  this.needsReview = false;
  this.reviewedBy = userId;
  this.reviewedAt = new Date();
  this.status = 'reviewed';
  return this.save();
};

voiceEstimateSchema.methods.sendToClient = function() {
  this.status = 'sent';
  this.sentDate = new Date();
  return this.save();
};

voiceEstimateSchema.methods.acceptEstimate = function() {
  this.status = 'accepted';
  this.acceptedDate = new Date();
  return this.save();
};

voiceEstimateSchema.methods.declineEstimate = function() {
  this.status = 'declined';
  this.declinedDate = new Date();
  return this.save();
};

voiceEstimateSchema.methods.convertToInvoice = async function() {
  if (this.convertedToInvoice) {
    throw new Error('Estimate has already been converted to an invoice');
  }

  const Invoice = mongoose.model('Invoice');

  // Create invoice from estimate
  const invoice = new Invoice({
    user: this.user,
    type: 'invoice',
    status: 'draft',
    client: this.client,
    items: this.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    })),
    subtotal: this.subtotal,
    taxRate: this.taxRate,
    taxAmount: this.taxAmount,
    discount: this.discount,
    discountType: this.discountType,
    total: this.total,
    notes: this.notes || `Converted from Voice Estimate ${this.estimateNumber}`,
    terms: this.terms,
    issueDate: new Date(),
    // Set due date to 30 days from now by default
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  await invoice.save();

  // Update estimate
  this.convertedToInvoice = true;
  this.invoiceId = invoice._id;
  this.convertedAt = new Date();
  this.status = 'converted_to_invoice';
  await this.save();

  return invoice;
};

export default mongoose.model('VoiceEstimate', voiceEstimateSchema);
