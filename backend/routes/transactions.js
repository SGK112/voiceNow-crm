import express from 'express';
import Transaction from '../models/Transaction.js';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all transactions for a lead
router.get('/lead/:leadId', protect, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const transactions = await Transaction.find({ leadId })
      .populate('invoiceId')
      .populate('estimateId')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get all transactions for user
router.get('/', protect, async (req, res) => {
  try {
    const { status, type, startDate, endDate } = req.query;

    const query = { userId: req.user.userId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('leadId', 'name email company')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get a single transaction
router.get('/:transactionId', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.transactionId,
      userId: req.user.userId
    })
      .populate('leadId', 'name email company')
      .populate('invoiceId')
      .populate('estimateId');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create a new transaction
router.post('/', protect, async (req, res) => {
  try {
    const {
      leadId,
      type,
      amount,
      description,
      paymentMethod,
      status,
      stripePaymentIntentId,
      invoiceId,
      estimateId
    } = req.body;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const transaction = new Transaction({
      userId: req.user.userId,
      leadId,
      type,
      amount,
      description,
      paymentMethod,
      status: status || 'pending',
      stripePaymentIntentId,
      invoiceId,
      estimateId
    });

    await transaction.save();

    // Update lead's total revenue if transaction is completed
    if (transaction.status === 'completed' && type === 'payment') {
      lead.totalRevenue = (lead.totalRevenue || 0) + amount;
      await lead.save();
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('leadId', 'name email company');

    res.status(201).json(populatedTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update a transaction
router.put('/:transactionId', protect, async (req, res) => {
  try {
    const { status, amount, description, paymentMethod } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.transactionId,
      userId: req.user.userId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const oldStatus = transaction.status;
    const oldAmount = transaction.amount;

    if (status !== undefined) transaction.status = status;
    if (amount !== undefined) transaction.amount = amount;
    if (description !== undefined) transaction.description = description;
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;

    await transaction.save();

    // Update lead revenue if status changed to/from completed
    if (transaction.type === 'payment' && oldStatus !== status) {
      const lead = await Lead.findById(transaction.leadId);
      if (lead) {
        if (status === 'completed') {
          lead.totalRevenue = (lead.totalRevenue || 0) + transaction.amount;
        } else if (oldStatus === 'completed') {
          lead.totalRevenue = Math.max(0, (lead.totalRevenue || 0) - oldAmount);
        }
        await lead.save();
      }
    }

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('leadId', 'name email company');

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete a transaction
router.delete('/:transactionId', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.transactionId,
      userId: req.user.userId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update lead revenue if transaction was completed
    if (transaction.status === 'completed' && transaction.type === 'payment') {
      const lead = await Lead.findById(transaction.leadId);
      if (lead) {
        lead.totalRevenue = Math.max(0, (lead.totalRevenue || 0) - transaction.amount);
        await lead.save();
      }
    }

    await transaction.deleteOne();

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Get transaction summary
router.get('/summary/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {
      userId: req.user.userId,
      status: 'completed'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const summary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Error getting transaction summary:', error);
    res.status(500).json({ error: 'Failed to get transaction summary' });
  }
});

export default router;
