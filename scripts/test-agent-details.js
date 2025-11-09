import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const LEAD_GEN_AGENT_ID = process.env.ELEVENLABS_LEAD_GEN_AGENT_ID;

async function getAgentDetails() {
  try {
    console.log('🔍 Fetching agent details...\n');
    console.log(`Agent ID: ${LEAD_GEN_AGENT_ID}\n`);

    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${LEAD_GEN_AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    console.log('✅ Agent details retrieved!\n');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

getAgentDetails();
