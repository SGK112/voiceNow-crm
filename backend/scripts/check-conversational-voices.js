import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';

async function checkAndUpdateVoice() {
  console.log('🎙️ Checking ElevenLabs voice options...\n');

  try {
    // Get all available voices
    const voicesResponse = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    console.log('📋 AVAILABLE HIGH-QUALITY VOICES:\n');

    const premiumVoices = voicesResponse.data.voices.filter(v =>
      v.category === 'professional' || v.category === 'premade'
    );

    premiumVoices.slice(0, 10).forEach((voice, i) => {
      console.log(`${i + 1}. ${voice.name}`);
      console.log(`   ID: ${voice.voice_id}`);
      console.log(`   Category: ${voice.category}`);
      console.log('');
    });

    // Get current agent config
    console.log('🔍 Checking current agent configuration...\n');

    const agentResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const currentVoice = agentResponse.data.conversation_config?.tts?.voice_id;
    console.log(`Current voice ID: ${currentVoice}`);

    // Try updating to a better voice
    console.log('\n🔄 Updating to high-quality voice...\n');

    // Rachel - professional female voice
    const BETTER_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
    const ALTERNATE_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel

    const updateResponse = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        conversation_config: {
          tts: {
            voice_id: ALTERNATE_VOICE,
            model_id: 'eleven_turbo_v2_5', // Use turbo for better quality
            optimize_streaming_latency: 3,
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
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

    console.log('✅ Voice updated successfully!');
    console.log(`   New voice: Rachel (professional female)`);
    console.log(`   Model: eleven_turbo_v2_5 (high quality)`);
    console.log(`   Voice ID: ${ALTERNATE_VOICE}`);

    console.log('\n📞 Call (602) 833-7194 again to hear the improved voice!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);

    console.log('\n⚠️  The issue might be:');
    console.log('1. ElevenLabs Conversational AI has limited voice quality');
    console.log('2. Phone compression reduces audio quality');
    console.log('3. Need to use a different voice model');
  }
}

checkAndUpdateVoice()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
