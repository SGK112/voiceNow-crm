import N8nWorkflow from '../models/N8nWorkflow.js';
import N8nService from '../services/n8nService.js';

// Don't instantiate at module level - do it inside functions so env vars are loaded
const getN8nService = () => new N8nService();

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
    const { name, type, description, workflowJson, triggerConditions } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Workflow type is required' });
    }

    let finalWorkflowJson = workflowJson;
    let finalName = name;

    if (!workflowJson && type) {
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

    const workflow = await N8nWorkflow.create({
      userId: req.user._id,
      name: finalName || `Workflow ${Date.now()}`,
      type,
      description,
      workflowJson: finalWorkflowJson,
      triggerConditions: triggerConditions || {}
    });

    // Note: We don't create individual workflows in n8n cloud for each user.
    // Instead, we store the workflow configuration in our DB and use master n8n workflows
    // that are triggered by our backend with user-specific data.
    // This allows proper multi-tenant isolation and credential management.

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

    const { name, description, workflowJson, triggerConditions, enabled } = req.body;

    if (name) workflow.name = name;
    if (description) workflow.description = description;
    if (workflowJson) workflow.workflowJson = workflowJson;
    if (triggerConditions) workflow.triggerConditions = triggerConditions;
    if (enabled !== undefined) workflow.enabled = enabled;

    await workflow.save();
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

    await workflow.deleteOne();
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPrebuiltTemplates = async (req, res) => {
  try {
    const templates = getN8nService().getPrebuiltWorkflowTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
