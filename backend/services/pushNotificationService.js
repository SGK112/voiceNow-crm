import { Expo } from 'expo-server-sdk';
import PushToken from '../models/PushToken.js';

export class PushNotificationService {
  constructor() {
    this.expo = new Expo();
  }

  /**
   * Register a push token for a user
   */
  async registerToken(userId, pushToken, platform, deviceInfo = {}) {
    try {
      // Validate push token
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      // Check if token already exists
      let tokenDoc = await PushToken.findOne({ pushToken });

      if (tokenDoc) {
        // Update existing token
        tokenDoc.userId = userId;
        tokenDoc.platform = platform;
        tokenDoc.deviceInfo = deviceInfo;
        tokenDoc.isActive = true;
        tokenDoc.lastUsed = new Date();
        await tokenDoc.save();
        console.log(` [PUSH] Updated token for user: ${userId}`);
      } else {
        // Create new token
        tokenDoc = await PushToken.create({
          userId,
          pushToken,
          platform,
          deviceInfo,
          isActive: true
        });
        console.log(` [PUSH] Registered new token for user: ${userId}`);
      }

      return {
        success: true,
        tokenId: tokenDoc._id
      };
    } catch (error) {
      console.error('L [PUSH] Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      // Get user's active tokens
      const tokens = await PushToken.find({
        userId,
        isActive: true
      });

      if (tokens.length === 0) {
        console.log(`   [PUSH] No active tokens for user: ${userId}`);
        return {
          success: false,
          error: 'No active tokens found'
        };
      }

      // Prepare messages
      const messages = tokens.map(tokenDoc => ({
        to: tokenDoc.pushToken,
        sound: 'default',
        title,
        body,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        priority: 'high',
        channelId: 'default'
      }));

      // Send notifications
      const result = await this.sendNotifications(messages);

      // Update lastUsed for successful tokens
      await Promise.all(
        tokens.map(token => token.markAsUsed())
      );

      return result;
    } catch (error) {
      console.error('L [PUSH] Send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notifications via Expo Push API
   */
  async sendNotifications(messages) {
    try {
      // Split messages into chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      console.log(`=ä [PUSH] Sending ${messages.length} notifications in ${chunks.length} chunks`);

      // Send each chunk
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('L [PUSH] Chunk send error:', error);
        }
      }

      // Check for errors in tickets
      const errors = tickets.filter(ticket => ticket.status === 'error');
      if (errors.length > 0) {
        console.error('L [PUSH] Some notifications failed:', errors);
      }

      console.log(` [PUSH] Sent ${tickets.length} notifications (${errors.length} errors)`);

      return {
        success: true,
        sent: tickets.length,
        errors: errors.length,
        tickets
      };
    } catch (error) {
      console.error('L [PUSH] Send notifications error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send notification via Aria
   */
  async sendAriaNotification(userId, message, options = {}) {
    const {
      title = 'Aria AI Assistant',
      priority = 'normal',
      category = 'message'
    } = options;

    return await this.sendToUser(userId, title, message, {
      type: 'aria_notification',
      category,
      priority
    });
  }

  /**
   * Send reminder notification
   */
  async sendReminder(userId, reminderText, time) {
    return await this.sendToUser(
      userId,
      'ð Reminder from Aria',
      reminderText,
      {
        type: 'reminder',
        time
      }
    );
  }

  /**
   * Send task notification
   */
  async sendTaskNotification(userId, taskDescription, dueDate) {
    return await this.sendToUser(
      userId,
      ' Task Update',
      taskDescription,
      {
        type: 'task',
        dueDate
      }
    );
  }

  /**
   * Send alert notification
   */
  async sendAlert(userId, alertMessage, severity = 'info') {
    const emoji = {
      info: '9',
      warning: ' ',
      error: '=¨',
      success: ''
    };

    return await this.sendToUser(
      userId,
      `${emoji[severity] || '9'} Alert`,
      alertMessage,
      {
        type: 'alert',
        severity
      }
    );
  }

  /**
   * Get user's registered tokens
   */
  async getUserTokens(userId) {
    return await PushToken.find({
      userId,
      isActive: true
    }).select('pushToken platform lastUsed');
  }

  /**
   * Deactivate a token
   */
  async deactivateToken(pushToken) {
    try {
      const token = await PushToken.findOne({ pushToken });
      if (token) {
        await token.deactivate();
        console.log(` [PUSH] Deactivated token: ${pushToken}`);
        return { success: true };
      }
      return { success: false, error: 'Token not found' };
    } catch (error) {
      console.error('L [PUSH] Deactivation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old inactive tokens
   */
  async cleanupOldTokens(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await PushToken.deleteMany({
        isActive: false,
        lastUsed: { $lt: cutoffDate }
      });

      console.log(` [PUSH] Cleaned up ${result.deletedCount} old tokens`);
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('L [PUSH] Cleanup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
