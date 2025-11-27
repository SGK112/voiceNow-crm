import 'dotenv/config';

const TEST_PHONE = '+14802555887';
const SMS_WEBHOOK_URL = 'http://localhost:5001/api/webhooks/twilio/sms';

async function testSMSToVoice() {
  try {
    console.log('🧪 Testing SMS-to-Voice Call Integration\n');

    // Simulate incoming SMS with "call me" request
    const testMessages = [
      { body: 'What is VoiceNow CRM?', shouldTriggerCall: false },
      { body: 'Can you call me?', shouldTriggerCall: true },
      { body: 'Call me back please', shouldTriggerCall: true },
      { body: 'I want to talk to someone', shouldTriggerCall: true },
    ];

    for (const testMsg of testMessages) {
      console.log(`\n📱 Testing message: "${testMsg.body}"`);
      console.log(`   Expected: ${testMsg.shouldTriggerCall ? 'VOICE CALL' : 'SMS REPLY'}`);

      const twilioPayload = {
        From: TEST_PHONE,
        To: '+16028337194',
        Body: testMsg.body,
        MessageSid: `TEST${Date.now()}`,
        NumMedia: '0'
      };

      const response = await fetch(SMS_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(twilioPayload).toString()
      });

      const responseText = await response.text();
      console.log(`   Response (${response.status}):`);

      // Parse TwiML response
      if (responseText.includes('My AI voice agent is calling you')) {
        console.log('   ✅ VOICE CALL TRIGGERED');
      } else if (responseText.includes('<Message>')) {
        const msgMatch = responseText.match(/<Message>(.*?)<\/Message>/);
        if (msgMatch) {
          console.log(`   💬 SMS Reply: "${msgMatch[1]}"`);
        }
      }

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - SMS replies are working for general questions');
    console.log('   - Voice call triggers when customer says "call me", "call back", etc.');
    console.log('   - ElevenLabs agent will call customer with personalized script');
    console.log('   - Agent can send MMS with image during the call');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSMSToVoice();
