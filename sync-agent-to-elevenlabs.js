import ElevenLabsService from './backend/services/elevenLabsService.js';
import VoiceAgent from './backend/models/VoiceAgent.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function syncAgent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const service = new ElevenLabsService();
    const agentId = '691e5adafacf88edc60b502c';

    // Get agent from database
    const agent = await VoiceAgent.findById(agentId);

    if (!agent) {
      console.log('❌ Agent not found in database');
      process.exit(1);
    }

    console.log('📋 Database Agent Configuration:');
    console.log('  Name:', agent.name);
    console.log('  Voice ID:', agent.voiceId);
    console.log('  Script:', agent.script?.substring(0, 80) + '...');
    console.log('  First Message:', agent.firstMessage);

    // Update ElevenLabs agent
    const elevenLabsConfig = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: agent.script,
            voice: {
              voice_id: agent.voiceId,
              name: 'Sarah - Friendly Female'
            }
          },
          first_message: agent.firstMessage,
          language: agent.language || 'en'
        }
      },
      name: agent.name
    };

    console.log('\n🔄 Updating ElevenLabs agent...');

    await service.updateAgent(agent.elevenLabsAgentId, elevenLabsConfig);

    console.log('✅ ElevenLabs agent updated successfully!');
    console.log('\n🎙️ Test the agent again - it should now use Sarah voice and Alex prompt');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncAgent();
