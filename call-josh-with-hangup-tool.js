/**
 * Call Josh - Agent with End Call Tool
 *
 * This gives the agent a tool to explicitly end the call
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

async function createAgentWithHangupTool() {
  console.log('\n🤖 Creating agent with end-call capability...\n');

  try {
    const agent = await client.conversationalAi.agents.create({
      conversationConfig: {
        agent: {
          prompt: {
            prompt: `You are calling Josh for a quick VoiceNow CRM system test.

CONVERSATION (KEEP UNDER 30 SECONDS):

1. Greet: "Hi Josh! Quick test call from VoiceNow CRM. Can you hear me?"

2. Confirm: Wait for yes/no
   - If yes: "Perfect! System is working."
   - If no: "Let me know if you can hear this."

3. End: "Thanks Josh! Hanging up now. Bye!"

4. IMMEDIATELY USE THE end_call TOOL to hang up

CRITICAL: After saying goodbye, you MUST call the end_call tool to terminate the call. Do not wait for Josh to hang up.

EXAMPLE:
You: "Hi Josh! Quick test from VoiceFlow. Can you hear me?"
Josh: "Yes"
You: "Perfect! Thanks Josh, hanging up now. Bye!"
[IMMEDIATELY CALL end_call TOOL]

You have a tool called "end_call" - USE IT after saying goodbye!`,
            llm: 'gemini-2.5-flash',
            temperature: 0.3
          },
          firstMessage: "Hi Josh! Quick test call. Can you hear me?",
          language: 'en',
          clientTools: [
            {
              name: 'end_call',
              description: 'End the phone call immediately. Call this after saying goodbye.',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          ]
        },
        tts: {
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
          model: 'eleven_flash_v2_5',
          optimizeStreamingLatency: 3
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs'
        }
      }
    });

    console.log('✅ Agent created with end_call tool!');
    console.log('   Agent ID:', agent.agentId);
    console.log('   Special ability: Can hang up the call');
    return agent;

  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

async function makeCall(agentId) {
  console.log('\n📞 Making call with hang-up capability...\n');

  try {
    const callResult = await client.conversationalAi.batchCalls.create({
      callName: 'Test Call - With Hangup Tool',
      agentId: agentId,
      agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      recipients: [
        {
          phoneNumber: '+14802555887'
        }
      ]
    });

    console.log('✅ Call initiated!');
    console.log('\n📱 This time the agent can actually hang up!');
    console.log('   It will use the "end_call" tool after saying goodbye.');
    console.log('\nAnswer and the call should end properly within 30 seconds.');

    return callResult;

  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Call Test - Agent Can Hang Up!\n');
  console.log('='.repeat(60));

  try {
    const agent = await createAgentWithHangupTool();
    const call = await makeCall(agent.agentId);

    console.log('\n✅ Call placed with proper hang-up capability!');
    console.log('\n💡 The agent now has an "end_call" tool');
    console.log('   After saying goodbye, it will use this tool to hang up.');
    console.log('\nThis should work properly now! 📞');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
