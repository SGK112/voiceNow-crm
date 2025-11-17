import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

async function fetchVoiceLibrary() {
  try {
    console.log('🎤 Fetching ElevenLabs Voice Library...\n');

    // Fetch from the shared voice library
    // This is different from /voices which shows your account voices
    const libraryResponse = await axios.get('https://api.elevenlabs.io/v1/voices/library', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    });

    console.log('📚 Voice Library Response:');
    console.log(JSON.stringify(libraryResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error fetching voice library:', error.response?.data || error.message);

    // Try alternative endpoint
    console.log('\n🔄 Trying alternative endpoint: /shared-voices...\n');

    try {
      const sharedResponse = await axios.get('https://api.elevenlabs.io/v1/shared-voices', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
      });

      console.log('📚 Shared Voices Response:');
      console.log(JSON.stringify(sharedResponse.data, null, 2));

    } catch (error2) {
      console.error('❌ Error with shared voices:', error2.response?.data || error2.message);

      // Check API documentation
      console.log('\n📖 Let me check what endpoints are available...\n');
      console.log('Standard ElevenLabs API endpoints:');
      console.log('1. GET /v1/voices - Your account voices (already tested: 39 voices)');
      console.log('2. GET /v1/voices/library - Public voice library');
      console.log('3. GET /v1/shared-voices - Community shared voices');
      console.log('4. POST /v1/voices/add/{public_user_id}/{voice_id} - Add voice from library');
      console.log('');
      console.log('Note: Voice library access may require specific API permissions or plan level.');
    }
  }
}

fetchVoiceLibrary();
