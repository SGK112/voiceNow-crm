/**
 * REMODELY.AI API Routes
 * Provides AI proxy endpoints for the REMODELY.AI mobile app
 */

import express from 'express';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * POST /api/remodely/chat
 * AI Chat endpoint for REMODELY.AI app
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'openai', temperature = 0.7, maxTokens = 1000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let response;

    if (model === 'anthropic') {
      // Use Anthropic Claude
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const claudeResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: maxTokens,
        system: systemMessage?.content || 'You are a helpful assistant for REMODELY.AI, a remodeling materials marketplace app.',
        messages: conversationMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      response = {
        message: claudeResponse.content[0].text,
        model: 'claude-3-5-sonnet'
      };
    } else {
      // Default to OpenAI
      const openaiResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature,
        max_tokens: maxTokens
      });

      response = {
        message: openaiResponse.choices[0].message.content,
        model: 'gpt-4o'
      };
    }

    res.json(response);
  } catch (error) {
    console.error('REMODELY chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request', details: error.message });
  }
});

/**
 * POST /api/remodely/generate-image
 * Image generation for material visualizations
 */
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `High-quality photo of remodeling material: ${prompt}`,
      n: 1,
      size,
      quality
    });

    res.json({
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt
    });
  } catch (error) {
    console.error('REMODELY image generation error:', error);
    res.status(500).json({ error: 'Failed to generate image', details: error.message });
  }
});

/**
 * POST /api/remodely/transcribe
 * Audio transcription for voice input
 */
router.post('/transcribe', async (req, res) => {
  try {
    // Handle multipart form data with audio file
    // Note: In production, use multer or similar middleware
    const audioFile = req.files?.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en'
    });

    res.json({
      text: transcription.text
    });
  } catch (error) {
    console.error('REMODELY transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

/**
 * POST /api/remodely/analyze-material
 * Analyze material from image using GPT-4 Vision
 */
router.post('/analyze-material', async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: 'Image URL or base64 is required' });
    }

    const imageContent = imageUrl
      ? { type: 'image_url', image_url: { url: imageUrl } }
      : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at identifying remodeling materials like granite, marble, quartz, tile, and other stone/surface materials.
Analyze the image and provide:
1. Material type (granite, marble, quartz, quartzite, tile, wood, etc.)
2. Specific variety or pattern name if identifiable
3. Primary and secondary colors
4. Estimated market value range per square foot
5. Best use suggestions (countertops, flooring, backsplash, etc.)

Respond in JSON format with keys: material, type, colors, estimatedValue, suggestions`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this remodeling material and identify what it is:' },
            imageContent
          ]
        }
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    res.json(analysis);
  } catch (error) {
    console.error('REMODELY material analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze material', details: error.message });
  }
});

/**
 * POST /api/remodely/price-estimate
 * Get price estimate for materials
 */
router.post('/price-estimate', async (req, res) => {
  try {
    const { material, dimensions, condition } = req.body;

    if (!material || !dimensions) {
      return res.status(400).json({ error: 'Material and dimensions are required' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a pricing expert for remodeling materials marketplace.
Given material details, provide realistic price estimates based on current market rates.
Consider:
- Material type and quality
- Dimensions (length x width in inches)
- Condition (new, like-new, good, fair)
- Market demand

Respond in JSON format with:
- estimatedPrice: { low: number, high: number } (in USD)
- marketComparison: string (brief comparison to market rates)
- demandLevel: "high" | "medium" | "low"`
        },
        {
          role: 'user',
          content: `Estimate price for:
Material: ${material}
Dimensions: ${dimensions.length}" x ${dimensions.width}"${dimensions.thickness ? ` x ${dimensions.thickness}" thick` : ''}
Condition: ${condition}`
        }
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const estimate = JSON.parse(response.choices[0].message.content);
    res.json(estimate);
  } catch (error) {
    console.error('REMODELY price estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate price', details: error.message });
  }
});

/**
 * GET /api/remodely/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'REMODELY.AI API',
    timestamp: new Date().toISOString(),
    aiServices: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    }
  });
});

export default router;
