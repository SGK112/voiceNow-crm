import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const LEAD_GEN_AGENT_ID = process.env.ELEVENLABS_LEAD_GEN_AGENT_ID;
const PHONE_NUMBER_ID = 'phnum_1801k7xb68cefjv89rv10f90qykv';

async function testBatchCall(customerPhone) {
  try {
    console.log('📞 Testing batch calling endpoint...\\n');
    console.log(`Agent ID: ${LEAD_GEN_AGENT_ID}`);
    console.log(`Phone Number ID: ${PHONE_NUMBER_ID}`);
    console.log(`Customer Phone: ${customerPhone}\\n`);

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/batch-calling/submit',
      {
        call_name: 'VoiceNow CRM Test Call',
        agent_id: LEAD_GEN_AGENT_ID,
        agent_phone_number_id: PHONE_NUMBER_ID,
        recipients: [
          {
            phone_number: customerPhone
          }
        ]
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Batch call submitted successfully!\\n');
    console.log('Batch Details:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\\n📱 You should receive a call shortly!');

  } catch (error) {
    console.error('\\n❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

const customerPhone = process.argv[2] || '+14802555887';
testBatchCall(customerPhone);
