import axios from 'axios';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

class ElevenLabsService {
  constructor(apiKey = process.env.ELEVENLABS_API_KEY) {
    this.apiKey = apiKey;

    if (!this.apiKey) {
      console.error('⚠️ ELEVENLABS_API_KEY is not set!');
    }

    this.client = axios.create({
      baseURL: ELEVENLABS_API_URL,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate current date/time context for agents
   * This ensures agents always know the current date and time
   */
  generateDateTimeContext() {
    const now = new Date();

    // Format: Friday, November 15, 2025
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);

    // Format: 3:45 PM MST
    const timeOptions = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

    // Get day of week
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Determine time of day
    const hour = now.getHours();
    let timeOfDay;
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Calculate tomorrow
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', dateOptions);

    // Calculate next week
    const nextWeekStart = new Date(now.getTime() + (8 - now.getDay()) * 86400000);
    const nextWeekFormatted = nextWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return `
**CURRENT DATE & TIME INFORMATION:**
📅 Today's Date: ${formattedDate}
🕐 Current Time: ${formattedTime}
📆 Day of Week: ${dayOfWeek}
☀️ Time of Day: ${timeOfDay}

**IMPORTANT - USE THIS INFORMATION:**
- When scheduling appointments, today is ${formattedDate}
- For "tomorrow", that means ${tomorrowFormatted}
- For "next week", that's the week starting ${nextWeekFormatted}
- When someone asks "what's today's date?", say "${formattedDate}"
- Always reference the correct day of week (${dayOfWeek})
- Adjust your greeting based on time of day (currently ${timeOfDay})

**BOOKING APPOINTMENTS:**
When scheduling, calculate dates from TODAY (${formattedDate}):
- "Tomorrow" = ${tomorrow.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
- "Next Monday" = Calculate from ${formattedDate}
- Always confirm the full date when booking

`.trim();
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

  async initiateCall(agentId, phoneNumber, agentPhoneNumberId, callbackUrl, dynamicVariables = {}, personalizedScript = null, personalizedFirstMessage = null, voiceIdOverride = null) {
    try {
      // Validate inputs
      if (!agentId || !phoneNumber || !agentPhoneNumberId) {
        throw new Error('Missing required parameters for call initiation');
      }

      // ALWAYS inject current date/time context into the script
      const dateTimeContext = this.generateDateTimeContext();

      // Only modify script if one is explicitly provided
      if (personalizedScript) {
        // Remove any old date/time context first
        const cleanedScript = personalizedScript.replace(/\*\*CURRENT DATE & TIME INFORMATION:\*\*[\s\S]*?(?=\n\n(?:\*\*[A-Z]|\w+:)|$)/, '').trim();
        personalizedScript = dateTimeContext + '\n\n' + cleanedScript;
      }
      // If no personalizedScript is provided, don't override - let agent use its default config

      // Validate script length (ElevenLabs typically has limits around 3000-5000 chars)
      const MAX_SCRIPT_LENGTH = 4000;
      if (personalizedScript && personalizedScript.length > MAX_SCRIPT_LENGTH) {
        console.warn(`⚠️ Script length (${personalizedScript.length}) exceeds recommended maximum (${MAX_SCRIPT_LENGTH}). Truncating...`);
        personalizedScript = personalizedScript.substring(0, MAX_SCRIPT_LENGTH) + '...';
      }

      // Build conversation initiation client data with dynamic variables
      const conversationInitiationClientData = {};

      if (Object.keys(dynamicVariables).length > 0) {
        conversationInitiationClientData.dynamic_variables = dynamicVariables;
      }

      const recipientData = {
        phone_number: phoneNumber
      };

      // Add conversation_initiation_client_data to recipient if we have variables
      if (Object.keys(conversationInitiationClientData).length > 0) {
        recipientData.conversation_initiation_client_data = conversationInitiationClientData;
      }

      const requestBody = {
        call_name: dynamicVariables.lead_name
          ? `Call to ${dynamicVariables.lead_name}`
          : `CRM Call - ${phoneNumber} - ${Date.now()}`,
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        recipients: [recipientData]
      };

      // Override agent prompt, first message, and voice if provided
      // This allows each call to have a customized script with lead-specific information
      if (personalizedScript || personalizedFirstMessage || voiceIdOverride) {
        requestBody.conversation_config_override = {
          agent: {}
        };

        if (personalizedScript) {
          requestBody.conversation_config_override.agent.prompt = {
            prompt: personalizedScript
          };
        }

        if (personalizedFirstMessage) {
          requestBody.conversation_config_override.agent.first_message = personalizedFirstMessage;
        }

        // Override voice if specified
        if (voiceIdOverride) {
          requestBody.conversation_config_override.tts = {
            voice_id: voiceIdOverride,
            model_id: 'eleven_flash_v2'  // Use flash v2 for best performance
          };
        }
      }

      // Add webhook callback URL if provided
      if (callbackUrl) {
        requestBody.webhook_url = callbackUrl;
      }

      console.log('📞 Initiating call with personalized content:', {
        agentId,
        phoneNumber,
        variableCount: Object.keys(dynamicVariables).length,
        webhook: callbackUrl,
        scriptLength: personalizedScript?.length || 0,
        hasPersonalizedScript: !!personalizedScript,
        hasPersonalizedFirstMessage: !!personalizedFirstMessage
      });

      // DEBUG: Log the full request body to verify what we're sending
      console.log('🔍 Full request body:');
      console.log('  - Agent ID:', requestBody.agent_id);
      console.log('  - Has override:', !!requestBody.conversation_config_override);
      if (requestBody.conversation_config_override) {
        console.log('  - Override prompt length:', requestBody.conversation_config_override.agent?.prompt?.prompt?.length || 0);
        console.log('  - Override first_message:', requestBody.conversation_config_override.agent?.first_message || 'none');
        console.log('  - Override voice_id:', requestBody.conversation_config_override.tts?.voice_id || 'none');
        console.log('  - First 200 chars of prompt:', requestBody.conversation_config_override.agent?.prompt?.prompt?.substring(0, 200));
      }

      const response = await this.client.post('/convai/batch-calling/submit', requestBody);

      if (!response.data) {
        throw new Error('Empty response from ElevenLabs API');
      }

      return response.data;
    } catch (error) {
      // Enhanced error logging
      if (error.response?.data) {
        console.error('ElevenLabs API Error Details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else {
        console.error('ElevenLabs API Error:', error.message);
      }

      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later');
      } else if (error.response?.status === 400) {
        throw new Error(`Invalid request: ${error.response.data?.detail || 'Bad request'}`);
      }

      throw new Error('Failed to initiate call with ElevenLabs');
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

  /**
   * Upload a file to ElevenLabs Knowledge Base
   * @param {string|Buffer} filePathOrBuffer - Path to file or file buffer
   * @param {string} fileName - Original filename
   * @param {string} documentName - Name for the knowledge base document
   * @returns {Promise<Object>} Response with document ID and name
   */
  async createKnowledgeBaseFromFile(filePathOrBuffer, fileName, documentName = null) {
    try {
      const FormData = (await import('form-data')).default;
      const fs = (await import('fs')).default;

      const formData = new FormData();

      // If it's a file path, read the file
      if (typeof filePathOrBuffer === 'string') {
        formData.append('file', fs.createReadStream(filePathOrBuffer), {
          filename: fileName,
          contentType: this.getContentType(fileName)
        });
      } else {
        // It's a buffer
        formData.append('file', filePathOrBuffer, {
          filename: fileName,
          contentType: this.getContentType(fileName)
        });
      }

      // Add optional name parameter
      if (documentName) {
        formData.append('name', documentName);
      }

      const response = await axios.post(
        `${ELEVENLABS_API_URL}/convai/knowledge-base/file`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            ...formData.getHeaders()
          }
        }
      );

      console.log('✅ Knowledge base document created:', response.data);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs Knowledge Base Upload Error:', error.response?.data || error.message);
      throw new Error(`Failed to upload to ElevenLabs Knowledge Base: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get content type based on file extension
   */
  getContentType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const contentTypes = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'csv': 'text/csv',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return contentTypes[ext] || 'application/octet-stream';
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
