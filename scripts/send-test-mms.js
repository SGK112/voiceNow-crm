import TwilioService from '../backend/services/twilioService.js';
import 'dotenv/config';

const twilioService = new TwilioService();

const TEST_PHONE = '+14802555887'; // Josh's phone

async function sendTestMMS() {
  try {
    console.log('📱 Sending test MMS with image...\n');

    // Use a publicly accessible image URL for testing
    const imageUrl = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400';
    const message = 'Check out this beautiful contractor project! VoiceNow CRM helps you manage leads like this. Try free: remodely.ai/signup';

    console.log(`   To: ${TEST_PHONE}`);
    console.log(`   Message: "${message}"`);
    console.log(`   Image: ${imageUrl}\n`);

    const result = await twilioService.sendMMSWithImage(
      TEST_PHONE,
      message,
      imageUrl
    );

    console.log('✅ MMS sent successfully!');
    console.log(`   Message SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Price: ${result.price || 'pending'}\n`);

    console.log('🧪 Now test receiving MMS:');
    console.log('   1. Send an image from your phone to +16028337194');
    console.log('   2. Check server logs for AI vision analysis');
    console.log('   3. You should receive an intelligent reply about the image\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendTestMMS();
