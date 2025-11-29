import express from 'express';
import { protect } from '../middleware/auth.js';
import VoiceAgent from '../models/VoiceAgent.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import OpenAI from 'openai';

const router = express.Router();
router.use(protect);

// Lazy-initialize OpenAI to avoid crash when API key is not set
let openai = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// POST /api/ai-builder/chat - Chat with AI to customize agent
router.post('/chat', async (req, res) => {
  try {
    const { messages, agentId, sessionContext } = req.body;

    // Build context from knowledge bases if provided
    let contextText = '';
    if (sessionContext?.knowledgeBaseIds && sessionContext.knowledgeBaseIds.length > 0) {
      const kbs = await KnowledgeBase.find({
        _id: { $in: sessionContext.knowledgeBaseIds },
        userId: req.user._id
      }).select('name content.rawText content.summary');

      contextText = kbs.map(kb => `
Knowledge Base: ${kb.name}
${kb.content.summary || kb.content.rawText?.substring(0, 1000) || ''}
      `).join('\n\n');
    }

    // System prompt for AI Builder
    const systemPrompt = `You are an AI assistant helping users create and customize voice AI agents for their business.

${contextText ? `Context from user's knowledge bases:\n${contextText}\n\n` : ''}

Your role:
1. Ask clarifying questions about their business, industry, and use case
2. Understand their customer service needs and workflows
3. Help them choose the right voice and personality
4. Suggest relevant features and capabilities
5. Create a customized agent prompt based on their requirements
6. Generate a professional first message for the agent

When the user is ready to deploy, provide a structured response with:
- Agent name
- Complete system prompt
- First message
- Recommended voice settings
- Suggested features to enable

Be conversational, helpful, and guide them through the process step by step.
Current user's business: ${req.user.email}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({
      success: true,
      data: {
        message: aiResponse,
        usage: completion.usage
      }
    });
  } catch (error) {
    console.error('AI Builder chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai-builder/analyze-content - Analyze uploaded content and suggest agent customizations
router.post('/analyze-content', async (req, res) => {
  try {
    const { content, contentType, agentPurpose } = req.body;

    const analysisPrompt = `Analyze the following ${contentType} content and suggest how to customize a voice AI agent for ${agentPurpose}:

Content:
${content.substring(0, 3000)}

Provide:
1. Key information the agent should know
2. Suggested tone and personality
3. Common questions the agent should be able to answer
4. Important details to include in the system prompt

Format your response as JSON with keys: keyInfo, tone, commonQuestions, promptSuggestions`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an AI that analyzes business content and suggests voice agent customizations.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.5
    });

    const analysis = completion.choices[0].message.content;

    // Try to parse as JSON, fallback to text
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch {
      parsedAnalysis = { rawAnalysis: analysis };
    }

    res.json({
      success: true,
      data: {analysis: parsedAnalysis
      }
    });
  } catch (error) {
    console.error('Content analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai-builder/generate-agent - Generate complete agent configuration
router.post('/generate-agent', async (req, res) => {
  try {
    const {
      businessName,
      industry,
      purpose,
      tone,
      keyFeatures,
      knowledgeBaseIds,
      voiceId,
      additionalContext
    } = req.body;

    // Get knowledge base content
    let kbContext = '';
    if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
      const kbs = await KnowledgeBase.find({
        _id: { $in: knowledgeBaseIds },
        userId: req.user._id
      }).select('name content.rawText content.summary');

      kbContext = kbs.map(kb =>
        `${kb.name}: ${kb.content.summary || kb.content.rawText?.substring(0, 500) || ''}`
      ).join('\n');
    }

    const generationPrompt = `Create a complete voice AI agent configuration:

Business: ${businessName}
Industry: ${industry}
Purpose: ${purpose}
Tone: ${tone}
Key Features: ${keyFeatures?.join(', ') || 'None specified'}

${kbContext ? `Knowledge Base Content:\n${kbContext}\n` : ''}
${additionalContext ? `Additional Context:\n${additionalContext}\n` : ''}

Generate:
1. Agent name (concise, professional)
2. Complete system prompt (detailed, includes personality, capabilities, and business context)
3. First message (welcoming, sets expectations)
4. List of capabilities this agent should have

Format as JSON with keys: name, systemPrompt, firstMessage, capabilities (array)`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert at creating voice AI agent configurations for businesses.' },
        { role: 'user', content: generationPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const config = JSON.parse(completion.choices[0].message.content);

    // Create the agent
    const agent = await VoiceAgent.create({
      userId: req.user._id,
      name: config.name,
      type: 'custom',
      voiceId: voiceId || 'EXAVITQu4vr4xnSDxMaL', // Default ElevenLabs voice
      prompt: config.systemPrompt,
      firstMessage: config.firstMessage,
      enabled: true,
      deployed: false,
      metadata: {
        industry,
        purpose,
        tone,
        capabilities: config.capabilities,
        generatedBy: 'ai-builder',
        knowledgeBaseIds
      }
    });

    // Link knowledge bases to agent
    if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
      await KnowledgeBase.updateMany(
        { _id: { $in: knowledgeBaseIds }, userId: req.user._id },
        { $addToSet: { 'usage.linkedAgents': agent._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Agent generated successfully',
      data: {
        agent,
        config
      }
    });
  } catch (error) {
    console.error('Agent generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai-builder/extract-from-url - Extract content from URL for training
router.post('/extract-from-url', async (req, res) => {
  try {
    const { url } = req.body;

    // Use a web scraping service or library
    const axios = (await import('axios')).default;
    const cheerio = (await import('cheerio')).load;

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });

    const $ = cheerio(response.data);

    // Remove unnecessary elements
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    $('header').remove();

    // Extract text
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';

    res.json({
      success: true,
      data: {
        url,
        title,
        description,
        content: text,
        wordCount: text.split(/\s+/).length
      }
    });
  } catch (error) {
    console.error('URL extraction error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to extract content: ${error.message}`
    });
  }
});

export default router;
