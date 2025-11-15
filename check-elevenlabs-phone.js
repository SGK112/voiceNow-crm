import fetch from 'node-fetch';

const API_KEY = 'sk_d55908b75aa06d00ac2c0b1a09e12869990d554454e1cf36';

console.log('🔍 Checking ElevenLabs Phone Numbers...\n');

async function checkPhoneNumbers() {
  try {
    console.log('📞 Fetching phone numbers from ElevenLabs API...');
    const response = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      headers: {
        'xi-api-key': API_KEY
      }
    });

    const data = await response.json();

    console.log('\n📋 Response Status:', response.status);
    console.log('📋 Full Response:', JSON.stringify(data, null, 2));

    if (data.phone_numbers && data.phone_numbers.length > 0) {
      console.log('\n✅ Found phone numbers:');
      data.phone_numbers.forEach((phone, i) => {
        console.log(`\n${i + 1}. Phone: ${phone.number || 'N/A'}`);
        console.log(`   ID: ${phone.phone_number_id}`);
        console.log(`   Agent: ${phone.agent_id || 'Not assigned'}`);
        console.log(`   Provider: ${phone.provider || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No phone numbers found');
      console.log('This could mean:');
      console.log('1. No phone numbers are configured in this ElevenLabs account');
      console.log('2. The API key doesn\'t have access to phone numbers');
      console.log('3. Phone numbers are in a different workspace');

      console.log('\n📝 To add phone numbers:');
      console.log('1. Go to https://elevenlabs.io/app/conversational-ai/phone-numbers');
      console.log('2. Click "Add Phone Number"');
      console.log('3. Connect your Twilio account');
      console.log('4. Import phone number +16028334780');
    }

    // Also try to get agents to verify API key works
    console.log('\n\n🤖 Checking agents (to verify API key)...');
    const agentsResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': API_KEY
      }
    });

    const agentsData = await agentsResponse.json();
    console.log(`Found ${agentsData.agents?.length || 0} agents`);
    if (agentsData.agents?.length > 0) {
      console.log('Sample agent:', agentsData.agents[0].name, agentsData.agents[0].agent_id);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkPhoneNumbers();
