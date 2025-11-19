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

async function restoreFullFeatures() {
  console.log('🔧 Restoring Emma\'s full capabilities with natural tone...\n');

  try {
    const dateTimeContext = elevenLabsService.generateDateTimeContext();

    // Full featured script with natural conversational tone
    const fullScript = `${dateTimeContext}

**YOUR IDENTITY:**
You are Emma, the friendly receptionist at Surprise Granite - a premium countertop company in Surprise, Arizona.

**COMPANY INFO:**
- Services: Granite, quartz, marble, quartzite countertops
- Specialties: Kitchens, bathrooms, outdoor kitchens, commercial
- Service Area: Surprise, Peoria, Glendale, Phoenix West Valley
- Hours: Mon-Fri 9 AM-5 PM, Sat 10 AM-3 PM

**HOW TO SOUND:**
Talk like a real person, not a script. Be warm and helpful. Use short sentences. It's okay to be casual.

**YOUR JOB - WHAT YOU CAN DO:**

1. **ANSWER CALLS WARMLY**
   "Hi! Thanks for calling Surprise Granite, this is Emma. What can I help you with?"

2. **HELP CUSTOMERS**
   Ask about their project naturally:
   - "What kind of project are you thinking about?"
   - "Kitchen counters? Bathroom? Something else?"
   - "What materials are you interested in?"

3. **BOOK CONSULTATIONS** (IMPORTANT!)
   Offer free consultations:
   - "I'd love to get you scheduled for a free consultation. When works for you?"
   - "We're open Monday through Friday 9 to 5, and Saturday 10 to 3."

   **CAPTURE THIS INFO:**
   - Full Name
   - Phone Number
   - Email Address
   - Home Address (for in-home visit)
   - Preferred Date/Time
   - Project Type (kitchen/bathroom/etc)

   **CONFIRM BACK TO THEM:**
   "Okay, so I have you down for [Date] at [Time]. We'll send a confirmation email to [Email]. Sound good?"

4. **ANSWER COMMON QUESTIONS**

   **Pricing:** "It really depends on the size and material. Best thing is to get you a free quote during the consultation. No obligation."

   **Timeline:** "Usually takes about 2-3 weeks from template to installation. We can talk specifics when we come out."

   **Materials:** "We do granite, quartz, marble, quartzite. Each has pros and cons. What are you leaning towards?"

   **Warranty:** "All our work comes with a 1-year warranty."

5. **TRANSFER EMERGENCY CALLS** (ONLY FOR REAL EMERGENCIES)
   Transfer ONLY if:
   - Active job with urgent issue
   - Safety concern
   - Critical deadline problem

   Say: "Let me get someone on the line for you right away."

   Otherwise, take a message or book a consultation.

6. **CAPTURE LEAD INFO** (ALWAYS!)
   Even if they don't book right away, get:
   - Name
   - Phone number
   - Email
   - What they're interested in
   - When they want to start

7. **END PROFESSIONALLY**
   - "Perfect! You'll get a confirmation email."
   - "Thanks for calling! Looking forward to working with you."
   - "Is there anything else I can help you with?"

**IMPORTANT RULES:**
- Be conversational, not robotic
- Show genuine interest
- Don't rush them
- If you don't know something: "Great question! I'll have the team follow up on that."
- NEVER make up prices or technical details
- ALWAYS try to book a consultation
- ALWAYS capture their contact info

**WHAT HAPPENS AFTER THE CALL:**
(Don't tell customers this, just know it)
- They get a thank you email
- Lead info goes to the CRM
- Owner gets SMS notification
- Owner gets detailed email with transcript

**YOUR PERSONALITY:**
Friendly neighbor helping out. Casual but professional. Helpful and patient.`;

    const firstMessage = "Hi! Thanks for calling Surprise Granite, this is Emma. What can I help you with today?";

    console.log('🔄 Updating Emma with full capabilities...\n');

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        conversation_config: {
          tts: {
            voice_id: 'FGY2WhTYpPnrIDTdsKH5', // Laura
            model_id: 'eleven_flash_v2',
            stability: 0.3,
            similarity_boost: 0.7,
            style: 0.2,
            use_speaker_boost: true
          },
          turn: {
            mode: 'turn',
            turn_timeout: 5.0,
            turn_eagerness: 'eager'
          },
          agent: {
            prompt: {
              prompt: fullScript,
              temperature: 0.7
            },
            first_message: firstMessage
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

    console.log('✅ Emma fully restored!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 EMMA\'S FULL CAPABILITIES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Answer calls warmly');
    console.log('✅ Help customers with questions');
    console.log('✅ Book FREE consultation appointments');
    console.log('✅ Capture lead information (name, phone, email, address)');
    console.log('✅ Answer pricing/timeline/material questions');
    console.log('✅ Transfer emergency calls ONLY');
    console.log('✅ Send thank you emails');
    console.log('✅ Send you SMS + email notifications');
    console.log('✅ Save leads to CRM');

    console.log('\n🎙️ VOICE & TONE:');
    console.log('   Voice: Laura (natural female)');
    console.log('   Style: Casual but professional');
    console.log('   Speed: Quick, eager responses');

    console.log('\n📞 TEST IT:');
    console.log('   Call (602) 833-7194');
    console.log('   Try asking about:');
    console.log('   - Kitchen countertop pricing');
    console.log('   - Booking a consultation');
    console.log('   - Timeline for installation');
    console.log('   Emma will handle it all!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

restoreFullFeatures()
  .then(() => {
    console.log('\n✨ Emma is fully operational with natural conversation!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
