import express from 'express';
import CopilotRevision from '../models/CopilotRevision.js';
import { protect, optionalAuth, serviceAuth } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get pending copilot commands (for Claude Code to poll)
// @route   GET /api/copilot-revisions/pending
// @access  Private
router.get('/pending', protect, async (req, res) => {
  try {
    const pending = await CopilotRevision.find({
      status: 'pending'
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .populate('userId', 'name email');

    res.json({
      success: true,
      count: pending.length,
      revisions: pending
    });
  } catch (error) {
    console.error('Error fetching pending revisions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending revisions',
      error: error.message
    });
  }
});

// @desc    Create a new copilot revision (from mobile app voice command)
// @route   POST /api/copilot-revisions
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { command, transcription } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'Command is required'
      });
    }

    const revision = await CopilotRevision.createPending(
      req.user._id,
      command,
      transcription
    );

    console.log(`🎤 [COPILOT] New revision #${revision.revisionNumber} from ${req.user.name}: "${command}"`);

    res.status(201).json({
      success: true,
      message: 'Copilot command queued',
      revision: {
        id: revision._id,
        revisionNumber: revision.revisionNumber,
        command: revision.command,
        status: revision.status
      }
    });
  } catch (error) {
    console.error('Error creating revision:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create revision',
      error: error.message
    });
  }
});

// @desc    Get user's revision history
// @route   GET /api/copilot-revisions/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const [revisions, total] = await Promise.all([
      CopilotRevision.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-changes.oldContent -changes.newContent'), // Exclude large content
      CopilotRevision.countDocuments({ userId: req.user._id })
    ]);

    res.json({
      success: true,
      revisions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revision history',
      error: error.message
    });
  }
});

// @desc    Get a specific revision with full details
// @route   GET /api/copilot-revisions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const revision = await CopilotRevision.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!revision) {
      return res.status(404).json({
        success: false,
        message: 'Revision not found'
      });
    }

    res.json({
      success: true,
      revision
    });
  } catch (error) {
    console.error('Error fetching revision:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revision',
      error: error.message
    });
  }
});

// @desc    Mark revision as processing (Claude Code starting work)
// @route   POST /api/copilot-revisions/:id/processing
// @access  Private (or Service)
router.post('/:id/processing', serviceAuth, async (req, res) => {
  try {
    const revision = await CopilotRevision.findById(req.params.id);

    if (!revision) {
      return res.status(404).json({
        success: false,
        message: 'Revision not found'
      });
    }

    if (revision.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Revision is already ${revision.status}`
      });
    }

    await revision.markProcessing();

    console.log(`⚙️ [COPILOT] Processing revision #${revision.revisionNumber}: "${revision.command}"`);

    res.json({
      success: true,
      message: 'Revision marked as processing',
      revision: {
        id: revision._id,
        status: revision.status
      }
    });
  } catch (error) {
    console.error('Error marking processing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark revision as processing',
      error: error.message
    });
  }
});

// @desc    Mark revision as applied (Claude Code finished)
// @route   POST /api/copilot-revisions/:id/applied
// @access  Private (or Service)
router.post('/:id/applied', serviceAuth, async (req, res) => {
  try {
    const { changes, summary } = req.body;
    const revision = await CopilotRevision.findById(req.params.id);

    if (!revision) {
      return res.status(404).json({
        success: false,
        message: 'Revision not found'
      });
    }

    await revision.markApplied(changes || [], summary);

    console.log(`✅ [COPILOT] Applied revision #${revision.revisionNumber}: ${summary || revision.command}`);

    res.json({
      success: true,
      message: 'Revision applied successfully',
      revision: {
        id: revision._id,
        revisionNumber: revision.revisionNumber,
        status: revision.status,
        summary: revision.summary,
        processingDurationMs: revision.processingDurationMs
      }
    });
  } catch (error) {
    console.error('Error marking applied:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark revision as applied',
      error: error.message
    });
  }
});

// @desc    Mark revision as failed
// @route   POST /api/copilot-revisions/:id/failed
// @access  Private (or Service)
router.post('/:id/failed', serviceAuth, async (req, res) => {
  try {
    const { error: errorMessage } = req.body;
    const revision = await CopilotRevision.findById(req.params.id);

    if (!revision) {
      return res.status(404).json({
        success: false,
        message: 'Revision not found'
      });
    }

    await revision.markFailed(errorMessage);

    console.log(`❌ [COPILOT] Failed revision #${revision.revisionNumber}: ${errorMessage}`);

    res.json({
      success: true,
      message: 'Revision marked as failed',
      revision: {
        id: revision._id,
        status: revision.status,
        error: revision.error
      }
    });
  } catch (error) {
    console.error('Error marking failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark revision as failed',
      error: error.message
    });
  }
});

// @desc    Rollback to a specific revision
// @route   POST /api/copilot-revisions/:id/rollback
// @access  Private
router.post('/:id/rollback', protect, async (req, res) => {
  try {
    const targetRevision = await CopilotRevision.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'applied'
    });

    if (!targetRevision) {
      return res.status(404).json({
        success: false,
        message: 'Revision not found or cannot be rolled back to'
      });
    }

    // Create a new rollback revision
    const rollbackRevision = await CopilotRevision.createPending(
      req.user._id,
      `Rollback to revision #${targetRevision.revisionNumber}`,
      null
    );

    rollbackRevision.isRollback = true;
    rollbackRevision.rollbackTarget = targetRevision._id;
    rollbackRevision.parentRevision = targetRevision._id;
    await rollbackRevision.save();

    console.log(`⏪ [COPILOT] Rollback requested to revision #${targetRevision.revisionNumber}`);

    res.json({
      success: true,
      message: 'Rollback revision created',
      revision: {
        id: rollbackRevision._id,
        revisionNumber: rollbackRevision.revisionNumber,
        rollbackTarget: targetRevision.revisionNumber
      }
    });
  } catch (error) {
    console.error('Error creating rollback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create rollback',
      error: error.message
    });
  }
});

// @desc    Get revision stats for user
// @route   GET /api/copilot-revisions/stats
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await CopilotRevision.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRevisions = await CopilotRevision.countDocuments({ userId: req.user._id });
    const latestRevision = await CopilotRevision.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('revisionNumber command status createdAt');

    res.json({
      success: true,
      stats: {
        total: totalRevisions,
        byStatus: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        latestRevision
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

export default router;
