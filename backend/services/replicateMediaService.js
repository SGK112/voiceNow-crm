import Replicate from 'replicate';
import User from '../models/User.js';
import MediaAsset from '../models/MediaAsset.js';

/**
 * Replicate Media Generation Service
 * Handles AI image and video generation with usage tracking and monetization
 */
class ReplicateMediaService {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // Pricing per generation (in credits)
    this.pricing = {
      image: {
        flux_schnell: 1,      // Fast, good quality (default)
        flux_dev: 2,          // Better quality
        flux_pro: 5,          // Best quality
        sdxl: 1,              // Stable Diffusion XL
        dalle: 3              // DALL-E style
      },
      video: {
        runway_gen3: 10,      // Text to video
        stable_video: 8,      // Image to video
        animatediff: 5        // Animation
      },
      enhancement: {
        upscale: 2,           // Image upscaling
        face_restore: 2,      // Face enhancement
        background_removal: 1 // Remove background
      }
    };
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(userId, options) {
    const {
      prompt,
      model = 'flux_schnell',
      aspectRatio = '1:1',
      numOutputs = 1,
      style = 'photorealistic'
    } = options;

    // Check user credits
    await this.checkAndDeductCredits(userId, this.pricing.image[model] * numOutputs);

    let output;
    const startTime = Date.now();

    try {
      switch (model) {
        case 'flux_schnell':
          output = await this.replicate.run(
            "black-forest-labs/flux-schnell",
            {
              input: {
                prompt,
                aspect_ratio: aspectRatio,
                num_outputs: numOutputs,
                output_format: 'png',
                output_quality: 90
              }
            }
          );
          break;

        case 'flux_dev':
          output = await this.replicate.run(
            "black-forest-labs/flux-dev",
            {
              input: {
                prompt,
                aspect_ratio: aspectRatio,
                num_outputs: numOutputs,
                guidance: 3.5,
                num_inference_steps: 28
              }
            }
          );
          break;

        case 'flux_pro':
          output = await this.replicate.run(
            "black-forest-labs/flux-pro",
            {
              input: {
                prompt,
                aspect_ratio: aspectRatio,
                safety_tolerance: 2,
                output_format: 'png'
              }
            }
          );
          break;

        case 'sdxl':
          output = await this.replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            {
              input: {
                prompt,
                width: aspectRatio === '1:1' ? 1024 : 1344,
                height: aspectRatio === '1:1' ? 1024 : 768,
                num_outputs: numOutputs,
                scheduler: 'K_EULER'
              }
            }
          );
          break;

        default:
          throw new Error(`Unknown model: ${model}`);
      }

      const duration = Date.now() - startTime;

      // Handle Replicate output - can be URLs, FileOutput objects, or ReadableStreams
      let rawImages = Array.isArray(output) ? output : [output];
      console.log('[ReplicateMedia] Raw output type:', typeof rawImages[0], rawImages[0]?.constructor?.name);

      // Convert FileOutput objects or other formats to URL strings
      const images = rawImages.map(img => {
        if (typeof img === 'string') {
          return img; // Already a URL string
        } else if (img && typeof img.url === 'function') {
          // FileOutput.url() returns a URL object, convert to string
          const urlObj = img.url();
          return urlObj.href || urlObj.toString();
        } else if (img && img.href) {
          return img.href; // Already a URL object
        } else if (img && typeof img.toString === 'function') {
          const str = img.toString();
          if (str.startsWith('http')) {
            return str;
          }
        }
        console.log('[ReplicateMedia] Unknown image format:', img);
        return null;
      }).filter(Boolean);

      console.log('[ReplicateMedia] Processed images:', images);
      const creditsUsed = this.pricing.image[model] * numOutputs;

      // Save to media library
      const savedAssets = await this.saveToLibrary(userId, {
        type: 'image',
        urls: images,
        prompt,
        model,
        style: options.style,
        aspectRatio,
        creditsUsed,
        duration
      });

      return {
        success: true,
        images,
        assets: savedAssets, // Return saved media asset IDs
        model,
        creditsUsed,
        duration
      };

    } catch (error) {
      // Refund credits on error
      await this.refundCredits(userId, this.pricing.image[model] * numOutputs);
      throw error;
    }
  }

  /**
   * Generate video from text prompt
   */
  async generateVideo(userId, options) {
    const {
      prompt,
      model = 'runway_gen3',
      duration = 5,
      aspectRatio = '16:9'
    } = options;

    const creditsNeeded = this.pricing.video[model];
    await this.checkAndDeductCredits(userId, creditsNeeded);

    const startTime = Date.now();

    try {
      let output;

      switch (model) {
        case 'runway_gen3':
          output = await this.replicate.run(
            "runwayml/runway-gen3-alpha:latest",
            {
              input: {
                prompt,
                duration,
                aspect_ratio: aspectRatio
              }
            }
          );
          break;

        case 'stable_video':
          output = await this.replicate.run(
            "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
            {
              input: {
                prompt,
                motion_bucket_id: 127,
                frames_per_second: 6
              }
            }
          );
          break;

        case 'animatediff':
          output = await this.replicate.run(
            "lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
            {
              input: {
                prompt,
                num_frames: duration * 8,
                guidance_scale: 7.5
              }
            }
          );
          break;

        default:
          throw new Error(`Unknown video model: ${model}`);
      }

      const generationDuration = Date.now() - startTime;

      await this.logGeneration(userId, {
        type: 'video',
        model,
        prompt,
        creditsUsed: creditsNeeded,
        outputs: [output],
        duration: generationDuration
      });

      return {
        success: true,
        video: output,
        model,
        creditsUsed: creditsNeeded,
        duration: generationDuration
      };

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Upscale image
   */
  async upscaleImage(userId, imageUrl, scale = 4) {
    const creditsNeeded = this.pricing.enhancement.upscale;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      const output = await this.replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: imageUrl,
            scale,
            face_enhance: false
          }
        }
      );

      await this.logGeneration(userId, {
        type: 'upscale',
        model: 'real-esrgan',
        creditsUsed: creditsNeeded,
        outputs: [output]
      });

      return {
        success: true,
        image: output,
        creditsUsed: creditsNeeded
      };

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Remove background from image
   */
  async removeBackground(userId, imageUrl) {
    const creditsNeeded = this.pricing.enhancement.background_removal;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      const output = await this.replicate.run(
        "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
        {
          input: {
            image: imageUrl
          }
        }
      );

      await this.logGeneration(userId, {
        type: 'background_removal',
        model: 'rembg',
        creditsUsed: creditsNeeded,
        outputs: [output]
      });

      return {
        success: true,
        image: output,
        creditsUsed: creditsNeeded
      };

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Image to video (animate static image)
   */
  async imageToVideo(userId, imageUrl, options = {}) {
    const {
      prompt = 'smooth camera movement',
      duration = 3
    } = options;

    const creditsNeeded = this.pricing.video.stable_video;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      const output = await this.replicate.run(
        "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
        {
          input: {
            cond_aug: 0.02,
            decoding_t: 7,
            input_image: imageUrl,
            video_length: duration,
            sizing_strategy: "maintain_aspect_ratio",
            motion_bucket_id: 127,
            frames_per_second: 6
          }
        }
      );

      await this.logGeneration(userId, {
        type: 'image_to_video',
        model: 'stable-video-diffusion',
        creditsUsed: creditsNeeded,
        outputs: [output]
      });

      return {
        success: true,
        video: output,
        creditsUsed: creditsNeeded
      };

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Check if user has enough credits and deduct
   */
  async checkAndDeductCredits(userId, creditsNeeded) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('SESSION_EXPIRED: Please log out and log back in to use image generation.');
    }

    // Initialize media credits if not exists - give 50 free credits to new users
    if (!user.mediaCredits) {
      user.mediaCredits = {
        balance: 50, // Welcome bonus credits
        used: 0,
        purchased: 0
      };
      console.log(`🎁 Gave ${user.email} 50 free media credits as welcome bonus`);
    }

    // If user has 0 credits and hasn't purchased, give them welcome bonus
    if (user.mediaCredits.balance === 0 && user.mediaCredits.purchased === 0 && user.mediaCredits.used === 0) {
      user.mediaCredits.balance = 50;
      console.log(`🎁 Gave ${user.email} 50 free media credits (existing user bonus)`);
    }

    if (user.mediaCredits.balance < creditsNeeded) {
      throw new Error(`Insufficient credits. Need ${creditsNeeded}, have ${user.mediaCredits.balance}. Purchase more credits in Settings.`);
    }

    // Deduct credits
    user.mediaCredits.balance -= creditsNeeded;
    user.mediaCredits.used += creditsNeeded;
    await user.save();

    return user.mediaCredits;
  }

  /**
   * Refund credits (on error)
   */
  async refundCredits(userId, credits) {
    const user = await User.findById(userId);

    if (user && user.mediaCredits) {
      user.mediaCredits.balance += credits;
      user.mediaCredits.used -= credits;
      await user.save();
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId, credits, source = 'purchase') {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mediaCredits) {
      user.mediaCredits = {
        balance: 0,
        used: 0,
        purchased: 0
      };
    }

    user.mediaCredits.balance += credits;

    if (source === 'purchase') {
      user.mediaCredits.purchased += credits;
    }

    await user.save();

    return user.mediaCredits;
  }

  /**
   * Log generation for analytics
   */
  async logGeneration(userId, data) {
    // You can create a MediaGeneration model to track all generations
    console.log('📊 Media Generation:', {
      userId,
      ...data,
      timestamp: new Date()
    });

    // TODO: Save to MediaGeneration collection for analytics
    // await MediaGeneration.create({ userId, ...data });
  }

  /**
   * Get user's credit balance
   */
  async getCredits(userId) {
    const user = await User.findById(userId);

    if (!user || !user.mediaCredits) {
      return {
        balance: 0,
        used: 0,
        purchased: 0
      };
    }

    return user.mediaCredits;
  }

  /**
   * Get pricing information
   */
  getPricing() {
    return this.pricing;
  }

  /**
   * Save generated media to user's library
   */
  async saveToLibrary(userId, data) {
    const { type, urls, prompt, model, style, aspectRatio, creditsUsed, duration, sourceImageUrl } = data;

    const savedAssets = [];

    for (const url of urls) {
      const asset = await MediaAsset.create({
        userId,
        type,
        url,
        thumbnailUrl: type === 'video' ? null : url, // For videos, could generate thumbnail
        prompt,
        model,
        style,
        aspectRatio,
        category: 'other', // User can change later
        folder: 'AI Generated',
        generationDetails: {
          creditsUsed: creditsUsed / urls.length, // Split credits among outputs
          duration,
          generatedAt: new Date(),
          sourceImageUrl
        },
        status: 'ready'
      });

      savedAssets.push(asset);
    }

    console.log(`💾 Saved ${savedAssets.length} assets to media library`);
    return savedAssets;
  }
}

export default new ReplicateMediaService();
