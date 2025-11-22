import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import imageManipulationService from '../services/imageManipulationService.js';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * @route   POST /api/image-transform/interior
 * @desc    Transform interior design
 * @access  Private
 */
router.post('/interior', protect, async (req, res) => {
  try {
    const { imageUrl, prompt, style, strength } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const result = await imageManipulationService.transformInterior(req.user.userId, {
      imageUrl,
      prompt: prompt || 'modern renovation',
      style: style || 'modern',
      strength: strength || 0.7
    });

    res.json(result);
  } catch (error) {
    console.error('Error transforming interior:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/material-swap
 * @desc    Swap materials (countertops, flooring, etc.)
 * @access  Private
 */
router.post('/material-swap', protect, async (req, res) => {
  try {
    const { imageUrl, materialType, newMaterial, strength } = req.body;

    if (!imageUrl || !materialType || !newMaterial) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl, materialType, and newMaterial are required'
      });
    }

    const result = await imageManipulationService.swapMaterial(req.user.userId, {
      imageUrl,
      materialType,
      newMaterial,
      strength: strength || 0.8
    });

    res.json(result);
  } catch (error) {
    console.error('Error swapping material:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/exterior
 * @desc    Transform exterior style
 * @access  Private
 */
router.post('/exterior', protect, async (req, res) => {
  try {
    const { imageUrl, transformation, details } = req.body;

    if (!imageUrl || !transformation) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl and transformation are required'
      });
    }

    const result = await imageManipulationService.transformExterior(req.user.userId, {
      imageUrl,
      transformation,
      details: details || ''
    });

    res.json(result);
  } catch (error) {
    console.error('Error transforming exterior:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/landscaping
 * @desc    Transform landscaping
 * @access  Private
 */
router.post('/landscaping', protect, async (req, res) => {
  try {
    const { imageUrl, landscapeType } = req.body;

    if (!imageUrl || !landscapeType) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl and landscapeType are required'
      });
    }

    const result = await imageManipulationService.transformLandscaping(req.user.userId, {
      imageUrl,
      landscapeType
    });

    res.json(result);
  } catch (error) {
    console.error('Error transforming landscaping:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/virtual-staging
 * @desc    Add furniture to empty rooms
 * @access  Private
 */
router.post('/virtual-staging', protect, async (req, res) => {
  try {
    const { imageUrl, roomType, style } = req.body;

    if (!imageUrl || !roomType) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl and roomType are required'
      });
    }

    const result = await imageManipulationService.virtualStaging(req.user.userId, {
      imageUrl,
      roomType,
      style: style || 'modern'
    });

    res.json(result);
  } catch (error) {
    console.error('Error virtual staging:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/color-change
 * @desc    Change colors (walls, cabinets, etc.)
 * @access  Private
 */
router.post('/color-change', protect, async (req, res) => {
  try {
    const { imageUrl, target, color } = req.body;

    if (!imageUrl || !target || !color) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl, target, and color are required'
      });
    }

    const result = await imageManipulationService.changeColor(req.user.userId, {
      imageUrl,
      target,
      color
    });

    res.json(result);
  } catch (error) {
    console.error('Error changing color:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/enhance
 * @desc    Enhance resolution (upscale)
 * @access  Private
 */
router.post('/enhance', protect, async (req, res) => {
  try {
    const { imageUrl, scale } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required'
      });
    }

    const result = await imageManipulationService.enhanceResolution(
      req.user.userId,
      imageUrl,
      scale || 4
    );

    res.json(result);
  } catch (error) {
    console.error('Error enhancing resolution:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/time-of-day
 * @desc    Change lighting/time of day
 * @access  Private
 */
router.post('/time-of-day', protect, async (req, res) => {
  try {
    const { imageUrl, timeOfDay } = req.body;

    if (!imageUrl || !timeOfDay) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl and timeOfDay are required'
      });
    }

    const result = await imageManipulationService.changeTimeOfDay(req.user.userId, {
      imageUrl,
      timeOfDay
    });

    res.json(result);
  } catch (error) {
    console.error('Error changing time of day:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/background
 * @desc    Replace background
 * @access  Private
 */
router.post('/background', protect, async (req, res) => {
  try {
    const { imageUrl, newBackground } = req.body;

    if (!imageUrl || !newBackground) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl and newBackground are required'
      });
    }

    const result = await imageManipulationService.replaceBackground(req.user.userId, {
      imageUrl,
      newBackground
    });

    res.json(result);
  } catch (error) {
    console.error('Error replacing background:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/image-transform/remove-objects
 * @desc    Remove unwanted objects/furniture
 * @access  Private
 */
router.post('/remove-objects', protect, async (req, res) => {
  try {
    const { imageUrl, objectsToRemove } = req.body;

    if (!imageUrl || !objectsToRemove) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl and objectsToRemove are required'
      });
    }

    const result = await imageManipulationService.removeObjects(req.user.userId, {
      imageUrl,
      objectsToRemove
    });

    res.json(result);
  } catch (error) {
    console.error('Error removing objects:', error);
    res.status(error.message.includes('Insufficient credits') ? 402 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/image-transform/pricing
 * @desc    Get transformation pricing
 * @access  Public
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricing = imageManipulationService.getPricing();

    res.json({
      success: true,
      pricing,
      transformations: [
        {
          type: 'interior_design',
          name: 'Interior Redesign',
          description: 'Transform room style while keeping structure',
          credits: pricing.interior_design,
          examples: ['Modern to farmhouse', 'Traditional to contemporary', 'Add crown molding']
        },
        {
          type: 'material_swap',
          name: 'Material Swap',
          description: 'Replace countertops, flooring, backsplash, siding',
          credits: pricing.material_swap,
          examples: ['Laminate to granite', 'Carpet to hardwood', 'Vinyl to tile']
        },
        {
          type: 'exterior_transform',
          name: 'Exterior Transformation',
          description: 'Change home exterior style',
          credits: pricing.exterior_transform,
          examples: ['Modern farmhouse', 'Add stone facade', 'New siding color']
        },
        {
          type: 'landscaping',
          name: 'Landscaping',
          description: 'Add or modify yard landscaping',
          credits: pricing.landscaping,
          examples: ['Lush garden', 'Desert landscape', 'Modern pavers']
        },
        {
          type: 'virtual_staging',
          name: 'Virtual Staging',
          description: 'Add furniture to empty rooms',
          credits: pricing.virtual_staging,
          examples: ['Stage living room', 'Furnish bedroom', 'Kitchen decor']
        },
        {
          type: 'color_change',
          name: 'Color Change',
          description: 'Change paint colors',
          credits: pricing.color_change,
          examples: ['White to gray walls', 'Navy cabinets', 'Beige exterior']
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
