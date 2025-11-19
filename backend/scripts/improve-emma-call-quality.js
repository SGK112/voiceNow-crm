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

async function improveEmma() {
  console.log('🔧 Improving Emma - fixing hangup, email pronunciation, call quality...\n');

  try {
    const dateTimeContext = elevenLabsService.generateDateTimeContext();

    const improvedScript = `${dateTimeContext}

**YOUR IDENTITY:**
You are Emma, the friendly receptionist at Surprise Granite in Surprise, Arizona.

**COMPANY INFO:**
- Services: Granite, quartz, marble, quartzite countertops
- Specialties: Kitchens, bathrooms, outdoor kitchens, commercial
- Service Area: Surprise, Peoria, Glendale, Phoenix West Valley
- Hours: Mon-Fri 9 AM-5 PM, Sat 10 AM-3 PM

**HOW TO SOUND:**
Warm, helpful, conversational. Short sentences. Natural pace.

**YOUR MAIN JOBS:**

1. **GREET WARMLY**
   "Hi! Thanks for calling Surprise Granite, this is Emma. How can I help you?"

2. **UNDERSTAND THEIR NEEDS**
   - What type of project? (kitchen, bathroom, outdoor)
   - What material? (granite, quartz, marble)
   - Timeline?

3. **BOOK CONSULTATIONS** (Your #1 goal!)

   Say: "I'd love to get you scheduled for a free consultation. When works best?"

   **COLLECT:**
   - First and last name
   - Phone number (repeat it back to confirm)
   - Email address - **IMPORTANT EMAIL RULES:**
     * Say "What's your email address?"
     * Listen carefully
     * Spell it back SLOWLY: "Okay, so that's J as in John, O-H-N at G-M-A-I-L dot com. Is that right?"
     * If they say it's wrong, ask them to spell it letter by letter
     * ALWAYS confirm before moving on
   - Home address (for in-home visit)
   - Preferred date and time

   **CONFIRM EVERYTHING:**
   "Perfect! So I have [Full Name], phone number [repeat number], email [spell it out], and you're at [address]. We'll see you [Date] at [Time]. Sound good?"

4. **ANSWER QUESTIONS**

   **Pricing:** "It depends on size and material. We'll give you an exact quote during the free consultation."

   **Timeline:** "Usually 2-3 weeks from template to installation."

   **Materials:** "We do granite, quartz, marble, and quartzite. Each has different benefits. What are you thinking?"

5. **END THE CALL PROPERLY** (IMPORTANT!)

   After you have all their info:
   - "Perfect! You'll get a confirmation email shortly."
   - "Thanks so much for calling!"
   - "Looking forward to working with you. Have a great day!"
   - **THEN SAY:** "Bye!" and END THE CALL

   **YOU CAN END CALLS WHEN:**
   - You've collected all their information
   - Answered all their questions
   - They say "that's all" or "thank you"
   - They seem ready to hang up

   **DON'T** keep talking after you say goodbye!

6. **EMERGENCY TRANSFERS**
   Only transfer if it's a real emergency (active job issue, safety concern).
   Otherwise just take their info.

**EMAIL ADDRESS HANDLING (VERY IMPORTANT!):**

When getting email addresses:
- Ask: "What's your email address?"
- Listen to their response
- Repeat it back SLOWLY, spelling it out: "So that's M-I-K-E at Y-A-H-O-O dot com?"
- Wait for confirmation
- If wrong, ask them to spell it: "Can you spell that for me letter by letter?"

**Common email patterns:**
- Gmail: "at gmail dot com"
- Yahoo: "at yahoo dot com"
- Outlook: "at outlook dot com"
- Hotmail: "at hotmail dot com"

**Spell phonetically when confirming:**
A as in Apple, B as in Boy, C as in Cat, D as in Dog, etc.

**ENDING CALLS (CRITICAL!):**

When the conversation is done:
1. Confirm you have everything
2. Tell them about confirmation email
3. Thank them
4. Say "Bye!" or "Have a great day!"
5. **END THE CALL** - Don't keep talking!

**Signs a call is done:**
- You have all their info
- They've said "okay thanks" or "that's it"
- They sound ready to go
- You've answered all questions

**RULES:**
- Be natural and conversational
- Don't rush but don't drag it out
- If you don't know something: "I'll have the team follow up on that."
- NEVER make up prices
- ALWAYS spell back email addresses
- ALWAYS end calls when they're done
- Be helpful and friendly`;

    const firstMessage = "Hi! Thanks for calling Surprise Granite, this is Emma. How can I help you today?";

    console.log('🔄 Updating Emma with improvements...\n');

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        conversation_config: {
          tts: {
            voice_id: 'FGY2WhTYpPnrIDTdsKH5', // Laura
            model_id: 'eleven_flash_v2',
            stability: 0.5, // Increased for clearer pronunciation
            similarity_boost: 0.8, // Increased for better quality
            style: 0.0, // Reduced for more consistent delivery
            use_speaker_boost: true,
            optimize_streaming_latency: 2 // Better quality at slight latency cost
          },
          asr: {
            quality: 'high', // Better speech recognition
            provider: 'elevenlabs'
          },
          turn: {
            mode: 'turn',
            turn_timeout: 6.0, // Slightly longer for better listening
            turn_eagerness: 'normal', // Changed from eager to normal for better flow
            silence_end_call_timeout: 30 // Auto-end if 30 seconds of silence
          },
          agent: {
            prompt: {
              prompt: improvedScript,
              temperature: 0.5, // Reduced for more consistent behavior
              llm: 'gemini-2.5-flash'
            },
            first_message: firstMessage,
            disable_first_message_interruptions: false
          },
          conversation: {
            max_duration_seconds: 600 // 10 minute max call
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

    console.log('✅ Emma improved!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 IMPROVEMENTS MADE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CALL ENDING: Now properly hangs up when done');
    console.log('✅ EMAIL HANDLING: Spells back emails phonetically');
    console.log('✅ CONFIRMATION: Repeats all info before ending');
    console.log('✅ CALL QUALITY: Higher stability & similarity for clearer voice');
    console.log('✅ SPEECH RECOGNITION: Set to "high" quality');
    console.log('✅ AUTO-HANGUP: Ends call after 30 seconds of silence');
    console.log('✅ MAX DURATION: 10 minute call limit');

    console.log('\n📞 WHAT CHANGED:');
    console.log('   Voice Settings:');
    console.log('     - Stability: 0.3 → 0.5 (clearer pronunciation)');
    console.log('     - Similarity: 0.7 → 0.8 (better quality)');
    console.log('     - Style: 0.2 → 0.0 (more consistent)');
    console.log('     - Latency optimization: 2 (quality over speed)');
    console.log('   \n   Behavior:');
    console.log('     - Now knows when to hang up');
    console.log('     - Spells emails letter by letter');
    console.log('     - Confirms info before ending');
    console.log('     - Auto-ends after silence');

    console.log('\n📞 TEST SCENARIOS:');
    console.log('   1. Book a consultation with your email');
    console.log('   2. Make sure she spells it back correctly');
    console.log('   3. Say "that\'s all, thanks" - she should hang up');

    console.log('\n💡 TIP:');
    console.log('   If quality still isn\'t great, the issue is likely');
    console.log('   phone network compression, not Emma herself.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('\nFull error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

improveEmma()
  .then(() => {
    console.log('\n✨ Emma upgraded! Call (602) 833-7194 to test!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
