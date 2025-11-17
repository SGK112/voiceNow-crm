import mongoose from 'mongoose';
import VoiceAgent from './backend/models/VoiceAgent.js';
import User from './backend/models/User.js';
import ElevenLabsService from './backend/services/elevenLabsService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createAlexAgent() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceflow-crm');
    console.log('✅ Connected to MongoDB');

    // Get first user
    const user = await User.findOne();
    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      process.exit(1);
    }
    console.log(`👤 Using user: ${user.email}`);

    // Initialize ElevenLabs service
    const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

    // Get available voices
    const voicesData = await elevenLabsService.getVoices();
    const voices = Array.isArray(voicesData) ? voicesData : (voicesData.voices || []);
    console.log(`🎤 Found ${voices.length} voices`);

    // Select a voice (prefer "George" or first male voice, or just first voice)
    let selectedVoice = voices.find(v => v.name.toLowerCase().includes('george')) ||
                        voices.find(v => v.labels?.gender === 'male') ||
                        voices.find(v => v.name.toLowerCase().includes('adam')) ||
                        voices[0];

    if (!selectedVoice) {
      console.error('❌ No voices available');
      process.exit(1);
    }

    console.log(`🎤 Selected voice: ${selectedVoice.name}`);

    // Create ElevenLabs conversational AI agent
    console.log('🤖 Creating ElevenLabs agent...');
    const agentConfig = {
      name: 'Alex',
      voiceId: selectedVoice.voice_id,
      script: `You are Alex, a friendly and professional AI assistant for VoiceFlow CRM.

Your role is to:
- Greet callers warmly and professionally
- Ask how you can help them today
- Demonstrate the capabilities of VoiceFlow's AI voice agent platform
- Be conversational, helpful, and engaging

Keep your responses concise and natural. Always ask follow-up questions to keep the conversation flowing.`,
      firstMessage: "Hi! This is Alex calling from VoiceFlow CRM. I'm an AI assistant and I wanted to reach out and say hello. How are you doing today?",
      language: 'en',
      temperature: 0.8
    };

    const elevenLabsAgent = await elevenLabsService.createAgent(agentConfig);
    const elevenLabsAgentId = elevenLabsAgent.agent_id || elevenLabsAgent.id;

    console.log(`✅ ElevenLabs agent created: ${elevenLabsAgentId}`);

    // Save to database
    const agent = new VoiceAgent({
      userId: user._id,
      name: 'Alex',
      type: 'custom',
      customType: 'Test Agent',
      elevenLabsAgentId: elevenLabsAgentId,
      voiceId: selectedVoice.voice_id,
      voiceName: selectedVoice.name,
      script: agentConfig.script,
      firstMessage: agentConfig.firstMessage,
      configuration: {
        temperature: 0.8,
        maxDuration: 300,
        language: 'en'
      },
      enabled: true,
      deployment: {
        status: 'testing',
        version: 1
      }
    });

    await agent.save();
    console.log(`✅ Agent saved to database: ${agent._id}`);

    // Now make the call
    console.log('\n📞 Initiating call to +14802555887...');

    const phoneNumber = '+14802555887';
    const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/elevenlabs/conversation-event`;

    const dynamicVariables = {
      customer_name: 'Test User',
      lead_name: 'Test User',
      company_name: 'VoiceFlow CRM',
      demo_type: 'agent_lifecycle_test'
    };

    const callData = await elevenLabsService.initiateCall(
      elevenLabsAgentId,
      phoneNumber,
      agentPhoneNumberId,
      webhookUrl,
      dynamicVariables,
      agentConfig.script,
      agentConfig.firstMessage
    );

    console.log('\n✅ SUCCESS!');
    console.log('═══════════════════════════════════════');
    console.log(`📞 Call initiated: ${callData.id || callData.call_id || callData.batch_id}`);
    console.log(`🤖 Agent: Alex`);
    console.log(`📱 Phone: ${phoneNumber}`);
    console.log(`🎤 Voice: ${selectedVoice.name}`);
    console.log(`🆔 ElevenLabs ID: ${elevenLabsAgentId}`);
    console.log('═══════════════════════════════════════');
    console.log('\n⏳ Your phone should ring in 5-15 seconds...');
    console.log('💬 Alex will introduce himself and start a conversation!');

    // Close connection
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createAlexAgent();
