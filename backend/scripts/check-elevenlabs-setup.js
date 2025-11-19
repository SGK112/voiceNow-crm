import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';
const PHONE_NUMBER_ID = 'phnum_2701kacmjq23fzaacdgqwt0qty0b';

console.log('🔍 Checking ElevenLabs setup...\n');

// Check agent
const agent = await axios.get(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

console.log('Agent:', agent.data.name);
console.log('Webhook on agent:', agent.data.webhook_url || 'NOT SET');

// Check phone number
const phone = await axios.get(
  `https://api.elevenlabs.io/v1/convai/phone-numbers/${PHONE_NUMBER_ID}`,
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

console.log('\nPhone:', phone.data.phone_number);
console.log('Assigned agent:', phone.data.agent_id);
console.log('Webhook on phone:', phone.data.webhook_url || 'NOT SET');

console.log('\n❌ PROBLEM:');
console.log('ElevenLabs webhooks need to be set on the PHONE NUMBER');
console.log('Not just the agent!');

console.log('\n💡 SOLUTION:');
console.log('Set webhook on phone number: phnum_2701kacmjq23fzaacdgqwt0qty0b');
