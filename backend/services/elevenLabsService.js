import axios from 'axios';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

class ElevenLabsService {
  constructor(apiKey = process.env.ELEVENLABS_API_KEY) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: ELEVENLABS_API_URL,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async getVoices() {
    try {
      const response = await this.client.get('/voices');
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch voices from ElevenLabs');
    }
  }

  async getAgentById(agentId) {
    try {
      const response = await this.client.get(`/convai/agents/${agentId}`);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch agent from ElevenLabs');
    }
  }

  async createAgent(config) {
    try {
      const response = await this.client.post('/convai/agents/create', {
        name: config.name,
        conversation_config: {
          tts: {
            voice_id: config.voiceId,
            model_id: 'eleven_flash_v2'  // Must use turbo or flash v2 for English agents
          },
          agent: {
            prompt: {
              prompt: config.script
            },
            first_message: config.firstMessage || 'Hello, how can I help you today?',
            language: config.language || 'en'
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to create agent in ElevenLabs');
    }
  }

  async updateAgent(agentId, config) {
    try {
      const response = await this.client.patch(`/convai/agents/${agentId}`, {
        name: config.name,
        prompt: config.script,
        first_message: config.firstMessage
      });
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to update agent in ElevenLabs');
    }
  }

  async initiateCall(agentId, phoneNumber, agentPhoneNumberId, callbackUrl, dynamicVariables = {}) {
    try {
      const recipientData = {
        phone_number: phoneNumber
      };

      // Add dynamic variables for personalized conversations
      // These become available to the agent during the call
      if (Object.keys(dynamicVariables).length > 0) {
        // ElevenLabs supports these dynamic variables in the agent prompt
        Object.assign(recipientData, dynamicVariables);
      }

      const response = await this.client.post('/convai/batch-calling/submit', {
        call_name: dynamicVariables.lead_name
          ? `Call to ${dynamicVariables.lead_name}`
          : `CRM Call - ${phoneNumber} - ${Date.now()}`,
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        recipients: [recipientData]
      });
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to initiate call');
    }
  }

  async getCallDetails(callId) {
    try {
      const response = await this.client.get(`/convai/calls/${callId}`);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch call details');
    }
  }

  async getCallTranscript(callId) {
    try {
      const response = await this.client.get(`/convai/calls/${callId}/transcript`);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch call transcript');
    }
  }

  async getPhoneNumbers() {
    try {
      const response = await this.client.get('/convai/phone-numbers');
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch phone numbers');
    }
  }

  getPrebuiltAgents() {
    return {
      lead_gen: {
        name: 'Sarah - Lead Gen',
        elevenLabsAgentId: process.env.ELEVENLABS_LEAD_GEN_AGENT_ID,
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        description: 'Warm, sales-focused voice for lead qualification',
        script: `Hello! My name is Sarah and I'm calling to learn more about your interest in our services.
                 I have a few quick questions that will help us understand how we can best help you.
                 First, can you tell me what brought you to our website?`
      },
      booking: {
        name: 'Mike - Appointment Booking',
        elevenLabsAgentId: process.env.ELEVENLABS_BOOKING_AGENT_ID,
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        description: 'Friendly, helpful voice for scheduling',
        script: `Hi! I'd be happy to help you schedule an appointment.
                 Let me check our availability. What days work best for you?`
      },
      collections: {
        name: 'James - Collections',
        elevenLabsAgentId: process.env.ELEVENLABS_COLLECTIONS_AGENT_ID,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        description: 'Professional, firm voice for payment reminders',
        script: `Good day. This is James calling regarding your outstanding payment.
                 Our records show a balance due. Can we discuss payment options today?`
      },
      promo: {
        name: 'Lisa - Promotions',
        elevenLabsAgentId: process.env.ELEVENLABS_PROMO_AGENT_ID,
        voiceId: 'XrExE9yKIg1WjnnlVkGX',
        description: 'Enthusiastic, engaging voice for sales',
        script: `Hi! I'm calling with some exciting news about our latest promotion.
                 I think you'll be really interested in what we have to offer. Can I tell you more?`
      },
      support: {
        name: 'Alex - Support',
        elevenLabsAgentId: process.env.ELEVENLABS_SUPPORT_AGENT_ID,
        voiceId: 'cgSgspJ2msm6clMCkdW9',
        description: 'Patient, clear voice for customer service',
        script: `Hello! Thank you for calling support. I'm here to help.
                 Can you describe the issue you're experiencing?`
      }
    };
  }
}

export default ElevenLabsService;
