import axios from 'axios';

console.log('🧪 Quick Webhook & Email Test\n');

const MY_EMAIL = 'help.remodely@gmail.com'; // Change this to YOUR email!

console.log('📧 This test will send an email to:', MY_EMAIL);
console.log('⚠️  Make sure to check your spam folder!');
console.log('');

const testData = {
  call_id: 'quick_test_' + Date.now(),
  agent_id: 'agent_4401kacmh26fet9asap21g1516p5',
  caller_phone: '+14155551234',
  caller_name: 'Quick Test',
  to_number: '+16028337194',
  duration: 60,
  status: 'completed',
  direction: 'inbound',
  timestamp: new Date().toISOString(),
  transcript: 'Quick test - consultation booked',
  email: MY_EMAIL,
  consultation_booked: true,
  customer_email: MY_EMAIL,
  customer_name: 'Quick Test',
  consultation_date: '2025-11-25',
  consultation_time: '10:00',
  address: '123 Test Street, Phoenix, AZ'
};

console.log('📡 Sending test webhook...\n');

try {
  const response = await axios.post(
    'http://localhost:5001/api/webhooks/elevenlabs/call-completed',
    testData
  );

  console.log('✅ WEBHOOK SUCCESSFUL!');
  console.log('Response:', response.data);
  console.log('');
  console.log('✉️  Email should have been sent to:', MY_EMAIL);
  console.log('');
  console.log('📬 CHECK YOUR INBOX:');
  console.log('   Subject: "Consultation Scheduled with Surprise Granite"');
  console.log('   From: Surprise Granite (help.remodely@gmail.com)');
  console.log('   Attachment: invite.ics');
  console.log('');
  console.log('⚠️  If you don\'t see it:');
  console.log('   1. Check SPAM folder');
  console.log('   2. Search for "Surprise Granite"');
  console.log('   3. Check the email address is correct above');

} catch (error) {
  console.error('❌ ERROR:', error.response?.data || error.message);
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('   - Is backend running? (http://localhost:5001)');
  console.log('   - Check backend logs for errors');
}
