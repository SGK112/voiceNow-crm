import axios from 'axios';

const testCall = {
  call_id: 'test_josh_' + Date.now(),
  agent_id: 'agent_4401kacmh26fet9asap21g1516p5',
  caller_phone: '+14805551234',
  caller_name: 'Josh Test',
  to_number: '+16028337194',
  duration: 120,
  status: 'completed',
  direction: 'inbound',
  timestamp: new Date().toISOString(),
  transcript: 'Customer booked a consultation',
  consultation_booked: true,
  customer_email: 'joshb@surprisegranite.com',
  customer_name: 'Josh',
  consultation_date: '2025-11-22',
  consultation_time: '14:00',
  address: '123 Test St, Surprise, AZ 85374'
};

console.log('🧪 Testing email to joshb@surprisegranite.com...\n');

try {
  const response = await axios.post(
    'http://localhost:5001/api/webhooks/elevenlabs/call-completed',
    testCall
  );
  console.log('✅ SUCCESS!');
  console.log('Response:', response.data);
  console.log('\n📬 CHECK YOUR EMAIL: joshb@surprisegranite.com');
  console.log('   Subject: "Consultation Scheduled with Surprise Granite"');
  console.log('   Date: Friday, November 22, 2025 at 2:00 PM');
  console.log('   Attachment: invite.ics (calendar invite)');
  console.log('\n⚠️  Check spam folder if not in inbox!');
} catch (error) {
  console.error('❌ Error:', error.response?.data || error.message);
}
