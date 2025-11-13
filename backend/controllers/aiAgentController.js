import AIAgent from '../models/AIAgent.js';
import User from '../models/User.js';
import aiAgentService from '../services/aiAgentService.js';
import ragService from '../services/ragService.js';

/**
 * Get all AI agents for the authenticated user
 */
export const getAIAgents = async (req, res) => {
  try {
    const agents = await AIAgent.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(agents);
  } catch (error) {
    console.error('Get AI agents error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get a specific AI agent
 */
export const getAIAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Get AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new AI agent
 */
export const createAIAgent = async (req, res) => {
  try {
    const {
      name,
      type,
      provider,
      model,
      systemPrompt,
      category,
      configuration,
      capabilities,
      channels,
      knowledgeBase
    } = req.body;

    // Validate required fields
    if (!name || !provider || !model) {
      return res.status(400).json({
        message: 'Name, provider, and model are required'
      });
    }

    // Validate provider and model
    aiAgentService.validateProvider(provider);

    // Check subscription limits
    const user = await User.findById(req.user._id);
    const agentCount = await AIAgent.countDocuments({ userId: req.user._id });

    const planLimits = {
      trial: 1,
      starter: 3,
      professional: 10,
      enterprise: Infinity
    };

    const maxAgents = planLimits[user.plan] || 1;
    if (agentCount >= maxAgents) {
      return res.status(403).json({
        message: `Your ${user.plan} plan allows up to ${maxAgents} AI agent(s). Upgrade to create more.`
      });
    }

    // Generate API key for this agent
    const crypto = await import('crypto');
    const apiKey = `ai_${crypto.randomBytes(32).toString('hex')}`;

    // Create AI agent
    const agent = await AIAgent.create({
      userId: req.user._id,
      name,
      type: type || 'chat',
      provider,
      model,
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
      category: category || 'general',
      configuration: {
        temperature: configuration?.temperature || 0.7,
        maxTokens: configuration?.maxTokens || 1000,
        topP: configuration?.topP || 1,
        frequencyPenalty: configuration?.frequencyPenalty || 0,
        presencePenalty: configuration?.presencePenalty || 0,
        stopSequences: configuration?.stopSequences || [],
        responseFormat: configuration?.responseFormat || 'text'
      },
      capabilities: {
        webSearch: capabilities?.webSearch || false,
        imageGeneration: capabilities?.imageGeneration || false,
        codeExecution: capabilities?.codeExecution || false,
        fileAnalysis: capabilities?.fileAnalysis || false,
        functionCalling: capabilities?.functionCalling || false
      },
      channels: channels || [],
      knowledgeBase: knowledgeBase || { enabled: false, documents: [] },
      deployment: {
        status: 'draft',
        apiKey: apiKey
      },
      enabled: false
    });

    // Generate embed code if web widget channel is enabled
    const webChannel = agent.channels.find(c => c.type === 'web_widget' && c.enabled);
    if (webChannel) {
      agent.generateEmbedCode();
      await agent.save();
    }

    res.status(201).json(agent);
  } catch (error) {
    console.error('Create AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update an AI agent
 */
export const updateAIAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'systemPrompt', 'configuration', 'capabilities',
      'channels', 'conversationSettings', 'guardrails',
      'knowledgeBase', 'enabled', 'category'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        agent[field] = req.body[field];
      }
    });

    // Update version number
    agent.version += 1;

    await agent.save();

    res.json(agent);
  } catch (error) {
    console.error('Update AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete an AI agent
 */
export const deleteAIAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    res.json({ message: 'AI agent deleted successfully' });
  } catch (error) {
    console.error('Delete AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Chat with an AI agent
 */
export const chatWithAgent = async (req, res) => {
  try {
    const { messages, stream } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    const agent = await AIAgent.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    if (!agent.enabled) {
      return res.status(403).json({ message: 'AI agent is not enabled' });
    }

    // Check if user has enough tokens (implement token checking here)
    // TODO: Check user's token balance before proceeding

    // Enhance prompt with RAG context if knowledge base is enabled
    let enhancedAgent = agent;
    let contextsUsed = [];

    if (agent.knowledgeBase?.enabled) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const enhancementResult = await ragService.enhancePromptWithContext(
          req.user._id,
          agent.systemPrompt,
          lastUserMessage.content,
          {
            contextLimit: 3,
            threshold: 0.7
          }
        );

        // Create enhanced agent with new system prompt
        enhancedAgent = {
          ...agent.toObject(),
          systemPrompt: enhancementResult.enhancedPrompt
        };
        contextsUsed = enhancementResult.contextsUsed;
      }
    }

    // Handle streaming vs non-streaming
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await aiAgentService.streamChat(enhancedAgent, messages, (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      });

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await aiAgentService.chat(enhancedAgent, messages);

      // Add context information to response
      result.contextsUsed = contextsUsed;

      // Update analytics
      agent.analytics.totalMessages += 1;
      agent.analytics.totalConversations += 1;
      await agent.save();

      // TODO: Track token usage for billing
      // const cost = aiAgentService.calculateCost(
      //   agent.provider,
      //   agent.model,
      //   result.usage.inputTokens,
      //   result.usage.outputTokens
      // );

      res.json(result);
    }
  } catch (error) {
    console.error('Chat with agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Deploy/activate an AI agent
 */
export const deployAIAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    // Generate API key if not exists
    if (!agent.deployment.apiKey) {
      agent.generateApiKey();
    }

    // Generate embed code if web widget is enabled
    const webChannel = agent.channels.find(c => c.type === 'web_widget' && c.enabled);
    if (webChannel) {
      agent.generateEmbedCode();
    }

    agent.deployment.status = 'active';
    agent.deployment.lastDeployedAt = new Date();
    agent.enabled = true;

    await agent.save();

    res.json({
      message: 'AI agent deployed successfully',
      agent,
      embedCode: agent.deployment.embedCode,
      apiKey: agent.deployment.apiKey
    });
  } catch (error) {
    console.error('Deploy AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Pause an AI agent
 */
export const pauseAIAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    agent.deployment.status = 'paused';
    agent.enabled = false;

    await agent.save();

    res.json({ message: 'AI agent paused successfully', agent });
  } catch (error) {
    console.error('Pause AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get available AI models for each provider
 */
export const getAvailableModels = async (req, res) => {
  try {
    const { provider } = req.query;

    if (provider) {
      const models = aiAgentService.getAvailableModels(provider);
      return res.json({ provider, models });
    }

    // Return all providers and models
    const allModels = {
      openai: aiAgentService.getAvailableModels('openai'),
      anthropic: aiAgentService.getAvailableModels('anthropic'),
      google: aiAgentService.getAvailableModels('google')
    };

    res.json(allModels);
  } catch (error) {
    console.error('Get available models error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get AI agent templates
 */
export const getAIAgentTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'customer_support',
        name: 'Customer Support Assistant',
        category: 'customer_support',
        type: 'chat',
        description: 'Helpful AI assistant for customer service inquiries',
        icon: '💬',
        provider: 'openai',
        model: 'gpt-4',
        systemPrompt: `You are a helpful customer support assistant for {{company_name}}.

Your responsibilities:
- Answer customer questions professionally and accurately
- Troubleshoot common issues
- Escalate complex problems to human agents
- Maintain a friendly, empathetic tone
- Collect customer information when needed

CUSTOMER: {{customer_name}} ({{customer_email}})
CONVERSATION HISTORY: Available in context

Always be:
- Patient and understanding
- Clear and concise
- Proactive in offering solutions
- Honest about limitations

If you cannot help with something, say: "Let me connect you with a specialist who can help with that."`,
        capabilities: {
          webSearch: false,
          functionCalling: true,
          fileAnalysis: false
        }
      },
      {
        id: 'sales_assistant',
        name: 'Sales Assistant',
        category: 'sales',
        type: 'chat',
        description: 'AI assistant that helps qualify leads and answer product questions',
        icon: '💼',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        systemPrompt: `You are a sales assistant for {{company_name}}.

Your goals:
- Qualify potential customers
- Answer product questions
- Schedule demos/consultations
- Overcome objections professionally
- Move leads through the sales funnel

LEAD INFORMATION:
- Name: {{lead_name}}
- Company: {{lead_company}}
- Industry: {{lead_industry}}
- Source: {{lead_source}}

Discovery Questions:
1. What challenges are you trying to solve?
2. What's your timeline for implementation?
3. Who else is involved in the decision?
4. What's your budget range?

Be consultative, not pushy. Focus on understanding their needs first.`,
        capabilities: {
          webSearch: false,
          functionCalling: true,
          fileAnalysis: false
        }
      },
      {
        id: 'lead_qualification',
        name: 'Lead Qualification Bot',
        category: 'lead_qualification',
        type: 'chat',
        description: 'Automatically qualify and score inbound leads',
        icon: '🎯',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        systemPrompt: `You are a lead qualification specialist for {{company_name}}.

Your job is to ask qualifying questions and score the lead:

QUALIFICATION CRITERIA:
- Budget: Does lead have budget? (0-25 points)
- Authority: Is lead a decision maker? (0-25 points)
- Need: Does lead have a clear need? (0-25 points)
- Timeline: Is there an urgent timeline? (0-25 points)

Ask 3-4 questions to determine:
1. What problem are they trying to solve?
2. What's their timeline?
3. Are they the decision maker?
4. Have they budgeted for this?

Keep questions conversational and natural. After gathering info, calculate a score (0-100) and recommend:
- 80+: Hot lead - schedule call immediately
- 50-79: Warm lead - nurture with content
- 0-49: Cold lead - add to drip campaign

End with clear next step recommendation.`,
        capabilities: {
          webSearch: false,
          functionCalling: true,
          fileAnalysis: false
        }
      },
      {
        id: 'faq_bot',
        name: 'FAQ Bot',
        category: 'faq',
        type: 'chat',
        description: 'Answer frequently asked questions with knowledge base',
        icon: '❓',
        provider: 'google',
        model: 'gemini-pro',
        systemPrompt: `You are an FAQ assistant for {{company_name}}.

Use the knowledge base to answer common questions about:
- Products/services
- Pricing
- Policies (refund, shipping, privacy)
- Account management
- Technical support

If the answer is in the knowledge base, provide it clearly and concisely.

If not in knowledge base:
- Say "I don't have that information in my knowledge base"
- Offer to connect them with a human
- Ask if you can help with anything else

Always provide accurate information. Never make up answers.`,
        capabilities: {
          webSearch: false,
          functionCalling: false,
          fileAnalysis: true
        },
        knowledgeBase: {
          enabled: true
        }
      },
      {
        id: 'appointment_scheduler',
        name: 'Appointment Scheduler',
        category: 'sales',
        type: 'chat',
        description: 'Schedule appointments and manage calendar',
        icon: '📅',
        provider: 'openai',
        model: 'gpt-4',
        systemPrompt: `You are an appointment scheduling assistant for {{company_name}}.

Your job:
- Understand customer's scheduling needs
- Check calendar availability
- Book appointments
- Send confirmations
- Handle rescheduling requests

Available time slots: {{available_slots}}

Process:
1. Greet warmly and ask about their needs
2. Offer 3 available time slots
3. Confirm their choice
4. Collect required information (name, email, phone)
5. Book the appointment
6. Send confirmation

Be efficient but friendly. Respect their time preferences.`,
        capabilities: {
          webSearch: false,
          functionCalling: true,
          fileAnalysis: false
        }
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Get AI agent templates error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Test an AI agent with sample input
 */
export const testAIAgent = async (req, res) => {
  try {
    const { input, expectedOutput } = req.body;

    if (!input) {
      return res.status(400).json({ message: 'Test input is required' });
    }

    const agent = await AIAgent.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!agent) {
      return res.status(404).json({ message: 'AI agent not found' });
    }

    const messages = [{ role: 'user', content: input }];
    const result = await aiAgentService.chat(agent, messages);

    // Save test result
    agent.testing.testConversations.push({
      input,
      expectedOutput,
      actualOutput: result.response,
      passed: expectedOutput ? result.response.includes(expectedOutput) : null,
      testedAt: new Date()
    });

    agent.testing.lastTestRunAt = new Date();
    if (expectedOutput) {
      if (result.response.includes(expectedOutput)) {
        agent.testing.testsPassed += 1;
      } else {
        agent.testing.testsFailed += 1;
      }
    }

    await agent.save();

    res.json({
      input,
      output: result.response,
      passed: expectedOutput ? result.response.includes(expectedOutput) : null,
      usage: result.usage
    });
  } catch (error) {
    console.error('Test AI agent error:', error);
    res.status(500).json({ message: error.message });
  }
};
