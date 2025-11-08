import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('🧪 Testing Twilio Configuration...\n');
console.log('Account SID:', accountSid ? accountSid.substring(0, 10) + '...' : 'NOT SET');
console.log('Auth Token:', authToken ? '***' + authToken.substring(authToken.length - 4) : 'NOT SET');
console.log('From Number:', fromNumber || 'NOT SET');
console.log('');

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testTwilio() {
  try {
    // Test 1: Verify account
    console.log('📱 Test 1: Verifying Twilio account...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log('✅ Account verified:', account.friendlyName);
    console.log('   Status:', account.status);
    console.log('');

    // Test 2: List phone numbers
    console.log('📱 Test 2: Checking available phone numbers...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    console.log(`✅ Found ${phoneNumbers.length} phone number(s):`);
    phoneNumbers.forEach(number => {
      console.log(`   ${number.phoneNumber} - ${number.friendlyName}`);
    });
    console.log('');

    // Test 3: Check account balance
    console.log('📱 Test 3: Checking account balance...');
    const balance = await client.balance.fetch();
    console.log('✅ Balance:', balance.balance, balance.currency);
    console.log('');

    // Test 4: Send test SMS (optional - commented out by default)
    const sendTestSMS = false; // Set to true to send actual SMS

    if (sendTestSMS) {
      console.log('📱 Test 4: Sending test SMS...');
      console.log('⚠️  This will send an actual SMS and use credits!');

      const testPhoneNumber = '+16028334780'; // Change to your test number

      const message = await client.messages.create({
        body: 'Test message from VoiceFlow CRM! Your Twilio integration is working correctly. 🎉',
        from: fromNumber,
        to: testPhoneNumber
      });

      console.log('✅ Test SMS sent successfully!');
      console.log('   Message SID:', message.sid);
      console.log('   Status:', message.status);
      console.log('   To:', message.to);
      console.log('');
    } else {
      console.log('📱 Test 4: Test SMS sending (SKIPPED)');
      console.log('   To send a test SMS, edit this file and set sendTestSMS = true');
      console.log('');
    }

    console.log('═'.repeat(60));
    console.log('✅ All Twilio tests passed!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Add Twilio credentials to n8n:');
    console.log('   - Go to: https://remodely.app.n8n.cloud/credentials');
    console.log('   - Add new credential → Twilio');
    console.log('   - Enter Account SID and Auth Token');
    console.log('   - Save as: twilio_credentials');
    console.log('');
    console.log('2. Update your SMS workflows in n8n:');
    console.log('   - Open "Master: Send SMS After Call" workflow');
    console.log('   - Open "Master: Book Appointment" workflow');
    console.log('   - Link Twilio nodes to your credential');
    console.log('');
    console.log('3. Test end-to-end:');
    console.log('   - Make a call to your ElevenLabs agent');
    console.log('   - Check if SMS is sent automatically');
    console.log('');

  } catch (error) {
    console.error('❌ Twilio test failed:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    if (error.moreInfo) {
      console.error('   More info:', error.moreInfo);
    }
    console.log('');
    console.log('💡 Common issues:');
    console.log('   - Invalid credentials: Check Account SID and Auth Token');
    console.log('   - Unverified phone number: Add phone number to verified list');
    console.log('   - Trial account limits: Upgrade to send to unverified numbers');
    console.log('');
    process.exit(1);
  }
}

testTwilio();
