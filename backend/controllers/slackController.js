import slackService from '../services/slackService.js';
import Integration from '../models/Integration.js';
import User from '../models/User.js';

/**
 * Test webhook URL
 */
export const testWebhook = async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required' });
    }

    const testMessage = {
      text: '✅ VoiceNow CRM Slack Integration Test',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*VoiceNow CRM Connected!* ✅\n\nYour Slack webhook is working perfectly.'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🤖 Test sent at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    await slackService.sendWebhookMessage(webhookUrl, testMessage);

    res.json({
      success: true,
      message: 'Test message sent successfully! Check your Slack channel.'
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test message'
    });
  }
};

/**
 * Save webhook URL to user settings
 */
export const saveWebhook = async (req, res) => {
  try {
    const { webhookUrl, channel, notifications } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required' });
    }

    // Update user settings
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'settings.slack.webhookUrl': webhookUrl,
          'settings.slack.channel': channel || 'general',
          'settings.slack.notifications': notifications || {
            newLeads: true,
            hotLeads: true,
            completedCalls: true,
            appointments: true,
            deals: true
          },
          'settings.slack.enabled': true
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Slack webhook saved successfully',
      settings: user.settings.slack
    });
  } catch (error) {
    console.error('Save webhook error:', error);
    res.status(500).json({ message: 'Failed to save webhook settings' });
  }
};

/**
 * Get Slack settings
 */
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      slack: user.settings?.slack || {
        enabled: false,
        webhookUrl: '',
        channel: 'general',
        notifications: {
          newLeads: true,
          hotLeads: true,
          completedCalls: true,
          appointments: true,
          deals: true
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

/**
 * Send notification (called by other services)
 */
export const sendNotification = async (userId, type, data) => {
  try {
    const user = await User.findById(userId);

    if (!user?.settings?.slack?.enabled) {
      return { success: false, message: 'Slack not enabled' };
    }

    const notifications = user.settings.slack.notifications || {};

    // Check if this notification type is enabled
    if (!notifications[type]) {
      return { success: false, message: `${type} notifications disabled` };
    }

    let message;
    switch (type) {
      case 'newLeads':
      case 'hotLeads':
        message = slackService.formatNewLeadMessage(data, type === 'hotLeads');
        break;
      case 'completedCalls':
        message = slackService.formatCallCompletedMessage(data);
        break;
      case 'appointments':
        message = slackService.formatAppointmentMessage(data);
        break;
      case 'deals':
        message = slackService.formatDealUpdateMessage(data, data.action);
        break;
      default:
        message = { text: `New ${type} notification`, blocks: [] };
    }

    await slackService.sendWebhookMessage(user.settings.slack.webhookUrl, message);

    return { success: true };
  } catch (error) {
    console.error('Send notification error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get available channels (if using OAuth)
 */
export const getChannels = async (req, res) => {
  try {
    const channels = await slackService.getChannels(req.user._id);

    res.json({
      success: true,
      channels
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch channels'
    });
  }
};

/**
 * Disable Slack notifications
 */
export const disableNotifications = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'settings.slack.enabled': false
      }
    });

    res.json({
      success: true,
      message: 'Slack notifications disabled'
    });
  } catch (error) {
    console.error('Disable notifications error:', error);
    res.status(500).json({ message: 'Failed to disable notifications' });
  }
};

export default {
  testWebhook,
  saveWebhook,
  getSettings,
  sendNotification,
  getChannels,
  disableNotifications
};
