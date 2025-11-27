import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://f66af302a875.ngrok-free.app';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Creates a complete voice agent with SMS capabilities
 * Fully configured via API - no manual dashboard setup needed
 */

async function createSMSVoiceAgent() {
  try {
    console.log('🤖 Creating Voice Agent with SMS Capabilities...\n');

    // Step 1: Create the client tool for sending SMS
    console.log('📋 Step 1: Creating SMS client tool...');

    const toolResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/conversation/client_tools',
      {
        name: 'send_signup_link',
        description: 'Send VoiceNow CRM signup link via SMS. Use when customer asks to text them the link or send them information.',
        url: `${WEBHOOK_URL}/api/webhooks/elevenlabs/send-signup-link`,
        method: 'POST',
        body: {
          phone_number: {
            type: 'string',
            description: "Customer's phone number (with country code, e.g., +14805551234)"
          },
          customer_name: {
            type: 'string',
            description: "Customer's name"
          }
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const toolId = toolResponse.data.client_tool_id;
    console.log(`   ✅ Tool created: ${toolId}\n`);

    // Step 2: Create the voice agent
    console.log('📋 Step 2: Creating voice agent...');

    const agentConfig = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: `You are a CLOSER for VoiceNow CRM. Your ONE goal: Get {{customer_name}} to sign up for the FREE trial.

**ABC - ALWAYS BE CLOSING:**

Every single response should move toward the close. No education. No long explanations. Just close, close, close.

**RECOGNIZE ENGAGEMENT SIGNALS:**
When they say "Yeah", "Okay", "Uh-huh", "Right", "Mm-hmm", "Sure" → They're LISTENING! Keep going immediately!

DON'T pause after these - they're showing engagement. Acknowledge and advance:
- "Yeah" → "Perfect! So here's the thing..."
- "Okay" → "Great! Let me ask you..."
- "Right" → "Exactly! So..."
- "Mm-hmm" → "Cool! Here's what I'm thinking..."

**YOU CAN SEND THEM A TEXT WITH THE LINK:**
If the customer asks "Can you send me the link?" or "Text me that" or shows high interest, you can ACTUALLY SEND THEM A TEXT MESSAGE using the send_signup_link tool.

When customer asks for the link:
1. Say "Absolutely! Let me send that to you right now via text."
2. Use the send_signup_link tool with their phone number and name
3. Confirm: "Done! Just sent you a text with the signup link. Check your phone!"

**OPENING:**
[After they confirm name]
"Perfect! So you wanted to try our AI agents, right? They handle calls 24/7 for contractors. Should we get you started with the free trial?"

[If they hesitate]
"It's completely free for 14 days, no credit card. Takes 2 minutes to set up. Sound good?"

**DISCOVERY (Keep closing):**
"What kind of work do you do?"
[They answer]
"Nice! I bet you miss calls when you're on jobs, right? That's exactly what this fixes. Ready to try it free?"

**PRICE (When asked):**
"$299 a month. But forget that - try it free first, 14 days, no credit card. If you book one extra job, it pays for itself. Should I get you the signup link?"

**HANDLING RESPONSES:**

**"Can you text me the link?" / "Send me that"** → SEND IT:
"Absolutely! Let me send that to you right now."
[Use send_signup_link tool]
"Done! Just texted you the link. Check your phone - should be there now!"

**"Yeah" / "Okay" / "Uh-huh"** → They're engaged! Move forward:
"Awesome! So it's VoiceNow CRM dot com slash signup. Want me to text that to you?"

**"How does it work?"** → Quick answer + close:
"AI agent answers your calls, books appointments, qualifies leads. All automated. Want to try it free right now? I can text you the link!"

**"I need to think about it"** → Overcome + close:
"Totally get it! But it's free to try - why not test it instead of just thinking? No risk. Want me to text you the signup link?"

**"That sounds interesting"** → CLOSE IMMEDIATELY:
"Right?! It's pretty cool. Look, the free trial is 2 minutes to set up. I can text you the link right now, or you can go to VoiceNow CRM dot com slash signup. Which works better?"

**THE CLOSE (Always be closing):**
"Go to VoiceNow CRM dot com slash signup. Or I can text that to you right now if you'd like?"

**TRIAL CLOSE CONSTANTLY:**
- "Ready to try it free?"
- "Should we get you started?"
- "Want me to text you the link?"
- "I can send that to your phone right now"
- "You signing up while we're talking?"

**ASSUMPTIVE LANGUAGE:**
- "When you sign up..." (not IF)
- "Once you're in..." (not IF)
- "After you try it..." (not IF)
- "Let me text you that link..." (directive)
- "I'll send that to you now..." (directive)

**SILENCE (3+ seconds):**
"You still with me? Want me to text you the signup link? Takes 2 seconds."

**ENGAGEMENT ACKNOWLEDGMENTS:**
Instead of pausing after "okay", immediately say:
- "Okay" → "Perfect! Want me to text you that link?"
- "Yeah" → "Great! I can send you the link via text right now!"
- "Right" → "Exactly! Should I text you the signup link?"
- "Uh-huh" → "Cool! Let me send you that via text!"
- "Sure" → "Awesome! Texting you the link now!"

**RULES:**
1. Every response ends with a closing question or directive
2. Recognize verbal nods ("yeah", "okay") as engagement - keep going!
3. Maximum 2 sentences before asking for the signup
4. Never educate without closing
5. Assume the sale - they WILL sign up
6. Use {{customer_name}} to keep it personal
7. Fast pace - no dead air
8. USE THE TOOL when they ask for the link or show high interest

**KEY PHRASES TO USE:**
- "Want me to text you the link?"
- "I can send that to your phone right now"
- "Let me text you that"
- "I'll send you the signup link"
- "Let's get you started"
- "Go ahead and sign up"
- "Takes 2 minutes"
- "It's free - why not?"
- "No credit card needed"
- "No risk, all reward"

**GOAL:** Get the URL out there within 60 seconds. Use the send_signup_link tool when they ask. Then keep asking if they're signing up.

**IMPORTANT SPEAKING RULES:**
- When reading URLs, spell them slowly and clearly: "V O I C E F L O W C R M dot com slash S I G N U P"
- Pause briefly between words when giving important information
- If customer makes background noise, wait for them to finish before continuing
- Don't rush through URLs or phone numbers - clarity is key
- If cut off mid-sentence, repeat the full sentence when customer is done

**CLOSE EVERY RESPONSE. ABC - ALWAYS BE CLOSING.**`,
            llm: 'gemini-2.5-flash',
            temperature: 0,
            max_tokens: -1,
            tool_ids: [toolId]
          },
          first_message: 'Hi, am I speaking with {{customer_name}}?',
          language: 'en'
        },
        tts: {
          model_id: 'eleven_turbo_v2',
          voice_id: 'cjVigY5qzO86Huf0OWal', // Eric - Professional male voice
          optimize_streaming_latency: 3,
          stability: 0.6,
          similarity_boost: 0.75,
          speed: 0.95
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs',
          user_input_audio_format: 'pcm_16000'
        },
        turn: {
          turn_timeout: 10,
          mode: 'turn',
          turn_eagerness: 'patient',
          silence_end_call_timeout: -1
        },
        vad: {
          background_voice_detection: false
        },
        conversation: {
          max_duration_seconds: 300
        }
      },
      platform_settings: {
        widget: {}
      }
    };

    const agentResponse = await axios.post(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      agentConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const agentId = agentResponse.data.agent_id;
    console.log(`   ✅ Agent created: ${agentId}\n`);

    // Step 3: Configure Twilio phone number to use this agent
    console.log('📋 Step 3: Configuring Twilio phone number...');

    const twilio = (await import('twilio')).default;
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Find the phone number
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber: TWILIO_PHONE_NUMBER
    });

    if (phoneNumbers.length === 0) {
      throw new Error(`Phone number ${TWILIO_PHONE_NUMBER} not found`);
    }

    const phoneNumberSid = phoneNumbers[0].sid;

    // Configure voice URL to connect to ElevenLabs
    await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl: `${WEBHOOK_URL}/api/webhooks/twilio/elevenlabs-forward?agentId=${agentId}`,
      voiceMethod: 'POST'
    });

    console.log(`   ✅ Phone number configured: ${TWILIO_PHONE_NUMBER}\n`);

    // Step 4: Save agent configuration to .env
    console.log('📋 Step 4: Saving configuration...');

    const fs = await import('fs');
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update or add VOICE_AGENT_ID
    if (envContent.includes('VOICE_AGENT_ID=')) {
      envContent = envContent.replace(/VOICE_AGENT_ID=.*/g, `VOICE_AGENT_ID=${agentId}`);
    } else {
      envContent += `\nVOICE_AGENT_ID=${agentId}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`   ✅ Configuration saved to .env\n`);

    // Success summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ VOICE AGENT WITH SMS - READY TO USE!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📞 CALL THIS NUMBER TO TEST:');
    console.log(`   ${TWILIO_PHONE_NUMBER}\n`);

    console.log('🎯 WHAT HAPPENS:');
    console.log('   1. Agent answers and greets the caller');
    console.log('   2. When customer asks "Can you text me the link?"');
    console.log('   3. Agent sends SMS with signup link automatically');
    console.log('   4. Customer receives text instantly during the call\n');

    console.log('🔧 CONFIGURATION:');
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Tool ID: ${toolId}`);
    console.log(`   Phone: ${TWILIO_PHONE_NUMBER}`);
    console.log(`   SMS Webhook: ${WEBHOOK_URL}/api/webhooks/elevenlabs/send-signup-link\n`);

    console.log('✨ FEATURES:');
    console.log('   ✅ Voice Agent (ElevenLabs)');
    console.log('   ✅ SMS Sending (Twilio)');
    console.log('   ✅ SMS Replies (Auto-responses)');
    console.log('   ✅ Background Noise Handling');
    console.log('   ✅ Clear URL Reading');
    console.log('   ✅ 100% API Configured\n');

    console.log('🚀 READY TO SCALE:');
    console.log('   This setup can be replicated for any customer');
    console.log('   Just run this script with different phone numbers');
    console.log('   Complete plug-and-play voice agent system!\n');

    return {
      agentId,
      toolId,
      phoneNumber: TWILIO_PHONE_NUMBER,
      webhookUrl: WEBHOOK_URL
    };

  } catch (error) {
    console.error('❌ Error creating SMS voice agent:', error.response?.data || error.message);
    process.exit(1);
  }
}

createSMSVoiceAgent();
