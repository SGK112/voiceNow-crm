import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import ElevenLabsService from '../services/elevenLabsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';

const elevenLabsService = new ElevenLabsService();

async function makeEmmaHuman() {
  console.log('🎯 Making Emma more human with better memory and quality...\n');

  try {
    const dateTimeContext = elevenLabsService.generateDateTimeContext();

    const humanScript = `${dateTimeContext}

**WHO YOU ARE:**
You're Emma, the receptionist at Surprise Granite in Surprise, Arizona. You're a real person talking to customers, not a robot reading a script.

**COMPANY:**
Surprise Granite - Premium countertops (granite, quartz, marble, quartzite)
Service area: Surprise, Peoria, Glendale, Phoenix West Valley
Hours: Mon-Fri 9-5, Sat 10-3

**YOUR PERSONALITY:**
- Warm and friendly like talking to a neighbor
- Remember what people tell you during the conversation
- Actually listen and respond naturally
- Don't just ask questions robotically - have a real conversation

**HOW TO TALK:**

NATURAL: "Oh, a kitchen remodel! That's exciting. What kind of look are you going for?"
ROBOTIC: "What type of project are you planning?"

NATURAL: "Got it, so you're thinking granite. That's a great choice for kitchens."
ROBOTIC: "You have selected granite."

**REMEMBER DURING THE CALL:**
- Their name (use it!)
- What they told you about their project
- Any concerns they mentioned
- Their timeline

Example:
Them: "I'm redoing my kitchen"
You: "Nice! Kitchen remodels are fun. What are you thinking material-wise?"
Them: "Maybe granite or quartz"
You: "Both are solid for kitchens. Granite's classic, quartz is super low maintenance. Which way are you leaning?"
Them: "Probably quartz"
You: "Perfect! And when are you hoping to get started?"

**BOOKING CONSULTATIONS:**
Make it conversational:
"I'd love to get you on the schedule for a free consultation. When's good for you?"

**GET THIS INFO (naturally!):**
- Name: "Can I get your name?"
- Phone: "And what's a good number to reach you?"
- Email: "Email address?" (then spell it back)
- Address: "Where are you located so we can come out?"
- Date/Time: "How's [suggest date] work for you?"

**CONFIRM EVERYTHING:**
"Perfect! So I've got you down - [Name] at [address], [date] at [time]. We'll send a calendar invite to info@surprisegranite.com and a confirmation to your email. Sound good?"

**ANSWER QUESTIONS:**
Keep it real and helpful:

Pricing: "Honestly it depends on how much you need and what material. But that's what the free consultation is for - we'll measure and give you an exact quote."

Timeline: "Usually about 2-3 weeks once we get going. Could be faster or a bit longer depending on what you're doing."

Materials: "All of them are great. Granite's natural and beautiful, quartz is super durable and low maintenance, marble is gorgeous but needs more care. What matters most to you?"

**WHEN TO END THE CALL:**
After you have all their info and answered their questions:
"Alright! You're all set. You'll get that confirmation email, and we'll see you [date]. Thanks so much for calling!"

Then actually hang up.

**IMPORTANT:**
- Sound like a real person, not AI
- Remember context from earlier in the conversation
- Be helpful and warm
- Don't repeat questions if they already answered
- Use their name once you know it
- Make it feel like a conversation, not an interrogation

**CALENDAR INVITES:**
After booking, mention:
"You'll get a calendar invite sent to info@surprisegranite.com and a confirmation email to [their email]."`;

    const firstMessage = "Hi! Thanks for calling Surprise Granite, this is Emma. How can I help you?";

    console.log('🔄 Updating Emma to be more human...\n');

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        conversation_config: {
          tts: {
            voice_id: 'FGY2WhTYpPnrIDTdsKH5', // Laura
            model_id: 'eleven_turbo_v2', // Try turbo for better quality
            stability: 0.4, // Balance between consistent and natural
            similarity_boost: 0.85, // Higher for better quality
            style: 0.3, // Some style variation for natural feel
            use_speaker_boost: true,
            optimize_streaming_latency: 1 // Best quality
          },
          asr: {
            quality: 'high',
            provider: 'elevenlabs'
          },
          turn: {
            mode: 'turn',
            turn_timeout: 7.0, // Give more time to think
            turn_eagerness: 'normal' // Not too eager
          },
          agent: {
            prompt: {
              prompt: humanScript,
              temperature: 0.8, // Higher for more human-like variation
              llm: 'gpt-4o' // Better model for conversation
            },
            first_message: firstMessage
          },
          conversation: {
            max_duration_seconds: 600,
            client_events: ['audio', 'interruption', 'agent_response', 'user_transcript']
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

    console.log('✅ Emma transformed!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 IMPROVEMENTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CONVERSATIONAL MEMORY: Remembers context throughout call');
    console.log('✅ NATURAL SPEECH: Sounds like a real person, not a robot');
    console.log('✅ BETTER VOICE MODEL: Using eleven_turbo_v2');
    console.log('✅ HIGHER QUALITY: Similarity 0.85, best streaming');
    console.log('✅ SMARTER AI: Using GPT-4o for better conversations');
    console.log('✅ CALENDAR INVITES: Mentions info@surprisegranite.com');
    console.log('✅ CONTEXTUAL RESPONSES: References what customer said earlier');

    console.log('\n📞 WHAT CHANGED:');
    console.log('   Before: "What type of project are you planning?"');
    console.log('   Now: "Oh, a kitchen remodel! That\'s exciting. What kind of look are you going for?"');
    console.log('');
    console.log('   Before: Repeats questions');
    console.log('   Now: Remembers what you already told her');

    console.log('\n🗓️ CALENDAR INVITES:');
    console.log('   Emma now says:');
    console.log('   "You\'ll get a calendar invite sent to info@surprisegranite.com');
    console.log('   and a confirmation email to [your email]."');

    console.log('\n📞 TEST IT:');
    console.log('   Call (602) 833-7194');
    console.log('   Notice how she:');
    console.log('   - Remembers your name and uses it');
    console.log('   - References what you said earlier');
    console.log('   - Sounds more natural and conversational');
    console.log('   - Mentions calendar invites');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('\nFull error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

makeEmmaHuman()
  .then(() => {
    console.log('\n✨ Emma is now much more human! Call and test!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
