import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Customer details
const CUSTOMER_PHONE = '+14802555887'; // Josh B
const CUSTOMER_NAME = 'Josh B';
const CUSTOMER_EMAIL = 'joshb@surprisegranite.com';

const AGENT_ID = process.env.ELEVENLABS_DEMO_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://voiceflow-crm.onrender.com';

async function triggerDemoCall() {
  try {
    console.log('\n📞 Initiating demo call...\n');
    console.log(`Customer: ${CUSTOMER_NAME}`);
    console.log(`Phone: ${CUSTOMER_PHONE}`);
    console.log(`Email: ${CUSTOMER_EMAIL}`);
    console.log(`Agent ID: ${AGENT_ID}\n`);

    // Initiate call via ElevenLabs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/convai/conversation`,
      {
        agent_id: AGENT_ID,
        require_authorization: true,
        call_to: CUSTOMER_PHONE,
        agent_phone_number_id: PHONE_NUMBER_ID,
        webhook_url: `${WEBHOOK_URL}/api/webhooks/elevenlabs/conversation-event`,
        metadata: {
          customer_name: CUSTOMER_NAME,
          customer_email: CUSTOMER_EMAIL,
          customer_phone: CUSTOMER_PHONE,
          trigger_source: 'manual_test',
          test_initiated_by: 'Claude Code'
        }
      },
      {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const callId = response.data.id || response.data.conversation_id;

    console.log('✅ Demo call initiated successfully!\n');
    console.log(`Call ID: ${callId}`);
    console.log(`Status: ${response.data.status || 'Calling...'}\n`);
    console.log('📱 The agent should be calling Josh now...\n');
    console.log('📧 You will receive an email at help.remodely@gmail.com after the call ends with:');
    console.log('   - Call transcript');
    console.log('   - Customer information');
    console.log('   - Whether they were interested');
    console.log('   - Recommended follow-up actions\n');

  } catch (error) {
    console.error('\n❌ Failed to initiate call:\n');
    console.error('Error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.error('\n⚠️  Authentication failed. Check your ELEVENLABS_API_KEY in .env');
    } else if (error.response?.status === 404) {
      console.error('\n⚠️  Agent or phone number not found. Check:');
      console.error('   - ELEVENLABS_DEMO_AGENT_ID');
      console.error('   - ELEVENLABS_PHONE_NUMBER_ID');
    } else if (error.response?.data) {
      console.error('\nDetails:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
console.log('\n🎙️ VoiceNow CRM Demo Call Test\n');
console.log('=' .repeat(50));
triggerDemoCall();
