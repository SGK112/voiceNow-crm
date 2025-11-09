import CallLog from '../models/CallLog.js';
import VoiceAgent from '../models/VoiceAgent.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Usage from '../models/Usage.js';
import ElevenLabsService from '../services/elevenLabsService.js';

// Use centralized ElevenLabs service with platform credentials
const elevenLabsService = new ElevenLabsService();

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
    dynamicVariables.company_name = user.companyName || user.name || 'our company';
    dynamicVariables.agent_type = agent.type;

    // Make the call using PLATFORM credentials
    const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID || 'phnum_1801k7xb68cefjv89rv10f90qykv';

    let callData;
    try {
      callData = await elevenLabsService.initiateCall(
        agent.elevenLabsAgentId,
        phoneNumber,
        agentPhoneNumberId,
        `${process.env.API_URL || 'http://localhost:5000'}/api/webhooks/elevenlabs/call-completed`,
        dynamicVariables
      );
    } catch (error) {
      console.error('Failed to initiate call with ElevenLabs:', error.message);
      return res.status(500).json({
        message: 'Failed to initiate call. Please try again or contact support.'
      });
    }

    // Create call log
    // Note: batch calling returns batch_id, not call_id
    const call = await CallLog.create({
      userId: req.user._id,
      agentId: agent._id,
      leadId: leadId || null,
      elevenLabsCallId: callData.id || callData.call_id, // batch returns 'id'
      phoneNumber,
      status: 'initiated',
      direction: 'outbound'
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
