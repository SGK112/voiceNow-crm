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

const newScript = fs.readFileSync('/tmp/updated-agent-script.txt', 'utf8');

console.log('📝 Updating agent script with date context...\n');

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

  // Re-assign phone number (critical step)
  if (agent.phoneNumber) {
    const webhookUrl = process.env.WEBHOOK_BASE_URL + '/api/webhooks/elevenlabs/call-completed';
    await elevenLabsService.assignPhoneToAgent(agent.phoneNumber, agent.elevenLabsAgentId, webhookUrl);
    console.log('✅ Phone number re-assigned with webhook');
  }
} catch (error) {
  console.error('❌ Error updating ElevenLabs:', error.message);
}

await mongoose.disconnect();
console.log('\n✅ DONE! Agent now knows today is November 19, 2025');
console.log('🎯 Try calling (602) 833-7194 again!');
