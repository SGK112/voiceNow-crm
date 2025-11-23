import axios from 'axios';

/**
 * Google Vertex AI Service
 * Provides image generation, analysis, and vision capabilities
 * Using Imagen 2 and Gemini Vision models
 */

class VertexAIService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    this.baseUrl = `https://${this.location}-aiplatform.googleapis.com/v1`;

    console.log('✅ Vertex AI Service initialized');
  }

  /**
   * Generate image using Imagen 2
   * Fast, high-quality image generation
   */
  async generateImage(prompt, options = {}) {
    try {
      const {
        aspectRatio = '1:1',
        numberOfImages = 1,
        negativePrompt = '',
        guidanceScale = 7.0,
        seed = null
      } = options;

      console.log('🎨 Vertex AI: Generating image...', { prompt, aspectRatio });

      // Map aspect ratios to Imagen dimensions
      const dimensions = this.getImageDimensions(aspectRatio);

      const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/imagegeneration:predict`;

      const response = await axios.post(
        endpoint,
        {
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: numberOfImages,
            aspectRatio: aspectRatio,
            negativePrompt: negativePrompt,
            safetySetting: 'block_few',
            personGeneration: 'allow_adult'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.predictions) {
        const images = response.data.predictions.map(pred => ({
          imageUrl: `data:image/png;base64,${pred.bytesBase64Encoded}`,
          mimeType: pred.mimeType || 'image/png'
        }));

        console.log('✅ Vertex AI: Generated', images.length, 'images');

        return {
          success: true,
          images: images,
          model: 'vertex-imagen-2',
          creditsUsed: numberOfImages
        };
      }

      throw new Error('No images generated');
    } catch (error) {
      console.error('❌ Vertex AI generation error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze image with Gemini Vision
   * Understands image content, suggests captions, identifies objects
   */
  async analyzeImage(imageBase64, analysisType = 'comprehensive') {
    try {
      console.log('🔍 Vertex AI: Analyzing image...', { analysisType });

      const prompts = {
        comprehensive: 'Describe this image in detail. Include: main subject, style, colors, mood, composition, and potential use cases for marketing.',
        caption: 'Write 3 engaging social media captions for this image. Make them suitable for Instagram, Facebook, and LinkedIn.',
        objects: 'List all objects, materials, and elements visible in this image.',
        marketing: 'Analyze this image for marketing purposes. What emotions does it evoke? What audience would it appeal to? What products/services could it promote?',
        improvements: 'Suggest improvements or variations for this image to make it more effective for social media marketing.'
      };

      const prompt = prompts[analysisType] || prompts.comprehensive;

      const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-pro-vision:predict`;

      const response = await axios.post(
        endpoint,
        {
          instances: [{
            prompt: prompt,
            image: {
              bytesBase64Encoded: imageBase64.split(',')[1] || imageBase64
            }
          }],
          parameters: {
            temperature: 0.4,
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.predictions && response.data.predictions[0]) {
        const analysis = response.data.predictions[0].content;

        console.log('✅ Vertex AI: Image analyzed');

        return {
          success: true,
          analysis: analysis,
          analysisType: analysisType,
          model: 'vertex-gemini-vision'
        };
      }

      throw new Error('No analysis generated');
    } catch (error) {
      console.error('❌ Vertex AI analysis error:', error.message);
      throw error;
    }
  }

  /**
   * Generate marketing copy for image
   */
  async generateMarketingCopy(imageBase64, context = {}) {
    try {
      const {
        platform = 'instagram',
        tone = 'professional',
        targetAudience = 'homeowners',
        callToAction = true
      } = context;

      console.log('📝 Vertex AI: Generating marketing copy...', { platform, tone });

      const prompt = `You are a social media marketing expert. Analyze this image and create engaging marketing copy.

Platform: ${platform}
Tone: ${tone}
Target Audience: ${targetAudience}

Generate:
1. A catchy headline (max 10 words)
2. Primary caption (2-3 sentences, engaging and authentic)
3. 5-10 relevant hashtags
${callToAction ? '4. A clear call-to-action' : ''}

Format as JSON with keys: headline, caption, hashtags (array), cta`;

      const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-pro-vision:predict`;

      const response = await axios.post(
        endpoint,
        {
          instances: [{
            prompt: prompt,
            image: {
              bytesBase64Encoded: imageBase64.split(',')[1] || imageBase64
            }
          }],
          parameters: {
            temperature: 0.7,
            maxOutputTokens: 512
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.predictions && response.data.predictions[0]) {
        let copy = response.data.predictions[0].content;

        // Try to parse as JSON
        try {
          copy = JSON.parse(copy);
        } catch (e) {
          // If not JSON, return as is
        }

        console.log('✅ Vertex AI: Marketing copy generated');

        return {
          success: true,
          copy: copy,
          platform: platform,
          model: 'vertex-gemini-vision'
        };
      }

      throw new Error('No copy generated');
    } catch (error) {
      console.error('❌ Vertex AI marketing copy error:', error.message);
      throw error;
    }
  }

  /**
   * Get image dimensions for aspect ratio
   */
  getImageDimensions(aspectRatio) {
    const dimensions = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1536, height: 864 },
      '9:16': { width: 864, height: 1536 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 }
    };

    return dimensions[aspectRatio] || dimensions['1:1'];
  }

  /**
   * Get Google Cloud access token
   * In production, use service account credentials
   */
  async getAccessToken() {
    // For development, return API key
    if (this.apiKey) {
      return this.apiKey;
    }

    // In production, use Google Auth Library
    // const auth = new GoogleAuth();
    // const client = await auth.getClient();
    // const token = await client.getAccessToken();
    // return token.token;

    throw new Error('Google Cloud credentials not configured');
  }
}

export default new VertexAIService();
