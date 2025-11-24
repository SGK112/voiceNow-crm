import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import { logBuffer, saveClaudeCommand, autoSaveConversation, analyzeAndSuggest } from '../utils/logCapture.js';
import { trainer } from '../utils/conversationTrainer.js';
import { AriaCapabilities, getCapabilityDefinitions } from '../utils/ariaCapabilities.js';
import { ariaMemoryService } from '../services/ariaMemoryService.js';
import { ariaSlackService } from '../services/ariaSlackService.js';
import agentSMSService from '../services/agentSMSService.js';
import emailService from '../services/emailService.js';
import UserProfile from '../models/UserProfile.js';
import Lead from '../models/Lead.js';
import CallLog from '../models/CallLog.js';
import TeamMessage from '../models/TeamMessage.js';

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

// Initialize Aria capabilities
const ariaCapabilities = new AriaCapabilities({
  emailService: emailService, // Email sending capability via emailService
  twilioService: agentSMSService, // SMS sending capability via agentSMSService
  memoryStore: new Map(),
  models: {
    Lead,
    Message: TeamMessage,
    Call: CallLog
  }
});

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
// @access  Public
router.post('/process', async (req, res) => {
  try {
    const startTime = Date.now();
    const { audioBase64, conversationHistory = [] } = req.body;

    console.log(`[TIMING] ====== NEW REQUEST ======`);
    console.log(`[TIMING] Audio size: ${audioBase64?.length || 0} chars`);

    if (!audioBase64) {
      return res.status(400).json({ success: false, message: 'Audio data required' });
    }

    // Step 1: Transcribe audio (OPTIMIZED)
    console.log('[TIMING] Step 1: Starting transcription...');
    const transcribeStart = Date.now();
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    console.log(`[TIMING] Audio buffer size: ${audioBuffer.length} bytes`);
    const file = new File([audioBuffer], 'audio.m4a', { type: 'audio/m4a' });

    // Use faster whisper settings
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text', // Faster - just text, no timestamps
    });

    // response_format: 'text' returns string directly
    const userMessage = typeof transcription === 'string' ? transcription : transcription.text;
    const transcriptionTime = Date.now() - transcribeStart;
    console.log(`[TIMING] Transcription took ${transcriptionTime}ms`);
    console.log('User said:', userMessage);

    // Track conversation session (both old and new system)
    const sessionId = req.body.sessionId || 'default';
    const userId = req.body.userId || 'default';

    // Old session tracking
    const session = getConversationSession(sessionId);
    session.messages.push({ role: 'user', content: userMessage });

    // New persistent conversation tracking
    await ariaMemoryService.addMessage(sessionId, 'user', userMessage, {
      transcriptionTime
    });

    // Detect and extract user's name from introduction patterns
    const namePatterns = [
      /(?:my name is|i'm|im|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /^([A-Z][a-z]+)(?:\s+here|,|\s+speaking)/i
    ];

    for (const pattern of namePatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
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

    // Get user profile
    let userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      // Create default profile if doesn't exist
      userProfile = await UserProfile.create({ userId });
    }

    // Get conversation context with relevant memories
    const context = await ariaMemoryService.getConversationContext(sessionId, userId);

    // Build context string from memories
    let memoryContext = '';
    let conversationGoal = '';
    let userName = userProfile.personalInfo?.firstName || '';
    let userPreferences = '';

    // Add profile context
    if (userProfile.personalInfo) {
      if (userProfile.personalInfo.firstName) {
        userName = userProfile.personalInfo.firstName;
      }
      if (userProfile.personalInfo.bio) {
        memoryContext += `\n\nUSER PROFILE:\n- Bio: ${userProfile.personalInfo.bio}\n`;
      }
    }

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
        // Check for user's name (override profile if set in memory)
        if (mem.key === 'user_name') {
          userName = mem.value;
          memoryContext += `- USER'S NAME: ${mem.value} (USE THIS NAME when addressing the user!)\n`;
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

    const messages = [
      {
        role: 'system',
        content: `You are Aria, an intelligent AI voice assistant created by VoiceFlow.

CURRENT DATE & TIME: ${currentDateTime}${conversationGoal}${conversationSummary}${userPreferences}${memoryContext}

IDENTITY:
- Your name is Aria (always introduce yourself as "I'm Aria" when asked)
- You are an intelligent, context-aware AI assistant with real-time capabilities
- You understand context, remember conversations, and can take actions
${userName ? `- The user's name is ${userName} - use it naturally in conversation!\n` : ''}
YOUR CAPABILITIES (use these intelligently):
You have access to powerful real-time tools:
📱 SMS/MMS: Send text messages and multimedia messages to contacts
📧 Email: Send emails with content to anyone
🔔 Notifications: Send push notifications to the user's mobile device
🌐 Web Search: Search DuckDuckGo for current information, news, facts
🌐 Web Fetch: Scrape specific URLs to get detailed web content
🧠 Memory: Store and recall important information across all conversations
📊 CRM: Access leads, messages, calls, search contacts in the system

WHEN TO USE CAPABILITIES:
- User asks about current events/news → web_search immediately
- User wants to contact someone → send_email or send_sms
- User wants to be reminded later → send_notification with reminder
- User shares important info → remember_info (preferences, facts, context)
- User asks "do you remember..." → recall_info to search memories
- User asks about their business → get_recent_leads, get_calls_summary
- Be proactive: if you sense something should be remembered, store it!
- Use send_notification to alert user about important updates or reminders

INTELLIGENCE RULES:
1. UNDERSTAND INTENT: Listen carefully to what the user really wants
2. USE CONTEXT: Reference previous messages and memories naturally
3. BE PROACTIVE: Suggest relevant actions or information
4. ASK WHEN UNCLEAR: Don't guess - ask for clarification
5. USE YOUR TOOLS: If you need information, use web_search or recall_info
6. LEARN & REMEMBER: Store important details automatically
7. STAY GOAL-FOCUSED: If there's a goal, work towards it intelligently

RESPONSE STYLE:
- Keep responses CONCISE but COMPLETE: 10-20 words
- Sound natural and conversational (contractions: I'm, you're, let's)
- Show personality - be warm, helpful, and engaging
- Acknowledge what the user said before responding
- Use the user's name when appropriate (if you know it)
- ALWAYS respond in English only
- Be confident but honest when you don't know something

SMART CONVERSATION EXAMPLES:
❌ Bad: "Yes"
✅ Good: "Yes${userName ? ', ' + userName : ''}! What can I help you with?"

❌ Bad: "It's November 24, 2025"
✅ Good: "Today's Monday, November 24, 2025! Need help with anything?"

❌ Bad: "I don't know"
✅ Good: "I'm not sure, but let me search that for you!"

❌ Bad: "I remember that"
✅ Good: "Yes${userName ? ', ' + userName : ''}! I remember you told me about that."

❌ Bad: Generic response without context
✅ Good: Reference previous conversation or memories when relevant

REMEMBER: You are Aria - be intelligent, proactive, and conversational. Think before responding, use your capabilities when helpful, and always aim to provide real value!`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    // Check if message likely needs capabilities (optimization)
    const lowerUserMessage = userMessage.toLowerCase();
    const needsCapabilities =
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
      lowerUserMessage.includes('call');

    // OPTIMIZED: Only include tools when likely needed
    const completionOptions = {
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 60, // REDUCED for faster response (was 80)
      temperature: 0.7, // Slightly lower for more consistent responses
    };

    // Only add tools if the message suggests capability use
    if (needsCapabilities) {
      completionOptions.tools = getCapabilityDefinitions().map(cap => ({
        type: 'function',
        function: cap
      }));
      completionOptions.tool_choice = 'auto';
    }

    const completion = await openai.chat.completions.create(completionOptions);

    let aiResponse = completion.choices[0].message.content;
    const toolCalls = completion.choices[0].message.tool_calls;

    // Handle function/capability calls
    if (toolCalls && toolCalls.length > 0) {
      console.log(`🔧 [CAPABILITIES] AI requested ${toolCalls.length} capability calls`);

      const toolResults = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let args;
        let result;

        try {
          args = JSON.parse(toolCall.function.arguments);
          console.log(`⚡ [CAPABILITY] Executing: ${functionName}`, args);

          result = await ariaCapabilities.execute(functionName, args);
        } catch (error) {
          console.error(`❌ [CAPABILITY] Error executing ${functionName}:`, error.message);
          result = {
            success: false,
            error: error.message,
            summary: `Failed to execute ${functionName}: ${error.message}`
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

    // Step 3: Generate voice (OPTIMIZED - maximum streaming)
    console.log('[TIMING] Step 3: Starting voice generation...');
    const voiceStart = Date.now();

    const voiceResponse = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
      {
        text: aiResponse,
        model_id: 'eleven_turbo_v2_5',  // Turbo v2.5 for speed
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: false  // DISABLED for faster generation
        },
        optimize_streaming_latency: 4  // MAXIMUM optimization (was 3)
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 4000 // REDUCED timeout (was 5000)
      }
    );

    const audioBase64Result = Buffer.from(voiceResponse.data).toString('base64');
    const voiceGenTime = Date.now() - voiceStart;
    const totalTime = Date.now() - startTime;

    console.log(`[TIMING] Voice generation took ${voiceGenTime}ms`);
    console.log(`[TIMING] ====== TOTAL: ${totalTime}ms ======`);
    console.log(`[TIMING] Breakdown: Transcription=${transcriptionTime}ms, AI=${aiResponseTime}ms, Voice=${voiceGenTime}ms`);

    // Track in session
    session.messages.push({ role: 'assistant', content: aiResponse });
    session.conversationCount++;
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

export default router;
