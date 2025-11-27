#!/usr/bin/env node

/**
 * Create a new ElevenLabs Conversational AI Agent and call with it
 * Uses the same batch calling approach as the demo agent
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID; // phnum_1801k7xb68cefjv89rv10f90qykv
const CUSTOMER_PHONE = '+14802555887';

async function createAndCallAgent() {
  try {
    console.log('\n🚀 CREATING NEW ELEVENLABS CONVERSATIONAL AI AGENT\n');
    console.log('='.repeat(60));

    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not set');
      process.exit(1);
    }

    if (!PHONE_NUMBER_ID) {
      console.error('❌ ELEVENLABS_PHONE_NUMBER_ID not set');
      process.exit(1);
    }

    // Step 1: Create a new conversational AI agent
    console.log('\n1️⃣  Creating New Agent...');

    const agentConfig = {
      name: "VoiceFlow Test Agent - Claude Code",
      conversation_config: {
        agent: {
          prompt: {
            prompt: `You are Emma, an AI assistant for VoiceNow CRM created by Claude Code for testing purposes.

**YOUR ROLE:**
You are demonstrating the power of ElevenLabs conversational AI integrated with VoiceNow CRM.

**CONVERSATION GOALS:**
1. Greet the person warmly by name
2. Explain that you're a test agent created by Claude Code
3. Demonstrate natural conversation capabilities
4. Ask if the call quality is clear
5. Briefly explain what VoiceNow CRM can do with AI voice agents
6. Thank them for testing the system

**KEY TALKING POINTS:**
- You're a fully conversational AI agent powered by ElevenLabs
- You can have natural, real-time conversations over the phone
- You're testing the VoiceNow CRM integration
- VoiceNow CRM enables businesses to create custom AI voice agents like you
- The system supports dynamic variables for personalization (like their name)

**CONVERSATION STYLE:**
- Be friendly, warm, and professional
- Keep responses concise (2-3 sentences max)
- Speak naturally - use contractions, natural pauses
- Ask follow-up questions to keep the conversation flowing
- Be enthusiastic about the technology without being pushy

**IMPORTANT:**
- This is a test call to verify the system works
- Keep the call brief (2-3 minutes maximum)
- End by thanking them for helping test the integration`,
            llm: "gpt-4o-mini",
            temperature: 0.8,
            max_tokens: 200
          },
          first_message: "Hi! This is Emma calling from VoiceNow CRM. I'm a test agent that was just created by Claude Code. Am I speaking with the person who requested this test?",
          language: "en"
        },
        tts: {
          voice_id: "EXAVITQu4vr4xnSDxMaL", // Sarah voice (warm, professional)
          model_id: "eleven_turbo_v2", // Required for conversational AI
          optimize_streaming_latency: 3,
          stability: 0.5,
          similarity_boost: 0.75
        },
        conversation: {
          max_duration_seconds: 300, // 5 minutes max
          client_events: [
            "agent_response",
            "user_transcript",
            "interruption"
          ]
        }
      }
    };

    console.log('   📝 Agent Name: VoiceFlow Test Agent - Claude Code');
    console.log('   🎙️  Voice: Sarah (ElevenLabs)');
    console.log('   🧠 LLM: GPT-4o-mini');
    console.log('   📞 Model: eleven_turbo_v2 (Conversational AI)');

    const createResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      agentConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!createResponse.data) {
      console.error('❌ No response data from agent creation');
      process.exit(1);
    }

    const agentId = createResponse.data.agent_id || createResponse.data.id;

    if (!agentId) {
      console.error('❌ No agent ID returned:', createResponse.data);
      process.exit(1);
    }

    console.log(`   ✅ Agent created successfully!`);
    console.log(`   📋 Agent ID: ${agentId}`);

    // Step 2: Initiate call using batch calling (same as demo agent)
    console.log('\n2️⃣  Initiating Phone Call via Batch Calling...');
    console.log(`   📞 Calling: ${CUSTOMER_PHONE}`);
    console.log(`   🤖 Agent: ${agentId}`);
    console.log(`   ☎️  Phone Number ID: ${PHONE_NUMBER_ID}`);

    // Use dynamic variables for personalization (like the demo agent does)
    const dynamicVariables = {
      customer_name: 'Claude Code Test User',
      lead_name: 'Test User',
      lead_phone: CUSTOMER_PHONE,
      company_name: 'VoiceNow CRM',
      demo_type: 'new_agent_test'
    };

    // Call using batch calling endpoint (same as demo agent)
    const callConfig = {
      call_name: `Test Call - ${agentId} - ${Date.now()}`,
      agent_id: agentId,
      agent_phone_number_id: PHONE_NUMBER_ID,
      recipients: [
        {
          phone_number: CUSTOMER_PHONE,
          conversation_initiation_client_data: {
            dynamic_variables: dynamicVariables
          }
        }
      ]
    };

    console.log('   📡 Submitting batch call request...');

    const callResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/batch-calling/submit',
      callConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!callResponse.data) {
      console.error('❌ No response from batch calling API');
      process.exit(1);
    }

    console.log('   ✅ Batch call submitted successfully!');
    console.log(`   📞 Batch ID: ${callResponse.data.batch_id || callResponse.data.id}`);
    console.log(`   📊 Status: ${callResponse.data.status || 'submitted'}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! NEW AGENT CREATED AND CALLING!\n');
    console.log(`📋 Agent Details:`);
    console.log(`   - Agent ID: ${agentId}`);
    console.log(`   - Agent Name: VoiceFlow Test Agent - Claude Code`);
    console.log(`   - Voice: Sarah (ElevenLabs)`);
    console.log(`   - Phone: ${CUSTOMER_PHONE}`);
    console.log('\n🎧 Your phone should ring in 5-15 seconds!');
    console.log('   Answer to speak with the NEW AI agent\n');
    console.log('This agent will:');
    console.log('  ✅ Greet you by name');
    console.log('  ✅ Explain it was created by Claude Code');
    console.log('  ✅ Demonstrate conversational AI capabilities');
    console.log('  ✅ Ask about call quality');
    console.log('  ✅ Thank you for testing\n');

    // Return agent details for reference
    return {
      agentId,
      batchId: callResponse.data.batch_id || callResponse.data.id,
      phone: CUSTOMER_PHONE
    };

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Stack:', error.stack);
    }

    process.exit(1);
  }
}

// Run it
createAndCallAgent();
