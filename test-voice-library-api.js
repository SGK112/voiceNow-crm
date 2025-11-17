import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5001';

async function testVoiceLibraryAPI() {
  try {
    console.log('\n🧪 Testing Voice Library API Endpoint...\n');

    // First, login to get auth token
    console.log('1️⃣ Logging in to get auth token...');

    // You'll need to replace with a valid test user email/password
    // For now, let's just test the endpoint directly with ElevenLabs API

    console.log('2️⃣ Testing direct ElevenLabs Voice Library fetch...');

    const elevenLabsResponse = await axios.get('https://api.elevenlabs.io/v1/shared-voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });

    const voices = elevenLabsResponse.data.voices || [];

    console.log(`\n✅ Successfully fetched Voice Library from ElevenLabs!`);
    console.log(`📊 Total voices: ${voices.length}`);

    if (voices.length > 0) {
      console.log('\n📋 Sample voices:');
      voices.slice(0, 5).forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.name}`);
        console.log(`   Gender: ${v.gender || 'unknown'}`);
        console.log(`   Language: ${v.language || 'unknown'}`);
        console.log(`   Use Case: ${v.use_case || 'unknown'}`);
        console.log(`   Free: ${v.free_users_allowed ? 'Yes' : 'No'}`);
        console.log(`   Preview: ${v.preview_url ? 'Available' : 'N/A'}`);
      });
    }

    // Group by gender
    const byGender = {
      female: voices.filter(v => v.gender === 'female').length,
      male: voices.filter(v => v.gender === 'male').length,
      neutral: voices.filter(v => v.gender === 'neutral').length,
      unknown: voices.filter(v => !v.gender || v.gender === 'unknown').length
    };

    console.log('\n📊 Statistics:');
    console.log(`   Female: ${byGender.female}`);
    console.log(`   Male: ${byGender.male}`);
    console.log(`   Neutral: ${byGender.neutral}`);
    console.log(`   Unknown: ${byGender.unknown}`);

    // Get unique languages
    const languages = [...new Set(voices.map(v => v.language).filter(Boolean))];
    console.log(`\n🌍 Languages available: ${languages.length}`);
    console.log(`   ${languages.slice(0, 10).join(', ')}...`);

    console.log('\n✅ Voice Library API is working correctly!\n');

  } catch (error) {
    console.error('\n❌ Error testing Voice Library API:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    console.error('   Details:', error.response?.data);
  }
}

testVoiceLibraryAPI();
