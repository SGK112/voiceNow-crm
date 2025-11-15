import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function listVoices() {
  try {
    const response = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      }
    );

    const voices = response.data.voices || [];

    console.log('Professional Male Voices (good for sales):\n');

    const professionalMale = voices.filter(v =>
      v.labels?.gender === 'male' &&
      (v.labels?.age === 'middle_aged' || v.labels?.age === 'young') &&
      (v.labels?.accent === 'american' || !v.labels?.accent)
    );

    professionalMale.slice(0, 10).forEach(v => {
      console.log(`${v.name}`);
      console.log(`  ID: ${v.voice_id}`);
      console.log(`  Age: ${v.labels?.age || 'N/A'}, Accent: ${v.labels?.accent || 'N/A'}`);
      console.log(`  Use case: ${v.labels?.use_case || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

listVoices();
