import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Get token from command line or use a test token
const token = process.env.TEST_TOKEN || 'your-token-here';

async function testVoiceFlowEndpoints() {
  console.log('🧪 Testing VoiceFlow Builder API endpoints...\n');

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const tests = [
    {
      name: 'Voice Library',
      method: 'get',
      url: '/agents/helpers/voice-library?page=1&limit=100'
    },
    {
      name: 'Saved Voices',
      method: 'get',
      url: '/agents/voices/saved'
    },
    {
      name: 'Voice Templates',
      method: 'get',
      url: '/agents/helpers/templates'
    },
    {
      name: 'AI Copilot - Workflow',
      method: 'post',
      url: '/ai-copilot/workflow-copilot',
      data: {
        message: 'test',
        workflow: { nodes: [], edges: [] },
        conversationHistory: []
      }
    },
    {
      name: 'AI Copilot - Generate Prompt',
      method: 'post',
      url: '/ai-copilot/generate-prompt',
      data: {
        purpose: 'Customer Support',
        tone: 'Friendly',
        industry: 'Test'
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`  ${test.method.toUpperCase()} ${test.url}`);

      const response = test.method === 'get'
        ? await api.get(test.url)
        : await api.post(test.url, test.data);

      console.log(`  ✅ Status: ${response.status}`);
      if (response.data) {
        const keys = Object.keys(response.data);
        console.log(`  📦 Response keys: ${keys.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ❌ Error: ${error.response?.status || 'Network Error'}`);
      console.log(`  📛 Message: ${error.response?.data?.message || error.message}`);
      console.log('');
    }
  }
}

// Check if user is logged in by trying to get a test token
async function getTestToken() {
  console.log('🔐 Attempting to get auth token...\n');

  try {
    // Try to login with test credentials
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@test.com',
      password: 'test123'
    });

    if (response.data.token) {
      console.log('✅ Got auth token\n');
      return response.data.token;
    }
  } catch (error) {
    console.log('⚠️  Could not get test token. You may need to:');
    console.log('   1. Create a test user account');
    console.log('   2. Or run: TEST_TOKEN=your-token node test-voiceflow-page.js');
    console.log('');
  }

  return null;
}

async function main() {
  const testToken = await getTestToken();

  if (testToken) {
    process.env.TEST_TOKEN = testToken;
    await testVoiceFlowEndpoints();
  } else {
    console.log('⚠️  Skipping API tests - no auth token available\n');
    console.log('💡 To test manually:');
    console.log('   1. Login at http://localhost:5173/login');
    console.log('   2. Open http://localhost:5173/app/voiceflow-builder');
    console.log('   3. Open browser console (F12) to see any errors\n');
  }
}

main();
