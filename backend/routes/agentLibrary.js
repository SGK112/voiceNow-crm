import express from 'express';
import { protect } from '../middleware/auth.js';
import { FULL_AGENT_LIBRARY, AGENT_CATEGORIES, SHOPIFY_AGENTS } from '../config/fullAgentLibrary.js';
import { SPECIALTY_TRADE_AGENTS, RAG_AGENTS, CUSTOMER_SERVICE_AGENTS } from '../config/specialtyTradeAgents.js';
import agentTemplates from '../config/agentTemplates.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/agent-library
 * Get all agents from the complete library
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, tier } = req.query;

    let allAgents = [];

    // Combine all agent sources
    const voiceAgents = Object.values(FULL_AGENT_LIBRARY.voice || {});
    const smsAgents = Object.values(FULL_AGENT_LIBRARY.sms || {});
    const emailAgents = Object.values(FULL_AGENT_LIBRARY.email || {});
    const marketingAgents = Object.values(FULL_AGENT_LIBRARY.marketing || {});
    const specializedAgents = Object.values(FULL_AGENT_LIBRARY.specialized || {});
    const shopifyAgents = Object.values(FULL_AGENT_LIBRARY.shopify || SHOPIFY_AGENTS || {});
    const tradeAgents = Object.values(SPECIALTY_TRADE_AGENTS || {});
    const ragAgents = Object.values(RAG_AGENTS || {});
    const serviceAgents = Object.values(CUSTOMER_SERVICE_AGENTS || {});

    // Combine all
    allAgents = [
      ...voiceAgents,
      ...smsAgents,
      ...emailAgents,
      ...marketingAgents,
      ...specializedAgents,
      ...shopifyAgents,
      ...tradeAgents,
      ...ragAgents,
      ...serviceAgents
    ];

    // Filter by category
    if (category && category !== 'all') {
      allAgents = allAgents.filter(agent => {
        if (category === 'voice') return voiceAgents.includes(agent);
        if (category === 'sms') return smsAgents.includes(agent);
        if (category === 'email') return emailAgents.includes(agent);
        if (category === 'marketing') return marketingAgents.includes(agent);
        if (category === 'specialized') return specializedAgents.includes(agent);
        if (category === 'shopify') return shopifyAgents.includes(agent);
        if (category === 'trade') return tradeAgents.includes(agent);
        if (category === 'rag') return ragAgents.includes(agent);
        if (category === 'service') return serviceAgents.includes(agent);
        return true;
      });
    }

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      allAgents = allAgents.filter(agent =>
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower) ||
        agent.category?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by tier
    if (tier) {
      allAgents = allAgents.filter(agent => agent.tier === tier);
    }

    res.json({
      success: true,
      data: {
        agents: allAgents,
        total: allAgents.length,
        categories: AGENT_CATEGORIES
      }
    });
  } catch (error) {
    console.error('Error fetching agent library:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/agent-library/categories
 * Get all agent categories with counts
 */
router.get('/categories', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: AGENT_CATEGORIES,
        counts: {
          voice: Object.keys(FULL_AGENT_LIBRARY.voice || {}).length,
          sms: Object.keys(FULL_AGENT_LIBRARY.sms || {}).length,
          email: Object.keys(FULL_AGENT_LIBRARY.email || {}).length,
          marketing: Object.keys(FULL_AGENT_LIBRARY.marketing || {}).length,
          specialized: Object.keys(FULL_AGENT_LIBRARY.specialized || {}).length,
          shopify: Object.keys(FULL_AGENT_LIBRARY.shopify || SHOPIFY_AGENTS || {}).length,
          trade: Object.keys(SPECIALTY_TRADE_AGENTS || {}).length,
          rag: Object.keys(RAG_AGENTS || {}).length,
          service: Object.keys(CUSTOMER_SERVICE_AGENTS || {}).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/agent-library/:agentId
 * Get details for a specific agent
 */
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    // Search in all libraries
    let agent = null;

    // Check all libraries
    if (FULL_AGENT_LIBRARY.voice?.[agentId]) agent = FULL_AGENT_LIBRARY.voice[agentId];
    else if (FULL_AGENT_LIBRARY.sms?.[agentId]) agent = FULL_AGENT_LIBRARY.sms[agentId];
    else if (FULL_AGENT_LIBRARY.email?.[agentId]) agent = FULL_AGENT_LIBRARY.email[agentId];
    else if (FULL_AGENT_LIBRARY.marketing?.[agentId]) agent = FULL_AGENT_LIBRARY.marketing[agentId];
    else if (FULL_AGENT_LIBRARY.specialized?.[agentId]) agent = FULL_AGENT_LIBRARY.specialized[agentId];
    else if (FULL_AGENT_LIBRARY.shopify?.[agentId]) agent = FULL_AGENT_LIBRARY.shopify[agentId];
    else if (SHOPIFY_AGENTS?.[agentId]) agent = SHOPIFY_AGENTS[agentId];
    else if (SPECIALTY_TRADE_AGENTS?.[agentId]) agent = SPECIALTY_TRADE_AGENTS[agentId];
    else if (RAG_AGENTS?.[agentId]) agent = RAG_AGENTS[agentId];
    else if (CUSTOMER_SERVICE_AGENTS?.[agentId]) agent = CUSTOMER_SERVICE_AGENTS[agentId];
    else if (agentTemplates?.[agentId]) agent = agentTemplates[agentId];

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: { agent }
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/agent-library/:agentId/install
 * Install an agent template for the user
 */
router.post('/:agentId/install', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user._id;
    const { customization } = req.body;

    // Get agent template
    let agent = null;

    if (FULL_AGENT_LIBRARY.voice?.[agentId]) agent = FULL_AGENT_LIBRARY.voice[agentId];
    else if (FULL_AGENT_LIBRARY.sms?.[agentId]) agent = FULL_AGENT_LIBRARY.sms[agentId];
    else if (FULL_AGENT_LIBRARY.email?.[agentId]) agent = FULL_AGENT_LIBRARY.email[agentId];
    else if (FULL_AGENT_LIBRARY.marketing?.[agentId]) agent = FULL_AGENT_LIBRARY.marketing[agentId];
    else if (FULL_AGENT_LIBRARY.specialized?.[agentId]) agent = FULL_AGENT_LIBRARY.specialized[agentId];
    else if (FULL_AGENT_LIBRARY.shopify?.[agentId]) agent = FULL_AGENT_LIBRARY.shopify[agentId];
    else if (SHOPIFY_AGENTS?.[agentId]) agent = SHOPIFY_AGENTS[agentId];
    else if (SPECIALTY_TRADE_AGENTS?.[agentId]) agent = SPECIALTY_TRADE_AGENTS[agentId];
    else if (RAG_AGENTS?.[agentId]) agent = RAG_AGENTS[agentId];
    else if (CUSTOMER_SERVICE_AGENTS?.[agentId]) agent = CUSTOMER_SERVICE_AGENTS[agentId];
    else if (agentTemplates?.[agentId]) agent = agentTemplates[agentId];

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent template not found'
      });
    }

    // Create agent instance for user
    const VoiceAgent = (await import('../models/VoiceAgent.js')).default;

    // Build a comprehensive prompt based on agent type
    let systemPrompt = `You are ${agent.name}. ${agent.description}\n\nKey Features:\n`;
    if (agent.features && agent.features.length > 0) {
      agent.features.forEach(feature => {
        systemPrompt += `- ${feature}\n`;
      });
    }
    systemPrompt += `\nAlways be professional, friendly, and helpful. Provide clear and concise responses.`;

    // Get appropriate first message
    let firstMessage = 'Hello! How can I help you today?';
    if (agent.category?.includes('voice')) {
      firstMessage = `Hello! I'm ${agent.name}. How can I assist you today?`;
    } else if (agent.category?.includes('sms')) {
      firstMessage = `Hi! This is ${agent.name}. Reply to this message for assistance.`;
    } else if (agent.category?.includes('email')) {
      firstMessage = `Welcome! You're receiving emails from ${agent.name}.`;
    }

    // Create a fully configured, ready-to-use agent
    const newAgent = await VoiceAgent.create({
      userId,
      name: customization?.name || agent.name,
      type: 'custom',
      customType: agent.category || 'general',
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
      voiceName: 'Sarah',
      description: agent.description,
      firstMessage,
      prompt: systemPrompt,
      script: systemPrompt,
      enabled: true,
      deployed: false, // Start as draft
      metadata: {
        installedFrom: 'marketplace',
        templateId: agentId,
        category: agent.category,
        tier: agent.tier
      }
    });

    res.json({
      success: true,
      message: `${agent.name} installed successfully!`,
      data: { agent: newAgent }
    });

  } catch (error) {
    console.error('Error installing agent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/agent-library/popular
 * Get popular/trending agents
 */
router.get('/featured/popular', async (req, res) => {
  try {
    let allAgents = [];

    // Combine all agents
    Object.values(FULL_AGENT_LIBRARY).forEach(category => {
      if (typeof category === 'object') {
        allAgents = [...allAgents, ...Object.values(category)];
      }
    });

    Object.values(SPECIALTY_TRADE_AGENTS).forEach(agent => {
      allAgents.push(agent);
    });

    Object.values(RAG_AGENTS).forEach(agent => {
      allAgents.push(agent);
    });

    Object.values(CUSTOMER_SERVICE_AGENTS).forEach(agent => {
      allAgents.push(agent);
    });

    // Sort by downloads + rating
    allAgents = allAgents.sort((a, b) => {
      const aScore = (a.downloads || 0) + (a.rating || 0) * 1000;
      const bScore = (b.downloads || 0) + (b.rating || 0) * 1000;
      return bScore - aScore;
    });

    // Return top 10
    const popular = allAgents.slice(0, 10);

    res.json({
      success: true,
      data: { agents: popular }
    });
  } catch (error) {
    console.error('Error fetching popular agents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
