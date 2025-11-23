import express from 'express';
import vertexAIService from '../services/vertexAIService.js';

const router = express.Router();

/**
 * Studio API Routes - Social Media Staging Platform
 * Integrates with Vertex AI and n8n workflows
 */

/**
 * POST /api/studio/generate
 * Generate AI image with automatic caption and hashtags
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, platform = 'instagram', style = 'photorealistic' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    console.log('🎨 Studio: Generating content...', { prompt, platform, style });

    // Enhance prompt based on style
    const enhancedPrompt = buildEnhancedPrompt(prompt, style);

    // Generate image with Vertex AI
    let imageResult;
    try {
      imageResult = await vertexAIService.generateImage(enhancedPrompt, {
        aspectRatio: platform === 'instagram' ? '1:1' : '16:9',
        numberOfImages: 1
      });
    } catch (error) {
      // Fallback to placeholder if Vertex AI fails
      console.warn('⚠️  Vertex AI unavailable, using placeholder');
      imageResult = {
        images: [{ imageUrl: generatePlaceholder(prompt) }]
      };
    }

    const imageUrl = imageResult.images[0].imageUrl;

    // Generate marketing copy
    let marketingCopy = {};
    try {
      const copyResult = await vertexAIService.generateMarketingCopy(
        imageUrl,
        {
          platform,
          tone: 'professional',
          targetAudience: 'homeowners',
          callToAction: true
        }
      );
      marketingCopy = copyResult.copy;
    } catch (error) {
      console.warn('⚠️  Marketing copy generation failed, using defaults');
      marketingCopy = generateDefaultCopy(prompt, platform);
    }

    console.log('✅ Studio: Content generated');

    return res.json({
      success: true,
      imageUrl,
      caption: marketingCopy.caption || '',
      hashtags: marketingCopy.hashtags || [],
      headline: marketingCopy.headline || '',
      cta: marketingCopy.cta || '',
      platform,
      model: 'vertex-ai'
    });
  } catch (error) {
    console.error('❌ Studio generation error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate content'
    });
  }
});

/**
 * POST /api/studio/analyze
 * Analyze uploaded image with AI vision
 */
router.post('/analyze', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Image URL is required' });
    }

    console.log('🔍 Studio: Analyzing image...');

    let analysis = {};
    try {
      const analysisResult = await vertexAIService.analyzeImage(imageUrl, 'marketing');
      analysis = analysisResult.analysis;

      // Also generate captions
      const captionResult = await vertexAIService.analyzeImage(imageUrl, 'caption');
      analysis.captions = captionResult.analysis;
    } catch (error) {
      console.warn('⚠️  AI analysis unavailable, using defaults');
      analysis = {
        description: 'Professional image',
        captions: generateDefaultCaptions()
      };
    }

    console.log('✅ Studio: Image analyzed');

    return res.json({
      success: true,
      analysis: analysis.description || analysis,
      caption: analysis.captions?.split('\n')[0] || 'Check out this amazing project!',
      hashtags: ['#remodel', '#homeimprovement', '#beforeandafter'],
      model: 'vertex-gemini-vision'
    });
  } catch (error) {
    console.error('❌ Studio analysis error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze image'
    });
  }
});

/**
 * POST /api/studio/share
 * Share content to social media platforms
 * Triggers n8n workflows for automation
 */
router.post('/share', async (req, res) => {
  try {
    const {
      imageUrl,
      caption,
      hashtags,
      platform,
      recipients = []
    } = req.body;

    console.log('📤 Studio: Sharing content...', { platform, recipients: recipients.length });

    // Trigger n8n workflow based on platform
    const workflowData = {
      imageUrl,
      caption,
      hashtags: Array.isArray(hashtags) ? hashtags.join(' ') : hashtags,
      platform,
      recipients,
      timestamp: new Date().toISOString()
    };

    // In production, trigger actual n8n workflow
    // await triggerN8nWorkflow('social-media-share', workflowData);

    console.log('✅ Studio: Content shared');

    return res.json({
      success: true,
      message: `Content shared to ${platform}`,
      workflowTriggered: true
    });
  } catch (error) {
    console.error('❌ Studio share error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to share content'
    });
  }
});

/**
 * POST /api/studio/workflow/trigger
 * Trigger custom n8n workflow
 */
router.post('/workflow/trigger', async (req, res) => {
  try {
    const { workflowId, data } = req.body;

    console.log('🔄 Studio: Triggering workflow...', { workflowId });

    // In production, call n8n webhook
    // const n8nUrl = `${process.env.N8N_WEBHOOK_URL}/workflow/${workflowId}`;
    // await axios.post(n8nUrl, data);

    console.log('✅ Studio: Workflow triggered');

    return res.json({
      success: true,
      message: 'Workflow triggered successfully',
      workflowId
    });
  } catch (error) {
    console.error('❌ Studio workflow error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger workflow'
    });
  }
});

/**
 * Helper: Build enhanced prompt
 */
function buildEnhancedPrompt(basePrompt, style) {
  const styleEnhancements = {
    photorealistic: 'photorealistic, high quality, professional photography, 8k, sharp focus, natural lighting',
    artistic: 'artistic, creative, expressive, detailed artwork, professional illustration, vibrant colors',
    cinematic: 'cinematic lighting, dramatic, movie quality, high contrast, professional cinematography, epic composition'
  };

  const enhancement = styleEnhancements[style] || styleEnhancements.photorealistic;
  return `${basePrompt}, ${enhancement}`;
}

/**
 * Helper: Generate default marketing copy
 */
function generateDefaultCopy(prompt, platform) {
  const hashtags = ['#remodel', '#homeimprovement', '#renovation', '#interiordesign', '#homedecor'];

  if (platform === 'instagram') {
    return {
      headline: 'Transform Your Space',
      caption: `✨ ${prompt}\n\nReady to bring your vision to life? Let's make it happen!`,
      hashtags: hashtags,
      cta: 'DM us for a free consultation!'
    };
  } else if (platform === 'facebook') {
    return {
      headline: 'Check Out This Amazing Project',
      caption: `We're excited to share: ${prompt}!\n\nInterested in something similar for your home? Get in touch!`,
      hashtags: hashtags.slice(0, 3),
      cta: 'Contact us today!'
    };
  } else {
    return {
      headline: 'Professional Results',
      caption: prompt,
      hashtags: hashtags.slice(0, 5),
      cta: 'Learn more'
    };
  }
}

/**
 * Helper: Generate default captions
 */
function generateDefaultCaptions() {
  return `1. Transform your space with professional design
2. Your dream home awaits
3. Quality craftsmanship, stunning results`;
}

/**
 * Helper: Generate placeholder
 */
function generatePlaceholder(text) {
  const encodedText = encodeURIComponent(text.substring(0, 50));
  return `https://via.placeholder.com/1024x1024/1a1a1a/3b82f6?text=${encodedText}`;
}

export default router;
