/**
 * REAL Test Script - Call Josh Using Actual ElevenLabs SDK
 *
 * This uses the ACTUAL @elevenlabs/elevenlabs-js SDK
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

async function createAgent() {
  console.log('\n🤖 Creating agent using REAL ElevenLabs SDK...\n');

  try {
    const agent = await client.conversationalAi.agents.create({
      conversationConfig: {
        agent: {
          prompt: {
            prompt: `You are calling Josh to test the VoiceNow CRM system.

YOUR ROLE:
This is a test call to verify the phone calling system is working.

CONVERSATION:
1. Greet Josh: "Hi Josh! This is a test call from your VoiceNow CRM system. The phone calling feature is now working!"

2. Ask: "Can you hear me clearly?"

3. If yes: "Perfect! The system is operational. This proves we can now make outbound calls to any phone number."

4. Offer to test something: "Would you like me to test anything specific? I can demonstrate conversation capabilities, or we can end the test here."

5. End gracefully: "Thanks for testing, Josh! The system is working great. Have a good day!"

IMPORTANT:
- Be friendly and professional
- Keep it brief (under 1 minute)
- This is just a system test
- Answer any questions Josh has`,
            llm: 'gemini-2.5-flash'
          },
          firstMessage: "Hi Josh! This is a test call from your VoiceNow CRM system. Can you hear me?",
          language: 'en'
        },
        tts: {
          voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
          model: 'eleven_flash_v2_5',
          optimizeStreamingLatency: 3
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs'
        }
      }
    });

    console.log('✅ Agent created successfully!');
    console.log('   Agent ID:', agent.agentId);
    return agent;

  } catch (error) {
    console.error('❌ Failed to create agent:', error.message);
    if (error.body) {
      console.error('   Error details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

async function makeCall(agentId, phoneNumber) {
  console.log('\n📞 Initiating call using REAL ElevenLabs SDK...\n');
  console.log('   To:', phoneNumber);
  console.log('   Agent ID:', agentId);

  try {
    const callResult = await client.conversationalAi.batchCalls.create({
      callName: 'Test Call to Josh',
      agentId: agentId,
      agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      recipients: [
        {
          phoneNumber: phoneNumber
        }
      ]
    });

    console.log('\n✅ Call initiated successfully!');
    console.log('   Batch ID:', callResult.batchId);
    console.log('   Status:', callResult.status);
    console.log('\n📱 Josh\'s phone should ring shortly...');

    return callResult;

  } catch (error) {
    console.error('\n❌ Failed to initiate call:', error.message);
    if (error.body) {
      console.error('   Error details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 VoiceNow CRM - Real Phone Call Test\n');
  console.log('=' .repeat(60));
  console.log('Target: Josh');
  console.log('Phone: +1 (480) 255-5887');
  console.log('SDK: @elevenlabs/elevenlabs-js (REAL)');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create agent
    const agent = await createAgent();

    // Step 2: Make the call
    const call = await makeCall(agent.agentId, '+14802555887');

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! EVERYTHING WORKED!');
    console.log('='.repeat(60));
    console.log('\n📋 What happened:');
    console.log('1. ✅ Created agent using real ElevenLabs SDK');
    console.log('2. ✅ Initiated call using real batchCalls API');
    console.log('3. ✅ Call is being placed to Josh\'s number');
    console.log('\n📱 Josh should receive the call within 10-30 seconds');
    console.log('\n💡 The agent will say:');
    console.log('"Hi Josh! This is a test call from your VoiceNow CRM system. Can you hear me?"');
    console.log('\n🎉 The system is ACTUALLY working now!');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check .env file has ELEVENLABS_API_KEY');
    console.log('2. Check .env file has ELEVENLABS_PHONE_NUMBER_ID');
    console.log('3. Verify ElevenLabs account has phone calling enabled');
    console.log('4. Verify ElevenLabs account has sufficient credits');
    console.log('5. Check phone number format: +14802555887');

    process.exit(1);
  }
}

main();
