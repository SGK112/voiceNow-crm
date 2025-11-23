import * as Contacts from 'expo-contacts';
import api from '../utils/api';
import { Call } from '../types';

class CallService {
  private missedCallCheckInterval: NodeJS.Timeout | null = null;
  private lastCheckedCallLog: string | null = null;

  // Start monitoring for missed calls
  async startMonitoring(onMissedCall: (phoneNumber: string, contactName?: string) => void) {
    console.log('Starting call monitoring...');

    // Request permissions
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Contacts permission not granted');
    }

    // Check for missed calls every 30 seconds
    this.missedCallCheckInterval = setInterval(async () => {
      await this.checkForMissedCalls(onMissedCall);
    }, 30000);

    // Initial check
    await this.checkForMissedCalls(onMissedCall);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.missedCallCheckInterval) {
      clearInterval(this.missedCallCheckInterval);
      this.missedCallCheckInterval = null;
    }
  }

  // Check for new missed calls
  private async checkForMissedCalls(callback: (phoneNumber: string, contactName?: string) => void) {
    try {
      // Note: React Native doesn't have direct access to call logs
      // This is a simplified implementation
      // In production, you'd use native modules or backend polling

      // For now, we'll rely on backend reporting missed calls
      const response = await api.get('/api/mobile/recent-missed-calls');
      const missedCalls = response.data.calls || [];

      for (const call of missedCalls) {
        if (call._id !== this.lastCheckedCallLog) {
          const contactName = await this.getContactName(call.phone);
          callback(call.phone, contactName);
          this.lastCheckedCallLog = call._id;
        }
      }
    } catch (error) {
      console.error('Error checking missed calls:', error);
    }
  }

  // Get contact name from phone number
  async getContactName(phoneNumber: string): Promise<string | undefined> {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const contact = data.find((c) =>
        c.phoneNumbers?.some((p) => p.number?.replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''))
      );

      return contact?.name;
    } catch (error) {
      console.error('Error getting contact name:', error);
      return undefined;
    }
  }

  // Report missed call to backend
  async reportMissedCall(phoneNumber: string, contactName?: string): Promise<Call> {
    try {
      const response = await api.post('/api/mobile/call-missed', {
        phone: phoneNumber,
        contactName,
        timestamp: new Date().toISOString(),
      });
      return response.data.call;
    } catch (error) {
      console.error('Error reporting missed call:', error);
      throw error;
    }
  }

  // Initiate AI callback
  async initiateAICallback(phoneNumber: string, contactName?: string): Promise<void> {
    try {
      await api.post('/api/mobile/start-ai-call', {
        phone: phoneNumber,
        contactName,
      });
    } catch (error) {
      console.error('Error initiating AI callback:', error);
      throw error;
    }
  }

  // Get call history
  async getCallHistory(limit: number = 50): Promise<Call[]> {
    try {
      const response = await api.get(`/api/mobile/call-history?limit=${limit}`);
      return response.data.calls || [];
    } catch (error) {
      console.error('Error getting call history:', error);
      return [];
    }
  }

  // Get call details
  async getCallDetails(callId: string): Promise<Call | null> {
    try {
      const response = await api.get(`/api/mobile/call/${callId}`);
      return response.data.call;
    } catch (error) {
      console.error('Error getting call details:', error);
      return null;
    }
  }
}

export default new CallService();
