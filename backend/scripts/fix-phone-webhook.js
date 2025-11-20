import ElevenLabsService from '../services/elevenLabsService.js';
import dotenv from 'dotenv';

dotenv.config();

const elevenLabsService = new ElevenLabsService();

const PHONE_NUMBER = '+16028337194';
const AGENT_ID = 'agent_4401kacmh26fet9asap21g1516p5';
const WEBHOOK_URL = process.env.WEBHOOK_BASE_URL + '/api/webhooks/elevenlabs/call-completed';

console.log('🔧 Fixing phone number configuration...\n');
console.log('Phone:', PHONE_NUMBER);
console.log('Agent:', AGENT_ID);
console.log('Webhook:', WEBHOOK_URL);
console.log('');

try {
  await elevenLabsService.assignPhoneToAgent(PHONE_NUMBER, AGENT_ID, WEBHOOK_URL);

  console.log('✅ SUCCESS! Phone number configured with:');
  console.log('   - Agent ID: ' + AGENT_ID);
  console.log('   - Webhook URL: ' + WEBHOOK_URL);
  console.log('');
  console.log('🎯 Now call the number again and complete a booking!');
  console.log('   After you hang up, the webhook should arrive.');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('');
  console.error('Details:', error.response?.data || error);
}
