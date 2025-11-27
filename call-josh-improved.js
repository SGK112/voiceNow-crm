/**
 * Improved Call Script - Agent that hangs up properly
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

async function createImprovedAgent() {
  console.log('\n🤖 Creating improved agent with proper hang-up...\n');

  try {
    const agent = await client.conversationalAi.agents.create({
      conversationConfig: {
        agent: {
          prompt: {
            prompt: `You are calling Josh to test the VoiceNow CRM system.

YOUR ROLE: Quick system test call.

CONVERSATION FLOW (KEEP IT BRIEF - 30 seconds max):

1. GREETING (5 seconds)
"Hi Josh! This is a test call from your VoiceNow CRM system. Can you hear me clearly?"

2. WAIT FOR RESPONSE
- If yes: "Perfect! The calling system is working."
- If unclear: "Let me know if you can hear me."

3. QUICK TEST (5 seconds)
"This verifies we can now make outbound calls. Everything is operational."

4. END CALL IMMEDIATELY (10 seconds)
"Thanks for testing, Josh. I'll let you go now. Goodbye!"

THEN HANG UP.

CRITICAL RULES:
- Keep call under 30 seconds total
- After saying goodbye, END THE CALL
- Don't ask follow-up questions
- Don't continue conversation
- Be brief and efficient
- This is a quick system test only

CONVERSATION SHOULD BE:
Agent: "Hi Josh! This is a test call from your VoiceNow CRM system. Can you hear me clearly?"
Josh: "Yes"
Agent: "Perfect! The calling system is working. Thanks for testing, Josh. Goodbye!"
[HANG UP]

DO NOT:
- Have a long conversation
- Ask multiple questions
- Continue talking after goodbye
- Wait for Josh to hang up

YOU MUST END THE CALL after saying goodbye.`,
            llm: 'gemini-2.5-flash',
            temperature: 0.5
          },
          firstMessage: "Hi Josh! This is a test call from VoiceNow CRM. Can you hear me?",
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
      },
      conversationConfig: {
        conversation: {
          maxDurationSeconds: 60, // Auto-hang up after 60 seconds
          clientEvents: {
            disconnectAfterSilenceMs: 3000, // Hang up after 3 seconds of silence
            disconnectAfterInactivityMs: 5000 // Hang up if no activity for 5 seconds
          }
        }
      }
    });

    console.log('✅ Improved agent created!');
    console.log('   Agent ID:', agent.agentId);
    console.log('   Max duration: 60 seconds');
    console.log('   Auto-hangup: After 3 seconds silence');
    return agent;

  } catch (error) {
    console.error('❌ Failed to create agent:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

async function makeCall(agentId, phoneNumber) {
  console.log('\n📞 Initiating improved call...\n');

  try {
    const callResult = await client.conversationalAi.batchCalls.create({
      callName: 'Improved Test Call - Auto Hangup',
      agentId: agentId,
      agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      recipients: [
        {
          phoneNumber: phoneNumber
        }
      ]
    });

    console.log('✅ Call initiated!');
    console.log('   Batch ID:', callResult.batchId);
    console.log('\n📱 This call will:');
    console.log('   - Be brief (30 seconds)');
    console.log('   - Hang up automatically');
    console.log('   - Not wait for you to hang up');
    console.log('\nYour phone will ring shortly...');

    return callResult;

  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Improved Call Test - With Auto Hangup\n');
  console.log('=' .repeat(60));

  try {
    const agent = await createImprovedAgent();
    const call = await makeCall(agent.agentId, '+14802555887');

    console.log('\n✅ SUCCESS! Call will hang up properly this time.');
    console.log('\n📋 What\'s different:');
    console.log('1. Agent is instructed to be very brief');
    console.log('2. Max call duration: 60 seconds');
    console.log('3. Auto-hangup after 3 seconds of silence');
    console.log('4. Agent will say goodbye and END the call');
    console.log('\nAnswer the call and it should hang up within 30 seconds!');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
