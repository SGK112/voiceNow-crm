import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Request permissions
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  // Send local notification
  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Notify about missed call
  async notifyMissedCall(phoneNumber: string, contactName?: string): Promise<void> {
    const name = contactName || phoneNumber;
    await this.sendLocalNotification(
      'AI Calling Back',
      `Your AI assistant is calling back ${name}`,
      { type: 'missed_call', phone: phoneNumber }
    );
  }

  // Notify about new SMS
  async notifyNewSMS(phoneNumber: string, message: string, contactName?: string): Promise<void> {
    const name = contactName || phoneNumber;
    await this.sendLocalNotification(
      `New message from ${name}`,
      message,
      { type: 'sms', phone: phoneNumber }
    );
  }

  // Notify about new lead
  async notifyNewLead(leadName: string, source: string): Promise<void> {
    await this.sendLocalNotification(
      'New Lead Created',
      `${leadName} from ${source}`,
      { type: 'lead' }
    );
  }

  // Notify about AI conversation completed
  async notifyConversationComplete(phoneNumber: string, summary: string, contactName?: string): Promise<void> {
    const name = contactName || phoneNumber;
    await this.sendLocalNotification(
      `Call with ${name} Complete`,
      summary,
      { type: 'call_complete', phone: phoneNumber }
    );
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Add notification listener
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new NotificationService();
