import express from 'express';
import Estimate from '../models/Estimate.js';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate estimate number
function generateEstimateNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EST-${timestamp}-${random}`;
}

// Get all estimates for a lead
router.get('/lead/:leadId', protect, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const estimates = await Estimate.find({ leadId })
      .populate('leadId', 'name email company')
      .sort({ createdAt: -1 });

    res.json(estimates);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ error: 'Failed to fetch estimates' });
  }
});

// Get all estimates for user
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;

    const query = { userId: req.user.userId };
    if (status) query.status = status;

    const estimates = await Estimate.find(query)
      .populate('leadId', 'name email company')
      .sort({ createdAt: -1 });

    res.json(estimates);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ error: 'Failed to fetch estimates' });
  }
});

// Get a single estimate
router.get('/:estimateId', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.estimateId,
      userId: req.user.userId
    }).populate('leadId', 'name email company phone address');

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json(estimate);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ error: 'Failed to fetch estimate' });
  }
});

// Create a new estimate
router.post('/', protect, async (req, res) => {
  try {
    const {
      leadId,
      items,
      tax,
      discount,
      notes,
      validUntil,
      aiGenerated,
      aiPrompt
    } = req.body;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      return sum + itemTotal;
    }, 0);

    const taxAmount = tax || 0;
    const discountAmount = discount || 0;
    const total = subtotal + taxAmount - discountAmount;

    // Add total to each item
    const itemsWithTotals = items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));

    const estimate = new Estimate({
      userId: req.user.userId,
      leadId,
      estimateNumber: generateEstimateNumber(),
      items: itemsWithTotals,
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total,
      notes,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      aiGenerated: aiGenerated || false,
      aiPrompt
    });

    await estimate.save();

    // Update lead's estimated value
    lead.estimatedValue = total;
    await lead.save();

    const populatedEstimate = await Estimate.findById(estimate._id)
      .populate('leadId', 'name email company');

    res.status(201).json(populatedEstimate);
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

// Update an estimate
router.put('/:estimateId', protect, async (req, res) => {
  try {
    const { items, tax, discount, notes, status, validUntil } = req.body;

    const estimate = await Estimate.findOne({
      _id: req.params.estimateId,
      userId: req.user.userId
    });

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (items !== undefined) {
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);

      estimate.items = items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      }));
      estimate.subtotal = subtotal;

      const taxAmount = tax !== undefined ? tax : estimate.tax;
      const discountAmount = discount !== undefined ? discount : estimate.discount;
      estimate.total = subtotal + taxAmount - discountAmount;
    }

    if (tax !== undefined) estimate.tax = tax;
    if (discount !== undefined) estimate.discount = discount;
    if (notes !== undefined) estimate.notes = notes;
    if (status !== undefined) {
      estimate.status = status;
      if (status === 'accepted') {
        estimate.acceptedAt = new Date();
      }
    }
    if (validUntil !== undefined) estimate.validUntil = validUntil;

    await estimate.save();

    const updatedEstimate = await Estimate.findById(estimate._id)
      .populate('leadId', 'name email company');

    res.json(updatedEstimate);
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

// Delete an estimate
router.delete('/:estimateId', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findOneAndDelete({
      _id: req.params.estimateId,
      userId: req.user.userId
    });

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({ error: 'Failed to delete estimate' });
  }
});

// Convert estimate to invoice
router.post('/:estimateId/convert-to-invoice', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.estimateId,
      userId: req.user.userId
    });

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted estimates can be converted to invoices' });
    }

    // This will be implemented when Invoice model is created
    // For now, update estimate status
    estimate.status = 'converted';
    await estimate.save();

    res.json({ message: 'Estimate converted to invoice', estimate });
  } catch (error) {
    console.error('Error converting estimate:', error);
    res.status(500).json({ error: 'Failed to convert estimate' });
  }
});

// Send estimate to lead
router.post('/:estimateId/send', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.estimateId,
      userId: req.user.userId
    }).populate('leadId');

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    estimate.status = 'sent';
    estimate.sentAt = new Date();
    await estimate.save();

    // TODO: Send email with estimate PDF
    // This will be implemented with email service integration

    res.json({ message: 'Estimate sent successfully', estimate });
  } catch (error) {
    console.error('Error sending estimate:', error);
    res.status(500).json({ error: 'Failed to send estimate' });
  }
});

export default router;
