import fetch from 'node-fetch';

const SERVICE_AGENT_API_KEY = 'sk_b547726a6bfa9ed7a9d8d435467f45a7bd05d17c6be351f4';
const OLD_API_KEY = 'sk_d55908b75aa06d00ac2c0b1a09e12869990d554454e1cf36';

console.log('🔍 Testing ElevenLabs Service Agent API...\n');

async function testAPI(apiKey, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${label}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Test 1: Get user info
    console.log('📊 Test 1: Fetching user/subscription info...');
    const userRes = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey }
    });
    const userData = await userRes.json();

    if (userRes.ok) {
      console.log('✅ User Info:');
      console.log(`   Tier: ${userData.subscription?.tier || 'N/A'}`);
      console.log(`   Character Count: ${userData.subscription?.character_count || 0}`);
      console.log(`   Character Limit: ${userData.subscription?.character_limit || 0}`);
      console.log(`   Can use instant voice cloning: ${userData.subscription?.can_use_instant_voice_cloning || false}`);
    } else {
      console.log(`❌ User info failed: ${userData.detail || JSON.stringify(userData)}`);
      return;
    }

    // Test 2: List agents (Conversational AI)
    console.log('\n🤖 Test 2: Fetching conversational AI agents...');
    const agentsRes = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey }
    });
    const agentsData = await agentsRes.json();

    if (agentsRes.ok) {
      console.log(`✅ Found ${agentsData.agents?.length || 0} conversational AI agent(s):`);
      agentsData.agents?.forEach((agent, i) => {
        console.log(`   ${i + 1}. ${agent.name} (${agent.agent_id})`);
        console.log(`      Conversation Config: ${agent.conversation_config?.agent?.prompt?.prompt ? 'Configured' : 'Not configured'}`);
      });
    } else {
      console.log(`⚠️  Agents endpoint: ${agentsData.detail || JSON.stringify(agentsData)}`);
    }

    // Test 3: Check phone numbers
    console.log('\n📞 Test 3: Fetching phone numbers...');
    const phoneRes = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      headers: { 'xi-api-key': apiKey }
    });
    const phoneData = await phoneRes.json();

    if (phoneRes.ok) {
      console.log(`✅ Found ${phoneData.phone_numbers?.length || 0} phone number(s):`);
      phoneData.phone_numbers?.forEach((phone, i) => {
        console.log(`   ${i + 1}. ${phone.number} (${phone.phone_number_id})`);
        console.log(`      Agent ID: ${phone.agent_id || 'Not assigned'}`);
      });
    } else {
      console.log(`⚠️  Phone numbers: ${phoneData.detail || JSON.stringify(phoneData)}`);
    }

    // Test 4: Check available tools/actions (for SMS capability)
    console.log('\n🛠️  Test 4: Checking available tools/webhooks...');
    const toolsRes = await fetch('https://api.elevenlabs.io/v1/convai/conversation/tools', {
      headers: { 'xi-api-key': apiKey }
    });

    if (toolsRes.ok) {
      const toolsData = await toolsRes.json();
      console.log(`✅ Tools API accessible`);
      console.log(`   Available tools: ${JSON.stringify(toolsData, null, 2)}`);
    } else {
      console.log(`⚠️  Tools endpoint not accessible with this key`);
    }

    // Test 5: Check if we can create/update agents with webhook actions
    console.log('\n🔧 Test 5: Checking agent configuration capabilities...');
    console.log('   Service agent keys typically support:');
    console.log('   - Custom webhooks during conversations');
    console.log('   - Function calling / tool use');
    console.log('   - SMS/MMS sending via webhooks');
    console.log('   - Dynamic prompt injection');

  } catch (error) {
    console.error(`\n❌ Error testing API: ${error.message}`);
  }
}

async function runTests() {
  await testAPI(SERVICE_AGENT_API_KEY, 'NEW Service Agent API Key');
  await testAPI(OLD_API_KEY, 'OLD API Key');

  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log(`
For SMS integration with voice calls, you need:

1. ElevenLabs Conversational AI agent with webhook/tool support
2. Custom webhook that triggers Twilio SMS API
3. Agent configuration with "tools" or "actions"

Typical setup:
- Agent receives call
- During conversation, agent can call a webhook/function
- Webhook sends SMS via Twilio
- Agent continues conversation

Short code setup (88337):
- Register short code with Twilio
- Set SMS webhook to your server
- Server receives "Demo" text
- Server initiates ElevenLabs call via Twilio
- Call connects customer to demo agent
  `);
}

runTests();
