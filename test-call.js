import ElevenLabsService from './backend/services/elevenLabsService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

async function makeTestCall() {
  try {
    console.log('📞 Initiating test call...\n');

    const agentId = 'agent_1001ka64rmcye228y22qwjwca4hv';
    const phoneNumber = '+14802555887';
    const fromNumber = process.env.ELEVENLABS_PHONE_NUMBER_ID;

    if (!fromNumber) {
      console.error('❌ ELEVENLABS_PHONE_NUMBER_ID not found in .env file');
      console.log('\nTo make calls, you need to:');
      console.log('1. Get a phone number from ElevenLabs');
      console.log('2. Add ELEVENLABS_PHONE_NUMBER_ID to your .env file');
      console.log('3. Visit: https://elevenlabs.io/app/phone-numbers');
      process.exit(1);
    }

    console.log(`Agent ID: ${agentId}`);
    console.log(`Calling: ${phoneNumber}`);
    console.log(`From: ${fromNumber}\n`);

    const webhookUrl = `${process.env.WEBHOOK_URL || process.env.API_URL}/api/webhooks/elevenlabs/conversation-event`;

    const result = await elevenLabsService.initiateCall(
      agentId,
      phoneNumber,
      fromNumber,
      webhookUrl,
      { test_mode: 'true' }
    );

    console.log('✅ Call initiated successfully!');
    console.log('━'.repeat(50));
    console.log(`Call ID: ${result.call_id || result.id}`);
    console.log('━'.repeat(50));
    console.log('\n📱 You should receive a call shortly!');
    console.log('The VoiceFlow CRM Assistant will introduce itself and help qualify your needs.\n');

  } catch (error) {
    console.error('\n❌ Error initiating call:');
    console.error('━'.repeat(50));
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
    console.error('━'.repeat(50));
    process.exit(1);
  }
}

makeTestCall();
