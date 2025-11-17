#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const CONVERSATION_ID = 'conv_4601ka7v2g6jew3a9s5dxa2m8jcj';

async function checkConversation() {
  try {
    console.log('\n🔍 Checking Conversation Details\n');

    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversations/${CONVERSATION_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    console.log('📋 Conversation Details:');
    console.log(JSON.stringify(response.data, null, 2));

    // Try to get transcript
    console.log('\n\n📝 Fetching Transcript...');
    try {
      const transcriptResponse = await axios.get(
        `https://api.elevenlabs.io/v1/convai/conversations/${CONVERSATION_ID}/transcript`,
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY
          }
        }
      );
      console.log('\n📝 Transcript:');
      console.log(JSON.stringify(transcriptResponse.data, null, 2));
    } catch (transcriptError) {
      console.log('⚠️  Could not fetch transcript:', transcriptError.response?.data || transcriptError.message);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkConversation();
