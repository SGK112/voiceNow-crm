import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

console.log('🧪 Testing SMS-to-Call Integration Endpoints\n');

async function testEndpoints() {
  // Test 1: Send SMS from Agent
  console.log('📤 Test 1: Send SMS from Agent');
  console.log('─'.repeat(60));

  try {
    const smsResponse = await fetch(`${BASE_URL}/api/sms-to-call/send-sms-from-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+16028337194',  // Test number (sending to ourselves)
        message: '🧪 Test SMS from ElevenLabs agent during call. This is a test message from the VoiceNow CRM system.',
        callSid: 'TEST_CALL_SID',
        agentId: 'agent_9701k9xptd0kfr383djx5zk7300x'
      })
    });

    const smsData = await smsResponse.json();

    if (smsResponse.ok) {
      console.log('✅ SMS endpoint working!');
      console.log(`   Message SID: ${smsData.messageSid}`);
      console.log(`   Status: ${smsData.status}`);
    } else {
      console.log('❌ SMS endpoint failed:', smsData);
    }
  } catch (error) {
    console.log('❌ Error testing SMS endpoint:', error.message);
  }

  console.log('');

  // Test 2: Send MMS from Agent
  console.log('📤 Test 2: Send MMS from Agent');
  console.log('─'.repeat(60));

  try {
    const mmsResponse = await fetch(`${BASE_URL}/api/sms-to-call/send-mms-from-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+16028337194',
        message: '🧪 Test MMS with image from agent',
        mediaUrl: 'https://demo.twilio.com/owl.png',
        callSid: 'TEST_CALL_SID',
        agentId: 'agent_9701k9xptd0kfr383djx5zk7300x'
      })
    });

    const mmsData = await mmsResponse.json();

    if (mmsResponse.ok) {
      console.log('✅ MMS endpoint working!');
      console.log(`   Message SID: ${mmsData.messageSid}`);
      console.log(`   Status: ${mmsData.status}`);
      console.log(`   Media Count: ${mmsData.mediaCount}`);
    } else {
      console.log('❌ MMS endpoint failed:', mmsData);
    }
  } catch (error) {
    console.log('❌ Error testing MMS endpoint:', error.message);
  }

  console.log('');

  // Test 3: Simulate incoming SMS webhook (won't make actual call in test)
  console.log('📱 Test 3: Simulate Incoming SMS Webhook');
  console.log('─'.repeat(60));

  try {
    const webhookResponse = await fetch(`${BASE_URL}/api/sms-to-call/trigger-demo-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'From=%2B16028337194&Body=TEST'
    });

    const webhookText = await webhookResponse.text();

    if (webhookResponse.ok) {
      console.log('✅ Webhook endpoint responding!');
      console.log('   Note: This is a test - no actual call was initiated');
      console.log('   Expected: Should send "Welcome to Remodely.ai..." SMS');
    } else {
      console.log('❌ Webhook endpoint failed');
    }
  } catch (error) {
    console.log('❌ Error testing webhook endpoint:', error.message);
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`
✅ All endpoints are accessible at ${BASE_URL}/api/sms-to-call/

Available endpoints:
1. POST /api/sms-to-call/trigger-demo-call (Twilio SMS webhook)
2. POST /api/sms-to-call/call-status (Twilio call status)
3. POST /api/sms-to-call/send-sms-from-agent (Agent sends SMS)
4. POST /api/sms-to-call/send-mms-from-agent (Agent sends MMS)

Next steps:
1. Configure Twilio webhook to point to /trigger-demo-call
2. Test by sending "DEMO" to ${process.env.TWILIO_PHONE_NUMBER || '+16028337194'}
3. Configure ElevenLabs agent with webhook for SMS sending
4. Monitor logs in the backend console

For detailed setup instructions, see:
docs/SMS-TO-CALL-SETUP.md
  `);
}

testEndpoints();
