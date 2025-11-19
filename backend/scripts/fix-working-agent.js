import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AGENT_ID = 'agent_4401kacmh26fet9asap21g1516p5';
const PHONE_ID = 'phnum_2701kacmjq23fzaacdgqwt0qty0b';
const WEBHOOK_URL = 'https://f66af302a875.ngrok-free.app/api/webhooks/call-completed';

console.log('🔧 Fixing the working agent with specific improvements...\n');

// Get current config
const current = await axios.get(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
  { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
);

const currentPrompt = current.data.conversation_config?.agent?.prompt?.prompt || '';

// Enhanced prompt with email pronunciation fix and calendar invite mention
const improvedPrompt = currentPrompt + `

**IMPORTANT PRONUNCIATION:**
- When saying email addresses, spell them out slowly: "i-n-f-o at s-u-r-p-r-i-s-e-g-r-a-n-i-t-e dot com"

**CALENDAR INVITES:**
- After booking a consultation, tell them: "I'll send you a calendar invite to info@surprisegranite.com with all the details"

**ENDING CALLS:**
- When you have all the information needed, politely end: "Thanks for calling! We'll see you at your consultation. Have a great day!"
- After ending pleasantries, STOP TALKING to allow natural call end`;

// Update agent with fixes
await axios.patch(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
  {
    conversation_config: {
      tts: {
        voice_id: 'cgSgspJ2msm6clMCkdW9', // Keep Jessica
        model_id: 'eleven_turbo_v2' // Keep working model
      },
      agent: {
        prompt: {
          prompt: improvedPrompt,
          llm: current.data.conversation_config?.agent?.prompt?.llm || 'gemini-2.5-flash',
          temperature: current.data.conversation_config?.agent?.prompt?.temperature || 0.5
        },
        first_message: current.data.conversation_config?.agent?.first_message,
        language: 'en'
      },
      turn: {
        turn_timeout: 20, // End turn after 20s silence
        mode: 'turn_based'
      }
    }
  },
  {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);

console.log('✅ Agent updated with fixes');

// CRITICAL: Re-assign to phone (gets cleared on update)
await axios.patch(
  `https://api.elevenlabs.io/v1/convai/phone-numbers/${PHONE_ID}`,
  {
    agent_id: AGENT_ID,
    webhook_url: WEBHOOK_URL
  },
  {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    }
  }
);

console.log('✅ Phone number re-assigned with webhook');
console.log('\n📋 Fixes applied:');
console.log('   ✓ Email pronunciation guidance');
console.log('   ✓ Calendar invite mention');
console.log('   ✓ Call ending instructions');
console.log('   ✓ Turn timeout for natural hangup');
console.log('   ✓ Webhook re-configured on phone');
console.log('\n📞 Test: Call (602) 833-7194');
