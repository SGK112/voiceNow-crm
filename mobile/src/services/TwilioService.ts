import { Platform } from 'react-native';
import { API_BASE_URL } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const TWILIO_TOKEN_KEY = 'twilio_access_token';
const TWILIO_TOKEN_EXPIRY_KEY = 'twilio_token_expiry';
const USER_IDENTITY_KEY = 'twilio_user_identity';

export interface CallState {
  status: 'idle' | 'connecting' | 'ringing' | 'connected' | 'disconnected';
  callSid?: string;
  from?: string;
  to?: string;
  direction?: 'incoming' | 'outgoing';
  duration?: number;
  startTime?: Date;
}

export interface SMSMessage {
  _id: string;
  from: string;
  to: string;
  body: string;
  direction: 'incoming' | 'outgoing';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
  timestamp: string;
  contactId?: string;
  contactName?: string;
}

export interface SMSThread {
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

class TwilioService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private identity: string | null = null;
  private callState: CallState = { status: 'idle' };
  private callListeners: ((state: CallState) => void)[] = [];
  private smsListeners: ((message: SMSMessage) => void)[] = [];

  // Initialize the service
  async initialize(userId: string): Promise<boolean> {
    try {
      this.identity = `user_${userId}`;
      await AsyncStorage.setItem(USER_IDENTITY_KEY, this.identity);

      // Get or refresh token
      await this.getAccessToken();

      console.log('TwilioService initialized for:', this.identity);
      return true;
    } catch (error) {
      console.error('Failed to initialize TwilioService:', error);
      return false;
    }
  }

  // Get access token (fetches new one if expired)
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    // Try to get from storage
    const storedToken = await AsyncStorage.getItem(TWILIO_TOKEN_KEY);
    const storedExpiry = await AsyncStorage.getItem(TWILIO_TOKEN_EXPIRY_KEY);

    if (storedToken && storedExpiry && parseInt(storedExpiry, 10) > Date.now()) {
      this.accessToken = storedToken;
      this.tokenExpiry = parseInt(storedExpiry, 10);
      return this.accessToken;
    }

    // Fetch new token from backend
    return await this.refreshAccessToken();
  }

  // Refresh the access token
  async refreshAccessToken(): Promise<string> {
    try {
      if (!this.identity) {
        const storedIdentity = await AsyncStorage.getItem(USER_IDENTITY_KEY);
        if (!storedIdentity) {
          throw new Error('No user identity set');
        }
        this.identity = storedIdentity;
      }

      const response = await fetch(`${API_BASE_URL}/api/twilio/voice/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: this.identity,
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();

      this.accessToken = data.token;
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((data.expiresIn - 300) * 1000);

      // Store in AsyncStorage
      await AsyncStorage.setItem(TWILIO_TOKEN_KEY, this.accessToken);
      await AsyncStorage.setItem(TWILIO_TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());

      console.log('Twilio access token refreshed');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  // Make an outgoing call
  async makeCall(
    toNumber: string,
    contactId?: string,
    contactName?: string
  ): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      // Update call state
      this.updateCallState({
        status: 'connecting',
        to: toNumber,
        direction: 'outgoing',
      });

      const response = await fetch(`${API_BASE_URL}/api/twilio/voice/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toNumber,
          identity: this.identity,
          contactId,
          contactName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.updateCallState({ status: 'disconnected' });
        return { success: false, error: data.error || 'Call failed' };
      }

      this.updateCallState({
        status: 'ringing',
        callSid: data.callSid,
        to: toNumber,
        direction: 'outgoing',
        startTime: new Date(),
      });

      return { success: true, callSid: data.callSid };
    } catch (error: any) {
      console.error('Make call error:', error);
      this.updateCallState({ status: 'disconnected' });
      return { success: false, error: error.message };
    }
  }

  // End current call
  async endCall(callSid?: string): Promise<boolean> {
    try {
      const sid = callSid || this.callState.callSid;
      if (!sid) {
        this.updateCallState({ status: 'idle' });
        return true;
      }

      const response = await fetch(`${API_BASE_URL}/api/twilio/voice/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callSid: sid }),
      });

      this.updateCallState({
        status: 'disconnected',
        duration: this.callState.startTime
          ? Math.floor((Date.now() - this.callState.startTime.getTime()) / 1000)
          : 0,
      });

      // Reset to idle after a short delay
      setTimeout(() => {
        this.updateCallState({ status: 'idle' });
      }, 2000);

      return response.ok;
    } catch (error) {
      console.error('End call error:', error);
      this.updateCallState({ status: 'idle' });
      return false;
    }
  }

  // Send SMS
  async sendSMS(
    to: string,
    body: string,
    contactId?: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          body,
          contactId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send SMS' };
      }

      return { success: true, messageSid: data.messageSid };
    } catch (error: any) {
      console.error('Send SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get SMS conversation with a contact
  async getConversation(contactId: string): Promise<SMSMessage[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/twilio/sms/conversation/${contactId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Get conversation error:', error);
      return [];
    }
  }

  // Get all SMS threads
  async getSMSThreads(): Promise<SMSThread[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio/sms/threads`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SMS threads');
      }

      const data = await response.json();
      return data.threads || [];
    } catch (error) {
      console.error('Get SMS threads error:', error);
      return [];
    }
  }

  // Get call history
  async getCallHistory(limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/twilio/calls/history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch call history');
      }

      const data = await response.json();
      return data.calls || [];
    } catch (error) {
      console.error('Get call history error:', error);
      return [];
    }
  }

  // Update call state and notify listeners
  private updateCallState(newState: Partial<CallState>): void {
    this.callState = { ...this.callState, ...newState };
    this.callListeners.forEach(listener => listener(this.callState));
  }

  // Subscribe to call state changes
  addCallStateListener(listener: (state: CallState) => void): () => void {
    this.callListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.callListeners = this.callListeners.filter(l => l !== listener);
    };
  }

  // Subscribe to incoming SMS
  addSMSListener(listener: (message: SMSMessage) => void): () => void {
    this.smsListeners.push(listener);
    return () => {
      this.smsListeners = this.smsListeners.filter(l => l !== listener);
    };
  }

  // Handle incoming call (called from push notification)
  handleIncomingCall(callSid: string, from: string, callerName?: string): void {
    this.updateCallState({
      status: 'ringing',
      callSid,
      from,
      direction: 'incoming',
    });
  }

  // Answer incoming call
  async answerCall(callSid: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio/voice/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callSid }),
      });

      if (response.ok) {
        this.updateCallState({
          status: 'connected',
          startTime: new Date(),
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Answer call error:', error);
      return false;
    }
  }

  // Reject/decline incoming call
  async rejectCall(callSid: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio/voice/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callSid }),
      });

      this.updateCallState({ status: 'idle' });
      return response.ok;
    } catch (error) {
      console.error('Reject call error:', error);
      this.updateCallState({ status: 'idle' });
      return false;
    }
  }

  // Handle incoming SMS notification
  handleIncomingSMS(message: SMSMessage): void {
    this.smsListeners.forEach(listener => listener(message));
  }

  // Get current call state
  getCallState(): CallState {
    return this.callState;
  }

  // Check if Twilio is configured
  async isConfigured(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio/status`, {
        method: 'GET',
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.configured === true;
    } catch {
      return false;
    }
  }

  // Format phone number for display
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }

  // Format call duration for display
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }

  // Clear stored tokens (for logout)
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.identity = null;
    await AsyncStorage.multiRemove([
      TWILIO_TOKEN_KEY,
      TWILIO_TOKEN_EXPIRY_KEY,
      USER_IDENTITY_KEY,
    ]);
  }
}

export const twilioService = new TwilioService();
export default twilioService;
