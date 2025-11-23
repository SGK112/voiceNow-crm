import * as SMS from 'expo-sms';
import api from '../utils/api';
import { Message, MessageThread } from '../types';

class SMSService {
  // Check if SMS is available on device
  async isAvailable(): Promise<boolean> {
    return await SMS.isAvailableAsync();
  }

  // Process incoming SMS
  async processIncomingSMS(phoneNumber: string, message: string): Promise<string> {
    try {
      // Send to backend for AI processing
      const response = await api.post('/api/mobile/sms-received', {
        phone: phoneNumber,
        message,
        timestamp: new Date().toISOString(),
      });

      return response.data.aiReply || '';
    } catch (error) {
      console.error('Error processing incoming SMS:', error);
      throw error;
    }
  }

  // Send SMS reply
  async sendSMSReply(phoneNumber: string, message: string, aiGenerated: boolean = false): Promise<void> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('SMS not available on this device');
      }

      // Send via device SMS
      await SMS.sendSMSAsync([phoneNumber], message);

      // Log to backend
      await api.post('/api/mobile/sms-reply', {
        phone: phoneNumber,
        message,
        aiGenerated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  // Get SMS threads
  async getSMSThreads(): Promise<MessageThread[]> {
    try {
      const response = await api.get('/api/mobile/sms-threads');
      return response.data.threads || [];
    } catch (error) {
      console.error('Error getting SMS threads:', error);
      return [];
    }
  }

  // Get messages for a thread
  async getThreadMessages(phoneNumber: string): Promise<Message[]> {
    try {
      const response = await api.get(`/api/mobile/sms-thread/${encodeURIComponent(phoneNumber)}`);
      return response.data.messages || [];
    } catch (error) {
      console.error('Error getting thread messages:', error);
      return [];
    }
  }

  // Generate AI reply suggestion
  async generateAIReply(phoneNumber: string, messageHistory: Message[]): Promise<string> {
    try {
      const response = await api.post('/api/mobile/generate-sms-reply', {
        phone: phoneNumber,
        messageHistory,
      });

      return response.data.reply || '';
    } catch (error) {
      console.error('Error generating AI reply:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markAsRead(phoneNumber: string): Promise<void> {
    try {
      await api.post('/api/mobile/sms-mark-read', {
        phone: phoneNumber,
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }
}

export default new SMSService();
