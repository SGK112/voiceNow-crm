import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import demoAgentTemplate from '../config/demoAgentTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const AGENT_ID = process.env.ELEVENLABS_DEMO_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://voiceflow-crm.onrender.com';

async function updateDemoAgentFeatures() {
  try {
    console.log(`\n🚀 Updating demo agent with advanced features...\n`);

    // Get the prompt from the template
    const improvedPrompt = demoAgentTemplate.generatePrompt();

    // Get current agent
    const getResponse = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { 'xi-api-key': API_KEY } }
    );

    const currentAgent = getResponse.data;
    console.log(`📋 Current Agent: ${currentAgent.name}`);

    // Update the agent with new prompt and webhook
    const updatedConfig = {
      ...currentAgent,
      conversation_config: {
        ...currentAgent.conversation_config,
        agent: {
          ...currentAgent.conversation_config.agent,
          prompt: {
            ...currentAgent.conversation_config.agent.prompt,
            prompt: improvedPrompt
          }
        }
      },
      // Ensure post-call webhook is configured
      webhooks: [
        {
          url: `${WEBHOOK_URL}/api/agent-webhooks/post-call-notification`,
          method: 'POST',
          event_type: 'call_ended'
        }
      ]
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

    console.log(`✅ Agent updated successfully!\n`);
    console.log(`🎯 NEW FEATURES ADDED TO PITCH:`);
    console.log(`   ✓ Batch calling - upload CSV, dial hundreds automatically`);
    console.log(`   ✓ Visual agent builder dashboard (no coding required)`);
    console.log(`   ✓ Custom agent creation for any use case`);
    console.log(`   ✓ Test agents before deploying live`);
    console.log(`   ✓ Email notifications after every call with transcripts`);
    console.log(`   ✓ SMS automation and follow-ups`);
    console.log(`   ✓ Upload client lists via CSV for campaigns`);
    console.log(`   ✓ Outbound sales, marketing, reminder calls`);
    console.log(`   ✓ Full CRM to manage leads and track progress\n`);

    console.log(`📞 UPDATED PITCH EXAMPLES:`);
    console.log(`   Contractors: "Upload your client list and our AI calls all of them"`);
    console.log(`   Sales Teams: "Upload leads and make outbound sales calls at scale"`);
    console.log(`   Real Estate: "Batch call all your leads for open house reminders"`);
    console.log(`   General: "Upload contacts for reminder calls, marketing campaigns"\n`);

    console.log(`🔔 Post-call notifications:`);
    console.log(`   ✓ Email sent to help.voicenowcrm@gmail.com after each call\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

updateDemoAgentFeatures();
