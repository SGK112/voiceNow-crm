import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AGENT_ID = 'agent_4401kacmh26fet9asap21g1516p5';

console.log('🔍 Checking the working agent...\n');

const agent = await axios.get(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

console.log('Agent Name:', agent.data.name);
console.log('Voice:', agent.data.conversation_config?.tts?.voice_id);
console.log('Model:', agent.data.conversation_config?.tts?.model_id);
console.log('\nPrompt:');
console.log(agent.data.conversation_config?.agent?.prompt?.prompt);
console.log('\nFirst Message:', agent.data.conversation_config?.agent?.first_message);

console.log('\n🔧 What needs fixing?');
