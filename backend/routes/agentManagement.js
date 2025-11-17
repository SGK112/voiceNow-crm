import express from 'express';
import AgentManagementService from '../services/agentManagementService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/agent-management/create
 * @desc    Create a new ElevenLabs agent with basic configuration
 * @access  Private
 */
router.post('/create', protect, async (req, res) => {
  try {
    const { name, description, voice_id, prompt, first_message, language } = req.body;

    console.log('📝 Agent Creation Request:', {
      name,
      description: description?.substring(0, 50),
      voice_id,
      prompt: prompt?.substring(0, 100),
      first_message: first_message?.substring(0, 50),
      language
    });

    if (!name || !prompt) {
      console.log('❌ Validation failed:', { hasName: !!name, hasPrompt: !!prompt });
      return res.status(400).json({
        success: false,
        message: 'Name and prompt are required'
      });
    }

    const agentService = new AgentManagementService();

    const agent = await agentService.createAgent({
      name,
      description,
      voice_id,
      prompt,
      first_message,
      language,
      webhook_url_base: process.env.WEBHOOK_URL || process.env.API_URL
    });

    // Generate webhook URLs for this customer
    const webhookUrls = agentService.getWebhookUrls(req.user._id);

    res.json({
      success: true,
      agent,
      webhook_urls: webhookUrls,
      config_url: agentService.getWebhookConfigUrl(agent.agent_id),
      message: 'Agent created successfully. Use the config_url to set up webhooks via the dashboard.'
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/agent-management/:agentId/prompt
 * @desc    Update agent prompt
 * @access  Private
 */
router.patch('/:agentId/prompt', protect, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const agentService = new AgentManagementService();
    const agent = await agentService.updatePrompt(agentId, prompt);

    res.json({
      success: true,
      agent,
      message: 'Prompt updated successfully'
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prompt',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/agent-management/list
 * @desc    List all agents
 * @access  Private
 */
router.get('/list', protect, async (req, res) => {
  try {
    const agentService = new AgentManagementService();
    const agents = await agentService.listAgents();

    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list agents',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/agent-management/:agentId
 * @desc    Get agent configuration
 * @access  Private
 */
router.get('/:agentId', protect, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agentService = new AgentManagementService();
    const agent = await agentService.getAgent(agentId);

    // Generate webhook URLs for this customer
    const webhookUrls = agentService.getWebhookUrls(req.user._id);

    res.json({
      success: true,
      agent,
      webhook_urls: webhookUrls,
      config_url: agentService.getWebhookConfigUrl(agentId)
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/agent-management/:agentId
 * @desc    Delete an agent
 * @access  Private
 */
router.delete('/:agentId', protect, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agentService = new AgentManagementService();
    await agentService.deleteAgent(agentId);

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/agent-management/:agentId/webhook-urls
 * @desc    Get pre-configured webhook URLs for an agent
 * @access  Private
 */
router.get('/:agentId/webhook-urls', protect, async (req, res) => {
  try {
    const agentService = new AgentManagementService();
    const webhookUrls = agentService.getWebhookUrls(req.user._id);

    res.json({
      success: true,
      webhook_urls: webhookUrls,
      instructions: [
        '1. Copy the webhook URLs below',
        '2. Click "Configure Webhooks" to open the ElevenLabs dashboard',
        '3. Add each webhook as a Client Tool in the agent settings',
        '4. Test the webhooks by triggering them during a call'
      ]
    });
  } catch (error) {
    console.error('Error getting webhook URLs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook URLs',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/agent-management/:agentId/deploy
 * @desc    Deploy an agent (make it live)
 * @access  Private
 */
router.post('/:agentId/deploy', protect, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agentService = new AgentManagementService();
    const agent = await agentService.getAgent(agentId);

    // In a real deployment, you might:
    // - Assign a phone number
    // - Configure webhooks
    // - Set up monitoring
    // - Enable the agent in production

    res.json({
      success: true,
      agent,
      message: 'Agent deployed successfully',
      webhook_urls: agentService.getWebhookUrls(req.user._id)
    });
  } catch (error) {
    console.error('Error deploying agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deploy agent',
      error: error.message
    });
  }
});

export default router;
