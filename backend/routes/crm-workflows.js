import express from 'express';
import CRMWorkflow from '../models/CRMWorkflow.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all CRM workflows for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const workflows = await CRMWorkflow.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    console.error('Error fetching CRM workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message
    });
  }
});

// Get single CRM workflow by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const workflow = await CRMWorkflow.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    console.error('Error fetching CRM workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow',
      error: error.message
    });
  }
});

// Create new CRM workflow
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, nodes, edges, category, tags } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Workflow name is required'
      });
    }

    const workflow = await CRMWorkflow.create({
      userId: req.user.userId,
      name,
      description: description || '',
      nodes: nodes || [],
      edges: edges || [],
      category: category || 'custom',
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      workflow
    });
  } catch (error) {
    console.error('Error creating CRM workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workflow',
      error: error.message
    });
  }
});

// Update existing CRM workflow
router.patch('/:id', protect, async (req, res) => {
  try {
    const { name, description, nodes, edges, enabled, category, tags } = req.body;

    const workflow = await CRMWorkflow.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    // Update fields
    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (nodes !== undefined) workflow.nodes = nodes;
    if (edges !== undefined) workflow.edges = edges;
    if (enabled !== undefined) workflow.enabled = enabled;
    if (category !== undefined) workflow.category = category;
    if (tags !== undefined) workflow.tags = tags;

    // Increment version on structure changes
    if (nodes !== undefined || edges !== undefined) {
      workflow.version += 1;
    }

    await workflow.save();

    res.json({
      success: true,
      message: 'Workflow updated successfully',
      workflow
    });
  } catch (error) {
    console.error('Error updating CRM workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow',
      error: error.message
    });
  }
});

// Delete CRM workflow
router.delete('/:id', protect, async (req, res) => {
  try {
    const workflow = await CRMWorkflow.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting CRM workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete workflow',
      error: error.message
    });
  }
});

// Activate/deactivate workflow
router.post('/:id/toggle', protect, async (req, res) => {
  try {
    const workflow = await CRMWorkflow.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    workflow.enabled = !workflow.enabled;
    await workflow.save();

    res.json({
      success: true,
      message: `Workflow ${workflow.enabled ? 'activated' : 'deactivated'} successfully`,
      workflow
    });
  } catch (error) {
    console.error('Error toggling CRM workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle workflow',
      error: error.message
    });
  }
});

// Duplicate workflow
router.post('/:id/duplicate', protect, async (req, res) => {
  try {
    const sourceWorkflow = await CRMWorkflow.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!sourceWorkflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    const duplicatedWorkflow = await CRMWorkflow.create({
      userId: req.user.userId,
      name: `${sourceWorkflow.name} (Copy)`,
      description: sourceWorkflow.description,
      nodes: sourceWorkflow.nodes,
      edges: sourceWorkflow.edges,
      category: sourceWorkflow.category,
      tags: sourceWorkflow.tags,
      enabled: false // Start disabled
    });

    res.status(201).json({
      success: true,
      message: 'Workflow duplicated successfully',
      workflow: duplicatedWorkflow
    });
  } catch (error) {
    console.error('Error duplicating CRM workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate workflow',
      error: error.message
    });
  }
});

export default router;
