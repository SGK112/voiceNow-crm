import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';
import ElevenLabsService from '../services/elevenLabsService.js';

// Use centralized ElevenLabs service with platform credentials
const elevenLabsService = new ElevenLabsService();

export const getAgents = async (req, res) => {
  try {
    const agents = await VoiceAgent.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentById = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAgent = async (req, res) => {
  try {
    const { name, type, voiceId, script, phoneNumber } = req.body;

    // Get user to check subscription limits
    const user = await User.findById(req.user._id);

    // Check subscription limits based on plan
    const agentCount = await VoiceAgent.countDocuments({ userId: req.user._id });
    const planLimits = {
      trial: 1,
      starter: 1,
      professional: 5,
      enterprise: Infinity
    };

    const maxAgents = planLimits[user.plan] || 1;
    if (agentCount >= maxAgents) {
      return res.status(403).json({
        message: `Your ${user.plan} plan allows up to ${maxAgents} agent(s). Upgrade to create more agents.`
      });
    }

    // Get prebuilt agent configuration
    const prebuiltAgents = elevenLabsService.getPrebuiltAgents();
    const prebuiltAgent = prebuiltAgents[type];

    if (!prebuiltAgent) {
      return res.status(400).json({ message: 'Invalid agent type' });
    }

    // Create agent in ElevenLabs using PLATFORM credentials
    let elevenLabsAgent;
    try {
      elevenLabsAgent = await elevenLabsService.createAgent({
        name: name || prebuiltAgent.name,
        voiceId: voiceId || prebuiltAgent.voiceId,
        script: script || prebuiltAgent.script,
        firstMessage: `Hi! I'm ${name || prebuiltAgent.name}. How can I help you today?`
      });
    } catch (error) {
      console.error('Failed to create agent in ElevenLabs:', error.message);
      return res.status(500).json({
        message: 'Failed to create agent. Please try again or contact support.'
      });
    }

    // Save to database with REAL elevenLabsAgentId
    const agent = await VoiceAgent.create({
      userId: req.user._id,
      name: name || prebuiltAgent.name,
      type,
      elevenLabsAgentId: elevenLabsAgent.agent_id,
      voiceId: voiceId || prebuiltAgent.voiceId,
      script: script || prebuiltAgent.script,
      phoneNumber,
      availability: {
        enabled: true,
        timezone: 'America/New_York',
        hours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      }
    });

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const { name, script, phoneNumber, enabled, availability, configuration } = req.body;

    if (name) agent.name = name;
    if (script) agent.script = script;
    if (phoneNumber !== undefined) agent.phoneNumber = phoneNumber;
    if (enabled !== undefined) agent.enabled = enabled;
    if (availability) agent.availability = { ...agent.availability, ...availability };
    if (configuration) agent.configuration = { ...agent.configuration, ...configuration };

    if (script && agent.elevenLabsAgentId) {
      try {
        await elevenLabsService.updateAgent(agent.elevenLabsAgentId, {
          name: agent.name,
          script: agent.script
        });
      } catch (error) {
        console.error('Failed to update ElevenLabs agent:', error);
      }
    }

    await agent.save();
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAgent = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.deleteOne();
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentCalls = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const calls = await CallLog.find({ agentId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const totalCalls = await CallLog.countDocuments({ agentId: req.params.id });
    const successfulCalls = await CallLog.countDocuments({ agentId: req.params.id, status: 'completed' });

    const avgDuration = await CallLog.aggregate([
      { $match: { agentId: agent._id } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const callsByDay = await CallLog.aggregate([
      {
        $match: {
          agentId: agent._id,
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalCalls,
      successfulCalls,
      successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0,
      averageDuration: avgDuration.length > 0 ? Math.round(avgDuration[0].avgDuration) : 0,
      leadsGenerated: agent.performance.leadsGenerated,
      callsByDay
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
