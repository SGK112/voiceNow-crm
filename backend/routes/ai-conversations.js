import express from 'express';
import AIConversation from '../models/AIConversation.js';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for a lead
router.get('/lead/:leadId', protect, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const conversations = await AIConversation.find({ leadId })
      .populate('agentId', 'name configuration')
      .populate('callId')
      .sort({ createdAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get all conversations for user
router.get('/', protect, async (req, res) => {
  try {
    const { type, status, sentiment } = req.query;

    const query = { userId: req.user.userId };
    if (type) query.type = type;
    if (status) query.status = status;
    if (sentiment) query.sentiment = sentiment;

    const conversations = await AIConversation.find(query)
      .populate('leadId', 'name email company phone')
      .populate('agentId', 'name configuration')
      .sort({ createdAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get a single conversation
router.get('/:conversationId', protect, async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.userId
    })
      .populate('leadId', 'name email company phone')
      .populate('agentId', 'name configuration')
      .populate('callId');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create a new conversation
router.post('/', protect, async (req, res) => {
  try {
    const {
      leadId,
      agentId,
      callId,
      type,
      messages,
      transcript
    } = req.body;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const conversation = new AIConversation({
      userId: req.user.userId,
      leadId,
      agentId,
      callId,
      type: type || 'voice',
      messages: messages || [],
      transcript
    });

    await conversation.save();

    // Update lead's last activity
    lead.lastActivityType = 'ai_call';
    lead.lastActivityAt = new Date();
    await lead.save();

    const populatedConversation = await AIConversation.findById(conversation._id)
      .populate('leadId', 'name email company')
      .populate('agentId', 'name');

    res.status(201).json(populatedConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update a conversation (for real-time updates during call)
router.put('/:conversationId', protect, async (req, res) => {
  try {
    const {
      messages,
      transcript,
      summary,
      sentiment,
      sentimentScore,
      keyPoints,
      actionItems,
      duration,
      recordingUrl,
      status
    } = req.body;

    const conversation = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (messages !== undefined) conversation.messages = messages;
    if (transcript !== undefined) conversation.transcript = transcript;
    if (summary !== undefined) conversation.summary = summary;
    if (sentiment !== undefined) conversation.sentiment = sentiment;
    if (sentimentScore !== undefined) conversation.sentimentScore = sentimentScore;
    if (keyPoints !== undefined) conversation.keyPoints = keyPoints;
    if (actionItems !== undefined) conversation.actionItems = actionItems;
    if (duration !== undefined) conversation.duration = duration;
    if (recordingUrl !== undefined) conversation.recordingUrl = recordingUrl;
    if (status !== undefined) conversation.status = status;

    await conversation.save();

    const updatedConversation = await AIConversation.findById(conversation._id)
      .populate('leadId', 'name email company')
      .populate('agentId', 'name');

    res.json(updatedConversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Add message to conversation
router.post('/:conversationId/messages', protect, async (req, res) => {
  try {
    const { role, content, metadata } = req.body;

    const conversation = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata
    });

    await conversation.save();

    res.json(conversation);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Mark action item as completed
router.patch('/:conversationId/action-items/:index/complete', protect, async (req, res) => {
  try {
    const { index } = req.params;

    const conversation = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.actionItems[index]) {
      conversation.actionItems[index].completed = true;
      await conversation.save();
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error updating action item:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

// Get conversation analytics
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { userId: req.user.userId };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const analytics = await AIConversation.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          avgSentimentScore: { $avg: '$sentimentScore' }
        }
      }
    ]);

    const totalConversations = await AIConversation.countDocuments(query);
    const completedConversations = await AIConversation.countDocuments({
      ...query,
      status: 'completed'
    });

    res.json({
      totalConversations,
      completedConversations,
      sentimentBreakdown: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get AI recommendations for scheduling calls
router.get('/recommend', protect, async (req, res) => {
  try {
    const { leadId } = req.query;

    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get past conversations to analyze patterns
    const conversations = await AIConversation.find({ leadId })
      .populate('agentId')
      .sort({ createdAt: -1 });

    // Analyze sentiment and engagement patterns
    const sentimentCounts = {};
    conversations.forEach(conv => {
      sentimentCounts[conv.sentiment] = (sentimentCounts[conv.sentiment] || 0) + 1;
    });

    // Determine best times based on successful past conversations
    const bestTimes = [];
    const successfulConversations = conversations.filter(c =>
      c.sentiment === 'positive' && c.status === 'completed'
    );

    if (successfulConversations.length > 0) {
      // Extract hours from successful conversations
      const hourCounts = {};
      successfulConversations.forEach(conv => {
        const hour = new Date(conv.createdAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      // Get top 3 hours
      const topHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      topHours.forEach(hour => {
        bestTimes.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          reason: `${hourCounts[hour]} successful calls at this time`
        });
      });
    }

    // Default times if no history
    if (bestTimes.length === 0) {
      bestTimes.push(
        { time: '09:00', reason: 'High engagement morning slot' },
        { time: '14:00', reason: 'Post-lunch availability' },
        { time: '16:00', reason: 'Late afternoon follow-up' }
      );
    }

    // Find recommended agent based on past success
    let recommendedAgent = null;
    if (successfulConversations.length > 0) {
      const agentSuccessCount = {};
      successfulConversations.forEach(conv => {
        if (conv.agentId) {
          const agentId = conv.agentId._id.toString();
          agentSuccessCount[agentId] = (agentSuccessCount[agentId] || 0) + 1;
        }
      });

      const topAgent = Object.entries(agentSuccessCount)
        .sort(([,a], [,b]) => b - a)[0];

      if (topAgent) {
        recommendedAgent = topAgent[0];
      }
    }

    res.json({
      bestTimes,
      recommendedAgent,
      insights: {
        totalConversations: conversations.length,
        sentimentBreakdown: sentimentCounts,
        successRate: successfulConversations.length / Math.max(conversations.length, 1)
      }
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Delete a conversation
router.delete('/:conversationId', protect, async (req, res) => {
  try {
    const conversation = await AIConversation.findOneAndDelete({
      _id: req.params.conversationId,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
