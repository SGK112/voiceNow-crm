import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 CHECKING ACTUAL SETUP...\n');

const PHONE_ID = 'phnum_2701kacmjq23fzaacdgqwt0qty0b';
const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';

// Check phone number
const phone = await axios.get(
  `https://api.elevenlabs.io/v1/convai/phone-numbers/${PHONE_ID}`,
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

console.log('📞 PHONE NUMBER: +16028337194');
console.log('   Status:', phone.data.status || 'active');
console.log('   Assigned Agent:', phone.data.agent_id || 'NONE ❌');
console.log('   Webhook:', phone.data.webhook_url || 'NONE ❌');

// Check agent
const agent = await axios.get(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

console.log('\n🤖 AGENT: Emma');
console.log('   Voice:', agent.data.conversation_config?.tts?.voice_id);
console.log('   Model:', agent.data.conversation_config?.tts?.model_id);
console.log('   LLM:', agent.data.conversation_config?.agent?.prompt?.llm || 'default');

console.log('\n📋 WHAT SHOULD HAPPEN:');
console.log('1. Call (602) 833-7194');
console.log('2. ElevenLabs Conversational AI answers (using the agent)');
console.log('3. Has full conversation');
console.log('4. When call ends, ElevenLabs sends webhook');
console.log('5. Your server processes it');

if (!phone.data.agent_id) {
  console.log('\n❌ PROBLEM: Phone not assigned to agent!');
  console.log('   That\'s why it\'s not working properly');
}

if (!phone.data.webhook_url) {
  console.log('\n❌ PROBLEM: No webhook on phone number!');
}
