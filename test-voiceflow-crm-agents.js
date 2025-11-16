import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// VoiceFlow CRM specific agents from the API list
const voiceflowAgents = [
  { name: 'VoiceFlow CRM - Lead Generation Agent', id: 'agent_1001k9h9ms30fe7ay0w462av0y9v' },
  { name: 'VoiceFlow CRM - Booking Agent', id: 'agent_8801k9h9mv3zempsy3aa5njzwst3' },
  { name: 'VoiceFlow CRM - Collections Agent', id: 'agent_2101k9h9mwedez1rf2e182pdvnsq' },
  { name: 'VoiceFlow CRM - Promotions Agent', id: 'agent_1801k9h9mxmveytv8a0psq4z756y' },
  { name: 'VoiceFlow CRM - Support Agent', id: 'agent_6001k9h9myv9f3w8322g06wf8b1e' },
  { name: 'Remodely.ai Marketing Assistant', id: 'agent_9701k9xptd0kfr383djx5zk7300x' },
  { name: 'VoiceFlow Demo - Natural Voice', id: 'agent_8101ka4wyweke1s9np3je7npewrr' },
  { name: 'VoiceFlow CRM Demo Agent', id: 'agent_0901ka4va58zfqd8b59xpnh57fb5' }
];

async function testAgent(agentName, agentId) {
  console.log('\n' + '━'.repeat(80));
  console.log(`🤖 ${agentName}`);
  console.log(`📋 ID: ${agentId}`);
  console.log('━'.repeat(80));

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

    console.log('✅ Status: WORKING\n');
    console.log(`📝 Actual Name: ${agent.name || 'N/A'}`);
    console.log(`🗣️  First Message:`);
    console.log(`   "${agent.conversation_config?.agent?.first_message || 'N/A'}"\n`);
    console.log(`🌍 Language: ${agent.conversation_config?.agent?.language || 'N/A'}`);
    console.log(`🎤 Voice ID: ${agent.conversation_config?.tts?.voice_id || 'N/A'}`);

    // Check for tools/webhooks
    const tools = agent.conversation_config?.agent?.tools || [];
    console.log(`🛠️  Tools: ${tools.length > 0 ? tools.length + ' configured' : 'None'}`);

    // Check prompt
    const prompt = agent.conversation_config?.agent?.prompt?.prompt || '';
    console.log(`📄 Prompt: ${prompt.length} characters`);

    if (prompt.length > 0) {
      // Extract key info from prompt
      const hasLeadGen = prompt.toLowerCase().includes('lead') || prompt.toLowerCase().includes('qualify');
      const hasBooking = prompt.toLowerCase().includes('book') || prompt.toLowerCase().includes('appointment');
      const hasCollections = prompt.toLowerCase().includes('collect') || prompt.toLowerCase().includes('payment');
      const hasSupport = prompt.toLowerCase().includes('support') || prompt.toLowerCase().includes('help');

      console.log(`🎯 Purpose:`);
      if (hasLeadGen) console.log(`   - Lead Generation/Qualification`);
      if (hasBooking) console.log(`   - Appointment Booking`);
      if (hasCollections) console.log(`   - Collections/Payments`);
      if (hasSupport) console.log(`   - Customer Support`);
    }

    // Check for dynamic variables
    const allText = prompt + (agent.conversation_config?.agent?.first_message || '');
    const variables = allText.match(/\{\{[^}]+\}\}/g);
    if (variables) {
      console.log(`\n🔄 Dynamic Variables: ${[...new Set(variables)].join(', ')}`);
    }

    return { name: agentName, id: agentId, status: 'working' };

  } catch (error) {
    console.error(`❌ Status: FAILED`);
    console.error(`Error: ${error.response?.status || error.message}\n`);
    return { name: agentName, id: agentId, status: 'error' };
  }
}

async function testAllAgents() {
  console.log('\n🚀 VoiceFlow CRM - Demo Agent Test Report');
  console.log('='.repeat(80));
  console.log(`Testing ${voiceflowAgents.length} agents...\n`);

  const results = [];

  for (const agent of voiceflowAgents) {
    const result = await testAgent(agent.name, agent.id);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));

  const working = results.filter(r => r.status === 'working');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n✅ Working: ${working.length}/${results.length}`);
  console.log(`❌ Failed: ${errors.length}/${results.length}\n`);

  if (working.length > 0) {
    console.log('Working Demo Agents:');
    working.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   ID: ${r.id}\n`);
    });
  }

  console.log('\n💡 To update your .env file with working agent IDs:');
  working.forEach(r => {
    const envVar = r.name
      .toUpperCase()
      .replace(/VOICEFLOW CRM - /g, '')
      .replace(/REMODELY\.AI /g, '')
      .replace(/ AGENT/g, '')
      .replace(/ /g, '_');
    console.log(`ELEVENLABS_${envVar}_AGENT_ID=${r.id}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

testAllAgents();
