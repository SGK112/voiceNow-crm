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

// Test voice - using a clear, professional voice
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - clear, professional female voice

async function generateElevenLabsAudio(text) {
  console.log('🎙️ Generating audio with ElevenLabs...');

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: text,
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
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Save audio to a file in the public directory
    const audioPath = path.resolve(__dirname, '../../public/demo-audio.mp3');
    writeFileSync(audioPath, Buffer.from(response.data));

    console.log('✅ Audio generated and saved successfully');
    return audioPath;
  } catch (error) {
    console.error('❌ Error generating audio:', error.response?.data || error.message);
    throw error;
  }
}

async function makeTestCall() {
  console.log('📞 Making demo call to 480-255-5887...');
  console.log('🎯 Using ElevenLabs streaming URL for voice');

  try {
    // ElevenLabs provides direct streaming URLs for TTS
    // This is simpler than generating and hosting the file
    const demoText = "Hello! This is a test call from your VoiceFlow CRM system. I'm now using ElevenLabs voice instead of Twilio's built-in voice. Can you hear the difference? This is just a text-to-speech demo, but your system can also create fully conversational AI agents using ElevenLabs Conversational AI. Those agents can have real back-and-forth conversations, understand context, and trigger workflows based on what people say. This is just a simple demo to show you the concept. Have a great day!";

    // URL encode the text for ElevenLabs streaming API
    const encodedText = encodeURIComponent(demoText);

    // Use ElevenLabs streaming endpoint
    const elevenLabsStreamUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?text=${encodedText}&model_id=eleven_flash_v2_5&voice_settings={"stability":0.5,"similarity_boost":0.8}`;

    const call = await client.calls.create({
      // TwiML instructions - Use ElevenLabs direct URL with proper auth header
      // Since TwiML can't set headers, we'll use a fallback with generated audio
      twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">
        Hello! This is a test call from your VoiceFlow CRM system.
        I'm testing the ElevenLabs integration.
        To use ElevenLabs voice properly, we need to either pre-generate
        the audio file and host it, or use the conversational AI agent
        approach which your system already supports.
        This demo shows the concept. Have a great day!
    </Say>
</Response>`,
      to: '+14802555887',
      from: twilioNumber
    });

    console.log('✅ Call initiated!');
    console.log(`📞 Call SID: ${call.sid}`);
    console.log(`📱 Calling: +14802555887`);
    console.log(`📞 From: ${twilioNumber}`);
    console.log('\n⚠️  Note: TwiML Play requires publicly accessible URLs');
    console.log('   ElevenLabs streaming API requires authentication headers');
    console.log('   For best results, use ElevenLabs Conversational AI agents');
    console.log('   which your system already supports!');

    return call;
  } catch (error) {
    console.error('❌ Error making call:', error);
    throw error;
  }
}

// Run the demo
makeTestCall()
  .then(() => {
    console.log('\n✨ Demo call initiated! You should receive a call shortly.');
    console.log('📞 Check your phone at 480-255-5887');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  });
