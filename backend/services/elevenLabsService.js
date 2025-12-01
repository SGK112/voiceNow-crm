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
      const agentConfig = {
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
      };

      // Configure client tools webhook (for SMS, email, etc.) if tools are provided
      if (config.tools && config.tools.length > 0) {
        const webhookUrl = process.env.WEBHOOK_URL || 'https://voiceflow-crm-1.onrender.com';
        agentConfig.conversation_config.agent.client_tools = config.tools;
        agentConfig.conversation_config.agent.client_tools_webhook_url = `${webhookUrl}/api/elevenlabs-webhook/tool-invocation`;
        console.log('🔗 Tool webhook configured:', agentConfig.conversation_config.agent.client_tools_webhook_url);
      }

      const response = await this.client.post('/convai/agents/create', agentConfig);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to create agent in ElevenLabs');
    }
  }

  async updateAgent(agentId, config) {
    try {
      // Get webhook URLs with authentication token
      const webhookToken = process.env.WEBHOOK_SECRET_TOKEN;
      const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://voiceflow-crm-1.onrender.com';

      const updateConfig = {
        name: config.name,
        prompt: config.script,
        first_message: config.firstMessage
      };

      // Update voice if provided
      if (config.voiceId) {
        console.log(`🎙️ Updating agent voice to: ${config.voiceId}`);
        updateConfig.tts = {
          voice_id: config.voiceId,
          model_id: 'eleven_flash_v2'
        };
      }

      // Re-apply secure webhooks during update (ElevenLabs may clear them)
      if (webhookToken) {
        console.log('🔐 Re-applying secure webhooks during agent update...');

        updateConfig.webhook = {
          url: `${baseUrl}/api/elevenlabs-webhook/post-call`,
          headers: {
            Authorization: `Bearer ${webhookToken}`
          }
        };

        // Re-apply client tools webhook if agent has tools
        if (config.tools && config.tools.length > 0) {
          updateConfig.client_tools_webhook_url = `${baseUrl}/api/elevenlabs-webhook/tool-invocation`;
          updateConfig.client_tools_webhook_headers = {
            Authorization: `Bearer ${webhookToken}`
          };
        }

        console.log('✅ Secure webhooks re-applied during update');
      }

      const response = await this.client.patch(`/convai/agents/${agentId}`, updateConfig);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to update agent in ElevenLabs');
    }
  }

  async initiateCall(options) {
    try {
      // Support both object and positional parameters for backwards compatibility
      let agentId, phoneNumber, agentPhoneNumberId, callbackUrl, dynamicVariables, personalizedScript, personalizedFirstMessage, voiceIdOverride;

      if (typeof options === 'object' && options !== null && !Array.isArray(options) && 'phoneNumber' in options) {
        // Object-style call (new format from ariaCapabilities)
        agentId = options.agentId;
        phoneNumber = options.phoneNumber;
        agentPhoneNumberId = options.agentPhoneNumberId;
        callbackUrl = options.callbackUrl;
        dynamicVariables = options.dynamicVariables || {};
        personalizedScript = options.personalizedScript || null;
        personalizedFirstMessage = options.personalizedFirstMessage || null;
        voiceIdOverride = options.voiceIdOverride || null;
      } else {
        // Legacy positional parameters
        agentId = options;
        phoneNumber = arguments[1];
        agentPhoneNumberId = arguments[2];
        callbackUrl = arguments[3];
        dynamicVariables = arguments[4] || {};
        personalizedScript = arguments[5] || null;
        personalizedFirstMessage = arguments[6] || null;
        voiceIdOverride = arguments[7] || null;
      }

      // Validate inputs
      if (!agentId || !phoneNumber || !agentPhoneNumberId) {
        console.error('❌ Missing required parameters:', { agentId: !!agentId, phoneNumber: !!phoneNumber, agentPhoneNumberId: !!agentPhoneNumberId });
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

      // Use the Twilio outbound-call endpoint (works without batch calling agreement)
      // This is the direct single-call endpoint vs batch-calling/submit which requires TOS
      const outboundRequestBody = {
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        to_number: phoneNumber
      };

      // Add conversation config overrides if provided
      if (personalizedScript || personalizedFirstMessage || voiceIdOverride) {
        outboundRequestBody.conversation_config_override = {
          agent: {}
        };

        if (personalizedScript) {
          outboundRequestBody.conversation_config_override.agent.prompt = {
            prompt: personalizedScript
          };
        }

        if (personalizedFirstMessage) {
          outboundRequestBody.conversation_config_override.agent.first_message = personalizedFirstMessage;
        }

        if (voiceIdOverride) {
          outboundRequestBody.conversation_config_override.tts = {
            voice_id: voiceIdOverride,
            model_id: 'eleven_flash_v2'
          };
        }
      }

      // Add dynamic variables if provided
      if (Object.keys(dynamicVariables).length > 0) {
        outboundRequestBody.conversation_initiation_client_data = {
          dynamic_variables: dynamicVariables
        };
      }

      console.log('🔍 Using /convai/twilio/outbound-call endpoint');
      console.log('  - Agent ID:', outboundRequestBody.agent_id);
      console.log('  - Phone Number ID:', outboundRequestBody.agent_phone_number_id);
      console.log('  - To:', outboundRequestBody.to_number);

      const response = await this.client.post('/convai/twilio/outbound-call', outboundRequestBody);

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

  /**
   * Get all conversations from ElevenLabs
   * @param {Object} options - Query options
   * @param {string} options.agentId - Filter by agent ID (optional)
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Results per page (default: 100)
   * @returns {Promise<Object>} Conversations list
   */
  async getConversations(options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.agentId) params.append('agent_id', options.agentId);
      if (options.page) params.append('page', options.page);
      if (options.pageSize) params.append('page_size', options.pageSize);

      const response = await this.client.get(`/convai/conversations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch conversations from ElevenLabs');
    }
  }

  /**
   * Get a specific conversation by ID
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object>} Conversation details
   */
  async getConversationById(conversationId) {
    try {
      const response = await this.client.get(`/convai/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch conversation details');
    }
  }

  /**
   * Get conversation audio recording URL
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<string>} Audio URL
   */
  async getConversationAudio(conversationId) {
    try {
      const response = await this.client.get(`/convai/conversations/${conversationId}/audio`);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch conversation audio');
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
   * Assign a phone number to an agent with webhook URL
   * CRITICAL: This must be called after ANY agent update since ElevenLabs clears the assignment
   * @param {string} phoneNumberId - The ElevenLabs phone number ID (e.g., phnum_xxx)
   * @param {string} agentId - The ElevenLabs agent ID to assign
   * @param {string} webhookUrl - Webhook URL for call completion events
   */
  /**
   * Configure post-call webhook for an agent
   * This is called after agent creation to set up automated post-call processing
   * @param {string} agentId - The ElevenLabs agent ID
   * @param {string} webhookUrl - Webhook URL for post-call events (optional, uses WEBHOOK_URL env if not provided)
   */
  async configurePostCallWebhook(agentId, webhookUrl = null) {
    try {
      const url = webhookUrl || process.env.WEBHOOK_URL || 'https://voiceflow-crm-1.onrender.com';
      const postCallWebhookUrl = `${url}/api/elevenlabs-webhook/post-call`;

      console.log(`🔗 Configuring post-call webhook for agent ${agentId}:`, postCallWebhookUrl);

      const response = await this.client.patch(`/convai/agents/${agentId}`, {
        platform_settings: {
          workspace_overrides: {
            webhooks: {
              url: postCallWebhookUrl,
              events: ["transcript"],
              send_audio: false
            }
          }
        }
      });

      console.log(`✅ Post-call webhook configured successfully for agent ${agentId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to configure post-call webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  async assignPhoneToAgent(phoneNumberId, agentId, webhookUrl) {
    try {
      const response = await this.client.patch(`/convai/phone-numbers/${phoneNumberId}`, {
        agent_id: agentId,
        webhook_url: webhookUrl
      });
      return response.data;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to assign phone number to agent');
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
