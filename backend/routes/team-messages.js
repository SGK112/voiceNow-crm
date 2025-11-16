import express from 'express';
import TeamMessage from '../models/TeamMessage.js';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get messages for a channel
router.get('/channel/:channel', protect, async (req, res) => {
  try {
    const { channel } = req.params;
    const { limit = 50, before } = req.query;

    const query = {
      userId: req.user.userId,
      channel
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await TeamMessage.find(query)
      .populate('senderId', 'name email')
      .populate('mentions', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get messages for a lead
router.get('/lead/:leadId', protect, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const messages = await TeamMessage.find({ leadId })
      .populate('senderId', 'name email')
      .populate('mentions', 'name email')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching lead messages:', error);
    res.status(500).json({ error: 'Failed to fetch lead messages' });
  }
});

// Get unread messages
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await TeamMessage.countDocuments({
      userId: req.user.userId,
      'readBy.userId': { $ne: req.user.userId }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error counting unread messages:', error);
    res.status(500).json({ error: 'Failed to count unread messages' });
  }
});

// Get messages with mentions
router.get('/mentions/me', protect, async (req, res) => {
  try {
    const messages = await TeamMessage.find({
      userId: req.user.userId,
      mentions: req.user.userId
    })
      .populate('senderId', 'name email')
      .populate('leadId', 'name company')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching mentions:', error);
    res.status(500).json({ error: 'Failed to fetch mentions' });
  }
});

// Send a message
router.post('/', protect, async (req, res) => {
  try {
    const {
      channel,
      leadId,
      message,
      messageType,
      mentions,
      attachments
    } = req.body;

    const teamMessage = new TeamMessage({
      userId: req.user.userId,
      leadId,
      channel,
      senderId: req.user.userId,
      senderName: req.user.name,
      senderEmail: req.user.email,
      message,
      messageType: messageType || 'text',
      mentions: mentions || [],
      attachments: attachments || []
    });

    await teamMessage.save();

    // TODO: Send to Slack if integration is active
    // TODO: Send notifications to mentioned users

    const populatedMessage = await TeamMessage.findById(teamMessage._id)
      .populate('senderId', 'name email')
      .populate('mentions', 'name email');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.patch('/:messageId/read', protect, async (req, res) => {
  try {
    const message = await TeamMessage.findOne({
      _id: req.params.messageId,
      userId: req.user.userId
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const alreadyRead = message.readBy.some(
      r => r.userId.toString() === req.user.userId
    );

    if (!alreadyRead) {
      message.readBy.push({
        userId: req.user.userId,
        readAt: new Date()
      });
      await message.save();
    }

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Mark all messages in channel as read
router.post('/channel/:channel/mark-read', protect, async (req, res) => {
  try {
    const { channel } = req.params;

    await TeamMessage.updateMany(
      {
        userId: req.user.userId,
        channel,
        'readBy.userId': { $ne: req.user.userId }
      },
      {
        $push: {
          readBy: {
            userId: req.user.userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    console.error('Error marking channel as read:', error);
    res.status(500).json({ error: 'Failed to mark channel as read' });
  }
});

// Delete a message
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const message = await TeamMessage.findOne({
      _id: req.params.messageId,
      senderId: req.user.userId // Only sender can delete
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    await message.deleteOne();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get active channels
router.get('/channels/list', protect, async (req, res) => {
  try {
    const channels = await TeamMessage.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: '$channel',
          lastMessage: { $max: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $in: [req.user.userId, '$readBy.userId'] },
                0,
                1
              ]
            }
          }
        }
      },
      { $sort: { lastMessage: -1 } }
    ]);

    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

export default router;
