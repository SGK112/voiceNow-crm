import N8nWorkflow from '../models/N8nWorkflow.js';
import N8nService from '../services/n8nService.js';
import mongoose from 'mongoose';

// Don't instantiate at module level - do it inside functions so env vars are loaded
const getN8nService = () => new N8nService();

// Visual Workflow Schema (for templates)
const visualWorkflowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  nodes: Array,
  edges: Array,
  status: String,
  isTemplate: Boolean,
  category: String,
  icon: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const VisualWorkflow = mongoose.models.VisualWorkflow || mongoose.model('VisualWorkflow', visualWorkflowSchema);

export const getWorkflows = async (req, res) => {
  try {
    const workflows = await N8nWorkflow.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflowById = async (req, res) => {
  try {
    const workflow = await N8nWorkflow.findOne({ _id: req.params.id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createWorkflow = async (req, res) => {
  try {
    const { name, type, description, workflowJson, n8nWorkflow, triggerConditions } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Workflow type is required' });
    }

    // Accept either workflowJson or n8nWorkflow (visual builder uses n8nWorkflow)
    let finalWorkflowJson = n8nWorkflow || workflowJson;
    let finalName = name;

    if (!finalWorkflowJson && type) {
      const templates = getN8nService().getPrebuiltWorkflowTemplates();
      const template = templates[type];
      if (template) {
        finalWorkflowJson = template.workflowJson;
        finalName = finalName || template.name;
      }
    }

    if (!finalWorkflowJson) {
      return res.status(400).json({ message: 'Workflow JSON is required' });
    }

    // Create workflow in database first
    const workflow = await N8nWorkflow.create({
      userId: req.user._id,
      name: finalName || `Workflow ${Date.now()}`,
      type,
      description,
      workflowJson: finalWorkflowJson,
      triggerConditions: triggerConditions || {}
    });

    // Try to push to n8n instance
    try {
      const n8nService = getN8nService();
      const n8nResult = await n8nService.createWorkflow({
        name: workflow.name,
        nodes: finalWorkflowJson.nodes || [],
        connections: finalWorkflowJson.connections || {},
        settings: {
          saveDataSuccessExecution: 'all',
          saveDataErrorExecution: 'all'
        },
        active: false
      });

      if (n8nResult && n8nResult.id) {
        // Save n8n workflow ID to database
        workflow.n8nWorkflowId = n8nResult.id;

        // Extract webhook URL if workflow has a webhook trigger node
        const webhookNode = finalWorkflowJson.nodes?.find(n =>
          n.type === 'n8n-nodes-base.webhook'
        );

        if (webhookNode && webhookNode.parameters?.path) {
          const n8nUrl = process.env.N8N_API_URL || 'http://5.183.8.119:5678';
          const baseUrl = n8nUrl.replace('/api/v1', '');
          const webhookPath = webhookNode.parameters.path;
          workflow.webhookPath = webhookPath;
          workflow.webhookUrl = `${baseUrl}/webhook${webhookPath.startsWith('/') ? '' : '/'}${webhookPath}`;
          console.log('📍 Webhook URL generated:', workflow.webhookUrl);
        }

        await workflow.save();
        console.log('✅ Workflow created in n8n:', n8nResult.id);
      }
    } catch (n8nError) {
      console.warn('⚠️ Could not create workflow in n8n (will work locally only):', n8nError.message);
      // Continue - workflow still works locally even if n8n sync fails
    }

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateWorkflow = async (req, res) => {
  try {
    const workflow = await N8nWorkflow.findOne({ _id: req.params.id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const { name, description, workflowJson, n8nWorkflow, triggerConditions, enabled } = req.body;

    if (name) workflow.name = name;
    if (description) workflow.description = description;
    // Accept either workflowJson or n8nWorkflow
    if (n8nWorkflow || workflowJson) workflow.workflowJson = n8nWorkflow || workflowJson;
    if (triggerConditions) workflow.triggerConditions = triggerConditions;
    if (enabled !== undefined) workflow.enabled = enabled;

    await workflow.save();

    // Try to update in n8n if workflow ID exists
    if (workflow.n8nWorkflowId && (n8nWorkflow || workflowJson)) {
      try {
        const n8nService = getN8nService();
        await n8nService.updateWorkflow(workflow.n8nWorkflowId, {
          name: workflow.name,
          nodes: workflow.workflowJson.nodes || [],
          connections: workflow.workflowJson.connections || {},
          settings: {
            saveDataSuccessExecution: 'all',
            saveDataErrorExecution: 'all'
          }
        });

        // Update webhook URL if webhook trigger node changed
        const webhookNode = workflow.workflowJson.nodes?.find(n =>
          n.type === 'n8n-nodes-base.webhook'
        );

        if (webhookNode && webhookNode.parameters?.path) {
          const n8nUrl = process.env.N8N_API_URL || 'http://5.183.8.119:5678';
          const baseUrl = n8nUrl.replace('/api/v1', '');
          const webhookPath = webhookNode.parameters.path;
          workflow.webhookPath = webhookPath;
          workflow.webhookUrl = `${baseUrl}/webhook${webhookPath.startsWith('/') ? '' : '/'}${webhookPath}`;
          console.log('📍 Webhook URL updated:', workflow.webhookUrl);
        }

        console.log('✅ Workflow updated in n8n:', workflow.n8nWorkflowId);
      } catch (n8nError) {
        console.warn('⚠️ Could not update workflow in n8n:', n8nError.message);
      }
    }

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const activateWorkflow = async (req, res) => {
  try {
    const workflow = await N8nWorkflow.findOne({ _id: req.params.id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    workflow.enabled = true;
    await workflow.save();

    // Activate in n8n cloud if workflow ID exists
    if (workflow.n8nWorkflowId) {
      try {
        await getN8nService().activateWorkflow(workflow.n8nWorkflowId);
        console.log('✅ Activated workflow in n8n:', workflow.n8nWorkflowId);
      } catch (n8nError) {
        console.warn('⚠️ Could not activate workflow in n8n:', n8nError.message);
      }
    }

    res.json({ message: 'Workflow activated', workflow });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deactivateWorkflow = async (req, res) => {
  try {
    const workflow = await N8nWorkflow.findOne({ _id: req.params.id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    workflow.enabled = false;
    await workflow.save();

    res.json({ message: 'Workflow deactivated', workflow });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await N8nWorkflow.findOne({ _id: req.params.id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Try to delete from n8n first
    if (workflow.n8nWorkflowId) {
      try {
        const n8nService = getN8nService();
        await n8nService.deleteWorkflow(workflow.n8nWorkflowId);
        console.log('✅ Workflow deleted from n8n:', workflow.n8nWorkflowId);
      } catch (n8nError) {
        console.warn('⚠️ Could not delete workflow from n8n:', n8nError.message);
      }
    }

    await workflow.deleteOne();
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflowWebhookUrl = async (req, res) => {
  try {
    const { workflowId } = req.params;

    const workflow = await N8nWorkflow.findOne({
      _id: workflowId,
      userId: req.user._id
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (!workflow.webhookUrl) {
      return res.status(404).json({
        message: 'No webhook URL found for this workflow. Make sure the workflow has a Webhook Trigger node configured.'
      });
    }

    res.json({
      workflowId: workflow._id,
      webhookUrl: workflow.webhookUrl,
      webhookPath: workflow.webhookPath,
      enabled: workflow.enabled,
      workflowName: workflow.name
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPrebuiltTemplates = async (req, res) => {
  try {
    // Get both n8n templates and visual workflow templates
    const n8nTemplates = getN8nService().getPrebuiltWorkflowTemplates();

    // Get visual workflow templates from MongoDB
    const visualTemplates = await VisualWorkflow.find({ isTemplate: true }).lean();

    // Format visual templates to match expected structure
    const formattedVisualTemplates = visualTemplates.reduce((acc, template) => {
      acc[template._id] = {
        id: template._id,
        name: template.name,
        description: template.description,
        category: template.category || 'lead_generation',
        icon: template.icon || '🎯',
        tags: template.tags || [],
        nodes: template.nodes,
        edges: template.edges,
        workflowJson: {
          nodes: template.nodes,
          edges: template.edges
        },
        type: 'visual'
      };
      return acc;
    }, {});

    // Combine both types of templates
    const allTemplates = {
      ...n8nTemplates,
      ...formattedVisualTemplates
    };

    res.json(allTemplates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
