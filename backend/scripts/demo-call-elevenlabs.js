import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import twilio from 'twilio';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

const client = twilio(accountSid, authToken);

// Sarah voice - clear, professional
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

async function makeCallWithElevenLabs() {
  console.log('📞 Making demo call with ElevenLabs voice...');
  console.log('🎯 Using conversational AI approach\n');

  try {
    const demoText = `Hello! This is a test call from your VoiceNow CRM system.
    I'm now using ElevenLabs voice - can you hear how natural I sound?
    This is just a simple text-to-speech demo.
    Your system can also create fully conversational AI agents using ElevenLabs Conversational AI.
    Those agents can have real back-and-forth conversations, understand context, and trigger workflows.
    Have a great day!`;

    console.log('🎙️ Generating audio with ElevenLabs...');

    // Generate audio with ElevenLabs TTS API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: demoText,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    // Save to backend's public directory
    const audioPath = path.resolve(__dirname, '../public/demo-elevenlabs.mp3');
    writeFileSync(audioPath, Buffer.from(response.data));
    console.log('✅ Audio generated and saved');

    // Upload to Twilio Assets for public hosting
    console.log('📤 Uploading to Twilio for hosting...');

    const asset = await client.serverless.v1.services
      .list({ limit: 1 })
      .then(services => {
        if (services.length > 0) {
          return services[0];
        }
        return client.serverless.v1.services.create({
          uniqueName: 'voiceflow-demo',
          friendlyName: 'VoiceFlow Demo Assets'
        });
      });

    console.log('Service ready:', asset.sid);

    // For simplicity, let's use a different approach - TwiML Bins
    const bin = await client.studio.v2.flows
      .list({ limit: 1 })
      .catch(() => {
        // If Studio is not available, fall back to simple approach
        return null;
      });

    // Simpler approach: Just make the call with the audio URL
    // You'll need to expose your backend publicly or use ngrok
    const publicUrl = process.env.WEBHOOK_URL || 'http://5.183.8.119:5001';
    const audioUrl = `${publicUrl}/demo-elevenlabs.mp3`;

    console.log(`🌐 Audio URL: ${audioUrl}`);

    const call = await client.calls.create({
      twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play>${audioUrl}</Play>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">That was an ElevenLabs voice. For fully conversational AI, use your agent builder.</Say>
</Response>`,
      to: '+14802555887',
      from: twilioNumber
    });

    console.log('\n✅ Call initiated with ElevenLabs voice!');
    console.log(`📞 Call SID: ${call.sid}`);
    console.log(`📱 Calling: +14802555887`);
    console.log(`🎙️ Voice: ElevenLabs Sarah (${VOICE_ID})`);
    console.log(`🌐 Audio URL: ${audioUrl}`);
    console.log('\n💡 For best results:');
    console.log('   1. Use ElevenLabs Conversational AI (already in your system)');
    console.log('   2. Build agents in VoiceFlow Builder');
    console.log('   3. Agents can listen, think, and respond naturally');

    return call;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

makeCallWithElevenLabs()
  .then(() => {
    console.log('\n✨ Demo complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Demo failed');
    process.exit(1);
  });
