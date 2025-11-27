/**
 * Call Josh - Agent with SMS and Email Tools
 *
 * This agent can send SMS messages and emails DURING the phone conversation.
 * When the agent decides to use these tools, ElevenLabs will call our webhook,
 * we'll execute the action, and return the result to the agent.
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Your production webhook URL (replace with your actual URL)
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/tool-invocation';

async function createAgentWithTools() {
  console.log('\n🤖 Creating agent with SMS and Email tools...\n');

  try {
    const agent = await client.conversationalAi.agents.create({
      conversationConfig: {
        agent: {
          prompt: {
            prompt: `You are calling Josh to demonstrate the VoiceNow CRM system with SMS and email capabilities.

YOUR ROLE:
Test the multi-channel communication system during a phone call.

CONVERSATION FLOW:

1. GREETING (5 seconds)
"Hi Josh! This is a demo call from VoiceNow CRM. I can now send you texts and emails while we talk!"

2. DEMONSTRATE SMS (10 seconds)
"Let me send you a quick text message right now to demonstrate..."
[USE send_sms TOOL to send: "Hi Josh! This text was sent by the AI agent while we're on the phone. Pretty cool right? 🤖"]

3. CONFIRM SMS
"Did you receive the text message I just sent?"
Wait for Josh's response.

4. DEMONSTRATE EMAIL (10 seconds)
"Great! Now let me send you an email with a call summary..."
[USE send_email TOOL to send an email with subject "VoiceNow CRM Call Summary" and a brief summary]

5. END CALL
"Perfect! You should have both a text and an email from this call. This is how the system works - agents can text and email during conversations. Thanks Josh! Goodbye!"
[USE end_call TOOL]

TOOLS YOU HAVE:
- send_sms: Send SMS to Josh's phone
- send_email: Send email to Josh
- end_call: End the phone call

IMPORTANT:
- Actually USE the tools, don't just talk about them
- Keep call under 1 minute total
- Be brief and demo-focused
- After saying goodbye, END THE CALL using end_call tool

EXAMPLE CONVERSATION:
Agent: "Hi Josh! Demo call from VoiceNow CRM. I can text and email during calls!"
Agent: "Sending you a text right now..." [USES send_sms]
Josh: "Got it!"
Agent: "Perfect! Now sending email..." [USES send_email]
Agent: "Great! You should have both. Thanks Josh, goodbye!" [USES end_call]`,
            llm: 'gemini-2.5-flash',
            temperature: 0.7
          },
          firstMessage: "Hi Josh! Demo call from VoiceNow CRM. I can text and email while we talk!",
          language: 'en',
          clientTools: [
            {
              name: 'send_sms',
              description: 'Send an SMS text message to the person you are talking to. Use this to send them information during the call.',
              parameters: {
                type: 'object',
                properties: {
                  to: {
                    type: 'string',
                    description: 'Phone number to send SMS to (E.164 format like +14802555887)'
                  },
                  message: {
                    type: 'string',
                    description: 'The text message content to send'
                  }
                },
                required: ['to', 'message']
              }
            },
            {
              name: 'send_email',
              description: 'Send an email to the person you are talking to. Use this to send them summaries, links, or documents.',
              parameters: {
                type: 'object',
                properties: {
                  to: {
                    type: 'string',
                    description: 'Email address to send to'
                  },
                  subject: {
                    type: 'string',
                    description: 'Email subject line'
                  },
                  body: {
                    type: 'string',
                    description: 'Email body content (can include line breaks)'
                  }
                },
                required: ['to', 'subject', 'body']
              }
            },
            {
              name: 'end_call',
              description: 'End the phone call. Use this after saying goodbye.',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          ],
          clientToolsWebhook: {
            url: WEBHOOK_URL,
            method: 'POST'
          }
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

    console.log('✅ Agent created with tools!');
    console.log('   Agent ID:', agent.agentId);
    console.log('   Tools: send_sms, send_email, end_call');
    console.log('   Webhook:', WEBHOOK_URL);
    return agent;

  } catch (error) {
    console.error('❌ Failed to create agent:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

async function makeCall(agentId) {
  console.log('\n📞 Initiating call with multi-channel capabilities...\n');

  try {
    const callResult = await client.conversationalAi.batchCalls.create({
      callName: 'Demo Call - SMS & Email During Call',
      agentId: agentId,
      agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      recipients: [
        {
          phoneNumber: '+14802555887' // Josh's number
        }
      ]
    });

    console.log('✅ Call initiated!');
    console.log('   Batch ID:', callResult.batchId);
    console.log('\n📱 What will happen:');
    console.log('   1. Phone will ring');
    console.log('   2. Agent will greet you');
    console.log('   3. Agent will SEND YOU A TEXT while talking');
    console.log('   4. Agent will SEND YOU AN EMAIL while talking');
    console.log('   5. Agent will hang up');
    console.log('\n💡 This demonstrates real-time multi-channel communication!');
    console.log('   Check your phone for the text and your email inbox!');

    return callResult;

  } catch (error) {
    console.error('❌ Failed to initiate call:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 VoiceNow CRM - Multi-Channel Demo Call\n');
  console.log('='.repeat(70));
  console.log('Target: Josh (+1 480-255-5887)');
  console.log('Capabilities: Phone + SMS + Email');
  console.log('Feature: Agent sends messages DURING the call');
  console.log('='.repeat(70));

  try {
    // Check if webhook URL is set
    if (!WEBHOOK_URL) {
      console.error('\n❌ ERROR: WEBHOOK_URL not set in .env file!');
      console.log('\nYou need to:');
      console.log('1. Deploy your backend with the webhook route');
      console.log('2. Add WEBHOOK_URL to your .env file');
      console.log('   Example: WEBHOOK_URL=https://your-app.onrender.com/api/elevenlabs-webhook/tool-invocation');
      process.exit(1);
    }

    // Step 1: Create agent with tools
    const agent = await createAgentWithTools();

    // Step 2: Make the call
    const call = await makeCall(agent.agentId);

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS! Multi-channel agent is calling Josh!');
    console.log('='.repeat(70));
    console.log('\n📋 What makes this special:');
    console.log('1. ✅ Agent makes phone call');
    console.log('2. ✅ Agent sends SMS DURING the call (not after)');
    console.log('3. ✅ Agent sends Email DURING the call (not after)');
    console.log('4. ✅ Agent hangs up properly');
    console.log('\n🎉 This is production-ready multi-channel AI communication!');
    console.log('\n📱 Answer the phone and watch the magic happen!');
    console.log('   You will receive:');
    console.log('   - Phone call from the agent');
    console.log('   - SMS message mid-conversation');
    console.log('   - Email message mid-conversation');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ FAILED');
    console.error('='.repeat(70));
    console.error('\nError:', error.message);

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check ELEVENLABS_API_KEY in .env');
    console.log('2. Check ELEVENLABS_PHONE_NUMBER_ID in .env');
    console.log('3. Check WEBHOOK_URL in .env (must be publicly accessible)');
    console.log('4. Ensure backend server is running with webhook route');
    console.log('5. Check Twilio credentials for SMS (TWILIO_*)');
    console.log('6. Check email credentials (EMAIL_*)');

    process.exit(1);
  }
}

main();
