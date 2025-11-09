import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

async function fetchElevenLabsAgents() {
  try {
    console.log('🔍 Fetching ElevenLabs agents...\n');
    console.log('API Key:', ELEVENLABS_API_KEY ? `${ELEVENLABS_API_KEY.substring(0, 15)}...` : 'NOT SET');

    const response = await axios.get('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Successfully retrieved agents!\n');
    console.log('📋 Total Agents:', response.data.agents?.length || 0);
    console.log('\n' + '='.repeat(80) + '\n');

    if (response.data.agents && response.data.agents.length > 0) {
      response.data.agents.forEach((agent, index) => {
        console.log(`Agent #${index + 1}:`);
        console.log(`  Name: ${agent.name}`);
        console.log(`  Agent ID: ${agent.agent_id}`);
        console.log(`  Created: ${agent.created_at}`);
        console.log(`  Language: ${agent.conversation_config?.agent?.language || 'N/A'}`);
        console.log(`  Voice ID: ${agent.conversation_config?.tts?.voice_id || 'N/A'}`);
        console.log(`  First Message: ${agent.conversation_config?.agent?.first_message?.substring(0, 60)}...`);
        console.log('\n' + '-'.repeat(80) + '\n');
      });

      console.log('\n📝 Environment Variable Format:\n');
      console.log('Copy these to your .env file:\n');

      response.data.agents.forEach((agent, index) => {
        const agentName = agent.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        console.log(`ELEVENLABS_${agentName}_AGENT_ID=${agent.agent_id}`);
      });

      console.log('\n💡 Suggested mapping for your CRM:\n');
      response.data.agents.forEach((agent) => {
        const name = agent.name.toLowerCase();
        if (name.includes('lead') || name.includes('sarah')) {
          console.log(`ELEVENLABS_LEAD_GEN_AGENT_ID=${agent.agent_id}  # ${agent.name}`);
        } else if (name.includes('book') || name.includes('appointment') || name.includes('mike')) {
          console.log(`ELEVENLABS_BOOKING_AGENT_ID=${agent.agent_id}  # ${agent.name}`);
        } else if (name.includes('collect') || name.includes('payment') || name.includes('james')) {
          console.log(`ELEVENLABS_COLLECTIONS_AGENT_ID=${agent.agent_id}  # ${agent.name}`);
        } else if (name.includes('promo') || name.includes('sales') || name.includes('lisa')) {
          console.log(`ELEVENLABS_PROMO_AGENT_ID=${agent.agent_id}  # ${agent.name}`);
        } else if (name.includes('support') || name.includes('help') || name.includes('alex')) {
          console.log(`ELEVENLABS_SUPPORT_AGENT_ID=${agent.agent_id}  # ${agent.name}`);
        } else {
          console.log(`# ${agent.name}: ${agent.agent_id}`);
        }
      });

    } else {
      console.log('⚠️  No agents found in your ElevenLabs account.');
      console.log('\nYou need to create conversational AI agents at:');
      console.log('https://elevenlabs.io/app/conversational-ai\n');
    }

  } catch (error) {
    console.error('\n❌ Error fetching agents:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);

      if (error.response.status === 401) {
        console.log('\n⚠️  Authentication failed. Please check your ELEVENLABS_API_KEY in .env');
      } else if (error.response.status === 403) {
        console.log('\n⚠️  Access forbidden. Your API key may not have access to Conversational AI features.');
        console.log('You may need to upgrade your ElevenLabs plan.');
      }
    } else {
      console.error('Message:', error.message);
    }
  }
}

fetchElevenLabsAgents();
