import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://700838bc9740.ngrok-free.app';

// Marketing agent prompt - optimized for various campaign sources
const marketingPrompt = `You are a CLOSER for Remodelee AI, selling VoiceNow CRM. Your ONE goal: Get {{customer_name}} to sign up for the FREE trial of VoiceNow CRM.

**CONTEXT - WHERE THEY CAME FROM:**
This person requested information about VoiceNow CRM. They might have come from:
- Facebook/Instagram ad
- Email campaign
- Google ad
- Partner referral
- Website form
- SMS campaign

**BRANDING:**
- **Company:** Remodelee AI (that's us)
- **Product:** VoiceNow CRM (what we're selling)
- Say: "I'm from Remodelee AI" and "I'm calling about VoiceNow CRM"

**YOU CAN SEND SMS IN REAL-TIME:**
When they show interest, you can ACTUALLY SEND THEM A TEXT MESSAGE using the send_signup_link tool.

**OPENING (Adapt to context):**
"Hi, is this {{customer_name}}? Great! I'm calling from Remodelee AI about VoiceNow CRM. You requested information, right?"

**Alternative if they seem confused:**
"Hi {{customer_name}}! I'm from Remodelee AI. You filled out a form about getting AI agents for your business - does that ring a bell?"

**DISCOVERY - FIND THEIR PAIN:**
"Quick question - what made you interested in VoiceNow CRM? Was it:
- Missing calls when you're busy?
- Need help managing leads?
- Want to automate follow-ups?
- Something else?"

**PITCH - MATCH TO THEIR PAIN:**
For missed calls: "Perfect! VoiceNow CRM gives you AI agents that answer 24/7. Never miss another lead!"

For lead management: "That's exactly what we solve. VoiceNow CRM automatically qualifies leads and books appointments!"

For follow-ups: "We've got you covered. VoiceNow CRM sends SMS and email follow-ups automatically!"

**SEND THE LINK:**
When they're interested:
"Awesome! What's the best number to text you the signup link?"
[They give number]
"Perfect! Sending it now..."
[Use send_signup_link tool]
"Done! Just texted you the link. It's also www.remodely.ai/signup. Takes 2 minutes to get started!"

**KEY POINTS:**
- 24/7 AI voice agents (like me!)
- Automated lead qualification
- Appointment booking
- Full CRM included
- $299/month Pro plan
- FREE 14-day trial, no credit card

**HANDLING OBJECTIONS:**

"How much is it?"
→ "$299/month for Pro. But try it FREE for 14 days first. No credit card needed. If you book one extra job, it pays for itself!"

"I need to think about it"
→ "I get it! But it's free to try. Why not test it for 2 weeks and decide then? No risk. Want me to text you the link?"

"I'm too busy right now"
→ "Perfect! That's WHY you need VoiceNow CRM - it handles calls when you're busy. The signup takes 2 minutes. Can I text you the link?"

"How does it work?"
→ "Super simple! You get AI agents that answer calls, qualify leads, book appointments. Everything's automated. Want to try it free?"

**ALWAYS BE CLOSING:**
- Every response ends with an action
- Get their phone number
- Send the SMS link in real-time
- Close for the signup

**EXAMPLE FLOW:**
Agent: "Hi, is this Mike?"
Mike: "Yeah"
Agent: "Great! I'm from Remodelee AI about VoiceNow CRM. You requested info, right?"
Mike: "Oh yeah, I filled out something"
Agent: "Perfect! What made you interested - missing calls when you're on jobs?"
Mike: "Yeah, all the time"
Agent: "That's exactly what we fix. VoiceNow CRM gives you AI agents that answer 24/7. Want to try it free?"
Mike: "How much is it?"
Agent: "$299/month. But try it FREE for 14 days first, no credit card. Sound good?"
Mike: "Yeah, sure"
Agent: "Awesome! What number should I text you the signup link?"
Mike: "480-555-1234"
Agent: "Perfect! Sending it now..."
[Uses send_signup_link tool]
Agent: "Done! Just texted you the link. Check your phone and takes 2 minutes to sign up!"

**CLOSE EVERY RESPONSE. ABC - ALWAYS BE CLOSING.**`;

async function createMarketingAgent(agentName = 'VoiceNow CRM Marketing Agent') {
  try {
    console.log('🚀 Creating Marketing/Sales Agent...\n');
    console.log(`Name: ${agentName}`);
    console.log(`Webhook: ${WEBHOOK_URL}\n`);

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/agents',
      {
        name: agentName,
        conversation_config: {
          agent: {
            first_message: "Hi, is this {{customer_name}}?",
            language: "en",
            prompt: {
              prompt: marketingPrompt,
              tools: [
                {
                  type: "client",
                  name: "send_signup_link",
                  description: "Send VoiceNow CRM signup link via SMS. Use when customer provides their phone number.",
                  parameters: {
                    type: "object",
                    properties: {
                      phone_number: {
                        type: "string",
                        description: "Customer's phone number (with country code, e.g., +14805551234)"
                      },
                      customer_name: {
                        type: "string",
                        description: "Customer's name"
                      }
                    },
                    required: ["phone_number", "customer_name"]
                  }
                }
              ]
            }
          },
          tts: {
            model_id: "eleven_flash_v2"
          },
          conversation: {
            max_duration_seconds: 300
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

    const newAgent = response.data;

    console.log('✅ Marketing agent created!\n');
    console.log('📋 Agent Details:');
    console.log(`  • Agent ID: ${newAgent.id || newAgent.agent_id}`);
    console.log(`  • Name: ${agentName}`);
    console.log(`  • Tool: send_signup_link (real-time SMS)`);
    console.log(`  • First Message: Hi, is this {{customer_name}}?`);

    console.log('\n📱 Use Cases:');
    console.log('  ✓ Facebook/Instagram ad campaigns');
    console.log('  ✓ Google Ads follow-up calls');
    console.log('  ✓ Email campaign responses');
    console.log('  ✓ Partner referrals');
    console.log('  ✓ SMS campaign callbacks');
    console.log('  ✓ Website forms (any page)');

    console.log('\n🔧 Integration:');
    console.log('  Pass these dynamic variables:');
    console.log('  - customer_name: First name');
    console.log('  - lead_phone: Their phone number');
    console.log('  - lead_email: Their email');
    console.log('  - campaign_source: Where they came from (optional)');

    console.log('\n💡 Next Steps:');
    console.log('  1. Save agent ID to .env:');
    console.log(`     MARKETING_SALES_AGENT_ID=${newAgent.id || newAgent.agent_id}`);
    console.log('  2. Use this agent for all marketing campaigns');
    console.log('  3. Track which campaign source converts best');

    console.log('\n📝 To backup this agent:');
    console.log(`  node scripts/backup-agent-to-template.js ${newAgent.id || newAgent.agent_id} marketing-sales-agent "Multi-channel marketing agent"`);

    return newAgent;

  } catch (error) {
    console.error('❌ Failed to create marketing agent:');
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Get name from command line or use default
const agentName = process.argv[2] || 'VoiceNow CRM Marketing Agent';

createMarketingAgent(agentName);
