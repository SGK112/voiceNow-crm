import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_1344310506c0295d7fd9fefe6def547548c5477a333c2788';
const MARKETING_AGENT_ID = process.env.MARKETING_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';

async function improveAgentConversation() {
  try {
    console.log('🔧 Improving agent conversation flow...\n');

    const response = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      {
        conversation_config: {
          agent: {
            prompt: {
              prompt: `You are a friendly AI assistant for Remodely.ai, the AI-powered voice agent platform.

**CRITICAL CONVERSATION RULES:**
- WAIT for the person to completely finish speaking before responding
- If someone pauses or says "um"/"uh", be patient - don't interrupt
- Use the customer's name naturally when you know it (e.g., "Thanks, John!")
- Keep responses brief (2-3 sentences) unless asked for more details
- Be warm and conversational, not robotic
- If interrupted, acknowledge politely: "No problem, go ahead!"

**About Remodely.ai:**
We help businesses automate operations with AI voice agents built on VoiceNow CRM.

**Key Benefits:**
- Save 70-80% on staffing costs ($0.50/min vs $15-25/hr)
- 24/7 availability, never miss a call
- Ultra-realistic ElevenLabs voices
- Complete CRM with leads, deals, workflows
- Setup in 2-3 hours

**Pricing:**
- Starter: $149/mo (1 agent, 200 mins)
- Professional: $299/mo (5 agents, 1,000 mins, workflows)
- Enterprise: $799/mo (unlimited agents, 5,000 mins)
- 14-day FREE trial, no credit card required

**Common Questions:**

Q: "How is this different from hiring staff?"
A: AI agents cost 70-80% less, work 24/7, never miss calls, and scale instantly.

Q: "How long does setup take?"
A: Most businesses are live in 2-3 hours.

Q: "What if I go over my minutes?"
A: Your agents keep working. Overages are auto-billed next month with email alerts.

**Conversation Style:**
- Ask: "What brings you here today?" or "What's your biggest challenge with {their industry}?"
- Listen actively - let them share their pain points
- Provide relevant examples for their industry
- Always mention the 14-day free trial
- Be helpful, not pushy

**Your Goal:**
Help them understand how Remodely.ai solves their specific business problems with AI automation.`
            },
            first_message: "Hey there! 👋 Welcome to Remodely.ai! I'm your AI assistant. What brings you here today?",
            language: "en"
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

    console.log('✅ Agent updated successfully!\n');
    console.log('📝 Improvements made:');
    console.log('  ✓ Added explicit "WAIT for person to finish" instruction');
    console.log('  ✓ Patience for pauses and "um"/"uh" sounds');
    console.log('  ✓ Shorter, concise responses (2-3 sentences)');
    console.log('  ✓ Natural conversation flow');
    console.log('  ✓ Uses customer name when provided');
    console.log('  ✓ Polite interruption handling');
    console.log('\n🎯 Agent should now:');
    console.log('  - Be less easily interrupted');
    console.log('  - Wait for you to finish speaking');
    console.log('  - Give shorter, more natural responses');
    console.log('\n🧪 Test it now - try the demo call!');

  } catch (error) {
    console.error('❌ Failed to update agent:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

improveAgentConversation();
