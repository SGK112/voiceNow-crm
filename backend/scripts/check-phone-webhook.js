import ElevenLabsService from '../services/elevenLabsService.js';
import dotenv from 'dotenv';

dotenv.config();

const elevenLabsService = new ElevenLabsService();

console.log('📞 Checking phone number configuration...\n');

try {
  const phoneNumbers = await elevenLabsService.getPhoneNumbers();

  const targetPhone = phoneNumbers.find(p => p.phone_number === '+16028337194');

  if (!targetPhone) {
    console.log('❌ Phone number +16028337194 not found!');
    process.exit(1);
  }

  console.log('Phone Number:', targetPhone.phone_number);
  console.log('Agent ID:', targetPhone.agent_id || '❌ NOT SET');
  console.log('Webhook URL:', targetPhone.webhook_url || '❌ NOT SET');
  console.log('');

  if (!targetPhone.webhook_url) {
    console.log('🔴 PROBLEM FOUND: No webhook URL configured on phone number!');
    console.log('');
    console.log('This is why you\'re not receiving webhooks from real calls.');
    console.log('');
    console.log('SOLUTION: Run this command to fix it:');
    console.log('  node scripts/fix-phone-webhook.js');
  } else if (!targetPhone.agent_id) {
    console.log('🔴 PROBLEM FOUND: No agent assigned to phone number!');
  } else {
    console.log('✅ Configuration looks correct');
    console.log('');
    console.log('Expected webhook URL:', process.env.WEBHOOK_BASE_URL + '/api/webhooks/elevenlabs/call-completed');
    console.log('Actual webhook URL:', targetPhone.webhook_url);

    if (targetPhone.webhook_url !== process.env.WEBHOOK_BASE_URL + '/api/webhooks/elevenlabs/call-completed') {
      console.log('');
      console.log('⚠️  Webhook URL mismatch! Run: node scripts/fix-phone-webhook.js');
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
