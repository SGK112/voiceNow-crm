import UserAgent from '../models/UserAgent.js';
import Integration from '../models/Integration.js';
import agentTemplates from '../config/agentTemplates.js';
import specialtyAgentTemplates from '../config/specialtyAgentTemplates.js';
import voiceflowDemoAgent from '../config/demoAgentTemplate.js';

// Merge all agent templates
const allAgentTemplates = {
  ...agentTemplates,
  ...specialtyAgentTemplates,
  'voiceflow-demo': voiceflowDemoAgent
};

/**
 * Agent Library Controller
 *
 * Handles all operations for the agent library:
 * - Browsing templates
 * - Creating agents from templates
 * - Managing user agents
 */

// Get all available agent templates
export const getTemplates = async (req, res) => {
  try {
    const {category} = req.query;

    let templates = Object.values(allAgentTemplates);

    // Filter by category if specified
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Return template info without the full prompt generator function
    const templateList = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      color: t.color,
      pricing: t.pricing,
      features: t.features,
      targetUser: t.targetUser,
      requiredIntegrations: t.requiredIntegrations,
      optionalIntegrations: t.optionalIntegrations
    }));

    res.json(templateList);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Failed to fetch agent templates' });
  }
};

// Get single template details
export const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = allAgentTemplates[templateId];
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Return full template details including setup questions
    res.json({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      color: template.color,
      pricing: template.pricing,
      features: template.features,
      targetUser: template.targetUser,
      setupQuestions: template.setupQuestions,
      requiredIntegrations: template.requiredIntegrations,
      optionalIntegrations: template.optionalIntegrations,
      knowledgeBase: template.knowledgeBase
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};

// Get user's configured agents
export const getMyAgents = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const agents = await UserAgent.find(query).sort({ createdAt: -1 });

    // Enhance with template info
    const enhancedAgents = agents.map(agent => {
      const template = allAgentTemplates[agent.templateId];
      return {
        ...agent.toObject(),
        template: {
          name: template?.name,
          icon: template?.icon,
          color: template?.color,
          category: template?.category
        }
      };
    });

    res.json(enhancedAgents);
  } catch (error) {
    console.error('Get my agents error:', error);
    res.status(500).json({ message: 'Failed to fetch your agents' });
  }
};

// Get single agent
export const getAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Enhance with template info and integration status
    const template = allAgentTemplates[agent.templateId];
    const integrationStatus = agent.getIntegrationStatus();

    res.json({
      ...agent.toObject(),
      template: {
        name: template?.name,
        icon: template?.icon,
        color: template?.color,
        category: template?.category,
        setupQuestions: template?.setupQuestions
      },
      integrationStatus
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ message: 'Failed to fetch agent' });
  }
};

// Create agent from template
export const createAgent = async (req, res) => {
  try {
    const { templateId, configuration, customName } = req.body;

    // Validate template exists
    const template = allAgentTemplates[templateId];
    if (!template) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    // Validate required fields in configuration
    const requiredQuestions = template.setupQuestions.filter(q => q.required);
    const missingFields = requiredQuestions.filter(q => !configuration[q.id]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields: missingFields.map(f => f.label)
      });
    }

    // Create the agent
    const agent = await UserAgent.createFromTemplate(
      req.user._id,
      templateId,
      configuration
    );

    if (customName) {
      agent.customName = customName;
      await agent.save();
    }

    res.status(201).json({
      message: 'Agent created successfully',
      agent: {
        ...agent.toObject(),
        template: {
          name: template.name,
          icon: template.icon,
          color: template.color
        }
      }
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ message: 'Failed to create agent', error: error.message });
  }
};

// Update agent configuration
export const updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { configuration, customName } = req.body;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Can only update draft or paused agents
    if (agent.status === 'active') {
      return res.status(400).json({
        message: 'Cannot update active agent. Pause it first.'
      });
    }

    if (configuration) {
      agent.configuration = { ...agent.configuration, ...configuration };
      // System prompt will auto-regenerate via pre-save hook
    }

    if (customName !== undefined) {
      agent.customName = customName;
    }

    await agent.save();

    res.json({
      message: 'Agent updated successfully',
      agent: agent.toObject()
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ message: 'Failed to update agent' });
  }
};

// Activate agent
export const activateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if required integrations are connected
    try {
      await agent.activate();
    } catch (error) {
      return res.status(400).json({
        message: error.message,
        integrationStatus: agent.getIntegrationStatus()
      });
    }

    res.json({
      message: 'Agent activated successfully',
      agent: agent.toObject()
    });
  } catch (error) {
    console.error('Activate agent error:', error);
    res.status(500).json({ message: 'Failed to activate agent' });
  }
};

// Pause agent
export const pauseAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.pause();

    res.json({
      message: 'Agent paused successfully',
      agent: agent.toObject()
    });
  } catch (error) {
    console.error('Pause agent error:', error);
    res.status(500).json({ message: 'Failed to pause agent' });
  }
};

// Resume agent
export const resumeAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.resume();

    res.json({
      message: 'Agent resumed successfully',
      agent: agent.toObject()
    });
  } catch (error) {
    console.error('Resume agent error:', error);
    res.status(500).json({ message: 'Failed to resume agent' });
  }
};

// Archive agent
export const archiveAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.archive();

    res.json({
      message: 'Agent archived successfully'
    });
  } catch (error) {
    console.error('Archive agent error:', error);
    res.status(500).json({ message: 'Failed to archive agent' });
  }
};

// Get agent statistics
export const getAgentStats = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      stats: agent.stats,
      performance: {
        avgCallDuration: agent.stats.totalCalls > 0
          ? agent.stats.totalMinutes / agent.stats.totalCalls
          : 0,
        conversionRate: agent.stats.totalCalls > 0
          ? (agent.stats.appointmentsBooked / agent.stats.totalCalls) * 100
          : 0,
        reviewConversionRate: agent.stats.reviewsRequested > 0
          ? (agent.stats.reviewsReceived / agent.stats.reviewsRequested) * 100
          : 0
      }
    });
  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({ message: 'Failed to fetch agent statistics' });
  }
};

// Get agent billing info
export const getAgentBilling = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const currentCost = agent.calculateCurrentCost();

    res.json({
      billing: agent.billing,
      currentPeriodCost: currentCost,
      breakdown: {
        basePrice: agent.billing.basePrice,
        callCharges: agent.billing.currentPeriodCalls > agent.billing.freeCallsIncluded
          ? (agent.billing.currentPeriodCalls - agent.billing.freeCallsIncluded) * agent.billing.perCallPrice
          : 0,
        collectionCommission: agent.stats.paymentsCollected * (agent.billing.percentOfCollections || 0),
        reviewBonuses: agent.stats.reviewsReceived * (agent.billing.perReviewBonus || 0)
      }
    });
  } catch (error) {
    console.error('Get agent billing error:', error);
    res.status(500).json({ message: 'Failed to fetch billing information' });
  }
};

// Test agent with sample call
export const testAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { scenario } = req.body;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Mark as test agent
    agent.testing.isTestAgent = true;
    agent.testing.testCallsCount += 1;
    await agent.save();

    // TODO: Implement actual ElevenLabs test call
    // For now, return the system prompt for testing
    res.json({
      message: 'Test initiated',
      systemPrompt: agent.systemPrompt,
      scenario: scenario || 'default',
      testCallNumber: agent.testing.testCallsCount
    });
  } catch (error) {
    console.error('Test agent error:', error);
    res.status(500).json({ message: 'Failed to test agent' });
  }
};

// Connect integration to agent
export const connectIntegration = async (req, res) => {
  try {
    const { agentId, service } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Find the user's integration for this service
    const integration = await Integration.findOne({
      userId: req.user._id,
      service,
      status: 'connected'
    });

    if (!integration) {
      return res.status(400).json({
        message: `${service} integration not found. Please connect it first.`
      });
    }

    // Check if already connected
    const existing = agent.connectedIntegrations.find(ci => ci.service === service);
    if (existing) {
      return res.status(400).json({ message: 'Integration already connected' });
    }

    // Determine if this is a required integration
    const template = allAgentTemplates[agent.templateId];
    const isRequired = template.requiredIntegrations.some(ri => ri.service === service);

    // Add to agent's connected integrations
    agent.connectedIntegrations.push({
      service,
      integrationId: integration._id,
      isRequired
    });

    await agent.save();

    res.json({
      message: `${service} connected successfully`,
      integrationStatus: agent.getIntegrationStatus()
    });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ message: 'Failed to connect integration' });
  }
};

// Disconnect integration from agent
export const disconnectIntegration = async (req, res) => {
  try {
    const { agentId, service } = req.params;

    const agent = await UserAgent.findOne({
      _id: agentId,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if this is a required integration
    const connection = agent.connectedIntegrations.find(ci => ci.service === service);
    if (connection && connection.isRequired && agent.status === 'active') {
      return res.status(400).json({
        message: 'Cannot disconnect required integration while agent is active. Pause the agent first.'
      });
    }

    // Remove from connected integrations
    agent.connectedIntegrations = agent.connectedIntegrations.filter(
      ci => ci.service !== service
    );

    await agent.save();

    res.json({
      message: `${service} disconnected successfully`,
      integrationStatus: agent.getIntegrationStatus()
    });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ message: 'Failed to disconnect integration' });
  }
};

export default {
  getTemplates,
  getTemplate,
  getMyAgents,
  getAgent,
  createAgent,
  updateAgent,
  activateAgent,
  pauseAgent,
  resumeAgent,
  archiveAgent,
  getAgentStats,
  getAgentBilling,
  testAgent,
  connectIntegration,
  disconnectIntegration
};
