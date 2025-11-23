import express from 'express';
const router = express.Router();
import { protect as auth } from '../middleware/auth.js';
import VoiceEstimate from '../models/VoiceEstimate.js';
import Invoice from '../models/Invoice.js';
import qbService from '../services/quickbooksService.js';
import { UserExtension, Extension } from '../models/Extension.js';
import ElevenLabsService from '../services/elevenLabsService.js';

const elevenLabsService = new ElevenLabsService();

// Create a new voice estimate session
router.post('/start-session', auth, async (req, res) => {
  try {
    const { title, projectType } = req.body;

    // Create initial voice estimate record
    const voiceEstimate = new VoiceEstimate({
      user: req.user.userId,
      title: title || 'New Voice Estimate',
      projectType: projectType || 'General',
      status: 'draft',
      items: []
    });

    await voiceEstimate.save();

    res.json({
      success: true,
      estimateId: voiceEstimate._id,
      estimateNumber: voiceEstimate.estimateNumber,
      message: 'Voice estimate session started'
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start voice estimate session',
      error: error.message
    });
  }
});

// Update voice estimate from conversation data
router.post('/:estimateId/update-from-conversation', auth, async (req, res) => {
  try {
    const { estimateId } = req.params;
    const {
      conversationId,
      transcript,
      extractedData,
      aiConfidence,
      conversationDuration
    } = req.body;

    const voiceEstimate = await VoiceEstimate.findOne({
      _id: estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    // Update with conversation data
    voiceEstimate.conversationId = conversationId;
    voiceEstimate.voiceTranscript = transcript;
    voiceEstimate.conversationDuration = conversationDuration;
    voiceEstimate.aiConfidenceScore = aiConfidence;
    voiceEstimate.aiProcessed = true;
    voiceEstimate.status = 'processing';

    // Extract and update client information
    if (extractedData.client) {
      voiceEstimate.client = {
        ...voiceEstimate.client,
        ...extractedData.client
      };
    }

    // Extract and update project details
    if (extractedData.projectScope) {
      voiceEstimate.projectScope = extractedData.projectScope;
    }
    if (extractedData.projectTimeline) {
      voiceEstimate.projectTimeline = extractedData.projectTimeline;
    }

    // Extract and update line items
    if (extractedData.items && extractedData.items.length > 0) {
      voiceEstimate.items = extractedData.items.map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: (item.quantity || 1) * (item.rate || 0),
        category: item.category,
        notes: item.notes,
        extractedFromVoice: true
      }));
    }

    // Set tax rate if provided
    if (extractedData.taxRate !== undefined) {
      voiceEstimate.taxRate = extractedData.taxRate;
    }

    // Set discount if provided
    if (extractedData.discount !== undefined) {
      voiceEstimate.discount = extractedData.discount;
      voiceEstimate.discountType = extractedData.discountType || 'fixed';
    }

    // Set valid until date if provided
    if (extractedData.validUntil) {
      voiceEstimate.validUntil = new Date(extractedData.validUntil);
    }

    await voiceEstimate.save();

    res.json({
      success: true,
      estimate: voiceEstimate,
      message: 'Voice estimate updated from conversation'
    });
  } catch (error) {
    console.error('Update from conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update voice estimate',
      error: error.message
    });
  }
});

// Get all voice estimates
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { user: req.user.userId };
    if (status) {
      query.status = status;
    }

    const voiceEstimates = await VoiceEstimate.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('reviewedBy', 'firstName lastName email')
      .populate('invoiceId', 'invoiceNumber status total');

    const total = await VoiceEstimate.countDocuments(query);

    res.json({
      success: true,
      estimates: voiceEstimates,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get voice estimates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voice estimates',
      error: error.message
    });
  }
});

// Get a single voice estimate
router.get('/:estimateId', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    })
      .populate('reviewedBy', 'firstName lastName email')
      .populate('invoiceId', 'invoiceNumber status total');

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    res.json({
      success: true,
      estimate: voiceEstimate
    });
  } catch (error) {
    console.error('Get voice estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voice estimate',
      error: error.message
    });
  }
});

// Update voice estimate manually
router.put('/:estimateId', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'client', 'projectType', 'projectScope',
      'projectTimeline', 'items', 'taxRate', 'discount', 'discountType',
      'notes', 'terms', 'validUntil'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        voiceEstimate[field] = req.body[field];
      }
    });

    await voiceEstimate.save();

    res.json({
      success: true,
      estimate: voiceEstimate,
      message: 'Voice estimate updated successfully'
    });
  } catch (error) {
    console.error('Update voice estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update voice estimate',
      error: error.message
    });
  }
});

// Mark estimate as reviewed
router.post('/:estimateId/review', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    await voiceEstimate.markAsReviewed(req.user.userId);

    res.json({
      success: true,
      estimate: voiceEstimate,
      message: 'Estimate marked as reviewed'
    });
  } catch (error) {
    console.error('Review estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review estimate',
      error: error.message
    });
  }
});

// Send estimate to client
router.post('/:estimateId/send', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    if (!voiceEstimate.client || !voiceEstimate.client.email) {
      return res.status(400).json({
        success: false,
        message: 'Client email is required to send estimate'
      });
    }

    await voiceEstimate.sendToClient();

    // TODO: Send email to client with estimate PDF
    // This would integrate with your email service

    res.json({
      success: true,
      estimate: voiceEstimate,
      message: 'Estimate sent to client'
    });
  } catch (error) {
    console.error('Send estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send estimate',
      error: error.message
    });
  }
});

// Convert voice estimate to invoice
router.post('/:estimateId/convert-to-invoice', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    if (voiceEstimate.status !== 'accepted' && voiceEstimate.status !== 'reviewed') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted or reviewed estimates can be converted to invoices'
      });
    }

    const invoice = await voiceEstimate.convertToInvoice();

    res.json({
      success: true,
      estimate: voiceEstimate,
      invoice: invoice,
      message: 'Estimate converted to invoice successfully'
    });
  } catch (error) {
    console.error('Convert to invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert estimate to invoice',
      error: error.message
    });
  }
});

// Sync voice estimate to QuickBooks
router.post('/:estimateId/sync-quickbooks', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    // Check QuickBooks connection
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });
    const userExtension = await UserExtension.findOne({
      user: req.user.userId,
      extension: qbExtension._id
    }).select('+oauth +credentials');

    if (!userExtension) {
      return res.status(400).json({
        success: false,
        message: 'QuickBooks not connected. Please connect QuickBooks first.'
      });
    }

    // Check if token needs refresh
    let accessToken = userExtension.oauth.accessToken;
    if (new Date() > userExtension.oauth.expiresAt) {
      const newTokens = await qbService.refreshToken(userExtension.oauth.refreshToken);
      userExtension.oauth.accessToken = newTokens.access_token;
      userExtension.oauth.refreshToken = newTokens.refresh_token;
      userExtension.oauth.expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
      await userExtension.save();
      accessToken = newTokens.access_token;
    }

    const realmId = userExtension.credentials.realmId;

    // Create or get customer in QuickBooks
    let qbCustomerId = voiceEstimate.quickbooksCustomerId;

    if (!qbCustomerId && voiceEstimate.client) {
      const customerData = {
        name: voiceEstimate.client.name,
        email: voiceEstimate.client.email,
        phone: voiceEstimate.client.phone,
        company: voiceEstimate.client.company,
        address: voiceEstimate.client.address
      };

      const qbCustomer = await qbService.createCustomer(realmId, accessToken, customerData);
      qbCustomerId = qbCustomer.Customer.Id;
      voiceEstimate.quickbooksCustomerId = qbCustomerId;
    }

    // Create estimate in QuickBooks
    const estimateData = {
      qbCustomerId,
      items: voiceEstimate.items,
      issueDate: voiceEstimate.createdAt,
      validUntil: voiceEstimate.validUntil,
      notes: voiceEstimate.notes
    };

    const qbEstimate = await qbService.createEstimate(realmId, accessToken, estimateData);

    // Update voice estimate with QuickBooks info
    voiceEstimate.quickbooksId = qbEstimate.Estimate.Id;
    voiceEstimate.syncToken = qbEstimate.Estimate.SyncToken;
    voiceEstimate.syncStatus = 'synced';
    voiceEstimate.lastSyncedAt = new Date();

    await voiceEstimate.save();

    res.json({
      success: true,
      estimate: voiceEstimate,
      quickbooksEstimate: qbEstimate.Estimate,
      message: 'Voice estimate synced to QuickBooks successfully'
    });
  } catch (error) {
    console.error('QuickBooks sync error:', error);

    // Update sync status to error
    const voiceEstimate = await VoiceEstimate.findById(req.params.estimateId);
    if (voiceEstimate) {
      voiceEstimate.syncStatus = 'error';
      voiceEstimate.syncError = error.message;
      await voiceEstimate.save();
    }

    res.status(500).json({
      success: false,
      message: 'Failed to sync to QuickBooks',
      error: error.message
    });
  }
});

// Delete voice estimate
router.delete('/:estimateId', auth, async (req, res) => {
  try {
    const voiceEstimate = await VoiceEstimate.findOne({
      _id: req.params.estimateId,
      user: req.user.userId
    });

    if (!voiceEstimate) {
      return res.status(404).json({
        success: false,
        message: 'Voice estimate not found'
      });
    }

    if (voiceEstimate.convertedToInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete estimate that has been converted to invoice'
      });
    }

    await voiceEstimate.deleteOne();

    res.json({
      success: true,
      message: 'Voice estimate deleted successfully'
    });
  } catch (error) {
    console.error('Delete voice estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete voice estimate',
      error: error.message
    });
  }
});

// Get voice estimate agent configuration
router.get('/agent/config', auth, async (req, res) => {
  try {
    // Return the ElevenLabs agent configuration for voice estimates
    const config = {
      agentId: process.env.ELEVENLABS_ESTIMATE_AGENT_ID || 'demo_estimate_agent',
      name: 'Estimate Builder Assistant',
      description: 'AI voice agent that helps build professional project estimates through natural conversation',
      features: [
        'Collects client information',
        'Gathers project scope and requirements',
        'Creates detailed line items with pricing',
        'Calculates totals with tax and discounts',
        'Generates professional estimate documents'
      ]
    };

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get agent config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent configuration',
      error: error.message
    });
  }
});

export default router;
