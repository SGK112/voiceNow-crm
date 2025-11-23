import api from '../utils/api';
import { Lead, AppSettings, User } from '../types';
import { storage } from '../utils/storage';

class CRMService {
  // Authentication
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user, token } = response.data;

      // Save token and user
      await storage.setItem('token', token);
      await storage.setItem('user', user);

      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post('/api/auth/register', { email, password, name });
      const { user, token } = response.data;

      // Save token and user
      await storage.setItem('token', token);
      await storage.setItem('user', user);

      return { user, token };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await storage.clear();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/api/auth/me');
      return response.data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Leads
  async getLeads(limit: number = 50): Promise<Lead[]> {
    try {
      const response = await api.get(`/api/leads?limit=${limit}`);
      return response.data.leads || [];
    } catch (error) {
      console.error('Get leads error:', error);
      return [];
    }
  }

  async createLead(lead: Partial<Lead>): Promise<Lead | null> {
    try {
      const response = await api.post('/api/leads', lead);
      return response.data.lead;
    } catch (error) {
      console.error('Create lead error:', error);
      return null;
    }
  }

  async updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead | null> {
    try {
      const response = await api.put(`/api/leads/${leadId}`, updates);
      return response.data.lead;
    } catch (error) {
      console.error('Update lead error:', error);
      return null;
    }
  }

  async getLead(leadId: string): Promise<Lead | null> {
    try {
      const response = await api.get(`/api/leads/${leadId}`);
      return response.data.lead;
    } catch (error) {
      console.error('Get lead error:', error);
      return null;
    }
  }

  // Settings
  async getSettings(): Promise<AppSettings | null> {
    try {
      const response = await api.get('/api/mobile/settings');
      return response.data.settings;
    } catch (error) {
      console.error('Get settings error:', error);
      return null;
    }
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings | null> {
    try {
      const response = await api.put('/api/mobile/settings', settings);
      return response.data.settings;
    } catch (error) {
      console.error('Update settings error:', error);
      return null;
    }
  }

  // Analytics
  async getStats(): Promise<any> {
    try {
      const response = await api.get('/api/mobile/stats');
      return response.data.stats || {};
    } catch (error) {
      console.error('Get stats error:', error);
      return {};
    }
  }
}

export default new CRMService();
