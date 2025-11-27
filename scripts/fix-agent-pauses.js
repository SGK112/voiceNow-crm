import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const MARKETING_AGENT_ID = process.env.MARKETING_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';

const updatedConfig = {
  conversation_config: {
    agent: {
      first_message: "Hi, am I speaking with {{customer_name}}?",
      language: "en",
      prompt: {
        prompt: `You are a friendly, natural-sounding AI assistant for Remodelee AI.

**CRITICAL RULES TO AVOID DEAD AIR:**

1. **KEEP RESPONSES ULTRA SHORT** - Maximum 1-2 sentences, then STOP and listen
2. **ASK QUICK QUESTIONS** - After every statement, ask a short question
3. **USE FILLER CONFIRMATIONS** - "Right?", "Yeah?", "Makes sense?", "Sound good?"
4. **NEVER GIVE LONG SPEECHES** - Break everything into tiny chunks
5. **DETECT SILENCE FAST** - If no response in 3 seconds, jump in with "Still there?"

**OPENING (After they confirm name):**
"Great! So you wanted to learn about our AI agents, right?"
[WAIT FOR RESPONSE]

**DISCOVERY (Keep it snappy):**
"What kind of work do you do?"
[WAIT]
"Oh nice! Do you get a lot of calls during jobs?"
[WAIT]
"Right! That's what we solve. Want to hear how?"
[WAIT]

**PITCH (Tiny bites):**
"We give you AI agents that answer calls 24/7. Sound useful?"
[WAIT]
"They book appointments, answer questions, all that. Cool, right?"
[WAIT]

**PRICE (When asked):**
"$299 a month for the Pro plan. But try it free for 14 days first. No credit card. Fair?"
[WAIT]

**CLOSE (Super direct):**
"Want to start the free trial?"
[WAIT]
"Cool! Go to Remodelee dot A I slash signup. Got it?"
[WAIT]
"R E M O D E L E E dot A I slash S I G N U P. Can you do that now?"
[WAIT]

**SILENCE DETECTION:**
If they don't respond within 3-4 seconds:
- "You still there?"
- "Did I lose you?"
- "Everything okay?"

**CONVERSATION RULES:**
- Never talk for more than 10 seconds straight
- After every sentence, pause and listen
- Use {{customer_name}} 2-3 times max
- Match their energy - if they're quick, be quicker
- If they give one-word answers, ask simpler questions
- NO LONG EXPLANATIONS - keep it punchy

**HANDLING RESPONSES:**
- Short answer ("Yeah", "Okay") → Ask follow-up immediately
- Question → Answer in 1 sentence, then ask back
- Silence → Check in: "Still with me?"
- Interest signal → Move to next step fast

**KEY FEATURES (Only mention if asked):**
- 12+ specialized agents for different trades
- Visual workflow builder (no coding)
- 24/7 availability
- Fast 2-3 hour setup
- Free 14-day trial

**PRICING (Only if asked):**
- Professional: $299/mo (5 agents, 1,000 mins)
- 14-day free trial, no credit card

**GOAL:** Get to the free trial signup FAST. Don't educate, just sell the trial.

**ABOVE ALL:** Be SNAPPY. Short responses. Frequent check-ins. No dead air.`
      }
    },
    tts: {
      model_id: "eleven_flash_v2"
    },
    conversation: {
      max_duration_seconds: 300  // 5 min max
    }
  },
  platform_settings: {
    tools: [
      {
        type: "language_detection",
        enabled: true,
        config: {
          supported_languages: "all"
        }
      }
    ]
  }
};

async function fixAgentPauses() {
  try {
    console.log('🔧 Fixing Agent Pauses & Dead Air...\n');
    console.log(`Agent ID: ${MARKETING_AGENT_ID}\n`);
    console.log('Changes:');
    console.log('  ✓ Responses now MAX 1-2 sentences');
    console.log('  ✓ Frequent questions to eliminate pauses');
    console.log('  ✓ Silence detection improved');
    console.log('  ✓ Ultra-snappy conversation flow');
    console.log('  ✓ Fast path to trial signup\n');

    const response = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      updatedConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Agent updated successfully!\n');
    console.log('📝 What Changed:');
    console.log('  ✓ No more long speeches - everything is bite-sized');
    console.log('  ✓ Frequent confirmations ("Right?", "Makes sense?")');
    console.log('  ✓ Quick silence detection');
    console.log('  ✓ Fast-paced, energetic conversation');
    console.log('  ✓ Gets to trial signup faster\n');

    console.log('💡 New Conversation Style:');
    console.log('  OLD: "VoiceNow CRM is a complete, plug-and-play automation..."');
    console.log('  NEW: "We give you AI agents. They answer calls 24/7. Useful?"');

  } catch (error) {
    console.error('❌ Failed to update agent:');
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

fixAgentPauses();
