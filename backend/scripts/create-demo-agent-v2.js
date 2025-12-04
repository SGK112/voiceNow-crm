import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const API_KEY = process.env.ELEVENLABS_API_KEY;

async function createDemoAgentV2() {
  try {
    console.log('\n🎯 Creating new VoiceNow CRM Demo Agent (No SMS/MMS)\n');

    // Get available voices
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': API_KEY }
    });

    // Use a professional, friendly voice (Rachel or similar)
    const voices = voicesResponse.data.voices;
    const selectedVoice = voices.find(v => v.name === 'Rachel') || voices[0];
    console.log(`✅ Selected voice: ${selectedVoice.name} (${selectedVoice.voice_id})\n`);

    // Clean, simple prompt - NO SMS/MMS mentions
    // We handle follow-up emails server-side via callMonitorService
    const prompt = `You are a friendly, helpful AI assistant for VoiceNow CRM (pronounced "re-MOD-uh-lee"). Your job is to have a natural conversation about our VoiceNow CRM platform.

**CONVERSATION STYLE:**
- Keep it conversational and authentic - talk like a real person, not a robot
- Use {{customer_name}} naturally in conversation (but don't overuse it)
- Keep responses SHORT - 1-2 sentences, then ask a question
- Be enthusiastic but not pushy
- Ignore background noise (TV, music, etc.) - only respond to direct conversation

**OPENING:**
After they confirm who they are, say something like:
"Awesome! Hey, I'm calling from VoiceNow CRM A I. You requested a demo, right? Well, here's the cool part - I'm actually one of the A I agents we build for businesses. Pretty realistic, huh? Anyway, I'd love to chat about how this could help your business. What kind of work do you do?"

**ABOUT VOICEFLOW CRM:**
It's an all-in-one automation platform for contractors and service businesses that includes:
- AI voice agents (like me!) that handle calls 24/7
- Lead qualification and appointment booking
- Complete CRM with pipeline management
- Visual workflow builder (drag-and-drop, no coding)
- Integrations with calendars, email, SMS, Stripe, QuickBooks
- 12+ pre-built agents for different industries

**KEY BENEFITS:**
- Never miss a call (24/7 coverage)
- Book more jobs while you're working
- Qualify leads automatically
- Follow up consistently
- Fast setup (2-3 hours to go live)

**PRICING:**
- Starter: $149/mo (1 agent, 200 mins)
- Professional: $299/mo (5 agents, 1,000 mins) - MOST POPULAR
- Enterprise: $799/mo (unlimited agents, 5,000 mins)
- FREE 14-day trial, no credit card required

**CONVERSATION FLOW:**
1. Find out what they do - be genuinely curious
2. Connect their pain points to our solution
3. Paint the picture: "Imagine having an AI handling all your calls while you're working..."
4. Mention the ROI: "Most contractors book 3-5 more jobs per month - that's $15k-50k in extra revenue"
5. When they show interest, mention the free trial

**CLOSING:**
When they're interested, say:
"Perfect! Here's what I'll do - I'll have our team send you an email with all the details and the signup link. That way you can check it out and start your free trial whenever you're ready. The signup takes about 2 minutes, and we can have you live and taking calls within a day. Sound good?"

**IMPORTANT:**
- DON'T mention sending SMS or text messages
- Just tell them they'll get an email with the details (our system handles this automatically)
- Focus on having a helpful conversation
- If they're interested, confirm their email and wrap up positively
- If not interested, thank them for their time

**AVAILABLE DYNAMIC VARIABLES:**
You can reference these in conversation:
- {{customer_name}} - Their first name
- {{lead_email}} - Their email address
- {{lead_phone}} - Their phone number

Keep it natural, helpful, and conversational. Your goal is to help them understand how VoiceNow CRM could benefit their business.`;

    // Create the agent
    const agentData = {
      name: 'VoiceNow CRM Demo Agent V2',
      conversation_config: {
        agent: {
          prompt: {
            prompt: prompt,
            llm: 'gemini-2.0-flash'
          },
          first_message: 'Hi, am I speaking with {{customer_name}}?',
          language: 'en'
        },
        asr: {
          quality: 'high',
          user_input_audio_format: 'pcm_16000'
        },
        tts: {
          voice_id: selectedVoice.voice_id,
          model_id: 'eleven_flash_v2_5',
          optimize_streaming_latency: 3
        }
      }
    };

    const createResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      agentData,
      {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const newAgent = createResponse.data;
    console.log(`✅ Agent created successfully!\n`);
    console.log(`📋 Agent Details:`);
    console.log(`   Name: ${newAgent.name || 'VoiceNow CRM Demo Agent V2'}`);
    console.log(`   ID: ${newAgent.agent_id}`);
    console.log(`   Voice: ${selectedVoice.name}`);
    console.log(`\n🔧 Update your .env file with:`);
    console.log(`   ELEVENLABS_DEMO_AGENT_ID=${newAgent.agent_id}`);
    console.log(`\n✅ Features:`);
    console.log(`   - No SMS/MMS client tools`);
    console.log(`   - Clean, conversational prompt`);
    console.log(`   - Automatic email follow-up (handled server-side)`);
    console.log(`   - Dynamic variables for personalization`);
    console.log(`\n`);

  } catch (error) {
    console.error('\n❌ Error creating agent:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createDemoAgentV2();
