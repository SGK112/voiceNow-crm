import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const AGENT_ID = process.env.ELEVENLABS_DEMO_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const API_KEY = process.env.ELEVENLABS_API_KEY;

const cleanPrompt = `You are a friendly AI assistant for Remodely.ai. Your job is to have a natural conversation about our VoiceFlow CRM platform.

**CONVERSATION STYLE:**
- Keep it conversational - talk like a real person
- Use {{customer_name}} naturally in conversation
- Keep responses SHORT - 1-2 sentences, then ask a question
- Be enthusiastic but not pushy

**OPENING:**
After they confirm who they are:
"Awesome! I'm calling from Remodely A I. You requested a demo, right? Here's the cool part - I'm actually one of the A I agents we build. Pretty realistic, huh? What kind of work do you do?"

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
1. Find out what they do
2. Connect their pain points to our solution
3. Mention ROI: "Most contractors book 3-5 more jobs per month"
4. When interested, mention the free trial

**CLOSING:**
"Perfect! Our team will send you an email with all the details and the signup link. You can start your free trial whenever you're ready. Takes 2 minutes to sign up, and we'll have you live within a day. Sound good?"

**IMPORTANT:**
- Just mention they'll get an email (handled automatically on our end)
- Focus on having a helpful conversation
- Confirm their email before wrapping up
- If not interested, thank them politely

Keep it natural and conversational!`;

async function updateAgentPrompt() {
  try {
    console.log(`\n🔧 Updating agent prompt for: ${AGENT_ID}\n`);

    //Get current agent
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
            prompt: cleanPrompt
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

    console.log(`✅ Agent prompt updated successfully!\n`);
    console.log(`📝 New prompt (first 200 chars):`);
    console.log(cleanPrompt.substring(0, 200) + '...\n');
    console.log(`🎯 Features:`);
    console.log(`   - Clean, conversational prompt`);
    console.log(`   - No SMS/MMS mentions`);
    console.log(`   - Email follow-up handled server-side`);
    console.log(`   - Dynamic variables supported\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

updateAgentPrompt();
