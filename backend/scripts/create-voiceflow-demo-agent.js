import dotenv from 'dotenv';
import ElevenLabsService from '../services/elevenLabsService.js';
import voiceflowDemoAgent from '../config/demoAgentTemplate.js';

dotenv.config();

/**
 * Create a dedicated VoiceFlow CRM Demo Agent in ElevenLabs
 * This agent will have the demo script as its base configuration
 */
async function createVoiceFlowDemoAgent() {
  try {
    console.log('🎙️ Creating VoiceFlow CRM Demo Agent in ElevenLabs...\n');

    const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

    // Get available voices
    console.log('📋 Fetching available voices...');
    const voicesData = await elevenLabsService.getVoices();
    const voices = voicesData.voices || [];

    console.log(`\nFound ${voices.length} voices. Here are some recommended ones:\n`);

    // Filter for good demo voices (energetic, professional)
    const recommendedVoices = voices.filter(v =>
      v.name.toLowerCase().includes('adam') ||
      v.name.toLowerCase().includes('charlie') ||
      v.name.toLowerCase().includes('eric') ||
      v.name.toLowerCase().includes('josh') ||
      v.name.toLowerCase().includes('michael')
    );

    recommendedVoices.slice(0, 5).forEach(voice => {
      console.log(`  - ${voice.name} (${voice.voice_id})`);
      console.log(`    Gender: ${voice.labels?.gender || 'Unknown'}, Age: ${voice.labels?.age || 'Unknown'}`);
      console.log(`    Description: ${voice.labels?.description || 'N/A'}\n`);
    });

    // Use a default professional male voice (Adam is typically good for sales)
    const adamVoice = voices.find(v => v.name === 'Adam');
    const selectedVoice = adamVoice || voices[0];

    console.log(`✅ Selected voice: ${selectedVoice.name} (${selectedVoice.voice_id})\n`);

    // Generate the demo script
    const demoScript = voiceflowDemoAgent.generatePrompt();

    console.log('📝 Demo script generated:');
    console.log(`   Length: ${demoScript.length} characters`);
    console.log(`   Preview: ${demoScript.substring(0, 150)}...\n`);

    // Create the agent
    console.log('🚀 Creating agent in ElevenLabs...');

    const agentConfig = {
      name: 'VoiceFlow CRM Demo Agent',
      voiceId: selectedVoice.voice_id,
      script: demoScript,
      firstMessage: "Hi! This is the AI demo agent from Remodely.ai calling you! Pretty cool that I'm calling you instantly after you texted 'DEMO', right? That's EXACTLY what VoiceFlow CRM can do for YOUR business - instant responses, 24/7. I'm here to show you what our platform can do! Quick question - what kind of business are you in, or what brought you to check us out?",
      language: 'en'
    };

    const agent = await elevenLabsService.createAgent(agentConfig);

    console.log('\n✅ SUCCESS! VoiceFlow CRM Demo Agent created!\n');
    console.log('📋 Agent Details:');
    console.log(`   Agent ID: ${agent.agent_id}`);
    console.log(`   Name: ${agent.name || agentConfig.name}`);
    console.log(`   Voice: ${selectedVoice.name}\n`);

    console.log('📝 Next Steps:');
    console.log('   1. Add this to your .env file:');
    console.log(`      ELEVENLABS_VOICEFLOW_DEMO_AGENT_ID=${agent.agent_id}\n`);
    console.log('   2. Update backend/routes/sms-to-call.js:');
    console.log('      Change DEMO_AGENT_ID to use ELEVENLABS_VOICEFLOW_DEMO_AGENT_ID\n');
    console.log('   3. Update backend/controllers/twilioWebhookController.js:');
    console.log('      Change demoAgentId to use ELEVENLABS_VOICEFLOW_DEMO_AGENT_ID\n');
    console.log('   4. Restart your server\n');

    console.log('🎉 You can now test the demo by texting "DEMO" or "call me" to your Twilio number!');

    return agent;

  } catch (error) {
    console.error('❌ Error creating VoiceFlow demo agent:', error);
    if (error.response?.data) {
      console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
createVoiceFlowDemoAgent()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
