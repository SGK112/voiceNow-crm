import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';
import Usage from '../models/Usage.js';

export const getMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalAgents = await VoiceAgent.countDocuments({ userId });
    const activeAgents = await VoiceAgent.countDocuments({ userId, enabled: true });

    const totalCalls = await CallLog.countDocuments({ userId });
    const successfulCalls = await CallLog.countDocuments({ userId, status: 'completed' });

    const totalLeads = await Lead.countDocuments({ userId });
    const qualifiedLeads = await Lead.countDocuments({ userId, qualified: true });

    const usage = await Usage.findOne({ userId });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const callsThisMonth = await CallLog.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    const leadsThisMonth = await Lead.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    const totalLeadValue = await Lead.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const revenueImpact = totalLeadValue.length > 0 ? totalLeadValue[0].total : 0;

    const avgCallDuration = await CallLog.aggregate([
      { $match: { userId: userId, status: 'completed' } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    res.json({
      agents: {
        total: totalAgents,
        active: activeAgents
      },
      calls: {
        total: totalCalls,
        successful: successfulCalls,
        successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0,
        averageDuration: avgCallDuration.length > 0 ? Math.round(avgCallDuration[0].avgDuration) : 0
      },
      leads: {
        total: totalLeads,
        qualified: qualifiedLeads,
        conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : 0
      },
      thisMonth: {
        calls: callsThisMonth,
        leads: leadsThisMonth
      },
      revenueImpact,
      usage: usage || { callsThisMonth: 0, leadsGenerated: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCallsToday = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calls = await CallLog.find({
      userId,
      createdAt: { $gte: today }
    })
      .populate('agentId', 'name type')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeadsThisMonth = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const leads = await Lead.find({
      userId,
      createdAt: { $gte: startOfMonth }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
