import mongoose from 'mongoose';
import VoiceAgent from '../models/VoiceAgent.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const agent = await VoiceAgent.findOne({ elevenLabsAgentId: 'agent_4401kacmh26fet9asap21g1516p5' });

if (!agent) {
  console.log('Agent not found');
  process.exit(1);
}

const newScript = fs.readFileSync('/tmp/updated-agent-script-v2.txt', 'utf8');

console.log('📝 Updating agent with improved email handling...\n');

// Update in database
agent.script = newScript;
await agent.save();
console.log('✅ Database updated');

// Update in ElevenLabs
try {
  const elevenLabsService = new ElevenLabsService();

  await elevenLabsService.updateAgent(agent.elevenLabsAgentId, {
    prompt: { prompt: newScript }
  });
  console.log('✅ ElevenLabs agent updated');
} catch (error) {
  console.error('❌ Error updating ElevenLabs:', error.message);
}

await mongoose.disconnect();
console.log('\n✅ DONE! Agent updated with:');
console.log('   - Better email handling (joshb@surprisegranite.com)');
console.log('   - No year confirmation needed');
console.log('   - Less confirmation loops');
console.log('\n🎯 Hang up current call, wait 30 seconds, then call again!');
