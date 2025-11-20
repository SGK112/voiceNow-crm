import axios from 'axios';

const WEBHOOK_URL = 'http://localhost:5001/api/webhooks/elevenlabs/call-completed';

// CHANGE THIS TO YOUR EMAIL!
const MY_EMAIL = 'your-email@gmail.com'; // <-- PUT YOUR EMAIL HERE

const testCall = {
  call_id: 'test_' + Date.now(),
  agent_id: 'agent_4401kacmh26fet9asap21g1516p5',
  caller_phone: '+14155551234',
  caller_name: 'Test User',
  to_number: '+16028337194',
  duration: 120,
  status: 'completed',
  direction: 'inbound',
  timestamp: new Date().toISOString(),
  transcript: 'Customer booked a consultation',
  email: MY_EMAIL,
  consultation_booked: true,
  customer_email: MY_EMAIL,
  customer_name: 'Test User',
  consultation_date: '2025-11-22',
  consultation_time: '14:00',
  address: '123 Test St, Phoenix, AZ 85001'
};

console.log('🧪 Sending test webhook...');
console.log('📧 Email will be sent to:', MY_EMAIL);
console.log('');

try {
  const response = await axios.post(WEBHOOK_URL, testCall);
  console.log('✅ SUCCESS!');
  console.log('Response:', response.data);
  console.log('');
  console.log('📬 Check your email:', MY_EMAIL);
  console.log('   Subject: "Consultation Scheduled with Surprise Granite"');
  console.log('   Attachment: invite.ics (calendar invite)');
} catch (error) {
  console.error('❌ Error:', error.response?.data || error.message);
}
