import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WORKING_AGENT = 'agent_4401kacmh26fet9asap21g1516p5';
const PHONE_ID = 'phnum_2701kacmjq23fzaacdgqwt0qty0b';
const WEBHOOK_URL = 'https://f66af302a875.ngrok-free.app/api/webhooks/call-completed';

console.log('✅ Using the WORKING agent...\n');

// Assign to phone
await axios.patch(
  `https://api.elevenlabs.io/v1/convai/phone-numbers/${PHONE_ID}`,
  {
    agent_id: WORKING_AGENT,
    webhook_url: WEBHOOK_URL
  },
  {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);

console.log('✅ WORKING AGENT ASSIGNED');
console.log('   Phone: +16028337194');
console.log('   Agent:', WORKING_AGENT);
console.log('   Webhook:', WEBHOOK_URL);
console.log('\n📞 Call (602) 833-7194 - should work now!');
