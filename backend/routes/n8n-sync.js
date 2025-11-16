import express from 'express';
import { protect } from '../middleware/auth.js';
import N8nService from '../services/n8nService.js';
import N8nCredentialService from '../services/n8nCredentialService.js';
import CRMWorkflow from '../models/CRMWorkflow.js';
import { generateOAuthState, verifyOAuthState } from '../middleware/security.js';

const router = express.Router();
const n8nService = new N8nService();
const n8nCredentialService = new N8nCredentialService();

/**
 * @route   GET /api/n8n-sync/workflows
 * @desc    Get all n8n workflows for the user
 * @access  Private
 */
router.get('/workflows', protect, async (req, res) => {
  try {
    const workflows = await n8nService.getWorkflows();

    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    console.error('Error fetching n8n workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/n8n-sync/workflows/create
 * @desc    Create workflow in n8n and sync to CRM
 * @access  Private
 */
router.post('/workflows/create', protect, async (req, res) => {
  try {
    const { name, description, nodes, category } = req.body;

    // Create workflow in n8n
    const n8nWorkflow = await n8nService.createWorkflow({
      name,
      nodes,
      connections: req.body.connections || {},
      active: false
    });

    // Sync to CRM database
    const crmWorkflow = await CRMWorkflow.create({
      userId: req.user.userId,
      name,
      description: description || '',
      nodes: nodes || [],
      edges: req.body.edges || [],
      category: category || 'custom',
      enabled: false,
      metadata: {
        n8nWorkflowId: n8nWorkflow.id,
        n8nCreatedAt: n8nWorkflow.createdAt
      }
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created and synced successfully',
      workflow: crmWorkflow,
      n8nWorkflow
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workflow',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/n8n-sync/workflows/:id/activate
 * @desc    Activate workflow in n8n
 * @access  Private
 */
router.post('/workflows/:id/activate', protect, async (req, res) => {
  try {
    const workflow = await CRMWorkflow.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!workflow || !workflow.metadata?.n8nWorkflowId) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or not synced with n8n'
      });
    }

    // Activate in n8n
    await n8nService.activateWorkflow(workflow.metadata.n8nWorkflowId);

    // Update CRM status
    workflow.enabled = true;
    await workflow.save();

    res.json({
      success: true,
      message: 'Workflow activated successfully',
      workflow
    });
  } catch (error) {
    console.error('Error activating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate workflow',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/n8n-sync/credentials
 * @desc    Get all configured n8n credentials
 * @access  Private
 */
router.get('/credentials', protect, async (req, res) => {
  try {
    const credentials = await n8nCredentialService.getUserCredentials();

    // Mask sensitive data
    const maskedCredentials = credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }));

    res.json({
      success: true,
      credentials: maskedCredentials
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credentials',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/n8n-sync/credentials/popular
 * @desc    Get popular credential types for quick setup
 * @access  Private
 */
router.get('/credentials/popular', protect, async (req, res) => {
  try {
    const popular = n8nCredentialService.getPopularCredentials();

    res.json({
      success: true,
      credentials: popular
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular credentials',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/n8n-sync/credentials/oauth/initiate
 * @desc    Initiate OAuth flow for external service
 * @access  Private
 */
router.post('/credentials/oauth/initiate', protect, async (req, res) => {
  try {
    const { credentialType, provider } = req.body;

    if (!credentialType) {
      return res.status(400).json({
        success: false,
        message: 'Credential type is required'
      });
    }

    // Generate CSRF-protected state
    const state = await generateOAuthState(req.user.userId, credentialType);

    // Get OAuth URL with state parameter
    const callbackUrl = `${process.env.CLIENT_URL}/app/workflows/oauth/callback`;
    const oauthUrl = n8nCredentialService.getOAuthUrl(credentialType, callbackUrl);

    // Append state to OAuth URL
    const secureOAuthUrl = `${oauthUrl}&state=${state}`;

    res.json({
      success: true,
      oauthUrl: secureOAuthUrl,
      provider: provider || credentialType,
      state
    });
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate OAuth flow',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/n8n-sync/credentials/oauth/callback
 * @desc    Handle OAuth callback from external service
 * @access  Private
 */
router.post('/credentials/oauth/callback', protect, async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code and state are required'
      });
    }

    // Verify state to prevent CSRF
    const stateData = await verifyOAuthState(state, req.user.userId);

    // Exchange code for tokens (handled by n8n)
    // In n8n, the OAuth callback is handled by n8n itself
    // We just need to verify the credential was created

    // Wait a moment for n8n to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if credential was created
    const credential = await n8nCredentialService.getCredentialByType(stateData.credentialType);

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'OAuth flow completed but credential not found'
      });
    }

    res.json({
      success: true,
      message: 'OAuth credential connected successfully',
      credential: {
        id: credential.id,
        name: credential.name,
        type: credential.type
      }
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete OAuth flow',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/n8n-sync/credentials/:id
 * @desc    Delete a credential
 * @access  Private
 */
router.delete('/credentials/:id', protect, async (req, res) => {
  try {
    const success = await n8nCredentialService.deleteCredential(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Credential not found or could not be deleted'
      });
    }

    res.json({
      success: true,
      message: 'Credential deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete credential',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/n8n-sync/workflows/check-credentials
 * @desc    Check which credentials are needed for a workflow
 * @access  Private
 */
router.post('/workflows/check-credentials', protect, async (req, res) => {
  try {
    const { nodes } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        message: 'Workflow nodes array is required'
      });
    }

    const credentialStatus = await n8nCredentialService.checkWorkflowCredentials(nodes);

    const missingCredentials = credentialStatus.filter(cred => !cred.isConfigured);
    const configuredCredentials = credentialStatus.filter(cred => cred.isConfigured);

    res.json({
      success: true,
      allConfigured: missingCredentials.length === 0,
      missing: missingCredentials,
      configured: configuredCredentials,
      totalRequired: credentialStatus.length
    });
  } catch (error) {
    console.error('Error checking credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check credentials',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/n8n-sync/templates
 * @desc    Get pre-built workflow templates
 * @access  Private
 */
router.get('/templates', protect, async (req, res) => {
  try {
    const templates = n8nService.getPrebuiltWorkflowTemplates();
    const { category } = req.query;

    let filteredTemplates = Object.values(templates);

    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    res.json({
      success: true,
      templates: filteredTemplates,
      categories: ['general', 'construction'],
      total: filteredTemplates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/n8n-sync/templates/:templateType/create
 * @desc    Create workflow from template
 * @access  Private
 */
router.post('/templates/:templateType/create', protect, async (req, res) => {
  try {
    const { templateType } = req.params;
    const { customName } = req.body;

    const templates = n8nService.getPrebuiltWorkflowTemplates();
    const template = templates[templateType];

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Create workflow from template
    const workflowName = customName || template.name;

    const n8nWorkflow = await n8nService.createWorkflow({
      name: workflowName,
      ...template.workflowJson
    });

    // Sync to CRM
    const crmWorkflow = await CRMWorkflow.create({
      userId: req.user.userId,
      name: workflowName,
      description: template.description,
      category: template.category,
      isTemplate: true,
      templateId: templateType,
      metadata: {
        n8nWorkflowId: n8nWorkflow.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created from template successfully',
      workflow: crmWorkflow
    });
  } catch (error) {
    console.error('Error creating workflow from template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workflow from template',
      error: error.message
    });
  }
});

export default router;
