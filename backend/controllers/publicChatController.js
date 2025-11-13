import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import emailService from '../services/emailService.js';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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

    res.status(500).json({
      error: 'Failed to get AI response',
      fallbackResponse,
      suggestions: generateFollowUps(intent, req.body.conversationHistory || [])
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

    const emailSubject = `🚀 New Contact Sales Request - ${interestLabels[interest] || interest}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .field { margin-bottom: 20px; }
          .field-label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .field-value { background: white; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #3b82f6; }
          .message-box { background: white; padding: 16px; border-radius: 8px; border-left: 3px solid #3b82f6; white-space: pre-wrap; }
          .badge { display: inline-block; padding: 4px 12px; background: #3b82f6; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Sales Contact Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone is interested in VoiceFlow CRM!</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">Interest Type</div>
              <div class="field-value">
                <span class="badge">${interestLabels[interest] || interest}</span>
              </div>
            </div>

            <div class="field">
              <div class="field-label">Contact Name</div>
              <div class="field-value">${name}</div>
            </div>

            <div class="field">
              <div class="field-label">Email Address</div>
              <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>

            ${phone ? `
            <div class="field">
              <div class="field-label">Phone Number</div>
              <div class="field-value"><a href="tel:${phone}">${phone}</a></div>
            </div>
            ` : ''}

            ${company ? `
            <div class="field">
              <div class="field-label">Company</div>
              <div class="field-value">${company}</div>
            </div>
            ` : ''}

            <div class="field">
              <div class="field-label">Message</div>
              <div class="message-box">${message}</div>
            </div>

            <div class="field">
              <div class="field-label">Source</div>
              <div class="field-value">${source || 'Unknown'}</div>
            </div>

            <div class="footer">
              <p><strong>⏰ Received:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
              <p><strong>🎯 Quick Action:</strong> Reply directly to ${email} or call ${phone || 'N/A'}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
New Contact Sales Request

Interest: ${interestLabels[interest] || interest}
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Company: ${company || 'Not provided'}

Message:
${message}

Source: ${source || 'Unknown'}
Received: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
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
    const confirmationSubject = '✅ Thank you for contacting VoiceFlow CRM';
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 64px; text-align: center; margin-bottom: 20px; }
          .message { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Message Received!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">We'll be in touch soon</p>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>

            <div class="message">
              <p>Hi ${name},</p>
              <p>Thank you for your interest in VoiceFlow CRM! We've received your message about <strong>${interestLabels[interest] || interest}</strong> and our sales team will reach out to you within 24 hours.</p>
              <p>In the meantime, feel free to explore our platform:</p>
              <div style="text-align: center;">
                <a href="https://voiceflowcrm.com" class="cta-button">Visit Our Website</a>
              </div>
            </div>

            <div class="message">
              <h3 style="margin-top: 0;">📋 Your Request Details:</h3>
              <p><strong>Interest:</strong> ${interestLabels[interest] || interest}</p>
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              <p><strong>Email:</strong> ${email}</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            </div>

            <div class="footer">
              <p>Need immediate assistance? Email us at <a href="mailto:help.remodely@gmail.com">help.remodely@gmail.com</a></p>
              <p>© 2025 VoiceFlow CRM by Remodely. All rights reserved.</p>
            </div>
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
