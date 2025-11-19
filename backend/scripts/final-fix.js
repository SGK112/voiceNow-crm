import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 FINAL FIX - Setting phone properly...\n');

const result = await axios.patch(
  'https://api.elevenlabs.io/v1/convai/phone-numbers/phnum_2701kacmjq23fzaacdgqwt0qty0b',
  {
    agent_id: 'agent_1401kadsbxczf28b34twm35wega7',
    webhook_url: 'https://f66af302a875.ngrok-free.app/api/webhooks/call-completed'
  },
  {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);

console.log('✅ PHONE CONFIGURED');
console.log('   Phone: +16028337194');
console.log('   Agent: Emma');
console.log('   Webhook: SET');
console.log('\n📞 Call (602) 833-7194 NOW - should work!');
console.log('   It will use ElevenLabs Conversational AI');
console.log('   NOT Twilio TTS');
