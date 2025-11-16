import axios from 'axios';

/**
 * Service for managing ElevenLabs agents programmatically
 * Handles basic operations while complex webhook config is done via iframe
 */
class AgentManagementService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  /**
   * Create a new agent with pre-configured webhook URLs
   */
  async createAgent(config) {
    const {
      name,
      description,
      voice_id,
      prompt,
      first_message,
      language = 'en',
      webhook_url_base
    } = config;

    const agentConfig = {
      name,
      conversation_config: {
        agent: {
          prompt: {
            prompt,
            llm: 'gemini-2.5-flash',
            temperature: 0,
            max_tokens: -1
          },
          first_message,
          language,
          dynamic_variables: {
            dynamic_variable_placeholders: {}
          }
        },
        tts: {
          model_id: 'eleven_turbo_v2',
          voice_id: voice_id || process.env.ELEVENLABS_DEFAULT_VOICE_ID,
          optimize_streaming_latency: 3,
          stability: 0.6,
          speed: 0.95,
          similarity_boost: 0.75
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs'
        }
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/convai/agents/create`,
        agentConfig,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Created agent: ${response.data.agent_id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating agent:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update agent prompt
   */
  async updatePrompt(agentId, newPrompt) {
    try {
      // Get current agent config
      const agent = await this.getAgent(agentId);

      // Update prompt
      const updatedConfig = {
        ...agent,
        conversation_config: {
          ...agent.conversation_config,
          agent: {
            ...agent.conversation_config.agent,
            prompt: {
              ...agent.conversation_config.agent.prompt,
              prompt: newPrompt
            }
          }
        }
      };

      const response = await axios.patch(
        `${this.baseUrl}/convai/agents/${agentId}`,
        updatedConfig,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Updated prompt for agent: ${agentId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating prompt:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get agent configuration
   */
  async getAgent(agentId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/agents/${agentId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error getting agent:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * List all agents
   */
  async listAgents() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/agents`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error listing agents:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/convai/agents/${agentId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      console.log(`✅ Deleted agent: ${agentId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting agent:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get webhook configuration URL for iframe
   */
  getWebhookConfigUrl(agentId) {
    return `https://elevenlabs.io/app/conversational-ai/agent/${agentId}`;
  }

  /**
   * Generate standard webhook URLs for an agent
   */
  getWebhookUrls(customerId) {
    const baseUrl = process.env.WEBHOOK_URL || process.env.API_URL;

    return {
      send_signup_link: `${baseUrl}/api/agent-webhooks/send-signup-link?customer_id=${customerId}`,
      book_appointment: `${baseUrl}/api/agent-webhooks/book-appointment?customer_id=${customerId}`,
      collect_lead_info: `${baseUrl}/api/agent-webhooks/collect-lead-info?customer_id=${customerId}`
    };
  }
}

export default AgentManagementService;
