/**
 * Test Script - Call Josh with Multimodal Capabilities
 *
 * This will create an agent and make a call to test the system
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

// You'll need to get this by logging in first
// Or we can use your existing credentials
const TEST_USER_EMAIL = 'your-email@example.com';
const TEST_USER_PASSWORD = 'your-password';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    console.log('✅ Login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestAgent(token) {
  try {
    console.log('\n🤖 Creating test agent...');

    const agentConfig = {
      name: 'Josh Test Agent - Multimodal Demo',
      type: 'custom',
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
      voiceName: 'Sarah',
      script: `You are calling Josh to demonstrate the multimodal capabilities of VoiceNow CRM.

YOUR GOAL:
Test the voice conversation system and demonstrate that you can receive and process information.

CONVERSATION FLOW:

1. GREETING
"Hi Josh! This is a test call from your VoiceNow CRM system. I'm calling to demonstrate the new multimodal agent capabilities. Do you have a minute?"

2. DEMONSTRATE CAPABILITIES
"I'm an AI agent that can:
- Have natural voice conversations with you
- Process information you provide
- Take notes and store data
- Schedule follow-ups

Would you like me to demonstrate any specific capability?"

3. INTERACTIVE TEST
Listen to what Josh wants to test and respond accordingly.

If Josh wants to test data collection:
"Great! Go ahead and tell me any information - I'll process it and confirm back to you what I understood."

If Josh wants to test scheduling:
"Perfect! What would you like me to schedule? Tell me the date, time, and what it's for."

If Josh wants to test note-taking:
"Excellent! Go ahead and dictate any notes or information, and I'll repeat it back to confirm I got it right."

4. WRAP UP
"Thanks for testing the system, Josh! This call demonstrated:
- Voice conversation quality
- Real-time processing
- Interactive capabilities

The system is working great. Have a good day!"

IMPORTANT:
- Be friendly and professional
- Confirm you understand what Josh is testing
- Repeat back any information he provides to confirm accuracy
- Keep the call under 2 minutes unless Josh wants to continue
- If Josh asks to end the call, say goodbye and hang up

TONE: Professional, friendly, efficient - this is a test call, so be respectful of his time.`,
      firstMessage: "Hi Josh! This is a test call from your VoiceNow CRM system. I'm calling to demonstrate the new multimodal agent capabilities. Do you have a minute?",
      enabled: true,
      configuration: {
        temperature: 0.8,
        language: 'en',
        maxDuration: 180 // 3 minutes max
      }
    };

    const response = await axios.post(`${API_BASE}/agents`, agentConfig, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Agent created:', response.data.agent.name);
    console.log('   Agent ID:', response.data.agent._id);
    console.log('   ElevenLabs ID:', response.data.agent.elevenLabsAgentId);

    return response.data.agent;
  } catch (error) {
    console.error('❌ Agent creation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function makeTestCall(token, agent, phoneNumber) {
  try {
    console.log('\n📞 Initiating call to Josh...');
    console.log('   Phone Number:', phoneNumber);
    console.log('   Using Agent:', agent.name);

    const callData = {
      agentId: agent._id,
      phoneNumber: phoneNumber,
      dynamicVariables: {
        lead_name: 'Josh',
        company_name: 'VoiceNow CRM',
        purpose: 'Multimodal Agent System Test'
      }
    };

    const response = await axios.post(`${API_BASE}/calls/initiate`, callData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Call initiated successfully!');
    console.log('   Call ID:', response.data.call?._id);
    console.log('   Status:', response.data.message);
    console.log('\n📱 Josh should receive the call shortly...');
    console.log('   Expected: Phone rings in 5-10 seconds');
    console.log('   Agent will greet: "Hi Josh! This is a test call from your VoiceNow CRM system..."');

    return response.data;
  } catch (error) {
    console.error('❌ Call initiation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 VoiceNow CRM Test Call System\n');
    console.log('Target: Josh (480-255-5887)');
    console.log('Purpose: Test multimodal agent capabilities\n');
    console.log('=' .repeat(60));

    // Step 1: Login
    const token = await login();

    // Step 2: Create test agent
    const agent = await createTestAgent(token);

    // Step 3: Make the call
    const call = await makeTestCall(token, agent, '+14802555887');

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST CALL SETUP COMPLETE');
    console.log('\n📋 What happens next:');
    console.log('1. ElevenLabs places call to Josh\'s phone');
    console.log('2. Josh answers and hears the AI agent');
    console.log('3. Josh can test various capabilities');
    console.log('4. Call data will be logged in the system');
    console.log('\n💡 Josh can test:');
    console.log('- Voice conversation quality');
    console.log('- Data collection (agent confirms what it hears)');
    console.log('- Scheduling capabilities');
    console.log('- Note-taking');
    console.log('- Call completion');

  } catch (error) {
    console.error('\n❌ Test call failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend server is running (npm run server)');
    console.log('2. Update TEST_USER_EMAIL and TEST_USER_PASSWORD in this script');
    console.log('3. Verify ELEVENLABS_API_KEY is set in .env');
    console.log('4. Verify ELEVENLABS_PHONE_NUMBER_ID is set in .env');
    console.log('5. Check that ElevenLabs account has calling enabled');
  }
}

main();
