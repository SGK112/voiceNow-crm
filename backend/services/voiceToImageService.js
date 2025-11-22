import replicateMediaService from './replicateMediaService.js';
import { WebSocket, WebSocketServer } from 'ws';

/**
 * Voice-to-Image Service
 * Enables ElevenLabs voice agents to generate images in real-time during conversations
 *
 * Flow:
 * 1. User talks to ElevenLabs agent
 * 2. Agent's conversation config includes image generation tools
 * 3. When agent says "let me show you...", it triggers image generation
 * 4. Image appears in real-time on user's screen via WebSocket
 */
class VoiceToImageService {
  constructor() {
    this.activeSessions = new Map(); // conversationId -> { ws, userId, images }
  }

  /**
   * Register WebSocket connection for a conversation
   */
  registerSession(conversationId, ws, userId) {
    this.activeSessions.set(conversationId, {
      ws,
      userId,
      images: [],
      startedAt: new Date()
    });

    console.log(`📞🖼️  Voice-to-Image session started: ${conversationId}`);
  }

  /**
   * Handle image generation request from ElevenLabs agent
   * This is called from the agent's tool/function calling
   */
  async generateImageDuringCall(conversationId, imageRequest) {
    const session = this.activeSessions.get(conversationId);

    if (!session) {
      console.error(`No active session for conversation: ${conversationId}`);
      return null;
    }

    const { prompt, style, aspectRatio } = imageRequest;

    try {
      // Send "generating" status to frontend
      this.sendToClient(conversationId, {
        type: 'image_generating',
        prompt,
        timestamp: new Date()
      });

      console.log(`🎨 Generating image for call ${conversationId}:`, prompt);

      // Generate image with Replicate
      const result = await replicateMediaService.generateImage(session.userId, {
        prompt,
        model: 'flux_schnell', // Fast model for real-time
        aspectRatio: aspectRatio || '16:9',
        numOutputs: 1,
        style: style || 'photorealistic'
      });

      // Store image in session
      const imageData = {
        url: result.images[0],
        prompt,
        generatedAt: new Date(),
        creditsUsed: result.creditsUsed
      };

      session.images.push(imageData);

      // Send image to frontend immediately
      this.sendToClient(conversationId, {
        type: 'image_generated',
        image: imageData,
        timestamp: new Date()
      });

      console.log(`✅ Image generated and sent to client for conversation ${conversationId}`);

      return imageData;

    } catch (error) {
      console.error(`❌ Error generating image for call:`, error);

      // Send error to frontend
      this.sendToClient(conversationId, {
        type: 'image_error',
        error: error.message,
        timestamp: new Date()
      });

      return null;
    }
  }

  /**
   * Send data to WebSocket client
   */
  sendToClient(conversationId, data) {
    const session = this.activeSessions.get(conversationId);

    if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Process ElevenLabs conversation event
   * Detects when agent wants to generate an image
   */
  async processConversationEvent(event) {
    const { conversationId, message, role, toolCalls } = event;

    // Check if agent is calling the image generation tool
    if (toolCalls && toolCalls.length > 0) {
      for (const tool of toolCalls) {
        if (tool.name === 'generate_image' || tool.name === 'show_image') {
          const imageRequest = JSON.parse(tool.arguments);
          await this.generateImageDuringCall(conversationId, imageRequest);
        }
      }
    }

    // Or detect trigger phrases in agent's response
    if (role === 'assistant' && message) {
      const triggerPhrases = [
        'let me show you',
        'here\'s what that looks like',
        'I\'ll generate an image',
        'visualizing that for you'
      ];

      const shouldGenerate = triggerPhrases.some(phrase =>
        message.toLowerCase().includes(phrase)
      );

      if (shouldGenerate) {
        // Extract image description from message
        const prompt = this.extractImagePromptFromMessage(message);

        if (prompt) {
          await this.generateImageDuringCall(conversationId, {
            prompt,
            style: 'photorealistic',
            aspectRatio: '16:9'
          });
        }
      }
    }
  }

  /**
   * Extract image prompt from agent's message
   */
  extractImagePromptFromMessage(message) {
    // Simple extraction - you can make this more sophisticated with NLP
    const patterns = [
      /let me show you (.*?)[.!]/i,
      /here's what (.*?) looks like/i,
      /generating an image of (.*?)[.!]/i,
      /visualizing (.*?) for you/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use entire message as prompt
    return message.substring(0, 200);
  }

  /**
   * Get all images generated during a conversation
   */
  getSessionImages(conversationId) {
    const session = this.activeSessions.get(conversationId);
    return session ? session.images : [];
  }

  /**
   * End session and cleanup
   */
  endSession(conversationId) {
    const session = this.activeSessions.get(conversationId);

    if (session) {
      // Close WebSocket if still open
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }

      this.activeSessions.delete(conversationId);
      console.log(`🔚 Voice-to-Image session ended: ${conversationId}`);

      return session.images;
    }

    return [];
  }

  /**
   * Create ElevenLabs agent configuration with image generation tools
   */
  createImageEnabledAgentConfig(baseConfig) {
    return {
      ...baseConfig,
      conversational_config: {
        ...baseConfig.conversational_config,
        agent: {
          ...baseConfig.conversational_config?.agent,
          tools: [
            ...(baseConfig.conversational_config?.agent?.tools || []),
            {
              name: 'generate_image',
              description: 'Generate an AI image based on a text description and show it to the user in real-time',
              parameters: {
                type: 'object',
                properties: {
                  prompt: {
                    type: 'string',
                    description: 'Detailed description of the image to generate'
                  },
                  style: {
                    type: 'string',
                    enum: ['photorealistic', 'artistic', 'sketch', 'modern'],
                    description: 'Visual style of the image'
                  },
                  aspectRatio: {
                    type: 'string',
                    enum: ['1:1', '16:9', '9:16', '4:3'],
                    description: 'Aspect ratio of the image'
                  }
                },
                required: ['prompt']
              }
            }
          ]
        },
        prompt: {
          ...baseConfig.conversational_config?.prompt,
          prompt: `${baseConfig.conversational_config?.prompt?.prompt || ''}

You have the ability to generate images in real-time during the conversation.
When the user asks to see something, visualize a product, or needs a visual reference, use the generate_image tool.

Examples:
- User: "What would a modern kitchen with granite countertops look like?"
  You: "Let me show you! *calls generate_image* I'm generating a visualization of a modern kitchen with beautiful granite countertops."

- User: "Show me what black galaxy granite looks like"
  You: "Great choice! *calls generate_image* Here's what black galaxy granite looks like on countertops."

Important: Always tell the user you're generating an image before calling the tool.`
        }
      }
    };
  }
}

export default new VoiceToImageService();
