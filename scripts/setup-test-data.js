import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
const VoiceAgentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['lead_gen', 'booking', 'collections', 'promo', 'support'],
    required: true
  },
  elevenLabsAgentId: { type: String, required: true },
  voiceId: { type: String },
  enabled: { type: Boolean, default: true },
  performance: {
    totalCalls: { type: Number, default: 0 },
    successfulCalls: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 }
  }
}, { timestamps: true });

const LeadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  source: {
    type: String,
    enum: ['website', 'phone', 'referral', 'manual', 'import'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new'
  },
  value: { type: Number, default: 0 },
  qualified: { type: Boolean, default: false },
  lastContactedAt: { type: Date }
}, { timestamps: true });

const VoiceAgent = mongoose.model('VoiceAgent', VoiceAgentSchema);
const Lead = mongoose.model('Lead', LeadSchema);

async function setupTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the first user (or you can specify a specific user ID)
    const User = mongoose.model('User');
    const user = await User.findOne();

    if (!user) {
      console.log('❌ No user found. Please create a user first through the UI.');
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.email}\n`);

    // Create or update agents
    const agents = [
      {
        name: 'Sarah - Lead Gen',
        type: 'lead_gen',
        elevenLabsAgentId: process.env.ELEVENLABS_LEAD_GEN_AGENT_ID,
        voiceId: 'cgSgspJ2msm6clMCkdW9'
      },
      {
        name: 'Mike - Appointment Booking',
        type: 'booking',
        elevenLabsAgentId: process.env.ELEVENLABS_BOOKING_AGENT_ID,
        voiceId: 'TxGEqnHWrfWFTfGW9XjX'
      },
      {
        name: 'James - Collections',
        type: 'collections',
        elevenLabsAgentId: process.env.ELEVENLABS_COLLECTIONS_AGENT_ID,
        voiceId: 'pNInz6obpgDQGcFmaJgB'
      },
      {
        name: 'Lisa - Promotions',
        type: 'promo',
        elevenLabsAgentId: process.env.ELEVENLABS_PROMO_AGENT_ID,
        voiceId: 'XrExE9yKIg1WjnnlVkGX'
      },
      {
        name: 'Alex - Support',
        type: 'support',
        elevenLabsAgentId: process.env.ELEVENLABS_SUPPORT_AGENT_ID,
        voiceId: 'cgSgspJ2msm6clMCkdW9'
      }
    ];

    console.log('🤖 Creating/updating agents...\n');
    for (const agentData of agents) {
      const agent = await VoiceAgent.findOneAndUpdate(
        { userId: user._id, type: agentData.type },
        { ...agentData, userId: user._id },
        { upsert: true, new: true }
      );
      console.log(`✅ ${agent.name} - ${agent.elevenLabsAgentId}`);
    }

    // Create test lead
    console.log('\n📞 Creating test lead...\n');
    const testLead = await Lead.findOneAndUpdate(
      { userId: user._id, phone: '+14802555887' },
      {
        userId: user._id,
        name: 'Test User (You)',
        email: 'test@example.com',
        phone: '+14802555887',
        source: 'manual',
        status: 'new',
        value: 5000,
        qualified: false
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Lead created: ${testLead.name} - ${testLead.phone}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST DATA SETUP COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📋 Next steps:');
    console.log('1. Open http://localhost:5174 in your browser');
    console.log('2. Login with your account');
    console.log('3. Go to the "Leads" page');
    console.log('4. Click the "Call" button next to "Test User (You)"');
    console.log('5. Select "Sarah - Lead Gen" agent');
    console.log('6. Click "Initiate Call"');
    console.log('\n📱 You should receive a call at +1 (480) 255-5887');
    console.log('   from the AI Lead Generation Agent!\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestData();
