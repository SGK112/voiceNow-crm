import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';
import Usage from '../models/Usage.js';

export const getMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalAgents = await VoiceAgent.countDocuments({ userId });
    const activeAgents = await VoiceAgent.countDocuments({ userId, enabled: true });
    const pausedAgents = await VoiceAgent.countDocuments({ userId, enabled: false });

    const totalCalls = await CallLog.countDocuments({ userId });
    const successfulCalls = await CallLog.countDocuments({ userId, status: 'completed' });

    const totalLeads = await Lead.countDocuments({ userId });
    const qualifiedLeads = await Lead.countDocuments({ userId, qualified: true });

    const usage = await Usage.findOne({ userId });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const callsThisMonth = await CallLog.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    const callsLastMonth = await CallLog.countDocuments({
      userId,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const leadsThisMonth = await Lead.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    const leadsLastMonth = await Lead.countDocuments({
      userId,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const totalLeadValue = await Lead.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const revenueImpact = totalLeadValue.length > 0 ? totalLeadValue[0].total : 0;

    const avgCallDuration = await CallLog.aggregate([
      { $match: { userId: userId, status: 'completed' } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' }, totalDuration: { $sum: '$duration' } } }
    ]);

    // Calculate growth percentages
    const callsGrowth = callsLastMonth > 0
      ? (((callsThisMonth - callsLastMonth) / callsLastMonth) * 100).toFixed(1)
      : callsThisMonth > 0 ? 100 : 0;

    const leadsGrowth = leadsLastMonth > 0
      ? (((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100).toFixed(1)
      : leadsThisMonth > 0 ? 100 : 0;

    res.json({
      agents: {
        total: totalAgents,
        active: activeAgents,
        paused: pausedAgents
      },
      calls: {
        total: totalCalls,
        successful: successfulCalls,
        successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0,
        avgDuration: avgCallDuration.length > 0 ? Math.round(avgCallDuration[0].avgDuration) : 0,
        totalDuration: avgCallDuration.length > 0 ? Math.round(avgCallDuration[0].totalDuration) : 0
      },
      leads: {
        total: totalLeads,
        qualified: qualifiedLeads,
        conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : 0
      },
      thisMonth: {
        calls: callsThisMonth,
        leads: leadsThisMonth,
        callsGrowth: parseFloat(callsGrowth),
        leadsGrowth: parseFloat(leadsGrowth)
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

export const getCallTrends = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const callsByDay = await CallLog.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(callsByDay);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const userId = req.user._id;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const agentStats = await CallLog.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$agentId',
          totalCalls: { $sum: 1 },
          successfulCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'voiceagents',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: { path: '$agent', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          agentName: '$agent.name',
          agentType: '$agent.type',
          totalCalls: 1,
          successfulCalls: 1,
          successRate: {
            $cond: [
              { $gt: ['$totalCalls', 0] },
              { $multiply: [{ $divide: ['$successfulCalls', '$totalCalls'] }, 100] },
              0
            ]
          },
          totalDuration: 1,
          avgDuration: { $round: ['$avgDuration', 0] }
        }
      },
      {
        $sort: { totalCalls: -1 }
      }
    ]);

    res.json(agentStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
