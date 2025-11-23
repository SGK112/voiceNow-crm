import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import replicateMediaService from './replicateMediaService.js';
import imageManipulationService from './imageManipulationService.js';
import User from '../models/User.js';
import MediaAsset from '../models/MediaAsset.js';

/**
 * Voice Media Copilot Service
 * Handles conversational AI copilot for building image/video prompts via voice
 * Users speak to ElevenLabs agent, which helps build the perfect prompt
 */
class VoiceMediaCopilotService {
  constructor() {
    this.activeSessions = new Map();
    this.conversationHistory = new Map();
  }

  /**
   * Register new copilot session
   */
  registerSession(conversationId, ws, userId) {
    this.activeSessions.set(conversationId, {
      ws,
      userId,
      startedAt: new Date(),
      currentPrompt: '',
      mediaType: null, // 'image' | 'video' | 'transform'
      options: {},
      conversationStage: 'greeting' // greeting | gathering | confirming | generating
    });

    this.conversationHistory.set(conversationId, []);

    console.log(`📞 Voice copilot session started: ${conversationId}`);

    // Send welcome message
    this.sendToClient(conversationId, {
      type: 'copilot_ready',
      message: 'AI Copilot is ready. Start speaking to create amazing visuals!'
    });
  }

  /**
   * Unregister session
   */
  unregisterSession(conversationId) {
    this.activeSessions.delete(conversationId);
    this.conversationHistory.delete(conversationId);
    console.log(`📞 Voice copilot session ended: ${conversationId}`);
  }

  /**
   * Send message to client via WebSocket
   */
  sendToClient(conversationId, data) {
    const session = this.activeSessions.get(conversationId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Process user utterance from voice conversation
   * Called when ElevenLabs agent detects user speech
   */
  async processUserUtterance(conversationId, utterance) {
    const session = this.activeSessions.get(conversationId);
    if (!session) return;

    // Add to conversation history
    const history = this.conversationHistory.get(conversationId);
    history.push({
      role: 'user',
      content: utterance,
      timestamp: new Date()
    });

    // Send to client for display
    this.sendToClient(conversationId, {
      type: 'user_spoke',
      text: utterance
    });
  }

  /**
   * Process agent response
   * Called when ElevenLabs agent speaks
   */
  async processAgentResponse(conversationId, response) {
    const session = this.activeSessions.get(conversationId);
    if (!session) return;

    // Add to conversation history
    const history = this.conversationHistory.get(conversationId);
    history.push({
      role: 'agent',
      content: response,
      timestamp: new Date()
    });

    // Send to client for display
    this.sendToClient(conversationId, {
      type: 'agent_spoke',
      text: response
    });
  }

  /**
   * Generate image based on conversation
   * Called by ElevenLabs agent's tool/function
   */
  async generateImageFromConversation(conversationId, promptDetails) {
    const session = this.activeSessions.get(conversationId);
    if (!session) {
      throw new Error('No active session');
    }

    try {
      // Update session
      session.conversationStage = 'generating';
      session.mediaType = 'image';

      // Send generating status
      this.sendToClient(conversationId, {
        type: 'media_generating',
        mediaType: 'image',
        prompt: promptDetails.prompt,
        model: promptDetails.model || 'flux_schnell'
      });

      // Generate image
      const result = await replicateMediaService.generateImage(session.userId, {
        prompt: promptDetails.prompt,
        model: promptDetails.model || 'flux_schnell',
        aspectRatio: promptDetails.aspectRatio || '16:9',
        style: promptDetails.style || 'photorealistic',
        numOutputs: promptDetails.numOutputs || 1
      });

      if (result.success) {
        // Send generated image to client
        this.sendToClient(conversationId, {
          type: 'media_generated',
          mediaType: 'image',
          images: result.images,
          assets: result.assets,
          creditsUsed: result.creditsUsed,
          prompt: promptDetails.prompt
        });

        // Update session
        session.conversationStage = 'completed';

        return {
          success: true,
          message: `Created ${result.images.length} image(s) successfully! You can see them on your screen.`,
          images: result.images,
          creditsUsed: result.creditsUsed
        };
      }
    } catch (error) {
      console.error('Error generating image:', error);

      this.sendToClient(conversationId, {
        type: 'generation_error',
        error: error.message
      });

      return {
        success: false,
        message: `I couldn't generate the image: ${error.message}`
      };
    }
  }

  /**
   * Generate video based on conversation
   * Called by ElevenLabs agent's tool/function
   */
  async generateVideoFromConversation(conversationId, promptDetails) {
    const session = this.activeSessions.get(conversationId);
    if (!session) {
      throw new Error('No active session');
    }

    try {
      // Update session
      session.conversationStage = 'generating';
      session.mediaType = 'video';

      // Send generating status
      this.sendToClient(conversationId, {
        type: 'media_generating',
        mediaType: 'video',
        prompt: promptDetails.prompt,
        model: promptDetails.model || 'runway_gen3'
      });

      // Generate video
      const result = await replicateMediaService.generateVideo(session.userId, {
        prompt: promptDetails.prompt,
        model: promptDetails.model || 'runway_gen3',
        duration: promptDetails.duration || 5
      });

      if (result.success) {
        // Send generated video to client
        this.sendToClient(conversationId, {
          type: 'media_generated',
          mediaType: 'video',
          video: result.video,
          asset: result.asset,
          creditsUsed: result.creditsUsed,
          prompt: promptDetails.prompt
        });

        // Update session
        session.conversationStage = 'completed';

        return {
          success: true,
          message: `Created your video successfully! You can see it on your screen.`,
          video: result.video,
          creditsUsed: result.creditsUsed
        };
      }
    } catch (error) {
      console.error('Error generating video:', error);

      this.sendToClient(conversationId, {
        type: 'generation_error',
        error: error.message
      });

      return {
        success: false,
        message: `I couldn't generate the video: ${error.message}`
      };
    }
  }

  /**
   * Transform image based on conversation
   * Called by ElevenLabs agent's tool/function
   */
  async transformImageFromConversation(conversationId, transformDetails) {
    const session = this.activeSessions.get(conversationId);
    if (!session) {
      throw new Error('No active session');
    }

    try {
      // Update session
      session.conversationStage = 'generating';
      session.mediaType = 'transform';

      // Send transforming status
      this.sendToClient(conversationId, {
        type: 'image_transforming',
        transformType: transformDetails.type,
        imageUrl: transformDetails.imageUrl
      });

      // Map transformation type to service method
      let result;
      switch (transformDetails.type) {
        case 'material_swap':
          result = await imageManipulationService.swapMaterial(session.userId, {
            imageUrl: transformDetails.imageUrl,
            materialType: transformDetails.materialType,
            newMaterial: transformDetails.newMaterial,
            strength: transformDetails.strength || 0.8
          });
          break;

        case 'color_change':
          result = await imageManipulationService.changeColor(session.userId, {
            imageUrl: transformDetails.imageUrl,
            target: transformDetails.target,
            color: transformDetails.color
          });
          break;

        case 'interior':
          result = await imageManipulationService.transformInterior(session.userId, {
            imageUrl: transformDetails.imageUrl,
            prompt: transformDetails.prompt,
            style: transformDetails.style,
            strength: transformDetails.strength || 0.7
          });
          break;

        case 'exterior':
          result = await imageManipulationService.transformExterior(session.userId, {
            imageUrl: transformDetails.imageUrl,
            transformation: transformDetails.transformation,
            details: transformDetails.details
          });
          break;

        default:
          throw new Error(`Unknown transformation type: ${transformDetails.type}`);
      }

      if (result.success) {
        // Send transformed image to client
        this.sendToClient(conversationId, {
          type: 'image_transformed',
          transformType: transformDetails.type,
          original: result.original,
          transformed: result.transformed,
          creditsUsed: result.creditsUsed
        });

        // Update session
        session.conversationStage = 'completed';

        return {
          success: true,
          message: `Transformed your image successfully! Check out the before and after on your screen.`,
          transformed: result.transformed,
          creditsUsed: result.creditsUsed
        };
      }
    } catch (error) {
      console.error('Error transforming image:', error);

      this.sendToClient(conversationId, {
        type: 'transformation_error',
        error: error.message
      });

      return {
        success: false,
        message: `I couldn't transform the image: ${error.message}`
      };
    }
  }

  /**
   * Get user's credit balance
   * Called by ElevenLabs agent to check if user can afford generation
   */
  async getUserCredits(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { balance: 0, used: 0 };
      }

      return {
        balance: user.mediaCredits?.balance || 0,
        used: user.mediaCredits?.used || 0,
        purchased: user.mediaCredits?.purchased || 0
      };
    } catch (error) {
      console.error('Error getting user credits:', error);
      return { balance: 0, used: 0 };
    }
  }

  /**
   * Get recent media library items
   * Called by ElevenLabs agent to reference past creations
   */
  async getRecentMedia(userId, limit = 5) {
    try {
      const media = await MediaAsset.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('type url prompt name createdAt');

      return media.map(item => ({
        id: item._id,
        type: item.type,
        prompt: item.prompt,
        name: item.name,
        url: item.url,
        createdAt: item.createdAt
      }));
    } catch (error) {
      console.error('Error getting recent media:', error);
      return [];
    }
  }

  /**
   * Search media library
   * Called by ElevenLabs agent to find specific images for transformation
   */
  async searchMediaLibrary(userId, query) {
    try {
      const media = await MediaAsset.find({
        userId,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { prompt: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('type url prompt name createdAt');

      return media.map(item => ({
        id: item._id,
        type: item.type,
        prompt: item.prompt,
        name: item.name,
        url: item.url,
        createdAt: item.createdAt
      }));
    } catch (error) {
      console.error('Error searching media library:', error);
      return [];
    }
  }

  /**
   * Get conversation context for agent
   * Provides agent with full conversation history
   */
  getConversationContext(conversationId) {
    const history = this.conversationHistory.get(conversationId) || [];
    const session = this.activeSessions.get(conversationId);

    return {
      history: history.slice(-10), // Last 10 messages
      currentStage: session?.conversationStage,
      currentPrompt: session?.currentPrompt,
      mediaType: session?.mediaType,
      options: session?.options
    };
  }
}

export default new VoiceMediaCopilotService();
