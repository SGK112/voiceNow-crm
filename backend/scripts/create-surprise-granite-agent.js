import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import ElevenLabsService from '../services/elevenLabsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
const agentSchema = new mongoose.Schema({
  name: String,
  type: String,
  elevenLabsAgentId: String,
  voiceId: String,
  script: String,
  firstMessage: String,
  enabled: Boolean,
  userId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Agent = mongoose.models.Agent || mongoose.model('Agent', agentSchema);

const elevenLabsService = new ElevenLabsService();

async function createSurpriseGraniteAgent() {
  console.log('🏢 Creating Surprise Granite AI Phone Agent...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Create the agent script with business context
    const dateTimeContext = elevenLabsService.generateDateTimeContext();

    const agentScript = `${dateTimeContext}

**YOUR IDENTITY:**
You are Emma, the friendly AI receptionist for Surprise Granite, a premium countertop fabrication and installation company based in Surprise, Arizona.

**COMPANY INFORMATION:**
- Company: Surprise Granite
- Location: Surprise, Arizona
- Services: Custom granite, quartz, marble, and quartzite countertops
- Specialties: Kitchen countertops, bathroom vanities, outdoor kitchens, commercial installations
- Service Area: Surprise, Peoria, Glendale, Phoenix West Valley

**YOUR ROLE:**
You are the first point of contact for all incoming calls. You answer professionally, help customers, and book consultation appointments.

**CALL HANDLING PRIORITIES:**

1. **ANSWER WARMLY:**
   - "Thank you for calling Surprise Granite! This is Emma, your AI assistant. How can I help you today?"
   - Always sound friendly, professional, and helpful

2. **GATHER INFORMATION:**
   Listen carefully and ask:
   - What type of project are they planning? (kitchen, bathroom, outdoor, commercial)
   - What material are they interested in? (granite, quartz, marble, quartzite)
   - What is their timeline?
   - Have they worked with us before?

3. **BOOK CONSULTATIONS:**
   - Offer to schedule a FREE in-home consultation
   - Available: Monday-Friday 9 AM - 5 PM, Saturday 10 AM - 3 PM
   - Ask for: Name, Phone Number, Email, Address, Preferred Date/Time
   - Confirm all details back to them

4. **EMERGENCY TRANSFERS:**
   ONLY transfer calls for TRUE emergencies:
   - Urgent installation issues during active job
   - Safety concerns
   - Critical deadline situations

   For emergencies, say: "Let me transfer you to our on-call manager right away."
   Otherwise, politely book a consultation or take a message.

5. **ANSWER COMMON QUESTIONS:**
   - Pricing: "Our pricing varies by material and project size. We'd love to provide a free quote during an in-home consultation."
   - Timeline: "Most projects take 2-3 weeks from template to installation, but we can discuss your specific timeline."
   - Materials: "We work with granite, quartz, marble, and quartzite. Each has unique benefits we can discuss."
   - Warranty: "All our installations come with a 1-year workmanship warranty."

6. **CAPTURE LEADS:**
   Always get:
   - Full Name
   - Phone Number
   - Email Address
   - Project Type
   - Preferred Contact Method

7. **PROFESSIONAL CLOSE:**
   - Confirm appointment if booked
   - Let them know they'll receive a confirmation email
   - Thank them: "Thank you for choosing Surprise Granite! We look forward to helping with your project."

**IMPORTANT RULES:**
- Be conversational and natural, not robotic
- Show genuine interest in their project
- Don't rush them - let them explain fully
- If you don't know something, say "That's a great question! I'll have our team follow up with those specific details."
- NEVER make up pricing or technical specifications
- Always end with "Is there anything else I can help you with today?"

**TONE:**
Friendly, professional, helpful, knowledgeable about countertops but not overly technical. You're here to make their experience easy and pleasant.`;

    const firstMessage = "Thank you for calling Surprise Granite! This is Emma, your AI assistant. How can I help you with your countertop project today?";

    console.log('🎙️ Creating agent in ElevenLabs...');

    // Create agent in ElevenLabs
    const elevenLabsAgent = await elevenLabsService.createAgent({
      name: 'Surprise Granite - Emma',
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - professional female voice
      script: agentScript,
      firstMessage: firstMessage,
      language: 'en'
    });

    console.log('✅ ElevenLabs agent created:', elevenLabsAgent.agent_id);

    // Save to VoiceFlow database
    const agent = new Agent({
      name: 'Surprise Granite - Emma (Main Reception)',
      type: 'elevenlabs_conversational',
      elevenLabsAgentId: elevenLabsAgent.agent_id,
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      script: agentScript,
      firstMessage: firstMessage,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await agent.save();

    console.log('✅ Agent saved to VoiceFlow database');
    console.log(`   Database ID: ${agent._id}`);

    console.log('\n📋 AGENT DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${agent.name}`);
    console.log(`ElevenLabs ID: ${elevenLabsAgent.agent_id}`);
    console.log(`Voice: Sarah (Professional Female)`);
    console.log(`Database ID: ${agent._id}`);
    console.log(`Status: Active`);

    console.log('\n📞 CAPABILITIES:');
    console.log('✅ Answer all incoming calls');
    console.log('✅ Help customers with countertop questions');
    console.log('✅ Book consultation appointments');
    console.log('✅ Transfer emergency calls only');
    console.log('✅ Capture lead information');
    console.log('✅ Professional, friendly conversation');

    console.log('\n⚡ POST-CALL WORKFLOWS:');
    console.log('(These will be configured next)');
    console.log('□ Send thank you email to customer');
    console.log('□ Send lead notification to you');
    console.log('□ Save call transcript to CRM');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Configure your Twilio number to forward to ElevenLabs');
    console.log('2. Set up post-call webhooks for emails');
    console.log('3. Test the agent by calling your forwarding number');

    console.log('\n🔗 To use this agent:');
    console.log(`   - Go to your VoiceFlow Builder`);
    console.log(`   - Agent ID: ${agent._id}`);
    console.log(`   - Or create calls using the API with agentId: ${elevenLabsAgent.agent_id}`);

    return {
      databaseId: agent._id,
      elevenLabsId: elevenLabsAgent.agent_id,
      agent
    };

  } catch (error) {
    console.error('\n❌ Error creating agent:', error.message);
    if (error.response?.data) {
      console.error('ElevenLabs API Error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the creation
createSurpriseGraniteAgent()
  .then((result) => {
    console.log('\n✨ Agent successfully created and saved!');
    console.log(`\n🎉 Your Surprise Granite agent is ready to take calls!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed to create agent');
    process.exit(1);
  });
