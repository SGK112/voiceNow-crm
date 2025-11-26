import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Notification types for routing
export type NotificationType = 'incoming_call' | 'incoming_sms' | 'missed_call' | 'voicemail' | 'general';

export interface NotificationData {
  type: NotificationType;
  callSid?: string;
  from?: string;
  callerName?: string;
  contactId?: string;
  messageSid?: string;
  messageBody?: string;
  [key: string]: any;
}

// Listener types
type IncomingCallListener = (data: { callSid: string; from: string; callerName?: string }) => void;
type IncomingSMSListener = (data: { from: string; body: string; contactId?: string }) => void;

class NotificationService {
  private expoPushToken: string | null = null;
  private incomingCallListeners: IncomingCallListener[] = [];
  private incomingSMSListeners: IncomingSMSListener[] = [];

  async initialize() {
    // Configure notification handler with call-specific handling
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as NotificationData;

        // For incoming calls, always show full-screen alert
        if (data?.type === 'incoming_call') {
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            priority: Notifications.AndroidNotificationPriority.MAX,
          };
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    if (Device.isDevice) {
      const token = await this.registerForPushNotificationsAsync();
      this.expoPushToken = token;

      if (token) {
        await this.registerTokenWithBackend(token);
      }
    } else {
      console.log('Push notifications only work on physical devices');
    }
  }

  private async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      // Create multiple notification channels for different types
      await Promise.all([
        // Channel for incoming calls - highest priority
        Notifications.setNotificationChannelAsync('incoming_calls', {
          name: 'Incoming Calls',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
          lightColor: '#10B981',
          sound: 'ringtone', // Use system ringtone
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        }),
        // Channel for SMS messages
        Notifications.setNotificationChannelAsync('sms_messages', {
          name: 'Text Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 100, 250],
          lightColor: '#8B5CF6',
          sound: 'default',
        }),
        // Channel for missed calls
        Notifications.setNotificationChannelAsync('missed_calls', {
          name: 'Missed Calls',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250],
          lightColor: '#EF4444',
        }),
        // Channel for voicemail
        Notifications.setNotificationChannelAsync('voicemail', {
          name: 'Voicemail',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: '#F59E0B',
        }),
        // Default channel
        Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        }),
      ]);
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }

    return token;
  }

  private async registerTokenWithBackend(token: string) {
    try {
      await api.post('/api/notifications/register', {
        pushToken: token,
        userId: 'default',
        platform: Platform.OS,
        capabilities: {
          voip: true,
          sms: true,
        },
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
    }
  }

  // Subscribe to notification received events
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as NotificationData;

      // Route to specific listeners based on type
      if (data?.type === 'incoming_call') {
        this.incomingCallListeners.forEach(listener => {
          listener({
            callSid: data.callSid || '',
            from: data.from || '',
            callerName: data.callerName,
          });
        });
      } else if (data?.type === 'incoming_sms') {
        this.incomingSMSListeners.forEach(listener => {
          listener({
            from: data.from || '',
            body: data.messageBody || '',
            contactId: data.contactId,
          });
        });
      }

      callback(notification);
    });
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Specific listeners for call/SMS
  addIncomingCallListener(listener: IncomingCallListener): () => void {
    this.incomingCallListeners.push(listener);
    return () => {
      this.incomingCallListeners = this.incomingCallListeners.filter(l => l !== listener);
    };
  }

  addIncomingSMSListener(listener: IncomingSMSListener): () => void {
    this.incomingSMSListeners.push(listener);
    return () => {
      this.incomingSMSListeners = this.incomingSMSListeners.filter(l => l !== listener);
    };
  }

  getExpoPushToken() {
    return this.expoPushToken;
  }

  // Generic local notification
  async sendLocalNotification(title: string, body: string, data?: NotificationData) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null,
    });
  }

  // Incoming call notification
  async notifyIncomingCall(from: string, callerName?: string, callSid?: string) {
    const displayName = callerName || this.formatPhoneNumber(from);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Incoming Call',
        body: displayName,
        data: {
          type: 'incoming_call',
          from,
          callerName,
          callSid,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'incoming_call',
      },
      trigger: null,
    });
  }

  // Incoming SMS notification
  async notifyIncomingSMS(from: string, body: string, contactName?: string, contactId?: string) {
    const displayName = contactName || this.formatPhoneNumber(from);
    const preview = body.length > 100 ? body.substring(0, 100) + '...' : body;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: displayName,
        body: preview,
        data: {
          type: 'incoming_sms',
          from,
          messageBody: body,
          contactId,
        },
        sound: true,
      },
      trigger: null,
    });
  }

  // Missed call notification
  async notifyMissedCall(from: string, callerName?: string) {
    const displayName = callerName || this.formatPhoneNumber(from);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Missed Call',
        body: displayName,
        data: {
          type: 'missed_call',
          from,
          callerName,
        },
      },
      trigger: null,
    });
  }

  // Voicemail notification
  async notifyVoicemail(from: string, duration?: number, callerName?: string) {
    const displayName = callerName || this.formatPhoneNumber(from);
    const durationText = duration ? ` (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})` : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Voicemail',
        body: `${displayName}${durationText}`,
        data: {
          type: 'voicemail',
          from,
          callerName,
          duration,
        },
      },
      trigger: null,
    });
  }

  // Cancel all notifications (e.g., when call is answered)
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Cancel specific notification
  async cancelNotification(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  // Format phone number for display
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export default new NotificationService();
