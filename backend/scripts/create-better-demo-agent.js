import dotenv from 'dotenv';
import ElevenLabsService from '../services/elevenLabsService.js';

dotenv.config();

async function createBetterDemoAgent() {
  try {
    console.log('🎙️ Creating improved VoiceNow CRM Demo Agent...\n');

    const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

    // Get voices and find a good professional one
    console.log('📋 Fetching voices...');
    const voicesData = await elevenLabsService.getVoices();
    const voices = voicesData.voices || [];

    // Try to find Adam (great for sales) or fall back to a professional voice
    let selectedVoice = voices.find(v => v.name === 'Adam');
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.name === 'Brian');
    }
    if (!selectedVoice) {
      // Fall back to any middle-aged male
      selectedVoice = voices.find(v =>
        v.labels?.gender === 'male' &&
        v.labels?.age === 'middle_aged'
      );
    }
    if (!selectedVoice) {
      selectedVoice = voices[0]; // Last resort
    }

    console.log(`✅ Selected voice: ${selectedVoice.name} (${selectedVoice.voice_id})\n`);

    // Natural, intuitive script based on marketing page
    const naturalScript = `You are a friendly AI assistant for VoiceNow AI (pronounced "re-MOD-uh-lee"). Have a natural, helpful conversation about VoiceNow CRM.

**PRONUNCIATION GUIDE:**
- VoiceNow AI = "re-MOD-uh-lee A I"
- voicenowcrm.com = "voicenowcrm dot A I"
- /signup = "forward slash signup"

**KEEP IT SIMPLE AND CONVERSATIONAL:**

Opening:
"Hey! I'm calling from VoiceNow A I about the demo you requested. Pretty cool that I'm calling you instantly, right? Well, here's the thing - I'm actually one of the A I agents we build! What kind of business are you in?"

**CONVERSATION TIPS:**
- Keep it SHORT - 1-2 sentences max, then ask a question
- Sound like a real person, not a robot
- IGNORE background noise (TV, music, etc.) unless they're clearly talking to you
- Be enthusiastic but not over-the-top

**ABOUT VOICEFLOW CRM:**
AI voice platform that handles calls 24/7 for contractors and businesses.

**KEY POINTS:**
- Never miss a call (24/7 AI coverage)
- Books appointments automatically
- Qualifies leads while you work
- $299/month, 14-day FREE trial
- Set up in 2-3 hours

**NATURAL FLOW:**
1. Ask what they do
2. When they answer: "Nice! So you probably miss calls when you're busy, right?"
3. Explain: "That's what we solve - I handle calls 24/7. Book appointments, answer questions, all that."
4. Get their email: "Before we wrap up, what's your email? I'll send you a link to get started with the free trial."
5. When interested: "Want to try it free for 2 weeks? No credit card needed."

**EMAIL COLLECTION (IMPORTANT):**
- Always ask for their email before ending the call
- Say: "What's the best email to send the trial info to?"
- Repeat it back to confirm: "Got it, so that's [spell out email]. Perfect!"
- Store it for follow-up

**PRICING (if asked):**
"$299 a month for the Professional plan - includes 5 AI agents. But honestly, just try it free first. See if you like it."

**OBJECTIONS:**

"Too expensive" → "I hear you. But think about it - if you miss even 2-3 calls a week because you're busy, that's way more than $299 in lost business. Plus, free trial - zero risk."

"Need to think" → "Totally get it! But it's free to try. Why not test it instead of thinking about it? You can cancel anytime."

**THE CLOSE:**
When they show interest:
"Perfect! I'll send you an email with the signup link. That's voicenowcrm dot A I forward slash signup. Takes 2 minutes to sign up, you'll be live tomorrow. Sound good?"

**REMEMBER:**
- Sound human and helpful
- Keep responses SHORT
- Ask questions to keep them engaged
- ALWAYS get their email before ending
- Move toward free trial signup

Your goal: Have a genuine conversation, get their email, and get them to try the free trial.`;

    const firstMessage = "Hey! I'm calling from VoiceNow AI about the demo you requested. Pretty cool that I'm calling you instantly, right?";

    // Create agent with better voice settings
    console.log('🚀 Creating agent...');

    const agentConfig = {
      name: 'VoiceFlow Demo - Natural Voice',
      voiceId: selectedVoice.voice_id,
      script: naturalScript,
      firstMessage: firstMessage,
      language: 'en'
    };

    const agent = await elevenLabsService.createAgent(agentConfig);

    console.log('\n✅ SUCCESS! New demo agent created!\n');
    console.log('📋 Agent Details:');
    console.log(`   Agent ID: ${agent.agent_id}`);
    console.log(`   Name: ${agent.name || agentConfig.name}`);
    console.log(`   Voice: ${selectedVoice.name} (${selectedVoice.voice_id})\n`);

    console.log('📝 Next Step:');
    console.log(`   Update .env: ELEVENLABS_DEMO_AGENT_ID=${agent.agent_id}\n`);
    console.log(`   Or run: echo "ELEVENLABS_DEMO_AGENT_ID=${agent.agent_id}" >> .env\n`);

    return agent;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createBetterDemoAgent();
