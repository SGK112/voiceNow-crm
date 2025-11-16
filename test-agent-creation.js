import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

async function testAgentCreation() {
  try {
    console.log('🧪 Testing Agent Creation...\n');

    // Create agent directly via ElevenLabs API (bypass auth)
    const agentConfig = {
      name: 'Test Sales Agent',
      conversation_config: {
        tts: {
          voice_id: 'cjVigY5qzO86Huf0OWal',
          model_id: 'eleven_flash_v2'
        },
        agent: {
          prompt: {
            prompt: 'You are a sales professional. Qualify leads by asking about their needs, budget, and timeline.'
          },
          first_message: "Hello! I'm your sales assistant. How can I help you today?",
          language: 'en'
        }
      }
    };

    const response = await axios.post('https://api.elevenlabs.io/v1/convai/agents/create', agentConfig, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Agent Created Successfully!');
    console.log(`Agent ID: ${response.data.agent_id}`);
    console.log(`Name: ${response.data.name || agentConfig.name}`);

    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

testAgentCreation();
