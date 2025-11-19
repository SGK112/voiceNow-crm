import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ElevenLabsService from '../services/elevenLabsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const elevenLabsService = new ElevenLabsService();

async function getPhoneNumber() {
  console.log('📞 Getting your ElevenLabs phone number...\n');

  try {
    const phoneNumbers = await elevenLabsService.getPhoneNumbers();

    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.log('⚠️  No ElevenLabs phone numbers found.');
      console.log('\n📋 TO GET A NUMBER:');
      console.log('1. Go to https://elevenlabs.io/app/conversational-ai');
      console.log('2. Click "Phone Numbers"');
      console.log('3. Purchase a phone number');
      console.log('4. Assign it to your Emma agent');
      return;
    }

    console.log('✅ Found ElevenLabs Phone Number(s):\n');

    phoneNumbers.forEach((phone, index) => {
      console.log(`${index + 1}. ${phone.phone_number || phone.number}`);
      if (phone.agent_id) {
        console.log(`   Assigned to: ${phone.agent_id}`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📞 FORWARD YOUR CALLS TO THIS NUMBER:');
    console.log(`   ${phoneNumbers[0].phone_number || phoneNumbers[0].number}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔧 HOW TO SET UP CALL FORWARDING:');
    console.log('1. On your phone, dial: *72');
    console.log(`2. Then dial: ${phoneNumbers[0].phone_number || phoneNumbers[0].number}`);
    console.log('3. Wait for confirmation');
    console.log('4. All calls will now go to Emma!');

    console.log('\n💡 To disable call forwarding later:');
    console.log('   Dial: *73');

  } catch (error) {
    console.error('❌ Error:', error.message);

    console.log('\n📋 ALTERNATIVE: Use Twilio Number');
    console.log('If you don\'t have an ElevenLabs phone number, you can:');
    console.log('1. Use your existing Twilio number');
    console.log('2. Configure it to call the Emma agent via webhook');
    console.log('3. Or purchase an ElevenLabs number for best quality');
  }
}

getPhoneNumber()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to get phone number');
    process.exit(1);
  });
