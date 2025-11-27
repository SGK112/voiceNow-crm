import twilio from 'twilio';
import 'dotenv/config';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TEST_PHONE = '+14802555887'; // Josh's phone

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function sendTestSMS() {
  try {
    console.log('📱 Sending test SMS...\n');
    console.log(`   From: ${TWILIO_PHONE_NUMBER}`);
    console.log(`   To: ${TEST_PHONE}`);
    console.log(`   Message: "What is VoiceNow CRM?"\n`);

    const message = await client.messages.create({
      body: 'What is VoiceNow CRM?',
      from: TWILIO_PHONE_NUMBER,
      to: TEST_PHONE
    });

    console.log('✅ SMS sent successfully!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}\n`);

    console.log('🔍 Now check:');
    console.log('   1. Server logs for incoming SMS webhook');
    console.log('   2. AI response generation');
    console.log('   3. Reply SMS sent back\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendTestSMS();
