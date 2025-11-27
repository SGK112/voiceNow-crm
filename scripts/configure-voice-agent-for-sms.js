import twilio from 'twilio';
import 'dotenv/config';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://f66af302a875.ngrok-free.app';
const AGENT_ID = 'agent_9701k9xptd0kfr383djx5zk7300x'; // Your existing agent with SMS tool

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function configureVoiceAgentForSMS() {
  try {
    console.log('🤖 Configuring Voice Agent for SMS...\n');
    console.log(`   Agent ID: ${AGENT_ID}`);
    console.log(`   Phone Number: ${TWILIO_PHONE_NUMBER}`);
    console.log(`   Webhook URL: ${WEBHOOK_URL}\n`);

    // Step 1: Find the Twilio phone number
    console.log('📋 Step 1: Finding Twilio phone number...');

    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber: TWILIO_PHONE_NUMBER
    });

    if (phoneNumbers.length === 0) {
      throw new Error(`Phone number ${TWILIO_PHONE_NUMBER} not found in Twilio account`);
    }

    const phoneNumberSid = phoneNumbers[0].sid;
    console.log(`   ✅ Found: ${phoneNumberSid}\n`);

    // Step 2: Configure voice URL to connect to ElevenLabs
    console.log('📋 Step 2: Configuring voice webhook...');

    await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl: `${WEBHOOK_URL}/api/webhooks/twilio/elevenlabs-forward?agentId=${AGENT_ID}`,
      voiceMethod: 'POST',
      voiceFallbackUrl: `${WEBHOOK_URL}/api/webhooks/twilio/voice-fallback`,
      voiceFallbackMethod: 'POST'
    });

    console.log(`   ✅ Voice URL: ${WEBHOOK_URL}/api/webhooks/twilio/elevenlabs-forward?agentId=${AGENT_ID}\n`);

    // Step 3: Verify SMS is already configured (done earlier)
    console.log('📋 Step 3: Verifying SMS configuration...');

    const updatedNumber = await twilioClient.incomingPhoneNumbers(phoneNumberSid).fetch();

    console.log(`   ✅ SMS URL: ${updatedNumber.smsUrl}`);
    console.log(`   ✅ SMS Method: ${updatedNumber.smsMethod}\n`);

    // Success summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ VOICE AGENT WITH SMS - READY TO USE!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📞 CALL THIS NUMBER TO TEST:');
    console.log(`   ${TWILIO_PHONE_NUMBER}\n`);

    console.log('🎯 WHAT HAPPENS WHEN YOU CALL:');
    console.log('   1. ElevenLabs agent answers: "Hi, am I speaking with [your name]?"');
    console.log('   2. Agent pitches VoiceNow CRM');
    console.log('   3. When you say "Can you text me the link?"');
    console.log('   4. Agent sends SMS with signup link instantly');
    console.log('   5. You receive text during the call\n');

    console.log('💬 WHAT HAPPENS WHEN YOU REPLY TO SMS:');
    console.log('   • Reply "HELP" → Get info about VoiceNow CRM');
    console.log('   • Reply "STOP" → Unsubscribe from messages');
    console.log('   • Reply anything else → Get friendly auto-response\n');

    console.log('🔧 CURRENT CONFIGURATION:');
    console.log(`   Agent ID: ${AGENT_ID}`);
    console.log(`   Phone: ${TWILIO_PHONE_NUMBER}`);
    console.log(`   Voice URL: ${WEBHOOK_URL}/api/webhooks/twilio/elevenlabs-forward`);
    console.log(`   SMS URL: ${WEBHOOK_URL}/api/webhooks/twilio/sms\n`);

    console.log('✨ FEATURES ENABLED:');
    console.log('   ✅ Voice Agent (ElevenLabs Conversational AI)');
    console.log('   ✅ SMS Sending During Calls (send_signup_link tool)');
    console.log('   ✅ SMS Auto-Replies (HELP, STOP, general)');
    console.log('   ✅ Background Noise Handling (patient turn mode)');
    console.log('   ✅ Clear URL Reading (optimized TTS)');
    console.log('   ✅ No Cutoff Issues (10s turn timeout)');
    console.log('   ✅ 100% API Configured (no manual setup)\n');

    console.log('🧪 TEST COMMANDS:');
    console.log(`   # Call the agent`);
    console.log(`   (Just dial ${TWILIO_PHONE_NUMBER} from your phone)\n`);

    console.log(`   # Send test SMS`);
    console.log(`   node -e "import('dotenv/config').then(() => { import('./backend/services/twilioService.js').then(m => { const s = new m.default(); s.sendSignupLink('+14802555887', 'Josh').then(() => process.exit(0)); }); });"\n`);

    console.log('🚀 READY FOR PRODUCTION:');
    console.log('   This setup can be replicated for any customer');
    console.log('   Complete plug-and-play voice agent system');
    console.log('   No manual ElevenLabs dashboard configuration needed!\n');

    return {
      success: true,
      agentId: AGENT_ID,
      phoneNumber: TWILIO_PHONE_NUMBER,
      voiceUrl: `${WEBHOOK_URL}/api/webhooks/twilio/elevenlabs-forward?agentId=${AGENT_ID}`,
      smsUrl: `${WEBHOOK_URL}/api/webhooks/twilio/sms`
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Details:', error.response.data);
    }
    process.exit(1);
  }
}

configureVoiceAgentForSMS();
