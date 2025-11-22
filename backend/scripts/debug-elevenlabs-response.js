import ElevenLabsService from '../services/elevenLabsService.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugElevenLabsResponse() {
  try {
    const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

    console.log('📥 Fetching conversations from ElevenLabs...\n');

    const response = await elevenLabsService.getConversations({ pageSize: 2 });

    console.log('🔍 Full API Response Structure:');
    console.log('================================\n');
    console.log(JSON.stringify(response, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('\nAPI Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

debugElevenLabsResponse();
