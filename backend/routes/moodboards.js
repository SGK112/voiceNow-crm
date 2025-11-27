import express from 'express';
import Moodboard from '../models/Moodboard.js';
import User from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import materialSourcingService from '../services/materialSourcingService.js';

const router = express.Router();

// Get all moodboards for user (owned + shared)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status = 'active', category, style, projectId, leadId, contactId, search } = req.query;

    const query = {
      status,
      $or: [
        { userId: req.user.id },
        { 'collaborators.userId': req.user.id }
      ]
    };

    if (category) query.category = category;
    if (style) query.style = style;
    if (projectId) query.projectId = projectId;
    if (leadId) query.leadId = leadId;
    if (contactId) query.contactId = contactId;
    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    const moodboards = await Moodboard.find(query)
      .select('name description coverImage category style tags items.length budget approval.status sharing.isPublic collaborators createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .populate('projectId', 'name')
      .populate('leadId', 'name')
      .populate('contactId', 'name');

    // Add item count to response
    const moodboardsWithCount = moodboards.map(mb => ({
      ...mb.toObject(),
      itemCount: mb.items?.length || 0,
      isOwner: mb.userId.toString() === req.user.id,
      role: mb.userId.toString() === req.user.id ? 'owner' :
        mb.collaborators.find(c => c.userId?.toString() === req.user.id)?.role || 'viewer'
    }));

    res.json(moodboardsWithCount);
  } catch (error) {
    console.error('Error fetching moodboards:', error);
    res.status(500).json({ error: 'Failed to fetch moodboards' });
  }
});

// Get single moodboard
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id)
      .populate('userId', 'name email avatar')
      .populate('collaborators.userId', 'name email avatar')
      .populate('projectId', 'name status')
      .populate('leadId', 'name email phone')
      .populate('contactId', 'name email phone');

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    // Check access
    if (!moodboard.hasAccess(req.user.id, 'viewer')) {
      return res.status(403).json({ error: 'You do not have access to this moodboard' });
    }

    // Update last viewed for collaborator
    const collaborator = moodboard.collaborators.find(c =>
      c.userId?.toString() === req.user.id
    );
    if (collaborator) {
      collaborator.lastViewedAt = new Date();
      await moodboard.save();
    }

    res.json({
      ...moodboard.toObject(),
      isOwner: moodboard.userId._id.toString() === req.user.id,
      role: moodboard.userId._id.toString() === req.user.id ? 'owner' :
        collaborator?.role || 'viewer'
    });
  } catch (error) {
    console.error('Error fetching moodboard:', error);
    res.status(500).json({ error: 'Failed to fetch moodboard' });
  }
});

// Get public moodboard by URL
router.get('/public/:publicUrl', optionalAuth, async (req, res) => {
  try {
    const moodboard = await Moodboard.findOne({
      'sharing.publicUrl': req.params.publicUrl,
      'sharing.isPublic': true,
      status: 'active'
    })
      .populate('userId', 'name')
      .select('-collaborators -activity -versions');

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found or not public' });
    }

    // Check expiry
    if (moodboard.sharing.expiresAt && new Date() > moodboard.sharing.expiresAt) {
      return res.status(410).json({ error: 'This shared link has expired' });
    }

    // Increment view count
    moodboard.sharing.viewCount += 1;
    await moodboard.save();

    res.json({
      ...moodboard.toObject(),
      isPublicView: true,
      canComment: moodboard.sharing.allowComments,
      canDownload: moodboard.sharing.allowDownload
    });
  } catch (error) {
    console.error('Error fetching public moodboard:', error);
    res.status(500).json({ error: 'Failed to fetch moodboard' });
  }
});

// Create moodboard
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name, description, category, style, tags,
      projectId, leadId, contactId, items, layout, aiGenerated, aiPrompt
    } = req.body;

    const moodboard = new Moodboard({
      userId: req.user.id,
      name,
      description,
      category,
      style,
      tags: tags || [],
      projectId,
      leadId,
      contactId,
      items: items || [],
      layout: layout || {},
      aiGenerated: aiGenerated || false,
      aiPrompt,
      lastEditedBy: req.user.id,
      lastEditedAt: new Date()
    });

    // Log creation
    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'created', 'Created moodboard');

    await moodboard.save();

    res.status(201).json(moodboard);
  } catch (error) {
    console.error('Error creating moodboard:', error);
    res.status(500).json({ error: 'Failed to create moodboard' });
  }
});

// Update moodboard
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    // Check edit access
    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to edit this moodboard' });
    }

    const {
      name, description, category, style, tags,
      items, layout, budget, approval
    } = req.body;

    // Update fields
    if (name) moodboard.name = name;
    if (description !== undefined) moodboard.description = description;
    if (category) moodboard.category = category;
    if (style) moodboard.style = style;
    if (tags) moodboard.tags = tags;
    if (items) moodboard.items = items;
    if (layout) moodboard.layout = { ...moodboard.layout, ...layout };
    if (budget) moodboard.budget = { ...moodboard.budget, ...budget };
    if (approval) moodboard.approval = { ...moodboard.approval, ...approval };

    moodboard.lastEditedBy = req.user.id;
    moodboard.lastEditedAt = new Date();

    // Log update
    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'updated', 'Updated moodboard');

    await moodboard.save();

    res.json(moodboard);
  } catch (error) {
    console.error('Error updating moodboard:', error);
    res.status(500).json({ error: 'Failed to update moodboard' });
  }
});

// Add item to moodboard
router.post('/:id/items', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to edit this moodboard' });
    }

    const item = {
      ...req.body,
      addedBy: req.user.id,
      addedAt: new Date()
    };

    moodboard.items.push(item);
    moodboard.lastEditedBy = req.user.id;
    moodboard.lastEditedAt = new Date();

    // Log activity
    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'added_item', 'Added material', item.name);

    await moodboard.save();

    res.json(moodboard);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Remove item from moodboard
router.delete('/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to edit this moodboard' });
    }

    const item = moodboard.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const itemName = item.name;
    moodboard.items.pull(req.params.itemId);
    moodboard.lastEditedBy = req.user.id;
    moodboard.lastEditedAt = new Date();

    // Log activity
    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'removed_item', 'Removed material', itemName);

    await moodboard.save();

    res.json(moodboard);
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Share moodboard (add collaborator)
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    // Only owner can share
    if (moodboard.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can share this moodboard' });
    }

    const { email, userId, role = 'viewer', name } = req.body;

    // Check if already a collaborator
    const existingIndex = moodboard.collaborators.findIndex(c =>
      (userId && c.userId?.toString() === userId) ||
      (email && c.email === email)
    );

    if (existingIndex >= 0) {
      // Update role
      moodboard.collaborators[existingIndex].role = role;
    } else {
      // Add new collaborator
      moodboard.collaborators.push({
        userId,
        email,
        name,
        role,
        invitedBy: req.user.id,
        invitedAt: new Date()
      });
    }

    // Log activity
    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'shared', `Shared with ${name || email} as ${role}`);

    await moodboard.save();

    // TODO: Send email invitation if email provided

    res.json({
      success: true,
      collaborators: moodboard.collaborators
    });
  } catch (error) {
    console.error('Error sharing moodboard:', error);
    res.status(500).json({ error: 'Failed to share moodboard' });
  }
});

// Remove collaborator
router.delete('/:id/share/:collaboratorId', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    // Only owner can remove collaborators
    if (moodboard.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can manage collaborators' });
    }

    moodboard.collaborators.pull(req.params.collaboratorId);
    await moodboard.save();

    res.json({ success: true, collaborators: moodboard.collaborators });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Toggle public sharing
router.post('/:id/public', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (moodboard.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can change sharing settings' });
    }

    const { isPublic, allowComments, allowDownload, expiresInDays, password } = req.body;

    moodboard.sharing.isPublic = isPublic;

    if (isPublic && !moodboard.sharing.publicUrl) {
      moodboard.generatePublicUrl();
    }

    if (allowComments !== undefined) moodboard.sharing.allowComments = allowComments;
    if (allowDownload !== undefined) moodboard.sharing.allowDownload = allowDownload;
    if (password) moodboard.sharing.publicPassword = password;
    if (expiresInDays) {
      moodboard.sharing.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    await moodboard.save();

    res.json({
      success: true,
      sharing: moodboard.sharing
    });
  } catch (error) {
    console.error('Error updating public sharing:', error);
    res.status(500).json({ error: 'Failed to update sharing settings' });
  }
});

// Add comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'commenter')) {
      return res.status(403).json({ error: 'You do not have permission to comment' });
    }

    const user = await User.findById(req.user.id);
    const comment = {
      userId: req.user.id,
      userName: user?.name || 'User',
      userAvatar: user?.avatar,
      content: req.body.content,
      materialItemId: req.body.materialItemId,
      position: req.body.position,
      mentions: req.body.mentions || []
    };

    moodboard.comments.push(comment);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'commented', 'Added a comment');

    await moodboard.save();

    res.json(moodboard.comments[moodboard.comments.length - 1]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Resolve comment
router.post('/:id/comments/:commentId/resolve', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to resolve comments' });
    }

    const comment = moodboard.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.resolved = true;
    comment.resolvedBy = req.user.id;
    comment.resolvedAt = new Date();

    await moodboard.save();

    res.json(comment);
  } catch (error) {
    console.error('Error resolving comment:', error);
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
});

// Create version snapshot
router.post('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to create versions' });
    }

    const newVersion = {
      versionNumber: moodboard.currentVersion + 1,
      name: req.body.name || `Version ${moodboard.currentVersion + 1}`,
      snapshot: {
        items: moodboard.items.toObject(),
        layout: moodboard.layout,
        budget: moodboard.budget
      },
      createdBy: req.user.id,
      notes: req.body.notes
    };

    moodboard.versions.push(newVersion);
    moodboard.currentVersion += 1;

    await moodboard.save();

    res.json(newVersion);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// Restore version
router.post('/:id/versions/:versionNumber/restore', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to restore versions' });
    }

    const version = moodboard.versions.find(v =>
      v.versionNumber === parseInt(req.params.versionNumber)
    );

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Restore from snapshot
    moodboard.items = version.snapshot.items;
    moodboard.layout = version.snapshot.layout;
    moodboard.budget = version.snapshot.budget;
    moodboard.lastEditedBy = req.user.id;
    moodboard.lastEditedAt = new Date();

    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'updated', `Restored to version ${version.versionNumber}`);

    await moodboard.save();

    res.json(moodboard);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// Submit for approval
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!moodboard.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'You do not have permission to submit this moodboard' });
    }

    moodboard.approval.status = 'pending_review';
    moodboard.approval.submittedAt = new Date();
    moodboard.approval.submittedBy = req.user.id;

    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', 'updated', 'Submitted for approval');

    await moodboard.save();

    res.json({ success: true, approval: moodboard.approval });
  } catch (error) {
    console.error('Error submitting moodboard:', error);
    res.status(500).json({ error: 'Failed to submit moodboard' });
  }
});

// Approve/Reject moodboard
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    // Only owner can review
    if (moodboard.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can review' });
    }

    const { approved, notes } = req.body;

    moodboard.approval.status = approved ? 'approved' : 'changes_requested';
    moodboard.approval.reviewedAt = new Date();
    moodboard.approval.reviewedBy = req.user.id;
    moodboard.approval.reviewerNotes = notes;

    const user = await User.findById(req.user.id);
    moodboard.logActivity(req.user.id, user?.name || 'User', approved ? 'approved' : 'rejected',
      approved ? 'Approved moodboard' : 'Requested changes');

    await moodboard.save();

    res.json({ success: true, approval: moodboard.approval });
  } catch (error) {
    console.error('Error reviewing moodboard:', error);
    res.status(500).json({ error: 'Failed to review moodboard' });
  }
});

// Client approval with signature
router.post('/:id/client-approve', optionalAuth, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    const { approved, signature, notes } = req.body;

    moodboard.approval.clientApproval = {
      approved,
      approvedAt: new Date(),
      signature,
      notes
    };

    if (approved) {
      moodboard.approval.status = 'approved';
    }

    moodboard.logActivity(null, 'Client', approved ? 'approved' : 'rejected',
      approved ? 'Client approved moodboard' : 'Client requested changes');

    await moodboard.save();

    res.json({ success: true, approval: moodboard.approval });
  } catch (error) {
    console.error('Error with client approval:', error);
    res.status(500).json({ error: 'Failed to process client approval' });
  }
});

// Duplicate moodboard
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const original = await Moodboard.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (!original.hasAccess(req.user.id, 'viewer')) {
      return res.status(403).json({ error: 'You do not have access to this moodboard' });
    }

    const duplicate = new Moodboard({
      userId: req.user.id,
      name: req.body.name || `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      style: original.style,
      tags: original.tags,
      items: original.items.map(item => ({
        ...item.toObject(),
        _id: undefined,
        addedBy: req.user.id,
        addedAt: new Date()
      })),
      layout: original.layout,
      lastEditedBy: req.user.id,
      lastEditedAt: new Date()
    });

    const user = await User.findById(req.user.id);
    duplicate.logActivity(req.user.id, user?.name || 'User', 'duplicated', `Duplicated from "${original.name}"`);

    await duplicate.save();

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating moodboard:', error);
    res.status(500).json({ error: 'Failed to duplicate moodboard' });
  }
});

// Search materials (uses materialSourcingService)
router.get('/search/materials', authenticateToken, async (req, res) => {
  try {
    const { query, category, style, color, priceRange, suppliers } = req.query;

    const results = await materialSourcingService.searchMaterials(query, {
      category: category || 'auto',
      style,
      color,
      priceRange: priceRange || 'any',
      suppliersToSearch: suppliers || 'local_first',
      includeImages: true
    });

    res.json(results);
  } catch (error) {
    console.error('Error searching materials:', error);
    res.status(500).json({ error: 'Failed to search materials' });
  }
});

// Delete moodboard (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    // Only owner can delete
    if (moodboard.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this moodboard' });
    }

    moodboard.status = 'deleted';
    await moodboard.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting moodboard:', error);
    res.status(500).json({ error: 'Failed to delete moodboard' });
  }
});

// Archive moodboard
router.post('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id);

    if (!moodboard) {
      return res.status(404).json({ error: 'Moodboard not found' });
    }

    if (moodboard.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can archive this moodboard' });
    }

    moodboard.status = moodboard.status === 'archived' ? 'active' : 'archived';
    await moodboard.save();

    res.json({ success: true, status: moodboard.status });
  } catch (error) {
    console.error('Error archiving moodboard:', error);
    res.status(500).json({ error: 'Failed to archive moodboard' });
  }
});

export default router;
