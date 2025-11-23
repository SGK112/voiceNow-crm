import express from 'express';
import { protect as auth } from '../middleware/auth.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';

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
// @access  Private
router.get('/call-history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const leads = await Lead.find({
      user: req.user.id,
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
// @access  Private
router.get('/sms-threads', auth, async (req, res) => {
  try {
    const leads = await Lead.find({
      user: req.user.id,
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

export default router;
