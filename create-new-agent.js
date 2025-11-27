import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env file');
  process.exit(1);
}

const client = axios.create({
  baseURL: ELEVENLABS_API_URL,
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  }
});

async function createVoiceAgent() {
  try {
    console.log('🎙️ Creating new ElevenLabs Voice Agent...\n');

    // Agent configuration
    const agentConfig = {
      name: 'VoiceNow CRM Assistant',
      conversation_config: {
        tts: {
          voice_id: 'cjVigY5qzO86Huf0OWal', // Eric - Professional voice
          model_id: 'eleven_flash_v2' // Flash v2 model for English agents
        },
        agent: {
          prompt: {
            prompt: `You are a professional AI assistant for VoiceNow CRM, a voice automation platform for businesses.

**Your Role:**
- Help customers understand our voice automation solutions
- Qualify leads by understanding their business needs
- Schedule demos and consultations
- Answer questions about pricing and features

**Key Features to Highlight:**
- AI Voice Agents with natural conversations
- Visual workflow builder (no coding required)
- Integration with CRM, calendar, and business tools
- Real-time call analytics and insights
- Pay-as-you-grow pricing starting at $149/month

**Tone & Style:**
- Professional yet friendly and approachable
- Clear and concise in explanations
- Patient and helpful
- Enthusiastic about helping businesses grow

**Current Date & Time:**
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Current time is ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}

**Important Guidelines:**
1. Always greet callers warmly
2. Ask qualifying questions to understand their needs
3. Offer to schedule a demo if they're interested
4. Capture their contact information (name, company, phone, email)
5. Confirm all details before ending the call
6. Thank them for their time

Remember: You represent a cutting-edge AI company. Be professional, knowledgeable, and helpful.`
          },
          first_message: 'Hello! Thanks for calling VoiceNow CRM. I\'m your AI assistant. How can I help you automate your business communications today?',
          language: 'en'
        }
      }
    };

    console.log('📝 Agent Configuration:');
    console.log(`   Name: ${agentConfig.name}`);
    console.log(`   Voice: Eric (Professional American Male)`);
    console.log(`   Model: ${agentConfig.conversation_config.tts.model_id}`);
    console.log(`   Language: English`);
    console.log('');

    // Create the agent
    console.log('🚀 Sending request to ElevenLabs API...');
    const response = await client.post('/convai/agents/create', agentConfig);

    console.log('');
    console.log('✅ SUCCESS! Voice Agent Created!');
    console.log('━'.repeat(50));
    console.log(`Agent ID: ${response.data.agent_id}`);
    console.log(`Name: ${response.data.name || agentConfig.name}`);
    console.log('━'.repeat(50));
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Copy the Agent ID above');
    console.log('2. Go to http://localhost:5173/app/agents');
    console.log('3. Use this Agent ID to configure your voice workflows');
    console.log('');
    console.log('💡 You can also test this agent at:');
    console.log('   https://elevenlabs.io/app/conversational-ai');
    console.log('');

    return response.data;
  } catch (error) {
    console.error('');
    console.error('❌ ERROR Creating Agent:');
    console.error('━'.repeat(50));

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${JSON.stringify(error.response.data, null, 2)}`);

      if (error.response.status === 401) {
        console.error('');
        console.error('🔑 Authentication Error:');
        console.error('   Your ELEVENLABS_API_KEY may be invalid or expired');
        console.error('   Please check your .env file');
      } else if (error.response.status === 429) {
        console.error('');
        console.error('⏰ Rate Limit Error:');
        console.error('   You\'ve hit the API rate limit');
        console.error('   Please wait a moment and try again');
      }
    } else {
      console.error(`Error: ${error.message}`);
    }

    console.error('━'.repeat(50));
    console.error('');
    throw error;
  }
}

// Run the script
console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║   VoiceNow CRM - ElevenLabs Agent Creator    ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

createVoiceAgent()
  .then(() => {
    console.log('🎉 Agent creation completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    console.log('💔 Agent creation failed. Please check the error above.');
    process.exit(1);
  });
