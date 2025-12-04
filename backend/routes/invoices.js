import express from 'express';
const router = express.Router();
import { protect as auth } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Lead from '../models/Lead.js';
import { Extension, UserExtension } from '../models/Extension.js';
import qbService from '../services/quickbooksService.js';

// Get all invoices/estimates for user
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20, search } = req.query;

    const query = { user: req.user.userId };

    if (type) query.type = type;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { 'client.name': new RegExp(search, 'i') },
        { 'client.email': new RegExp(search, 'i') }
      ];
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('lead', 'name email phone company')
      .populate('project', 'name status');

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get invoice statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [
      totalRevenue,
      paidInvoices,
      pendingInvoices,
      draftInvoices,
      overdueInvoices,
      activeEstimates
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { user: userId, type: 'invoice', status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.countDocuments({ user: userId, type: 'invoice', status: 'paid' }),
      Invoice.countDocuments({ user: userId, type: 'invoice', status: { $in: ['sent', 'viewed', 'partial'] } }),
      Invoice.countDocuments({ user: userId, status: 'draft' }),
      Invoice.countDocuments({ user: userId, type: 'invoice', status: 'overdue' }),
      Invoice.countDocuments({ user: userId, type: 'estimate', status: { $in: ['sent', 'viewed'] } })
    ]);

    const outstandingBalance = await Invoice.aggregate([
      { $match: { user: userId, type: 'invoice', status: { $in: ['sent', 'viewed', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amountDue' } } }
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      paidInvoices,
      pendingInvoices,
      draftInvoices,
      overdueInvoices,
      activeEstimates,
      outstandingBalance: outstandingBalance[0]?.total || 0
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).populate('lead', 'name email phone company address')
      .populate('project', 'name status description');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create invoice/estimate
router.post('/', auth, async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      user: req.user.userId
    };

    // If lead is provided, auto-fill client info
    if (invoiceData.lead) {
      const lead = await Lead.findOne({
        _id: invoiceData.lead,
        user: req.user.userId
      });

      if (lead) {
        invoiceData.client = {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          address: lead.address
        };
      }
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Auto-sync to QuickBooks in background (don't block response)
    autoSyncToQuickBooks(req.user.userId, invoice).catch(err =>
      console.error('Background QB sync error:', err)
    );

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update invoice/estimate
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Don't allow editing paid invoices
    if (invoice.status === 'paid' && req.body.status !== 'paid') {
      return res.status(400).json({ message: 'Cannot edit paid invoices' });
    }

    Object.assign(invoice, req.body);
    await invoice.save();

    // Auto-sync to QuickBooks in background
    autoSyncToQuickBooks(req.user.userId, invoice).catch(err =>
      console.error('Background QB sync error:', err)
    );

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete invoice/estimate
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Don't allow deleting paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Cannot delete paid invoices' });
    }

    await invoice.deleteOne();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark invoice as sent
router.post('/:id/send', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await invoice.markAsSent();

    // TODO: Send email notification to client

    res.json(invoice);
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record payment (deposit, partial, or final payment)
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const {
      amount,
      paymentMethod = 'other',
      paymentType = 'partial',
      notes,
      memo,
      paymentDate,
      referenceNumber,
      checkNumber,
      transactionId
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.type !== 'invoice') {
      return res.status(400).json({ message: 'Can only record payments for invoices' });
    }

    if (amount > invoice.amountDue) {
      return res.status(400).json({
        message: `Payment amount ($${amount}) exceeds amount due ($${invoice.amountDue})`
      });
    }

    // Create payment record
    const payment = new Payment({
      invoice: invoice._id,
      user: req.user.userId,
      contact: invoice.lead,
      amount,
      paymentMethod,
      paymentType,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceNumber,
      checkNumber,
      transactionId,
      notes,
      memo,
      status: 'completed'
    });

    await payment.save();

    // Update invoice amounts
    invoice.amountPaid += amount;
    invoice.amountDue = invoice.total - invoice.amountPaid;

    // Update invoice status based on payment
    if (invoice.amountDue <= 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partial';
    }

    await invoice.save();

    // Auto-sync payment to QuickBooks in background
    autoSyncPaymentToQuickBooks(req.user.userId, payment, invoice).catch(err =>
      console.error('Background QB payment sync error:', err)
    );

    res.json({ payment, invoice });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all payments for an invoice
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payments = await Payment.find({
      invoice: req.params.id,
      status: { $in: ['completed', 'refunded'] }
    })
      .sort({ paymentDate: -1 })
      .populate('contact', 'name email');

    res.json({ payments, invoice });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Refund a payment
router.post('/:id/payments/:paymentId/refund', auth, async (req, res) => {
  try {
    const { amount, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      invoice: req.params.id,
      status: 'completed'
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({
        message: 'Refund amount cannot exceed original payment'
      });
    }

    // Create refund record
    const refund = await payment.processRefund(refundAmount, notes);

    // Update invoice status
    if (invoice.amountDue > 0) {
      invoice.status = invoice.amountPaid > 0 ? 'partial' : 'sent';
      invoice.paidDate = null;
      await invoice.save();
    }

    res.json({ refund, invoice });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record deposit (shorthand for deposit payment type)
router.post('/:id/deposit', auth, async (req, res) => {
  try {
    const { amount, paymentMethod = 'other', notes, paymentDate } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Deposit amount must be greater than 0' });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.type !== 'invoice') {
      return res.status(400).json({ message: 'Can only record deposits for invoices' });
    }

    // Create deposit payment
    const payment = new Payment({
      invoice: invoice._id,
      user: req.user.userId,
      contact: invoice.lead,
      amount,
      paymentMethod,
      paymentType: 'deposit',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes || 'Initial deposit',
      status: 'completed'
    });

    await payment.save();

    // Update invoice
    invoice.amountPaid += amount;
    invoice.amountDue = invoice.total - invoice.amountPaid;
    if (invoice.amountPaid > 0 && invoice.amountDue > 0) {
      invoice.status = 'partial';
    }
    await invoice.save();

    res.json({ payment, invoice });
  } catch (error) {
    console.error('Record deposit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept estimate
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    await invoice.acceptEstimate();

    // TODO: Send notification to user
    // TODO: Optionally convert to invoice

    res.json(invoice);
  } catch (error) {
    console.error('Accept estimate error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Decline estimate
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    await invoice.declineEstimate();

    // TODO: Send notification to user

    res.json(invoice);
  } catch (error) {
    console.error('Decline estimate error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Convert estimate to invoice
router.post('/:id/convert', auth, async (req, res) => {
  try {
    const estimate = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId,
      type: 'estimate'
    });

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    // Create new invoice from estimate
    const invoiceData = estimate.toObject();
    delete invoiceData._id;
    delete invoiceData.invoiceNumber;
    delete invoiceData.createdAt;
    delete invoiceData.updatedAt;

    invoiceData.type = 'invoice';
    invoiceData.status = 'draft';
    invoiceData.issueDate = new Date();

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Mark estimate as converted
    estimate.status = 'accepted';
    await estimate.save();

    res.json(invoice);
  } catch (error) {
    console.error('Convert estimate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Duplicate invoice/estimate
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!original) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const duplicateData = original.toObject();
    delete duplicateData._id;
    delete duplicateData.invoiceNumber;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    duplicateData.status = 'draft';
    duplicateData.amountPaid = 0;
    duplicateData.paidDate = null;
    duplicateData.sentDate = null;
    duplicateData.viewedDate = null;

    const duplicate = new Invoice(duplicateData);
    await duplicate.save();

    res.json(duplicate);
  } catch (error) {
    console.error('Duplicate invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========================================
// Helper: Auto-Sync to QuickBooks
// ========================================
async function autoSyncToQuickBooks(userId, invoice) {
  try {
    // Find QuickBooks extension
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });
    if (!qbExtension) return;

    // Find user's QB connection
    const qbExt = await UserExtension.findOne({
      user: userId,
      extension: qbExtension._id,
      status: 'active'
    }).select('+oauth +credentials');

    if (!qbExt) {
      console.log(`No active QB connection for user ${userId}`);
      return;
    }

    // Check if auto-sync is enabled (default: true)
    if (qbExt.settings?.autoSync === false) {
      console.log(`Auto-sync disabled for user ${userId}`);
      return;
    }

    console.log(`🔄 Auto-syncing invoice ${invoice.invoiceNumber} to QuickBooks...`);

    // Refresh token if needed
    if (new Date() > qbExt.oauth.expiresAt) {
      console.log('Refreshing QB access token...');
      const newTokens = await qbService.refreshToken(qbExt.oauth.refreshToken);
      qbExt.oauth.accessToken = newTokens.access_token;
      qbExt.oauth.refreshToken = newTokens.refresh_token;
      qbExt.oauth.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await qbExt.save();
    }

    const realmId = qbExt.credentials.realmId;
    const accessToken = qbExt.oauth.accessToken;

    // Get or create customer in QuickBooks
    let qbCustomerId = invoice.quickbooksCustomerId;

    if (!qbCustomerId) {
      console.log('Creating customer in QuickBooks...');

      // Search for existing customer by email
      if (invoice.client.email) {
        const query = `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${invoice.client.email}' MAXRESULTS 1`;
        const existingCustomers = await qbService.queryCustomers(realmId, accessToken, query);

        if (existingCustomers.QueryResponse?.Customer?.length > 0) {
          qbCustomerId = existingCustomers.QueryResponse.Customer[0].Id;
          console.log(`Found existing QB customer: ${qbCustomerId}`);
        }
      }

      // Create new customer if not found
      if (!qbCustomerId) {
        const qbCustomer = await qbService.createCustomer(
          realmId,
          accessToken,
          invoice.client
        );
        qbCustomerId = qbCustomer.Customer.Id;
        console.log(`Created new QB customer: ${qbCustomerId}`);
      }

      invoice.quickbooksCustomerId = qbCustomerId;
    }

    // Create or update invoice in QuickBooks
    if (invoice.quickbooksId) {
      // Update existing invoice
      console.log(`Updating existing QB invoice: ${invoice.quickbooksId}`);

      const updateData = {
        Id: invoice.quickbooksId,
        SyncToken: invoice.syncToken,
        Line: invoice.items.map(item => ({
          Amount: item.amount,
          DetailType: 'SalesItemLineDetail',
          Description: item.description,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.rate
          }
        })),
        CustomerRef: { value: qbCustomerId },
        TxnDate: invoice.issueDate,
        DueDate: invoice.dueDate || invoice.issueDate
      };

      const qbInvoice = await qbService.makeRequest(
        'POST',
        '/invoice?operation=update',
        realmId,
        accessToken,
        updateData
      );

      invoice.syncToken = qbInvoice.Invoice.SyncToken;
    } else {
      // Create new invoice
      console.log('Creating new QB invoice...');

      const qbInvoice = await qbService.createInvoice(
        realmId,
        accessToken,
        {
          qbCustomerId,
          items: invoice.items,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate || invoice.issueDate,
          notes: invoice.notes,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          discount: invoice.discount
        }
      );

      invoice.quickbooksId = qbInvoice.Invoice.Id;
      invoice.syncToken = qbInvoice.Invoice.SyncToken;
      console.log(`Created QB invoice: ${invoice.quickbooksId}`);
    }

    invoice.syncStatus = 'synced';
    invoice.lastSyncedAt = new Date();
    await invoice.save();

    console.log(`✅ Invoice ${invoice.invoiceNumber} synced successfully to QuickBooks!`);
  } catch (error) {
    console.error(`❌ Auto-sync failed for invoice ${invoice.invoiceNumber}:`, error);
    invoice.syncStatus = 'error';
    invoice.syncError = error.message;
    await invoice.save();
  }
}

// ========================================
// Helper: Auto-Sync Payment to QuickBooks
// ========================================
async function autoSyncPaymentToQuickBooks(userId, payment, invoice) {
  try {
    // Find QuickBooks extension
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });
    if (!qbExtension) return;

    // Find user's QB connection
    const qbExt = await UserExtension.findOne({
      user: userId,
      extension: qbExtension._id,
      status: 'active'
    }).select('+oauth +credentials');

    if (!qbExt) {
      console.log(`No active QB connection for user ${userId}`);
      payment.syncStatus = 'not_connected';
      await payment.save();
      return;
    }

    // Check if auto-sync is enabled
    if (qbExt.settings?.autoSync === false) {
      console.log(`Auto-sync disabled for user ${userId}`);
      return;
    }

    // Must have invoice synced to QB first
    if (!invoice.quickbooksId) {
      console.log(`Invoice ${invoice.invoiceNumber} not synced to QB yet, skipping payment sync`);
      payment.syncStatus = 'pending';
      await payment.save();
      return;
    }

    console.log(`🔄 Auto-syncing payment for invoice ${invoice.invoiceNumber} to QuickBooks...`);

    // Refresh token if needed
    if (new Date() > qbExt.oauth.expiresAt) {
      console.log('Refreshing QB access token...');
      const newTokens = await qbService.refreshToken(qbExt.oauth.refreshToken);
      qbExt.oauth.accessToken = newTokens.access_token;
      qbExt.oauth.refreshToken = newTokens.refresh_token;
      qbExt.oauth.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await qbExt.save();
    }

    const realmId = qbExt.credentials.realmId;
    const accessToken = qbExt.oauth.accessToken;

    // Create payment in QuickBooks
    const qbPaymentData = {
      CustomerRef: { value: invoice.quickbooksCustomerId },
      TotalAmt: payment.amount,
      TxnDate: payment.paymentDate.toISOString().split('T')[0],
      Line: [{
        Amount: payment.amount,
        LinkedTxn: [{
          TxnId: invoice.quickbooksId,
          TxnType: 'Invoice'
        }]
      }],
      PrivateNote: payment.notes || `Payment via ${payment.paymentMethod}`
    };

    // Map payment method to QuickBooks payment method
    const paymentMethodMap = {
      'cash': 'Cash',
      'check': 'Check',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'bank_transfer': 'Bank Transfer',
      'paypal': 'PayPal',
      'stripe': 'Stripe',
      'venmo': 'Venmo',
      'zelle': 'Zelle',
      'other': 'Other'
    };

    // Try to find or create payment method in QB
    // Note: QuickBooks has a PaymentMethod reference, but for simplicity we'll use the note

    const qbPayment = await qbService.makeRequest(
      'POST',
      '/payment',
      realmId,
      accessToken,
      qbPaymentData
    );

    payment.quickbooksId = qbPayment.Payment.Id;
    payment.quickbooksCustomerId = invoice.quickbooksCustomerId;
    payment.syncToken = qbPayment.Payment.SyncToken;
    payment.syncStatus = 'synced';
    payment.lastSyncedAt = new Date();
    await payment.save();

    console.log(`✅ Payment synced successfully to QuickBooks! QB Payment ID: ${qbPayment.Payment.Id}`);
  } catch (error) {
    console.error(`❌ Auto-sync failed for payment:`, error);
    payment.syncStatus = 'failed';
    payment.syncError = error.message;
    await payment.save();
  }
}

export default router;
