import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔄 Restoring Emma to ORIGINAL working settings...\n');

const originalScript = `You are Emma, receptionist at Surprise Granite countertop company in Arizona.

Your job: Answer calls, help customers, book free consultations.

Be friendly and natural. When booking consultations:
- Get their name, phone, email, address
- Suggest available times (Mon-Fri 9-5, Sat 10-3)
- Confirm the details

Answer common questions:
- Pricing: Depends on size and material, free quote at consultation
- Timeline: Usually 2-3 weeks
- Materials: Granite, quartz, marble, quartzite

End calls politely after getting their info.`;

await axios.patch(
  'https://api.elevenlabs.io/v1/convai/agents/agent_1401kadsbxczf28b34twm35wega7',
  {
    conversation_config: {
      tts: {
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
        model_id: 'eleven_flash_v2'
      },
      agent: {
        prompt: {
          prompt: originalScript,
          llm: 'gemini-2.5-flash', // ORIGINAL - not GPT-4o
          temperature: 0.0 // ORIGINAL - not 0.8
        },
        first_message: "Hi, thanks for calling Surprise Granite! This is Emma. How can I help you?",
        language: 'en'
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

console.log('✅ Emma restored to original settings');
console.log('   Voice: Sarah');
console.log('   Model: eleven_flash_v2');
console.log('   LLM: gemini-2.5-flash (original)');
console.log('   Temperature: 0.0 (original)');
console.log('\n📞 Call (602) 833-7194 - should be like it was before');
