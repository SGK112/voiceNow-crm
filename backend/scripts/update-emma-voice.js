import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_1401kadsbxczf28b34twm35wega7';

async function updateEmmaVoice() {
  console.log('🎙️ Updating Emma with better voice and natural flow...\n');

  try {
    // Try Laura - often reported as more natural for conversations
    const VOICE_OPTIONS = [
      { name: 'Laura', id: 'FGY2WhTYpPnrIDTdsKH5' },
      { name: 'River', id: 'SAz9YHcvj6GT2YYXdXww' },
      { name: 'Jessica', id: 'cgSgspJ2msm6clMCkdW9' }
    ];

    const selectedVoice = VOICE_OPTIONS[0]; // Laura

    // Updated script with more natural conversational flow
    const naturalScript = `You are Emma, the friendly receptionist at Surprise Granite in Arizona. You help customers with countertop projects.

**HOW TO TALK:**
- Be casual and warm, like a real receptionist
- Use short sentences
- Don't sound like you're reading a script
- Let the conversation flow naturally
- It's okay to say "um" or "let me check" occasionally

**GREETING:**
"Hi! Thanks for calling Surprise Granite, this is Emma. How can I help you?"

**WHEN THEY ASK ABOUT PROJECTS:**
Just ask casually:
- "What kind of project are you thinking about?"
- "Kitchen? Bathroom? Something else?"
- "What materials are you interested in?"

Keep it simple. Don't info-dump.

**BOOKING CONSULTATIONS:**
"I'd love to get you scheduled for a free consultation. When works best for you?"

Get their:
- Name
- Phone number
- Email
- When they want to meet

**COMMON QUESTIONS:**

Pricing: "Pricing really depends on the size and material. We can give you an exact quote when we come out. The consultation is totally free."

Timeline: "Usually about 2-3 weeks from start to finish. But we can talk about your specific timeline."

Materials: "We do granite, quartz, marble - all the good stuff. Each one has its pros and cons. What are you leaning towards?"

**IF THEY'RE UPSET OR URGENT:**
"Let me get someone on the line for you right away." Then transfer.

**ENDING CALLS:**
"Perfect! You'll get a confirmation email. Looking forward to working with you!"

**IMPORTANT:**
- Don't be robotic
- Don't use overly formal language
- Be helpful but casual
- If you don't know something, just say "Let me have the team follow up on that"
- Keep it conversational, not scripted

**TONE:** Friendly neighbor helping out, not corporate robot.`;

    const firstMessage = "Hi! Thanks for calling Surprise Granite, this is Emma. What can I help you with today?";

    console.log(`🔄 Updating to ${selectedVoice.name} voice with natural flow...\n`);

    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        conversation_config: {
          tts: {
            voice_id: selectedVoice.id,
            model_id: 'eleven_flash_v2',
            stability: 0.3, // Lower for more variation (more natural)
            similarity_boost: 0.7,
            style: 0.2, // Add some style variation
            use_speaker_boost: true
          },
          turn: {
            mode: 'turn',
            turn_timeout: 5.0, // Shorter timeout for snappier responses
            turn_eagerness: 'eager' // Respond quicker (more natural)
          },
          agent: {
            prompt: {
              prompt: naturalScript,
              temperature: 0.7 // Higher temperature for more natural variation
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

    console.log('✅ Emma updated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NEW CONFIGURATION:');
    console.log(`   Voice: ${selectedVoice.name}`);
    console.log('   Style: More natural and conversational');
    console.log('   Response: Quicker, more eager');
    console.log('   Tone: Casual and friendly (not corporate)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 IMPROVEMENTS:');
    console.log('   ✅ Shorter, more natural sentences');
    console.log('   ✅ Less formal language');
    console.log('   ✅ Quicker response time');
    console.log('   ✅ More conversational variation');
    console.log('   ✅ Sounds less robotic');

    console.log('\n📞 TEST IT NOW:');
    console.log('   Call (602) 833-7194');
    console.log('   Emma should sound much more natural!');

    console.log('\n🎯 TIP:');
    console.log('   Try different voices if Laura doesn\'t sound great:');
    VOICE_OPTIONS.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name} (${v.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

updateEmmaVoice()
  .then(() => {
    console.log('\n✨ Update complete! Call and test it out!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
