import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import ttsService from '../services/ttsService.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Personalized greeting templates - {name} will be replaced with user's name
const PERSONALIZED_GREETINGS = [
  "Hey {name}! What can I help you with?",
  "Hi {name}! I'm listening.",
  "Hello {name}! Go ahead.",
  "Hey {name}! What's up?",
  "Yes {name}? I'm ready.",
  "Hi {name}! I'm all ears.",
  "Hey {name}! What do you need?",
  "Hello {name}! Fire away.",
  "Hey {name}! How can I help?",
  "Hi {name}! I'm ready to assist.",
  "What can I do for you, {name}?",
  "Hey {name}! I'm here.",
  "Hello {name}! What would you like?",
  "I'm ready {name}! Go ahead.",
  "Hi {name}! Ask me anything.",
  "Hey {name}! What's going on?",
  "I'm here {name}! How can I help?",
  "Hello {name}! What can I assist with?",
  "Hi {name}! Ready when you are.",
  "Hey {name}! Ready to help.",
  "Yes {name}! I'm listening.",
  "Hi {name}! What do you need?",
  "Hey {name}! Go ahead.",
  "Hello {name}! I'm ready.",
  "What's up {name}?",
  "Hi {name}! Fire away.",
  "Hey {name}! Ask away.",
  "Hello {name}! I'm all ears.",
  "Hi {name}! What's on your mind?",
  "Hey {name}! Ready and waiting.",
  "Hey {name}! What can I do?",
  "Hello {name}! I'm here for you.",
  "What would you like, {name}?",
  "Hi {name}! I'm ready to assist.",
  "Hey {name}! What do you need?",
  "Hello {name}! How can I help?",
  "Hey {name}! What's happening?",
  "Yes {name}! I'm here.",
  "Hello {name}! Ready when you are.",
  "Hey {name}! What can I help with?",
  "What's up, {name}?",
  "Hi {name}! I'm listening carefully.",
  "Hey {name}! Fire away.",
  "Hello {name}! Ask away.",
  "Hi {name}! What do you need?",
  "Hey {name}! I'm all ears.",
  "Hello {name}! What's on your mind?",
  "Hey {name}! How can I assist?",
  "Hi {name}! Ready and waiting.",
  "Hey {name}! I'm here.",
  "Hello {name}! What would you like?",
  "Hi {name}! What can I do?",
  "Hey {name}! I'm here for you.",
  "What's up {name}? How can I help?",
  "Hi {name}! How can I help?",
  "Hey {name}! Ready to go.",
  "Hi {name}! I'm standing by.",
  "Hey {name}! What can I do?",
  "Hello {name}! I'm ready to help.",
  "Yes {name}! Fire away.",
  "Hi {name}! Ask me anything.",
  "Hey {name}! What's going on?",
  "Hi {name}! What's happening?",
  "Hey {name}! I'm all yours.",
  "How can I help, {name}?",
  "Hi {name}! What would you like?",
  "Hey {name}! I'm ready.",
  "Hello {name}! I'm listening.",
  "What can I help with, {name}?",
  "Hi {name}! I'm here.",
  "Hey {name}! What's on your mind?",
  "Hello {name}! Ask away.",
  "Hi {name}! I'm all ears.",
  "Hey {name}! How can I assist you?",
  "Hi {name}! Ready to assist.",
  "Hey {name}! Go ahead.",
  "Hello {name}! What do you need?",
  "Hi {name}! I'm here to help.",
];

function getRandomGreeting(userName = null) {
  const template = PERSONALIZED_GREETINGS[Math.floor(Math.random() * PERSONALIZED_GREETINGS.length)];
  // Replace {name} with user's name, or remove it for a generic greeting
  if (userName) {
    return template.replace('{name}', userName);
  } else {
    // Remove the name placeholder and clean up extra spaces/punctuation
    return template
      .replace('{name}! ', '')
      .replace('{name}? ', '')
      .replace('{name}, ', '')
      .replace(', {name}', '')
      .replace(' {name}', '')
      .replace('{name}', '');
  }
}

// Instant wake-up greeting endpoint (returns immediately)
router.post('/wake', async (req, res) => {
  try {
    const greeting = getRandomGreeting();

    // Generate TTS for the greeting in the background (don't wait)
    const generateAudio = async () => {
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1-hd',
          voice: 'nova',
          input: greeting,
          speed: 1.1,
        });
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        return audioBuffer.toString('base64');
      } catch (error) {
        console.error('TTS error:', error);
        return null;
      }
    };

    // Start audio generation but don't wait for it
    const audioPromise = generateAudio();

    // Send instant response
    res.json({
      success: true,
      response: greeting,
      timestamp: new Date().toISOString(),
    });

    // Audio will be ready for next request if needed
  } catch (error) {
    console.error('Wake error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Aria chat endpoint with comprehensive context
router.post('/chat', async (req, res) => {
  try {
    const { message, context, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // Build system prompt with user context
    const systemPrompt = buildSystemPrompt(context);

    // Format conversation history for GPT
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Check if message requires web scraping
    const needsScraping = detectScrapingIntent(message);
    let scrapedData = null;
    let sources = [];

    if (needsScraping) {
      // Extract URL or search terms from message
      const urlMatch = message.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        try {
          const scrapeResponse = await axios.post('http://localhost:5001/api/scraper/fetch', {
            url: urlMatch[0],
          });
          scrapedData = scrapeResponse.data;
          sources.push(urlMatch[0]);

          // Add scraped data to the conversation
          messages.push({
            role: 'system',
            content: `Web scraping results from ${urlMatch[0]}:\n${JSON.stringify(scrapedData.data, null, 2)}`,
          });
        } catch (error) {
          console.error('Scraping error:', error.message);
        }
      }
    }

    // Call GPT-4o-mini for faster response (10x faster than GPT-4)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 300, // Shorter responses = faster
    });

    const response = completion.choices[0].message.content;

    // Add data sources if available
    if (context?.contacts?.recent?.length > 0) {
      sources.push('Contacts');
    }
    if (context?.calendar?.upcoming?.length > 0) {
      sources.push('Calendar');
    }

    res.json({
      success: true,
      response,
      sources: sources.length > 0 ? sources : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Aria chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to process chat message',
    });
  }
});

// Instant voice wake-up (with pre-generated greeting)
// Uses ElevenLabs TTS (same as conversation) for consistent volume
router.post('/voice-wake', async (req, res) => {
  try {
    // Get user's name from request body for personalized greeting
    const { userName } = req.body || {};
    const greeting = getRandomGreeting(userName);

    console.log(`[ARIA] Wake greeting${userName ? ` for ${userName}` : ''}: "${greeting}"`);

    // Use ElevenLabs TTS with Aria voice for consistent volume with conversation
    const audioBase64 = await ttsService.synthesizeBase64(greeting, {
      voice: 'aria',  // Same voice as conversation responses
      style: 'friendly'
    });

    res.json({
      success: true,
      response: greeting,
      audioResponse: audioBase64,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Voice wake error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Voice chat endpoint
router.post('/voice', async (req, res) => {
  try {
    const { audio, context, conversationHistory } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required',
      });
    }

    // Convert base64 audio to buffer and create a File-like object
    const audioBuffer = Buffer.from(audio, 'base64');

    // Create a File-like object for OpenAI API
    const audioFile = new File([audioBuffer], 'recording.m4a', { type: 'audio/m4a' });

    // Step 1: Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    const userMessage = transcription.text;

    // Step 2: Get AI response using the same logic as chat endpoint
    const systemPrompt = buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 10x faster than GPT-4
      messages,
      temperature: 0.7,
      max_tokens: 200, // Keep voice responses concise for speed
    });

    const aiResponse = completion.choices[0].message.content;

    // Step 3: Convert AI response to speech using TTS-1-HD (faster, better quality)
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1-hd', // Faster HD model
      voice: 'nova',
      input: aiResponse,
      speed: 1.1, // Slightly faster speech
    });

    // Convert TTS response to base64
    const audioResponseBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioResponseBase64 = audioResponseBuffer.toString('base64');

    res.json({
      success: true,
      transcription: userMessage,
      aiResponse,
      audioResponse: audioResponseBase64,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Aria voice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to process voice message',
    });
  }
});

// Helper function to build system prompt
function buildSystemPrompt(context) {
  const { user, contacts, calendar, preferences } = context || {};

  let prompt = `You are Aria, an AI assistant integrated into a CRM mobile app. You have access to the user's contacts, calendar events, notes, and messages.

Your capabilities:
- Access and search contacts, calendar events, notes, and messages
- Web scraping - I can fetch and analyze data from any website when given a URL
- BrightLocal integration for local business search rankings
- Real-time data fetching from external APIs

Your personality:
- Professional but friendly
- VERY concise - keep responses to 1-2 sentences unless more detail is explicitly requested
- Proactive in offering relevant information
- Always accurate with data
- Fast and efficient

`;

  if (user) {
    prompt += `User Information:
- Name: ${user.name || 'Unknown'}
- Email: ${user.email || 'Not provided'}
- Phone: ${user.phone || 'Not provided'}
- Company: ${user.company || 'Not provided'}
- Job Title: ${user.jobTitle || 'Not provided'}

`;
  }

  if (contacts) {
    prompt += `Contacts Data:
- Total contacts: ${contacts.total || 0}
- Recent contacts: ${contacts.recent?.length || 0} available
${contacts.recent?.slice(0, 5).map(c => `  • ${c.name} - ${c.company || 'No company'} - ${c.phone || 'No phone'}`).join('\n') || ''}

`;
  }

  if (calendar) {
    prompt += `Calendar Data:
- Total events: ${calendar.total || 0}
- Upcoming events: ${calendar.upcoming?.length || 0}
${calendar.upcoming?.map(e => `  • ${e.title} - ${new Date(e.startDate).toLocaleDateString()}`).join('\n') || ''}

`;
  }

  prompt += `When answering questions:
1. Be BRIEF - aim for 1-2 sentences. Only expand if explicitly asked
2. Use the provided context data to give accurate, personalized responses
3. If the user provides a URL or asks to scrape a website, I will automatically fetch and analyze the data
4. When web scraping data is available, summarize ONLY the key points
5. No unnecessary pleasantries or filler - get straight to the answer`;

  return prompt;
}

// Helper function to detect if message needs web scraping
function detectScrapingIntent(message) {
  const scrapingKeywords = [
    'fetch',
    'scrape',
    'get data from',
    'look up',
    'check website',
    'find on',
    'search for',
    'brightlocal',
    'google',
  ];

  const lowerMessage = message.toLowerCase();
  return scrapingKeywords.some(keyword => lowerMessage.includes(keyword)) ||
         /https?:\/\//.test(message);
}

// BrightLocal specific endpoint for Aria
router.post('/brightlocal', async (req, res) => {
  try {
    const { location, keyword } = req.body;

    if (!location || !keyword) {
      return res.status(400).json({
        success: false,
        error: 'Location and keyword are required',
      });
    }

    // Call scraper endpoint
    const scrapeResponse = await axios.post('http://localhost:5001/api/scraper/brightlocal', {
      location,
      keyword,
    });

    // Format results for Aria
    const results = scrapeResponse.data.results || [];
    const summary = `Found ${results.length} results for "${keyword}" in ${location}`;

    res.json({
      success: true,
      summary,
      results,
      location,
      keyword,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('BrightLocal error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
