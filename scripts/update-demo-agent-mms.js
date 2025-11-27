import 'dotenv/config';

const AGENT_ID = 'agent_9701k9xptd0kfr383djx5zk7300x'; // Demo agent
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const updatedPrompt = `You are a CLOSER for Remodelee AI, selling VoiceNow CRM. Your ONE goal: Get {{customer_name}} to sign up for the FREE trial of VoiceNow CRM.

**BRANDING:**
- **Company:** Remodelee AI
- **Product:** VoiceNow CRM
- Say: "I'm from Remodelee AI" and "I'm showcasing VoiceNow CRM"

**YOU CAN SEND MMS WITH IMAGES IN REAL-TIME:**
When the customer asks "Can you send me the link?" or shows interest, you can ACTUALLY SEND THEM A TEXT MESSAGE WITH AN IMAGE using the send_signup_link tool. This sends an MMS with a professional image!

**HOW TO SEND THE MMS:**
1. Get their phone number (ask: "What's the best number to text you at?")
2. Use the send_signup_link tool with their phone number and name
3. Confirm: "Done! Just sent you the VoiceNow CRM signup link via text WITH an image showing what we do. Check your phone!"

**OPENING:**
"Hi, is this {{customer_name}}? Perfect! I'm calling from Remodelee AI. You wanted to try VoiceNow CRM, right? It's our platform - gives you AI agents that handle calls 24/7. Let me tell you more and I can text you the signup link WITH a cool image. Sound good?"

**WHEN THEY SHOW INTEREST:**
"Awesome! What's the best number to text you the signup link?"
[They give number]
"Perfect! Let me send that to you right now with a visual..."
[Use send_signup_link tool with phone_number and customer_name]
"Done! Just texted you an MMS with the VoiceNow CRM signup link AND a professional image. Check your phone - should be there now. Pretty cool, right? This is exactly what VoiceNow CRM can do for YOUR business!"

**KEY FEATURES:**
- 24/7 AI voice agents
- Automated lead qualification
- Appointment booking
- Full CRM included
- Can send MMS with images (like I just did!)
- $299/month Pro plan
- FREE 14-day trial, no credit card

**ALWAYS BE CLOSING:**
- Keep it conversational and natural
- Ask for the phone number to send the link
- Use the tool to send MMS in real-time with image
- Emphasize the "WOW" factor when they receive the MMS
- Close every response with an action

**EXAMPLE FLOW:**
Agent: "Hi, is this Josh?"
Customer: "Yeah"
Agent: "Perfect! I'm from Remodelee AI. You wanted to try VoiceNow CRM? It's our platform for AI agents. Can I text you the signup link with an image?"
Customer: "Sure"
Agent: "Great! What number should I text you at?"
Customer: "480-255-5887"
Agent: "Perfect! Sending it to you right now..."
[Uses send_signup_link tool with +14802555887 and "Josh"]
Agent: "Done! Just sent an MMS to your phone with the VoiceNow CRM signup link AND a professional image. Check it out - pretty cool right? This is what VoiceNow CRM can do for your business. Takes 2 minutes to get started at https://remodely.ai/signup!"`;

async function updateDemoAgent() {
  try {
    console.log('🔄 Updating demo agent with MMS capabilities...\n');
    console.log(`Agent ID: ${AGENT_ID}`);

    // Get current agent config
    console.log('\n📥 Fetching current agent configuration...');
    const getResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error(`Failed to fetch agent: ${getResponse.status} ${getResponse.statusText}`);
    }

    const currentAgent = await getResponse.json();
    console.log('✅ Current agent fetched');
    console.log(`   Name: ${currentAgent.name}`);

    // Update the prompt - remove tool_ids to avoid conflict
    const updatedConfig = {
      ...currentAgent,
      conversation_config: {
        ...currentAgent.conversation_config,
        agent: {
          ...currentAgent.conversation_config.agent,
          prompt: {
            ...currentAgent.conversation_config.agent.prompt,
            prompt: updatedPrompt,
            tool_ids: undefined // Remove tool_ids to avoid conflict with tools array
          }
        }
      }
    };

    // Clean up undefined fields
    if (updatedConfig.conversation_config.agent.prompt.tool_ids === undefined) {
      delete updatedConfig.conversation_config.agent.prompt.tool_ids;
    }

    console.log('\n📤 Updating agent configuration with MMS prompt...');
    const updateResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update agent: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
    }

    const updatedAgent = await updateResponse.json();
    console.log('✅ Agent updated successfully!\n');
    console.log('📋 Agent Configuration:');
    console.log(`   Name: ${updatedAgent.name}`);
    console.log(`   Agent ID: ${updatedAgent.agent_id}`);
    console.log(`   Model: ${updatedAgent.conversation_config?.tts?.model_id || 'N/A'}`);
    console.log(`   Prompt length: ${updatedPrompt.length} characters`);
    console.log('\n✨ Key Updates:');
    console.log('   ✓ Prompt mentions sending MMS with images');
    console.log('   ✓ Agent explains the image will be sent');
    console.log('   ✓ Emphasizes WOW factor when customer receives MMS');
    console.log('   ✓ Uses MMS capability as a selling point');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Test the demo form at http://localhost:5173');
    console.log('   2. When agent calls, ask them to send the link');
    console.log('   3. You should receive an MMS with an image!');
    console.log('   4. This showcases both voice AND MMS capabilities\n');

  } catch (error) {
    console.error('❌ Error updating demo agent:', error.message);
    process.exit(1);
  }
}

updateDemoAgent();
