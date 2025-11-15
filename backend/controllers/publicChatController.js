import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import emailService from '../services/emailService.js';
import ElevenLabsService from '../services/elevenLabsService.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Lazy initialization to ensure env vars are loaded
let elevenLabsServiceInstance = null;
const getElevenLabsService = () => {
  if (!elevenLabsServiceInstance) {
    elevenLabsServiceInstance = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
  }
  return elevenLabsServiceInstance;
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
    'what is': 'Remodely is an AI-powered voice agent platform that helps businesses automate phone calls, qualify leads, and manage customers through voice conversations and CRM tools.',
    'how does it work': 'We build custom AI voice agents for your business. They handle calls 24/7, qualify leads, book appointments, and integrate with your existing tools through our visual workflow builder.',
    'pricing': 'We have three plans: Starter at $149/month for small businesses, Professional at $299/month (most popular) for growing teams, and Enterprise with custom pricing for large organizations. All plans include a 14-day free trial!',
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
const MARKETING_SYSTEM_PROMPT = `You are an expert sales consultant for Remodely's VoiceFlow CRM platform. You excel at understanding customer needs and providing personalized, helpful responses.

CORE IDENTITY:
Company: Remodely (formerly Remodely AI)
Product: VoiceFlow CRM - AI Voice Workflows & Automation Platform
Mission: Help businesses automate operations with AI voice agents

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
        fallbackResponse: "Thanks for your interest! Our AI assistant is temporarily unavailable, but our team would love to help you. Please email us at support@remodely.ai or schedule a demo to learn more about VoiceFlow CRM!",
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
      fallbackResponse += "Our VoiceFlow CRM platform offers AI voice agents, workflow automation, and CRM features starting at $149/month with a 14-day free trial. Would you like to start your trial?";
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
      agentId: 'agent_9701k9xptd0kfr383djx5zk7300x'
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
              This inquiry was automatically captured by VoiceFlow CRM
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
This inquiry was automatically captured by VoiceFlow CRM
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
    const confirmationSubject = 'Thank you for contacting VoiceFlow CRM';
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
            <p>Thank you for reaching out to VoiceFlow CRM</p>
          </div>
          <div class="content">
            <div class="success-icon">
              <svg fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>

            <div class="message">
              <p>Dear ${name},</p>
              <p>Thank you for your interest in VoiceFlow CRM. We have successfully received your inquiry regarding <strong>${interestLabels[interest] || interest}</strong>.</p>
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
                While you wait, explore what VoiceFlow CRM can do for your business
              </p>
              <a href="https://voiceflowcrm.com" class="cta-button">Learn More About VoiceFlow CRM</a>
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
            <p class="footer-text" style="font-weight: 600; color: #374151; margin-bottom: 4px;">VoiceFlow CRM</p>
            <p class="footer-text">AI-Powered Voice Communication Platform</p>
            <p class="footer-text" style="margin-top: 16px;">© 2025 VoiceFlow CRM by Remodely. All rights reserved.</p>
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

// Request a voice demo call using ElevenLabs batch calling
export const requestVoiceDemo = async (req, res) => {
  try {
    const { phoneNumber, name, email } = req.body;

    // Validate required fields
    if (!phoneNumber || !name) {
      return res.status(400).json({
        error: 'Phone number and name are required',
        message: 'Please provide your name and phone number to receive the demo call.'
      });
    }

    // Format phone number (ensure it has + prefix for international format)
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      // Assume US number if no country code
      formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
    }

    // Use the demo agent (the one from marketing page widget)
    // Note: Using the fallback agent ID as the primary since ELEVENLABS_LEAD_GEN_AGENT_ID may not exist
    const demoAgentId = 'agent_9701k9xptd0kfr383djx5zk7300x';
    const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

    if (!agentPhoneNumberId) {
      return res.status(503).json({
        error: 'Voice demo temporarily unavailable',
        message: 'Please try the text chat or contact us at help.remodely@gmail.com'
      });
    }

    console.log(`📞 Initiating ElevenLabs voice demo call to ${name} at ${formattedNumber}`);

    // Personalize the call with the user's name
    const dynamicVariables = {
      customer_name: name,
      lead_name: name,
      lead_phone: formattedNumber,
      lead_email: email || '',
      company_name: 'Remodelee.ai',
      demo_type: 'marketing_website_demo'
    };

    // Personalized first message for the demo call
    const personalizedFirstMessage = `Hi ${name}! Thanks for requesting a demo. I'm an AI voice agent from Remodelee dot A I, and I'm here to show you how voice AI like me can help automate your business communications. How are you doing today?`;

    // Personalized script that instructs the agent to use the customer's name
    const personalizedScript = `You are a friendly AI voice agent for Remodelee.ai, a voice AI automation platform for contractors.

IMPORTANT: The customer's name is ${name}. Use their name naturally in conversation.

Your role:
- You just called ${name} because they requested a demo from our website
- Give them a quick 60-90 second demo of how you work
- Show them you're intelligent, helpful, and natural
- Ask about their business and what tasks they'd like to automate
- Mention key features: 24/7 availability, natural conversations, CRM integration
- End by offering to have our team reach out with pricing and next steps

Be conversational and enthusiastic! This is their first experience with voice AI.`;

    // Initiate call using ElevenLabs batch calling (same as CRM does)
    const callData = await getElevenLabsService().initiateCall(
      demoAgentId,
      formattedNumber,
      agentPhoneNumberId,
      null, // no webhook for public demo
      dynamicVariables,
      personalizedScript, // send personalized script with customer name
      personalizedFirstMessage
    );

    console.log(`✅ Voice demo call initiated:`, callData.id || callData.call_id);

    // Send email confirmation to customer if email provided
    if (email) {
      try {
        // Send confirmation to customer
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

        // Also send notification to sales team
        await emailService.sendEmail({
          to: process.env.SMTP_FROM_EMAIL,
          subject: `New Voice Demo Request - ${name}`,
          text: `New voice demo request received:\n\nName: ${name}\nEmail: ${email}\nPhone: ${formattedNumber}\nCall ID: ${callData.id || callData.call_id}\n\nDemo call initiated via ElevenLabs.`,
          html: `
            <h2>New Voice Demo Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${formattedNumber}</p>
            <p><strong>Call ID:</strong> ${callData.id || callData.call_id}</p>
            <p><em>Demo call initiated via ElevenLabs batch calling.</em></p>
          `
        });
        console.log(`✅ Notification email sent to sales team`);
      } catch (emailError) {
        console.error('Failed to send demo emails:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Call initiated! You should receive a call from our AI agent shortly.',
      callId: callData.id || callData.call_id
    });

  } catch (error) {
    console.error('Voice demo call error:', error);

    res.status(500).json({
      error: 'Failed to initiate call',
      message: 'Sorry, we couldn\'t place the call right now. Please try again or use the text chat.'
    });
  }
};

