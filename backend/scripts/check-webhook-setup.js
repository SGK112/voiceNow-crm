import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

// Check which model Emma is in
const Agent = mongoose.model('Agent', new mongoose.Schema({}, { strict: false }));
const VoiceAgent = mongoose.model('VoiceAgent', new mongoose.Schema({}, { strict: false }));

console.log('🔍 Checking Emma in database...\n');

const agents = await Agent.find({ name: /Emma/ });
console.log('Agents collection:', agents.length > 0 ? agents[0] : 'Not found');

const voiceAgents = await VoiceAgent.find({ name: /Emma/ });
console.log('\nVoiceAgents collection:', voiceAgents.length > 0 ? voiceAgents[0] : 'Not found');

console.log('\n📋 Issue found:');
console.log('Emma is in "agents" collection');
console.log('Webhook looks in "voiceagents" collection');
console.log('\n💡 Solution: Copy Emma to VoiceAgents collection');

await mongoose.disconnect();
