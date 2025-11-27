import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import { logBuffer, saveClaudeCommand, autoSaveConversation, analyzeAndSuggest } from '../utils/logCapture.js';
import { trainer } from '../utils/conversationTrainer.js';
import { AriaCapabilities, getCapabilityDefinitions, capabilities } from '../utils/ariaCapabilities.js';
import { ariaMemoryService } from '../services/ariaMemoryService.js';
import { ariaSlackService } from '../services/ariaSlackService.js';
import { ariaIntegrationService } from '../services/ariaIntegrationService.js';
import agentSMSService from '../services/agentSMSService.js';
import emailService from '../services/emailService.js';
import ttsService from '../services/ttsService.js';
import UserProfile from '../models/UserProfile.js';
import Lead from '../models/Lead.js';
import CallLog from '../models/CallLog.js';
import TeamMessage from '../models/TeamMessage.js';
import Contact from '../models/Contact.js';
import Appointment from '../models/Appointment.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  ARIA_AGENT_TEMPLATES,
  OPENAI_REALTIME_VOICES,
  getAgentTemplate,
  getAllAgentTemplates,
  detectAgentFromMessage,
  getAgentCapabilities,
  getAvailableVoices,
  getAgentVoice
} from '../config/ariaAgentTemplates.js';
import errorReportingService from '../services/errorReportingService.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Cached greeting audio (generated once on server start)
let cachedGreetingAudio = null;

// Active conversation tracking
const activeConversations = new Map();
const CONVERSATION_TIMEOUT = 60000; // 60 seconds of inactivity ends conversation

// OPTIMIZATION: Profile and CRM data cache (30 second TTL)
const profileCache = new Map();
const crmDataCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Initialize Aria capabilities with full CRM access
const ariaCapabilities = new AriaCapabilities({
  emailService: emailService, // Email sending capability via emailService
  twilioService: agentSMSService, // SMS sending capability via agentSMSService
  memoryStore: new Map(),
  models: {
    Lead,
    Message: TeamMessage,
    Call: CallLog,
    Contact,
    Appointment
  }
});

// OPTIMIZATION: Cache helper functions
function getCachedData(cache, key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(cache, key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Helper: Get or create conversation session
function getConversationSession(sessionId = 'default') {
  if (!activeConversations.has(sessionId)) {
    activeConversations.set(sessionId, {
      id: sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messages: [],
      metrics: [],
      conversationCount: 0
    });
    console.log(`🎬 [SESSION] New conversation started: ${sessionId}`);
  }

  const session = activeConversations.get(sessionId);
  session.lastActivity = Date.now();

  // Clear existing timeout
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }

  // Set new timeout to end conversation after inactivity
  session.timeoutId = setTimeout(() => {
    endConversation(sessionId);
  }, CONVERSATION_TIMEOUT);

  return session;
}

// Helper: End conversation and analyze
async function endConversation(sessionId) {
  const session = activeConversations.get(sessionId);
  if (!session) return;

  console.log(`🏁 [SESSION] Conversation ended: ${sessionId} (${session.conversationCount} exchanges)`);

  // Only analyze if there were actual exchanges
  if (session.conversationCount > 0) {
    console.log('📊 [SESSION] Triggering analysis...');

    // Calculate aggregate metrics
    const totalDuration = Date.now() - session.startTime;
    const avgTranscription = session.metrics.reduce((sum, m) => sum + (m.transcriptionTime || 0), 0) / session.metrics.length;
    const avgAi = session.metrics.reduce((sum, m) => sum + (m.aiResponseTime || 0), 0) / session.metrics.length;
    const avgVoice = session.metrics.reduce((sum, m) => sum + (m.voiceGenTime || 0), 0) / session.metrics.length;
    const avgTotal = session.metrics.reduce((sum, m) => sum + (m.totalTime || 0), 0) / session.metrics.length;

    const conversationData = {
      conversationId: sessionId,
      startTime: session.startTime,
      endTime: Date.now(),
      totalDuration,
      messages: session.messages,
      conversationCount: session.conversationCount,
      transcriptionTime: Math.round(avgTranscription),
      aiResponseTime: Math.round(avgAi),
      voiceGenTime: Math.round(avgVoice),
      totalTime: Math.round(avgTotal)
    };

    // Trigger analysis (async, don't wait)
    trainer.analyzeConversation(conversationData).catch(err => {
      console.error('❌ [TRAINER] Error analyzing conversation:', err.message);
    });
  }

  // Clean up
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }
  activeConversations.delete(sessionId);
}

// Helper: Detect conversation-ending phrases
function isConversationEnding(message) {
  const lower = message.toLowerCase().trim();
  const endingPhrases = [
    'goodbye', 'bye', 'good bye', 'see you', 'see ya',
    'talk later', 'talk to you later', 'ttyl',
    'have a good', 'take care', 'goodnight', 'good night',
    'that\'s all', 'that is all', 'i\'m done', 'all done',
    'thanks bye', 'thank you bye', 'stop listening'
  ];

  return endingPhrases.some(phrase => lower.includes(phrase));
}

// @desc    Get greeting audio (cached)
// @route   POST /api/voice/greeting
// @access  Public
router.post('/greeting', async (req, res) => {
  try {
    // Return cached greeting if available
    if (cachedGreetingAudio) {
      return res.json({
        success: true,
        audioBase64: cachedGreetingAudio
      });
    }

    // Generate greeting audio with error handling
    const greetingText = "Hey! I'm listening.";

    try {
      const voiceResponse = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL/stream',
        {
          text: greetingText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.7,
            style: 0.5,
            use_speaker_boost: true
          },
          optimize_streaming_latency: 4
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 5000 // Reduced timeout for greeting
        }
      );

      cachedGreetingAudio = Buffer.from(voiceResponse.data).toString('base64');

      res.json({
        success: true,
        audioBase64: cachedGreetingAudio
      });
    } catch (voiceError) {
      console.warn('ElevenLabs greeting failed, returning graceful fallback:', voiceError.message);
      // Return success but no audio - mobile app will skip greeting and start recording
      res.json({
        success: true,
        audioBase64: null,
        fallback: true
      });
    }
  } catch (error) {
    console.error('Greeting error:', error);
    // Return success with no audio instead of error - graceful degradation
    res.json({
      success: true,
      audioBase64: null,
      fallback: true
    });
  }
});

// @desc    Convert speech to text using OpenAI Whisper
// @route   POST /api/voice/transcribe
// @access  Public
router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64 } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ success: false, message: 'Audio data required' });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Create a file-like object for OpenAI
    const file = new File([audioBuffer], 'audio.m4a', { type: 'audio/m4a' });

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Force English transcription
    });

    console.log('Transcription:', transcription.text);

    res.json({
      success: true,
      text: transcription.text
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      success: false,
      message: 'Transcription failed',
      error: error.message
    });
  }
});

// @desc    Get AI response and generate voice
// @route   POST /api/voice/chat
// @access  Public
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message required' });
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a warm, friendly AI assistant named Aria integrated into the VoiceFlow AI mobile app.
You help users manage their business communications, leads, calls, and messages.

Voice conversation guidelines:
- Be natural and conversational, like talking to a friend
- Keep responses under 2 sentences (20-30 words max)
- Use contractions (I'm, you're, let's) for natural speech
- Be enthusiastic and personable
- Don't apologize unnecessarily
- Get straight to the point
- Use casual, friendly language
- ALWAYS respond in English only`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Get AI response from GPT-4o (faster than GPT-4)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 60,
      temperature: 0.8,
    });

    const aiResponse = completion.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Generate voice using ElevenLabs with optimized streaming settings
    const voiceResponse = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL/stream', // Bella - warm, expressive voice with streaming
      {
        text: aiResponse,
        model_id: 'eleven_turbo_v2_5', // Faster, more natural model
        voice_settings: {
          stability: 0.4,  // Slightly higher for clarity while keeping expression
          similarity_boost: 0.75,
          style: 0.6,  // More conversational style
          use_speaker_boost: true
        },
        optimize_streaming_latency: 3  // Max optimization for speed (0-4 scale)
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Convert audio to base64
    const audioBase64 = Buffer.from(voiceResponse.data).toString('base64');

    res.json({
      success: true,
      text: aiResponse,
      audioBase64: audioBase64,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Chat failed',
      error: error.message
    });
  }
});

// @desc    Combined endpoint: transcribe + chat + voice generation (OPTIMIZED)
// @route   POST /api/voice/process
// @access  Public (with optional auth for personalization)
router.post('/process', optionalAuth, async (req, res) => {
  try {
    const startTime = Date.now();
    const { audioBase64, conversationHistory = [] } = req.body;

    console.log(`[TIMING] ====== NEW REQUEST ======`);
    console.log(`[TIMING] Audio size: ${audioBase64?.length || 0} chars`);

    // Extract user info from authenticated token if available
    const authenticatedUser = req.user;
    if (authenticatedUser) {
      console.log(`[AUTH] Authenticated user: ${authenticatedUser.name} (${authenticatedUser._id})`);
    } else {
      console.log(`[AUTH] No authenticated user - using defaults`);
    }

    if (!audioBase64) {
      return res.status(400).json({ success: false, message: 'Audio data required' });
    }

    // Step 1: Transcribe audio (OPTIMIZED)
    console.log('[TIMING] Step 1: Starting transcription...');
    const transcribeStart = Date.now();
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    console.log(`[TIMING] Audio buffer size: ${audioBuffer.length} bytes`);
    const file = new File([audioBuffer], 'audio.m4a', { type: 'audio/m4a' });

    // Use faster whisper settings with transcription prompt for context
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text', // Faster - just text, no timestamps
      prompt: 'This is a voice assistant conversation. Common commands include: send text message, send SMS, send email, create estimate, create quote, create invoice, book appointment, search contacts. When the user says "text" they usually mean SMS text message, not "test".'
    });

    // response_format: 'text' returns string directly
    const userMessage = typeof transcription === 'string' ? transcription : transcription.text;
    const transcriptionTime = Date.now() - transcribeStart;
    console.log(`[TIMING] Transcription took ${transcriptionTime}ms`);
    console.log('User said:', userMessage);

    // Track conversation session - use authenticated user ID if available
    const userId = authenticatedUser?._id?.toString() || req.body.userId || 'default';
    const sessionId = authenticatedUser?._id?.toString() || req.body.sessionId || 'default';

    // Get user's name from authenticated profile
    const authenticatedUserName = authenticatedUser?.name?.split(' ')[0] || null;

    // BACKGROUND NOISE FILTER - skip storing junk transcriptions
    const backgroundNoisePatterns = [
      /^thanks for watching/i,
      /^please use earphones/i,
      /^subscribe/i,
      /^link in (the )?description/i,
      /^like and subscribe/i,
      /^hit the bell/i,
      /^(um+|uh+|ah+|oh+|hmm+)$/i,
      /^\.+$/,
      /^$/
    ];

    const isBackgroundNoise = backgroundNoisePatterns.some(p => p.test(userMessage.trim())) ||
                              userMessage.trim().length < 3;

    if (isBackgroundNoise) {
      console.log(`🔇 [NOISE] Skipping background noise: "${userMessage}"`);
      // Return minimal response without audio - just acknowledge silently
      // Don't say "Still here" - just skip this entirely and wait for real speech
      return res.json({
        success: true,
        userMessage: userMessage,
        aiMessage: null,  // No spoken response for noise
        audioBase64: null,
        conversationHistory: conversationHistory,
        isBackgroundNoise: true,
        skipAudio: true  // Signal to mobile app to not play anything
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // VOICE AGENT DETECTION & ROUTING
    // Detect if user is addressing a specific agent (e.g., "hey sales", "project update")
    // ═══════════════════════════════════════════════════════════════════
    const selectedAgentId = req.body.agentId || null; // Agent selected in UI
    const agentDetection = detectAgentFromMessage(userMessage);

    // Use UI-selected agent or detected agent from trigger words
    const activeAgentId = selectedAgentId || agentDetection.agentId;
    const activeAgent = getAgentTemplate(activeAgentId);
    const processedMessage = selectedAgentId ? userMessage : agentDetection.cleanedMessage;

    console.log(`🤖 [AGENT] Active agent: ${activeAgent.name} (${activeAgentId})`);
    if (agentDetection.agentId !== 'aria' && !selectedAgentId) {
      console.log(`🎯 [AGENT] Detected from trigger word, cleaned message: "${processedMessage}"`);
    }

    // Old session tracking
    const session = getConversationSession(sessionId);
    session.messages.push({ role: 'user', content: userMessage });

    // New persistent conversation tracking - only store meaningful messages
    await ariaMemoryService.addMessage(sessionId, 'user', userMessage, {
      transcriptionTime,
      agentId: activeAgentId
    });

    // Detect and extract user's name from introduction patterns
    // Only match explicit introductions, not wake word patterns
    const namePatterns = [
      /(?:my name is|i'm|im|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /^([A-Z][a-z]+)\s+(?:here|speaking)(?:\s|$)/i  // "Josh here" or "Josh speaking" only
    ];

    // Names to exclude (AI assistant names, filler words, and common false positives)
    const excludedNames = [
      'aria', 'arya', 'area',  // AI name variants
      'hey', 'hi', 'hello', 'yo',  // Greetings
      'ok', 'okay', 'sure', 'yes', 'no', 'yeah', 'yep', 'nope',  // Responses
      'uh', 'um', 'ah', 'oh', 'eh', 'hmm', 'hm', 'uhh', 'umm',  // Filler sounds
      'i', 'you', 'we', 'they', 'it', 'the', 'a', 'an'  // Common words
    ];

    for (const pattern of namePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();

        // Skip if it's an excluded name (like the AI's name)
        if (excludedNames.includes(name.toLowerCase())) {
          console.log(`👤 [NAME] Skipping excluded name: ${name}`);
          continue;
        }

        console.log(`👤 [NAME] Detected user name: ${name}`);

        // Store name as high-priority memory
        await ariaMemoryService.storeMemory(userId, 'user_name', name, {
          category: 'personal',
          importance: 10,
          sessionId,
          source: 'name_detection'
        });

        break;
      }
    }

    // Check if conversation is ending
    if (isConversationEnding(userMessage)) {
      console.log('👋 [SESSION] User ending conversation');
      // End both conversation systems
      setTimeout(async () => {
        await endConversation(sessionId);
        await ariaMemoryService.endConversation(sessionId);

        // Send Slack notification
        ariaSlackService.logEvent('conversation_end', `Session ${sessionId} ended`).catch(() => {});
      }, 5000);
    }

    // Log voice interaction
    logBuffer.addLog('voice', 'Transcription completed', {
      userMessage,
      transcriptionTime,
      audioLength: audioBuffer.length
    });

    // Check for special commands
    const lowerMessage = userMessage.toLowerCase();

    // Check for log capture commands (e.g., "Aria, save logs for improvement")
    const isLogCommand = lowerMessage.includes('save log') ||
                         lowerMessage.includes('capture log') ||
                         lowerMessage.includes('send to claude') ||
                         lowerMessage.includes('improve this');

    if (isLogCommand) {
      console.log('📋 LOG CAPTURE COMMAND DETECTED');

      // Capture recent logs
      const snippet = logBuffer.captureSnippet('User-requested log capture', 'voice', 30);

      // Extract improvement request from message
      const improvementRequest = userMessage
        .replace(/save log[s]?/gi, '')
        .replace(/capture log[s]?/gi, '')
        .replace(/send to claude/gi, '')
        .replace(/improve this/gi, '')
        .replace(/aria[,.]?/gi, '')
        .trim() || 'Review recent voice interactions and suggest improvements';

      // Save command for Claude Code
      const commandId = saveClaudeCommand(
        `Review Aria voice assistant logs and ${improvementRequest}`,
        snippet.logs,
        {
          category: 'voice_improvement',
          userRequest: improvementRequest,
          conversationHistory: conversationHistory.slice(-5)
        }
      );

      const confirmationText = `I've captured the logs and sent them to Claude Code for improvement.`;

      console.log(`✅ Log snippet saved with command ID: ${commandId}`);

      return res.json({
        success: true,
        userMessage: userMessage,
        aiMessage: confirmationText,
        audioBase64: null,
        isDevCommand: true,
        commandId: commandId,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: confirmationText }
        ]
      });
    }

    // Check for dev mode command (starts with "copilot")
    const isDevCommand = lowerMessage.startsWith('copilot') ||
                         lowerMessage.startsWith('co pilot') ||
                         lowerMessage.startsWith('co-pilot');

    if (isDevCommand) {
      console.log('🔧 DEV MODE COMMAND DETECTED');
      // Extract the actual command (remove the trigger phrase)
      const command = userMessage
        .replace(/^(copilot|co pilot|co-pilot)[,.\s]*/i, '')
        .trim();

      // Save to dev command queue
      const fs = await import('fs');
      const path = await import('path');
      const queuePath = path.join(process.cwd(), 'dev-command-queue.json');

      let queue = { commands: [], results: [] };
      if (fs.existsSync(queuePath)) {
        queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      }

      const newCommand = {
        id: Date.now().toString(),
        command,
        transcription: userMessage,
        timestamp: new Date().toISOString(),
        status: 'pending',
        executed: false
      };

      queue.commands.push(newCommand);
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      console.log(`📝 Dev command queued: "${command}"`);

      // Skip voice generation for dev commands - just send silent confirmation
      const confirmationText = `Command sent to Copilot: "${command}"`;

      console.log(`[TIMING] Total process time: ${Date.now() - startTime}ms`);

      return res.json({
        success: true,
        userMessage: userMessage,
        aiMessage: confirmationText,
        audioBase64: null, // No audio for dev commands
        isDevCommand: true,
        commandId: newCommand.id,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: confirmationText }
        ]
      });
    }

    // Step 2: Get AI response (OPTIMIZED - faster model, lower tokens)
    console.log('[TIMING] Step 2: Starting AI response generation...');
    const aiStart = Date.now();

    // Get current date/time for context
    const now = new Date();

    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    console.log('[DATE] Current date/time being sent to AI:', currentDateTime);

    // OPTIMIZED: Get user profile with caching
    let userProfile = getCachedData(profileCache, userId);
    if (!userProfile) {
      console.log('[CACHE] Profile cache miss, fetching from DB');
      userProfile = await UserProfile.findOne({ userId });
      if (!userProfile) {
        userProfile = await UserProfile.create({ userId });
      }
      setCachedData(profileCache, userId, userProfile);
    } else {
      console.log('[CACHE] Profile cache hit!');
    }

    // OPTIMIZATION: Skip expensive memory recall for simple conversational queries
    // Only do full memory lookup for queries that likely need context
    const needsDeepMemory = lowerMessage.includes('remember') ||
                            lowerMessage.includes('earlier') ||
                            lowerMessage.includes('before') ||
                            lowerMessage.includes('last time') ||
                            lowerMessage.includes('you said') ||
                            lowerMessage.includes('what did');

    // Get conversation context - use fast mode for most queries
    const context = await ariaMemoryService.getConversationContext(sessionId, userId, {
      skipMemoryRecall: !needsDeepMemory // Skip semantic search unless needed
    });

    // OPTIMIZED: Get CRM data for context with caching
    let crmContext = '';
    const crmCacheKey = 'global_crm_data';
    let crmData = getCachedData(crmDataCache, crmCacheKey);

    if (!crmData) {
      console.log('[CACHE] CRM cache miss, fetching from DB');
      try {
        const recentLeads = await Lead.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name email phone status source createdAt');

        const recentCalls = await CallLog.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .select('contactName direction duration createdAt outcome');

        const totalLeads = await Lead.countDocuments();
        const newLeads = await Lead.countDocuments({ status: 'new' });
        const hotLeads = await Lead.countDocuments({ status: 'hot' });

        crmData = { recentLeads, recentCalls, totalLeads, newLeads, hotLeads };
        setCachedData(crmDataCache, crmCacheKey, crmData);
      } catch (crmError) {
        console.warn('[CRM] Error fetching CRM context:', crmError.message);
        crmData = { recentLeads: [], recentCalls: [], totalLeads: 0, newLeads: 0, hotLeads: 0 };
      }
    } else {
      console.log('[CACHE] CRM cache hit!');
    }

    // Build CRM context string from cached data
    if (crmData.recentLeads && crmData.recentLeads.length > 0) {
      crmContext += '\n\nRECENT LEADS IN CRM:\n';
      crmData.recentLeads.forEach(lead => {
        crmContext += `- ${lead.name}${lead.status ? ` (${lead.status})` : ''}${lead.phone ? `, ${lead.phone}` : ''}\n`;
      });
    }

    if (crmData.recentCalls && crmData.recentCalls.length > 0) {
      crmContext += '\nRECENT CALLS:\n';
      crmData.recentCalls.forEach(call => {
        const mins = call.duration ? Math.round(call.duration / 60) : 0;
        crmContext += `- ${call.contactName || 'Unknown'} (${call.direction || 'call'}, ${mins} min)${call.outcome ? ` - ${call.outcome}` : ''}\n`;
      });
    }

    if (crmData.totalLeads > 0) {
      crmContext += `\nCRM STATS: ${crmData.totalLeads} total leads, ${crmData.newLeads} new, ${crmData.hotLeads} hot\n`;
    }

    // ENHANCED: Get RAG knowledge context if message seems like a question
    let ragContext = '';
    try {
      const ragResult = await ariaIntegrationService.searchKnowledge(userId, userMessage, { limit: 3 });
      if (ragResult.success && ragResult.results && ragResult.results.length > 0) {
        ragContext = '\n\nKNOWLEDGE BASE:\n';
        ragResult.results.forEach((result, idx) => {
          const content = result.content?.slice(0, 200) || result.summary || '';
          if (content) {
            ragContext += `${idx + 1}. ${content}...\n`;
          }
        });
        console.log(`[RAG] Found ${ragResult.results.length} relevant knowledge items`);
      }
    } catch (ragError) {
      console.log('[RAG] Knowledge search skipped:', ragError.message);
    }

    // Build context string from memories
    let memoryContext = '';
    let conversationGoal = '';
    // Priority for user name: 1) Authenticated user, 2) Profile firstName, 3) Memory, 4) Fallback
    let userName = authenticatedUserName || 'there';  // Default to 'there' if no name available
    let userPreferences = '';

    // Add profile context
    if (userProfile.personalInfo) {
      if (userProfile.personalInfo.firstName && !authenticatedUserName) {
        userName = userProfile.personalInfo.firstName;
      }
      if (userProfile.personalInfo.bio) {
        memoryContext += `\n\nUSER PROFILE:\n- Bio: ${userProfile.personalInfo.bio}\n`;
      }
    }

    // Log resolved user name for debugging
    console.log(`[AUTH] Using name: ${userName} (source: ${authenticatedUserName ? 'authenticated' : userProfile.personalInfo?.firstName ? 'profile' : 'default'})`);

    // Add work context
    if (userProfile.workInfo && userProfile.workInfo.company) {
      memoryContext += `- Works at: ${userProfile.workInfo.company}${userProfile.workInfo.position ? ` as ${userProfile.workInfo.position}` : ''}\n`;
    }

    // Add interests
    if (userProfile.interests && userProfile.interests.topics && userProfile.interests.topics.length > 0) {
      memoryContext += `- Interests: ${userProfile.interests.topics.slice(0, 5).join(', ')}\n`;
    }

    // Add Aria preferences
    if (userProfile.ariaPreferences) {
      const prefs = userProfile.ariaPreferences;
      userPreferences = `\n\nUSER PREFERENCES:\n- Voice style: ${prefs.voiceStyle || 'friendly'}\n- Response length: ${prefs.responseLength || 'normal'}\n- Personality: ${prefs.personality || 'helpful'}\n`;

      if (prefs.autoCallBack && prefs.autoCallBack.enabled) {
        userPreferences += `- Auto callback enabled (${prefs.autoCallBack.delayMinutes} min delay)\n`;
      }
    }

    if (context.memories && context.memories.length > 0) {
      memoryContext += '\n\nRELEVANT MEMORIES:\n';
      context.memories.forEach(mem => {
        // Use memory-based name only if no authenticated user name
        if (mem.key === 'user_name') {
          if (!authenticatedUserName && userName === 'there') {
            userName = mem.value;
            console.log(`[NAME] Using memory name: ${mem.value}`);
          } else {
            console.log(`[NAME] Ignoring memory name: ${mem.value}, using: ${userName}`);
          }
        }
        // Check for conversation goal
        else if (mem.key.startsWith('conversation_goal_')) {
          conversationGoal = `\n\nCONVERSATION GOAL: ${mem.value}\nStay focused on helping achieve this goal. Gently redirect if the conversation drifts off-topic.\n`;
        } else {
          memoryContext += `- ${mem.key}: ${mem.value}\n`;
        }
      });
    }

    // Add conversation summary if available
    let conversationSummary = '';
    if (context.summary) {
      conversationSummary = `\n\nCONVERSATION SO FAR: ${context.summary}\n`;
    }

    // Build conversation history - limit to last 10 messages for better recall
    // (5 user + 5 assistant exchanges)
    const storedMessages = context.messages || [];
    const recentHistory = storedMessages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Merge stored history with request history (prefer stored for context)
    const mergedHistory = recentHistory.length > conversationHistory.length
      ? recentHistory
      : conversationHistory;

    // Extract the LAST exchange to show what was just discussed (critical for following along)
    let lastExchange = '';
    let currentTask = '';
    if (mergedHistory.length >= 2) {
      // Find the last user message and assistant response
      for (let i = mergedHistory.length - 1; i >= 0; i--) {
        if (mergedHistory[i].role === 'assistant' && !lastExchange) {
          lastExchange = `YOUR LAST RESPONSE: "${mergedHistory[i].content}"`;
        }
        if (mergedHistory[i].role === 'user' && lastExchange && !currentTask) {
          lastExchange = `${userName.toUpperCase()}'S LAST MESSAGE: "${mergedHistory[i].content}"\n${lastExchange}`;
          break;
        }
      }

      // Detect if there's an ongoing task from the conversation
      const lastAssistantMsg = mergedHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
      if (lastAssistantMsg.includes('?')) {
        // Assistant asked a question - we're waiting for an answer
        currentTask = `WAITING FOR ANSWER - ${userName} is responding to your question. Use their answer to continue the task.`;
      } else if (lastAssistantMsg.toLowerCase().includes('client') || lastAssistantMsg.toLowerCase().includes('lead')) {
        currentTask = 'TASK IN PROGRESS - Creating a client/lead. Continue collecting info or execute.';
      } else if (lastAssistantMsg.toLowerCase().includes('estimate') || lastAssistantMsg.toLowerCase().includes('quote')) {
        currentTask = 'TASK IN PROGRESS - Creating an estimate. Continue collecting info or execute.';
      }
    }

    // Build profile context string (make it prominent and actionable)
    let profileContext = '\n\nUSER PROFILE:\n';
    profileContext += `- Owner: ${userName} (ALWAYS use this name)\n`;
    profileContext += `- Company: Surprise Granite (countertops & remodeling, Arizona)\n`;

    if (userProfile.personalInfo) {
      if (userProfile.personalInfo.email) {
        profileContext += `- Email: ${userProfile.personalInfo.email}\n`;
      }
      if (userProfile.personalInfo.phone) {
        profileContext += `- Phone: ${userProfile.personalInfo.phone}\n`;
      }
    }

    if (userProfile.workInfo) {
      if (userProfile.workInfo.workHours) {
        profileContext += `- Work hours: ${userProfile.workInfo.workHours.start || '8AM'} - ${userProfile.workInfo.workHours.end || '5PM'}\n`;
      }
    }

    if (userProfile.ariaPreferences) {
      profileContext += `- Preferred style: ${userProfile.ariaPreferences.voiceStyle || 'friendly'}, ${userProfile.ariaPreferences.responseLength || 'concise'}\n`;
    }

    // ═══════════════════════════════════════════════════════════════════
    // BUILD AGENT-SPECIFIC SYSTEM PROMPT
    // Each agent has its own personality and capabilities
    // ═══════════════════════════════════════════════════════════════════
    const agentSystemPrompt = activeAgent.systemPrompt || '';
    const agentName = activeAgent.name || 'Aria';

    const messages = [
      {
        role: 'system',
        content: `${agentSystemPrompt}

CURRENT USER: ${userName}
${currentTask ? `ACTIVE TASK: ${currentTask}` : ''}
${profileContext}

Remember: Keep responses brief (15-25 words max for voice). Use contractions. Be natural.`
      },
      ...mergedHistory,
      {
        role: 'user',
        content: processedMessage  // Use cleaned message (trigger words removed)
      }
    ];

    console.log(`🎭 [AGENT] Using ${agentName} personality`);

    // Log conversation history for debugging
    console.log(`[CONTEXT] Merged history has ${mergedHistory.length} messages (stored: ${storedMessages.length}, request: ${conversationHistory.length})`);
    if (mergedHistory.length > 0) {
      console.log('[CONTEXT] Last 3 messages in history:');
      mergedHistory.slice(-3).forEach((m, i) => {
        console.log(`  [${m.role}]: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`);
      });
    }

    // Check if message likely needs capabilities (optimization)
    const lowerUserMessage = userMessage.toLowerCase();

    // Explicit action commands that MUST use tools (force tool_choice = 'required')
    const forceToolUsage =
      (lowerUserMessage.includes('send') && (lowerUserMessage.includes('text') || lowerUserMessage.includes('sms') || lowerUserMessage.includes('message'))) ||
      (lowerUserMessage.includes('send') && lowerUserMessage.includes('email')) ||
      lowerUserMessage.includes('search the web') ||
      lowerUserMessage.includes('look up') ||
      lowerUserMessage.includes('google') ||
      lowerUserMessage.includes('create estimate') ||
      lowerUserMessage.includes('create quote') ||
      lowerUserMessage.includes('create invoice') ||
      lowerUserMessage.includes('book appointment') ||
      lowerUserMessage.includes('schedule appointment') ||
      lowerUserMessage.includes('create a client') ||
      lowerUserMessage.includes('add a client') ||
      lowerUserMessage.includes('new client') ||
      lowerUserMessage.includes('create lead') ||
      lowerUserMessage.includes('add lead') ||
      lowerUserMessage.includes('new lead');

    // General capability detection (use tools but don't force)
    const needsCapabilities =
      forceToolUsage ||
      lowerUserMessage.includes('send') ||
      lowerUserMessage.includes('email') ||
      lowerUserMessage.includes('text') ||
      lowerUserMessage.includes('sms') ||
      lowerUserMessage.includes('search') ||
      lowerUserMessage.includes('look up') ||
      lowerUserMessage.includes('find') ||
      lowerUserMessage.includes('remember') ||
      lowerUserMessage.includes('recall') ||
      lowerUserMessage.includes('notify') ||
      lowerUserMessage.includes('remind') ||
      lowerUserMessage.includes('lead') ||
      lowerUserMessage.includes('contact') ||
      lowerUserMessage.includes('call') ||
      lowerUserMessage.includes('estimate') ||
      lowerUserMessage.includes('quote') ||
      lowerUserMessage.includes('invoice') ||
      lowerUserMessage.includes('bill') ||
      lowerUserMessage.includes('appointment') ||
      lowerUserMessage.includes('schedule') ||
      lowerUserMessage.includes('book') ||
      lowerUserMessage.includes('calendar') ||
      lowerUserMessage.includes('web') ||
      lowerUserMessage.includes('website') ||
      lowerUserMessage.includes('url') ||
      lowerUserMessage.includes('show me') ||
      lowerUserMessage.includes('pull up') ||
      lowerUserMessage.includes('get me') ||
      lowerUserMessage.includes('list') ||
      lowerUserMessage.includes('recent') ||
      lowerUserMessage.includes('clients') ||
      lowerUserMessage.includes('customers');

    // Use gpt-4o-mini for faster voice response (speed > reasoning for voice)
    // For complex tasks that require better reasoning, use gpt-4o
    const useSmartModel = forceToolUsage || lowerUserMessage.includes('analyze') || lowerUserMessage.includes('explain');
    const completionOptions = {
      model: useSmartModel ? 'gpt-4o' : 'gpt-4o-mini',  // mini for speed, full for complex tasks
      messages: messages,
      max_tokens: useSmartModel ? 400 : 150, // Shorter for voice responses
      temperature: 0.7,
    };

    // Only add tools if the message suggests capability use
    // Filter capabilities based on active agent's allowed capabilities
    if (needsCapabilities) {
      const allCapabilityDefs = getCapabilityDefinitions();
      const agentCapabilityNames = getAgentCapabilities(activeAgentId, capabilities);

      // Filter to only agent's allowed capabilities
      const filteredCapabilities = activeAgent.capabilities === 'all'
        ? allCapabilityDefs
        : allCapabilityDefs.filter(cap => agentCapabilityNames.includes(cap.name));

      completionOptions.tools = filteredCapabilities.map(cap => ({
        type: 'function',
        function: cap
      }));

      // Force tool usage for explicit action commands
      completionOptions.tool_choice = forceToolUsage ? 'required' : 'auto';
      console.log(`🔧 [TOOLS] ${agentName} has ${filteredCapabilities.length} capabilities enabled, tool_choice: ${completionOptions.tool_choice}`);
    }

    const completion = await openai.chat.completions.create(completionOptions);

    let aiResponse = completion.choices[0].message.content;
    const toolCalls = completion.choices[0].message.tool_calls;

    // Track UI actions for mobile display
    let uiAction = null;

    // Handle function/capability calls
    if (toolCalls && toolCalls.length > 0) {
      console.log(`🔧 [CAPABILITIES] AI requested ${toolCalls.length} capability calls`);

      const toolResults = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let args;
        let result;

        try {
          // Parse tool call arguments with error handling
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (parseError) {
            console.error(`❌ [CAPABILITY] JSON parse error for ${functionName}:`, parseError.message);
            console.error(`❌ [CAPABILITY] Raw arguments: ${toolCall.function.arguments}`);
            // Try to extract what we can from malformed JSON
            args = {};
            result = { success: false, error: `Invalid JSON in tool call: ${parseError.message}` };
            continue;
          }

          console.log(`⚡ [CAPABILITY] Executing: ${functionName}`, args);

          result = await ariaCapabilities.execute(functionName, args);

          // Generate UI action based on capability type
          if (functionName === 'send_sms' || functionName === 'sendSMS') {
            uiAction = {
              type: 'confirm_sms',
              data: {
                to: args.to || args.phoneNumber,
                message: args.message || args.body,
                contactName: args.contactName,
                status: result.success ? 'sent' : 'failed',
                result: result
              }
            };
          } else if (functionName === 'send_email' || functionName === 'sendEmail') {
            uiAction = {
              type: 'confirm_email',
              data: {
                to: args.to || args.email,
                subject: args.subject,
                body: args.body || args.message,
                status: result.success ? 'sent' : 'failed',
                result: result
              }
            };
          } else if (functionName === 'search_leads' || functionName === 'searchLeads' || functionName === 'get_leads' || functionName === 'get_recent_leads') {
            uiAction = {
              type: 'show_list',
              listType: 'leads',
              data: {
                items: result.leads || result.data || [],
                query: args.query || args.searchTerm || 'recent',
                count: result.count || (result.leads?.length || 0)
              }
            };
          } else if (functionName === 'search_contacts' || functionName === 'searchContacts' || functionName === 'get_contacts' || functionName === 'get_contact_details') {
            uiAction = {
              type: 'show_list',
              listType: 'contacts',
              data: {
                items: result.contacts || result.contact ? [result.contact] : result.data || [],
                query: args.query || args.searchTerm || 'search',
                count: result.count || (result.contacts?.length || result.contact ? 1 : 0)
              }
            };
          } else if (functionName === 'get_contact_history') {
            uiAction = {
              type: 'show_history',
              data: {
                contact: args.contactIdentifier,
                history: result.history || result.data || [],
                count: result.count || (result.history?.length || 0)
              }
            };
          } else if (functionName === 'get_appointments' || functionName === 'searchAppointments') {
            uiAction = {
              type: 'show_list',
              listType: 'appointments',
              data: {
                items: result.appointments || result.data || [],
                count: result.count || (result.appointments?.length || 0)
              }
            };
          } else if (functionName === 'create_appointment' || functionName === 'schedule_appointment') {
            uiAction = {
              type: 'confirm_appointment',
              data: {
                appointment: result.appointment || args,
                status: result.success ? 'scheduled' : 'failed',
                result: result
              }
            };
          } else if (functionName === 'remember' || functionName === 'store_memory') {
            uiAction = {
              type: 'confirm_memory',
              data: {
                key: args.key,
                value: args.value,
                status: result.success ? 'saved' : 'failed'
              }
            };
          }

        } catch (error) {
          console.error(`❌ [CAPABILITY] Error executing ${functionName}:`, error.message);
          result = {
            success: false,
            error: error.message,
            summary: `Failed to execute ${functionName}: ${error.message}`
          };

          // Set error UI action
          uiAction = {
            type: 'error',
            data: {
              action: functionName,
              message: error.message
            }
          };
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result)
        });
      }

      // Get final response after tool execution
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          ...messages,
          completion.choices[0].message,
          ...toolResults
        ],
        max_tokens: 80, // Same as main response for consistent capability confirmations
        temperature: 0.8
      });

      aiResponse = finalCompletion.choices[0].message.content;
      console.log('✅ [CAPABILITIES] Tool-enhanced response generated');
      if (uiAction) {
        console.log('📱 [UI_ACTION] Sending UI action:', uiAction.type);
      }
    }
    const aiResponseTime = Date.now() - aiStart;
    console.log(`[TIMING] AI response took ${aiResponseTime}ms`);
    console.log('AI Response:', aiResponse);

    // Log AI interaction
    logBuffer.addLog('performance', 'AI response generated', {
      responseTime: aiResponseTime,
      responseLength: aiResponse.length,
      model: 'gpt-4o-mini'
    });

    // Step 3: Generate voice using TTS Service (supports ElevenLabs, XTTS, Piper)
    console.log('[TIMING] Step 3: Starting voice generation...');
    const voiceStart = Date.now();

    // Get user's preferred voice or use default
    const preferredVoiceId = userProfile?.ariaPreferences?.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL';
    const voiceStyle = userProfile?.ariaPreferences?.voiceStyle || 'friendly';

    // Convert ElevenLabs voice ID to voice name for TTS service
    const voiceName = ttsService.voiceIdToName(preferredVoiceId);

    console.log(`[VOICE] Using voice: ${voiceName} (${preferredVoiceId}), style: ${voiceStyle}, provider: ${ttsService.provider}`);

    // Generate audio using TTS service (handles provider switching automatically)
    const audioBase64Result = await ttsService.synthesizeBase64(aiResponse, {
      voice: voiceName,
      style: voiceStyle
    });
    const voiceGenTime = Date.now() - voiceStart;
    const totalTime = Date.now() - startTime;

    console.log(`[TIMING] Voice generation took ${voiceGenTime}ms`);
    console.log(`[TIMING] ====== TOTAL: ${totalTime}ms ======`);
    console.log(`[TIMING] Breakdown: Transcription=${transcriptionTime}ms, AI=${aiResponseTime}ms, Voice=${voiceGenTime}ms`);

    // Track in session
    session.messages.push({ role: 'assistant', content: aiResponse });
    session.conversationCount++;

    // IMPORTANT: Store assistant response in persistent memory for recall
    await ariaMemoryService.addMessage(sessionId, 'assistant', aiResponse, {
      aiResponseTime,
      voiceGenTime
    });
    session.metrics.push({
      transcriptionTime,
      aiResponseTime,
      voiceGenTime,
      totalTime
    });

    // Log complete interaction with performance metrics
    logBuffer.addLog('conversation', 'Voice interaction completed', {
      userMessage,
      aiResponse,
      transcriptionTime,
      aiResponseTime,
      voiceGenTime,
      totalTime
    });

    // AUTO-SAVE: Save every conversation to disk for analysis
    autoSaveConversation({
      userMessage,
      aiResponse,
      transcriptionTime,
      aiResponseTime,
      voiceGenTime,
      totalTime,
      conversationLength: conversationHistory.length,
      model: 'gpt-4o-mini',
      voiceModel: 'eleven_turbo_v2_5'
    });

    res.json({
      success: true,
      userMessage: userMessage,
      aiMessage: aiResponse,
      audioBase64: audioBase64Result,
      uiAction: uiAction, // UI action for mobile display (lists, confirmations, drafts)
      // Active agent info for UI display
      agent: {
        id: activeAgentId,
        name: activeAgent.name,
        icon: activeAgent.icon,
        personality: activeAgent.personality
      },
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      ]
    });
  } catch (error) {
    console.error('Process error:', error);

    // Log error for debugging
    logBuffer.addLog('error', 'Voice processing failed', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.name
    });

    res.status(500).json({
      success: false,
      message: 'Processing failed',
      error: error.message
    });
  }
});

// @desc    Get conversation analytics for Claude Code
// @route   GET /api/voice/analytics
// @access  Public (for development)
router.get('/analytics', (req, res) => {
  try {
    const analysis = analyzeAndSuggest();

    if (!analysis) {
      return res.json({
        success: true,
        message: 'No conversations logged yet today'
      });
    }

    // Create improvement suggestions based on data
    const suggestions = [];

    if (analysis.avgTotalTime > 4000) {
      suggestions.push({
        priority: 'high',
        issue: 'High average response time',
        current: `${analysis.avgTotalTime}ms`,
        target: '< 3000ms',
        suggestion: 'Consider optimizing transcription or TTS settings'
      });
    }

    if (analysis.errorCount > 0) {
      suggestions.push({
        priority: 'critical',
        issue: 'Errors detected',
        count: analysis.errorCount,
        suggestion: 'Review error logs and implement fixes'
      });
    }

    if (analysis.slowCount > analysis.totalConversations * 0.3) {
      suggestions.push({
        priority: 'medium',
        issue: 'Many slow responses',
        percentage: `${Math.round((analysis.slowCount / analysis.totalConversations) * 100)}%`,
        suggestion: 'Investigate network or API latency issues'
      });
    }

    res.json({
      success: true,
      analysis,
      suggestions,
      message: 'Conversation analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics',
      error: error.message
    });
  }
});

// @desc    Get training statistics
// @desc    Get TTS service status and available voices
// @route   GET /api/voice/tts-status
// @access  Public
router.get('/tts-status', async (req, res) => {
  try {
    const health = await ttsService.healthCheck();
    const voices = ttsService.getAvailableVoices();

    res.json({
      success: true,
      ...health,
      voices
    });
  } catch (error) {
    console.error('TTS status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get TTS status',
      error: error.message
    });
  }
});

// @desc    Switch TTS provider at runtime
// @route   POST /api/voice/tts-provider
// @access  Public (should be protected in production)
router.post('/tts-provider', (req, res) => {
  try {
    const { provider, fallback } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required'
      });
    }

    ttsService.setProvider(provider, fallback);

    res.json({
      success: true,
      message: `TTS provider switched to ${provider}`,
      fallback: fallback || null
    });
  } catch (error) {
    console.error('TTS provider switch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to switch TTS provider',
      error: error.message
    });
  }
});

// @route   GET /api/voice/training-stats
// @access  Public (for development)
router.get('/training-stats', (req, res) => {
  try {
    const stats = trainer.getTrainingStats();
    const optimizedPrompt = trainer.generateOptimizedPrompt();

    res.json({
      success: true,
      stats,
      optimizedPrompt,
      activeConversations: activeConversations.size,
      message: 'Training statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Training stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve training stats',
      error: error.message
    });
  }
});

// @desc    Manually end a conversation and trigger analysis
// @route   POST /api/voice/end-conversation
// @access  Public
router.post('/end-conversation', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    await endConversation(sessionId);

    res.json({
      success: true,
      message: `Conversation ${sessionId} ended and analyzed`
    });
  } catch (error) {
    console.error('End conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end conversation',
      error: error.message
    });
  }
});

// @desc    Get memory statistics
// @route   GET /api/voice/memory-stats
// @access  Public
router.get('/memory-stats', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const stats = await ariaMemoryService.getMemoryStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Memory stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Get conversation context
// @route   GET /api/voice/context/:sessionId
// @access  Public
router.get('/context/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId = 'default' } = req.query;

    const context = await ariaMemoryService.getConversationContext(sessionId, userId);

    res.json({
      success: true,
      context
    });
  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Set conversation goal
// @route   POST /api/voice/set-goal
// @access  Public
router.post('/set-goal', async (req, res) => {
  try {
    const { sessionId, goal, userId = 'default' } = req.body;

    // Store goal as high-priority memory
    await ariaMemoryService.storeMemory(userId, `conversation_goal_${sessionId}`, goal, {
      category: 'context',
      importance: 10,
      sessionId,
      source: 'goal_setting'
    });

    res.json({
      success: true,
      message: `Goal set: ${goal}`
    });
  } catch (error) {
    console.error('Set goal error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Get ephemeral token for OpenAI Realtime API (WebRTC)
// @route   POST /api/voice/realtime-token
// @access  Private (requires auth)
router.post('/realtime-token', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const userName = req.user?.firstName || 'User';

    console.log(`🔐 [REALTIME] Generating ephemeral token for user: ${userName}`);

    // Create ephemeral token using OpenAI's realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer', // Options: alloy, echo, fable, onyx, nova, shimmer - shimmer is warm & expressive
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [REALTIME] Failed to get ephemeral token:', errorText);
      throw new Error(`Failed to get ephemeral token: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [REALTIME] Ephemeral token generated successfully');

    res.json({
      success: true,
      client_secret: data.client_secret,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error('❌ [REALTIME] Token generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Get Aria's system instructions and tools for Realtime API
// @route   GET /api/voice/realtime-config
// @access  Private (requires auth)
router.get('/realtime-config', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || 'default';
    const userName = req.user?.firstName || 'User';
    const companyName = req.user?.company || 'Surprise Granite';

    // Get agent ID from query params
    const agentId = req.query.agentId || 'aria';
    const agent = getAgentTemplate(agentId);

    console.log(`🤖 [REALTIME-CONFIG] Building config for agent: ${agent.name} (${agentId})`);

    // Build agent-specific instructions for the Realtime API
    const instructions = agent.systemPrompt
      ? `${agent.systemPrompt}

CURRENT USER: ${userName}
COMPANY: ${companyName}

Remember: Keep responses brief (2-3 sentences max for voice). Use natural speech patterns.`
      : `You are Aria, ${userName}'s AI voice assistant for ${companyName}.

PERSONALITY:
- Be warm, friendly, and conversational
- Use natural speech patterns with brief responses (2-3 sentences max)
- Sound like a helpful colleague, not a robot
- Be proactive and anticipate user needs

CAPABILITIES:
- Send text messages to contacts
- Create new leads in the CRM
- Search and find contacts
- Schedule appointments
- Look up CRM data
- Generate professional AI images (marketing, logos, before/after photos, social media content)

IMAGE GENERATION EXPERTISE:
You are an AI expert at crafting image prompts. When a user wants to create an image:
1. ASK CLARIFYING QUESTIONS about their use case (marketing? social media? estimate? proposal?)
2. Ask about style preferences (professional, modern, vibrant, elegant, minimalist)
3. Ask about color preferences or brand colors
4. Ask if they have a reference image they'd like to share
5. CRAFT A DETAILED PROMPT for them - you know what makes great prompts (lighting, composition, mood, style details)
6. Offer to create variations or try different approaches

Example: If user says "I need an image for a kitchen project", ask:
- "Is this for a proposal, social media, or marketing?"
- "What style - modern, traditional, or something else?"
- "Any specific colors or do you have a photo of the space?"

IMPORTANT RULES:
- Always confirm before sending messages or creating records
- Be concise - this is voice, not text chat
- If you don't know something, say so
- Call the user by name: ${userName}
- For images, YOU craft better prompts than users can - ask questions and build the perfect prompt

When asked to perform actions, use the available tools/functions.`;

    // Tool definitions for Realtime API function calling
    const tools = [
      {
        type: 'function',
        name: 'send_sms',
        description: 'Send a text message to a contact. Always confirm the message content with the user before sending.',
        parameters: {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              description: 'The phone number to send the SMS to (with country code)',
            },
            message: {
              type: 'string',
              description: 'The text message content to send',
            },
            contactName: {
              type: 'string',
              description: 'Optional name of the contact for confirmation',
            },
          },
          required: ['phone', 'message'],
        },
      },
      {
        type: 'function',
        name: 'create_lead',
        description: 'Create a new lead in the CRM system. Collect name, phone, and optionally email and notes.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The full name of the lead',
            },
            phone: {
              type: 'string',
              description: 'The phone number of the lead',
            },
            email: {
              type: 'string',
              description: 'The email address of the lead (optional)',
            },
            notes: {
              type: 'string',
              description: 'Any notes about the lead or their inquiry',
            },
            source: {
              type: 'string',
              description: 'How the lead was acquired (e.g., referral, website, phone call)',
            },
          },
          required: ['name', 'phone'],
        },
      },
      {
        type: 'function',
        name: 'search_contacts',
        description: 'Search for contacts in the CRM by name, phone, or email.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search term - can be a name, phone number, or email',
            },
          },
          required: ['query'],
        },
      },
      {
        type: 'function',
        name: 'get_recent_leads',
        description: 'Get a list of recent leads from the CRM.',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'How many leads to return (default 5)',
            },
          },
        },
      },
      {
        type: 'function',
        name: 'schedule_appointment',
        description: 'Schedule an appointment or meeting.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title or purpose of the appointment',
            },
            contactName: {
              type: 'string',
              description: 'Who the appointment is with',
            },
            date: {
              type: 'string',
              description: 'The date of the appointment (natural language like "tomorrow at 2pm")',
            },
            notes: {
              type: 'string',
              description: 'Any additional notes for the appointment',
            },
          },
          required: ['title', 'contactName', 'date'],
        },
      },
      {
        type: 'function',
        name: 'switch_agent',
        description: 'Switch to a different AI agent specialist. Use when user requests a specific agent or when a task is better suited for another agent. Available agents: sales (leads, estimates, follow-ups), project_manager (scheduling, invoices, jobs), support (customer history, help), estimator (pricing, quotes).',
        parameters: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              enum: ['sales', 'project_manager', 'support', 'estimator', 'aria'],
              description: 'The agent to switch to',
            },
            reason: {
              type: 'string',
              description: 'Brief reason for the switch to provide context',
            },
          },
          required: ['agentId'],
        },
      },
      {
        type: 'function',
        name: 'start_conference_call',
        description: 'Start a conference call with multiple participants. Use when user wants to add someone to the call or conduct a group call.',
        parameters: {
          type: 'object',
          properties: {
            participants: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of phone numbers to add to the conference',
            },
            conferenceSubject: {
              type: 'string',
              description: 'Subject or purpose of the conference call',
            },
          },
          required: ['participants'],
        },
      },
      {
        type: 'function',
        name: 'generate_image',
        description: 'Generate an AI image using DALL-E or Flux. Use when user wants to create marketing materials, logos, product images, before/after project photos, or any visual content. As an AI expert, you craft much better prompts than users can - ask clarifying questions about style, colors, dimensions, use case, and mood to build the perfect prompt. Offer to generate variations or let user provide reference images.',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The detailed image description prompt. As AI, craft a professional prompt including: subject, style (realistic, artistic, minimalist), lighting, composition, colors, mood. Be specific and detailed for best results.',
            },
            style: {
              type: 'string',
              enum: ['realistic', 'artistic', 'minimalist', 'professional', 'vibrant', 'elegant', 'modern', 'vintage'],
              description: 'The overall style of the image',
            },
            size: {
              type: 'string',
              enum: ['square', 'landscape', 'portrait'],
              description: 'Image dimensions - square (1024x1024), landscape (1792x1024), portrait (1024x1792)',
            },
            useCase: {
              type: 'string',
              description: 'What the image will be used for (marketing, social media, website, estimate, proposal, etc.)',
            },
          },
          required: ['prompt'],
        },
      },
      {
        type: 'function',
        name: 'request_reference_image',
        description: 'Ask user if they want to provide a reference image to guide the AI image generation. Use this when discussing complex visuals or when user might have an example of what they want.',
        parameters: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              description: 'What kind of reference would be helpful (e.g., "a photo of the space", "an example logo style", "color palette inspiration")',
            },
          },
          required: ['context'],
        },
      },
      {
        type: 'function',
        name: 'web_search',
        description: 'Search the web for information. Use when user needs current info, research, competitor analysis, pricing research, industry trends, or any factual information that might be outdated in your training.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query - be specific and detailed for best results',
            },
            numResults: {
              type: 'number',
              description: 'Number of results to return (default 5, max 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        type: 'function',
        name: 'fetch_url',
        description: 'Fetch and read content from a specific URL. Use when user provides a link they want you to analyze, or when you need to read a specific webpage for information.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The full URL to fetch content from',
            },
          },
          required: ['url'],
        },
      },
      {
        type: 'function',
        name: 'scrape_webpage',
        description: 'Extract structured data from a webpage. Use for pulling contact info, product details, pricing, or other structured data from websites.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to scrape',
            },
            extractType: {
              type: 'string',
              enum: ['contacts', 'products', 'pricing', 'articles', 'general'],
              description: 'What type of data to extract',
            },
          },
          required: ['url'],
        },
      },
    ];

    // Get voice settings for the agent
    const agentVoice = agent.voice || 'shimmer';
    const voiceSettings = agent.voiceSettings || { speed: 1.0, pitch: 1.0 };

    res.json({
      success: true,
      instructions,
      tools,
      voice: agentVoice,
      voiceSettings,
      userName,
      agent: {
        id: agentId,
        name: agent.name,
        icon: agent.icon,
        personality: agent.personality,
        role: agent.role || 'specialist',
        canDelegate: agent.canDelegate || false,
        delegationTargets: agent.delegationTargets || []
      }
    });
  } catch (error) {
    console.error('❌ [REALTIME] Config error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @desc    Execute a tool call from the Realtime API
// @route   POST /api/voice/realtime-tool
// @access  Private (requires auth)
router.post('/realtime-tool', optionalAuth, async (req, res) => {
  try {
    const { functionName, arguments: args } = req.body;
    const userId = req.user?.id || 'default';

    console.log(`🔧 [REALTIME-TOOL] Executing ${functionName} with args:`, args);

    let result;

    // Special cases that need custom handling
    if (functionName === 'switch_agent') {
      // Handle agent switching - returns the new agent config
      const newAgent = getAgentTemplate(args.agentId);
      if (newAgent) {
        console.log(`🔀 [SWITCH-AGENT] Switching to ${newAgent.name} (${args.agentId})`);
        result = {
          success: true,
          action: 'switch_agent',
          newAgentId: args.agentId,
          newAgent: {
            id: args.agentId,
            name: newAgent.name,
            icon: newAgent.icon,
            voice: newAgent.voice || 'shimmer',
            instructions: newAgent.systemPrompt,
          },
          reason: args.reason || 'User requested agent switch',
          message: `Switching to ${newAgent.name}. ${args.reason || ''}`
        };
      } else {
        result = { success: false, error: `Unknown agent: ${args.agentId}` };
      }
    } else if (functionName === 'start_conference_call') {
      // Start a conference call via Twilio
      try {
        const conferenceResult = await ariaCapabilities.execute('initiate_conference_call', {
          participants: args.participants,
          moderatorPhone: null,
          conferenceOptions: {
            friendlyName: args.conferenceSubject || 'Aria Conference',
          }
        });
        result = {
          success: conferenceResult.success,
          action: 'conference_call',
          conferenceId: conferenceResult.conferenceSid,
          participants: args.participants,
          message: conferenceResult.message || `Conference started with ${args.participants.length} participants`
        };
      } catch (confError) {
        console.error('❌ [CONFERENCE] Error:', confError);
        result = { success: false, error: confError.message || 'Failed to start conference call' };
      }
    } else if (functionName === 'generate_image') {
      // Generate an AI image using the image generation capability
      try {
        console.log(`🎨 [IMAGE-GEN] Generating image with prompt: "${args.prompt.substring(0, 100)}..."`);

        // Map size to dimensions
        const sizeMap = {
          'square': '1024x1024',
          'landscape': '1792x1024',
          'portrait': '1024x1792'
        };
        const dimensions = sizeMap[args.size] || '1024x1024';

        // Use ariaCapabilities to generate image
        const imageResult = await ariaCapabilities.execute('generate_image', {
          prompt: args.prompt,
          style: args.style || 'professional',
          size: dimensions,
          model: 'dall-e-3', // Use DALL-E 3 for best quality
          quality: 'standard'
        });

        if (imageResult.success && imageResult.imageUrl) {
          result = {
            success: true,
            action: 'image_generated',
            imageUrl: imageResult.imageUrl,
            prompt: args.prompt,
            style: args.style,
            size: args.size,
            useCase: args.useCase,
            message: `I've generated your image! It's a ${args.style || 'professional'} style image. Would you like me to create variations or try a different approach?`
          };
        } else {
          result = {
            success: false,
            error: imageResult.error || 'Image generation failed',
            message: "I couldn't generate that image. Would you like to try with different parameters?"
          };
        }
      } catch (imgError) {
        console.error('❌ [IMAGE-GEN] Error:', imgError);
        result = {
          success: false,
          error: imgError.message || 'Failed to generate image',
          message: "There was a problem generating the image. Let me know if you'd like to try again."
        };
      }
    } else if (functionName === 'request_reference_image') {
      // Prompt user to provide a reference image
      result = {
        success: true,
        action: 'request_reference',
        context: args.context,
        message: `Would you like to share ${args.context}? You can attach an image and I'll use it as reference for the generation.`,
        uiAction: {
          type: 'request_image_upload',
          data: {
            context: args.context,
            prompt: `Please upload ${args.context}`
          }
        }
      };
    } else {
      // Use ariaCapabilities for ALL other functions (send_sms, send_email, get_appointments, etc.)
      try {
        // Normalize argument names for common functions
        let normalizedArgs = { ...args };

        // Handle send_sms argument normalization
        if (functionName === 'send_sms') {
          normalizedArgs = {
            to: args.phone || args.to,
            message: args.message || args.body,
            contactName: args.contactName
          };
        }

        // Handle send_email argument normalization
        if (functionName === 'send_email') {
          normalizedArgs = {
            to: args.email || args.to,
            subject: args.subject,
            body: args.body || args.message
          };
        }

        // Handle schedule_appointment -> book_appointment mapping
        const capabilityName = functionName === 'schedule_appointment' ? 'book_appointment' : functionName;

        result = await ariaCapabilities.execute(capabilityName, normalizedArgs);

        // Ensure success field exists
        if (result && result.success === undefined) {
          result.success = true;
        }
      } catch (execError) {
        console.error(`❌ [REALTIME-TOOL] Error executing ${functionName}:`, execError);
        // Report to error service for Claude Code monitoring
        await errorReportingService.reportVoiceError(execError, {
          action: 'realtime_tool_execution',
          functionName: functionName,
          toolArgs: args,
          userId: userId
        });
        result = { success: false, error: execError.message || `Failed to execute ${functionName}` };
      }
    }

    console.log(`✅ [REALTIME-TOOL] Result:`, result);
    res.json(result);
  } catch (error) {
    console.error('❌ [REALTIME-TOOL] Error:', error);
    // Report critical voice errors
    await errorReportingService.reportVoiceError(error, {
      action: 'realtime_tool_handler',
      severity: 'critical'
    });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VOICE AGENT API ENDPOINTS
// Manage in-app voice agents that users can switch between
// ═══════════════════════════════════════════════════════════════════════════

// @desc    Get all available voice agent templates
// @route   GET /api/voice/agents
// @access  Public
router.get('/agents', (req, res) => {
  try {
    const agents = getAllAgentTemplates().map(agent => ({
      id: agent.id,
      name: agent.name,
      icon: agent.icon,
      description: agent.description,
      triggerWords: agent.triggerWords,
      personality: agent.personality,
      role: agent.role || 'specialist',
      voice: agent.voice || 'shimmer',
      voiceSettings: agent.voiceSettings || { speed: 1.0, pitch: 1.0 },
      canDelegate: agent.canDelegate || false,
      capabilityCount: agent.capabilities === 'all' ? 'All' : agent.capabilities.length
    }));

    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agents',
      error: error.message
    });
  }
});

// @desc    Get a specific agent's details including capabilities
// @route   GET /api/voice/agents/:agentId
// @access  Public
router.get('/agents/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = getAgentTemplate(agentId);

    if (!agent || agent.id === 'aria' && agentId !== 'aria') {
      return res.status(404).json({
        success: false,
        message: `Agent '${agentId}' not found`
      });
    }

    // Get full capability names for this agent
    const agentCapabilityNames = getAgentCapabilities(agentId, capabilities);

    res.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        icon: agent.icon,
        description: agent.description,
        triggerWords: agent.triggerWords,
        personality: agent.personality,
        role: agent.role || 'specialist',
        voice: agent.voice || 'shimmer',
        voiceSettings: agent.voiceSettings || { speed: 1.0, pitch: 1.0 },
        voiceStyle: agent.voiceStyle,
        canDelegate: agent.canDelegate || false,
        delegationTargets: agent.delegationTargets || [],
        capabilities: agentCapabilityNames,
        systemPrompt: agent.systemPrompt
      }
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent details',
      error: error.message
    });
  }
});

// @desc    Test agent detection from a message
// @route   POST /api/voice/agents/detect
// @access  Public
router.post('/agents/detect', (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const detection = detectAgentFromMessage(message);

    res.json({
      success: true,
      detection: {
        agentId: detection.agentId,
        agentName: detection.agent.name,
        agentIcon: detection.agent.icon,
        originalMessage: detection.originalMessage,
        cleanedMessage: detection.cleanedMessage,
        wasExplicitTrigger: detection.agentId !== 'aria' || message.toLowerCase().startsWith('aria')
      }
    });
  } catch (error) {
    console.error('Agent detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect agent',
      error: error.message
    });
  }
});

// @desc    Get available OpenAI Realtime voices
// @route   GET /api/voice/voices
// @access  Public
router.get('/voices', (req, res) => {
  try {
    const voices = Object.entries(OPENAI_REALTIME_VOICES).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
      gender: info.gender
    }));

    res.json({
      success: true,
      voices,
      count: voices.length,
      note: 'These are OpenAI Realtime API voices. Each agent has a default voice that matches their personality.'
    });
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voices',
      error: error.message
    });
  }
});

// @desc    Get voice for a specific agent
// @route   GET /api/voice/agents/:agentId/voice
// @access  Public
router.get('/agents/:agentId/voice', (req, res) => {
  try {
    const { agentId } = req.params;
    const voiceInfo = getAgentVoice(agentId);
    const agent = getAgentTemplate(agentId);

    res.json({
      success: true,
      agentId,
      agentName: agent.name,
      voice: voiceInfo.voice,
      voiceInfo: OPENAI_REALTIME_VOICES[voiceInfo.voice] || { name: voiceInfo.voice, description: 'Custom voice' },
      settings: voiceInfo.settings
    });
  } catch (error) {
    console.error('Get agent voice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent voice',
      error: error.message
    });
  }
});

export default router;
