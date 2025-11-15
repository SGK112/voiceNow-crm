import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function checkAgent() {
  const agentId = 'agent_9301k802kktwfbhrbe9bam7f1spe';
  const apiKey = process.env.ELEVENLABS_API_KEY;

  try {
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        headers: {
          'xi-api-key': apiKey
        }
      }
    );

    console.log('Agent Configuration:');
    console.log('Name:', response.data.name);
    console.log('Agent ID:', response.data.agent_id);
    console.log('\nVoice Settings:');
    console.log('  Voice ID:', response.data.conversation_config?.tts?.voice_id || 'Not set');
    console.log('  Model:', response.data.conversation_config?.tts?.model_id || 'Not set');
    console.log('  Stability:', response.data.conversation_config?.tts?.stability || 'Not set');
    console.log('  Similarity:', response.data.conversation_config?.tts?.similarity_boost || 'Not set');
    console.log('\nFirst Message:');
    console.log(response.data.conversation_config?.agent?.first_message || 'NO FIRST MESSAGE');
    console.log('\nPrompt (first 500 chars):');
    console.log(response.data.conversation_config?.agent?.prompt?.prompt?.substring(0, 500) || 'NO PROMPT');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkAgent();
