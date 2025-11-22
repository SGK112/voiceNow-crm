import Replicate from 'replicate';
import MediaAsset from '../models/MediaAsset.js';
import User from '../models/User.js';

/**
 * Image Manipulation Service
 * Transform user-uploaded images using Replicate's AI models
 * Perfect for contractors: renovate interiors, change materials, landscaping, etc.
 */
class ImageManipulationService {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // Pricing for different transformations
    this.pricing = {
      interior_design: 3,        // Redesign room
      exterior_transform: 3,     // Change exterior style
      material_swap: 2,          // Swap countertops, floors, etc.
      landscaping: 3,            // Add/change landscaping
      color_change: 2,           // Change paint colors
      furniture_removal: 2,      // Remove/add furniture
      lighting_enhancement: 2,   // Improve lighting
      style_transfer: 2,         // Apply artistic style
      virtual_staging: 3,        // Stage empty rooms
      weather_change: 2,         // Change time of day/weather
      resolution_enhance: 2,     // Super resolution
      background_replace: 2      // Replace background
    };
  }

  /**
   * Interior Design Transformation
   * Redesign a room while keeping structure
   */
  async transformInterior(userId, options) {
    const {
      imageUrl,
      prompt,
      style = 'modern',
      strength = 0.7
    } = options;

    const creditsNeeded = this.pricing.interior_design;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🏠 Transforming interior design...');

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt: `${style} interior design, ${prompt}`,
            num_inference_steps: 20,
            image_guidance_scale: 1.5,
            guidance_scale: 7.5
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'interior_design',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt,
        style,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Material Swap (Countertops, Flooring, etc.)
   * Replace specific materials in images
   */
  async swapMaterial(userId, options) {
    const {
      imageUrl,
      materialType,      // 'countertop' | 'flooring' | 'backsplash' | 'siding'
      newMaterial,       // 'black granite' | 'oak hardwood' | 'marble tile'
      strength = 0.8
    } = options;

    const creditsNeeded = this.pricing.material_swap;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log(`🔨 Swapping ${materialType} to ${newMaterial}...`);

      const prompt = `Replace ${materialType} with ${newMaterial}, photorealistic, keep everything else the same`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 25,
            image_guidance_scale: 1.8,
            guidance_scale: 8.0
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'material_swap',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: `${materialType} → ${newMaterial}`,
        metadata: { materialType, newMaterial },
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Exterior Transformation
   * Change home exterior style, siding, roof, etc.
   */
  async transformExterior(userId, options) {
    const {
      imageUrl,
      transformation,    // 'modern farmhouse' | 'craftsman style' | 'new siding'
      details = ''
    } = options;

    const creditsNeeded = this.pricing.exterior_transform;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🏡 Transforming exterior...');

      const prompt = `Transform to ${transformation}, ${details}, professional architectural photography`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 25,
            image_guidance_scale: 1.6,
            guidance_scale: 7.5
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'exterior_transform',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: transformation,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Landscaping Transformation
   * Add/modify landscaping in exterior photos
   */
  async transformLandscaping(userId, options) {
    const {
      imageUrl,
      landscapeType     // 'lush garden' | 'modern pavers' | 'desert landscaping'
    } = options;

    const creditsNeeded = this.pricing.landscaping;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🌳 Transforming landscaping...');

      const prompt = `Add ${landscapeType}, professional landscape design, well-maintained`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 20,
            image_guidance_scale: 1.5,
            guidance_scale: 7.0
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'landscaping',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: landscapeType,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Virtual Staging
   * Add furniture to empty rooms
   */
  async virtualStaging(userId, options) {
    const {
      imageUrl,
      roomType,         // 'living room' | 'bedroom' | 'kitchen'
      style = 'modern'  // 'modern' | 'traditional' | 'minimalist'
    } = options;

    const creditsNeeded = this.pricing.virtual_staging;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🛋️  Virtual staging...');

      const prompt = `Add ${style} furniture to ${roomType}, professionally staged, well-lit`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 25,
            image_guidance_scale: 1.4,
            guidance_scale: 8.0
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'virtual_staging',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: `${style} ${roomType}`,
        metadata: { roomType, style },
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Color/Paint Change
   * Change wall colors, cabinet colors, etc.
   */
  async changeColor(userId, options) {
    const {
      imageUrl,
      target,          // 'walls' | 'cabinets' | 'exterior'
      color           // 'light gray' | 'navy blue' | 'white'
    } = options;

    const creditsNeeded = this.pricing.color_change;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🎨 Changing colors...');

      const prompt = `Change ${target} color to ${color}, keep everything else identical`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 20,
            image_guidance_scale: 2.0,
            guidance_scale: 7.5
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'color_change',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: `${target} → ${color}`,
        metadata: { target, color },
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Super Resolution Enhancement
   * Upscale and enhance image quality
   */
  async enhanceResolution(userId, imageUrl, scale = 4) {
    const creditsNeeded = this.pricing.resolution_enhance;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log(`📐 Enhancing resolution ${scale}x...`);

      const output = await this.replicate.run(
        "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: imageUrl,
            scale,
            face_enhance: true
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'resolution_enhance',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: `${scale}x upscale`,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Time of Day / Lighting Change
   * Change from day to night, add sunset lighting, etc.
   */
  async changeTimeOfDay(userId, options) {
    const {
      imageUrl,
      timeOfDay        // 'golden hour sunset' | 'blue hour' | 'midday'
    } = options;

    const creditsNeeded = this.pricing.weather_change;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🌅 Changing time of day...');

      const prompt = `Change to ${timeOfDay} lighting, photorealistic`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 20,
            image_guidance_scale: 1.3,
            guidance_scale: 7.0
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'weather_change',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: timeOfDay,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Background Replacement
   * Replace background while keeping subject
   */
  async replaceBackground(userId, options) {
    const {
      imageUrl,
      newBackground    // 'mountain view' | 'city skyline' | 'garden'
    } = options;

    const creditsNeeded = this.pricing.background_replace;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🖼️  Replacing background...');

      // First remove background
      const noBg = await this.replicate.run(
        "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
        { input: { image: imageUrl } }
      );

      // Then add new background
      const prompt = `Place on ${newBackground} background, photorealistic, professional`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: noBg,
            prompt,
            num_inference_steps: 20,
            image_guidance_scale: 1.2,
            guidance_scale: 7.5
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'background_replace',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: newBackground,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Remove Objects/Furniture
   * Clean removal of unwanted items
   */
  async removeObjects(userId, options) {
    const {
      imageUrl,
      objectsToRemove  // 'furniture' | 'people' | 'clutter'
    } = options;

    const creditsNeeded = this.pricing.furniture_removal;
    await this.checkAndDeductCredits(userId, creditsNeeded);

    try {
      console.log('🗑️  Removing objects...');

      const prompt = `Remove ${objectsToRemove}, fill with matching background, seamless`;

      const output = await this.replicate.run(
        "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5b39687c491b2d0e4d6ee0c7e49b3b5f97c3e76e",
        {
          input: {
            image: imageUrl,
            prompt,
            num_inference_steps: 25,
            image_guidance_scale: 1.5,
            guidance_scale: 8.0
          }
        }
      );

      return await this.saveTransformation(userId, {
        type: 'furniture_removal',
        originalUrl: imageUrl,
        transformedUrl: output,
        prompt: `Remove ${objectsToRemove}`,
        creditsUsed: creditsNeeded
      });

    } catch (error) {
      await this.refundCredits(userId, creditsNeeded);
      throw error;
    }
  }

  /**
   * Save transformation to media library
   */
  async saveTransformation(userId, data) {
    const {
      type,
      originalUrl,
      transformedUrl,
      prompt,
      metadata = {},
      creditsUsed
    } = data;

    const asset = await MediaAsset.create({
      userId,
      type: 'image',
      url: transformedUrl,
      thumbnailUrl: transformedUrl,
      prompt,
      model: 'instruct-pix2pix',
      category: 'agent',
      folder: 'Transformations',
      name: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${new Date().toLocaleDateString()}`,
      description: `Transformed from original: ${prompt}`,
      generationDetails: {
        creditsUsed,
        generatedAt: new Date(),
        sourceImageUrl: originalUrl,
        transformationType: type,
        ...metadata
      },
      status: 'ready'
    });

    console.log(`💾 Saved transformation to media library: ${asset._id}`);

    return {
      success: true,
      original: originalUrl,
      transformed: transformedUrl,
      asset,
      creditsUsed
    };
  }

  /**
   * Credit management helpers
   */
  async checkAndDeductCredits(userId, creditsNeeded) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mediaCredits) {
      user.mediaCredits = { balance: 0, used: 0, purchased: 0 };
    }

    if (user.mediaCredits.balance < creditsNeeded) {
      throw new Error(`Insufficient credits. Need ${creditsNeeded}, have ${user.mediaCredits.balance}`);
    }

    user.mediaCredits.balance -= creditsNeeded;
    user.mediaCredits.used += creditsNeeded;
    user.mediaCredits.lastUsageDate = new Date();
    await user.save();

    return user.mediaCredits;
  }

  async refundCredits(userId, credits) {
    const user = await User.findById(userId);

    if (user && user.mediaCredits) {
      user.mediaCredits.balance += credits;
      user.mediaCredits.used -= credits;
      await user.save();
    }
  }

  /**
   * Get pricing info
   */
  getPricing() {
    return this.pricing;
  }
}

export default new ImageManipulationService();
