import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7'; // Emma
const PHONE_NUMBER = '+16028337194';

async function assignAgentToPhone() {
  console.log('📞 Assigning Emma to phone number...\n');

  try {
    // Get phone number ID
    console.log(`🔍 Looking up phone number: ${PHONE_NUMBER}`);

    const phonesResponse = await axios.get(
      'https://api.elevenlabs.io/v1/convai/phone-numbers',
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const phone = phonesResponse.data.find(
      p => p.phone_number === PHONE_NUMBER || p.number === PHONE_NUMBER
    );

    if (!phone) {
      console.log('❌ Phone number not found');
      return;
    }

    console.log(`✅ Found phone: ${phone.phone_number || phone.number}`);
    console.log(`   Phone ID: ${phone.phone_number_id || phone.id}`);

    // Assign agent to phone number
    console.log(`\n🔗 Assigning Emma (${AGENT_ID}) to this number...`);

    const phoneId = phone.phone_number_id || phone.id;

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneId}`,
      {
        agent_id: AGENT_ID
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Agent assigned successfully!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📞 YOUR NUMBER IS READY:');
    console.log(`   ${PHONE_NUMBER}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔧 CALL FORWARDING SETUP:');
    console.log('1. On your phone, dial: *72');
    console.log('2. Then dial: 6028337194');
    console.log('3. Wait for confirmation beep');
    console.log('4. Hang up');
    console.log('\n✅ Emma is now answering all your calls!');

    console.log('\n💡 TO TEST:');
    console.log(`   Call ${PHONE_NUMBER} directly and talk to Emma`);

    console.log('\n🔴 TO TURN OFF FORWARDING:');
    console.log('   Dial: *73');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

assignAgentToPhone()
  .then(() => {
    console.log('\n✨ Setup complete!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
