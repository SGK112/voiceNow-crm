import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Contact Types
export interface Contact {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  avatar?: string;
  lastInteraction?: string;
  lastInteractionType?: string;
  totalCalls?: number;
  totalSMS?: number;
  totalEmails?: number;
  tags?: string[];
  conversationHistory?: ConversationEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationEntry {
  _id?: string;
  type: 'call' | 'sms' | 'email' | 'note';
  direction: 'incoming' | 'outgoing';
  content: string;
  timestamp: string;
  metadata?: {
    duration?: number;
    aiGenerated?: boolean;
    callId?: string;
    [key: string]: any;
  };
}

export interface ContactCreateInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface ContactsResponse {
  success: boolean;
  contacts: Contact[];
  count: number;
}

export interface ContactResponse {
  success: boolean;
  contact: Contact;
  message?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: { contact: string; error: string }[];
  message: string;
}

// Cache keys
const CONTACTS_CACHE_KEY = 'contacts';
const CONTACTS_CACHE_TIMESTAMP_KEY = 'contacts_cache_timestamp';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

class ContactService {
  // Get all contacts with caching
  async getContacts(forceRefresh = false): Promise<{ data: Contact[] | null; error: string | null; }> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedContacts = await this.getCachedContacts();
        if (cachedContacts) {
          // Fetch fresh data in background
          this.fetchAndCacheContacts().catch(console.error);
          return { data: cachedContacts, error: null };
        }
      }

      const contacts = await this.fetchAndCacheContacts();
      return { data: contacts, error: null };
    } catch (error: any) {
      console.warn('Error getting contacts:', error?.message || error);
      // Return cached data as fallback
      const cached = await this.getCachedContacts();
      return { data: cached, error: error?.message || 'Failed to fetch contacts' };
    }
  }

  // Fetch contacts from API and cache
  private async fetchAndCacheContacts(): Promise<Contact[]> {
    const response = await api.get<ContactsResponse>('/api/mobile/contacts');

    if (response.data.success) {
      await this.cacheContacts(response.data.contacts);
      return response.data.contacts;
    }

    throw new Error('Failed to fetch contacts');
  }

  // Get cached contacts if valid
  private async getCachedContacts(): Promise<Contact[] | null> {
    try {
      const [cachedData, timestamp] = await Promise.all([
        AsyncStorage.getItem(CONTACTS_CACHE_KEY),
        AsyncStorage.getItem(CONTACTS_CACHE_TIMESTAMP_KEY),
      ]);

      if (!cachedData || !timestamp) return null;

      const cacheAge = Date.now() - parseInt(timestamp, 10);
      if (cacheAge > CACHE_EXPIRY_MS) return null;

      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Error reading contacts cache:', error);
      return null;
    }
  }

  // Cache contacts
  private async cacheContacts(contacts: Contact[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(contacts)),
        AsyncStorage.setItem(CONTACTS_CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (error) {
      console.error('Error caching contacts:', error);
    }
  }

  // Clear cache
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CONTACTS_CACHE_KEY),
        AsyncStorage.removeItem(CONTACTS_CACHE_TIMESTAMP_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing contacts cache:', error);
    }
  }

  // Get single contact by ID
  async getContact(id: string): Promise<Contact | null> {
    try {
      const response = await api.get<ContactResponse>(`/api/mobile/contacts/${id}`);
      return response.data.success ? response.data.contact : null;
    } catch (error) {
      console.error('Error getting contact:', error);
      return null;
    }
  }

  // Create new contact
  async createContact(data: ContactCreateInput): Promise<Contact | null> {
    try {
      const response = await api.post<ContactResponse>('/api/mobile/contacts', data);

      if (response.data.success) {
        await this.clearCache(); // Invalidate cache
        return response.data.contact;
      }

      throw new Error(response.data.message || 'Failed to create contact');
    } catch (error: any) {
      console.error('Error creating contact:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create contact');
    }
  }

  // Update contact
  async updateContact(id: string, data: ContactCreateInput): Promise<Contact | null> {
    try {
      const response = await api.put<ContactResponse>(`/api/mobile/contacts/${id}`, data);

      if (response.data.success) {
        await this.clearCache(); // Invalidate cache
        return response.data.contact;
      }

      throw new Error(response.data.message || 'Failed to update contact');
    } catch (error: any) {
      console.error('Error updating contact:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update contact');
    }
  }

  // Delete contact
  async deleteContact(id: string): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean; message: string }>(
        `/api/mobile/contacts/${id}`
      );

      if (response.data.success) {
        await this.clearCache(); // Invalidate cache
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  // Search contacts
  async searchContacts(query: string): Promise<{ data: Contact[] | null; error: string | null; }> {
    try {
      const response = await api.get<ContactsResponse>(
        `/api/mobile/contacts/search/${encodeURIComponent(query)}`
      );
      if (response.data.success) {
        return { data: response.data.contacts, error: null };
      }
      return { data: [], error: null };
    } catch (error: any) {
      console.error('Error searching contacts:', error);
      return { data: [], error: error.message || 'Failed to search contacts' };
    }
  }

  // Import contacts
  async importContacts(contacts: ContactCreateInput[]): Promise<ImportResult> {
    try {
      const response = await api.post<ImportResult>('/api/mobile/contacts/import', {
        contacts,
      });

      if (response.data.success) {
        await this.clearCache(); // Invalidate cache
      }

      return response.data;
    } catch (error: any) {
      console.error('Error importing contacts:', error);
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [{ contact: 'bulk', error: error.message }],
        message: 'Failed to import contacts',
      };
    }
  }

  // Add conversation to contact
  async addConversation(
    contactId: string,
    type: 'call' | 'sms' | 'email' | 'note',
    direction: 'incoming' | 'outgoing',
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await api.post<ContactResponse>(
        `/api/mobile/contacts/${contactId}/conversation`,
        { type, direction, content, metadata }
      );

      if (response.data.success) {
        await this.clearCache(); // Invalidate cache
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error adding conversation:', error);
      return false;
    }
  }

  // Find contact by phone number
  async findByPhone(phone: string): Promise<Contact | null> {
    try {
      // Normalize phone number for search
      const normalizedPhone = phone.replace(/\D/g, '');
      const contacts = await this.getContacts();

      return contacts.find(c =>
        c.phone.replace(/\D/g, '') === normalizedPhone
      ) || null;
    } catch (error) {
      console.error('Error finding contact by phone:', error);
      return null;
    }
  }

  // Get contacts for Aria (simplified data)
  async getContactsForAria(): Promise<Array<{ name: string; phone: string; company?: string }>> {
    try {
      const contacts = await this.getContacts();
      return contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        company: c.company,
      }));
    } catch (error) {
      console.error('Error getting contacts for Aria:', error);
      return [];
    }
  }
}

// Export singleton instance
export const contactService = new ContactService();
export default contactService;
