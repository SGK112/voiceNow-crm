import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';
const PHONE_NUMBER_ID = 'phnum_2701kacmjq23fzaacdgqwt0qty0b';
const WEBHOOK_URL = 'https://f66af302a875.ngrok-free.app/api/webhooks/call-completed';

console.log('🔧 Setting up phone number properly...\n');

await axios.patch(
  `https://api.elevenlabs.io/v1/convai/phone-numbers/${PHONE_NUMBER_ID}`,
  {
    agent_id: AGENT_ID,
    webhook_url: WEBHOOK_URL
  },
  {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);

console.log('✅ Phone number configured!');
console.log('   Phone: +16028337194');
console.log('   Agent: Emma (agent_1401kadsbxczf28b34twm35wega7)');
console.log('   Webhook:', WEBHOOK_URL);
console.log('\n📞 NOW call (602) 833-7194 and webhooks should fire!');
