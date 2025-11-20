import ElevenLabsService from '../services/elevenLabsService.js';
import VoiceAgent from '../models/VoiceAgent.js';

/**
 * ElevenLabs Agent Management Controller
 *
 * This controller provides complete management of ElevenLabs Conversational AI agents
 * including creation, updates, voice changes, and voice library browsing.
 */

// Initialize ElevenLabs service
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

/**
 * Get all available voices from ElevenLabs
 * GET /api/elevenlabs/voices
 */
export const getVoices = async (req, res) => {
  try {
    console.log('📚 Fetching ElevenLabs voice library...');

    const voices = await elevenLabsService.getVoices();

    console.log(`✅ Retrieved ${voices.length} voices from ElevenLabs`);

    res.json({
      success: true,
      voices: voices,
      count: voices.length
    });
  } catch (error) {
    console.error('❌ Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voices',
      message: error.message
    });
  }
};

/**
 * Create a new ElevenLabs agent with specified voice
 * POST /api/elevenlabs/agents/create
 */
export const createAgent = async (req, res) => {
  try {
    const {
      name,
      voiceId,
      prompt,
      firstMessage,
      language = 'en',
      temperature = 0.7,
      maxTokens = 500
    } = req.body;

    // Validate required fields
    if (!name || !voiceId || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, voiceId, and prompt are required'
      });
    }

    console.log(`🎙️ Creating new ElevenLabs agent: ${name}`);
    console.log(`   Voice ID: ${voiceId}`);
    console.log(`   Language: ${language}`);

    // Build agent configuration for ElevenLabs API
    const agentConfig = {
      conversation_config: {
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_flash_v2_5', // Latest model for best performance
          agent_output_audio_format: 'pcm_16000',
          optimize_streaming_latency: '3'
        },
        agent: {
          prompt: {
            prompt: prompt,
            llm: 'gpt-4o-mini', // Fast, cost-effective
            temperature: temperature,
            max_tokens: maxTokens
          },
          first_message: firstMessage || 'Hello! How can I help you today?',
          language: language
        },
        // Enable multi-language support with automatic language detection
        language: {
          mode: 'auto-detect', // Automatically detect caller's language
          default_language: language, // Fallback language
          // Enable all 29 supported languages
          languages: [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'zh', 'ko',
            'nl', 'tr', 'sv', 'id', 'fil', 'uk', 'el', 'cs', 'ro', 'da', 'bg',
            'ms', 'sk', 'ar', 'ta', 'fi', 'ru', 'no'
          ]
        }
      },
      name: name,
      tags: ['voiceflow-crm', 'managed']
    };

    // Create agent in ElevenLabs
    const elevenLabsAgent = await elevenLabsService.createAgent(agentConfig);

    console.log(`✅ ElevenLabs agent created: ${elevenLabsAgent.agent_id}`);

    // Save agent reference in our database
    const voiceAgent = await VoiceAgent.create({
      userId: req.user._id,
      name: name,
      elevenLabsAgentId: elevenLabsAgent.agent_id,
      voiceId: voiceId,
      script: prompt,
      firstMessage: firstMessage || 'Hello! How can I help you today?',
      language: language,
      enabled: true,
      metadata: {
        temperature: temperature,
        maxTokens: maxTokens,
        createdVia: 'agent-management-ui'
      }
    });

    console.log(`✅ Agent saved to database: ${voiceAgent._id}`);

    res.json({
      success: true,
      agent: {
        id: voiceAgent._id,
        elevenLabsAgentId: elevenLabsAgent.agent_id,
        name: name,
        voiceId: voiceId,
        enabled: true
      },
      message: 'Agent created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
      message: error.message
    });
  }
};

/**
 * Update an existing ElevenLabs agent (including voice change)
 * PATCH /api/elevenlabs/agents/:agentId/update
 */
export const updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      name,
      voiceId,
      prompt,
      firstMessage,
      language,
      temperature,
      maxTokens
    } = req.body;

    console.log(`🔄 Updating ElevenLabs agent: ${agentId}`);

    // Find agent in database
    const voiceAgent = await VoiceAgent.findById(agentId);

    if (!voiceAgent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Check ownership
    if (voiceAgent.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Build update configuration
    const updateConfig = {
      conversation_config: {}
    };

    // Update voice if provided
    if (voiceId && voiceId !== voiceAgent.voiceId) {
      console.log(`   🎙️ Changing voice from ${voiceAgent.voiceId} to ${voiceId}`);
      updateConfig.conversation_config.tts = {
        voice_id: voiceId,
        model_id: 'eleven_flash_v2_5',
        agent_output_audio_format: 'pcm_16000',
        optimize_streaming_latency: '3'
      };
      voiceAgent.voiceId = voiceId;
    }

    // Update agent configuration
    if (prompt || firstMessage || temperature !== undefined || maxTokens !== undefined) {
      updateConfig.conversation_config.agent = {};

      if (prompt || temperature !== undefined || maxTokens !== undefined) {
        updateConfig.conversation_config.agent.prompt = {
          prompt: prompt || voiceAgent.script,
          llm: 'gpt-4o-mini',
          temperature: temperature !== undefined ? temperature : (voiceAgent.metadata?.temperature || 0.7),
          max_tokens: maxTokens !== undefined ? maxTokens : (voiceAgent.metadata?.maxTokens || 500)
        };
      }

      if (firstMessage) {
        updateConfig.conversation_config.agent.first_message = firstMessage;
      }

      if (language) {
        updateConfig.conversation_config.agent.language = language;
      }
    }

    // Always enable multi-language support with automatic language detection
    updateConfig.conversation_config.language = {
      mode: 'auto-detect', // Automatically detect caller's language
      default_language: language || voiceAgent.language || 'en', // Fallback language
      // Enable all 29 supported languages
      languages: [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ja', 'zh', 'ko',
        'nl', 'tr', 'sv', 'id', 'fil', 'uk', 'el', 'cs', 'ro', 'da', 'bg',
        'ms', 'sk', 'ar', 'ta', 'fi', 'ru', 'no'
      ]
    };

    // Update name if provided
    if (name) {
      updateConfig.name = name;
      voiceAgent.name = name;
    }

    // Update in ElevenLabs
    await elevenLabsService.updateAgentDirect(voiceAgent.elevenLabsAgentId, updateConfig);

    console.log(`✅ ElevenLabs agent updated: ${voiceAgent.elevenLabsAgentId}`);

    // Update in database
    if (prompt) voiceAgent.script = prompt;
    if (firstMessage) voiceAgent.firstMessage = firstMessage;
    if (language) voiceAgent.language = language;
    if (temperature !== undefined || maxTokens !== undefined) {
      voiceAgent.metadata = {
        ...voiceAgent.metadata,
        temperature: temperature !== undefined ? temperature : voiceAgent.metadata?.temperature,
        maxTokens: maxTokens !== undefined ? maxTokens : voiceAgent.metadata?.maxTokens
      };
    }

    await voiceAgent.save();

    console.log(`✅ Agent database record updated`);

    res.json({
      success: true,
      agent: {
        id: voiceAgent._id,
        elevenLabsAgentId: voiceAgent.elevenLabsAgentId,
        name: voiceAgent.name,
        voiceId: voiceAgent.voiceId,
        enabled: voiceAgent.enabled
      },
      message: 'Agent updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent',
      message: error.message
    });
  }
};

/**
 * Get agent details
 * GET /api/elevenlabs/agents/:agentId
 */
export const getAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const voiceAgent = await VoiceAgent.findById(agentId);

    if (!voiceAgent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Check ownership
    if (voiceAgent.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      agent: voiceAgent
    });

  } catch (error) {
    console.error('❌ Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent',
      message: error.message
    });
  }
};

/**
 * List all agents for current user
 * GET /api/elevenlabs/agents
 */
export const listAgents = async (req, res) => {
  try {
    const agents = await VoiceAgent.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      agents: agents,
      count: agents.length
    });

  } catch (error) {
    console.error('❌ Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list agents',
      message: error.message
    });
  }
};

/**
 * Delete an agent
 * DELETE /api/elevenlabs/agents/:agentId
 */
export const deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const voiceAgent = await VoiceAgent.findById(agentId);

    if (!voiceAgent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Check ownership
    if (voiceAgent.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    console.log(`🗑️ Deleting agent: ${voiceAgent.name} (${voiceAgent.elevenLabsAgentId})`);

    // Note: We don't delete from ElevenLabs, just disable in our system
    // This preserves call history and allows re-enabling
    voiceAgent.enabled = false;
    await voiceAgent.save();

    res.json({
      success: true,
      message: 'Agent disabled successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent',
      message: error.message
    });
  }
};

export default {
  getVoices,
  createAgent,
  updateAgent,
  getAgent,
  listAgents,
  deleteAgent
};
