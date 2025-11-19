import AIService from '../services/aiService.js';
import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';

const aiService = new AIService();

/**
 * Check if AI service is available
 */
export const checkAIAvailability = async (req, res) => {
  try {
    res.json({
      available: aiService.isAvailable(),
      provider: aiService.activeProvider
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Improve an agent script with AI
 */
export const improveScript = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available. Please configure an AI provider API key.'
      });
    }

    const { script, agentType, context } = req.body;

    if (!script) {
      return res.status(400).json({ message: 'Script is required' });
    }

    // Get user context
    const user = await User.findById(req.user._id);
    const fullContext = {
      companyName: user.companyName || context?.companyName,
      industry: context?.industry,
      goal: context?.goal
    };

    const improvedScript = await aiService.improveScript(script, agentType, fullContext);

    res.json({
      original: script,
      improved: improvedScript,
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error improving script:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate script suggestions
 */
export const getScriptSuggestions = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available'
      });
    }

    const { script, agentType } = req.body;

    if (!script) {
      return res.status(400).json({ message: 'Script is required' });
    }

    const suggestions = await aiService.generateScriptSuggestions(script, agentType);

    res.json({
      suggestions,
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate a complete script from description
 */
/**
 * Configure a workflow node with AI assistance
 */
export const configureNode = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available. Please configure an AI provider API key.'
      });
    }

    const { nodeType, userRequest, currentConfig, context } = req.body;

    if (!nodeType || !userRequest) {
      return res.status(400).json({ message: 'Node type and user request are required' });
    }

    const configuration = await aiService.configureNode(
      nodeType,
      userRequest,
      currentConfig || {},
      context || {}
    );

    res.json({
      configuration,
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error configuring node:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate a workflow from natural language description
 */
export const generateWorkflow = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available. Please configure an AI provider API key.'
      });
    }

    const { description, workflowType, context } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Get user context
    const user = await User.findById(req.user._id);
    const fullContext = {
      companyName: user.companyName || context?.companyName,
      industry: context?.industry
    };

    const workflow = await aiService.generateWorkflow(description, workflowType, fullContext);

    res.json({
      workflow,
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error generating workflow:', error);
    res.status(500).json({ message: error.message });
  }
};

export const generateScript = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available'
      });
    }

    const { description, agentType, context } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Get user context
    const user = await User.findById(req.user._id);
    const fullContext = {
      companyName: user.companyName || context?.companyName,
      industry: context?.industry
    };

    const script = await aiService.generateScript(description, agentType, fullContext);

    res.json({
      script,
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Analyze agent performance with AI insights
 */
export const analyzeAgentPerformance = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available'
      });
    }

    const { agentId } = req.params;

    // Get agent
    const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Get recent calls (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const calls = await CallLog.find({
      agentId: agentId,
      createdAt: { $gte: thirtyDaysAgo }
    }).limit(50);

    if (calls.length === 0) {
      return res.json({
        message: 'Not enough call data for analysis',
        summary: 'No calls found in the last 30 days',
        insights: [],
        recommendations: []
      });
    }

    const agentInfo = {
      name: agent.name,
      type: agent.type
    };

    const analysis = await aiService.analyzeCallData(calls, agentInfo);

    res.json({
      ...analysis,
      totalCalls: calls.length,
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error analyzing agent performance:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get call insights for dashboard
 */
export const getCallInsights = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available'
      });
    }

    // Get all user's agents
    const agents = await VoiceAgent.find({ userId: req.user._id });

    if (agents.length === 0) {
      return res.json({
        message: 'No agents found',
        insights: []
      });
    }

    // Get recent calls across all agents
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const calls = await CallLog.find({
      agentId: { $in: agents.map(a => a._id) },
      createdAt: { $gte: thirtyDaysAgo }
    }).limit(100);

    if (calls.length === 0) {
      return res.json({
        message: 'Not enough call data',
        insights: []
      });
    }

    // Basic aggregation
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(c => c.status === 'completed').length;
    const avgDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length;

    const insights = [
      {
        title: 'Call Volume',
        value: totalCalls,
        description: `${totalCalls} calls in the last 30 days`,
        trend: 'neutral'
      },
      {
        title: 'Success Rate',
        value: `${((successfulCalls / totalCalls) * 100).toFixed(1)}%`,
        description: `${successfulCalls} successful calls out of ${totalCalls}`,
        trend: successfulCalls / totalCalls > 0.7 ? 'up' : 'down'
      },
      {
        title: 'Avg Duration',
        value: `${Math.round(avgDuration)}s`,
        description: 'Average call duration',
        trend: 'neutral'
      }
    ];

    res.json({
      insights,
      totalCalls,
      successfulCalls,
      avgDuration: Math.round(avgDuration),
      provider: aiService.activeProvider
    });
  } catch (error) {
    console.error('Error getting call insights:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * AI Chat for Voice Agent Builder
 * Conversational interface to build agents
 */
export const aiChat = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available. Please configure an AI provider API key.',
        error: 'AI_NOT_AVAILABLE'
      });
    }

    const { messages, task } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    // Enhanced system prompt for agent/workflow building
    let systemPrompt = 'You are a helpful AI assistant.';

    if (task === 'voice_agent_builder') {
      systemPrompt = `You are an expert AI assistant helping users build voice agents for their business.

Your job is to:
1. Ask 2-3 clarifying questions to understand what they need
2. Gather key information: purpose, target audience, message, tone, specific details
3. When you have enough info, respond with a JSON block containing the agent configuration

Keep responses conversational, friendly, and concise (2-3 sentences per response).

When ready to generate the agent config (after 2-3 exchanges), include this EXACT format in your response:

\`\`\`json
{
  "agent_ready": true,
  "agent_config": {
    "name": "Short descriptive name (e.g. 'Promo Caller Sarah')",
    "purpose": "Brief purpose statement",
    "main_message": "The core message to communicate in the call",
    "tone": "professional/friendly/urgent/casual",
    "greeting": "Opening greeting for the call",
    "specific_details": "Any specific details like times, dates, offers, etc."
  }
}
\`\`\`

Only include this JSON when you have enough information from the user.`;
    } else if (task === 'workflow_builder') {
      systemPrompt = `You are an expert AI assistant helping users build automation workflows.

Your job is to:
1. Ask 2-3 clarifying questions to understand what they want to automate
2. Gather key information: trigger event, actions to take, conditions, integrations needed
3. When you have enough info, respond with a JSON block containing the workflow configuration

Keep responses conversational, friendly, and concise (2-3 sentences per response).

When ready to generate the workflow config (after 2-3 exchanges), include this EXACT format in your response:

\`\`\`json
{
  "agent_ready": true,
  "agent_config": {
    "name": "Short descriptive name (e.g. 'Lead Follow-up Flow')",
    "purpose": "Brief purpose statement",
    "trigger": "What starts this workflow (webhook, schedule, manual, etc.)",
    "nodes": [],
    "connections": []
  }
}
\`\`\`

Only include this JSON when you have enough information from the user.`;
    }

    // Prepend system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Convert messages to prompt format for AI service
    const prompt = fullMessages.map(m => {
      if (m.role === 'system') {
        return `System: ${m.content}`;
      } else if (m.role === 'user') {
        return `User: ${m.content}`;
      } else if (m.role === 'assistant') {
        return `Assistant: ${m.content}`;
      }
      return `${m.role}: ${m.content}`;
    }).join('\n\n') + '\n\nAssistant:';

    // Call AI service with prompt string
    const response = await aiService.chat(prompt);

    let aiMessage = response;
    let agentReady = false;
    let agentConfig = null;

    // Check if AI provided agent configuration
    const jsonMatch = aiMessage.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const configData = JSON.parse(jsonMatch[1]);
        if (configData.agent_ready && configData.agent_config) {
          agentReady = true;
          agentConfig = configData.agent_config;

          // Remove the JSON block from the message
          aiMessage = aiMessage.replace(/```json\s*\n[\s\S]*?\n```/, '').trim();
        }
      } catch (parseError) {
        console.error('Error parsing agent config JSON:', parseError);
      }
    }

    res.json({
      message: aiMessage,
      agent_ready: agentReady,
      agent_config: agentConfig,
      provider: aiService.activeProvider
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to get AI response',
      message: error.message
    });
  }
};

/**
 * AI Decision Node Proxy
 * Handles AI decision making for VoiceFlow workflows
 * Uses backend AI keys (Claude/OpenAI) - user doesn't need API key
 */
export const aiDecision = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available',
        error: 'AI_NOT_AVAILABLE'
      });
    }

    const { prompt, options, context } = req.body;

    if (!prompt || !options || !Array.isArray(options)) {
      return res.status(400).json({ message: 'Prompt and options array are required' });
    }

    // Build decision prompt
    const fullPrompt = `${context ? context + '\n\n' : ''}${prompt}

Available options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Based on the context and prompt above, select the BEST option by returning ONLY the option text (nothing else).`;

    const response = await aiService.chat(fullPrompt);

    // Find which option was selected
    const selectedOption = options.find(opt =>
      response.toLowerCase().includes(opt.toLowerCase())
    ) || options[0];

    res.json({
      decision: selectedOption,
      reasoning: response,
      provider: aiService.activeProvider
    });

  } catch (error) {
    console.error('AI decision error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * AI Intent Detection Node Proxy
 * Detects user intent from conversation
 */
export const aiIntent = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available',
        error: 'AI_NOT_AVAILABLE'
      });
    }

    const { text, intents } = req.body;

    if (!text || !intents || !Array.isArray(intents)) {
      return res.status(400).json({ message: 'Text and intents array are required' });
    }

    // Build intent detection prompt
    const fullPrompt = `Analyze the following text and classify it into ONE of these intents:

${intents.map((intent, i) => `${i + 1}. ${intent.name}: ${intent.description || ''}`).join('\n')}

Text to analyze:
"${text}"

Return ONLY the intent name (nothing else).`;

    const response = await aiService.chat(fullPrompt);

    // Find which intent was detected
    const detectedIntent = intents.find(intent =>
      response.toLowerCase().includes(intent.name.toLowerCase())
    ) || intents[0];

    res.json({
      intent: detectedIntent.name,
      confidence: 0.95, // Simplified - could calculate actual confidence
      raw: response,
      provider: aiService.activeProvider
    });

  } catch (error) {
    console.error('AI intent error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * AI Extract Node Proxy
 * Extracts structured data from text
 */
export const aiExtract = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available',
        error: 'AI_NOT_AVAILABLE'
      });
    }

    const { text, schema } = req.body;

    if (!text || !schema) {
      return res.status(400).json({ message: 'Text and schema are required' });
    }

    // Build extraction prompt
    const fullPrompt = `Extract the following information from the text and return ONLY valid JSON (no markdown, no explanation):

Schema to extract:
${JSON.stringify(schema, null, 2)}

Text:
"${text}"

Return JSON only.`;

    const response = await aiService.chat(fullPrompt);

    // Try to parse JSON from response
    let extractedData = {};
    try {
      // Remove markdown code blocks if present
      const jsonText = response.replace(/```json\s*|\s*```/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse extracted JSON:', parseError);
      extractedData = { raw: response };
    }

    res.json({
      data: extractedData,
      provider: aiService.activeProvider
    });

  } catch (error) {
    console.error('AI extract error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * AI Generate Node Proxy
 * Generates content based on prompt
 */
export const aiGenerate = async (req, res) => {
  try {
    if (!aiService.isAvailable()) {
      return res.status(503).json({
        message: 'AI service not available',
        error: 'AI_NOT_AVAILABLE'
      });
    }

    const { prompt, type, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Build generation prompt based on type
    let fullPrompt = prompt;

    if (type === 'email') {
      fullPrompt = `Generate a professional email based on this request:\n\n${prompt}\n\n${context ? 'Context: ' + context : ''}`;
    } else if (type === 'sms') {
      fullPrompt = `Generate a short SMS message (160 characters max) based on this request:\n\n${prompt}\n\n${context ? 'Context: ' + context : ''}`;
    } else if (type === 'response') {
      fullPrompt = `Generate a conversational response based on this request:\n\n${prompt}\n\n${context ? 'Context: ' + context : ''}`;
    }

    const response = await aiService.chat(fullPrompt);

    res.json({
      generated: response,
      type: type || 'text',
      provider: aiService.activeProvider
    });

  } catch (error) {
    console.error('AI generate error:', error);
    res.status(500).json({ message: error.message });
  }
};
