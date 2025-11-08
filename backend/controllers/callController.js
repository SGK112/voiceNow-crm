import CallLog from '../models/CallLog.js';
import VoiceAgent from '../models/VoiceAgent.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
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

    // Check monthly call limits based on plan
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const callsThisMonth = await CallLog.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: startOfMonth }
    });

    const planLimits = {
      trial: 10,        // 10 calls for trial
      starter: 100,     // 100 calls/month
      professional: 500, // 500 calls/month
      enterprise: Infinity // Unlimited
    };

    const maxCalls = planLimits[user.plan] || 10;
    if (callsThisMonth >= maxCalls) {
      return res.status(403).json({
        message: `You've reached your ${user.plan} plan limit of ${maxCalls} calls/month. Upgrade to make more calls.`
      });
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

    // Make the call using PLATFORM credentials
    let callData;
    try {
      callData = await elevenLabsService.initiateCall(
        agent.elevenLabsAgentId,
        phoneNumber,
        `${process.env.API_URL || 'http://localhost:5000'}/api/webhooks/elevenlabs/call-completed`
      );
    } catch (error) {
      console.error('Failed to initiate call with ElevenLabs:', error.message);
      return res.status(500).json({
        message: 'Failed to initiate call. Please try again or contact support.'
      });
    }

    // Create call log
    const call = await CallLog.create({
      userId: req.user._id,
      agentId: agent._id,
      leadId: leadId || null,
      elevenLabsCallId: callData.call_id,
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
