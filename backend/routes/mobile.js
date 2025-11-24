import express from 'express';
import { protect as auth } from '../middleware/auth.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Contact from '../models/Contact.js';

const router = express.Router();

// @desc    Get mobile app settings
// @route   GET /api/mobile/settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const settings = {
      voiceAgentEnabled: true,
      smsAgentEnabled: true,
      aiPersonality: user.aiPersonality || 'professional',
      businessName: user.businessName || user.name || 'My Business',
      businessType: user.businessType || 'contractor',
      businessHours: {
        enabled: true,
        start: '9:00 AM',
        end: '5:00 PM',
        timezone: 'America/New_York'
      },
      autoReplyEnabled: false,
      qualificationQuestions: [
        'What type of project are you interested in?',
        'What is your timeline?',
        'What is your budget range?'
      ],
      notificationsEnabled: true
    };

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update mobile app settings
// @route   PUT /api/mobile/settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { aiPersonality, businessName, businessType, autoReplyEnabled } = req.body;

    const user = await User.findById(req.user.id);

    if (aiPersonality) user.aiPersonality = aiPersonality;
    if (businessName) user.businessName = businessName;
    if (businessType) user.businessType = businessType;

    await user.save();

    const settings = {
      voiceAgentEnabled: true,
      smsAgentEnabled: true,
      aiPersonality: user.aiPersonality,
      businessName: user.businessName,
      businessType: user.businessType,
      autoReplyEnabled: autoReplyEnabled || false,
      notificationsEnabled: true
    };

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Report missed call
// @route   POST /api/mobile/call-missed
// @access  Private
router.post('/call-missed', auth, async (req, res) => {
  try {
    const { phone, contactName, timestamp } = req.body;

    // Create lead from missed call
    const lead = await Lead.create({
      user: req.user.id,
      name: contactName || 'Unknown',
      phone,
      source: 'call',
      status: 'new',
      notes: `Missed call detected at ${new Date(timestamp).toLocaleString()}`
    });

    const call = {
      _id: lead._id,
      phone,
      contactName,
      type: 'missed',
      timestamp,
      status: 'pending',
      leadCreated: true,
      leadId: lead._id
    };

    res.json({ success: true, call });
  } catch (error) {
    console.error('Report missed call error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Start AI callback
// @route   POST /api/mobile/start-ai-call
// @access  Private
router.post('/start-ai-call', auth, async (req, res) => {
  try {
    const { phone, contactName } = req.body;

    // In production, this would trigger Twilio to call the number
    // with ElevenLabs AI agent

    // For now, simulate successful callback initiation
    console.log(`AI callback initiated for ${phone}`);

    res.json({
      success: true,
      message: 'AI callback initiated',
      phone,
      contactName,
      callId: Date.now().toString()
    });
  } catch (error) {
    console.error('Start AI call error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get call history
// @route   GET /api/mobile/call-history
// @access  Public (for testing) - TODO: Add auth in production
router.get('/call-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // For testing without auth, get all call leads
    // In production, filter by req.user.id
    const userId = req.user?.id;

    const leads = await Lead.find({
      ...(userId && { user: userId }),
      source: 'call'
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    const calls = leads.map(lead => ({
      _id: lead._id,
      phone: lead.phone,
      contactName: lead.name,
      type: 'ai_handled',
      duration: 120, // Mock duration
      transcript: lead.notes,
      aiConfidence: 85,
      leadCreated: true,
      leadId: lead._id,
      timestamp: lead.createdAt,
      status: 'completed'
    }));

    res.json({ success: true, calls });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get recent missed calls
// @route   GET /api/mobile/recent-missed-calls
// @access  Private
router.get('/recent-missed-calls', auth, async (req, res) => {
  try {
    // This would check for new missed calls in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentLeads = await Lead.find({
      user: req.user.id,
      source: 'call',
      status: 'new',
      createdAt: { $gte: oneHourAgo }
    }).limit(5);

    const calls = recentLeads.map(lead => ({
      _id: lead._id,
      phone: lead.phone,
      contactName: lead.name,
      timestamp: lead.createdAt
    }));

    res.json({ success: true, calls });
  } catch (error) {
    console.error('Get recent missed calls error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Process incoming SMS
// @route   POST /api/mobile/sms-received
// @access  Private
router.post('/sms-received', auth, async (req, res) => {
  try {
    const { phone, message, timestamp } = req.body;

    // Find or create lead
    let lead = await Lead.findOne({ user: req.user.id, phone });

    if (!lead) {
      lead = await Lead.create({
        user: req.user.id,
        name: 'SMS Lead',
        phone,
        source: 'sms',
        status: 'new',
        notes: `SMS: ${message}`
      });
    } else {
      lead.notes = (lead.notes || '') + `\n\nSMS (${new Date(timestamp).toLocaleString()}): ${message}`;
      await lead.save();
    }

    // Generate AI reply
    const aiReply = generateSMSReply(message);

    res.json({
      success: true,
      aiReply,
      leadId: lead._id,
      leadCreated: !lead.notes.includes('SMS:')
    });
  } catch (error) {
    console.error('Process SMS error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Send SMS reply
// @route   POST /api/mobile/sms-reply
// @access  Private
router.post('/sms-reply', auth, async (req, res) => {
  try {
    const { phone, message, aiGenerated, timestamp } = req.body;

    // Log the reply to the lead
    const lead = await Lead.findOne({ user: req.user.id, phone });

    if (lead) {
      lead.notes = (lead.notes || '') + `\n\nReply (${new Date(timestamp).toLocaleString()}): ${message}`;
      if (aiGenerated) {
        lead.notes += ' [AI Generated]';
      }
      await lead.save();
    }

    res.json({ success: true, message: 'SMS logged' });
  } catch (error) {
    console.error('SMS reply error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get SMS threads
// @route   GET /api/mobile/sms-threads
// @access  Public (for testing) - TODO: Add auth in production
router.get('/sms-threads', async (req, res) => {
  try {
    // For testing without auth, get all SMS leads
    // In production, filter by req.user.id
    const userId = req.user?.id;

    const leads = await Lead.find({
      ...(userId && { user: userId }),
      source: 'sms'
    })
    .sort({ updatedAt: -1 })
    .limit(50);

    const threads = leads.map(lead => ({
      phone: lead.phone,
      contactName: lead.name,
      lastMessage: getLastMessage(lead.notes),
      lastMessageTime: lead.updatedAt,
      unreadCount: 0,
      messages: parseMessages(lead.notes)
    }));

    res.json({ success: true, threads });
  } catch (error) {
    console.error('Get SMS threads error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get mobile stats
// @route   GET /api/mobile/stats
// @access  Public (for testing) - TODO: Add auth in production
router.get('/stats', async (req, res) => {
  try {
    // For testing without auth, get stats for all users
    // In production, this should require auth and filter by req.user.id
    const totalLeads = await Lead.countDocuments({});
    const callLeads = await Lead.countDocuments({ source: 'call' });
    const smsLeads = await Lead.countDocuments({ source: 'sms' });
    const wonLeads = await Lead.countDocuments({ status: 'won' });

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const stats = {
      calls: callLeads,
      messages: smsLeads,
      leads: totalLeads,
      conversionRate: `${conversionRate}%`,
      activeLeads: await Lead.countDocuments({
        status: { $in: ['new', 'contacted', 'qualified'] }
      })
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get recent CRM activity
// @route   GET /api/mobile/recent-activity
// @access  Public (for testing)
router.get('/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const activity = [];

    // Get recent leads
    const recentLeads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name phone source status createdAt');

    for (const lead of recentLeads) {
      const timeAgo = getTimeAgo(lead.createdAt);
      activity.push({
        type: lead.source === 'call' ? 'call' : lead.source === 'sms' ? 'message' : 'lead',
        title: `New ${lead.source === 'call' ? 'call' : lead.source === 'sms' ? 'message' : 'lead'} from ${lead.name}`,
        description: `${lead.phone} • Status: ${lead.status}`,
        timeAgo,
        timestamp: lead.createdAt
      });
    }

    // Sort by timestamp
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, activity: activity.slice(0, limit) });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper function to format time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

// @desc    Get all leads (for mobile app testing)
// @route   GET /api/mobile/leads
// @access  Public (for testing) - TODO: Add auth in production
router.get('/leads', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const leads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper functions
function generateSMSReply(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
    return "Thanks for your interest! I'd be happy to provide a quote. Could you tell me more about your project? What type of work are you looking to have done?";
  }

  if (lowerMessage.includes('available') || lowerMessage.includes('schedule')) {
    return "I have availability this week. What days work best for you? I can typically schedule consultations Monday-Friday between 9 AM and 5 PM.";
  }

  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return "You're welcome! Let me know if you have any other questions. I'm here to help!";
  }

  return "Thanks for reaching out! I'd be happy to help. Could you provide more details about what you're looking for?";
}

function getLastMessage(notes) {
  if (!notes) return '';
  const messages = notes.split('\n').filter(line => line.includes('SMS:') || line.includes('Reply:'));
  return messages.length > 0 ? messages[messages.length - 1].replace(/SMS:|Reply:|\[.*?\]/g, '').trim() : '';
}

function parseMessages(notes) {
  if (!notes) return [];

  const lines = notes.split('\n');
  const messages = [];

  lines.forEach(line => {
    if (line.includes('SMS:')) {
      const content = line.substring(line.indexOf('SMS:') + 4).trim();
      messages.push({
        _id: Date.now().toString(),
        type: 'incoming',
        content,
        timestamp: new Date().toISOString(),
        aiGenerated: false,
        status: 'read'
      });
    } else if (line.includes('Reply:')) {
      const content = line.substring(line.indexOf('Reply:') + 6).replace(/\[.*?\]/g, '').trim();
      const aiGenerated = line.includes('[AI Generated]');
      messages.push({
        _id: Date.now().toString(),
        type: 'outgoing',
        content,
        timestamp: new Date().toISOString(),
        aiGenerated,
        status: 'sent'
      });
    }
  });

  return messages;
}

// ============================================
// CONTACT MANAGEMENT ENDPOINTS
// ============================================

// @desc    Get all contacts
// @route   GET /api/mobile/contacts
// @access  Public (for testing) - TODO: Add auth in production
router.get('/contacts', async (req, res) => {
  try {
    // For testing without auth, use a dummy user ID
    // In production, use req.user.id
    const userId = req.user?.id || '000000000000000000000000';

    const contacts = await Contact.find({
      user: userId,
      isDeleted: false
    })
    .sort({ name: 1 })
    .limit(500);

    res.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single contact by ID
// @route   GET /api/mobile/contacts/:id
// @access  Public (for testing) - TODO: Add auth in production
router.get('/contacts/:id', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new contact
// @route   POST /api/mobile/contacts
// @access  Public (for testing) - TODO: Add auth in production
router.post('/contacts', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { name, phone, email, company, notes } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Check if contact with same phone already exists
    const existingContact = await Contact.findOne({
      user: userId,
      phone,
      isDeleted: false
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'A contact with this phone number already exists'
      });
    }

    // Create contact
    const contact = await Contact.create({
      user: userId,
      name,
      phone,
      email: email || undefined,
      company: company || undefined,
      notes: notes || undefined,
      importSource: 'manual'
    });

    res.status(201).json({
      success: true,
      contact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update contact
// @route   PUT /api/mobile/contacts/:id
// @access  Public (for testing) - TODO: Add auth in production
router.put('/contacts/:id', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { name, phone, email, company, notes } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Find contact
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check if phone is being changed to one that already exists
    if (phone !== contact.phone) {
      const existingContact = await Contact.findOne({
        user: userId,
        phone,
        isDeleted: false,
        _id: { $ne: req.params.id }
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'A contact with this phone number already exists'
        });
      }
    }

    // Update contact
    contact.name = name;
    contact.phone = phone;
    contact.email = email || undefined;
    contact.company = company || undefined;
    contact.notes = notes || undefined;

    await contact.save();

    res.json({
      success: true,
      contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete contact (soft delete)
// @route   DELETE /api/mobile/contacts/:id
// @access  Public (for testing) - TODO: Add auth in production
router.delete('/contacts/:id', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Soft delete
    contact.isDeleted = true;
    await contact.save();

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Bulk import contacts
// @route   POST /api/mobile/contacts/import
// @access  Public (for testing) - TODO: Add auth in production
router.post('/contacts/import', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array is required'
      });
    }

    const importBatchId = Date.now().toString();
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Process each contact
    for (const contactData of contacts) {
      try {
        // Skip if missing required fields
        if (!contactData.name || !contactData.phone) {
          results.skipped++;
          continue;
        }

        // Check if contact already exists
        const existing = await Contact.findOne({
          user: userId,
          phone: contactData.phone,
          isDeleted: false
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create contact
        await Contact.create({
          user: userId,
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email || undefined,
          company: contactData.company || undefined,
          notes: contactData.notes || undefined,
          importSource: 'phone',
          importBatchId
        });

        results.imported++;
      } catch (err) {
        results.errors.push({
          contact: contactData.name,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
      message: `Successfully imported ${results.imported} contact(s). ${results.skipped} skipped (duplicates or invalid).`
    });
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Search contacts
// @route   GET /api/mobile/contacts/search/:query
// @access  Public (for testing) - TODO: Add auth in production
router.get('/contacts/search/:query', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { query } = req.params;

    const contacts = await Contact.searchContacts(userId, query);

    res.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Search contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Add conversation to contact
// @route   POST /api/mobile/contacts/:id/conversation
// @access  Public (for testing) - TODO: Add auth in production
router.post('/contacts/:id/conversation', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { type, direction, content, metadata } = req.body;

    if (!type || !direction || !content) {
      return res.status(400).json({
        success: false,
        message: 'Type, direction, and content are required'
      });
    }

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.addConversation(type, direction, content, metadata);

    res.json({
      success: true,
      contact,
      message: 'Conversation added successfully'
    });
  } catch (error) {
    console.error('Add conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// ARIA-CONTACTS INTEGRATION ENDPOINTS
// ============================================

// @desc    Get contacts summary for Aria (simplified format)
// @route   GET /api/mobile/aria/contacts
// @access  Public (for testing) - TODO: Add auth in production
router.get('/aria/contacts', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const limit = parseInt(req.query.limit) || 100;

    const contacts = await Contact.find({
      user: userId,
      isDeleted: false
    })
    .select('name phone email company tags lastInteraction lastInteractionType')
    .sort({ lastInteraction: -1, name: 1 })
    .limit(limit);

    // Format for Aria's context
    const ariaContacts = contacts.map(c => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      company: c.company,
      tags: c.tags,
      lastContact: c.lastInteraction ? new Date(c.lastInteraction).toLocaleDateString() : 'Never'
    }));

    res.json({
      success: true,
      contacts: ariaContacts,
      count: ariaContacts.length,
      summary: `You have ${ariaContacts.length} contacts in your CRM.`
    });
  } catch (error) {
    console.error('Get aria contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Search contacts for Aria (by name, phone, or company)
// @route   GET /api/mobile/aria/contacts/search
// @access  Public (for testing) - TODO: Add auth in production
router.get('/aria/contacts/search', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const query = req.query.q || '';

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const contacts = await Contact.find({
      user: userId,
      isDeleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { company: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name phone email company notes tags lastInteraction conversationHistory')
    .limit(10);

    const results = contacts.map(c => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      company: c.company,
      notes: c.notes,
      tags: c.tags,
      lastContact: c.lastInteraction ? new Date(c.lastInteraction).toLocaleDateString() : 'Never',
      recentHistory: c.conversationHistory?.slice(-3) || []
    }));

    res.json({
      success: true,
      contacts: results,
      count: results.length,
      summary: results.length > 0
        ? `Found ${results.length} contact(s) matching "${query}": ${results.map(c => c.name).join(', ')}`
        : `No contacts found matching "${query}"`
    });
  } catch (error) {
    console.error('Search aria contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get contact details by phone for Aria
// @route   GET /api/mobile/aria/contacts/by-phone/:phone
// @access  Public (for testing) - TODO: Add auth in production
router.get('/aria/contacts/by-phone/:phone', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const phone = req.params.phone;

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');

    const contact = await Contact.findOne({
      user: userId,
      isDeleted: false,
      $or: [
        { phone: phone },
        { phone: { $regex: normalizedPhone } }
      ]
    });

    if (!contact) {
      return res.json({
        success: true,
        found: false,
        message: `No contact found with phone ${phone}`
      });
    }

    res.json({
      success: true,
      found: true,
      contact: {
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        notes: contact.notes,
        tags: contact.tags,
        lastInteraction: contact.lastInteraction,
        totalCalls: contact.totalCalls,
        totalSMS: contact.totalSMS,
        recentHistory: contact.conversationHistory?.slice(-5) || []
      }
    });
  } catch (error) {
    console.error('Get contact by phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create contact from Aria conversation
// @route   POST /api/mobile/aria/contacts
// @access  Public (for testing) - TODO: Add auth in production
router.post('/aria/contacts', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { name, phone, email, company, notes, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Check for existing contact
    const existing = await Contact.findOne({
      user: userId,
      phone: phone,
      isDeleted: false
    });

    if (existing) {
      return res.json({
        success: true,
        created: false,
        message: `Contact already exists: ${existing.name}`,
        contact: existing
      });
    }

    const contact = await Contact.create({
      user: userId,
      name,
      phone,
      email,
      company,
      notes,
      importSource: source || 'aria',
      tags: ['aria-created']
    });

    res.status(201).json({
      success: true,
      created: true,
      contact,
      message: `Contact "${name}" created successfully`
    });
  } catch (error) {
    console.error('Create aria contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Add note to contact from Aria
// @route   POST /api/mobile/aria/contacts/:id/note
// @access  Public (for testing) - TODO: Add auth in production
router.post('/aria/contacts/:id/note', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Add to conversation history as a note
    await contact.addConversation('note', 'outgoing', note, {
      source: 'aria',
      timestamp: new Date().toISOString()
    });

    // Also append to notes field
    contact.notes = contact.notes
      ? `${contact.notes}\n\n[Aria ${new Date().toLocaleDateString()}]: ${note}`
      : `[Aria ${new Date().toLocaleDateString()}]: ${note}`;

    await contact.save();

    res.json({
      success: true,
      message: `Note added to ${contact.name}'s record`,
      contact
    });
  } catch (error) {
    console.error('Add aria note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Import calendar events
// @route   POST /api/mobile/calendar/import
// @access  Public (for testing) - TODO: Add auth in production
router.post('/calendar/import', async (req, res) => {
  try {
    const userId = req.user?.id || '000000000000000000000000';
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No events provided'
      });
    }

    let imported = 0;
    const errors = [];

    for (const event of events) {
      try {
        // Check if appointment already exists (by title and start time)
        const existing = await Appointment.findOne({
          userId,
          title: event.title,
          startTime: new Date(event.startDate)
        });

        if (existing) {
          console.log(`Skipping duplicate event: ${event.title}`);
          continue;
        }

        // Calculate duration in minutes
        const startTime = new Date(event.startDate);
        const endTime = new Date(event.endDate);
        const duration = Math.round((endTime - startTime) / 60000);

        // Try to find contact by location or notes
        let leadId = null;
        if (event.location || event.notes) {
          // Simple search for phone number in location or notes
          const searchText = `${event.location || ''} ${event.notes || ''}`;
          const phoneMatch = searchText.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);

          if (phoneMatch) {
            const lead = await Lead.findOne({
              user: userId,
              $or: [
                { phone: phoneMatch[0] },
                { phoneNumber: phoneMatch[0] }
              ]
            });
            if (lead) leadId = lead._id;
          }
        }

        // Create appointment
        const appointment = await Appointment.create({
          userId,
          leadId,
          title: event.title,
          description: event.notes || event.location || '',
          type: 'meeting',
          startTime,
          endTime,
          location: event.location || '',
          status: new Date() > startTime ? 'completed' : 'scheduled',
          notes: `Imported from calendar. ${event.notes || ''}`,
          aiScheduled: false,
          reminderSent: new Date() > startTime,
          metadata: {
            imported: true,
            importDate: new Date(),
            originalEventId: event.id
          }
        });

        imported++;
      } catch (err) {
        console.error(`Error importing event ${event.title}:`, err);
        errors.push({ title: event.title, error: err.message });
      }
    }

    res.json({
      success: true,
      imported,
      total: events.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} of ${events.length} events`
    });
  } catch (error) {
    console.error('Calendar import error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;
