import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import emailService from '../services/emailService.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import TwilioService from '../services/twilioService.js';
import callMonitorService from '../services/callMonitorService.js';
import WorkflowEngine from '../services/workflowEngine.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';

const workflowEngine = new WorkflowEngine();

// Rate limiting for demo requests (phone number -> { count, firstRequestTime, lastRequestTime })
const demoRateLimitMap = new Map();
const DEMO_RATE_LIMIT = {
  maxRequests: 5, // Max 5 demo requests per phone number (increased for testing)
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  cooldownMs: 5 * 60 * 1000 // 5 minutes cooldown between requests (reduced for testing)
};

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Lazy initialization to ensure env vars are loaded
let elevenLabsServiceInstance = null;
const getElevenLabsService = () => {
  if (!elevenLabsServiceInstance) {
    elevenLabsServiceInstance = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
  }
  return elevenLabsServiceInstance;
};

let twilioServiceInstance = null;
const getTwilioService = () => {
  if (!twilioServiceInstance) {
    twilioServiceInstance = new TwilioService();
  }
  return twilioServiceInstance;
};

// Enhanced knowledge base for better responses
const KNOWLEDGE_BASE = {
  pricing: {
    starter: {
      price: 149,
      agents: 1,
      minutes: 500,
      features: ['Basic CRM', 'Lead capture', 'Email notifications', 'Phone number included', 'Email support'],
      bestFor: 'Small businesses testing AI automation'
    },
    professional: {
      price: 299,
      agents: 5,
      minutes: 2000,
      features: ['Everything in Starter', 'Workflow builder', 'SMS & Email automation', 'Google Calendar', 'Team management', 'Priority support', 'API access'],
      bestFor: 'Growing teams scaling operations',
      popular: true
    },
    enterprise: {
      price: 'Custom',
      agents: 'Unlimited',
      minutes: 5000,
      features: ['Everything in Professional', 'Custom workflows', 'White-label', 'Unlimited team members', 'Dedicated account manager', 'Custom integrations', '24/7 support'],
      bestFor: 'Large organizations with custom needs'
    }
  },
  commonQuestions: {
    'what is': 'Remodelee AI is an AI-powered voice agent platform that helps businesses automate phone calls, qualify leads, and manage customers through voice conversations and CRM tools.',
    'how does it work': 'We build custom AI voice agents for your business. They handle calls 24/7, qualify leads, book appointments, and integrate with your existing tools through our visual workflow builder.',
    'pricing': 'We have three plans: Starter at $149/month for small businesses, Professional at $299/month (most popular) for growing teams, and Enterprise with custom pricing for large organizations. All plans include a 14-day free trial at remodely.ai/signup!',
    'free trial': 'Yes! We offer a 14-day free trial with no credit card required. You get full access to test the platform and see how it works for your business.',
    'setup': 'Most businesses are live in 2-3 hours. We handle the setup for you - just tell us about your business and we\'ll build your custom AI agent.',
    'integrations': 'We integrate with Twilio (calls/SMS), Google Calendar, Stripe (payments), Gmail, and many more through our visual workflow builder.',
    'industries': 'We work with home services (HVAC, plumbing, electrical), real estate, healthcare, e-commerce, automotive, and any business that handles customer calls.',
    'support': 'Starter plan includes email support (24-48hr). Professional gets priority support (4-8hr). Enterprise includes 24/7 dedicated support with a 1-hour response time.'
  },
  keyBenefits: [
    'Save 70-80% on staffing costs vs hiring phone support',
    'Never miss a call - AI agents work 24/7',
    'Qualify leads automatically while you sleep',
    'Scale instantly without hiring more staff',
    'Improve consistency in customer conversations'
  ]
};

// System prompt for marketing chat AI
const MARKETING_SYSTEM_PROMPT = `You are an expert sales consultant for Remodelee AI's voice automation platform. You excel at understanding customer needs and providing personalized, helpful responses.

CORE IDENTITY:
Company: Remodelee AI (pronounced: REM-oh-del-ee A-I)
Product: Remodelee AI - AI Voice Workflows & Automation Platform
Mission: Help businesses automate operations with AI voice agents

IMPORTANT PRONUNCIATION GUIDE:
- Company name: "REMODELEE AI" (REM-oh-del-ee A-I)
- When speaking about signup, say: "REMODELEE AI forward slash signup" or "remodely dot A I forward slash signup"
- Website: remodely.ai (pronounced: remodely dot A I)

COMMUNICATION STYLE:
1. Be conversational and warm - like a knowledgeable friend
2. Ask clarifying questions to understand their business
3. Provide specific examples relevant to their industry
4. Use simple language - avoid jargon
5. Always include a clear next step or call-to-action
6. Keep responses 3-5 sentences (be concise but helpful)
7. Show genuine interest in solving their problems

RESPONSE STRATEGY:
1. First Response: Acknowledge their interest, ask about their business/needs
2. Follow-ups: Provide relevant information, relate to their specific situation
3. Always end with: Next step (trial, demo, question) or value reminder

KEY SELLING POINTS:
- Done-for-you setup (we build the agents for them)
- 24/7 AI voice agents that never miss calls
- Save 70-80% vs hiring staff
- Live in 2-3 hours
- 14-day free trial, no credit card needed
- Visual workflow builder (like n8n)
- Full CRM included

PRICING (memorize this):
💡 Starter: $149/month
   • 1 AI agent, 500 minutes (~100 calls)
   • Perfect for testing automation

🌟 Professional: $299/month (MOST POPULAR)
   • 5 AI agents, 2,000 minutes (~400 calls)
   • Workflows, integrations, team management

🚀 Enterprise: Custom pricing
   • Unlimited agents, 5,000+ minutes
   • White-label, dedicated support

COMMON SCENARIOS:
- "Tell me about pricing" → Explain all 3 plans, emphasize free trial, ask about their call volume
- "How does it work?" → Explain AI agents, give industry example, mention quick setup
- "What's your experience with [industry]?" → Share relevant use case, explain benefits for their industry
- "Is it expensive?" → Compare to hiring staff ($15-25/hr), show ROI, emphasize 70-80% savings
- Generic greeting → Welcome them, ask what brought them here today

HANDLING UNKNOWNS:
If you don't know something specific:
"That's a great question! I want to give you accurate information. Our team can provide detailed answers about [topic]. Would you like me to connect you with them, or should we start your free trial so you can explore it yourself?"

ALWAYS REMEMBER:
- Every response should move them closer to starting a trial
- Personalize based on their industry/situation
- Be enthusiastic but not pushy
- Focus on their problems, not our features
- End with a question or clear next step`;

// Intent detection helper
function detectIntent(message, conversationHistory) {
  const msg = message.toLowerCase();

  // Check conversation context
  const historyText = conversationHistory.map(h => h.text.toLowerCase()).join(' ');

  const intents = {
    pricing: msg.match(/price|pricing|cost|expensive|how much|plan|subscription/i),
    trial: msg.match(/trial|try|test|demo|free/i),
    howItWorks: msg.match(/how (does|do|it|this)|what (is|does)|explain|tell me about/i),
    features: msg.match(/feature|what can|capabilit|function|can it|does it/i),
    comparison: msg.match(/vs|versus|compare|alternative|instead of|better than/i),
    industry: msg.match(/industry|business type|work for|suitable for/i),
    integration: msg.match(/integrat|connect|work with|compatible/i),
    setup: msg.match(/setup|install|implement|get started|onboard/i),
    support: msg.match(/support|help|question|problem|issue/i),
    greeting: !historyText && msg.match(/^(hi|hello|hey|good morning|good afternoon)/i)
  };

  return Object.keys(intents).find(key => intents[key]) || 'general';
}

// Generate context-aware follow-up suggestions
function generateFollowUps(intent, conversationHistory) {
  const suggestions = {
    pricing: [
      "Which plan would you recommend for my business?",
      "Can I upgrade or downgrade plans later?",
      "What happens if I go over my minutes?"
    ],
    trial: [
      "How do I start the free trial?",
      "What's included in the trial?",
      "Do I need a credit card to try it?"
    ],
    howItWorks: [
      "How long does setup take?",
      "Do you build the agents for me?",
      "Can I customize the voice and script?"
    ],
    features: [
      "Tell me about the workflow builder",
      "What integrations do you offer?",
      "Can agents transfer to humans?"
    ],
    general: [
      "Show me pricing plans",
      "How does setup work?",
      "Start my free trial"
    ]
  };

  return suggestions[intent] || suggestions.general;
}

export const marketingChat = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Detect user intent
    const intent = detectIntent(message, conversationHistory);
    console.log(`Detected intent: ${intent} for message: "${message}"`);

    // Check if OpenAI is configured
    if (!openai) {
      return res.status(503).json({
        error: 'AI chat is currently unavailable. Please contact our team directly.',
        fallbackResponse: "Thanks for your interest! Our AI assistant is temporarily unavailable, but our team would love to help you. Please email us at support@remodely.ai or schedule a demo to learn more about VoiceNow CRM!",
        suggestions: generateFollowUps('general', conversationHistory)
      });
    }

    // Add context about detected intent and knowledge base to the system prompt
    const enhancedSystemPrompt = `${MARKETING_SYSTEM_PROMPT}

CURRENT CONVERSATION CONTEXT:
- User Intent: ${intent}
- Conversation Length: ${conversationHistory.length} messages
- Available Knowledge Base: You have access to detailed pricing, features, and FAQs

RELEVANT KNOWLEDGE FOR THIS QUERY:
${intent === 'pricing' ? `PRICING DETAILS:
Starter: $${KNOWLEDGE_BASE.pricing.starter.price}/month
- ${KNOWLEDGE_BASE.pricing.starter.agents} AI agent, ${KNOWLEDGE_BASE.pricing.starter.minutes} minutes
- Best for: ${KNOWLEDGE_BASE.pricing.starter.bestFor}

Professional: $${KNOWLEDGE_BASE.pricing.professional.price}/month (MOST POPULAR)
- ${KNOWLEDGE_BASE.pricing.professional.agents} AI agents, ${KNOWLEDGE_BASE.pricing.professional.minutes} minutes
- Best for: ${KNOWLEDGE_BASE.pricing.professional.bestFor}

Enterprise: Custom pricing
- ${KNOWLEDGE_BASE.pricing.enterprise.agents} agents, ${KNOWLEDGE_BASE.pricing.enterprise.minutes}+ minutes
- Best for: ${KNOWLEDGE_BASE.pricing.enterprise.bestFor}` : ''}

${intent === 'trial' ? `FREE TRIAL INFO:
${KNOWLEDGE_BASE.commonQuestions['free trial']}` : ''}

${intent === 'howItWorks' ? `HOW IT WORKS:
${KNOWLEDGE_BASE.commonQuestions['how does it work']}` : ''}

${intent === 'setup' ? `SETUP DETAILS:
${KNOWLEDGE_BASE.commonQuestions['setup']}` : ''}

RESPONSE INSTRUCTIONS FOR THIS INTENT:
- Be specific and informative
- Use actual numbers and details from knowledge base
- ${conversationHistory.length === 0 ? 'This is their first message - be welcoming and ask discovery questions' : 'Continue the conversation naturally based on context'}
- Always end with a clear next step or question`;

    // Build messages array for OpenAI with enhanced context
    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...conversationHistory.slice(-8).map(msg => ({ // Keep last 8 messages for context
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI with optimized parameters
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.8, // Slightly higher for more natural responses
      max_tokens: 300, // Allow longer, more detailed responses
      presence_penalty: 0.6, // Encourage diverse responses
      frequency_penalty: 0.3, // Reduce repetition
    });

    const aiResponse = completion.choices[0].message.content;

    // Generate contextual follow-up suggestions
    const suggestions = generateFollowUps(intent, conversationHistory);

    res.json({
      response: aiResponse,
      suggestions,
      intent, // Send intent back for analytics
      conversationLength: conversationHistory.length + 1
    });

  } catch (error) {
    console.error('Marketing chat error:', error);

    // Intelligent fallback based on message content
    const intent = detectIntent(req.body.message || '', req.body.conversationHistory || []);
    let fallbackResponse = "I apologize, but I'm having trouble responding right now. ";

    if (intent === 'pricing') {
      fallbackResponse += "Our plans start at $149/month with a 14-day free trial. Professional plan is $299/month (most popular). Visit our pricing page for full details!";
    } else if (intent === 'trial') {
      fallbackResponse += "You can start your 14-day free trial with no credit card required. Just click 'Get Started' above!";
    } else {
      fallbackResponse += "Our VoiceNow CRM platform offers AI voice agents, workflow automation, and CRM features starting at $149/month with a 14-day free trial. Would you like to start your trial?";
    }

    // Return 200 status with fallback response (graceful degradation)
    // This prevents console errors while still providing helpful responses to users
    res.status(200).json({
      response: fallbackResponse,
      suggestions: generateFollowUps(intent, req.body.conversationHistory || []),
      usingFallback: true, // Flag to indicate AI is unavailable
      intent
    });
  }
};

// Generate a signed token for ElevenLabs ConvAI widget
export const getElevenLabsToken = async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'ElevenLabs is not configured. Please contact our team directly.'
      });
    }

    // Generate a JWT token signed with the ElevenLabs API key
    // The token allows the widget to authenticate without exposing the API key
    const token = jwt.sign(
      {
        // You can add custom claims here if needed
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hour expiration
      },
      apiKey,
      { algorithm: 'HS256' }
    );

    res.json({
      token,
      agentId: process.env.ELEVENLABS_DEMO_AGENT_ID || 'agent_9701k9xptd0kfr383djx5zk7300x'
    });

  } catch (error) {
    console.error('ElevenLabs token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate authentication token'
    });
  }
};

// Handle contact sales form submissions
export const contactSales = async (req, res) => {
  try {
    const { name, email, phone, company, interest, message, source } = req.body;

    // Validate required fields
    if (!name || !email || !interest || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please fill in all required fields (name, email, interest, and message).'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address.'
      });
    }

    // Prepare email content
    const interestLabels = {
      enterprise: 'Enterprise Plan',
      demo: 'Schedule a Demo',
      custom: 'Custom Integration',
      migration: 'Migration Support',
      partnership: 'Partnership Opportunities',
      other: 'Other'
    };

    const emailSubject = `New Sales Inquiry: ${interestLabels[interest] || interest} - ${name}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 8px 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
          .header p { margin: 0; font-size: 15px; opacity: 0.95; font-weight: 400; }
          .content { padding: 40px 30px; }
          .priority-badge { display: inline-block; padding: 8px 16px; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 13px; font-weight: 600; margin-bottom: 24px; border: 1px solid #fde68a; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .field-value { background: #f9fafb; padding: 14px 18px; border-radius: 8px; font-size: 15px; color: #111827; border-left: 4px solid #3b82f6; }
          .field-value a { color: #2563eb; text-decoration: none; font-weight: 500; }
          .field-value a:hover { text-decoration: underline; }
          .message-box { background: #f9fafb; padding: 18px; border-radius: 8px; font-size: 15px; color: #374151; white-space: pre-wrap; border-left: 4px solid #3b82f6; line-height: 1.7; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
          .info-item { background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .info-item-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
          .info-item-value { font-size: 14px; color: #111827; font-weight: 500; }
          .footer { background: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; }
          .footer-text { font-size: 13px; color: #6b7280; margin: 8px 0; }
          .footer-text strong { color: #374151; font-weight: 600; }
          .cta-section { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 8px; margin-top: 24px; text-align: center; border: 1px solid #bfdbfe; }
          .cta-text { margin: 0 0 12px 0; font-size: 14px; color: #1e40af; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Sales Inquiry Received</h1>
            <p>A prospective customer has reached out via your website</p>
          </div>
          <div class="content">
            <div class="priority-badge">⚡ ${interestLabels[interest] || interest}</div>

            <div class="section">
              <div class="section-title">Prospect Information</div>
              <div class="field-value">
                <strong>${name}</strong>${company ? ` • ${company}` : ''}
              </div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-item-label">Email Address</div>
                <div class="info-item-value"><a href="mailto:${email}">${email}</a></div>
              </div>
              ${phone ? `
              <div class="info-item">
                <div class="info-item-label">Phone Number</div>
                <div class="info-item-value"><a href="tel:${phone}">${phone}</a></div>
              </div>
              ` : ''}
            </div>

            <div class="section" style="margin-top: 28px;">
              <div class="section-title">Inquiry Message</div>
              <div class="message-box">${message}</div>
            </div>

            <div class="cta-section">
              <p class="cta-text">Recommended Response Time: Within 24 hours</p>
              <p style="margin: 0; font-size: 13px; color: #1e40af;">
                ${phone ? `📞 Call: <a href="tel:${phone}" style="color: #1e40af; font-weight: 600;">${phone}</a> or ` : ''}
                ✉️ Email: <a href="mailto:${email}" style="color: #1e40af; font-weight: 600;">${email}</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p class="footer-text"><strong>Received:</strong> ${new Date().toLocaleString('en-US', {
              timeZone: 'America/New_York',
              dateStyle: 'full',
              timeStyle: 'short'
            })} ET</p>
            <p class="footer-text"><strong>Lead Source:</strong> ${source || 'Website Contact Form'}</p>
            <p class="footer-text" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
              This inquiry was automatically captured by VoiceNow CRM
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
NEW SALES INQUIRY RECEIVED
${'-'.repeat(50)}

INQUIRY TYPE: ${interestLabels[interest] || interest}

PROSPECT INFORMATION:
Name: ${name}
${company ? `Company: ${company}` : ''}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

INQUIRY MESSAGE:
${message}

DETAILS:
Received: ${new Date().toLocaleString('en-US', {
  timeZone: 'America/New_York',
  dateStyle: 'full',
  timeStyle: 'short'
})} ET
Lead Source: ${source || 'Website Contact Form'}

RECOMMENDED ACTION: Respond within 24 hours
${phone ? `Call: ${phone} or ` : ''}Email: ${email}

${'-'.repeat(50)}
This inquiry was automatically captured by VoiceNow CRM
    `;

    // Send email to sales team (help.remodely@gmail.com)
    await emailService.sendEmail({
      to: 'help.remodely@gmail.com',
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });

    console.log(`✉️ Contact sales form submitted by ${name} (${email}) - Interest: ${interest}`);

    // Send confirmation email to user
    const confirmationSubject = 'Thank you for contacting VoiceNow CRM';
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; }
          .header p { margin: 0; font-size: 15px; opacity: 0.95; font-weight: 400; }
          .content { padding: 40px 30px; }
          .success-icon { text-align: center; margin-bottom: 24px; }
          .success-icon svg { width: 64px; height: 64px; }
          .message { margin-bottom: 24px; }
          .message p { font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 16px 0; }
          .message h2 { font-size: 18px; color: #111827; margin: 0 0 12px 0; font-weight: 600; }
          .details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-size: 13px; color: #6b7280; font-weight: 600; min-width: 120px; }
          .detail-value { font-size: 14px; color: #111827; font-weight: 500; }
          .cta-section { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: transform 0.2s; }
          .cta-button:hover { transform: translateY(-1px); }
          .footer { background: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer-text { font-size: 13px; color: #6b7280; margin: 8px 0; }
          .footer-text a { color: #2563eb; text-decoration: none; font-weight: 500; }
          .footer-text a:hover { text-decoration: underline; }
          .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>We've Received Your Inquiry</h1>
            <p>Thank you for reaching out to VoiceNow CRM</p>
          </div>
          <div class="content">
            <div class="success-icon">
              <svg fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>

            <div class="message">
              <p>Dear ${name},</p>
              <p>Thank you for your interest in VoiceNow CRM. We have successfully received your inquiry regarding <strong>${interestLabels[interest] || interest}</strong>.</p>
              <p>Our sales team is reviewing your request and will contact you within the next 24 hours to discuss how we can best serve your needs.</p>
            </div>

            <div class="details-box">
              <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">Your Inquiry Summary</h2>
              <div class="detail-row">
                <div class="detail-label">Interest Type:</div>
                <div class="detail-value">${interestLabels[interest] || interest}</div>
              </div>
              ${company ? `
              <div class="detail-row">
                <div class="detail-label">Company:</div>
                <div class="detail-value">${company}</div>
              </div>
              ` : ''}
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${email}</div>
              </div>
              ${phone ? `
              <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${phone}</div>
              </div>
              ` : ''}
              <div class="detail-row">
                <div class="detail-label">Submitted:</div>
                <div class="detail-value">${new Date().toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })} ET</div>
              </div>
            </div>

            <div class="cta-section">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #1e40af; font-weight: 500;">
                While you wait, explore what VoiceNow CRM can do for your business
              </p>
              <a href="https://voiceflowcrm.com" class="cta-button">Learn More About VoiceNow CRM</a>
            </div>

            <div class="divider"></div>

            <div class="message">
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                <strong style="color: #374151;">Questions in the meantime?</strong><br>
                Feel free to reach out directly at <a href="mailto:help.remodely@gmail.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">help.remodely@gmail.com</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p class="footer-text" style="font-weight: 600; color: #374151; margin-bottom: 4px;">VoiceNow CRM</p>
            <p class="footer-text">AI-Powered Voice Communication Platform</p>
            <p class="footer-text" style="margin-top: 16px;">© 2025 VoiceNow CRM by Remodely. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send confirmation to user (don't fail if this errors)
    try {
      await emailService.sendEmail({
        to: email,
        subject: confirmationSubject,
        html: confirmationHtml
      });
    } catch (confirmError) {
      console.error('Failed to send confirmation email:', confirmError);
      // Don't throw - main email was sent successfully
    }

    res.json({
      success: true,
      message: 'Thank you for contacting us! Our team will reach out to you within 24 hours.'
    });

  } catch (error) {
    console.error('Contact sales form error:', error);
    res.status(500).json({
      error: 'Failed to submit contact form',
      message: 'Sorry, there was an error processing your request. Please try again or email us directly at help.remodely@gmail.com'
    });
  }
};

// Request a voice demo call using Twilio + ElevenLabs WebSocket
export const requestVoiceDemo = async (req, res) => {
  try {
    const { phoneNumber, name, email, demoType = "voice" } = req.body;

    // Validate required fields
    if (!phoneNumber || !name) {
      return res.status(400).json({
        error: 'Phone number and name are required',
        message: 'Please provide your name and phone number to receive the demo call.'
      });
    }

    // Format phone number (ensure it has + prefix for international format)
    let formattedNumber = phoneNumber.trim();

    // Strip all non-digits first
    const digitsOnly = formattedNumber.replace(/\D/g, '');

    // Check if it starts with country code
    if (formattedNumber.startsWith('+')) {
      // Already has +, just ensure it's properly formatted
      formattedNumber = '+' + digitsOnly;
    } else if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
      // US number with country code but no +
      formattedNumber = '+' + digitsOnly;
    } else {
      // Assume US number, add +1
      formattedNumber = '+1' + digitsOnly;
    }

    // ========== RATE LIMITING CHECK ==========
    // TEMPORARILY DISABLED FOR TESTING - RE-ENABLE FOR PRODUCTION
    const BYPASS_RATE_LIMIT = true; // Set to false for production

    const now = Date.now();
    const rateLimit = demoRateLimitMap.get(formattedNumber);

    if (rateLimit && !BYPASS_RATE_LIMIT) {
      // Check if still within the 24-hour window
      const timeSinceFirst = now - rateLimit.firstRequestTime;
      const timeSinceLast = now - rateLimit.lastRequestTime;

      if (timeSinceFirst < DEMO_RATE_LIMIT.windowMs) {
        // Still within 24-hour window
        if (rateLimit.count >= DEMO_RATE_LIMIT.maxRequests) {
          console.log(`⚠️  Demo rate limit exceeded for ${formattedNumber} (${rateLimit.count} requests in 24h)`);
          return res.status(429).json({
            error: 'Too many demo requests',
            message: `You've reached the maximum number of demo requests (${DEMO_RATE_LIMIT.maxRequests}) for this phone number. Please try again in 24 hours or contact us at help.remodely@gmail.com for assistance.`,
            retryAfter: Math.ceil((rateLimit.firstRequestTime + DEMO_RATE_LIMIT.windowMs - now) / 1000 / 60) // minutes
          });
        }

        // Check cooldown between requests (prevent rapid-fire requests)
        if (timeSinceLast < DEMO_RATE_LIMIT.cooldownMs) {
          const waitMinutes = Math.ceil((rateLimit.lastRequestTime + DEMO_RATE_LIMIT.cooldownMs - now) / 1000 / 60);
          console.log(`⚠️  Demo cooldown active for ${formattedNumber} (${waitMinutes}min remaining)`);
          return res.status(429).json({
            error: 'Please wait before requesting another demo',
            message: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before requesting another demo.`,
            retryAfter: waitMinutes
          });
        }

        // Update rate limit
        rateLimit.count++;
        rateLimit.lastRequestTime = now;
      } else {
        // 24-hour window expired, reset counter
        demoRateLimitMap.set(formattedNumber, {
          count: 1,
          firstRequestTime: now,
          lastRequestTime: now
        });
      }
    } else if (!BYPASS_RATE_LIMIT) {
      // First request from this number
      demoRateLimitMap.set(formattedNumber, {
        count: 1,
        firstRequestTime: now,
        lastRequestTime: now
      });
    }

    if (BYPASS_RATE_LIMIT) {
      console.log(`⚠️  RATE LIMITING BYPASSED FOR TESTING - ${formattedNumber}`);
    } else {
      console.log(`✅ Rate limit check passed for ${formattedNumber} (${demoRateLimitMap.get(formattedNumber).count}/${DEMO_RATE_LIMIT.maxRequests} in 24h)`);
    }

    // ========== CREATE LEAD IN CRM ==========
    const firstName = name.trim().split(' ')[0];
    let createdLead = null;

    try {
      // Find superadmin user (help.remodely@gmail.com)
      const superAdmin = await User.findOne({ email: 'help.remodely@gmail.com' });

      if (!superAdmin) {
        console.error('⚠️  SuperAdmin user not found - lead will not be created in CRM');
      } else {
        // Check if lead already exists for this phone number
        const existingLead = await Lead.findOne({
          userId: superAdmin._id,
          phone: formattedNumber
        });

        if (existingLead) {
          // Update existing lead with new demo request
          existingLead.lastActivityType = demoType === 'sms' ? 'sms' : 'ai_call';
          existingLead.lastActivityAt = new Date();
          existingLead.status = 'contacted';
          existingLead.priority = 'high'; // Demo requests are high priority

          // Add note about new demo request
          existingLead.notes.push({
            content: `New ${demoType === 'sms' ? 'SMS' : 'Voice Call'} demo requested from marketing page`,
            createdBy: 'System',
            createdAt: new Date()
          });

          // Update metadata
          if (!existingLead.metadata) {
            existingLead.metadata = new Map();
          }
          existingLead.metadata.set('lastDemoType', demoType);
          existingLead.metadata.set('lastDemoDate', new Date().toISOString());
          existingLead.metadata.set('demoRequestCount', (parseInt(existingLead.metadata.get('demoRequestCount') || '0') + 1).toString());

          await existingLead.save();
          createdLead = existingLead;
          console.log(`✅ Updated existing lead in CRM: ${existingLead._id}`);
        } else {
          // Create new lead
          createdLead = await Lead.create({
            userId: superAdmin._id,
            name: name,
            email: email || `${formattedNumber.replace(/\+/g, '')}@voiceflow-demo.com`, // Use placeholder if no email
            phone: formattedNumber,
            source: 'website',
            status: 'new',
            priority: 'high',
            qualified: false,
            qualificationScore: 50, // Mid-range score for demo requests
            lastActivityType: demoType === 'sms' ? 'sms' : 'ai_call',
            lastActivityAt: new Date(),
            tags: ['demo_request', 'marketing_page', demoType === 'sms' ? 'sms_demo' : 'voice_demo'],
            notes: [{
              content: `${demoType === 'sms' ? 'SMS' : 'Voice Call'} demo requested from marketing page`,
              createdBy: 'System',
              createdAt: new Date()
            }],
            metadata: new Map([
              ['demoType', demoType],
              ['demoRequestDate', new Date().toISOString()],
              ['demoSource', 'marketing_page'],
              ['demoRequestCount', '1']
            ])
          });
          console.log(`✅ Created new lead in CRM: ${createdLead._id}`);
        }
      }
    } catch (leadError) {
      console.error('⚠️  Failed to create/update lead in CRM:', leadError);
      // Don't fail the demo request if lead creation fails
    }

    // Choose agent based on demo type
    // IMPORTANT: Use ELEVENLABS_REMODELY_SALES_AGENT_ID for the Remodely Sales Agent (Max - male voice)
    // This is the dedicated sales agent for marketing demo - separate from ARIA
    let agentId, agentType;

    // Remodely Sales Agent (Max) - dedicated agent for marketing demos with male voice
    // Agent ID: agent_9001kbez5eprftjtgapmmqy3xjej
    const remodelySalesAgentId = process.env.ELEVENLABS_REMODELY_SALES_AGENT_ID || 'agent_9001kbez5eprftjtgapmmqy3xjej';

    if (demoType === 'sms') {
      // SMS Demo - sends a text message first, then can trigger call from same number
      agentId = remodelySalesAgentId;
      agentType = 'SMS Demo (Remodely Sales - Max)';
      console.log(`💬 Initiating SMS demo to ${name} at ${formattedNumber}`);
    } else {
      // Voice Call - calls directly with Remodely Sales Agent (Max)
      agentId = remodelySalesAgentId;
      agentType = 'Voice Call (Remodely Sales - Max)';
      console.log(`📞 Initiating Remodely sales call to ${name} at ${formattedNumber}`);
    }

    // Prepare dynamic variables for agent personalization
    const dynamicVariables = {
      customer_name: firstName,
      customer_phone: formattedNumber,
      customer_email: email || null,
      lead_name: name,
      trigger_source: 'marketing_page_demo',
      company_name: 'Remodely AI',
      company_pronunciation: 'Remodely AI',
      signup_url: 'remodely.ai/signup',
      signup_pronunciation: 'remodely dot AI forward slash signup'
    };

    // Initialize ElevenLabs service
    const { default: ElevenLabsService } = await import('../services/elevenLabsService.js');
    const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

    // Custom prompt with comprehensive feature coverage, trade-specific knowledge, and link sending
    const customPrompt = `You are a friendly AI sales assistant for VoiceNow CRM, powered by Remodely AI.

**YOUR IDENTITY:**
- Company: VoiceNow CRM by Remodely AI
- Your role: Help ${firstName} understand how VoiceNow CRM can revolutionize their business with AI voice agents and automation
- Be enthusiastic, helpful, and conversational

**IMPORTANT LINKS YOU CAN OFFER TO TEXT:**
- Sign up for free trial: remodely.ai/signup
- Terms of Service: remodely.ai/terms.html
- Privacy Policy: remodely.ai/privacy.html
- Book a call with our sales team: remodely.ai/book

**IMPORTANT PRONUNCIATION:**
- Say "VoiceNow CRM" and "Remodely AI" naturally
- For signup, say: "remodely dot AI forward slash signup"
- For terms, say: "remodely dot AI forward slash terms"
- For privacy, say: "remodely dot AI forward slash privacy"

**VOICEMAIL DETECTION (ABSOLUTELY CRITICAL - HIGHEST PRIORITY):**
🚨 LISTEN CAREFULLY FOR VOICEMAIL INDICATORS:
- Beep sounds (any beep = voicemail)
- "Leave a message" or "can't come to the phone"
- Automated voice saying "you have reached..."
- Background music or hold music
- No human response after 3 seconds
- Silence longer than 4 seconds

IF VOICEMAIL DETECTED:
1. IMMEDIATELY say ONLY: "Hi ${firstName}, this is VoiceNow CRM. I'll text you our info and call back later. Thanks!"
2. END THE CALL within 10 seconds total
3. Do NOT give pitch - just short message and hang up

**YOUR CONVERSATION FLOW (ONLY IF HUMAN ANSWERS):**
1. Warm greeting: "Hi ${firstName}! This is the AI assistant from VoiceNow CRM. Thanks for requesting a demo! Do you have a couple minutes to chat?"
2. WAIT for response - if ANY sign of voicemail, use short message and hang up
3. If interested, ask: "What's your biggest challenge right now - missing calls, following up with leads, or spending too much time on the phone?"
4. Listen and match their pain point to our solutions
5. Highlight 2-3 relevant features based on their needs
6. OFFER TO TEXT LINKS: "Would you like me to text you the signup link so you have it handy?"
7. OFFER SALES CALL: "Would you like to schedule a call with one of our sales specialists to discuss your specific needs?"
8. Keep total call under 3 minutes

**VOICEFLOW CRM - COMPLETE FEATURE SET:**

🎯 **AI Voice Agents (Core Value):**
- Ultra-realistic voices powered by ElevenLabs (100+ voices, 29+ languages)
- Answers EVERY call 24/7 - never miss a lead again
- Natural conversations with emotional intelligence
- Handles objections and qualifies leads automatically
- Can make hundreds of outbound calls simultaneously

💼 **Lead Management & Qualification:**
- Automatically extracts contact info, company details, and pain points
- Intelligent lead scoring and qualification
- Routes hot leads to your sales team instantly via SMS
- Eliminates tire-kickers - only serious prospects get through
- Contractors see 300% more qualified leads on average

📅 **Appointment Booking & Scheduling:**
- Books appointments, consultations, and estimates automatically
- Syncs with your calendar in real-time
- Sends confirmation emails and SMS reminders
- Reschedules no-shows automatically
- Fills your calendar while you focus on actual work

🔄 **Workflow Automation Engine:**
- Visual drag-and-drop workflow builder (no coding needed)
- Trigger actions based on call outcomes
- Automated follow-up sequences via email, SMS, and calls
- Updates CRM, sends notifications, schedules tasks automatically
- Example: "Lead calls → AI qualifies → Updates CRM → Texts sales team → Books follow-up"

🤖 **AI-Powered Tools:**
- AI Agent Generator: Describe your ideal call, AI builds it in seconds
- 50+ industry-specific templates (contractors, healthcare, real estate, etc.)
- AI Co-Pilot for email drafting and content creation
- Voice-powered estimate builder (creates quotes via conversation)
- QuickBooks and CRM integrations

📱 **Built-in CRM:**
- Complete customer relationship management
- Contact history and conversation recordings
- Deal pipeline and sales tracking
- Automated data entry from every call
- Export to your existing CRM or use ours

📞 **Voicemail Intelligence:**
- AI detects voicemail and leaves perfect messages
- Transcribes all voicemails automatically
- Sends you summaries of important calls
- Never waste time on voicemail tag again

⚡ **Quick Setup & Deployment:**
- Launch your first agent in 5 minutes
- Pre-built templates for instant deployment
- Real-time testing and preview
- No technical skills required

💰 **Pricing & Value:**
- Starter: $149/month - 1 agent, 500 minutes, perfect for small businesses
- Professional: $299/month - 5 agents, 2000 minutes, workflow builder, most popular
- Enterprise: Custom pricing - unlimited agents, dedicated support
- Free 14-day trial (no credit card required)
- Costs less than hiring one person
- ROI: Replace entire call center or multiply your capacity

🔒 **SECURITY & COMPLIANCE:**
- SOC 2 compliant with end-to-end encryption
- TLS 1.3 encryption for all data in transit
- AES-256 encryption for data at rest
- GDPR and CCPA compliant
- Your data is never sold to third parties
- Call recordings retained 90 days (configurable)
- Regular security audits and penetration testing
- If asked about terms: "Our Terms of Service cover TCPA compliance, refund policy, and usage guidelines. I can text you the link!"
- If asked about privacy: "Our Privacy Policy explains how we protect your data. We use industry-standard encryption and never sell your information. Want me to text you the link?"

**TRADE-SPECIFIC USE CASES & ROI EXAMPLES:**

🔧 **PLUMBING:**
- "A plumber in Phoenix missed 40% of calls during jobs. With VoiceNow, AI answers every call, books emergency appointments, and texts job details. Revenue jumped 35% in 3 months."
- Key features: Emergency dispatch, appointment booking, estimate requests, after-hours service
- ROI: $3,000-5,000/month in recovered revenue from missed calls

🔨 **CARPENTRY & GENERAL CONTRACTORS:**
- "A custom cabinet shop was spending 3 hours daily on phone calls. Now AI handles initial consultations, qualifies project scope, and books in-person estimates."
- Key features: Project qualification, material estimates, scheduling consultations
- ROI: Save 15+ hours/week on phone calls, focus on billable work

⚡ **ELECTRICAL:**
- "An electrician was losing emergency calls to competitors. VoiceNow's 24/7 AI now captures every emergency, dispatches based on urgency, and upsells maintenance plans."
- Key features: Emergency prioritization, service area validation, maintenance reminders
- ROI: Capture 100% of after-hours calls worth $1,500+ each

❄️ **HVAC:**
- "An HVAC company hired 2 receptionists for peak season. Now one AI handles unlimited calls, books maintenance visits, and follows up on quotes."
- Key features: Seasonal campaigns, maintenance scheduling, quote follow-ups
- ROI: Save $60,000/year in staffing costs

🏠 **ROOFING:**
- "A roofing company was chasing 50 leads manually. Now AI calls all leads within 5 minutes, qualifies budget and timeline, books inspections for closers only."
- Key features: Speed-to-lead calling, storm damage qualification, insurance coordination
- ROI: 300% more qualified appointments, close rate jumped to 45%

🌿 **LANDSCAPING:**
- "A landscaping company struggled with seasonal staffing. AI now handles spring rush, books consultations, and sends seasonal maintenance reminders."
- Key features: Seasonal campaigns, property assessment scheduling, recurring service management
- ROI: Handle 500% more leads during peak season without hiring

🏥 **HEALTHCARE:**
- "A dental practice was losing patients to hold times. AI now answers immediately, books appointments, and sends reminders. No-shows dropped 40%."
- Key features: HIPAA-compliant conversations, appointment scheduling, reminder sequences
- ROI: Fill 20+ more appointments per week

🏡 **REAL ESTATE:**
- "A realtor was missing buyer calls during showings. AI qualifies buyers, schedules viewings, and sends listing links. Closed 8 more deals last quarter."
- Key features: Lead qualification, showing scheduling, listing information, follow-up sequences
- ROI: Never miss a hot lead, 30% more closings

🚗 **AUTOMOTIVE:**
- "An auto shop was losing service calls to competitors. AI now books appointments, confirms vehicle details, and upsells recommended services."
- Key features: Service scheduling, vehicle history lookup, maintenance reminders
- ROI: 25% increase in service appointments

**HOW TO MATCH FEATURES TO THEIR NEEDS:**

If they mention "missing calls":
→ Emphasize 24/7 availability, voicemail intelligence, never missing leads
→ Example: "VoiceNow answers every single call, 24/7. Even at 2 AM, it qualifies the lead and books the appointment."

If they mention "lead quality":
→ Focus on automatic qualification, lead scoring, filtering tire-kickers
→ Example: "The AI asks qualifying questions to filter out tire-kickers. You only get serious prospects."

If they mention "time management":
→ Highlight automation, outbound calling, appointment booking
→ Example: "One AI can make hundreds of calls simultaneously. It's like having 50 sales reps."

If they mention "follow-ups":
→ Discuss workflow automation, automated sequences, CRM integration
→ Example: "Set it once and forget it. The AI follows up automatically via calls, texts, and emails."

If they mention "scaling":
→ Talk about unlimited concurrent calls, templates, rapid deployment
→ Example: "Handle 10x the call volume without hiring anyone. Scale instantly during busy seasons."

If they mention "cost":
→ Compare to hiring staff, mention free trial, flexible pricing
→ Example: "It costs less than one part-time employee but works 24/7 without breaks or sick days."

If they mention "security" or "data":
→ Emphasize compliance, encryption, and privacy protections
→ Example: "We're SOC 2 compliant with end-to-end encryption. Your data is never sold."

If they mention "terms" or "contract":
→ Mention no long-term contracts, cancel anytime, offer to text TOS link
→ Example: "No long-term contracts - cancel anytime. Want me to text you our Terms of Service?"

**BOOKING A SALES CALL:**
If they want to speak to a human or have complex questions:
"I'd love to connect you with one of our sales specialists who can give you a personalized demo. Would you prefer a call tomorrow morning or afternoon? I can text you a booking link right now."

**SENDING LINKS:**
Whenever appropriate, offer to text links:
- "Want me to text you the signup link so you have it ready?"
- "I can text you our Terms of Service if you'd like to review them."
- "Would you like me to send our Privacy Policy to your phone?"
- "Let me text you a link to book a call with our team."

**CONVERSATION EXAMPLES:**

Pain: "I miss too many calls"
You: "Perfect! VoiceNow answers every single call 24/7, even at 2 AM. It qualifies the lead, books the appointment, and texts you a summary. You wake up with your calendar full. Want me to text you the signup link?"

Pain: "I waste time with tire-kickers"
You: "That's exactly what we solve! The AI pre-qualifies every lead with smart questions. You only get calls from serious prospects ready to buy. Contractors see their close rate jump from 20% to 65%."

Pain: "I need to scale but can't afford more staff"
You: "One VoiceNow AI can make hundreds of calls simultaneously. Upload your lead list, the AI calls everyone, handles objections, and books qualified appointments. It's like having 50 sales reps for a fraction of the cost."

Pain: "What about security/privacy?"
You: "Great question! We're SOC 2 compliant with bank-level encryption. Your customer data is never sold and we're fully GDPR and CCPA compliant. Want me to text you our Privacy Policy?"

Pain: "I want to read the terms first"
You: "Absolutely! Our Terms of Service are straightforward - no long-term contracts, cancel anytime. I'll text you the link right now so you can review at your convenience."

**TONE & STYLE:**
- Conversational and enthusiastic (not robotic or scripted)
- Ask questions and listen actively
- Paint vivid pictures of how their life improves
- Use contractor/business language they understand
- Keep responses 15-25 seconds each
- Build urgency around the free trial
- Always offer to text links when relevant

**CLOSING:**
Always end with clear next step:
"Ready to see what VoiceNow can do? Start your free 14-day trial at remodely dot AI forward slash signup. You'll have your first agent live in 5 minutes. Want me to text you that link right now, or would you prefer to schedule a call with our sales team?"

Remember: This is ${firstName} at ${formattedNumber}. Detect voicemail IMMEDIATELY. If human answers, focus on THEIR pain points and show how VoiceNow solves them. Offer to text links when appropriate!`;

    const customFirstMessage = `Hi ${firstName}! This is the AI assistant from VoiceNow CRM. Thanks for requesting a demo! Do you have a couple minutes to chat?`;

    // Use Sarah - warm, sales-focused female voice (very distinct from default)
    const customVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Lead Gen voice (warm, professional female)

    // Get required env vars for call initiation
    const agentPhoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID || process.env.ELEVENLABS_PHONE_NUMBER_ID;
    const webhookUrl = process.env.WEBHOOK_URL || process.env.SERVER_URL || 'https://your-backend-url.com';

    let callData, callId;

    // Handle SMS vs Voice Call differently
    if (demoType === 'sms') {
      // For SMS demo, send initial SMS to user
      const twilioService = getTwilioService();
      const demoPhoneNumber = process.env.DEMO_SMS_NUMBER || '+1 (602) 833-7194';
      const smsMessage = `Hi ${firstName}! 👋 Thanks for your interest in VoiceNow CRM!\n\nI'm an AI assistant here to help. Ask me about:\n\n🎯 24/7 AI voice agents that never miss calls\n📅 Auto appointment booking & lead qualification\n🔄 Workflow automation & CRM integration\n💰 Pricing & free 14-day trial\n⚡ Quick 5-minute setup\n\nWhat would you like to know?`;

      try {
        await twilioService.sendSMS(formattedNumber, smsMessage);
        console.log(`✅ SMS sent to ${formattedNumber} from ${demoPhoneNumber}`);

        // Return success with phone number
        return res.json({
          success: true,
          message: 'SMS sent successfully!',
          type: 'sms',
          demoPhoneNumber: demoPhoneNumber
        });
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
        return res.status(500).json({
          error: 'Failed to send SMS',
          message: 'Sorry, we couldn\'t send the SMS. Please try again.'
        });
      }
    } else {
      // For voice demo, initiate call with Remodely Sales Agent (Max)
      // The agent already has the prompt, voice, and first message configured in ElevenLabs
      // No need to override - just pass dynamic variables for personalization
      callData = await elevenLabsService.initiateCall(
        agentId,
        formattedNumber,
        agentPhoneNumberId,
        `${webhookUrl}/api/webhooks/elevenlabs/conversation-event`,
        dynamicVariables,
        null, // Use agent's built-in prompt
        null, // Use agent's built-in first message
        null  // Use agent's built-in voice (Chris - male)
      );

      if (!callData) {
        return res.status(500).json({
          error: 'Failed to initiate call',
          message: 'Sorry, we couldn\'t place the call right now. Please try again or use the text chat.'
        });
      }

      // ElevenLabs Twilio outbound call returns: { success, message, conversation_id, callSid }
      callId = callData.conversation_id || callData.callSid || callData.id || callData.call_id;
      console.log(`✅ Voice demo call initiated via ElevenLabs:`, {
        success: callData.success,
        conversation_id: callData.conversation_id,
        callSid: callData.callSid,
        callId: callId
      });
    }

    // Register call for automatic post-call email monitoring
    if (callId) {
      callMonitorService.registerCall(callId, formattedNumber, {
        customer_name: firstName,
        lead_name: name,
        customer_phone: formattedNumber,
        customer_email: email || null,
        trigger_source: 'marketing_page_demo'
      });
      console.log(`✅ Call registered for automatic email follow-up`);
    }

    // Trigger workflow automation for demo call initiated
    try {
      await workflowEngine.handleTrigger('call_initiated', {
        callData: {
          id: callId,
          phoneNumber: formattedNumber,
          agentId: agentId,
          status: 'initiated',
          type: 'demo',
          source: 'marketing_page'
        },
        lead: {
          name: name,
          firstName: firstName,
          phone: formattedNumber,
          email: email || null
        },
        agent: {
          type: 'demo',
          id: agentId
        },
        metadata: dynamicVariables
      });
      console.log(`✅ Workflow triggered for demo call initiation`);
    } catch (workflowError) {
      console.error('Failed to trigger workflow:', workflowError);
      // Don't fail the request if workflow fails
    }

    // Send comprehensive lead notification to sales team
    try {
      const demoTypeLabel = demoType === 'sms' ? 'SMS Demo' : 'Voice Call Demo';
      const demoIcon = demoType === 'sms' ? '💬' : '📞';
      const isNewLead = createdLead && !createdLead.notes.some(n => n.content.includes('demo requested') && n.createdAt < new Date(Date.now() - 60000));
      const leadStatus = isNewLead ? '🆕 NEW LEAD' : '🔄 RETURNING LEAD';

      await emailService.sendEmail({
        to: 'help.remodely@gmail.com',
        subject: `${demoIcon} ${leadStatus} - ${demoTypeLabel} - ${name}`,
        text: `${leadStatus}: ${demoTypeLabel} Requested

Contact Information:
━━━━━━━━━━━━━━━━━━━━━
Name: ${name}
Email: ${email || 'Not provided'}
Phone: ${formattedNumber}

Demo Details:
━━━━━━━━━━━━━━━━━━━━━
Type: ${demoTypeLabel}
${callId ? `Call ID: ${callId}` : `SMS Sent: Yes`}
Request Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST

CRM Information:
━━━━━━━━━━━━━━━━━━━━━
${createdLead ? `Lead ID: ${createdLead._id}
Status: ${createdLead.status}
Priority: ${createdLead.priority}
Total Demo Requests: ${createdLead.metadata?.get('demoRequestCount') || 1}` : 'Lead creation pending'}

Rate Limiting:
━━━━━━━━━━━━━━━━━━━━━
Requests in 24h: ${demoRateLimitMap.get(formattedNumber)?.count || 1}/${DEMO_RATE_LIMIT.maxRequests}

Action Required:
━━━━━━━━━━━━━━━━━━━━━
${demoType === 'sms' ? '• Monitor SMS conversation for engagement\n• Follow up if no response within 1 hour' : '• Monitor call for success\n• Send follow-up email if call goes to voicemail'}
• Check CRM for lead status updates
• Schedule follow-up call if interested

Login to CRM: https://remodely.ai/leads`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-top: 10px; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
              .info-label { font-weight: 600; color: #4b5563; }
              .info-value { color: #111827; }
              .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
              .priority-high { color: #dc2626; font-weight: 700; }
              .action-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-top: 20px; }
              .action-box ul { margin: 10px 0; padding-left: 20px; }
              .action-box li { margin: 8px 0; color: #1e40af; }
              .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${demoIcon} ${leadStatus}</h1>
                <div class="badge">${demoTypeLabel} Requested</div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="section-title">Contact Information</div>
                  <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${name}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${email || '<em>Not provided</em>'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value"><strong>${formattedNumber}</strong></span>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Demo Details</div>
                  <div class="info-row">
                    <span class="info-label">Demo Type:</span>
                    <span class="info-value">${demoTypeLabel}</span>
                  </div>
                  ${callId ? `<div class="info-row">
                    <span class="info-label">Call ID:</span>
                    <span class="info-value"><code>${callId}</code></span>
                  </div>` : `<div class="info-row">
                    <span class="info-label">SMS Sent:</span>
                    <span class="info-value">✅ Yes</span>
                  </div>`}
                  <div class="info-row">
                    <span class="info-label">Request Time:</span>
                    <span class="info-value">${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST</span>
                  </div>
                </div>

                ${createdLead ? `<div class="section">
                  <div class="section-title">CRM Information</div>
                  <div class="info-row">
                    <span class="info-label">Lead ID:</span>
                    <span class="info-value"><code>${createdLead._id}</code></span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value"><span class="highlight">${createdLead.status.toUpperCase()}</span></span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Priority:</span>
                    <span class="info-value"><span class="priority-high">${createdLead.priority.toUpperCase()}</span></span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Demo Requests:</span>
                    <span class="info-value">${createdLead.metadata?.get('demoRequestCount') || 1} total</span>
                  </div>
                </div>` : ''}

                <div class="section">
                  <div class="section-title">Rate Limiting</div>
                  <div class="info-row">
                    <span class="info-label">Requests (24h):</span>
                    <span class="info-value">${demoRateLimitMap.get(formattedNumber)?.count || 1} of ${DEMO_RATE_LIMIT.maxRequests} maximum</span>
                  </div>
                </div>

                <div class="action-box">
                  <strong>⚡ Action Required:</strong>
                  <ul>
                    ${demoType === 'sms' ? `
                      <li>Monitor SMS conversation for engagement</li>
                      <li>Follow up if no response within 1 hour</li>
                    ` : `
                      <li>Monitor call for success</li>
                      <li>Send follow-up email if call goes to voicemail</li>
                    `}
                    <li>Check CRM for lead status updates</li>
                    <li>Schedule follow-up call if interested</li>
                  </ul>
                  <a href="https://remodely.ai/leads" class="btn">View Lead in CRM →</a>
                </div>
              </div>
              <div class="footer">
                <p>VoiceNow CRM - Lead Notification System</p>
                <p>This is an automated notification. Do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      console.log(`✅ Comprehensive lead notification sent to help.remodely@gmail.com`);
    } catch (emailError) {
      console.error('Failed to send lead notification:', emailError);
      // Don't fail the request if email fails
    }

    // REMOVED: Immediate customer email - now only sends post-call via webhook
    /*
    if (email) {
      try {
        await emailService.sendEmail({
          to: email,
          subject: `Your Remodely.ai Voice AI Demo is Calling You Now! 📞`,
          text: `Hi ${name}!\n\nThank you for requesting a demo of Remodely.ai!\n\nOur AI voice assistant is calling you right now at ${formattedNumber}. You should receive a call within 5-10 seconds.\n\nDuring the demo, our AI will:\n• Introduce herself and explain what Remodely.ai can do\n• Answer your questions about voice AI automation\n• Show you how businesses save 70-80% on staffing costs\n• Explain our pricing and free trial options\n\nWhat to Expect:\n✓ The call will be from an AI voice agent (ultra-realistic!)\n✓ Feel free to ask any questions about pricing, features, or setup\n✓ The demo takes about 3-5 minutes\n✓ No obligation - just a friendly introduction to our platform\n\nWant to Learn More?\nVisit our website: https://remodely.ai\nStart your free trial: https://remodely.ai/signup\nContact our team: help.remodely@gmail.com\n\nBest regards,\nThe Remodely.ai Team\n\nP.S. If you don't receive the call, please check that ${formattedNumber} is correct and try again!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Your Remodely.ai Demo is Calling You Now!</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📞 Your Demo is Calling You Now!</h1>
                </div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <p style="font-size: 18px; color: #0f172a; margin: 0 0 20px 0;">Hi ${name}! 👋</p>

                  <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for requesting a demo of <strong>Remodely.ai</strong>!
                  </p>

                  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 16px; color: #1e40af; font-weight: 600;">
                      🎙️ Our AI voice assistant is calling you right now at <strong>${formattedNumber}</strong>
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #3b82f6;">
                      You should receive a call within 5-10 seconds!
                    </p>
                  </div>

                  <h3 style="font-size: 18px; color: #0f172a; margin: 30px 0 15px 0;">During the demo, our AI will:</h3>
                  <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                    <li>Introduce herself and explain what Remodely.ai can do</li>
                    <li>Answer your questions about voice AI automation</li>
                    <li>Show you how businesses save 70-80% on staffing costs</li>
                    <li>Explain our pricing and free trial options</li>
                  </ul>

                  <h3 style="font-size: 18px; color: #0f172a; margin: 30px 0 15px 0;">What to Expect:</h3>
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #059669; font-size: 15px;">✓ The call will be from an AI voice agent (ultra-realistic!)</p>
                    <p style="margin: 0 0 10px 0; color: #059669; font-size: 15px;">✓ Feel free to ask any questions about pricing, features, or setup</p>
                    <p style="margin: 0 0 10px 0; color: #059669; font-size: 15px;">✓ The demo takes about 3-5 minutes</p>
                    <p style="margin: 0; color: #059669; font-size: 15px;">✓ No obligation - just a friendly introduction to our platform</p>
                  </div>

                  <h3 style="font-size: 18px; color: #0f172a; margin: 30px 0 15px 0;">Want to Learn More?</h3>
                  <div style="margin: 20px 0;">
                    <a href="https://remodely.ai" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 5px 5px 5px 0;">Visit Our Website</a>
                    <a href="https://remodely.ai/signup" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 5px 5px 5px 0;">Start Free Trial</a>
                  </div>

                  <p style="font-size: 15px; color: #64748b; margin: 30px 0 10px 0;">
                    Best regards,<br>
                    <strong style="color: #0f172a;">The Remodely.ai Team</strong>
                  </p>

                  <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <em>P.S. If you don't receive the call, please check that ${formattedNumber} is correct and try again!</em>
                  </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 13px;">
                    Need help? Contact us at <a href="mailto:help.remodely@gmail.com" style="color: #3b82f6; text-decoration: none;">help.remodely@gmail.com</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log(`✅ Confirmation email sent to customer: ${email}`);

        // (Old code - now handled by lead notification above)
      } catch (emailError) {
        console.error('Failed to send demo emails:', emailError);
      }
    }
    */

    res.json({
      success: true,
      message: 'Call initiated! You should receive a call from our AI agent shortly.',
      callId: callId
    });

  } catch (error) {
    console.error('Voice demo call error:', error);

    res.status(500).json({
      error: 'Failed to initiate call',
      message: 'Sorry, we couldn\'t place the call right now. Please try again or use the text chat.'
    });
  }
};

// Schedule a meeting/demo
export const scheduleMeeting = async (req, res) => {
  try {
    const { name, email, phone, date, time, timezone, notes, meetingType } = req.body;

    // Validate required fields
    if (!name || !email || !date || !time) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide name, email, date, and time.'
      });
    }

    // Import Meeting model dynamically
    const Meeting = (await import('../models/Meeting.js')).default;

    // Create meeting record
    const meeting = new Meeting({
      name,
      email,
      phone,
      date,
      time,
      timezone: timezone || 'America/New_York',
      meetingType: meetingType || 'demo',
      notes,
      status: 'scheduled',
      source: 'website'
    });

    await meeting.save();

    // Send confirmation email to customer
    const meetingDateTime = new Date(`${date}T${time}`);
    const formattedDate = meetingDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = meetingDateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone
    });

    await emailService.sendEmail({
      to: email,
      subject: 'Meeting Scheduled - VoiceNow CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Your Meeting is Scheduled!</h2>
          <p>Hi ${name},</p>
          <p>Thank you for scheduling a meeting with our team. We're excited to speak with you!</p>

          <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Meeting Details</h3>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${formattedTime} (${timezone})</p>
            <p style="margin: 8px 0;"><strong>Duration:</strong> 30 minutes</p>
            <p style="margin: 8px 0;"><strong>Type:</strong> ${meetingType === 'demo' ? 'Product Demo' : 'Sales Call'}</p>
            ${phone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
          </div>

          ${notes ? `<p><strong>Your notes:</strong> ${notes}</p>` : ''}

          <p>You'll receive a calendar invite shortly. If you need to reschedule or have any questions, please reply to this email.</p>

          <p>Looking forward to speaking with you!</p>

          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>VoiceNow CRM Sales Team</strong>
          </p>
        </div>
      `,
      text: `Your Meeting is Scheduled!\n\nHi ${name},\n\nThank you for scheduling a meeting with our team.\n\nMeeting Details:\nDate: ${formattedDate}\nTime: ${formattedTime} (${timezone})\nDuration: 30 minutes\n${phone ? `Phone: ${phone}\n` : ''}${notes ? `\nYour notes: ${notes}\n` : ''}\n\nLooking forward to speaking with you!\n\nBest regards,\nVoiceNow CRM Sales Team`
    });

    // Send notification to sales team
    await emailService.sendEmail({
      to: process.env.HELP_DESK_EMAIL || 'help.remodely@gmail.com',
      subject: `New Meeting Scheduled - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>New Meeting Scheduled</h2>
          <p>A new meeting has been scheduled through the website.</p>

          <h3>Customer Information:</h3>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
          </ul>

          <h3>Meeting Details:</h3>
          <ul>
            <li><strong>Date:</strong> ${formattedDate}</li>
            <li><strong>Time:</strong> ${formattedTime} (${timezone})</li>
            <li><strong>Type:</strong> ${meetingType}</li>
            ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
          </ul>

          <p><a href="mailto:${email}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Reply to Customer</a></p>
        </div>
      `,
      text: `New Meeting Scheduled\n\nCustomer: ${name}\nEmail: ${email}\n${phone ? `Phone: ${phone}\n` : ''}\n\nDate: ${formattedDate}\nTime: ${formattedTime} (${timezone})\nType: ${meetingType}\n${notes ? `Notes: ${notes}\n` : ''}`
    });

    res.json({
      success: true,
      message: 'Meeting scheduled successfully',
      meeting: {
        id: meeting._id,
        date,
        time,
        timezone
      }
    });

  } catch (error) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({
      error: 'Failed to schedule meeting',
      message: 'Sorry, we couldn\'t schedule your meeting. Please try again or contact us directly.'
    });
  }
};

// Handle booking request from /book page
export const handleBookingRequest = async (req, res) => {
  try {
    const { name, email, phone, company, industry, timePreference, notes, source } = req.body;

    console.log(`📅 New booking request from ${name} (${email})`);

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Create or update lead in CRM
    let lead = null;
    try {
      lead = await Lead.findOne({
        $or: [
          { phone: formattedPhone },
          { email: email.toLowerCase() }
        ]
      });

      if (lead) {
        // Update existing lead
        lead.name = name;
        lead.email = email.toLowerCase();
        lead.phone = formattedPhone;
        lead.status = 'interested';
        lead.priority = 'high';
        lead.source = source || 'booking_page';
        if (company) lead.company = company;
        if (notes) {
          lead.notes = lead.notes || [];
          lead.notes.push({
            content: `Booking request (${new Date().toLocaleDateString()}): Industry: ${industry || 'Not specified'}, Preferred time: ${timePreference || 'Not specified'}, Notes: ${notes || 'None'}`,
            createdBy: 'System',
            createdAt: new Date()
          });
        }
        lead.lastActivityAt = new Date();
        await lead.save();
        console.log(`📝 Updated existing lead: ${lead._id}`);
      } else {
        // Create new lead
        lead = await Lead.create({
          name,
          email: email.toLowerCase(),
          phone: formattedPhone,
          company: company || '',
          source: source || 'booking_page',
          status: 'interested',
          priority: 'high',
          qualified: true,
          qualificationScore: 75,
          lastActivityType: 'booking_request',
          lastActivityAt: new Date(),
          tags: ['booking_request', 'sales_call', industry || 'unknown_industry'],
          notes: [{
            content: `Sales call booking request. Industry: ${industry || 'Not specified'}, Preferred time: ${timePreference || 'Not specified'}, Notes: ${notes || 'None'}`,
            createdBy: 'System',
            createdAt: new Date()
          }],
          metadata: new Map([
            ['industry', industry || 'unknown'],
            ['timePreference', timePreference || 'asap'],
            ['bookingSource', source || 'booking_page'],
            ['requestDate', new Date().toISOString()]
          ])
        });
        console.log(`✨ Created new lead: ${lead._id}`);
      }
    } catch (leadError) {
      console.error('⚠️ Failed to create/update lead:', leadError);
    }

    // Send notification email to sales team
    try {
      await emailService.sendEmail({
        to: process.env.HELP_DESK_EMAIL || 'help.remodely@gmail.com',
        subject: `🔥 HOT LEAD - Sales Call Request - ${name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
              .info-label { font-weight: 600; color: #4b5563; }
              .info-value { color: #111827; }
              .action-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin-top: 20px; }
              .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔥 HOT LEAD - Sales Call Request</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">From the /book page - High intent prospect</p>
              </div>
              <div class="content">
                <h2 style="margin-top: 0; color: #111827;">Contact Information</h2>
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value"><strong>${name}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value"><a href="mailto:${email}">${email}</a></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value"><a href="tel:${formattedPhone}">${formattedPhone}</a></span>
                </div>
                ${company ? `<div class="info-row"><span class="info-label">Company:</span><span class="info-value">${company}</span></div>` : ''}
                ${industry ? `<div class="info-row"><span class="info-label">Industry:</span><span class="info-value">${industry}</span></div>` : ''}
                ${timePreference ? `<div class="info-row"><span class="info-label">Preferred Time:</span><span class="info-value">${timePreference}</span></div>` : ''}
                ${notes ? `<div class="info-row"><span class="info-label">Notes:</span><span class="info-value">${notes}</span></div>` : ''}

                <div class="action-box">
                  <h3 style="margin-top: 0; color: #92400e;">⚡ Action Required</h3>
                  <p style="margin: 0; color: #78350f;">This is a HIGH INTENT lead who requested a sales call. Call within 1 hour for best results!</p>
                </div>

                <div style="margin-top: 20px; text-align: center;">
                  <a href="tel:${formattedPhone}" class="btn">📞 Call Now</a>
                  <a href="mailto:${email}" class="btn">📧 Send Email</a>
                </div>

                <p style="margin-top: 20px; color: #6b7280; font-size: 14px; text-align: center;">
                  Request received: ${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `HOT LEAD - Sales Call Request\n\nName: ${name}\nEmail: ${email}\nPhone: ${formattedPhone}\n${company ? `Company: ${company}\n` : ''}${industry ? `Industry: ${industry}\n` : ''}${timePreference ? `Preferred Time: ${timePreference}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}\n\nCall within 1 hour for best results!`
      });
      console.log(`✅ Sales notification email sent`);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    // Send confirmation SMS to the lead
    try {
      const twilioService = getTwilioService();
      const smsMessage = `Hi ${name.split(' ')[0]}! 👋 Thanks for requesting a sales call with VoiceNow CRM.\n\nOur team will call you within 24 hours at this number.\n\nIn the meantime, start your free trial:\nhttps://remodely.ai/signup\n\n- Remodelee AI Team`;

      await twilioService.sendSMS(formattedPhone, smsMessage);
      console.log(`✅ Confirmation SMS sent to ${formattedPhone}`);
    } catch (smsError) {
      console.error('Failed to send confirmation SMS:', smsError);
    }

    res.json({
      success: true,
      message: 'Your request has been received! Our sales team will call you within 24 hours.',
      leadId: lead?._id
    });

  } catch (error) {
    console.error('Booking request error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again or call us directly at +1 (602) 833-7194.'
    });
  }
};

