import express from 'express';
import { protect } from '../middleware/auth.js';
import MediaAsset from '../models/MediaAsset.js';

const router = express.Router();

/**
 * @route   GET /api/media-library
 * @desc    Get user's media library
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { type, category, folder, tags, limit = 50 } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (folder) filters.folder = folder;
    if (tags) filters.tags = tags.split(',');

    const media = await MediaAsset.getUserLibrary(req.user.userId, {
      ...filters,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      media,
      count: media.length
    });
  } catch (error) {
    console.error('Error fetching media library:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/media-library/:id
 * @desc    Get single media asset
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const asset = await MediaAsset.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Increment view count
    asset.views += 1;
    await asset.save();

    res.json({
      success: true,
      asset
    });
  } catch (error) {
    console.error('Error fetching media asset:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PATCH /api/media-library/:id
 * @desc    Update media asset metadata
 * @access  Private
 */
router.patch('/:id', protect, async (req, res) => {
  try {
    const {
      name,
      description,
      tags,
      category,
      folder,
      isFavorite,
      altText
    } = req.body;

    const asset = await MediaAsset.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Update fields
    if (name !== undefined) asset.name = name;
    if (description !== undefined) asset.description = description;
    if (tags !== undefined) asset.tags = tags;
    if (category !== undefined) asset.category = category;
    if (folder !== undefined) asset.folder = folder;
    if (isFavorite !== undefined) asset.isFavorite = isFavorite;
    if (altText !== undefined) asset.altText = altText;

    await asset.save();

    res.json({
      success: true,
      message: 'Media updated successfully',
      asset
    });
  } catch (error) {
    console.error('Error updating media asset:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/media-library/:id
 * @desc    Delete media asset
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const asset = await MediaAsset.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media asset:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media-library/:id/download
 * @desc    Track media download
 * @access  Private
 */
router.post('/:id/download', protect, async (req, res) => {
  try {
    const asset = await MediaAsset.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    asset.downloads += 1;
    await asset.save();

    res.json({
      success: true,
      url: asset.url
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media-library/:id/share
 * @desc    Share media with team member
 * @access  Private
 */
router.post('/:id/share', protect, async (req, res) => {
  try {
    const { email, permissions = 'view' } = req.body;

    const asset = await MediaAsset.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Add to shared list (avoid duplicates)
    const alreadyShared = asset.sharedWith.find(s => s.email === email);

    if (!alreadyShared) {
      asset.sharedWith.push({
        email,
        sharedAt: new Date(),
        permissions
      });
      await asset.save();
    }

    res.json({
      success: true,
      message: `Media shared with ${email}`
    });
  } catch (error) {
    console.error('Error sharing media:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/media-library/agent/search
 * @desc    Search media for agent to reference
 * @access  Private
 */
router.get('/agent/search', protect, async (req, res) => {
  try {
    const { query } = req.query;

    const media = await MediaAsset.getAgentAccessibleMedia(
      req.user.userId,
      query
    );

    res.json({
      success: true,
      media,
      count: media.length
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
 * @route   POST /api/media-library/:id/agent-use
 * @desc    Record agent using this media
 * @access  Private
 */
router.post('/:id/agent-use', protect, async (req, res) => {
  try {
    const { agentId, agentName, conversationId } = req.body;

    const asset = await MediaAsset.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    await asset.recordAgentUsage(agentId, agentName, conversationId);

    res.json({
      success: true,
      message: 'Agent usage recorded'
    });
  } catch (error) {
    console.error('Error recording agent usage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/media-library/:id/post-use
 * @desc    Record media used in social post
 * @access  Private
 */
router.post('/:id/post-use', protect, async (req, res) => {
  try {
    const { platform, postId } = req.body;

    const asset = await MediaAsset.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    await asset.recordPostUsage(platform, postId);

    res.json({
      success: true,
      message: 'Post usage recorded'
    });
  } catch (error) {
    console.error('Error recording post usage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/media-library/stats/overview
 * @desc    Get media library statistics
 * @access  Private
 */
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const totalAssets = await MediaAsset.countDocuments({
      userId: req.user.userId,
      isArchived: false
    });

    const totalImages = await MediaAsset.countDocuments({
      userId: req.user.userId,
      type: 'image',
      isArchived: false
    });

    const totalVideos = await MediaAsset.countDocuments({
      userId: req.user.userId,
      type: 'video',
      isArchived: false
    });

    const recentAssets = await MediaAsset.find({
      userId: req.user.userId,
      isArchived: false
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name url type createdAt');

    const topUsed = await MediaAsset.find({
      userId: req.user.userId,
      isArchived: false
    })
      .sort({ agentReferences: -1, views: -1 })
      .limit(5)
      .select('name url type views agentReferences');

    res.json({
      success: true,
      stats: {
        totalAssets,
        totalImages,
        totalVideos,
        recentAssets,
        topUsed
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
