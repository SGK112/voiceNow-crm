import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

console.log('\n========================================');
console.log('🧪 TESTING ELEVENLABS VOICE LIBRARY API');
console.log('========================================\n');

// Test 1: Check if API key exists
console.log('Test 1: API Key Configuration');
console.log('🔑 API Key exists:', !!ELEVENLABS_API_KEY);
if (ELEVENLABS_API_KEY) {
  console.log('🔑 API Key (masked):', ELEVENLABS_API_KEY.substring(0, 10) + '...');
} else {
  console.error('❌ ELEVENLABS_API_KEY not found in environment!');
  process.exit(1);
}
console.log('');

// Test 2: Fetch voices from ElevenLabs shared-voices endpoint
async function testSharedVoices() {
  console.log('Test 2: Fetching Shared Voices from ElevenLabs');
  console.log('🌐 Endpoint: GET /v1/shared-voices');

  try {
    const response = await axios.get(`${BASE_URL}/shared-voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      params: {
        page_size: 10,
        page: 1
      }
    });

    console.log('✅ API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Number of voices received:', response.data.voices?.length || 0);
    console.log('📊 Has more pages:', response.data.has_more);

    if (response.data.voices && response.data.voices.length > 0) {
      console.log('\n📋 Sample Voice Data:');
      const sampleVoice = response.data.voices[0];
      console.log('   - Voice ID:', sampleVoice.voice_id);
      console.log('   - Name:', sampleVoice.name);
      console.log('   - Language:', sampleVoice.language);
      console.log('   - Accent:', sampleVoice.accent);
      console.log('   - Gender:', sampleVoice.gender);
      console.log('   - Age:', sampleVoice.age);
      console.log('   - Description:', sampleVoice.description?.substring(0, 100) + '...');
      console.log('   - Preview URL:', sampleVoice.preview_url ? 'Available' : 'Not available');
    }

    console.log('\n✅ Test 2: PASSED\n');
    return true;

  } catch (error) {
    console.error('❌ Test 2: FAILED');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.error('\n⚠️  Authentication failed! Check your ELEVENLABS_API_KEY');
      } else if (error.response.status === 429) {
        console.error('\n⚠️  Rate limit exceeded! Wait a moment and try again');
      }
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Check your internet connection');
    }

    console.log('');
    return false;
  }
}

// Test 3: Test our backend endpoint
async function testBackendEndpoint() {
  console.log('Test 3: Testing Backend Voice Library Endpoint');
  console.log('🌐 Endpoint: GET http://localhost:5001/api/agents/helpers/voice-library');
  console.log('⚠️  Note: You need to be logged in for this to work');
  console.log('⚠️  This test will likely fail without authentication token\n');

  try {
    const response = await axios.get('http://localhost:5001/api/agents/helpers/voice-library', {
      params: {
        page: 1,
        limit: 10
      }
    });

    console.log('✅ Backend API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Number of voices received:', response.data.voices?.length || 0);
    console.log('✅ Test 3: PASSED\n');
    return true;

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️  Test 3: SKIPPED (Authentication required)');
      console.log('   This is expected - you need to be logged in\n');
      return 'skipped';
    }

    console.error('❌ Test 3: FAILED');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.log('');
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = {
    sharedVoices: await testSharedVoices(),
    backendEndpoint: await testBackendEndpoint()
  };

  console.log('========================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log('Test 1 (API Key):', results.sharedVoices ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 2 (ElevenLabs API):', results.sharedVoices ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 3 (Backend API):',
    results.backendEndpoint === true ? '✅ PASSED' :
    results.backendEndpoint === 'skipped' ? '⚠️  SKIPPED' :
    '❌ FAILED'
  );
  console.log('========================================\n');

  if (results.sharedVoices) {
    console.log('✅ ElevenLabs API is working correctly!');
    console.log('   Your voice library should be loading in the frontend.\n');
    console.log('📝 Next steps:');
    console.log('   1. Open http://localhost:5173 in your browser');
    console.log('   2. Open the browser console (F12)');
    console.log('   3. Go to VoiceFlow Builder and add a Voice node');
    console.log('   4. Click the Voice node to configure it');
    console.log('   5. Check both browser and backend terminal for logs\n');
  } else {
    console.log('❌ ElevenLabs API is not working!');
    console.log('   Check your ELEVENLABS_API_KEY in the .env file\n');
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
