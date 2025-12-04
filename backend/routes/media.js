import express from 'express';
import { protect } from '../middleware/auth.js';
import replicateMediaService from '../services/replicateMediaService.js';

const router = express.Router();

/**
 * @route   POST /api/media/generate/image
 * @desc    Generate AI image from text prompt
 * @access  Private
 */
router.post('/generate/image', protect, async (req, res) => {
  try {
    const { prompt, model, aspectRatio, numOutputs, style } = req.body;
    const userId = req.user._id || req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const result = await replicateMediaService.generateImage(userId, {
      prompt,
      model: model || 'flux_schnell',
      aspectRatio: aspectRatio || '1:1',
      numOutputs: numOutputs || 1,
      style: style || 'photorealistic'
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media/generate/video
 * @desc    Generate AI video from text prompt
 * @access  Private
 */
router.post('/generate/video', protect, async (req, res) => {
  try {
    const { prompt, model, duration, aspectRatio } = req.body;
    const userId = req.user._id || req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const result = await replicateMediaService.generateVideo(userId, {
      prompt,
      model: model || 'runway_gen3',
      duration: duration || 5,
      aspectRatio: aspectRatio || '16:9'
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media/upscale
 * @desc    Upscale image with AI
 * @access  Private
 */
router.post('/upscale', protect, async (req, res) => {
  try {
    const { imageUrl, scale } = req.body;
    const userId = req.user._id || req.user.id;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const result = await replicateMediaService.upscaleImage(
      userId,
      imageUrl,
      scale || 4
    );

    res.json(result);
  } catch (error) {
    console.error('Error upscaling image:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media/remove-background
 * @desc    Remove background from image
 * @access  Private
 */
router.post('/remove-background', protect, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const userId = req.user._id || req.user.id;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const result = await replicateMediaService.removeBackground(
      userId,
      imageUrl
    );

    res.json(result);
  } catch (error) {
    console.error('Error removing background:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media/image-to-video
 * @desc    Convert image to animated video
 * @access  Private
 */
router.post('/image-to-video', protect, async (req, res) => {
  try {
    const { imageUrl, prompt, duration } = req.body;
    const userId = req.user._id || req.user.id;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const result = await replicateMediaService.imageToVideo(
      userId,
      imageUrl,
      { prompt, duration }
    );

    res.json(result);
  } catch (error) {
    console.error('Error converting image to video:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/media/credits
 * @desc    Get user's media credit balance
 * @access  Private
 */
router.get('/credits', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const credits = await replicateMediaService.getCredits(userId);

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
 * @route   POST /api/media/credits/purchase
 * @desc    Purchase media credits
 * @access  Private
 */
router.post('/credits/purchase', protect, async (req, res) => {
  try {
    const { amount, paymentIntentId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit amount'
      });
    }

    // TODO: Verify Stripe payment before adding credits
    // const payment = await stripe.paymentIntents.retrieve(paymentIntentId);
    // if (payment.status !== 'succeeded') {
    //   return res.status(400).json({ success: false, message: 'Payment not confirmed' });
    // }

    const credits = await replicateMediaService.addCredits(
      userId,
      amount,
      'purchase'
    );

    res.json({
      success: true,
      message: `Added ${amount} credits to your account`,
      credits
    });
  } catch (error) {
    console.error('Error purchasing credits:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/media/pricing
 * @desc    Get pricing information for media generation
 * @access  Public
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricing = replicateMediaService.getPricing();

    res.json({
      success: true,
      pricing,
      packages: [
        {
          name: 'Starter Pack',
          credits: 50,
          price: 9.99,
          popular: false
        },
        {
          name: 'Creator Pack',
          credits: 200,
          price: 29.99,
          popular: true,
          savings: '25%'
        },
        {
          name: 'Professional Pack',
          credits: 500,
          price: 59.99,
          popular: false,
          savings: '40%'
        },
        {
          name: 'Enterprise Pack',
          credits: 1500,
          price: 149.99,
          popular: false,
          savings: '50%'
        }
      ]
    });
  } catch (error) {
    console.error('Error getting pricing:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
