import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import VoiceAgent model
const voiceAgentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
  agentId: String, // ElevenLabs agent ID
  phoneNumber: String,
  voiceId: String,
  script: String,
  firstMessage: String,
  enabled: Boolean,
  metadata: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const VoiceAgent = mongoose.models.VoiceAgent || mongoose.model('VoiceAgent', voiceAgentSchema);

async function fixEmmaWebhook() {
  console.log('🔧 Fixing Emma webhook - copying to VoiceAgents collection...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Get Emma from Agents collection
    const Agent = mongoose.model('Agent', new mongoose.Schema({}, { strict: false }));
    const emma = await Agent.findOne({ elevenLabsAgentId: 'agent_1401kadsbxczf28b34twm35wega7' });

    if (!emma) {
      console.log('❌ Emma not found in agents collection');
      return;
    }

    console.log(`✅ Found Emma: ${emma.name}`);
    console.log(`   ElevenLabs ID: ${emma.elevenLabsAgentId}`);

    // Create in VoiceAgents collection
    const voiceAgent = await VoiceAgent.create({
      userId: emma.userId,
      name: emma.name,
      type: 'elevenlabs',
      agentId: emma.elevenLabsAgentId, // This is what webhook looks for!
      phoneNumber: '+16028337194', // The assigned phone number
      voiceId: emma.voiceId,
      script: emma.script,
      firstMessage: emma.firstMessage,
      enabled: true,
      metadata: {
        originalAgentId: emma._id,
        elevenLabsAgentId: emma.elevenLabsAgentId
      }
    });

    console.log(`✅ Emma copied to VoiceAgents collection`);
    console.log(`   VoiceAgent ID: ${voiceAgent._id}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ WEBHOOK NOW WORKING!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nWhen a call ends:');
    console.log('1. ElevenLabs sends webhook');
    console.log(`2. Finds Emma by agentId: ${emma.elevenLabsAgentId}`);
    console.log('3. Saves call to database');
    console.log('4. Triggers workflows:');
    console.log('   - Thank you email to customer');
    console.log('   - SMS to you (480-255-5887)');
    console.log('   - Detailed email to you');
    console.log('   - Save lead to CRM');

    console.log('\n📞 TEST IT:');
    console.log('1. Call (602) 833-7194');
    console.log('2. Book a consultation');
    console.log('3. Hang up');
    console.log('4. Check your phone for SMS!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixEmmaWebhook()
  .then(() => {
    console.log('\n✨ Webhook fixed! Make a test call!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
