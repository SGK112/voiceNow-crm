import express from 'express';
import { protect } from '../middleware/auth.js';
import voiceMediaCopilotService from '../services/voiceMediaCopilotService.js';

const router = express.Router();

/**
 * @route   POST /api/voice-copilot/generate-image
 * @desc    Generate image from voice conversation
 * @access  Private
 * @called  By ElevenLabs agent tool/function
 */
router.post('/generate-image', protect, async (req, res) => {
  try {
    const { conversationId, prompt, model, aspectRatio, style, numOutputs } = req.body;

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and prompt are required'
      });
    }

    const result = await voiceMediaCopilotService.generateImageFromConversation(
      conversationId,
      {
        prompt,
        model: model || 'flux_schnell',
        aspectRatio: aspectRatio || '16:9',
        style: style || 'photorealistic',
        numOutputs: numOutputs || 1
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error in generate-image:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/voice-copilot/generate-video
 * @desc    Generate video from voice conversation
 * @access  Private
 * @called  By ElevenLabs agent tool/function
 */
router.post('/generate-video', protect, async (req, res) => {
  try {
    const { conversationId, prompt, model, duration } = req.body;

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and prompt are required'
      });
    }

    const result = await voiceMediaCopilotService.generateVideoFromConversation(
      conversationId,
      {
        prompt,
        model: model || 'runway_gen3',
        duration: duration || 5
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error in generate-video:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/voice-copilot/transform-image
 * @desc    Transform image from voice conversation
 * @access  Private
 * @called  By ElevenLabs agent tool/function
 */
router.post('/transform-image', protect, async (req, res) => {
  try {
    const { conversationId, imageUrl, type, ...transformOptions } = req.body;

    if (!conversationId || !imageUrl || !type) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, imageUrl, and type are required'
      });
    }

    const result = await voiceMediaCopilotService.transformImageFromConversation(
      conversationId,
      {
        imageUrl,
        type,
        ...transformOptions
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error in transform-image:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voice-copilot/credits
 * @desc    Get user's credit balance
 * @access  Private
 * @called  By ElevenLabs agent to check affordability
 */
router.get('/credits', protect, async (req, res) => {
  try {
    const credits = await voiceMediaCopilotService.getUserCredits(req.user.userId);

    res.json({
      success: true,
      credits
    });
  } catch (error) {
    console.error('Error getting credits:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voice-copilot/recent-media
 * @desc    Get recent media library items
 * @access  Private
 * @called  By ElevenLabs agent to reference past creations
 */
router.get('/recent-media', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const media = await voiceMediaCopilotService.getRecentMedia(req.user.userId, limit);

    res.json({
      success: true,
      media
    });
  } catch (error) {
    console.error('Error getting recent media:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voice-copilot/search-media
 * @desc    Search media library
 * @access  Private
 * @called  By ElevenLabs agent to find images for transformation
 */
router.get('/search-media', protect, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'query parameter is required'
      });
    }

    const media = await voiceMediaCopilotService.searchMediaLibrary(req.user.userId, query);

    res.json({
      success: true,
      media
    });
  } catch (error) {
    console.error('Error searching media:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/voice-copilot/utterance
 * @desc    Process user utterance from voice conversation
 * @access  Private
 * @called  By ElevenLabs webhook when user speaks
 */
router.post('/utterance', protect, async (req, res) => {
  try {
    const { conversationId, utterance } = req.body;

    if (!conversationId || !utterance) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and utterance are required'
      });
    }

    await voiceMediaCopilotService.processUserUtterance(conversationId, utterance);

    res.json({
      success: true,
      message: 'Utterance processed'
    });
  } catch (error) {
    console.error('Error processing utterance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/voice-copilot/agent-response
 * @desc    Process agent response
 * @access  Private
 * @called  By ElevenLabs webhook when agent speaks
 */
router.post('/agent-response', protect, async (req, res) => {
  try {
    const { conversationId, response } = req.body;

    if (!conversationId || !response) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and response are required'
      });
    }

    await voiceMediaCopilotService.processAgentResponse(conversationId, response);

    res.json({
      success: true,
      message: 'Response processed'
    });
  } catch (error) {
    console.error('Error processing agent response:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voice-copilot/context/:conversationId
 * @desc    Get conversation context
 * @access  Private
 */
router.get('/context/:conversationId', protect, async (req, res) => {
  try {
    const context = voiceMediaCopilotService.getConversationContext(req.params.conversationId);

    res.json({
      success: true,
      context
    });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
