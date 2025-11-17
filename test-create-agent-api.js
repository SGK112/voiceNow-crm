import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5001';

async function testAgentCreation() {
  try {
    console.log('\n🧪 Testing AI Voice Agent Creation...\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'help.remodely@gmail.com',
      password: 'your_password_here' // You'll need to provide this
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // Step 2: Get available voices
    console.log('\n2️⃣ Fetching available voices...');
    const voicesResponse = await axios.get(`${API_URL}/api/agents/helpers/voices`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const voices = voicesResponse.data.voices;
    console.log(`✅ Found ${voices.length} voices`);

    // Pick a female voice (Sarah)
    const sarahVoice = voices.find(v => v.name === 'Sarah') || voices[0];
    console.log(`   Selected voice: ${sarahVoice.name} (${sarahVoice.voice_id})`);

    // Step 3: Create agent
    console.log('\n3️⃣ Creating AI Voice Agent...');
    const agentData = {
      name: 'Test Sales Assistant',
      type: 'custom',
      voiceId: sarahVoice.voice_id,
      voiceName: sarahVoice.name,
      script: 'You are a friendly sales assistant for VoiceFlow CRM. Your goal is to help potential customers understand our product and schedule demos.',
      firstMessage: 'Hi! This is Sarah calling from VoiceFlow CRM. How are you today?',
      configuration: {
        language: 'en',
        model_id: 'eleven_flash_v2'
      }
    };

    const createResponse = await axios.post(
      `${API_URL}/api/agents/create`,
      agentData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Agent created successfully!');
    console.log('\n📋 Agent Details:');
    console.log(`   Name: ${createResponse.data.agent.name}`);
    console.log(`   Voice: ${createResponse.data.agent.voiceName}`);
    console.log(`   ElevenLabs Agent ID: ${createResponse.data.agent.elevenLabsAgentId}`);
    console.log(`   MongoDB ID: ${createResponse.data.agent._id}`);

    console.log('\n✅ Test Complete! AI Voice Agent creation is working!\n');

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);

    if (error.response?.status === 401) {
      console.log('\n💡 Note: You need to provide a valid password in the script');
      console.log('   Or use Google OAuth to get a token');
    }
  }
}

testAgentCreation();
