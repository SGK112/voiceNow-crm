import ElevenLabsService from './backend/services/elevenLabsService.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAgent() {
  try {
    const service = new ElevenLabsService();
    const agentId = 'agent_5001kaf95rrne51rrew7b65wkr1w';

    console.log('🔍 Fetching ElevenLabs agent configuration...\n');

    const agent = await service.getAgentById(agentId);

    console.log('Agent Details:');
    console.log('  Name:', agent.name);
    console.log('  Voice ID:', agent.conversation_config?.agent?.prompt?.voice?.voice_id);
    console.log('  Voice Name:', agent.conversation_config?.agent?.prompt?.voice?.name);
    console.log('  First Message:', agent.conversation_config?.agent?.first_message?.substring(0, 80) + '...');
    console.log('  System Prompt:', agent.conversation_config?.agent?.prompt?.prompt?.substring(0, 100) + '...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAgent();
