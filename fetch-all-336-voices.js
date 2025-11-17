import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

async function fetchAll336Voices() {
  try {
    console.log('🎤 Fetching ALL voices from ElevenLabs...\n');

    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    });

    const voices = response.data.voices;

    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 TOTAL VOICES: ${voices.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    // Group by gender
    const female = voices.filter(v => v.labels?.gender === 'female');
    const male = voices.filter(v => v.labels?.gender === 'male');
    const neutral = voices.filter(v => v.labels?.gender === 'neutral');
    const unspecified = voices.filter(v => !v.labels?.gender);

    console.log('👥 Breakdown by Gender:');
    console.log(`   👩 Female: ${female.length}`);
    console.log(`   👨 Male: ${male.length}`);
    console.log(`   ⚧ Neutral: ${neutral.length}`);
    console.log(`   ❓ Unspecified: ${unspecified.length}\n`);

    // Group by age
    const ageGroups = {};
    voices.forEach(v => {
      const age = v.labels?.age || 'unknown';
      if (!ageGroups[age]) ageGroups[age] = [];
      ageGroups[age].push(v);
    });

    console.log('📅 Breakdown by Age:');
    Object.keys(ageGroups).sort().forEach(age => {
      console.log(`   ${age}: ${ageGroups[age].length}`);
    });
    console.log('');

    // Group by accent
    const accentGroups = {};
    voices.forEach(v => {
      const accent = v.labels?.accent || 'unknown';
      if (!accentGroups[accent]) accentGroups[accent] = [];
      accentGroups[accent].push(v);
    });

    console.log('🌍 Breakdown by Accent:');
    Object.keys(accentGroups).sort().forEach(accent => {
      console.log(`   ${accent}: ${accentGroups[accent].length}`);
    });
    console.log('');

    // Group by use case
    const useCaseGroups = {};
    voices.forEach(v => {
      const useCase = v.labels?.['use case'] || 'unknown';
      if (!useCaseGroups[useCase]) useCaseGroups[useCase] = [];
      useCaseGroups[useCase].push(v);
    });

    console.log('💼 Breakdown by Use Case:');
    Object.keys(useCaseGroups).sort().forEach(useCase => {
      console.log(`   ${useCase}: ${useCaseGroups[useCase].length}`);
    });
    console.log('');

    // Format for frontend use
    const formattedVoices = voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender || 'unknown',
      age: v.labels?.age || 'unknown',
      accent: v.labels?.accent || 'unknown',
      useCase: v.labels?.['use case'] || 'general',
      description: v.description || '',
      category: v.category || 'general'
    }));

    // Save to JSON file
    const outputPath = './all-336-voices.json';
    fs.writeFileSync(outputPath, JSON.stringify(formattedVoices, null, 2));
    console.log(`✅ Saved all ${voices.length} voices to ${outputPath}\n`);

    // Create React component format
    const reactFormat = `// Auto-generated from ElevenLabs API
// Total voices: ${voices.length}
// Generated: ${new Date().toISOString()}

export const ELEVENLABS_VOICES = ${JSON.stringify(formattedVoices, null, 2)};

export const VOICE_STATS = {
  total: ${voices.length},
  female: ${female.length},
  male: ${male.length},
  neutral: ${neutral.length},
  unspecified: ${unspecified.length}
};

export const VOICE_CATEGORIES = ${JSON.stringify(Object.keys(useCaseGroups).sort(), null, 2)};

export const VOICE_ACCENTS = ${JSON.stringify(Object.keys(accentGroups).sort(), null, 2)};

export const VOICE_AGES = ${JSON.stringify(Object.keys(ageGroups).sort(), null, 2)};
`;

    const reactOutputPath = './frontend/src/data/elevenlabs-voices.js';
    fs.writeFileSync(reactOutputPath, reactFormat);
    console.log(`✅ Saved React component to ${reactOutputPath}\n`);

    // Show top 20 female voices
    console.log('═══════════════════════════════════════════════════');
    console.log('👩 TOP 20 FEMALE VOICES');
    console.log('═══════════════════════════════════════════════════');
    female.slice(0, 20).forEach((v, i) => {
      console.log(`${i + 1}. ${v.name}`);
      console.log(`   ID: ${v.voice_id}`);
      console.log(`   ${v.labels?.age || 'unknown'} | ${v.labels?.accent || 'unknown'} | ${v.labels?.['use case'] || 'general'}`);
      if (v.description) console.log(`   "${v.description.substring(0, 80)}..."`);
      console.log('');
    });

    // Show top 20 male voices
    console.log('═══════════════════════════════════════════════════');
    console.log('👨 TOP 20 MALE VOICES');
    console.log('═══════════════════════════════════════════════════');
    male.slice(0, 20).forEach((v, i) => {
      console.log(`${i + 1}. ${v.name}`);
      console.log(`   ID: ${v.voice_id}`);
      console.log(`   ${v.labels?.age || 'unknown'} | ${v.labels?.accent || 'unknown'} | ${v.labels?.['use case'] || 'general'}`);
      if (v.description) console.log(`   "${v.description.substring(0, 80)}..."`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total Voices Fetched: ${voices.length}`);
    console.log(`JSON Export: ${outputPath}`);
    console.log(`React Component: ${reactOutputPath}`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. Import the voices in your React component');
    console.log('2. Update AIVoiceAgentWizard to use these voices');
    console.log('3. Build custom agents with any of the 336 voices!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

fetchAll336Voices();
