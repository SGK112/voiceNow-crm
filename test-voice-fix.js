import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function testVoiceFix() {
  try {
    console.log('🧪 Testing voice fix with Sarah agent...\n');

    // Use the Sarah agent we created earlier
    const agentId = 'agent_8901ka7yahqxedjb36ccdnj855b1';

    console.log('📞 Initiating test call to +14802555887...\n');

    // Call configuration WITHOUT conversation_config_override
    // This should allow the agent to use its default TTS settings
    const callConfig = {
      call_name: 'Voice Fix Test - Sarah',
      agent_id: agentId,
      agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
      recipients: [
        {
          phone_number: '+14802555887'
        }
      ],
      webhook_url: `${WEBHOOK_URL}/api/webhooks/elevenlabs/conversation-event`
      // NO conversation_config_override - let agent use default config
    };

    console.log('🔍 Request config:');
    console.log('  - Agent ID:', agentId);
    console.log('  - Phone:', '+14802555887');
    console.log('  - Override:', 'NONE (using agent defaults)');
    console.log('');

    const callResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/batch-calling/submit',
      callConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const callId = callResponse.data.id || callResponse.data.batch_id;

    console.log('═══════════════════════════════════════');
    console.log('✅ SUCCESS! Test call initiated');
    console.log('═══════════════════════════════════════');
    console.log(`📞 Call ID: ${callId}`);
    console.log(`🤖 Agent: Sarah (Female Voice)`);
    console.log(`📱 Phone: +14802555887`);
    console.log(`🔧 Fix Applied: No conversation override`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('⏳ Your phone should ring in 5-15 seconds...');
    console.log('💬 This time you should HEAR Sarah speak!');
    console.log('');
    console.log('🎯 What to expect:');
    console.log('   - Phone rings');
    console.log('   - You answer');
    console.log('   - Sarah introduces herself with voice');
    console.log('   - You can have a conversation');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testVoiceFix();
