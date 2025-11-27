import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ElevenLabsService from '../services/elevenLabsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const elevenLabsService = new ElevenLabsService();

async function makeConversationalCall() {
  console.log('📞 Making CONVERSATIONAL AI demo call...');
  console.log('🎯 This will use ElevenLabs Conversational AI for HIGH QUALITY\n');

  try {
    // First, get available agents
    console.log('🔍 Fetching your ElevenLabs agents...');
    const agents = await elevenLabsService.getAgents();

    if (!agents || agents.length === 0) {
      console.log('⚠️  No agents found. Creating a demo agent...');

      // Create a simple demo agent
      const demoAgent = await elevenLabsService.createAgent({
        name: 'VoiceFlow Demo Agent',
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
        prompt: `You are a friendly demo assistant for VoiceNow CRM.

Your job is to briefly introduce yourself and explain what VoiceNow CRM can do.

Keep it short and natural:
1. Greet the person warmly
2. Explain that you're calling to demonstrate the ElevenLabs integration
3. Mention that this is a REAL conversational AI, not a recording
4. Ask if they have any questions about the system
5. If they respond, have a natural conversation
6. End the call politely

Be conversational, natural, and friendly. This is a live demo to show the quality difference.`,
        first_message: "Hi! This is a demo call from your VoiceNow CRM system. I'm an actual conversational AI agent powered by ElevenLabs - not a pre-recorded message. Can you hear how much clearer and more natural I sound? I can actually listen and respond to what you say. Would you like to ask me anything about the VoiceFlow system, or should I let you go?",
        language: 'en'
      });

      console.log('✅ Created demo agent:', demoAgent.agent_id);

      // Make the call with the new agent
      const call = await elevenLabsService.initiateCall(
        demoAgent.agent_id,
        '+14802555887',
        process.env.WEBHOOK_URL + '/api/webhooks/call-completed'
      );

      console.log('\n✅ Conversational AI call initiated!');
      console.log(`📞 Call ID: ${call.call_id || 'pending'}`);
      console.log(`🎙️ Using: ElevenLabs Conversational AI`);
      console.log(`🗣️ Agent: ${demoAgent.name}`);

    } else {
      // Use the first available agent
      const agent = agents[0];
      console.log(`✅ Found agent: ${agent.name} (${agent.agent_id})`);

      // Make the call with custom script
      const personalizedScript = `You are a friendly demo assistant for VoiceNow CRM.

This is a demo call to show the HIGH QUALITY of ElevenLabs Conversational AI compared to text-to-speech.

Your job is to:
1. Greet the person warmly
2. Explain that you're calling to demonstrate the difference in call quality
3. Mention that THIS is real conversational AI - you can listen and respond naturally
4. The previous call was just text-to-speech playback, which is why it sounded robotic
5. Ask if they notice the quality difference
6. Have a brief natural conversation if they want to talk
7. End politely

Keep it natural, conversational, and under 2 minutes total.`;

      const firstMessage = "Hi! This is your second demo call from VoiceNow CRM. Can you hear the difference? I'm using ElevenLabs CONVERSATIONAL AI now instead of text-to-speech. I can actually listen and respond to you in real-time. Notice how much clearer and more natural I sound? The first call was just playing back pre-recorded audio, but I'm actually having a conversation with you right now. Pretty cool, right?";

      const call = await elevenLabsService.initiateCall(
        agent.agent_id,
        '+14802555887',
        process.env.WEBHOOK_URL + '/api/webhooks/call-completed',
        {}, // No dynamic variables
        personalizedScript,
        firstMessage,
        'EXAVITQu4vr4xnSDxMaL' // Sarah voice
      );

      console.log('\n✅ Conversational AI call initiated!');
      console.log(`📞 Call ID: ${call.call_id || 'pending'}`);
      console.log(`🎙️ Using: ElevenLabs Conversational AI`);
      console.log(`🗣️ Agent: ${agent.name}`);
    }

    console.log('\n💡 Quality Comparison:');
    console.log('   Previous call: Text-to-speech (like a recording)');
    console.log('   This call: Conversational AI (real-time conversation)');
    console.log('\n📱 You should hear a MUCH better quality call!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

makeConversationalCall()
  .then(() => {
    console.log('\n✨ Call initiated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to make conversational call');
    process.exit(1);
  });
