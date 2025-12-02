import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Types
export interface Thread {
  contactName?: string;
  phone: string;
  lastMessageTime: string;
  lastMessage: string;
  unreadCount: number;
  [key: string]: any;
}

export interface MessageThreadsResponse {
  data: Thread[] | null;
  error: string | null;
}

// Cache keys
const MESSAGE_THREADS_CACHE_KEY = 'message_threads';
const MESSAGE_THREADS_CACHE_TIMESTAMP_KEY = 'message_threads_cache_timestamp';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

class MessageService {
  // Get message threads with caching
  async getMessageThreads(forceRefresh = false): Promise<MessageThreadsResponse> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedThreads = await this.getCachedMessageThreads();
        if (cachedThreads) {
          // Fetch fresh data in background
          this.fetchAndCacheMessageThreads().catch(console.error);
          return { data: cachedThreads, error: null };
        }
      }

      const threads = await this.fetchAndCacheMessageThreads();
      return { data: threads, error: null };
    } catch (error: any) {
      console.warn('Error getting message threads:', error?.message || error);
      // Return cached data as fallback
      const cached = await this.getCachedMessageThreads();
      return { data: cached || [], error: error?.message || 'Failed to fetch message threads' };
    }
  }

  // Fetch message threads from API and cache
  private async fetchAndCacheMessageThreads(): Promise<Thread[]> {
    const response = await api.get('/api/mobile/sms-threads');

    if (response.data.success) {
      await this.cacheMessageThreads(response.data.threads);
      return response.data.threads;
    }

    throw new Error('Failed to fetch message threads');
  }

  // Get cached message threads if valid
  private async getCachedMessageThreads(): Promise<Thread[] | null> {
    try {
      const [cachedData, timestamp] = await Promise.all([
        AsyncStorage.getItem(MESSAGE_THREADS_CACHE_KEY),
        AsyncStorage.getItem(MESSAGE_THREADS_CACHE_TIMESTAMP_KEY),
      ]);

      if (!cachedData || !timestamp) return null;

      const cacheAge = Date.now() - parseInt(timestamp, 10);
      if (cacheAge > CACHE_EXPIRY_MS) return null;

      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Error reading message threads cache:', error);
      return null;
    }
  }

  // Cache message threads
  private async cacheMessageThreads(threads: Thread[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(MESSAGE_THREADS_CACHE_KEY, JSON.stringify(threads)),
        AsyncStorage.setItem(MESSAGE_THREADS_CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (error) {
      console.error('Error caching message threads:', error);
    }
  }

  // Clear cache
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(MESSAGE_THREADS_CACHE_KEY),
        AsyncStorage.removeItem(MESSAGE_THREADS_CACHE_TIMESTAMP_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing message threads cache:', error);
    }
  }
}

export const messageService = new MessageService();
export default messageService;
