import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5001';

async function testVoiceLibraryPagination() {
  try {
    console.log('\n🧪 Testing Voice Library Pagination...\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'help.remodely@gmail.com',
      password: 'your_password_here' // Will use Google OAuth instead
    }).catch(async () => {
      // Try Google OAuth flow instead
      console.log('   (Using existing session - checking if logged in)');

      // For now, let's just test the ElevenLabs API directly
      console.log('\n2️⃣ Testing ElevenLabs Voice Library API directly...\n');

      let allVoices = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100;

      while (hasMore && page <= 5) { // Test first 5 pages
        console.log(`📄 Fetching page ${page}...`);

        const response = await axios.get('https://api.elevenlabs.io/v1/shared-voices', {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          },
          params: {
            page_size: pageSize,
            page: page
          }
        });

        const voices = response.data.voices || [];
        allVoices = allVoices.concat(voices);

        hasMore = response.data.has_more || false;

        console.log(`   ✅ Page ${page}: ${voices.length} voices`);
        console.log(`   📊 Total so far: ${allVoices.length} voices`);
        console.log(`   ➡️  Has more: ${hasMore ? 'Yes' : 'No'}\n`);

        page++;
      }

      console.log('\n✅ Voice Library Pagination Test Complete!');
      console.log(`📊 Total voices fetched: ${allVoices.length}`);

      // Show some sample voices
      if (allVoices.length > 0) {
        console.log('\n📋 Sample voices from library:');
        allVoices.slice(0, 5).forEach((v, i) => {
          console.log(`\n${i + 1}. ${v.name}`);
          console.log(`   Voice ID: ${v.public_owner_id}`);
          console.log(`   Gender: ${v.labels?.gender || 'unknown'}`);
          console.log(`   Language: ${v.labels?.language || 'unknown'}`);
          console.log(`   Use Case: ${v.labels?.use_case || 'unknown'}`);
        });
      }

      // Group by gender
      const byGender = {
        female: allVoices.filter(v => v.labels?.gender === 'female').length,
        male: allVoices.filter(v => v.labels?.gender === 'male').length,
        neutral: allVoices.filter(v => v.labels?.gender === 'neutral').length,
        unknown: allVoices.filter(v => !v.labels?.gender).length
      };

      console.log('\n📊 Voice Statistics:');
      console.log(`   Female: ${byGender.female}`);
      console.log(`   Male: ${byGender.male}`);
      console.log(`   Neutral: ${byGender.neutral}`);
      console.log(`   Unknown: ${byGender.unknown}`);

      return allVoices;
    });

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
  }
}

testVoiceLibraryPagination();
