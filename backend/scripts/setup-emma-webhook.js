import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://f66af302a875.ngrok-free.app';

async function setupWebhook() {
  console.log('🔗 Setting up post-call webhook for Emma...\n');

  try {
    // Update agent with webhook URL
    const webhookEndpoint = `${WEBHOOK_URL}/api/webhooks/call-completed`;

    console.log(`📍 Webhook URL: ${webhookEndpoint}\n`);

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        webhook_url: webhookEndpoint
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Webhook configured!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 POST-CALL AUTOMATION SETUP:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Webhook: ${webhookEndpoint}`);
    console.log('');
    console.log('When a call ends, ElevenLabs will send data to this webhook.');
    console.log('Your server will then:');
    console.log('  1. Extract call transcript & lead info');
    console.log('  2. Save lead to CRM');
    console.log('  3. Send thank you email to customer');
    console.log('  4. Send SMS notification to you (480-255-5887)');
    console.log('  5. Send detailed email to you with transcript');

    console.log('\n🔍 CHECKING WEBHOOK ENDPOINT...\n');

    // Check if webhook endpoint exists
    try {
      const checkResponse = await axios.get(`${WEBHOOK_URL}/api/health`);
      console.log('✅ Server is reachable');
    } catch (error) {
      console.log('⚠️  Warning: Could not reach webhook server');
      console.log('   Make sure your backend is running and ngrok is active');
    }

    console.log('\n📞 NEXT STEPS:');
    console.log('1. Make a test call to (602) 833-7194');
    console.log('2. Book a fake consultation with your info');
    console.log('3. After call ends, check for:');
    console.log('   - SMS to your phone');
    console.log('   - Email notification');
    console.log('   - Lead in CRM');

    console.log('\n🐛 IF YOU DON\'T GET NOTIFICATIONS:');
    console.log('   Check backend logs for webhook errors:');
    console.log('   tail -f logs/app.log');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

setupWebhook()
  .then(() => {
    console.log('\n✨ Webhook setup complete!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
