import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function createFemaleAgentAndCall() {
  try {
    console.log('🎤 Step 1: Fetching available voices...\n');

    // Get voices
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    const voices = voicesResponse.data.voices || [];
    console.log(`Found ${voices.length} voices\n`);

    // Find female voices (prefer Sarah, Rachel, or any female voice)
    const femaleVoices = voices.filter(v =>
      v.labels?.gender === 'female' ||
      v.labels?.['use case']?.includes('conversational') ||
      ['sarah', 'rachel', 'bella', 'emily', 'jessica'].some(name =>
        v.name.toLowerCase().includes(name)
      )
    );

    console.log('👩 Female voices found:');
    femaleVoices.slice(0, 5).forEach(v => {
      console.log(`  - ${v.name} (${v.voice_id})`);
    });
    console.log('');

    // Select best female voice
    const selectedVoice = femaleVoices.find(v => v.name.toLowerCase().includes('rachel')) ||
                         femaleVoices.find(v => v.name.toLowerCase().includes('sarah')) ||
                         femaleVoices[0];

    if (!selectedVoice) {
      throw new Error('No suitable female voice found');
    }

    console.log(`✅ Selected voice: ${selectedVoice.name}\n`);

    // Create agent configuration
    console.log('🤖 Step 2: Creating conversational AI agent...\n');

    const agentConfig = {
      name: 'VoiceFlow Assistant - Female Voice',
      conversation_config: {
        tts: {
          voice_id: selectedVoice.voice_id,
          model_id: 'eleven_flash_v2'  // Required for English agents
        },
        agent: {
          prompt: {
            prompt: `You are a friendly and professional AI assistant for VoiceFlow CRM.

Your personality:
- Warm, friendly, and approachable
- Professional yet conversational
- Helpful and knowledgeable about VoiceFlow's AI voice agent platform

Your role:
- Greet the caller warmly
- Introduce yourself as a VoiceFlow AI assistant
- Ask how you can help them today
- Demonstrate natural conversation skills
- Be engaging and keep the conversation flowing

Important:
- Keep responses concise and natural
- Use a warm, friendly tone
- Ask follow-up questions
- Listen actively and respond appropriately`
          },
          first_message: "Hi there! This is your VoiceFlow AI assistant calling. I wanted to reach out and introduce myself. How are you doing today?",
          language: 'en'
        },
        asr: {
          quality: 'high',
          user_input_audio_format: 'pcm_16000'
        }
      }
    };

    const createAgentResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      agentConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const agentId = createAgentResponse.data.agent_id;
    console.log(`✅ Agent created successfully!`);
    console.log(`   Agent ID: ${agentId}\n`);

    // Initiate the call
    console.log('📞 Step 3: Initiating call to +14802555887...\n');

    const callConfig = {
      call_name: 'VoiceFlow Female Agent Test Call',
      agent_id: agentId,
      agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
      recipients: [
        {
          destination_number: '+14802555887'
        }
      ],
      conversation_config_override: {
        agent: {
          prompt: {
            prompt: `**CURRENT DATE & TIME:**
📅 Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
🕐 Time: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}

You are a friendly and professional AI assistant for VoiceFlow CRM.

Your personality:
- Warm, friendly, and approachable
- Professional yet conversational
- Helpful and knowledgeable

Your role:
- Greet the caller warmly
- Introduce yourself
- Ask how you can help
- Demonstrate natural conversation
- Be engaging

Keep responses concise and natural. Use a warm, friendly tone.`
          },
          first_message: "Hi there! This is your VoiceFlow AI assistant calling. I wanted to reach out and say hello. How are you doing today?"
        }
      },
      webhook_url: `${WEBHOOK_URL}/api/webhooks/elevenlabs/conversation-event`
    };

    const callResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/batch-calling/submit',
      callConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const callId = callResponse.data.id || callResponse.data.batch_id;

    console.log('═══════════════════════════════════════');
    console.log('✅ SUCCESS! Call initiated');
    console.log('═══════════════════════════════════════');
    console.log(`📞 Call ID: ${callId}`);
    console.log(`🤖 Agent: VoiceFlow Assistant`);
    console.log(`🎤 Voice: ${selectedVoice.name} (Female)`);
    console.log(`📱 Phone: +14802555887`);
    console.log(`🆔 Agent ID: ${agentId}`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('⏳ Your phone should ring in 5-15 seconds...');
    console.log('💬 Answer to hear the AI assistant!');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createFemaleAgentAndCall();
