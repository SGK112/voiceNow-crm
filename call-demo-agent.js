import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function initiateCall() {
  console.log('📞 Initiating demo call to 480-255-5887...\n');

  try {
    const response = await fetch(`${API_URL}/api/public/voice-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Claude Code Test',
        email: 'test@demo.com',
        phoneNumber: '+14802555887'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! Call initiated!\n');
      console.log('📋 Response:', JSON.stringify(data, null, 2));
      console.log('\n📞 Your phone should ring in 5-10 seconds!');
      console.log('🎙️  Agent: Remodely.ai Marketing Assistant');
      console.log('🎯 The agent will greet you by name: "Hi, am I speaking with Claude Code Test?"');
    } else {
      console.error('❌ Failed to initiate call');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

initiateCall();
