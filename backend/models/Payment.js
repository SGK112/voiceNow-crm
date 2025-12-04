import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // References
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'venmo', 'zelle', 'other'],
    default: 'other'
  },
  paymentType: {
    type: String,
    enum: ['deposit', 'partial', 'final', 'refund'],
    default: 'partial'
  },

  // Reference numbers
  referenceNumber: {
    type: String,
    trim: true
  },
  checkNumber: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },

  // Additional info
  notes: {
    type: String,
    trim: true
  },
  memo: {
    type: String,
    trim: true
  },

  // QuickBooks integration
  quickbooksId: {
    type: String,
    index: true
  },
  quickbooksCustomerId: {
    type: String
  },
  syncToken: {
    type: String
  },
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed', 'not_connected'],
    default: 'pending'
  },
  lastSyncedAt: {
    type: Date
  },
  syncError: {
    type: String
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'voided'],
    default: 'completed'
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for common queries
paymentSchema.index({ invoice: 1, paymentDate: -1 });
paymentSchema.index({ user: 1, paymentDate: -1 });
paymentSchema.index({ status: 1, paymentDate: -1 });
paymentSchema.index({ quickbooksId: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Pre-save middleware
paymentSchema.pre('save', async function(next) {
  // If this is a new payment, update the invoice's amountPaid
  if (this.isNew && this.status === 'completed') {
    try {
      const Invoice = mongoose.model('Invoice');
      const invoice = await Invoice.findById(this.invoice);
      if (invoice) {
        await invoice.addPayment(this.amount, this.paymentMethod, this.notes);
      }
    } catch (error) {
      console.error('Error updating invoice payment:', error);
    }
  }
  next();
});

// Static method to get payments for an invoice
paymentSchema.statics.getPaymentsForInvoice = function(invoiceId) {
  return this.find({ invoice: invoiceId, status: 'completed' })
    .sort({ paymentDate: -1 })
    .populate('contact', 'name email');
};

// Static method to get total payments for an invoice
paymentSchema.statics.getTotalPaidForInvoice = async function(invoiceId) {
  const result = await this.aggregate([
    { $match: { invoice: mongoose.Types.ObjectId(invoiceId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get payment summary by method
paymentSchema.statics.getPaymentSummaryByMethod = async function(userId, startDate, endDate) {
  const match = { user: mongoose.Types.ObjectId(userId), status: 'completed' };
  if (startDate && endDate) {
    match.paymentDate = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

// Method to mark as synced to QuickBooks
paymentSchema.methods.markAsSynced = function(quickbooksId, syncToken) {
  this.quickbooksId = quickbooksId;
  this.syncToken = syncToken;
  this.syncStatus = 'synced';
  this.lastSyncedAt = new Date();
  this.syncError = null;
  return this.save();
};

// Method to mark sync as failed
paymentSchema.methods.markSyncFailed = function(error) {
  this.syncStatus = 'failed';
  this.syncError = error;
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = async function(refundAmount, notes) {
  if (refundAmount > this.amount) {
    throw new Error('Refund amount cannot exceed original payment amount');
  }

  const Payment = mongoose.model('Payment');

  // Create refund record
  const refund = new Payment({
    invoice: this.invoice,
    user: this.user,
    contact: this.contact,
    amount: -refundAmount,
    paymentDate: new Date(),
    paymentMethod: this.paymentMethod,
    paymentType: 'refund',
    referenceNumber: `REF-${this.referenceNumber || this._id}`,
    notes: notes || `Refund for payment ${this._id}`,
    status: 'completed'
  });

  await refund.save();

  // Update invoice
  const Invoice = mongoose.model('Invoice');
  const invoice = await Invoice.findById(this.invoice);
  if (invoice) {
    invoice.amountPaid -= refundAmount;
    invoice.amountDue += refundAmount;
    await invoice.save();
  }

  // If full refund, mark original payment as refunded
  if (refundAmount === this.amount) {
    this.status = 'refunded';
    await this.save();
  }

  return refund;
};

// Ensure virtuals are included in JSON
paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
