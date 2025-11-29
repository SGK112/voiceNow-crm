import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
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
  taxable: {
    type: Boolean,
    default: true
  }
});

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['invoice', 'estimate'],
    required: true,
    default: 'invoice'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'accepted', 'declined'],
    default: 'draft',
    index: true
  },
  // Client information
  client: {
    name: { type: String, required: true },
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
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  // Invoice details
  items: [invoiceItemSchema],
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
  // Payment tracking
  amountPaid: {
    type: Number,
    min: 0,
    default: 0
  },
  amountDue: {
    type: Number,
    min: 0,
    default: 0
  },
  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  paidDate: Date,
  sentDate: Date,
  viewedDate: Date,
  // For estimates
  validUntil: Date,
  acceptedDate: Date,
  declinedDate: Date,
  // Notes and terms
  notes: String,
  terms: String,
  footer: String,
  // Integration sync
  quickbooksId: String,
  quickbooksCustomerId: String,
  syncToken: String, // QuickBooks version control token
  xeroId: String,
  freshbooksId: String,
  lastSyncedAt: Date,
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'synced', 'error'],
    default: 'pending'
  },
  syncError: String,
  // File attachments
  pdfUrl: String,
  attachments: [{
    name: String,
    url: String,
    size: Number
  }],
  // Payment settings
  paymentMethods: [{
    type: String,
    enum: ['credit_card', 'bank_transfer', 'check', 'cash', 'paypal', 'stripe', 'other']
  }],
  currency: {
    type: String,
    default: 'USD'
  },
  // Reminders
  remindersSent: [{
    date: Date,
    type: String,
    status: String
  }],
  // Custom fields
  customFields: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for better query performance
invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ user: 1, status: 1 });
invoiceSchema.index({ user: 1, type: 1 });
// Note: invoiceNumber already has a unique index from schema definition
invoiceSchema.index({ 'client.email': 1 });

// Virtual for balance due
invoiceSchema.virtual('balanceDue').get(function() {
  return this.total - this.amountPaid;
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate tax
  if (this.taxRate > 0) {
    const taxableAmount = this.items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    this.taxAmount = (taxableAmount * this.taxRate) / 100;
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
  this.amountDue = this.total - this.amountPaid;

  // Update status based on payment
  if (this.type === 'invoice') {
    if (this.amountPaid >= this.total && this.total > 0) {
      this.status = 'paid';
      if (!this.paidDate) {
        this.paidDate = new Date();
      }
    } else if (this.amountPaid > 0 && this.amountPaid < this.total) {
      this.status = 'partial';
    } else if (this.dueDate && new Date() > this.dueDate && this.status === 'sent') {
      this.status = 'overdue';
    }
  }

  next();
});

// Generate invoice number if not provided
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const prefix = this.type === 'estimate' ? 'EST' : 'INV';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find the last invoice for this user
    const lastInvoice = await this.constructor.findOne({
      user: this.user,
      type: this.type,
      invoiceNumber: new RegExp(`^${prefix}-${year}${month}`)
    }).sort({ invoiceNumber: -1 });

    let sequence = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    this.invoiceNumber = `${prefix}-${year}${month}${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Methods
invoiceSchema.methods.addPayment = function(amount) {
  this.amountPaid += amount;
  if (this.amountPaid >= this.total) {
    this.status = 'paid';
    this.paidDate = new Date();
  } else {
    this.status = 'partial';
  }
  return this.save();
};

invoiceSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentDate = new Date();
  return this.save();
};

invoiceSchema.methods.markAsViewed = function() {
  if (this.status === 'sent' && !this.viewedDate) {
    this.status = 'viewed';
    this.viewedDate = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

invoiceSchema.methods.acceptEstimate = function() {
  if (this.type === 'estimate') {
    this.status = 'accepted';
    this.acceptedDate = new Date();
    return this.save();
  }
  return Promise.reject(new Error('Only estimates can be accepted'));
};

invoiceSchema.methods.declineEstimate = function() {
  if (this.type === 'estimate') {
    this.status = 'declined';
    this.declinedDate = new Date();
    return this.save();
  }
  return Promise.reject(new Error('Only estimates can be declined'));
};

export default mongoose.model('Invoice', invoiceSchema);
