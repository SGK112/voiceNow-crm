import dotenv from 'dotenv';
import twilio from 'twilio';

// Load environment variables
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('🔍 Testing Twilio Access...\n');
console.log(`Account SID: ${accountSid?.substring(0, 10)}...`);
console.log(`Phone Number: ${phoneNumber}\n`);

if (!accountSid || !authToken) {
  console.error('❌ Missing Twilio credentials');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testTwilioAccess() {
  try {
    // Test 1: Fetch account info
    console.log('📞 Test 1: Fetching account info...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ Account Status: ${account.status}`);
    console.log(`   Friendly Name: ${account.friendlyName}`);
    console.log(`   Type: ${account.type}\n`);

    // Test 2: List phone numbers
    console.log('📱 Test 2: Fetching phone numbers...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    console.log(`✅ Found ${phoneNumbers.length} phone number(s):`);
    phoneNumbers.forEach((number, i) => {
      console.log(`   ${i + 1}. ${number.phoneNumber} (${number.friendlyName || 'No name'})`);
      console.log(`      Voice URL: ${number.voiceUrl || 'Not configured'}`);
      console.log(`      SMS URL: ${number.smsUrl || 'Not configured'}`);
    });
    console.log('');

    // Test 3: Check account balance (if available)
    console.log('💰 Test 3: Checking account balance...');
    try {
      const balance = await client.balance.fetch();
      console.log(`✅ Balance: $${balance.balance} ${balance.currency}`);
    } catch (balanceError) {
      console.log('⚠️  Balance info not available for this account type');
    }
    console.log('');

    // Test 4: List recent messages (last 5)
    console.log('💬 Test 4: Fetching recent messages...');
    try {
      const messages = await client.messages.list({ limit: 5 });
      console.log(`✅ Found ${messages.length} recent message(s):`);
      messages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.direction} - ${msg.from} → ${msg.to}`);
        console.log(`      Status: ${msg.status}`);
        console.log(`      Date: ${msg.dateCreated}`);
      });
    } catch (msgError) {
      console.log('⚠️  Could not fetch messages');
    }
    console.log('');

    console.log('✅ All Twilio tests completed successfully!');
    console.log('\n🎉 Twilio is properly configured and accessible!');

  } catch (error) {
    console.error('\n❌ Twilio access test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Status: ${error.status || 'N/A'}`);

    if (error.code === 20003) {
      console.error('\n   ⚠️  Authentication failed - check your Account SID and Auth Token');
    }

    process.exit(1);
  }
}

testTwilioAccess();
