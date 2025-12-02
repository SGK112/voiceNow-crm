import TwilioService from '../services/twilioService.js';
import emailService from '../services/emailService.js';
import AIService from '../services/aiService.js';
import WorkflowEngine from '../services/workflowEngine.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';
import VoiceAgent from '../models/VoiceAgent.js';
import { getCallRouter } from '../ai-agents/routers/callRouter.js';

const twilioService = new TwilioService();
const aiService = new AIService();
const workflowEngine = new WorkflowEngine();

/**
 * In-memory store for demo call metadata
 * Maps conversation_id to customer info for post-call follow-up emails
 * Entries expire after 1 hour
 */
const demoCallMetadataStore = new Map();
const METADATA_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Register demo call metadata for later use by webhook
 * Called when a demo call is initiated in publicChatController
 */
export const registerDemoCallMetadata = (conversationId, metadata) => {
  console.log(`📝 Registering demo call metadata for conversation ${conversationId}`);
  demoCallMetadataStore.set(conversationId, {
    ...metadata,
    registeredAt: Date.now()
  });

  // Clean up expired entries
  for (const [id, data] of demoCallMetadataStore.entries()) {
    if (Date.now() - data.registeredAt > METADATA_EXPIRY_MS) {
      demoCallMetadataStore.delete(id);
    }
  }
};

/**
 * Get demo call metadata by conversation ID
 */
export const getDemoCallMetadata = (conversationId) => {
  return demoCallMetadataStore.get(conversationId);
};

/**
 * Handle call completion webhook from ElevenLabs
 * This endpoint automatically populates the CRM with call data
 *
 * Endpoint: POST /api/webhooks/elevenlabs/:agentId
 */
export const handleCallComplete = async (req, res) => {
  try {
    const { agentId } = req.params;
    const callData = req.body;

    console.log(`📞 Call completion webhook received for agent: ${agentId}`);
    console.log(`   Call ID: ${callData.call_id || callData.conversation_id}`);

    // Get agent from database
    const agent = await VoiceAgent.findById(agentId);

    if (!agent) {
      console.error(`❌ Agent not found: ${agentId}`);
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Extract call information
    const phoneNumber = callData.caller_phone || callData.phone_number || callData.metadata?.customer_phone;
    const transcript = callData.transcript || '';
    const duration = callData.duration || 0;
    const elevenLabsCallId = callData.call_id || callData.conversation_id;

    console.log(`   Phone: ${phoneNumber || 'Unknown'}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Transcript length: ${transcript.length} chars`);

    // 1. Save call log
    const callLog = await CallLog.create({
      agentId: agent._id,
      userId: agent.userId,
      direction: 'inbound',
      phoneNumber: phoneNumber,
      duration: duration,
      transcript: transcript,
      status: 'completed',
      elevenLabsCallId: elevenLabsCallId,
      metadata: new Map(Object.entries({
        dynamicVariables: callData.dynamic_variables || callData.metadata || {},
        rawWebhookData: callData
      }))
    });

    console.log(`✅ CallLog created: ${callLog._id}`);

    // 2. Extract lead info from transcript using AI
    let leadInfo = {};

    if (transcript && aiService.isAvailable()) {
      try {
        leadInfo = await extractLeadInfoWithAI(transcript);
        console.log(`🤖 AI extracted lead info:`, leadInfo);
      } catch (aiError) {
        console.error('Failed to extract lead info:', aiError);
        leadInfo = {};
      }
    }

    // Fallback to metadata if AI extraction didn't work
    const extractedName = leadInfo.name || callData.metadata?.customer_name || callData.metadata?.lead_name;
    const extractedEmail = leadInfo.email || callData.metadata?.customer_email || callData.metadata?.lead_email;

    // 3. Create or update lead in CRM
    let lead = phoneNumber ? await Lead.findOne({ phone: phoneNumber }) : null;

    if (!lead && phoneNumber) {
      // Create new lead
      lead = await Lead.create({
        userId: agent.userId,
        name: extractedName || 'Unknown Caller',
        phone: phoneNumber,
        email: extractedEmail,
        source: 'voice_call',
        status: 'new',
        assignedTo: agent.userId,
        notes: `Call transcript (${new Date().toLocaleDateString()}):\n${transcript}`,
        lastContactDate: new Date()
      });

      console.log(`✨ New lead created: ${lead._id} - ${lead.name}`);
    } else if (lead) {
      // Update existing lead
      lead.notes += `\n\n--- Call on ${new Date().toLocaleString()} ---\n${transcript}`;
      lead.lastContactDate = new Date();

      // Update name/email if we have better info
      if (extractedName && lead.name === 'Unknown Caller') {
        lead.name = extractedName;
      }
      if (extractedEmail && !lead.email) {
        lead.email = extractedEmail;
      }

      await lead.save();
      console.log(`📝 Lead updated: ${lead._id} - ${lead.name}`);
    }

    // 4. Link call to lead
    if (lead) {
      callLog.leadId = lead._id;
      await callLog.save();
      console.log(`🔗 Call linked to lead: ${lead._id}`);
    }

    // 5. Analyze sentiment
    const sentiment = analyzeSentiment(transcript);
    console.log(`💬 Sentiment: ${sentiment}`);

    // 6. Detect intents (appointment booking, follow-up needed, etc.)
    const intents = await detectIntents(transcript);
    console.log(`🎯 Intents detected:`, intents);

    // 7. Trigger follow-up workflows if configured
    try {
      await workflowEngine.handleTrigger('call_completed', {
        callLog: {
          id: callLog._id,
          phoneNumber,
          duration,
          transcript,
          sentiment
        },
        lead: lead ? {
          id: lead._id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status
        } : null,
        agent: {
          id: agent._id,
          name: agent.name
        },
        intents
      });
      console.log(`✅ Workflows triggered for call completion`);
    } catch (workflowError) {
      console.error('Failed to trigger workflows:', workflowError);
    }

    // Return success
    res.json({
      success: true,
      message: 'Call processed and CRM updated',
      callLog: { _id: callLog._id },
      lead: lead ? { _id: lead._id, name: lead.name } : null,
      sentiment,
      intents
    });

  } catch (error) {
    console.error('❌ Call completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process call completion',
      error: error.message
    });
  }
};

/**
 * Extract lead information from transcript using AI
 */
async function extractLeadInfoWithAI(transcript) {
  if (!aiService.isAvailable()) {
    return {};
  }

  const prompt = `Extract contact information from this call transcript. Return ONLY valid JSON with these fields:
{
  "name": "person's full name or null",
  "email": "email address or null",
  "phone": "phone number or null",
  "intent": "what they wanted (brief description)"
}

Transcript:
${transcript}

Return only the JSON object, nothing else.`;

  try {
    const response = await aiService.chat([
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 200
    });

    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {};
  } catch (error) {
    console.error('AI extraction error:', error);
    return {};
  }
}

/**
 * Analyze sentiment of transcript
 */
function analyzeSentiment(transcript) {
  if (!transcript) return 'neutral';

  const lower = transcript.toLowerCase();

  const positive = ['great', 'thank', 'thanks', 'awesome', 'perfect', 'yes', 'appreciate', 'love', 'excellent', 'wonderful'];
  const negative = ['no', 'angry', 'frustrated', 'terrible', 'bad', 'upset', 'disappointed', 'cancel', 'refund'];

  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;

  if (posCount > negCount + 1) return 'positive';
  if (negCount > posCount + 1) return 'negative';
  return 'neutral';
}

/**
 * Detect intents from transcript
 */
async function detectIntents(transcript) {
  if (!transcript) return [];

  const intents = [];
  const lower = transcript.toLowerCase();

  // Simple keyword-based intent detection
  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('book')) {
    intents.push('appointment_request');
  }

  if (lower.includes('quote') || lower.includes('price') || lower.includes('cost')) {
    intents.push('pricing_inquiry');
  }

  if (lower.includes('support') || lower.includes('help') || lower.includes('issue') || lower.includes('problem')) {
    intents.push('support_request');
  }

  if (lower.includes('cancel') || lower.includes('refund')) {
    intents.push('cancellation_request');
  }

  return intents;
}

// Link templates for different content types
const LINK_TEMPLATES = {
  signup: {
    url: 'https://remodely.ai/signup',
    message: (name) => `${name ? `Hi ${name}!` : 'Hi!'} Thanks for your interest in VoiceNow CRM! 🤖\n\nStart your FREE 14-day trial (no credit card needed):\nhttps://remodely.ai/signup\n\nQuestions? Reply to this text!\n\n- Remodelee AI Team`,
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'
  },
  terms: {
    url: 'https://remodely.ai/terms.html',
    message: (name) => `${name ? `Hi ${name}!` : 'Hi!'} Here's our Terms of Service as requested:\nhttps://remodely.ai/terms.html\n\nKey points:\n✓ No long-term contracts\n✓ Cancel anytime\n✓ 30-day refund policy\n✓ TCPA compliant\n\nQuestions? Reply to this text!\n\n- Remodelee AI Team`,
    image: null
  },
  privacy: {
    url: 'https://remodely.ai/privacy.html',
    message: (name) => `${name ? `Hi ${name}!` : 'Hi!'} Here's our Privacy Policy as requested:\nhttps://remodely.ai/privacy.html\n\nYour data protection:\n🔒 SOC 2 compliant\n🔒 End-to-end encryption\n🔒 Never sell your data\n🔒 GDPR & CCPA compliant\n\nQuestions? Reply to this text!\n\n- Remodelee AI Team`,
    image: null
  },
  booking: {
    url: 'https://remodely.ai/book',
    message: (name) => `${name ? `Hi ${name}!` : 'Hi!'} Book a call with our sales team:\nhttps://remodely.ai/book\n\nWe'll give you a personalized demo and answer all your questions!\n\n📅 Pick a time that works for you.\n\n- Remodelee AI Team`,
    image: null
  },
  all_links: {
    url: null,
    message: (name) => `${name ? `Hi ${name}!` : 'Hi!'} Here are all the links you requested:\n\n🚀 Free Trial: https://remodely.ai/signup\n📋 Terms of Service: https://remodely.ai/terms.html\n🔒 Privacy Policy: https://remodely.ai/privacy.html\n📅 Book a Sales Call: https://remodely.ai/book\n\nQuestions? Reply to this text!\n\n- Remodelee AI Team`,
    image: null
  }
};

// Handle agent action: Send signup link via MMS with image during call
export const sendSignupLinkAction = async (req, res) => {
  try {
    const { phone_number, customer_name, conversation_id, link_type = 'signup' } = req.body;

    console.log(`📱 Agent requested ${link_type} link for ${customer_name} at ${phone_number}`);
    console.log(`   Conversation ID: ${conversation_id}`);

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Get the appropriate link template
    const template = LINK_TEMPLATES[link_type] || LINK_TEMPLATES.signup;
    const message = template.message(customer_name);

    // Send SMS or MMS depending on whether we have an image
    if (template.image) {
      await twilioService.sendMMSWithImage(phone_number, message, template.image);
      console.log(`✅ ${link_type} MMS with image sent to ${phone_number}`);
    } else {
      await twilioService.sendSMS(phone_number, message);
      console.log(`✅ ${link_type} SMS sent to ${phone_number}`);
    }

    // Return success to agent
    res.json({
      success: true,
      message: `${link_type} link sent successfully to ${phone_number}`,
      action: template.image ? 'mms_sent' : 'sms_sent',
      link_type: link_type
    });

  } catch (error) {
    console.error('Error sending link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send link'
    });
  }
};

// Handle agent action: Send Terms of Service link
export const sendTermsLinkAction = async (req, res) => {
  req.body.link_type = 'terms';
  return sendSignupLinkAction(req, res);
};

// Handle agent action: Send Privacy Policy link
export const sendPrivacyLinkAction = async (req, res) => {
  req.body.link_type = 'privacy';
  return sendSignupLinkAction(req, res);
};

// Handle agent action: Send calendar booking link
export const sendBookingLinkAction = async (req, res) => {
  req.body.link_type = 'booking';
  return sendSignupLinkAction(req, res);
};

// Handle agent action: Send all links at once
export const sendAllLinksAction = async (req, res) => {
  req.body.link_type = 'all_links';
  return sendSignupLinkAction(req, res);
};

// Helper function to extract email from transcript
const extractEmailFromTranscript = (transcript) => {
  if (!transcript) return null;

  // Email regex pattern
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = transcript.match(emailRegex);

  return emails ? emails[0] : null;
};

// Handle post-call follow-up (SMS + Email)
export const handlePostCallFollowUp = async (req, res) => {
  try {
    const {
      conversation_id,
      call_id,
      agent_id,
      metadata,
      transcript,
      analysis
    } = req.body;

    console.log(`📞 Post-call follow-up triggered for conversation ${conversation_id}`);
    console.log(`📝 Transcript:`, transcript);
    console.log(`📊 Metadata from webhook:`, metadata);

    // First try to get stored metadata from our demo call store
    const storedMetadata = getDemoCallMetadata(conversation_id);
    if (storedMetadata) {
      console.log(`📦 Found stored demo call metadata:`, storedMetadata);
    }

    // Merge webhook metadata with stored metadata (stored takes priority for fields we captured)
    const mergedMetadata = {
      ...metadata,
      ...storedMetadata
    };

    // Extract customer info from merged metadata
    const customerName = mergedMetadata?.customer_name || mergedMetadata?.lead_name || metadata?.customer_name || metadata?.lead_name || 'there';
    const customerPhone = mergedMetadata?.customer_phone || mergedMetadata?.lead_phone || metadata?.customer_phone || metadata?.lead_phone;
    let customerEmail = mergedMetadata?.customer_email || mergedMetadata?.lead_email || metadata?.customer_email || metadata?.lead_email;

    console.log(`📋 Extracted info - Name: ${customerName}, Phone: ${customerPhone}, Email: ${customerEmail || 'Not found in metadata'}`);

    // Try to extract email from transcript if not in metadata
    if (!customerEmail && transcript) {
      customerEmail = extractEmailFromTranscript(transcript);
      console.log(`📧 Email extracted from transcript: ${customerEmail}`);
    }

    // Send follow-up SMS if phone number available
    if (customerPhone) {
      try {
        const smsBody = `Hi ${customerName}! Thanks for chatting with our AI agent! 🤖\n\nReady to start your FREE VoiceNow CRM trial?\n👉 www.remodely.ai/signup\n\nQuestions? Reply to this text!\n\n- Remodelee AI Team`;

        await twilioService.sendSMS(customerPhone, smsBody);
        console.log(`✅ Post-call SMS sent to ${customerPhone}`);
      } catch (smsError) {
        console.error('Failed to send post-call SMS:', smsError);
      }
    }

    // Send follow-up email if email available
    if (customerEmail) {
      try {
        // Send customer confirmation email
        await emailService.sendEmail({
          to: customerEmail,
          subject: 'Thanks for Trying VoiceNow CRM! 🤖',
          text: `Hi ${customerName}!\n\nThanks for taking the time to chat with our AI voice agent! We hope you saw how realistic and helpful VoiceNow CRM can be.\n\n🎯 What's Next?\nStart your FREE 14-day trial of VoiceNow CRM (no credit card needed):\nwww.remodely.ai/signup\n\n💡 What You'll Get with VoiceNow CRM:\n✓ 24/7 AI agents that never miss calls\n✓ Automated lead qualification\n✓ Appointment booking\n✓ Custom workflows (no coding needed)\n✓ Full CRM included\n\n📞 Questions?\nReply to this email or call us anytime!\n\nBest regards,\nThe Remodelee AI Team`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Thanks for Trying VoiceNow CRM! 🤖</h1>
                </div>

                <div style="padding: 40px 30px;">
                  <p style="font-size: 18px; color: #0f172a;">Hi ${customerName}! 👋</p>

                  <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                    Thanks for taking the time to chat with our AI voice agent! We hope you saw how realistic and helpful <strong>VoiceNow CRM</strong> can be.
                  </p>

                  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px 0; color: #1e40af;">🎯 What's Next?</h3>
                    <p style="margin: 0; font-size: 16px; color: #3b82f6;">
                      Start your <strong>FREE 14-day trial of VoiceNow CRM</strong> (no credit card needed)
                    </p>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.remodely.ai/signup" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                      Start VoiceNow CRM Trial →
                    </a>
                  </div>

                  <h3 style="font-size: 18px; color: #0f172a; margin: 30px 0 15px 0;">💡 What You'll Get with VoiceNow CRM:</h3>
                  <ul style="color: #475569; font-size: 15px; line-height: 1.8;">
                    <li>✓ 24/7 AI agents that never miss calls</li>
                    <li>✓ Automated lead qualification</li>
                    <li>✓ Appointment booking</li>
                    <li>✓ Custom workflows (no coding needed)</li>
                    <li>✓ Full CRM included</li>
                  </ul>

                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #0f172a;">📞 Questions?</h4>
                    <p style="margin: 0; color: #64748b;">
                      Reply to this email or call us anytime!
                    </p>
                  </div>

                  <p style="font-size: 15px; color: #64748b; margin: 30px 0 0 0;">
                    Best regards,<br>
                    <strong style="color: #0f172a;">The Remodelee AI Team</strong>
                  </p>
                </div>

                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 13px;">
                    <a href="https://www.remodely.ai" style="color: #3b82f6; text-decoration: none;">Visit VoiceNow CRM</a> |
                    <a href="mailto:help.remodely@gmail.com" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log(`✅ Post-call confirmation email sent to ${customerEmail}`);

        // Generate AI-powered call analysis
        let callAnalysis = null;
        if (transcript && aiService.isAvailable()) {
          try {
            const analysisPrompt = `Analyze this sales call transcript and provide:
1. Lead Quality Score (1-10)
2. Interest Level (High/Medium/Low)
3. Key Pain Points mentioned
4. Objections raised
5. Next Best Action for sales team
6. Likelihood to Convert (%)

Transcript:
${transcript}

Provide a concise analysis in bullet points.`;

            callAnalysis = await aiService.chat([
              { role: 'user', content: analysisPrompt }
            ], {
              model: 'gpt-4o-mini', // Fast and cost-effective
              temperature: 0.3,
              maxTokens: 500
            });
            console.log(`✅ AI call analysis generated`);
          } catch (aiError) {
            console.error('Failed to generate AI analysis:', aiError);
            callAnalysis = null;
          }
        }

        // Send lead alert to business with analysis
        try {
          const transcriptSnippet = transcript ? transcript.substring(0, 500) : 'No transcript available';
          const fullTranscript = transcript || 'No transcript available';

          await emailService.sendEmail({
            to: 'help.remodely@gmail.com',
            subject: `🎯 New Demo Lead: ${customerName || 'Unknown'} ${customerPhone ? `(${customerPhone})` : ''}`,
            text: `New demo call completed!\n\nLead Information:\n- Name: ${customerName || 'Not provided'}\n- Phone: ${customerPhone || 'Not provided'}\n- Email: ${customerEmail}\n- Conversation ID: ${conversation_id}\n\n${callAnalysis ? `AI Call Analysis:\n${callAnalysis}\n\n` : ''}Conversation Snippet:\n${transcriptSnippet}\n\nFull Transcript:\n${fullTranscript}\n\nNext Steps:\n- Follow up with the lead\n- Check if they signed up for trial\n- Provide personalized assistance\n\nView full conversation in CRM dashboard.`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🎯 New Demo Lead!</h1>
                  </div>

                  <div style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #0f172a;">Lead Information</h2>

                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Name:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customerName || 'Not provided'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Phone:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customerPhone || 'Not provided'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Email:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customerEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Conversation ID:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-size: 12px;">${conversation_id}</td>
                      </tr>
                    </table>

                    ${callAnalysis ? `
                    <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">🤖 AI Call Analysis</h3>
                      <p style="margin: 0; font-size: 14px; color: #78350f; white-space: pre-wrap; line-height: 1.6;">${callAnalysis}</p>
                    </div>
                    ` : ''}

                    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
                      <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">📝 Conversation Snippet</h3>
                      <p style="margin: 0; font-size: 14px; color: #475569; font-family: monospace; white-space: pre-wrap;">${transcriptSnippet}</p>
                    </div>

                    <div style="background-color: #f1f5f9; padding: 20px; margin: 20px 0; border-radius: 8px;">
                      <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">📄 Full Transcript</h3>
                      <p style="margin: 0; font-size: 13px; color: #475569; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${fullTranscript}</p>
                    </div>

                    <div style="background-color: #eff6ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
                      <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">✅ Next Steps</h3>
                      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #475569;">
                        <li style="margin-bottom: 8px;">Follow up with the lead within 24 hours</li>
                        <li style="margin-bottom: 8px;">Check if they signed up for trial</li>
                        <li style="margin-bottom: 8px;">Provide personalized assistance</li>
                        <li>View full conversation in CRM dashboard</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `
          });
          console.log(`✅ Lead alert email sent to business`);

          // Send SMS notification to sales team
          try {
            const callTime = new Date().toLocaleString('en-US', {
              timeZone: 'America/Phoenix',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            const smsNotification = `📞 NEW DEMO CALL COMPLETED!\n\nName: ${customerName || 'Unknown'}\nPhone: ${customerPhone || 'Not provided'}\nEmail: ${customerEmail || 'Not provided'}\nTime: ${callTime} MST\n\n${callAnalysis ? '🤖 AI says: ' + callAnalysis.substring(0, 100) + '...' : ''}`;

            await twilioService.sendSMS('+16028337194', smsNotification);
            console.log(`✅ Post-call SMS notification sent to sales team`);
          } catch (smsNotifyError) {
            console.error('Failed to send post-call SMS notification:', smsNotifyError);
          }

        } catch (alertError) {
          console.error('Failed to send lead alert email:', alertError);
        }

      } catch (emailError) {
        console.error('Failed to send post-call email:', emailError);
      }
    }

    // Send SMS notification even if no email (phone-only leads)
    if (!customerEmail && customerPhone) {
      try {
        const callTime = new Date().toLocaleString('en-US', {
          timeZone: 'America/Phoenix',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const smsNotification = `📞 NEW DEMO CALL!\n\nName: ${customerName || 'Unknown'}\nPhone: ${customerPhone}\nTime: ${callTime} MST\n\n⚠️ No email - phone only lead!`;

        await twilioService.sendSMS('+16028337194', smsNotification);
        console.log(`✅ Phone-only lead SMS notification sent to sales team`);
      } catch (smsNotifyError) {
        console.error('Failed to send phone-only lead SMS notification:', smsNotifyError);
      }
    }

    // Trigger workflow automation for call completed
    try {
      await workflowEngine.handleTrigger('call_completed', {
        callData: {
          id: call_id,
          conversationId: conversation_id,
          agentId: agent_id,
          phoneNumber: customerPhone,
          status: 'completed',
          transcript: transcript || '',
          analysis: analysis || {},
          metadata: metadata || {}
        },
        lead: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail
        },
        agent: {
          id: agent_id
        },
        aiAnalysis: callAnalysis || null
      });
      console.log(`✅ Workflow triggered for call completion`);
    } catch (workflowError) {
      console.error('Failed to trigger workflow:', workflowError);
      // Don't fail the request if workflow fails
    }

    // Send success response
    res.json({
      success: true,
      message: 'Post-call follow-up sent',
      sms_sent: !!customerPhone,
      email_sent: !!customerEmail,
      workflow_triggered: true
    });

  } catch (error) {
    console.error('Error in post-call follow-up:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send follow-up'
    });
  }
};

// Handle ElevenLabs conversation events
export const handleConversationEvent = async (req, res) => {
  try {
    const event = req.body;

    console.log(`🔔 ElevenLabs webhook called!`);
    console.log(`   Full event:`, JSON.stringify(event, null, 2));
    console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));

    // Handle different event types
    switch (event.type) {
      case 'conversation.started':
        console.log(`🎙️  Conversation started: ${event.conversation_id}`);
        break;

      case 'conversation.ended':
        console.log(`🏁 Conversation ended: ${event.conversation_id}`);
        // Trigger post-call follow-up
        await handlePostCallFollowUp(req, res);
        return;

      case 'agent.interrupted':
        console.log(`🔇 Agent interrupted in conversation ${event.conversation_id}`);
        break;

      case 'user.spoke':
        console.log(`🗣️  User spoke: "${event.transcript}"`);
        break;

      case 'agent.tool_called':
      case 'tool.called':
        // Handle tool execution request from agent
        const toolName = event.tool_name || event.name;
        console.log(`🔧 Tool called: ${toolName}`);
        console.log(`   Parameters:`, event.parameters || event.tool_parameters);

        const params = event.parameters || event.tool_parameters || {};
        const phoneNumber = params.phone_number;
        const customerName = params.customer_name;

        // Map tool names to link types
        const toolToLinkType = {
          'send_signup_link': 'signup',
          'send_terms_link': 'terms',
          'send_privacy_link': 'privacy',
          'send_booking_link': 'booking',
          'send_all_links': 'all_links'
        };

        const linkType = toolToLinkType[toolName];

        if (linkType) {
          try {
            const template = LINK_TEMPLATES[linkType];
            const message = template.message(customerName);

            // Send SMS or MMS depending on whether we have an image
            if (template.image) {
              await twilioService.sendMMSWithImage(phoneNumber, message, template.image);
              console.log(`✅ ${linkType} MMS with image sent to ${phoneNumber} via tool call`);
            } else {
              await twilioService.sendSMS(phoneNumber, message);
              console.log(`✅ ${linkType} SMS sent to ${phoneNumber} via tool call`);
            }

            // Respond with success
            res.json({
              success: true,
              tool_result: {
                message: `${linkType} link sent successfully to ${phoneNumber}`,
                status: 'sent',
                link_type: linkType
              }
            });
            return;
          } catch (error) {
            console.error('Error executing tool:', error);
            res.json({
              success: false,
              tool_result: {
                error: `Failed to send ${linkType} link`,
                status: 'failed'
              }
            });
            return;
          }
        }
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
        console.log(`   Full event:`, JSON.stringify(event, null, 2));
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error handling conversation event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle event'
    });
  }
};

// Test endpoint to verify webhook setup
export const testWebhook = async (req, res) => {
  try {
    console.log('🧪 Webhook test endpoint called');
    console.log('Request body:', req.body);
    console.log('Request query:', req.query);

    res.json({
      success: true,
      message: 'Webhook endpoint is working!',
      timestamp: new Date().toISOString(),
      received: {
        body: req.body,
        query: req.query
      }
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Early call routing handler
 * Called during initial seconds of call to detect voicemail and route appropriately
 *
 * Endpoint: POST /api/ai/route-call
 * Body: { callId, transcript }
 */
export const routeCall = async (req, res) => {
  try {
    const { callId, transcript } = req.body;

    if (!callId || !transcript) {
      return res.status(400).json({
        success: false,
        error: 'callId and transcript are required'
      });
    }

    console.log(`🎯 Routing call ${callId} with transcript: "${transcript.substring(0, 100)}..."`);

    // Use LangGraph router to analyze intent and route
    const router = getCallRouter();
    const routingResult = await router.route(callId, transcript);

    console.log(`📊 Routing result:`, routingResult);

    // Return routing decision
    res.json(routingResult);

  } catch (error) {
    console.error('❌ Call routing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      route: 'general_agent', // Fallback
      response: 'How can I help you today?'
    });
  }
};
