import CallLog from '../models/CallLog.js';
import VoiceAgent from '../models/VoiceAgent.js';

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
