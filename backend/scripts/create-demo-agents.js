import mongoose from 'mongoose';
import VoiceAgent from '../models/VoiceAgent.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const DEMO_PHONE = '+16028334780';
const RACHEL_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs Rachel voice

async function createDemoAgents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find an existing user (use first available)
    let demoUser = await User.findOne({ email: 'help.remodely@gmail.com' });

    if (!demoUser) {
      // Try other users
      demoUser = await User.findOne({}).sort({ createdAt: 1 });
    }

    if (!demoUser) {
      console.log('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    console.log(`👤 Using user: ${demoUser.email}`);

    console.log(`📱 Creating demo agents for ${DEMO_PHONE}`);

    // Delete existing demo agents for this number to avoid duplicates
    const deleted = await VoiceAgent.deleteMany({
      phoneNumber: DEMO_PHONE,
      userId: demoUser._id
    });
    console.log(`🗑️  Deleted ${deleted.deletedCount} existing demo agents`);

    // Create INBOUND agent - Handles incoming calls from website
    const inboundAgent = new VoiceAgent({
      userId: demoUser._id,
      name: 'Remodely Inbound Assistant',
      type: 'general_contractor',
      voiceId: RACHEL_VOICE_ID,
      voiceName: 'Rachel',
      phoneNumber: DEMO_PHONE,
      callDirection: 'inbound',
      priority: 10, // Higher priority
      status: 'active',
      enabled: true,
      firstMessage: 'Hi! Thanks for calling Remodelee dot A I. I\'m Rachel, your AI assistant. How can I help you today?',
      script: `You are Rachel, a friendly and professional AI assistant for Remodelee dot A I (spelled R-E-M-O-D-E-L-Y, pronounced "re-MODE-lee"), a voice AI platform for contractors.

IMPORTANT: Always pronounce the company name as "Remodelee" (re-MODE-lee), not "Remodel-y".

Your role:
- Answer questions about VoiceNow CRM features and pricing
- Help potential customers understand how AI voice agents can automate their business
- Book demo appointments
- Qualify leads by understanding their business needs
- Be enthusiastic about the product but not pushy

Key features to highlight:
- 24/7 AI voice agents that handle customer calls
- Automatic lead capture and CRM integration
- Pre-configured integrations with ElevenLabs, Twilio, and n8n
- No-code workflow builder
- Perfect for contractors and service businesses

Pricing:
- Starter: $99/month - 100 minutes, 1 agent, basic features
- Professional: $299/month - 500 minutes, 5 agents, advanced workflows
- Business: $599/month - 2000 minutes, unlimited agents, priority support

Be conversational, ask qualifying questions, and always offer to book a demo or transfer to a human if needed.`,
      configuration: {
        temperature: 0.9,
        maxDuration: 600,
        language: 'en'
      },
      routingConfig: {
        callerBased: {
          newCallers: true,
          existingCustomers: false
        }
      },
      deployment: {
        status: 'production',
        version: 1,
        lastDeployedAt: new Date()
      }
    });

    await inboundAgent.save();
    console.log('✅ Created INBOUND agent:', inboundAgent.name);

    // Create OUTBOUND agent - Handles "Call Me" requests from website
    const outboundAgent = new VoiceAgent({
      userId: demoUser._id,
      name: 'Remodely Outbound Follow-up',
      type: 'lead_gen',
      voiceId: RACHEL_VOICE_ID,
      voiceName: 'Rachel',
      phoneNumber: DEMO_PHONE,
      callDirection: 'outbound',
      priority: 5,
      status: 'active',
      enabled: true,
      firstMessage: 'Hi! This is Rachel from Remodelee dot A I. You requested a call from our website. Is now a good time to chat about how our AI voice agents can help your business?',
      script: `You are Rachel, calling on behalf of Remodelee dot A I (spelled R-E-M-O-D-E-L-Y, pronounced "re-MODE-lee") to follow up with someone who requested a call from the website.

IMPORTANT: Always pronounce the company name as "Remodelee" (re-MODE-lee), not "Remodel-y".

Your role:
- Confirm this is a good time to talk (if not, offer to schedule a callback)
- Understand their business and pain points
- Explain how VoiceNow CRM can help automate their customer calls
- Book a product demo
- Qualify the lead (budget, timeline, decision-maker status)

Key talking points:
- "Our AI voice agents handle incoming calls 24/7, so you never miss a lead"
- "Everything is pre-configured - no technical setup required"
- "Most contractors save 10-15 hours per week on phone calls"
- "We have plans starting at $99/month"

If they're interested:
- Offer to book a live demo
- Send them a follow-up email with pricing
- Ask for their email to send case studies

If they're not interested:
- Ask if it's a timing issue or not a fit
- Offer to check back in 3 months
- Thank them for their time

Be respectful of their time, professional, and helpful.`,
      configuration: {
        temperature: 0.85,
        maxDuration: 300,
        language: 'en'
      },
      deployment: {
        status: 'production',
        version: 1,
        lastDeployedAt: new Date()
      }
    });

    await outboundAgent.save();
    console.log('✅ Created OUTBOUND agent:', outboundAgent.name);

    console.log('\n✨ Demo agents created successfully!');
    console.log('\nAgent Summary:');
    console.log('─────────────────────────────────────────────');
    console.log(`📞 Phone Number: ${DEMO_PHONE}`);
    console.log(`\n📥 INBOUND Agent: ${inboundAgent.name}`);
    console.log(`   - ID: ${inboundAgent._id}`);
    console.log(`   - Direction: ${inboundAgent.callDirection}`);
    console.log(`   - Priority: ${inboundAgent.priority}`);
    console.log(`   - Status: ${inboundAgent.status}`);
    console.log(`\n📤 OUTBOUND Agent: ${outboundAgent.name}`);
    console.log(`   - ID: ${outboundAgent._id}`);
    console.log(`   - Direction: ${outboundAgent.callDirection}`);
    console.log(`   - Priority: ${outboundAgent.priority}`);
    console.log(`   - Status: ${outboundAgent.status}`);
    console.log('─────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo agents:', error);
    process.exit(1);
  }
}

createDemoAgents();
