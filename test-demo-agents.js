import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Key demo agents to test
const demoAgents = [
  { name: 'Marketing Demo Agent', id: process.env.ELEVENLABS_DEMO_AGENT_ID },
  { name: 'Lead Generation Agent', id: process.env.ELEVENLABS_LEAD_GEN_AGENT_ID },
  { name: 'Booking Agent', id: process.env.ELEVENLABS_BOOKING_AGENT_ID },
  { name: 'Collections Agent', id: process.env.ELEVENLABS_COLLECTIONS_AGENT_ID },
  { name: 'Promotions Agent', id: process.env.ELEVENLABS_PROMO_AGENT_ID },
  { name: 'Support Agent', id: process.env.ELEVENLABS_SUPPORT_AGENT_ID }
];

async function testAgent(agentName, agentId) {
  console.log('\n' + '='.repeat(80));
  console.log(`🤖 Testing: ${agentName}`);
  console.log(`📋 Agent ID: ${agentId}`);
  console.log('='.repeat(80));

  if (!agentId) {
    console.log('❌ Agent ID not found in environment variables');
    return;
  }

  try {
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const agent = response.data;

    console.log('\n✅ Agent found!');
    console.log(`\n📝 Name: ${agent.name || 'N/A'}`);
    console.log(`🗣️  First Message: ${agent.conversation_config?.agent?.first_message || 'N/A'}`);
    console.log(`🌍 Language: ${agent.conversation_config?.agent?.language || 'N/A'}`);
    console.log(`🎤 Voice ID: ${agent.conversation_config?.tts?.voice_id || 'N/A'}`);
    console.log(`🔧 TTS Model: ${agent.conversation_config?.tts?.model || 'N/A'}`);

    // Check for tools/webhooks
    const tools = agent.conversation_config?.agent?.tools || [];
    console.log(`\n🛠️  Tools: ${tools.length > 0 ? tools.length + ' configured' : 'None configured'}`);
    if (tools.length > 0) {
      tools.forEach((tool, i) => {
        console.log(`   ${i + 1}. ${tool.name || 'Unnamed tool'} (${tool.type || 'unknown type'})`);
      });
    }

    // Check prompt
    const prompt = agent.conversation_config?.agent?.prompt?.prompt || '';
    console.log(`\n📄 Prompt Length: ${prompt.length} characters`);
    if (prompt.length > 0) {
      console.log(`📄 Prompt Preview: ${prompt.substring(0, 200)}...`);
    }

    // Check for dynamic variables
    const variables = (prompt + (agent.conversation_config?.agent?.first_message || '')).match(/\{\{[^}]+\}\}/g);
    if (variables) {
      console.log(`\n🔄 Dynamic Variables Found: ${[...new Set(variables)].join(', ')}`);
    }

    return {
      name: agentName,
      id: agentId,
      status: 'working',
      details: agent
    };

  } catch (error) {
    console.error(`\n❌ Error testing agent:`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${error.response.data?.detail || JSON.stringify(error.response.data)}`);
    } else {
      console.error(`Message: ${error.message}`);
    }

    return {
      name: agentName,
      id: agentId,
      status: 'error',
      error: error.message
    };
  }
}

async function testAllDemoAgents() {
  console.log('\n🚀 VoiceFlow CRM - Demo Agent Testing Suite');
  console.log('='.repeat(80));
  console.log(`Testing ${demoAgents.length} demo agents...`);

  const results = [];

  for (const agent of demoAgents) {
    const result = await testAgent(agent.name, agent.id);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const working = results.filter(r => r.status === 'working');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n✅ Working Agents: ${working.length}/${results.length}`);
  working.forEach(r => {
    console.log(`   - ${r.name}`);
  });

  if (errors.length > 0) {
    console.log(`\n❌ Failed Agents: ${errors.length}/${results.length}`);
    errors.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('Testing complete!');
  console.log('='.repeat(80) + '\n');
}

testAllDemoAgents();
