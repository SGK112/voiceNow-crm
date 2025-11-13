import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// System prompt for marketing chat AI
const MARKETING_SYSTEM_PROMPT = `You are a helpful AI assistant for Remodely AI's VoiceFlow CRM platform. You help potential customers learn about our product.

KEY INFORMATION:
Company: Remodely AI
Product: VoiceFlow CRM
Tagline: "AI Voice Workflows & Automation Platform"

WHAT WE DO:
- Build custom AI voice agents for businesses (done-for-you service)
- Provide n8n-style visual workflow automation
- Offer easy no-code OAuth integrations
- Enable call routing and automated workflows
- Provide a complete CRM platform for managing leads and customers

PRICING:
- Starter: $149/month - 1 AI voice agent, 500 minutes/month, basic CRM features
- Professional: $299/month - 3 AI voice agents, 2,000 minutes/month, advanced workflows
- Enterprise: Custom pricing - Unlimited agents, custom integrations, dedicated support
- All plans include a 14-day free trial

KEY FEATURES:
- Done-for-you AI agent setup (we build it for you)
- Visual workflow builder (drag-and-drop, like n8n)
- Pre-built integrations (Gmail, Google Calendar, Stripe, Twilio, etc.)
- Lead management and CRM
- Real-time analytics and call tracking
- 24/7 automated customer engagement

TARGET AUDIENCE:
- Contractors and service businesses (plumbers, electricians, roofers)
- Small businesses that want to automate phone handling
- Companies that want to capture leads 24/7

YOUR TONE:
- Friendly and helpful
- Not too technical (our users aren't IT experts)
- Focus on benefits, not just features
- Always offer to help them start a free trial
- Keep responses concise (2-4 sentences max)

If asked about something you don't know, offer to connect them with our team.`;

export const marketingChat = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if OpenAI is configured
    if (!openai) {
      return res.status(503).json({
        error: 'AI chat is currently unavailable. Please contact our team directly.',
        fallbackResponse: "Thanks for your interest! Our AI assistant is temporarily unavailable, but our team would love to help you. Please email us at support@remodely.ai or schedule a demo to learn more about VoiceFlow CRM!"
      });
    }

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: MARKETING_SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective
      messages: messages,
      temperature: 0.7,
      max_tokens: 200, // Keep responses concise
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({ response: aiResponse });

  } catch (error) {
    console.error('Marketing chat error:', error);
    res.status(500).json({
      error: 'Failed to get AI response',
      fallbackResponse: "I apologize, but I'm having trouble responding right now. Our VoiceFlow CRM platform offers AI voice agents, workflow automation, and CRM features starting at $149/month with a 14-day free trial. Would you like to start your trial or speak with our team?"
    });
  }
};
