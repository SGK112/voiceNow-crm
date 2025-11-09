import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const LEAD_GEN_AGENT_ID = process.env.ELEVENLABS_LEAD_GEN_AGENT_ID;

async function makeTestCall(phoneNumber) {
  try {
    console.log('📞 Initiating test call...\n');
    console.log(`Agent ID: ${LEAD_GEN_AGENT_ID}`);
    console.log(`Phone Number: ${phoneNumber}`);
    console.log(`API Key: ${ELEVENLABS_API_KEY.substring(0, 15)}...\n`);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/convai/agents/${LEAD_GEN_AGENT_ID}/initiate`,
      {
        agent_phone_number_id: null,
        customer_phone_number: phoneNumber
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Call initiated successfully!\n');
    console.log('Call Details:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n📱 You should receive a call shortly from the Lead Generation Agent!');
    console.log('The agent will introduce themselves and ask about your business needs.');

  } catch (error) {
    console.error('\n❌ Error making call:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.log('\n⚠️  Authentication failed. Check your ELEVENLABS_API_KEY');
      } else if (error.response.status === 400) {
        console.log('\n⚠️  Bad request. Check the phone number format (+14802555887)');
      } else if (error.response.status === 403) {
        console.log('\n⚠️  Access forbidden. You may need phone calling credits or a higher plan.');
      } else if (error.response.status === 404) {
        console.log('\n⚠️  Agent not found. Check the agent ID.');
      } else if (error.response.status === 422) {
        console.log('\n⚠️  Validation error. You may need to set up a phone number for this agent first.');
        console.log('Or you may be missing calling credits.');
      }
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Get phone number from command line or use provided number
const phoneNumber = process.argv[2] || '+14802555887';

console.log('='.repeat(80));
console.log('🎙️  VOICEFLOW CRM - TEST CALL SCRIPT');
console.log('='.repeat(80));
console.log('\nThis will use the "VoiceFlow CRM - Lead Generation Agent"');
console.log('to make a test call.\n');

makeTestCall(phoneNumber);
