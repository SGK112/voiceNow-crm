import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Types
export interface Call {
  _id: string;
  contactName?: string;
  phone: string;
  type: 'missed' | 'answered' | 'outgoing';
  timestamp: string;
  transcript?: string;
  aiConfidence?: number;
  [key: string]: any;
}

export interface CallHistoryResponse {
  data: Call[] | null;
  error: string | null;
}

// Cache keys
const CALL_HISTORY_CACHE_KEY = 'call_history';
const CALL_HISTORY_CACHE_TIMESTAMP_KEY = 'call_history_cache_timestamp';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

class CallHistoryService {
  // Get call history with caching
  async getCallHistory(forceRefresh = false): Promise<CallHistoryResponse> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedCalls = await this.getCachedCallHistory();
        if (cachedCalls) {
          // Fetch fresh data in background
          this.fetchAndCacheCallHistory().catch(console.error);
          return { data: cachedCalls, error: null };
        }
      }

      const calls = await this.fetchAndCacheCallHistory();
      return { data: calls, error: null };
    } catch (error: any) {
      console.warn('Error getting call history:', error?.message || error);
      // Return cached data as fallback
      const cached = await this.getCachedCallHistory();
      return { data: cached || [], error: error?.message || 'Failed to fetch call history' };
    }
  }

  // Fetch call history from API and cache
  private async fetchAndCacheCallHistory(): Promise<Call[]> {
    const response = await api.get('/api/mobile/call-history');

    if (response.data.success) {
      await this.cacheCallHistory(response.data.calls);
      return response.data.calls;
    }

    throw new Error('Failed to fetch call history');
  }

  // Get cached call history if valid
  private async getCachedCallHistory(): Promise<Call[] | null> {
    try {
      const [cachedData, timestamp] = await Promise.all([
        AsyncStorage.getItem(CALL_HISTORY_CACHE_KEY),
        AsyncStorage.getItem(CALL_HISTORY_CACHE_TIMESTAMP_KEY),
      ]);

      if (!cachedData || !timestamp) return null;

      const cacheAge = Date.now() - parseInt(timestamp, 10);
      if (cacheAge > CACHE_EXPIRY_MS) return null;

      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Error reading call history cache:', error);
      return null;
    }
  }

  // Cache call history
  private async cacheCallHistory(calls: Call[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CALL_HISTORY_CACHE_KEY, JSON.stringify(calls)),
        AsyncStorage.setItem(CALL_HISTORY_CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (error) {
      console.error('Error caching call history:', error);
    }
  }

  // Clear cache
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CALL_HISTORY_CACHE_KEY),
        AsyncStorage.removeItem(CALL_HISTORY_CACHE_TIMESTAMP_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing call history cache:', error);
    }
  }
}

export const callHistoryService = new CallHistoryService();
export default callHistoryService;
