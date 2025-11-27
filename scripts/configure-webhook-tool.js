import axios from 'axios';
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const MARKETING_AGENT_ID = process.env.MARKETING_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://700838bc9740.ngrok-free.app';

async function configureWebhookTool() {
  try {
    console.log('🔧 Configuring Real-Time SMS Webhook Tool...\n');
    console.log(`Agent ID: ${MARKETING_AGENT_ID}`);
    console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

    // Get current config first
    const getResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${MARKETING_AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const currentConfig = getResponse.data;

    // Use server-side tool (webhook) instead of client tool
    const updatedConfig = {
      conversation_config: {
        ...currentConfig.conversation_config,
        agent: {
          ...currentConfig.conversation_config.agent,
          prompt: {
            ...currentConfig.conversation_config.agent.prompt,
            tool_ids: [],
            tools: [
              {
                type: "webhook",
                name: "send_signup_link",
                description: "Send the VoiceNow CRM signup link to the customer via SMS. Use this when customer asks 'can you text me the link' or 'send me that'.",
                webhook: {
                  url: `${WEBHOOK_URL}/api/webhooks/elevenlabs/send-signup-link`,
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: {
                    phone_number: "{{lead_phone}}",
                    customer_name: "{{customer_name}}"
                  }
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

    console.log('✅ Webhook tool configured!\n');
    console.log('📋 Configuration:');
    console.log('  • Type: webhook (server-side)');
    console.log('  • Name: send_signup_link');
    console.log('  • URL:', `${WEBHOOK_URL}/api/webhooks/elevenlabs/send-signup-link`);
    console.log('  • Will trigger during phone calls!\n');

  } catch (error) {
    console.error('❌ Failed to configure tool:');
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

configureWebhookTool();
