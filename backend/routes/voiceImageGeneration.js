import express from 'express';
import voiceToImageService from '../services/voiceToImageService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/voice-images/webhook/:conversationId
 * @desc    Webhook endpoint for ElevenLabs conversation events
 * @access  Public (but verified with signature)
 */
router.post('/webhook/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const event = req.body;

    console.log(`📞 Received ElevenLabs event for conversation ${conversationId}:`, event.type);

    // Process the event (check for image generation triggers)
    await voiceToImageService.processConversationEvent({
      conversationId,
      ...event
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing voice-image webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/voice-images/generate
 * @desc    Manually trigger image generation during a call
 * @access  Private
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const { conversationId, prompt, style, aspectRatio } = req.body;

    if (!conversationId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and prompt are required'
      });
    }

    const image = await voiceToImageService.generateImageDuringCall(conversationId, {
      prompt,
      style: style || 'photorealistic',
      aspectRatio: aspectRatio || '16:9'
    });

    res.json({
      success: true,
      image
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voice-images/session/:conversationId
 * @desc    Get all images from a conversation session
 * @access  Private
 */
router.get('/session/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const images = voiceToImageService.getSessionImages(conversationId);

    res.json({
      success: true,
      conversationId,
      images,
      count: images.length
    });
  } catch (error) {
    console.error('Error getting session images:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/voice-images/config
 * @desc    Generate ElevenLabs agent config with image generation enabled
 * @access  Private
 */
router.post('/config', protect, async (req, res) => {
  try {
    const { baseConfig } = req.body;

    const imageEnabledConfig = voiceToImageService.createImageEnabledAgentConfig(
      baseConfig || {}
    );

    res.json({
      success: true,
      config: imageEnabledConfig
    });
  } catch (error) {
    console.error('Error creating image-enabled config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
