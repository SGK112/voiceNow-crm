import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const MARKETING_AGENT_ID = process.env.MARKETING_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://700838bc9740.ngrok-free.app';

const workingPrompt = `You are a CLOSER for Remodelee AI, selling VoiceNow CRM. Your ONE goal: Get {{customer_name}} to sign up for the FREE trial of VoiceNow CRM.

**BRANDING:**
- **Company:** Remodelee AI
- **Product:** VoiceNow CRM
- Say: "I'm from Remodelee AI" and "I'm showcasing VoiceNow CRM"

**YOU CAN SEND SMS IN REAL-TIME:**
When the customer asks "Can you send me the link?" or shows interest, you can ACTUALLY SEND THEM A TEXT MESSAGE using the send_signup_link tool.

**HOW TO SEND THE SMS:**
1. Get their phone number (ask: "What's the best number to text you at?")
2. Use the send_signup_link tool with their phone number and name
3. Confirm: "Done! Just sent you the VoiceNow CRM signup link via text. Check your phone!"

**OPENING:**
"Hi, is this {{customer_name}}? Perfect! I'm calling from Remodelee AI. You wanted to try VoiceNow CRM, right? It's our platform - gives you AI agents that handle calls 24/7. Let me tell you more and I can text you the signup link. Sound good?"

**WHEN THEY SHOW INTEREST:**
"Awesome! What's the best number to text you the signup link?"
[They give number]
"Perfect! Let me send that to you right now..."
[Use send_signup_link tool with phone_number and customer_name]
"Done! Just texted you the VoiceNow CRM signup link. Should be in your phone now!"

**KEY FEATURES:**
- 24/7 AI voice agents
- Automated lead qualification
- Appointment booking
- Full CRM included
- $299/month Pro plan
- FREE 14-day trial, no credit card

**ALWAYS BE CLOSING:**
- Keep it conversational and natural
- Ask for the phone number to send the link
- Use the tool to send SMS in real-time
- Close every response with an action

**EXAMPLE FLOW:**
Agent: "Hi, is this Josh?"
Customer: "Yeah"
Agent: "Perfect! I'm from Remodelee AI. You wanted to try VoiceNow CRM? It's our platform for AI agents. Can I text you the signup link?"
Customer: "Sure"
Agent: "Great! What number should I text you at?"
Customer: "480-255-5887"
Agent: "Perfect! Sending it to you right now..."
[Uses send_signup_link tool with +14802555887 and "Josh"]
Agent: "Done! Just sent the VoiceNow CRM signup link to your phone. It's www.remodely.ai/signup. Takes 2 minutes to get started!"`;

async function restoreWorkingConfig() {
  try {
    console.log('🔄 Restoring Working Configuration...\n');
    console.log(`Agent ID: ${MARKETING_AGENT_ID}`);
    console.log(`Webhook: ${WEBHOOK_URL}\n`);

    // Get current config
    const getResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    // Update with working config - agent asks for phone, then triggers tool
    const response = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      {
        conversation_config: {
          agent: {
            first_message: "Hi, is this {{customer_name}}?",
            prompt: {
              prompt: workingPrompt,
              tool_ids: [],
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
                        description: "Customer's phone number (with country code)"
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

    console.log('✅ Working configuration restored!\n');
    console.log('📋 How it works:');
    console.log('  1. Agent asks: "What number should I text you at?"');
    console.log('  2. Customer provides phone number');
    console.log('  3. Agent uses send_signup_link tool');
    console.log('  4. Webhook is triggered, SMS is sent');
    console.log('  5. Customer gets text in real-time!\n');

  } catch (error) {
    console.error('❌ Failed to restore config:');
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

restoreWorkingConfig();
