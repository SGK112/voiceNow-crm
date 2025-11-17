#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const NEW_AGENT_ID = 'agent_1701ka7v2exqejhbws4kp8s1axdk';
const BATCH_CALL_ID = 'btcal_1501ka7v2fwxexq869f7s0tqfjd8';

async function checkAgentAndCall() {
  try {
    console.log('\n🔍 Checking Agent Configuration and Call Status\n');

    // Check agent config
    console.log('1️⃣  Fetching agent configuration...');
    const agentResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${NEW_AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    console.log('\n📋 Agent Configuration:');
    console.log(JSON.stringify(agentResponse.data, null, 2));

    // Check call status
    console.log('\n\n2️⃣  Fetching batch call status...');
    const callResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/batch-calling/${BATCH_CALL_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    console.log('\n📞 Batch Call Status:');
    console.log(JSON.stringify(callResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkAgentAndCall();
