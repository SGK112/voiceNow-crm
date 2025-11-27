import express from 'express';
import { pushNotificationService } from '../services/pushNotificationService.js';
import PushToken from '../models/PushToken.js';

const router = express.Router();

/**
 * POST /api/notifications/register
 * Register a push notification token
 */
router.post('/register', async (req, res) => {
  try {
    const { userId, pushToken, platform, deviceInfo } = req.body;

    if (!userId || !pushToken || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, pushToken, platform'
      });
    }

    const result = await pushNotificationService.registerToken(
      userId,
      pushToken,
      platform,
      deviceInfo
    );

    res.json(result);
  } catch (error) {
    console.error('L [NOTIFICATIONS] Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/send
 * Send a notification to a user
 */
router.post('/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, body'
      });
    }

    const result = await pushNotificationService.sendToUser(
      userId,
      title,
      body,
      data
    );

    res.json(result);
  } catch (error) {
    console.error('L [NOTIFICATIONS] Send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/aria
 * Send notification from Aria
 */
router.post('/aria', async (req, res) => {
  try {
    const { userId, message, options } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, message'
      });
    }

    const result = await pushNotificationService.sendAriaNotification(
      userId,
      message,
      options
    );

    res.json(result);
  } catch (error) {
    console.error('L [NOTIFICATIONS] Aria notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/reminder
 * Send a reminder notification
 */
router.post('/reminder', async (req, res) => {
  try {
    const { userId, reminderText, time } = req.body;

    if (!userId || !reminderText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, reminderText'
      });
    }

    const result = await pushNotificationService.sendReminder(
      userId,
      reminderText,
      time
    );

    res.json(result);
  } catch (error) {
    console.error('L [NOTIFICATIONS] Reminder error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/alert
 * Send an alert notification
 */
router.post('/alert', async (req, res) => {
  try {
    const { userId, alertMessage, severity } = req.body;

    if (!userId || !alertMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, alertMessage'
      });
    }

    const result = await pushNotificationService.sendAlert(
      userId,
      alertMessage,
      severity
    );

    res.json(result);
  } catch (error) {
    console.error('L [NOTIFICATIONS] Alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/tokens/:userId
 * Get user's registered tokens
 */
router.get('/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tokens = await pushNotificationService.getUserTokens(userId);

    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('L [NOTIFICATIONS] Get tokens error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/notifications/token
 * Deactivate a push token
 */
router.delete('/token', async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: pushToken'
      });
    }

    const result = await pushNotificationService.deactivateToken(pushToken);
    res.json(result);
  } catch (error) {
    console.error('L [NOTIFICATIONS] Deactivation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/test
 * Send a test notification
 */
router.post('/test', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    const result = await pushNotificationService.sendToUser(
      userId,
