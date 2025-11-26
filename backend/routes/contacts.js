import express from 'express';
import { protect as auth, optionalAuth } from '../middleware/auth.js';
import Contact from '../models/Contact.js';
import Lead from '../models/Lead.js';
import CallLog from '../models/CallLog.js';
import AgentSMS from '../models/AgentSMS.js';

const router = express.Router();

// ============================================
// UNIFIED CONTACTS API
// Used by both mobile app and desktop CRM
// ============================================

// @desc    Get all contacts with optional filters
// @route   GET /api/contacts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      hasPhone,
      hasEmail,
      tags,
      source,
    } = req.query;

    const query = {
      user: req.user.id,
      isDeleted: { $ne: true },
    };

    // Search by name, phone, email, or company
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by has phone/email
    if (hasPhone === 'true') query.phone = { $exists: true, $ne: '' };
    if (hasEmail === 'true') query.email = { $exists: true, $ne: '' };

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagList };
    }

    // Filter by import source
    if (source) query.importSource = source;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contact.countDocuments(query),
    ]);

    res.json({
      success: true,
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single contact with full history
// @route   GET /api/contacts/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: { $ne: true },
    }).lean();

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Get call history for this contact
    const calls = await CallLog.find({
      user: req.user.id,
      $or: [
        { phoneNumber: contact.phone },
        { callerPhone: contact.phone },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get SMS history for this contact
    const messages = await AgentSMS.find({
      user: req.user.id,
      $or: [{ from: contact.phone }, { to: contact.phone }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get linked lead if exists
    let linkedLead = null;
    if (contact.leadId) {
      linkedLead = await Lead.findById(contact.leadId).lean();
    }

    res.json({
      success: true,
      contact: {
        ...contact,
        callHistory: calls,
        smsHistory: messages,
        linkedLead,
      },
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create new contact
// @route   POST /api/contacts
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, company, notes, tags, customFields, createLead } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required',
      });
    }

    // Check for duplicate phone number
    const existing = await Contact.findOne({
      user: req.user.id,
      phone: phone,
      isDeleted: { $ne: true },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A contact with this phone number already exists',
        existingContact: existing,
      });
    }

    const contactData = {
      user: req.user.id,
      name,
      phone,
      email,
      company,
      notes,
      tags: tags || [],
      customFields: customFields || {},
      importSource: 'manual',
    };

    // Optionally create a linked lead
    let lead = null;
    if (createLead) {
      lead = await Lead.create({
        user: req.user.id,
        name,
        phone,
        email,
        company,
        source: 'manual',
        status: 'new',
        notes,
      });
      contactData.leadId = lead._id;
    }

    const contact = await Contact.create(contactData);

    res.status(201).json({
      success: true,
      contact,
      lead,
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, company, notes, tags, customFields } = req.body;

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Check for duplicate phone if changing
    if (phone && phone !== contact.phone) {
      const existing = await Contact.findOne({
        user: req.user.id,
        phone: phone,
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A contact with this phone number already exists',
        });
      }
    }

    // Update fields
    if (name !== undefined) contact.name = name;
    if (phone !== undefined) contact.phone = phone;
    if (email !== undefined) contact.email = email;
    if (company !== undefined) contact.company = company;
    if (notes !== undefined) contact.notes = notes;
    if (tags !== undefined) contact.tags = tags;
    if (customFields !== undefined) {
      contact.customFields = { ...contact.customFields, ...customFields };
    }

    await contact.save();

    // Also update linked lead if exists
    if (contact.leadId) {
      await Lead.findByIdAndUpdate(contact.leadId, {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
      });
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete contact (soft delete)
// @route   DELETE /api/contacts/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    contact.isDeleted = true;
    await contact.save();

    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Add conversation/activity to contact
// @route   POST /api/contacts/:id/activity
// @access  Private
router.post('/:id/activity', auth, async (req, res) => {
  try {
    const { type, direction, content, metadata } = req.body;

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Add to conversation history
    const activity = {
      type: type || 'note',
      direction: direction || 'outgoing',
      content,
      timestamp: new Date(),
      metadata: metadata || {},
    };

    contact.conversationHistory.push(activity);

    // Update stats
    if (type === 'call') contact.totalCalls = (contact.totalCalls || 0) + 1;
    if (type === 'sms') contact.totalSMS = (contact.totalSMS || 0) + 1;
    if (type === 'email') contact.totalEmails = (contact.totalEmails || 0) + 1;

    contact.lastInteraction = new Date();
    contact.lastActivityType = type;

    await contact.save();

    res.json({ success: true, activity, contact });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Bulk import contacts
// @route   POST /api/contacts/import
// @access  Private
router.post('/import', auth, async (req, res) => {
  try {
    const { contacts, source = 'import', skipDuplicates = true } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array is required',
      });
    }

    const batchId = `import_${Date.now()}`;
    const results = {
      imported: 0,
      duplicates: 0,
      errors: 0,
      contacts: [],
    };

    for (const contactData of contacts) {
      try {
        // Check for duplicate
        if (skipDuplicates && contactData.phone) {
          const existing = await Contact.findOne({
            user: req.user.id,
            phone: contactData.phone,
            isDeleted: { $ne: true },
          });

          if (existing) {
            results.duplicates++;
            continue;
          }
        }

        const contact = await Contact.create({
          user: req.user.id,
          name: contactData.name || 'Unknown',
          phone: contactData.phone,
          email: contactData.email,
          company: contactData.company,
          notes: contactData.notes,
          tags: contactData.tags || [],
          importSource: source,
          importBatchId: batchId,
        });

        results.imported++;
        results.contacts.push(contact);
      } catch (err) {
        results.errors++;
        console.error('Import contact error:', err.message);
      }
    }

    res.json({
      success: true,
      batchId,
      results,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Search contacts
// @route   GET /api/contacts/search/:query
// @access  Private
router.get('/search/:query', auth, async (req, res) => {
  try {
    const searchQuery = req.params.query;
    const limit = parseInt(req.query.limit) || 20;

    const contacts = await Contact.find({
      user: req.user.id,
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { phone: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { company: { $regex: searchQuery, $options: 'i' } },
      ],
    })
      .sort({ lastInteraction: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Search contacts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Find contact by phone number
// @route   GET /api/contacts/by-phone/:phone
// @access  Private
router.get('/by-phone/:phone', auth, async (req, res) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');

    // Try exact match first
    let contact = await Contact.findOne({
      user: req.user.id,
      phone: { $regex: phone.slice(-10) },
      isDeleted: { $ne: true },
    }).lean();

    // If not found, try to find in leads and create contact
    if (!contact) {
      const lead = await Lead.findOne({
        user: req.user.id,
        phone: { $regex: phone.slice(-10) },
      }).lean();

      if (lead) {
        // Create contact from lead
        contact = await Contact.create({
          user: req.user.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          company: lead.company,
          leadId: lead._id,
          importSource: 'lead',
        });
        contact = contact.toObject();
      }
    }

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Find by phone error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get contact statistics
// @route   GET /api/contacts/stats
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const user = req.user.id;

    const [totalContacts, contactsWithEmail, contactsWithCompany, recentContacts] = await Promise.all([
      Contact.countDocuments({ user, isDeleted: { $ne: true } }),
      Contact.countDocuments({ user, isDeleted: { $ne: true }, email: { $exists: true, $ne: '' } }),
      Contact.countDocuments({ user, isDeleted: { $ne: true }, company: { $exists: true, $ne: '' } }),
      Contact.countDocuments({
        user,
        isDeleted: { $ne: true },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Get activity breakdown
    const activityAggregation = await Contact.aggregate([
      { $match: { user: req.user._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: '$totalCalls' },
          totalSMS: { $sum: '$totalSMS' },
          totalEmails: { $sum: '$totalEmails' },
        },
      },
    ]);

    const activity = activityAggregation[0] || { totalCalls: 0, totalSMS: 0, totalEmails: 0 };

    res.json({
      success: true,
      stats: {
        totalContacts,
        contactsWithEmail,
        contactsWithCompany,
        recentContacts,
        totalCalls: activity.totalCalls,
        totalSMS: activity.totalSMS,
        totalEmails: activity.totalEmails,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Sync contacts from leads (one-time migration)
// @route   POST /api/contacts/sync-from-leads
// @access  Private
router.post('/sync-from-leads', auth, async (req, res) => {
  try {
    const leads = await Lead.find({ user: req.user.id });
    const results = { synced: 0, skipped: 0 };

    for (const lead of leads) {
      // Check if contact already exists for this lead
      const existing = await Contact.findOne({
        user: req.user.id,
        $or: [
          { leadId: lead._id },
          { phone: lead.phone },
        ],
        isDeleted: { $ne: true },
      });

      if (existing) {
        // Update existing contact with lead data
        existing.leadId = lead._id;
        if (!existing.email && lead.email) existing.email = lead.email;
        if (!existing.company && lead.company) existing.company = lead.company;
        await existing.save();
        results.skipped++;
        continue;
      }

      // Create new contact from lead
      await Contact.create({
        user: req.user.id,
        name: lead.name || 'Unknown',
        phone: lead.phone,
        email: lead.email,
        company: lead.company,
        notes: lead.notes,
        leadId: lead._id,
        importSource: 'lead',
        lastInteraction: lead.lastContactedAt || lead.updatedAt,
      });

      results.synced++;
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Sync from leads error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Link contact to lead
// @route   POST /api/contacts/:id/link-lead
// @access  Private
router.post('/:id/link-lead', auth, async (req, res) => {
  try {
    const { leadId, createNew } = req.body;

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    let lead;

    if (createNew) {
      // Create new lead from contact
      lead = await Lead.create({
        user: req.user.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        source: 'contact',
        status: 'new',
        notes: contact.notes,
      });
    } else if (leadId) {
      // Link to existing lead
      lead = await Lead.findOne({
        _id: leadId,
        user: req.user.id,
      });

      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }
    }

    if (lead) {
      contact.leadId = lead._id;
      await contact.save();
    }

    res.json({ success: true, contact, lead });
  } catch (error) {
    console.error('Link lead error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get all communication history for a contact
// @route   GET /api/contacts/:id/history
// @access  Private
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: { $ne: true },
    }).lean();

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Gather all history from different sources
    const history = [];

    // Add conversation history from contact document
    if (contact.conversationHistory) {
      contact.conversationHistory.forEach(item => {
        history.push({
          ...item,
          source: 'contact',
        });
      });
    }

    // Add calls from CallLog
    const calls = await CallLog.find({
      user: req.user.id,
      $or: [
        { phoneNumber: contact.phone },
        { callerPhone: contact.phone },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    calls.forEach(call => {
      history.push({
        type: 'call',
        direction: call.direction === 'inbound' ? 'incoming' : 'outgoing',
        content: call.transcript || `${call.direction} call - ${call.durationMinutes || 0} min`,
        timestamp: call.createdAt,
        metadata: {
          duration: call.duration,
          status: call.status,
          recordingUrl: call.recordingUrl,
          sentiment: call.sentiment,
        },
        source: 'callLog',
      });
    });

    // Add SMS from AgentSMS
    const messages = await AgentSMS.find({
      user: req.user.id,
      $or: [{ from: contact.phone }, { to: contact.phone }],
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    messages.forEach(sms => {
      history.push({
        type: 'sms',
        direction: sms.direction === 'inbound' ? 'incoming' : 'outgoing',
        content: sms.message,
        timestamp: sms.createdAt,
        metadata: {
          status: sms.status,
          twilioSid: sms.twilioSid,
        },
        source: 'agentSMS',
      });
    });

    // Filter by type if specified
    let filteredHistory = history;
    if (type) {
      filteredHistory = history.filter(item => item.type === type);
    }

    // Sort by timestamp descending
    filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    const limitedHistory = filteredHistory.slice(0, parseInt(limit));

    res.json({
      success: true,
      contact: {
        _id: contact._id,
        name: contact.name,
        phone: contact.phone,
      },
      history: limitedHistory,
      total: filteredHistory.length,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
