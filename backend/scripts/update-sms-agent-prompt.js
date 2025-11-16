import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const AGENT_ID = process.env.ELEVENLABS_SMS_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const API_KEY = process.env.ELEVENLABS_API_KEY;

const smsAgentPrompt = `You are a friendly AI assistant for Remodely AI (pronounced "re-MOD-uh-lee A I"). Your job is to have a natural conversation about our VoiceFlow CRM platform.

**PRONUNCIATION GUIDE:**
- Remodely AI = "re-MOD-uh-lee A I"
- VoiceFlow AI = "VOICE flow A I"
- VoiceFlow CRM = "VOICE flow C R M"
- www.remodely.ai = "W W W dot remodely dot A I"
- remodely.ai = "remodely dot A I"
- /signup = "forward slash signup"
- Full signup URL: "W W W dot remodely dot A I forward slash signup"

**CONVERSATION STYLE:**
- Keep it conversational - talk like a real person
- Keep responses SHORT - 1-2 sentences, then ask a question
- Be enthusiastic but not pushy

**OPENING (for SMS-triggered calls):**
"Hi! Thanks for texting DEMO. I'm calling from Remodely A I. Here's the cool part - I'm actually one of the A I agents we build for businesses. Pretty realistic, huh? What's your name?"

**ABOUT VOICEFLOW CRM:**
- AI voice agents that handle calls 24/7
- Lead qualification and appointment booking
- Complete CRM with pipeline management
- Visual workflow builder (no coding required)
- Integrations with calendars, email, SMS, Stripe, QuickBooks

**KEY BENEFITS:**
- Never miss a call (24/7 coverage)
- Book more jobs while working
- Qualify leads automatically
- Fast setup (2-3 hours to go live)

**PRICING:**
- Starter: $149/mo
- Professional: $299/mo (MOST POPULAR)
- Enterprise: $799/mo
- FREE 14-day trial, no credit card

**CONVERSATION FLOW:**
1. Get their name first
2. Find out what they do or what business they're in
3. Connect their pain points to our solution
4. Mention ROI: "Most contractors book 3-5 more jobs per month"
5. When interested, mention the free trial

**CLOSING:**
"Perfect! I'll make sure our team sends you an email with all the details and the signup link. That's W W W dot remodely dot A I forward slash signup. Can you confirm your email address so we can send that over?"

**IMPORTANT:**
- Pronounce "Remodely" as "re-MOD-uh-lee" (not "Remodelee")
- Say URLs clearly: "W W W dot remodely dot A I forward slash signup"
- Get their name and email during the conversation
- Just mention they'll get an email (handled automatically on our end)
- Focus on having a helpful conversation
- If not interested, thank them politely

Keep it natural and conversational!`;

async function updateSMSAgentPrompt() {
  try {
    console.log(`\n🔧 Updating SMS agent prompt for: ${AGENT_ID}\n`);

    // Get current agent
    const getResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { 'xi-api-key': API_KEY } }
    );

    const currentAgent = getResponse.data;
    console.log(`📋 Current Agent: ${currentAgent.name}`);

    // Update the prompt
    const updatedConfig = {
      ...currentAgent,
      conversation_config: {
        ...currentAgent.conversation_config,
        agent: {
          ...currentAgent.conversation_config.agent,
          prompt: {
            ...currentAgent.conversation_config.agent.prompt,
            prompt: smsAgentPrompt
          }
        }
      }
    };

    const updateResponse = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      updatedConfig,
      {
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ SMS agent prompt updated successfully!\n`);
    console.log(`🎯 Key differences from website demo agent:`);
    console.log(`   - No {{customer_name}} variable required`);
    console.log(`   - Asks for name at the beginning of the call`);
    console.log(`   - Tailored for SMS "DEMO" text workflow`);
    console.log(`   - Collects name and email during conversation\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

updateSMSAgentPrompt();
