import CallLog from '../models/CallLog.js';
import VoiceAgent from '../models/VoiceAgent.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Usage from '../models/Usage.js';
import ElevenLabsService from '../services/elevenLabsService.js';

// Lazy initialization to ensure env vars are loaded
let elevenLabsServiceInstance = null;
const getElevenLabsService = () => {
  if (!elevenLabsServiceInstance) {
    elevenLabsServiceInstance = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
  }
  return elevenLabsServiceInstance;
};

export const getCalls = async (req, res) => {
  try {
    const { page = 1, limit = 50, agentId, status, startDate, endDate } = req.query;

    const filter = { userId: req.user._id };

    if (agentId) filter.agentId = agentId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const calls = await CallLog.find(filter)
      .populate('agentId', 'name type')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CallLog.countDocuments(filter);

    res.json({
      calls,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCallById = async (req, res) => {
  try {
    const call = await CallLog.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('agentId', 'name type voiceId');

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCall = async (req, res) => {
  try {
    const call = await CallLog.findOne({ _id: req.params.id, userId: req.user._id });

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    await call.deleteOne();
    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const initiateCall = async (req, res) => {
  try {
    const { leadId, agentId, phoneNumber } = req.body;

    // Validate required fields
    if (!agentId || !phoneNumber) {
      return res.status(400).json({ message: 'Agent ID and phone number are required' });
    }

    // Get user to check subscription limits
    const user = await User.findById(req.user._id);

    // Get or create usage record for this month
    const usage = await Usage.getOrCreateForUser(req.user._id, user);

    // Check monthly minute limits based on plan
    const minutesRemaining = usage.minutesIncluded - usage.minutesUsed;

    // For trial users, block calls if out of minutes
    if (user.plan === 'trial' && minutesRemaining <= 0) {
      return res.status(403).json({
        message: `You've used all ${usage.minutesIncluded} trial minutes. Upgrade to continue making calls.`
      });
    }

    // For paid plans, warn if low on minutes
    if (minutesRemaining <= 10 && minutesRemaining > 0) {
      // Set a warning in the response (will be handled below)
      res.locals.warningMessage = `Warning: Only ${Math.floor(minutesRemaining)} minutes remaining on your ${user.plan} plan.`;
    }

    // Get the agent
    const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    if (!agent.elevenLabsAgentId) {
      return res.status(400).json({ message: 'Agent not configured properly' });
    }

    // Get lead info if provided
    let lead = null;
    if (leadId) {
      lead = await Lead.findOne({ _id: leadId, userId: req.user._id });
    }

    // Build dynamic variables for personalized conversation
    const dynamicVariables = {};

    if (lead) {
      // Standard lead variables
      dynamicVariables.lead_name = lead.name;
      dynamicVariables.lead_email = lead.email;
      dynamicVariables.lead_phone = lead.phone;
      dynamicVariables.lead_status = lead.status;
      dynamicVariables.lead_source = lead.source;

      // Additional context
      if (lead.qualified) dynamicVariables.qualified = 'yes';
      if (lead.qualificationScore) dynamicVariables.qualification_score = lead.qualificationScore.toString();
      if (lead.value) dynamicVariables.estimated_value = `$${lead.value}`;
      if (lead.assignedTo) dynamicVariables.assigned_to = lead.assignedTo;

      // Custom fields (if any)
      if (lead.customFields && lead.customFields.size > 0) {
        lead.customFields.forEach((value, key) => {
          // Convert custom field names to snake_case for consistency
          const varName = key.toLowerCase().replace(/\s+/g, '_');
          dynamicVariables[varName] = value;
        });
      }
    } else {
      // No lead record - use phone number as identifier
      dynamicVariables.lead_name = phoneNumber;
      dynamicVariables.lead_phone = phoneNumber;
    }

    // Add user/company context
    // Fix: User model has 'company' field, not 'companyName'
    dynamicVariables.company_name = user.company || 'our company';
    dynamicVariables.agent_type = agent.type;

    // Replace template variables in the agent's script and first message
    // This ensures personalized prompts for each call
    let personalizedScript = agent.script || '';
    let personalizedFirstMessage = agent.firstMessage || '';

    // Helper function to safely escape regex special characters and handle null/undefined
    const escapeRegex = (str) => {
      return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const safeStringify = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number' && value === 0) return '0';
      return String(value);
    };

    // Replace all {{variable}} placeholders with actual values
    Object.keys(dynamicVariables).forEach(key => {
      const safeValue = safeStringify(dynamicVariables[key]);
      // Only replace if we have a non-empty value to avoid leaving empty spaces
      if (safeValue) {
        const placeholder = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g');
        personalizedScript = personalizedScript.replace(placeholder, safeValue);
        personalizedFirstMessage = personalizedFirstMessage.replace(placeholder, safeValue);
      }
    });

    console.log('📝 Personalized script preview:', personalizedScript.substring(0, Math.min(200, personalizedScript.length)));
    console.log('📝 Personalized first message:', personalizedFirstMessage);

    console.log('\n📞 [INITIATE CALL] Making call with ElevenLabs Conversational AI');
    console.log('   Phone: ', phoneNumber);
    console.log('   Agent: ', agent.name);
    console.log('   Voice: ', agent.voiceName, `(${agent.voiceId})`);
    console.log('   ElevenLabs Agent ID:', agent.elevenLabsAgentId);

    // Use ElevenLabs batch calling API to make the call
    const ElevenLabsService = (await import('../services/elevenLabsService.js')).default;
    const elevenLabsService = new ElevenLabsService();

    // Check if we have a valid ElevenLabs agent ID
    if (!agent.elevenLabsAgentId || agent.elevenLabsAgentId.startsWith('local_')) {
      console.error('❌ Agent does not have a valid ElevenLabs agent ID');
      return res.status(400).json({
        message: 'This agent was not properly created in ElevenLabs. Please recreate the agent.'
      });
    }

    // Get the ElevenLabs phone number ID from environment
    const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    if (!agentPhoneNumberId) {
      console.error('❌ ELEVENLABS_PHONE_NUMBER_ID not configured');
      return res.status(500).json({
        message: 'ElevenLabs phone number not configured. Please contact support.'
      });
    }

    // Make the call using ElevenLabs batch calling
    let callData;
    try {
      console.log(`📞 Calling ${phoneNumber} with ElevenLabs agent ${agent.elevenLabsAgentId}`);

      // Prepare webhook URL for call events
      const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/elevenlabs/conversation-event`;
      console.log(`🔗 Webhook URL: ${webhookUrl}`);

      // Initiate call with personalized script and first message
      callData = await elevenLabsService.initiateCall(
        agent.elevenLabsAgentId,
        phoneNumber,
        agentPhoneNumberId,
        webhookUrl,
        dynamicVariables,
        personalizedScript,
        personalizedFirstMessage
      );

      const callId = callData.id || callData.call_id || callData.batch_id;
      console.log(`✅ [INITIATE CALL] Call initiated via ElevenLabs: ${callId}`);
    } catch (error) {
      console.error('❌ [INITIATE CALL] Failed to make call:', error.message);
      return res.status(500).json({
        message: 'Failed to initiate call: ' + error.message
      });
    }

    // Create call log
    const call = await CallLog.create({
      userId: req.user._id,
      agentId: agent._id,
      leadId: leadId || null,
      elevenLabsCallId: callData.id || callData.call_id || callData.batch_id,
      phoneNumber,
      status: 'initiated',
      direction: 'outbound',
      metadata: {
        personalizedScript,
        personalizedFirstMessage,
        dynamicVariables
      }
    });

    // Update lead status if applicable
    if (lead) {
      lead.status = 'contacted';
      lead.lastContactedAt = new Date();
      await lead.save();
    }

    res.json({ message: 'Call initiated successfully', call });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ message: error.message });
  }
};
