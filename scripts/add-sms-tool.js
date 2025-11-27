import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const MARKETING_AGENT_ID = process.env.MARKETING_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://700838bc9740.ngrok-free.app';

async function addSMSTool() {
  try {
    console.log('🔧 Adding SMS tool to agent...\n');
    console.log(`Agent ID: ${MARKETING_AGENT_ID}`);
    console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

    // First get the current agent config
    const getResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const currentConfig = getResponse.data;

    // Update with tool in the prompt.tools array (this is what works for phone calls)
    const updatedConfig = {
      conversation_config: {
        ...currentConfig.conversation_config,
        agent: {
          ...currentConfig.conversation_config.agent,
          prompt: {
            ...currentConfig.conversation_config.agent.prompt,
            tool_ids: [], // Clear any existing tool_ids
            tools: [
              {
                type: "client",
                name: "send_signup_link",
                description: "Send the VoiceNow CRM signup link via SMS text message. Use this when customer asks 'can you text me the link' or 'send me that' or shows high interest.",
                parameters: {
                  type: "object",
                  properties: {
                    phone_number: {
                      type: "string",
                      description: "The customer's phone number"
                    },
                    customer_name: {
                      type: "string",
                      description: "The customer's name"
                    }
                  },
                  required: ["phone_number"]
                }
              }
            ]
          }
        }
      }
    };

    const response = await axios.patch(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      updatedConfig,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SMS tool added successfully!\n');
    console.log('📋 Tool Configuration:');
    console.log('  • Type: client');
    console.log('  • Name: send_signup_link');
    console.log('  • Triggers: When customer asks for link via text');
    console.log('\n💡 The webhook handler will catch tool calls during phone calls');
    console.log(`   Webhook: ${WEBHOOK_URL}/api/webhooks/elevenlabs/conversation-event`);

  } catch (error) {
    console.error('\n❌ Failed to add tool:');
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

addSMSTool();
