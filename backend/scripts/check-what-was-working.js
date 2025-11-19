import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Checking what Emma currently has...\n');

const agent = await axios.get(
  'https://api.elevenlabs.io/v1/convai/agents/agent_1401kadsbxczf28b34twm35wega7',
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

console.log('Current Emma config:');
console.log('Voice:', agent.data.conversation_config?.tts?.voice_id);
console.log('Model:', agent.data.conversation_config?.tts?.model_id);
console.log('LLM:', agent.data.conversation_config?.agent?.prompt?.llm);
console.log('Temperature:', agent.data.conversation_config?.agent?.prompt?.temperature);
console.log('\nFirst message:', agent.data.conversation_config?.agent?.first_message);
console.log('\nPrompt length:', agent.data.conversation_config?.agent?.prompt?.prompt?.length);

console.log('\n📋 YOU SAID:');
console.log('"The elevenlabs agents were working great"');
console.log('\nWhat was different before I fucked with it?');
console.log('Let me know what the agent was like when it worked.');
