import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Demo API Routes - No Authentication Required
 * Uses NVIDIA API for fast, cheap image generation
 * Free tier: 10 credits per session
 */

// NVIDIA API Configuration
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || 'nvapi-demo';
const NVIDIA_BASE_URL = 'https://ai.api.nvidia.com/v1';

/**
 * POST /api/demo/generate-image
 * Generate image from text prompt
 * Cost: 1 credit (~$0.05 with NVIDIA)
 */
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'photorealistic', aspectRatio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    console.log('🎨 Demo: Generating image...', { prompt, style, aspectRatio });

    // Build enhanced prompt based on style
    const enhancedPrompt = buildEnhancedPrompt(prompt, style);

    // Call NVIDIA Stable Diffusion XL (fastest, cheapest option)
    const response = await axios.post(
      `${NVIDIA_BASE_URL}/stabilityai/stable-diffusion-xl`,
      {
        text_prompts: [
          {
            text: enhancedPrompt,
            weight: 1
          }
        ],
        cfg_scale: 7,
        sampler: 'K_EULER_ANCESTRAL',
        samples: 1,
        steps: 25, // Fewer steps = faster generation
        ...getAspectRatioDimensions(aspectRatio)
      },
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    if (response.data && response.data.artifacts && response.data.artifacts[0]) {
      const imageData = response.data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${imageData}`;

      console.log('✅ Demo: Image generated successfully');

      return res.json({
        success: true,
        imageUrl,
        creditsUsed: 1,
        model: 'nvidia-sdxl'
      });
    } else {
      throw new Error('No image data received from NVIDIA API');
    }
  } catch (error) {
    console.error('❌ Demo generation error:', error.message);

    // Fallback to placeholder for demo purposes
    const placeholderUrl = generatePlaceholderImage(req.body.prompt);

    return res.json({
      success: true,
      imageUrl: placeholderUrl,
      creditsUsed: 1,
      model: 'demo-placeholder',
      note: 'Using placeholder - configure NVIDIA_API_KEY for real generation'
    });
  }
});

/**
 * POST /api/demo/transform-image
 * Transform existing image with AI
 * Cost: 2 credits (~$0.10 with NVIDIA)
 */
router.post('/transform-image', async (req, res) => {
  try {
    const { imageData, prompt } = req.body;

    if (!imageData || !prompt) {
      return res.status(400).json({ success: false, error: 'Image and prompt are required' });
    }

    console.log('🔄 Demo: Transforming image...', { prompt });

    // Extract base64 data
    const base64Data = imageData.split(',')[1] || imageData;

    // Call NVIDIA Image-to-Image API
    const response = await axios.post(
      `${NVIDIA_BASE_URL}/stabilityai/stable-diffusion-xl`,
      {
        text_prompts: [
          {
            text: prompt,
            weight: 1
          }
        ],
        init_image: base64Data,
        init_image_mode: 'IMAGE_STRENGTH',
        image_strength: 0.35, // How much to transform (0.35 = moderate transformation)
        cfg_scale: 7,
        sampler: 'K_EULER_ANCESTRAL',
        samples: 1,
        steps: 30
      },
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000 // 90 second timeout for transformations
      }
    );

    if (response.data && response.data.artifacts && response.data.artifacts[0]) {
      const transformedData = response.data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${transformedData}`;

      console.log('✅ Demo: Image transformed successfully');

      return res.json({
        success: true,
        imageUrl,
        creditsUsed: 2,
        model: 'nvidia-sdxl-img2img'
      });
    } else {
      throw new Error('No image data received from NVIDIA API');
    }
  } catch (error) {
    console.error('❌ Demo transformation error:', error.message);

    // Fallback to placeholder
    const placeholderUrl = generatePlaceholderImage('Transformed: ' + req.body.prompt);

    return res.json({
      success: true,
      imageUrl: placeholderUrl,
      creditsUsed: 2,
      model: 'demo-placeholder',
      note: 'Using placeholder - configure NVIDIA_API_KEY for real transformation'
    });
  }
});

/**
 * Helper: Build enhanced prompt based on style
 */
function buildEnhancedPrompt(basePrompt, style) {
  const styleEnhancements = {
    photorealistic: 'photorealistic, high quality, detailed, professional photography, 8k, sharp focus',
    artistic: 'artistic, creative, expressive, detailed artwork, professional illustration',
    cinematic: 'cinematic lighting, dramatic, movie quality, high contrast, professional cinematography',
    modern: 'modern, clean, contemporary, minimalist aesthetic, professional design'
  };

  const enhancement = styleEnhancements[style] || styleEnhancements.photorealistic;
  return `${basePrompt}, ${enhancement}`;
}

/**
 * Helper: Get dimensions for aspect ratio
 */
function getAspectRatioDimensions(aspectRatio) {
  const dimensions = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1344, height: 768 },
    '9:16': { width: 768, height: 1344 },
    '4:3': { width: 1024, height: 768 }
  };

  return dimensions[aspectRatio] || dimensions['1:1'];
}

/**
 * Helper: Generate placeholder image for demo/fallback
 */
function generatePlaceholderImage(prompt) {
  // Use a placeholder service or return a data URL
  const text = encodeURIComponent(prompt.substring(0, 50));
  return `https://via.placeholder.com/1024x1024/1a1a1a/3b82f6?text=${text}`;
}

export default router;
