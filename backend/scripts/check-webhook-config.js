import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';

console.log('🔍 Checking Emma\'s webhook configuration...\n');

try {
  const response = await axios.get(
    `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
    {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    }
  );

  console.log('Agent Name:', response.data.name);
  console.log('Agent ID:', response.data.agent_id);
  console.log('Webhook URL:', response.data.webhook_url || 'NOT SET ❌');
  
  if (!response.data.webhook_url) {
    console.log('\n❌ PROBLEM: No webhook configured!');
    console.log('That\'s why you\'re not getting notifications.');
  } else {
    console.log('\n✅ Webhook is configured');
  }
} catch (error) {
  console.error('Error:', error.message);
}
