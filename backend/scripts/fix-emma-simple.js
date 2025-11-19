import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://f66af302a875.ngrok-free.app';

console.log('🔧 RESETTING EMMA TO SIMPLE, WORKING SETUP...\n');

// SIMPLE script - no bullshit
const simpleScript = `You are Emma, receptionist at Surprise Granite countertop company in Arizona.

Your job: Answer calls, help customers, book free consultations.

Be friendly and natural. When booking consultations:
- Get their name, phone, email, address
- Suggest available times (Mon-Fri 9-5, Sat 10-3)
- Confirm the details

Answer common questions:
- Pricing: Depends on size and material, free quote at consultation
- Timeline: Usually 2-3 weeks
- Materials: Granite, quartz, marble, quartzite

End calls politely after getting their info.`;

const firstMessage = "Hi, thanks for calling Surprise Granite! This is Emma. How can I help you?";

async function fixEmma() {
  try {
    console.log('Updating Emma with SIMPLE configuration...\n');

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        name: 'Surprise Granite - Emma',
        webhook_url: `${WEBHOOK_URL}/api/webhooks/call-completed`,
        conversation_config: {
          tts: {
            voice_id: 'EXAVITQu4vr4xnSDxMaL', // SARAH - the original
            model_id: 'eleven_flash_v2' // Simple and fast
          },
          agent: {
            prompt: {
              prompt: simpleScript
            },
            first_message: firstMessage,
            language: 'en'
          }
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ EMMA RESET TO SIMPLE SETUP\n');
    console.log('Voice: Sarah (the original ElevenLabs voice)');
    console.log('Script: Simple and straightforward');
    console.log('Webhook: Configured');
    console.log('\n📞 Call (602) 833-7194 - should work now');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

fixEmma()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
