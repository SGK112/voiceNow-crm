import ElevenLabsService from '../services/elevenLabsService.js';
import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testElevenLabsSync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

    console.log('📥 Fetching conversations from ElevenLabs API...\n');

    const conversations = await elevenLabsService.getConversations({
      pageSize: 10
    });

    console.log('📊 API Response:');
    console.log('================');
    console.log('Total conversations:', conversations.conversations?.length || 0);
    console.log('');

    if (conversations.conversations && conversations.conversations.length > 0) {
      console.log('✅ Found conversations! Here are the first 3:\n');

      conversations.conversations.slice(0, 3).forEach((conv, i) => {
        console.log(`Conversation ${i + 1}:`);
        console.log('  ID:', conv.conversation_id);
        console.log('  Agent ID:', conv.agent_id);
        console.log('  Status:', conv.status);
        console.log('  Duration:', conv.call_duration_seconds, 'seconds');
        console.log('  Phone:', conv.metadata?.phone_number || 'Unknown');
        console.log('  Has Transcript:', !!conv.transcript);
        console.log('');
      });

      // Check which agents match
      console.log('🔍 Checking agent matches in database...\n');
      const agents = await VoiceAgent.find({}).lean();

      for (const conv of conversations.conversations.slice(0, 3)) {
        const matchingAgent = agents.find(a => a.elevenLabsAgentId === conv.agent_id);
        if (matchingAgent) {
          console.log(`✅ Conversation ${conv.conversation_id} matches agent: ${matchingAgent.name}`);
        } else {
          console.log(`⚠️ Conversation ${conv.conversation_id} has no matching agent (agent_id: ${conv.agent_id})`);
        }
      }

    } else {
      console.log('⚠️ No conversations found in ElevenLabs account');
      console.log('\nPossible reasons:');
      console.log('  1. No calls have been made yet');
      console.log('  2. API key might not have access to conversations');
      console.log('  3. Conversations API endpoint might be different');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

testElevenLabsSync();
