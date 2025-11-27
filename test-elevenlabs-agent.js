#!/usr/bin/env node

/**
 * Test ElevenLabs Conversational AI Agent
 * Creates an agent directly in ElevenLabs and makes a call
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const PHONE_NUMBER = process.argv[2] || '+14802555887';
const ELEVENLABS_PHONE_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;

async function testElevenLabsAgent() {
  try {
    console.log('\n🧪 ELEVENLABS CONVERSATIONAL AI TEST\n');
    console.log('='.repeat(60));

    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not set');
      process.exit(1);
    }

    // Step 1: Create a conversational AI agent in ElevenLabs
    console.log('\n1️⃣  Creating ElevenLabs Conversational AI Agent...');

    const agentConfig = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: `You are Sarah, a friendly AI assistant for VoiceNow CRM.

Your goal is to demonstrate the power of ElevenLabs conversational AI.

Key talking points:
- You're an AI voice agent powered by ElevenLabs
- You can have natural conversations over the phone
- You're testing the VoiceNow CRM integration
- Ask the caller if they can hear you clearly

Keep responses short and conversational. Be friendly and engaging.`,
            llm: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 200
          },
          first_message: "Hi! This is Sarah from VoiceNow CRM. I'm an actual ElevenLabs conversational AI agent. Can you hear me?",
          language: "en"
        },
        tts: {
          voice_id: "EXAVITQu4vr4xnSDxMaL", // Sarah voice
          model_id: "eleven_turbo_v2", // Use turbo v2 for conversational AI
          optimize_streaming_latency: 3,
          stability: 0.5,
          similarity_boost: 0.75
        },
        conversation: {
          max_duration_seconds: 300,
          client_events: [
            "agent_response",
            "user_transcript",
            "interruption"
          ]
        }
      }
    };

    console.log('   📝 Agent configuration ready');
    console.log('   🎙️  Voice: Sarah (ElevenLabs)');
    console.log('   🧠 LLM: GPT-4o-mini');

    const createAgentResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentConfig)
    });

    if (!createAgentResponse.ok) {
      const error = await createAgentResponse.text();
      console.error('❌ Failed to create agent:', createAgentResponse.status, error);

      // Try the alternative endpoint
      console.log('\n   Trying alternative agent creation...');

      const simpleAgent = {
        name: "VoiceFlow Test Agent",
        voice_id: "EXAVITQu4vr4xnSDxMaL",
        prompt: "You are Sarah, a friendly AI assistant demonstrating ElevenLabs conversational AI for VoiceNow CRM.",
        first_message: "Hi! This is Sarah from VoiceNow CRM. I'm testing the ElevenLabs integration. Can you hear me clearly?"
      };

      const altResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simpleAgent)
      });

      if (!altResponse.ok) {
        const altError = await altResponse.text();
        console.error('❌ Alternative endpoint also failed:', altError);
        console.log('\n⚠️  ElevenLabs Conversational AI may require a paid plan');
        console.log('   You might need to upgrade your ElevenLabs account\n');
        process.exit(1);
      }

      const altData = await altResponse.json();
      console.log('   ✅ Agent created (alternative):', altData);
      const agentId = altData.agent_id || altData.id;

      if (!agentId) {
        console.error('❌ No agent ID returned');
        process.exit(1);
      }

      console.log(`   📋 Agent ID: ${agentId}`);

      // Make the call
      await makeCall(agentId);
      return;
    }

    const agentData = await createAgentResponse.json();
    console.log('   ✅ Agent created successfully!');

    const agentId = agentData.agent_id || agentData.id;

    if (!agentId) {
      console.error('❌ No agent ID returned:', agentData);
      process.exit(1);
    }

    console.log(`   📋 Agent ID: ${agentId}`);

    // Step 2: Initiate the call
    await makeCall(agentId);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function makeCall(agentId) {
  console.log('\n2️⃣  Initiating Phone Call...');
  console.log(`   📞 Calling: ${PHONE_NUMBER}`);
  console.log(`   🤖 Agent: ${agentId}`);

  if (!ELEVENLABS_PHONE_ID) {
    console.error('   ❌ ELEVENLABS_PHONE_NUMBER_ID not set');
    console.log('   Set this in your .env file to enable calling');
    process.exit(1);
  }

  const callConfig = {
    agent_id: agentId,
    phone_number_id: ELEVENLABS_PHONE_ID,
    to_number: PHONE_NUMBER
  };

  const callResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversation/phone', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(callConfig)
  });

  if (!callResponse.ok) {
    const error = await callResponse.text();
    console.error('   ❌ Failed to initiate call:', callResponse.status);
    console.error('   Error:', error);
    process.exit(1);
  }

  const callData = await callResponse.json();
  console.log('   ✅ Call initiated successfully!');
  console.log(`   📞 Call ID: ${callData.call_id || callData.id}`);
  console.log(`   📊 Status: ${callData.status}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE!\n');
  console.log('🎧 Your phone should be ringing now!');
  console.log('   Answer to speak with the ElevenLabs AI agent\n');
  console.log('This is a REAL conversational AI agent that can:');
  console.log('  ✅ Understand what you say');
  console.log('  ✅ Respond intelligently');
  console.log('  ✅ Have a natural conversation');
  console.log('  ✅ Use the ElevenLabs Sarah voice\n');
}

testElevenLabsAgent();
