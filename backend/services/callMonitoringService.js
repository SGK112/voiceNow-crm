import EventEmitter from 'events';
import UserProfile from '../models/UserProfile.js';
import { pushNotificationService } from './pushNotificationService.js';
import twilio from 'twilio';

/**
 * Call Monitoring Service
 *
 * Monitors live call data from the mobile app
 * Handles missed calls and triggers interactive voicemail callbacks
 */
export class CallMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.activeMonitors = new Map(); // userId -> monitor data
    this.missedCalls = new Map(); // userId -> array of missed calls
    this.callbackQueue = new Map(); // userId -> array of pending callbacks

    // Twilio client for making calls
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
  }

  /**
   * Start monitoring calls for a user
   */
  async startMonitoring(userId, phoneNumber) {
    try {
      console.log(`=Þ [CALL MONITOR] Starting monitoring for user ${userId}`);

      const profile = await UserProfile.findOne({ userId });

      this.activeMonitors.set(userId, {
        phoneNumber,
        startedAt: new Date(),
        profile: profile?.ariaPreferences,
        callCount: 0,
        missedCallCount: 0
      });

      this.emit('monitoring:started', { userId, phoneNumber });

      return {
        success: true,
        message: 'Call monitoring started'
      };
    } catch (error) {
      console.error('L [CALL MONITOR] Start error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop monitoring calls for a user
   */
  stopMonitoring(userId) {
    if (this.activeMonitors.has(userId)) {
      const monitor = this.activeMonitors.get(userId);
      this.activeMonitors.delete(userId);

      console.log(`=Þ [CALL MONITOR] Stopped monitoring for user ${userId}`);
      this.emit('monitoring:stopped', { userId, stats: monitor });

      return {
        success: true,
        stats: monitor
      };
    }

    return {
      success: false,
      error: 'No active monitoring for user'
    };
  }

  /**
   * Log incoming call
   */
  async logIncomingCall(userId, callData) {
    try {
      const {
        phoneNumber,
        callerName,
        timestamp,
        duration,
        answered
      } = callData;

      console.log(`=Þ [CALL MONITOR] ${answered ? 'Answered' : 'Missed'} call from ${phoneNumber} for user ${userId}`);

      // Update monitor stats
      if (this.activeMonitors.has(userId)) {
        const monitor = this.activeMonitors.get(userId);
        monitor.callCount++;
        if (!answered) {
          monitor.missedCallCount++;
        }
      }

      // Handle missed call
      if (!answered) {
        await this.handleMissedCall(userId, {
          phoneNumber,
          callerName,
          timestamp: timestamp || new Date()
        });
      }

      this.emit('call:logged', {
        userId,
        callData,
        answered
      });

      return { success: true };
    } catch (error) {
      console.error('L [CALL MONITOR] Log call error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle missed call - trigger interactive voicemail
   */
  async handleMissedCall(userId, callData) {
    try {
      const { phoneNumber, callerName, timestamp } = callData;

      // Get user profile to check preferences
      const profile = await UserProfile.findOne({ userId });
      const autoCallBack = profile?.ariaPreferences?.autoCallBack?.enabled || false;
      const interactiveVoicemail = profile?.ariaPreferences?.interactiveVoicemail?.enabled || false;

      // Store missed call
      if (!this.missedCalls.has(userId)) {
        this.missedCalls.set(userId, []);
      }
      this.missedCalls.get(userId).push({
        phoneNumber,
        callerName,
        timestamp,
        status: 'pending'
      });

      console.log(`   [MISSED CALL] ${phoneNumber} (${callerName || 'Unknown'}) for user ${userId}`);

      // Send notification to user
      await pushNotificationService.sendToUser(
        userId,
        '=Þ Missed Call',
        `Missed call from ${callerName || phoneNumber}`,
        {
          type: 'missed_call',
          phoneNumber,
          callerName,
          timestamp
        }
      );

      // Check if should auto-callback with interactive voicemail
      if (autoCallBack && interactiveVoicemail) {
        const delayMinutes = profile.ariaPreferences.autoCallBack.delayMinutes || 5;

        console.log(`= [AUTO CALLBACK] Scheduling callback to ${phoneNumber} in ${delayMinutes} minutes`);

        // Schedule callback
        setTimeout(
          () => this.initiateInteractiveVoicemail(userId, phoneNumber, callerName),
          delayMinutes * 60 * 1000
        );

        // Add to callback queue
        if (!this.callbackQueue.has(userId)) {
          this.callbackQueue.set(userId, []);
        }
        this.callbackQueue.get(userId).push({
          phoneNumber,
          callerName,
          scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000),
          status: 'scheduled'
        });
      }

      this.emit('missedCall:handled', {
        userId,
        phoneNumber,
        autoCallBack,
        interactiveVoicemail
      });

      return { success: true };
    } catch (error) {
      console.error('L [MISSED CALL] Handle error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initiate interactive voicemail call
   */
  async initiateInteractiveVoicemail(userId, toNumber, callerName) {
    try {
      if (!this.twilioClient) {
        console.error('L [VOICEMAIL] Twilio not configured');
        return {
          success: false,
          error: 'Twilio not configured'
        };
      }

      console.log(`<™  [VOICEMAIL] Initiating interactive voicemail to ${toNumber}`);

      const profile = await UserProfile.findOne({ userId });
      const greeting = profile?.ariaPreferences?.interactiveVoicemail?.greeting ||
        `Hi ${callerName || 'there'}, this is Aria, the AI assistant for ${profile?.personalInfo?.firstName || 'my user'}. They missed your call. I can take a message or answer questions. How can I help?`;

      // Create TwiML for interactive voicemail
      const twimlUrl = `${process.env.WEBHOOK_URL}/api/voicemail/interactive/${userId}`;

      // Initiate call using Twilio
      const call = await this.twilioClient.calls.create({
        to: toNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: twimlUrl,
        method: 'POST',
        statusCallback: `${process.env.WEBHOOK_URL}/api/voicemail/status/${userId}`,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      console.log(` [VOICEMAIL] Call initiated: ${call.sid}`);

      // Send notification to user
      await pushNotificationService.sendToUser(
        userId,
        '<™ Aria Calling Back',
        `Calling ${callerName || toNumber} with interactive voicemail`,
        {
          type: 'voicemail_callback',
          phoneNumber: toNumber,
          callSid: call.sid
        }
      );

      this.emit('voicemail:initiated', {
        userId,
        toNumber,
        callSid: call.sid
      });

      return {
        success: true,
        callSid: call.sid
      };
    } catch (error) {
      console.error('L [VOICEMAIL] Initiate error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get missed calls for user
   */
  getMissedCalls(userId) {
    return this.missedCalls.get(userId) || [];
  }

  /**
   * Get callback queue for user
   */
  getCallbackQueue(userId) {
    return this.callbackQueue.get(userId) || [];
  }

  /**
   * Clear missed calls for user
   */
  clearMissedCalls(userId) {
    this.missedCalls.delete(userId);
    return { success: true };
  }

  /**
   * Get monitoring stats for user
   */
  getMonitoringStats(userId) {
    const monitor = this.activeMonitors.get(userId);
    if (!monitor) {
      return {
        success: false,
        error: 'No active monitoring'
      };
    }

    return {
      success: true,
      stats: {
        ...monitor,
        missedCalls: this.getMissedCalls(userId),
        callbackQueue: this.getCallbackQueue(userId)
      }
    };
  }

  /**
   * Manual callback trigger
   */
  async triggerCallback(userId, phoneNumber, callerName) {
    return await this.initiateInteractiveVoicemail(userId, phoneNumber, callerName);
  }
}

export const callMonitoringService = new CallMonitoringService();
export default callMonitoringService;
