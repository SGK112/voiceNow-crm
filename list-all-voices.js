import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function listAllVoices() {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    });

    const voices = response.data.voices;

    console.log('═══════════════════════════════════════════════════');
    console.log('📊 ELEVENLABS VOICE LIBRARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total Voices Available: ${voices.length}`);
    console.log('');

    // Group by gender
    const female = voices.filter(v => v.labels?.gender === 'female');
    const male = voices.filter(v => v.labels?.gender === 'male');
    const neutral = voices.filter(v => v.labels?.gender === 'neutral');
    const unspecified = voices.filter(v => !v.labels?.gender);

    console.log('👥 Breakdown by Gender:');
    console.log(`   👩 Female: ${female.length}`);
    console.log(`   👨 Male: ${male.length}`);
    console.log(`   ⚧ Neutral: ${neutral.length}`);
    console.log(`   ❓ Unspecified: ${unspecified.length}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('👩 FEMALE VOICES');
    console.log('═══════════════════════════════════════════════════');
    female.forEach((v, i) => {
      const age = v.labels?.age || 'unknown';
      const accent = v.labels?.accent || 'unknown';
      const useCase = v.labels?.['use case'] || 'general';
      console.log(`${i + 1}. ${v.name}`);
      console.log(`   ID: ${v.voice_id}`);
      console.log(`   Age: ${age} | Accent: ${accent} | Use: ${useCase}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('👨 MALE VOICES');
    console.log('═══════════════════════════════════════════════════');
    male.forEach((v, i) => {
      const age = v.labels?.age || 'unknown';
      const accent = v.labels?.accent || 'unknown';
      const useCase = v.labels?.['use case'] || 'general';
      console.log(`${i + 1}. ${v.name}`);
      console.log(`   ID: ${v.voice_id}`);
      console.log(`   Age: ${age} | Accent: ${accent} | Use: ${useCase}`);
      console.log('');
    });

    if (neutral.length > 0) {
      console.log('═══════════════════════════════════════════════════');
      console.log('⚧ NEUTRAL VOICES');
      console.log('═══════════════════════════════════════════════════');
      neutral.forEach((v, i) => {
        const age = v.labels?.age || 'unknown';
        const accent = v.labels?.accent || 'unknown';
        const useCase = v.labels?.['use case'] || 'general';
        console.log(`${i + 1}. ${v.name}`);
        console.log(`   ID: ${v.voice_id}`);
        console.log(`   Age: ${age} | Accent: ${accent} | Use: ${useCase}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('📋 VOICE DATA (JSON)');
    console.log('═══════════════════════════════════════════════════');

    // Save to file for easy reference
    const voiceData = voices.map(v => ({
      name: v.name,
      voice_id: v.voice_id,
      gender: v.labels?.gender || 'unspecified',
      age: v.labels?.age || 'unknown',
      accent: v.labels?.accent || 'unknown',
      use_case: v.labels?.['use case'] || 'general',
      description: v.description || ''
    }));

    console.log(JSON.stringify(voiceData, null, 2));

  } catch (error) {
    console.error('❌ Error fetching voices:', error.response?.data || error.message);
    process.exit(1);
  }
}

listAllVoices();
