import dotenv from 'dotenv';
import ElevenLabsService from '../services/elevenLabsService.js';

dotenv.config();

async function checkAgent() {
  const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
  const agentId = 'agent_0901ka4va58zfqd8b59xpnh57fb5';

  try {
    console.log(`Checking agent: ${agentId}\n`);
    const agent = await elevenLabsService.getAgentById(agentId);

    console.log('✅ Agent found:');
    console.log('  Name:', agent.name);
    console.log('  Agent ID:', agent.agent_id);
    console.log('\n📝 Prompt (first 300 chars):');
    const prompt = agent.conversation_config?.agent?.prompt?.prompt || 'NO PROMPT';
    console.log(prompt.substring(0, 300));
    console.log('\n📞 First Message:');
    console.log(agent.conversation_config?.agent?.first_message || 'NO FIRST MESSAGE');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAgent();
