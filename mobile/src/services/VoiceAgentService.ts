import api from './api';

export interface VoiceAgent {
  id: string;
  name: string;
  type: string;
  voiceId: string;
  voiceName: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
  firstMessage: string;
  isGlobal: boolean;
  priority: number;
}

class VoiceAgentService {
  private cachedAgents: VoiceAgent[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getVoiceAgents(forceRefresh = false): Promise<VoiceAgent[]> {
    const now = Date.now();

    // Return cached if valid
    if (!forceRefresh && this.cachedAgents.length > 0 && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedAgents;
    }

    try {
      const response = await api.get('/api/voice/agents');
      if (response.data.success && response.data.agents) {
        this.cachedAgents = response.data.agents;
        this.cacheTimestamp = now;
        return this.cachedAgents;
      }
      return [];
    } catch (error) {
      console.error('Error fetching voice agents:', error);
      // Return cached agents if API fails
      return this.cachedAgents;
    }
  }

  async getAgentById(id: string): Promise<VoiceAgent | null> {
    try {
      const response = await api.get(`/api/voice/agents/${id}`);
      if (response.data.success && response.data.agent) {
        return response.data.agent;
      }
      return null;
    } catch (error) {
      console.error('Error fetching voice agent:', error);
      return null;
    }
  }

  getDefaultAgent(): VoiceAgent {
    // Return ARIA as default
    return {
      id: 'aria',
      name: 'ARIA',
      type: 'AI Assistant',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Aria',
      gender: 'female',
      description: 'Warm, friendly AI assistant',
      firstMessage: "Hey there! It's ARIA. What can I help you with?",
      isGlobal: true,
      priority: 100
    };
  }

  clearCache() {
    this.cachedAgents = [];
    this.cacheTimestamp = 0;
  }
}

export const voiceAgentService = new VoiceAgentService();
export default voiceAgentService;
