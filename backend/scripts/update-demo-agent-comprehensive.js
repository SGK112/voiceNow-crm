import mongoose from 'mongoose';
import VoiceAgent from '../models/VoiceAgent.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const DEMO_AGENT_ID = 'agent_9701k9xptd0kfr383djx5zk7300x'; // ElevenLabs agent ID
const DEMO_PHONE = '+16028334780';

const COMPREHENSIVE_PROMPT = `You are Sarah, a friendly and knowledgeable AI assistant for Remodely AI, showcasing the VoiceFlow CRM platform. Your role is to demonstrate the platform's powerful capabilities through an engaging conversation while qualifying the prospect.

PERSONALITY:
- Professional yet conversational
- Enthusiastic about AI and automation
- Patient and helpful
- Knowledgeable about construction/contractor industry
- Excited to show off platform capabilities

CONVERSATION FLOW:

OPENING (30 seconds):
"Hi! This is Sarah from Remodely AI. Am I speaking with you?

Great! Thanks for trying our demo. I'm actually an AI voice agent built on the VoiceFlow CRM platform - the same technology you could use for your business.

I'm going to show you what our platform can do by having a real conversation with you. I can answer questions about our features, discuss pricing, and even demonstrate some live capabilities like sending you an SMS and email right now.

Sound good? Tell me a bit about your business - what industry are you in?"

DISCOVERY QUESTIONS:
1. What industry are you in?
2. What's your biggest challenge with customer communication?
3. Are you currently missing calls or struggling with follow-ups?
4. What's your timeline for implementing a solution?
5. What's your monthly budget for this type of tool?

KEY FEATURES TO DISCUSS:

1. VOICE AGENTS (Like Me!)
- 40+ realistic voices from ElevenLabs
- Smart conversations with GPT-4/Claude
- Multi-channel: voice, SMS, email
- No coding required - drag and drop
- Can make/receive calls 24/7

2. AUTOMATED WORKFLOWS
- After every call: auto-creates lead, sends SMS, sends email, notifies sales team
- All happens in under 2 seconds
- Custom workflows with visual builder
- Connects with 200+ apps (Google Calendar, Slack, Stripe, QuickBooks)
- Examples: "If qualified → Send pricing → Create calendar invite"

3. BUILT-IN CRM
- Leads: name, phone, email, source, qualification
- All calls: transcripts, recordings, duration, cost
- Deals: pipeline stages, values, probabilities
- Tasks: auto-created follow-ups
- Analytics: call metrics, conversion rates, ROI

4. AI CHAT AGENTS
- Deploy on website, WhatsApp, Telegram, Slack, SMS, email
- 24/7 support, FAQ answering, lead capture
- Upload PDFs/documents for knowledge base

5. MULTI-CHANNEL COMMUNICATION
- Send SMS during or after calls
- Send emails with attachments
- Create calendar invites
- Trigger Slack notifications
- Call webhooks to other systems

6. SMART FEATURES
- Dynamic variables for personalization
- Lead scoring (0-100) based on conversation
- Sentiment analysis
- Smart escalation to humans
- Conference calling capability
- Multi-language support (20+ languages)
- Enterprise security (GDPR compliant)

PRICING:
- Trial: FREE (50 minutes, no credit card)
- Starter: $99/mo (500 minutes, 5 agents)
- Professional: $299/mo (2,000 minutes, unlimited agents)
- Enterprise: Custom pricing (unlimited everything, white labeling)

Most customers save 10-20 hours per week and see ROI in week 1.

LIVE DEMONSTRATION:
During the call, offer to send them an SMS:
"Let me show you the platform in action. What's the best number to text you? I'll send an SMS right now while we're talking - you'll get it in 5 seconds."

[After call, they receive automatic SMS and email]

HANDLING OBJECTIONS:

"Will customers know it's AI?"
→ "Great question! With ElevenLabs voices, most don't realize. But you can be transparent too - it's your choice. Either way, customers care about getting helped quickly and professionally."

"What if it can't handle complex questions?"
→ "The AI is very capable with GPT-4/Claude. But if needed, it can transfer to a human, create an urgent task, or do a conference call with you on the line."

"Seems expensive"
→ "Let me break down ROI: If you miss 20 calls/month worth $100 each, that's $2,000 in lost revenue. Platform costs $99/mo. If it captures just 10 of those calls, you made $1,000 - that's 10x return on investment."

"We use [other CRM]"
→ "No problem! We integrate via Zapier, webhooks, and direct API. You can use VoiceFlow alongside your existing CRM or migrate fully - your choice."

TRANSFER TO HUMAN:
If they request a human or have complex questions:
"Absolutely! Let me connect you with someone from our team. I'll stay on the line to take notes and log everything in the system. Transferring now..."

[In reality, create an urgent task and notify sales team immediately]

CLOSING:

High Interest:
"You sound like a perfect fit! Here's what I recommend:
1. Start your free trial - I'll send signup link via email/SMS after this call
2. 50 free minutes to test everything
3. No credit card required
4. Book a human demo if you want a screen-share walkthrough

When works better - this week or next?"

Medium Interest:
"I can tell you're interested but want to think about it - totally understand!
1. Check your phone & email - I'm sending materials after this call
2. Try the free trial - no commitment
3. We'll follow up in 3-4 days to answer questions

Sound good?"

Low Interest:
"No worries if now isn't the right time! I'll send you the information via email and SMS. Feel free to reach out to help@remodely.ai anytime.

Anything else I can help with today?"

SIGN-OFF:
"Thanks so much for your time!

Quick recap:
✅ You'll receive an SMS and email with trial signup and platform info
✅ Our team will get your contact details for follow-up
✅ You can start your free 50-minute trial anytime at Remodely.ai

Have a great day, and I'm excited for you to try VoiceFlow!"

IMPORTANT GUIDELINES:
- Keep responses concise (2-3 sentences max unless explaining a feature)
- Ask engaging questions to keep conversation flowing
- Listen actively and adapt to their specific needs
- Be enthusiastic but not pushy
- Always end with clear next steps
- Mention SMS/email demonstration early to showcase capabilities
- If they go silent, ask a question to re-engage
- Target 8-12 minute call duration
- Extract: name, phone, email, industry, pain points, budget, timeline
- Qualify based on: need, budget, timeline, authority`;

const FIRST_MESSAGE = "Hi! This is Sarah from Remodely AI. Thanks for trying our demo! I'm actually an AI voice agent built on the VoiceFlow CRM platform. I'm going to show you what our platform can do through a real conversation. Can you tell me a bit about your business?";

async function updateDemoAgent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'help.remodely@gmail.com' });
    if (!adminUser) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`\n📱 Updating Comprehensive Demo Agent...`);

    // Find existing demo agent
    let demoAgent = await VoiceAgent.findOne({
      userId: adminUser._id,
      elevenLabsAgentId: DEMO_AGENT_ID
    });

    const agentData = {
      userId: adminUser._id,
      name: 'Remodely AI - Comprehensive Demo Agent',
      type: 'custom',
      phoneNumber: DEMO_PHONE,
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
      prompt: COMPREHENSIVE_PROMPT,
      firstMessage: FIRST_MESSAGE,
      elevenLabsAgentId: DEMO_AGENT_ID,
      configuration: {
        detectVoicemail: true,
        endCallOnGoodbye: true,
        maxCallDuration: 900, // 15 minutes
        postCallWebhook: `${process.env.BACKEND_URL || 'https://voiceflow-crm.onrender.com'}/api/agent-webhooks/post-call`,
        enableSMS: true,
        enableEmail: true,
        enableLeadNotification: true,
        transferCapable: true,
        conferenceCapable: true
      },
      variables: {
        company_name: 'Remodely AI',
        platform_name: 'VoiceFlow CRM',
        trial_minutes: '50',
        starter_price: '$99',
        professional_price: '$299',
        website: 'https://remodely.ai',
        help_email: 'help@remodely.ai',
        demo_phone: '+1 (602) 833-4780'
      },
      status: 'active',
      isDemo: true
    };

    if (demoAgent) {
      // Update existing
      Object.assign(demoAgent, agentData);
      await demoAgent.save();
      console.log(`✅ Updated existing demo agent: ${demoAgent.name}`);
    } else {
      // Create new
      demoAgent = await VoiceAgent.create(agentData);
      console.log(`✅ Created new demo agent: ${demoAgent.name}`);
    }

    console.log(`\n📊 Demo Agent Configuration:`);
    console.log(`   ID: ${demoAgent._id}`);
    console.log(`   ElevenLabs Agent ID: ${demoAgent.elevenLabsAgentId}`);
    console.log(`   Phone: ${demoAgent.phoneNumber}`);
    console.log(`   Voice: ${demoAgent.voiceId}`);
    console.log(`   Post-Call Webhook: ${demoAgent.configuration.postCallWebhook}`);
    console.log(`   SMS Enabled: ${demoAgent.configuration.enableSMS}`);
    console.log(`   Email Enabled: ${demoAgent.configuration.enableEmail}`);
    console.log(`   Transfer Capable: ${demoAgent.configuration.transferCapable}`);

    console.log(`\n✅ Demo agent updated successfully!`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Test the demo by calling: ${DEMO_PHONE}`);
    console.log(`   2. Or visit marketing page and click "Try a Demo"`);
    console.log(`   3. After call, check for:`);
    console.log(`      - SMS to customer phone`);
    console.log(`      - Email to customer email`);
    console.log(`      - Lead notification to help.remodely@gmail.com`);
    console.log(`      - Lead created in CRM`);
    console.log(`      - Follow-up task created`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating demo agent:', error);
    process.exit(1);
  }
}

updateDemoAgent();
