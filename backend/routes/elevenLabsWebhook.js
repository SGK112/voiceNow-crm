import express from 'express';
import agentSMSService from '../services/agentSMSService.js';
import googleCalendar from '../services/googleCalendar.js';
import nodemailer from 'nodemailer';
import browserAgentService from '../services/browserAgentService.js';
import {
  verifyWebhookToken,
  verifyWebhookTimestamp,
  webhookRateLimit
} from '../middleware/webhookAuth.js';
import {
  extractLeadDataFromTranscript,
  calculateLeadScore,
  getLeadQuality,
  estimateDealValue,
  generateNextSteps
} from '../services/aiExtractionService.js';
import Lead from '../models/Lead.js';
import Task from '../models/Task.js';
import VoiceAgent from '../models/VoiceAgent.js';

const router = express.Router();

// Apply security middleware to all webhook routes
router.use(webhookRateLimit(200, 60000)); // 200 requests per minute
router.use(verifyWebhookToken); // Verify webhook secret token
router.use(verifyWebhookTimestamp(300)); // Reject requests older than 5 minutes

// Email transporter (using SMTP configuration)
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * ElevenLabs Client Tools Webhook
 *
 * This endpoint receives tool invocation requests from ElevenLabs agents
 * during phone conversations. The agent decides to use a tool (like send_sms),
 * ElevenLabs calls this webhook, we execute the tool, and return the result.
 */
router.post('/tool-invocation', async (req, res) => {
  try {
    const { tool_name, tool_parameters, call_id, agent_id, conversation_id } = req.body;

    console.log('\n📞 Tool Invocation Received:');
    console.log('   Tool:', tool_name);
    console.log('   Parameters:', JSON.stringify(tool_parameters, null, 2));
    console.log('   Call ID:', call_id);
    console.log('   Agent ID:', agent_id);

    let result = {};

    switch (tool_name) {
      case 'send_sms':
        result = await handleSendSMS(tool_parameters, agent_id, call_id);
        break;

      case 'send_email':
        result = await handleSendEmail(tool_parameters, agent_id, call_id);
        break;

      case 'send_sms_link':
        result = await handleSendSMSLink(tool_parameters, agent_id, call_id);
        break;

      case 'send_follow_up_email':
        result = await handleSendFollowUpEmail(tool_parameters, agent_id, call_id);
        break;

      case 'book_sales_call':
        result = await handleBookSalesCall(tool_parameters, agent_id, call_id);
        break;

      case 'create_lead_notification':
        result = await handleCreateLeadNotification(tool_parameters, agent_id, call_id);
        break;

      case 'end_call':
        result = { success: true, message: 'Call ending' };
        break;

      // Browser automation tools
      case 'research_company':
        result = await handleResearchCompany(tool_parameters, agent_id, call_id);
        break;

      case 'check_calendar_availability':
        result = await handleCheckAvailability(tool_parameters, agent_id, call_id);
        break;

      case 'fill_web_form':
        result = await handleFillWebForm(tool_parameters, agent_id, call_id);
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool: ${tool_name}`
        };
    }

    console.log('   Result:', JSON.stringify(result, null, 2));

    // Return result to ElevenLabs
    res.json({
      tool_name,
      result,
      success: result.success !== false
    });

  } catch (error) {
    console.error('❌ Tool invocation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Handle SMS sending during call
 */
async function handleSendSMS(parameters, agentId, callId) {
  try {
    const { to, message } = parameters;

    if (!to || !message) {
      return {
        success: false,
        error: 'Missing required parameters: to, message'
      };
    }

    // Send SMS using Twilio
    const smsResult = await agentSMSService.sendSMS({
      agentId,
      to,
      message,
      userId: null, // Will be set to null for now during call-time SMS
      metadata: {
        callId,
        sentDuringCall: true,
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      message: 'SMS sent successfully',
      smsId: smsResult._id,
      to,
      status: smsResult.status
    };

  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle email sending during call
 */
async function handleSendEmail(parameters, agentId, callId) {
  try {
    const { to, subject, body } = parameters;

    if (!to || !subject || !body) {
      return {
        success: false,
        error: 'Missing required parameters: to, subject, body'
      };
    }

    // Send email
    const info = await emailTransporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'VoiceNow CRM'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">${subject}</h2>
          <div style="color: #666; line-height: 1.6;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            This email was sent during a phone conversation via VoiceNow CRM.<br>
            Call ID: ${callId} | Agent ID: ${agentId}
          </p>
        </div>
      `,
      text: body
    });

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      to
    };

  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle sending SMS with specific links (VoiceNow CRM Sales Agent tool)
 * Link types: signup, booking, terms, privacy
 */
async function handleSendSMSLink(parameters, agentId, callId) {
  try {
    const { customer_phone, link_type, customer_name } = parameters;

    if (!customer_phone || !link_type) {
      return {
        success: false,
        error: 'Missing required parameters: customer_phone, link_type'
      };
    }

    // Map link types to actual URLs
    const linkMap = {
      signup: 'https://voicenowcrm.com/signup',
      booking: 'https://voicenowcrm.com/book',
      terms: 'https://voicenowcrm.com/terms.html',
      privacy: 'https://voicenowcrm.com/privacy.html',
      pricing: 'https://voicenowcrm.com/#pricing'
    };

    const url = linkMap[link_type.toLowerCase()];
    if (!url) {
      return {
        success: false,
        error: `Unknown link type: ${link_type}. Available: signup, booking, terms, privacy, pricing`
      };
    }

    // Build personalized message
    const name = customer_name?.split(' ')[0] || 'there';
    let message;

    switch (link_type.toLowerCase()) {
      case 'signup':
        message = `Hi ${name}! Here's your link to get started with VoiceNow CRM - 50 free minutes, no credit card required: ${url} - Max from VoiceNow CRM AI`;
        break;
      case 'booking':
        message = `Hi ${name}! Book your personalized sales call here: ${url} - We'll show you exactly how AI can transform your business. - Max from VoiceNow CRM AI`;
        break;
      case 'terms':
        message = `Hi ${name}, here's our Terms of Service: ${url} - Max from VoiceNow CRM AI`;
        break;
      case 'privacy':
        message = `Hi ${name}, here's our Privacy Policy: ${url} - Max from VoiceNow CRM AI`;
        break;
      case 'pricing':
        message = `Hi ${name}! Check out our pricing plans here: ${url} - Max from VoiceNow CRM AI`;
        break;
      default:
        message = `Hi ${name}! Here's the link you requested: ${url} - Max from VoiceNow CRM AI`;
    }

    // Send SMS using Twilio
    const smsResult = await agentSMSService.sendSMS({
      agentId,
      to: customer_phone,
      message,
      userId: null,
      metadata: {
        callId,
        linkType: link_type,
        sentDuringCall: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✅ SMS link (${link_type}) sent to ${customer_phone}`);

    return {
      success: true,
      message: `SMS with ${link_type} link sent successfully`,
      smsId: smsResult._id,
      to: customer_phone,
      linkSent: url
    };

  } catch (error) {
    console.error('Failed to send SMS link:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle sending follow-up email after call (VoiceNow CRM Sales Agent tool)
 */
async function handleSendFollowUpEmail(parameters, agentId, callId) {
  try {
    const {
      customer_email,
      customer_name,
      industry,
      interests,
      call_summary
    } = parameters;

    if (!customer_email) {
      return {
        success: false,
        error: 'Missing required parameter: customer_email'
      };
    }

    const name = customer_name?.split(' ')[0] || 'there';
    const industryText = industry || 'your industry';
    const interestsList = interests ? interests.split(',').map(i => i.trim()) : [];

    // Build personalized email
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">VoiceNow CRM</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI-Powered Business Automation</p>
        </div>

        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}!</h2>

          <p style="color: #4b5563; line-height: 1.6;">
            Great speaking with you about how AI voice agents can transform ${industryText} businesses!
            I wanted to follow up with some resources to help you get started.
          </p>

          ${interestsList.length > 0 ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1f2937; margin-top: 0;">Based on our conversation, you're interested in:</h3>
            <ul style="color: #4b5563;">
              ${interestsList.map(interest => `<li>${interest}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${call_summary ? `
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="color: #166534; margin-top: 0;">Call Summary</h3>
            <p style="color: #4b5563;">${call_summary}</p>
          </div>
          ` : ''}

          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">🚀 Ready to Get Started?</h3>
            <p style="color: #4b5563; margin-bottom: 20px;">
              Start your free trial with 50 minutes of AI voice calls - no credit card required!
            </p>
            <a href="https://voicenowcrm.com/signup" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Start Free Trial
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #4b5563; margin-bottom: 10px;">Quick links:</p>
            <p style="margin: 5px 0;">
              📅 <a href="https://voicenowcrm.com/book" style="color: #3b82f6;">Book a Demo Call</a>
            </p>
            <p style="margin: 5px 0;">
              💰 <a href="https://voicenowcrm.com/#pricing" style="color: #3b82f6;">View Pricing</a>
            </p>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="color: #6b7280; font-size: 14px;">
            Questions? Just reply to this email or call me at (602) 833-7194.<br><br>
            Best regards,<br>
            <strong>Max</strong><br>
            Sales Team, VoiceNow CRM AI
          </p>
        </div>
      </div>
    `;

    // Send email
    const info = await emailTransporter.sendMail({
      from: `"Max from VoiceNow CRM AI" <${process.env.SMTP_FROM_EMAIL}>`,
      to: customer_email,
      subject: `Great talking with you, ${name}! Here's how to get started with AI`,
      html: emailHTML,
      text: `Hi ${name}!\n\nGreat speaking with you about how AI voice agents can transform ${industryText} businesses!\n\nStart your free trial: https://voicenowcrm.com/signup\nBook a demo: https://voicenowcrm.com/book\n\nQuestions? Reply to this email or call (602) 833-7194.\n\nBest,\nMax\nVoiceNow CRM AI`
    });

    // Also notify sales team
    await emailTransporter.sendMail({
      from: `"VoiceNow CRM" <${process.env.SMTP_FROM_EMAIL}>`,
      to: 'help.voicenowcrm@gmail.com',
      subject: `📧 Follow-up email sent to ${customer_name || customer_email}`,
      html: `
        <p>Follow-up email sent during call:</p>
        <ul>
          <li><strong>To:</strong> ${customer_email}</li>
          <li><strong>Name:</strong> ${customer_name || 'Unknown'}</li>
          <li><strong>Industry:</strong> ${industry || 'Not specified'}</li>
          <li><strong>Interests:</strong> ${interests || 'Not specified'}</li>
          <li><strong>Call ID:</strong> ${callId}</li>
        </ul>
      `
    });

    console.log(`✅ Follow-up email sent to ${customer_email}`);

    return {
      success: true,
      message: 'Follow-up email sent successfully',
      messageId: info.messageId,
      to: customer_email
    };

  } catch (error) {
    console.error('Failed to send follow-up email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle booking a sales call (VoiceNow CRM Sales Agent tool)
 * Integrates with Google Calendar for scheduling
 */
async function handleBookSalesCall(parameters, agentId, callId) {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      preferred_date,
      preferred_time,
      call_topic
    } = parameters;

    if (!customer_name || (!customer_email && !customer_phone)) {
      return {
        success: false,
        error: 'Missing required parameters: customer_name and either customer_email or customer_phone'
      };
    }

    // Parse the preferred date/time or default to next business day
    let startTime;
    let endTime;

    if (preferred_date && preferred_time) {
      // Try to parse the date/time
      const dateStr = preferred_date.includes('/')
        ? preferred_date
        : new Date(preferred_date).toLocaleDateString();

      // Convert time preference to actual time
      const timeMap = {
        'morning': '10:00',
        'afternoon': '14:00',
        'evening': '17:00',
        'asap': '10:00'
      };

      const timeStr = timeMap[preferred_time.toLowerCase()] || preferred_time || '10:00';

      startTime = new Date(`${dateStr} ${timeStr}`);
      if (isNaN(startTime.getTime())) {
        // Default to next business day 10am
        startTime = getNextBusinessDay();
        startTime.setHours(10, 0, 0, 0);
      }
    } else {
      // Default to next business day 10am Arizona time
      startTime = getNextBusinessDay();
      startTime.setHours(10, 0, 0, 0);
    }

    // 30-minute call
    endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const eventDetails = {
      summary: `VoiceNow CRM Sales Call - ${customer_name}`,
      description: `Sales call with ${customer_name}\n\n` +
                   `Topic: ${call_topic || 'VoiceNow CRM Demo'}\n` +
                   `Phone: ${customer_phone || 'TBD'}\n` +
                   `Email: ${customer_email || 'TBD'}\n\n` +
                   `Booked during AI call (ID: ${callId})`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: customer_email ? [customer_email, 'help.voicenowcrm@gmail.com'] : ['help.voicenowcrm@gmail.com'],
      location: 'Phone Call'
    };

    // Create calendar event
    const calendarResult = await googleCalendar.createEvent(eventDetails);

    // If we have an email, send calendar invite
    if (customer_email) {
      await googleCalendar.sendCalendarInviteEmail({
        to: customer_email,
        ...eventDetails
      });
    }

    // Send SMS confirmation if we have phone
    if (customer_phone) {
      const formattedDate = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      await agentSMSService.sendSMS({
        agentId,
        to: customer_phone,
        message: `Hi ${customer_name.split(' ')[0]}! Your sales call is confirmed for ${formattedDate} at ${formattedTime}. Looking forward to showing you how VoiceNow CRM can transform your business! - Max from VoiceNow CRM AI`,
        userId: null,
        metadata: {
          callId,
          type: 'booking_confirmation',
          scheduledTime: startTime.toISOString()
        }
      });
    }

    // Notify sales team
    await emailTransporter.sendMail({
      from: `"VoiceNow CRM" <${process.env.SMTP_FROM_EMAIL}>`,
      to: 'help.voicenowcrm@gmail.com',
      subject: `📅 NEW SALES CALL BOOKED: ${customer_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #22c55e;">🎉 New Sales Call Booked!</h2>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
            <p><strong>Customer:</strong> ${customer_name}</p>
            <p><strong>Phone:</strong> ${customer_phone || 'Not provided'}</p>
            <p><strong>Email:</strong> ${customer_email || 'Not provided'}</p>
            <p><strong>Date:</strong> ${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p><strong>Time:</strong> ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</p>
            <p><strong>Topic:</strong> ${call_topic || 'VoiceNow CRM Demo'}</p>
          </div>
          <p style="color: #6b7280; margin-top: 20px;">Booked via AI call (ID: ${callId})</p>
        </div>
      `
    });

    console.log(`✅ Sales call booked for ${customer_name} at ${startTime.toISOString()}`);

    return {
      success: true,
      message: `Sales call booked for ${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      scheduledTime: startTime.toISOString(),
      calendarEventId: calendarResult.eventId
    };

  } catch (error) {
    console.error('Failed to book sales call:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper function to get next business day
 */
function getNextBusinessDay() {
  const date = new Date();
  date.setDate(date.getDate() + 1); // Start with tomorrow

  // Skip weekends
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/**
 * Handle creating lead notification for sales team (VoiceNow CRM Sales Agent tool)
 */
async function handleCreateLeadNotification(parameters, agentId, callId) {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      industry,
      interest_level,
      notes
    } = parameters;

    if (!customer_name && !customer_phone) {
      return {
        success: false,
        error: 'Missing required parameters: at least customer_name or customer_phone required'
      };
    }

    // Determine urgency color based on interest level
    const interestColors = {
      'hot': '#dc2626',
      'high': '#dc2626',
      'warm': '#f59e0b',
      'medium': '#f59e0b',
      'cold': '#6b7280',
      'low': '#6b7280'
    };

    const color = interestColors[interest_level?.toLowerCase()] || '#3b82f6';
    const emoji = interest_level?.toLowerCase() === 'hot' || interest_level?.toLowerCase() === 'high'
      ? '🔥'
      : interest_level?.toLowerCase() === 'warm' || interest_level?.toLowerCase() === 'medium'
        ? '⚡'
        : '📋';

    // Send notification to sales team
    await emailTransporter.sendMail({
      from: `"VoiceNow CRM" <${process.env.SMTP_FROM_EMAIL}>`,
      to: 'help.voicenowcrm@gmail.com',
      subject: `${emoji} NEW LEAD: ${customer_name || 'Unknown'} (${interest_level || 'Unknown'} interest)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${emoji} New Lead from AI Call</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Interest Level: ${interest_level || 'Unknown'}</p>
          </div>

          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${customer_name || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${customer_phone || 'Not provided'}</p>
            <p><strong>Email:</strong> ${customer_email || 'Not provided'}</p>
            <p><strong>Industry:</strong> ${industry || 'Not specified'}</p>

            ${notes ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid ${color};">
              <h4 style="margin-top: 0;">Notes from Call</h4>
              <p style="color: #4b5563;">${notes}</p>
            </div>
            ` : ''}

            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Lead captured during AI call<br>
                Call ID: ${callId}<br>
                Agent ID: ${agentId}<br>
                Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log(`✅ Lead notification sent for ${customer_name || customer_phone}`);

    return {
      success: true,
      message: 'Lead notification sent to sales team',
      customerName: customer_name,
      interestLevel: interest_level
    };

  } catch (error) {
    console.error('Failed to create lead notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Webhook for call status updates (optional)
 */
router.post('/call-status', async (req, res) => {
  try {
    const { call_id, status, duration, recording_url } = req.body;

    console.log('\n📞 Call Status Update:');
    console.log('   Call ID:', call_id);
    console.log('   Status:', status);
    console.log('   Duration:', duration);

    // TODO: Update call record in database
    // For now, just acknowledge
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Call status webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Post-Call Webhook - Enhanced with AI Extraction (Phase 1)
 * Triggered when call ends - extracts data, scores leads, creates CRM records
 */
router.post('/post-call', async (req, res) => {
  try {
    const {
      conversation_id,
      call_id,
      agent_id,
      transcript,
      analysis,
      metadata
    } = req.body;

    console.log('\n📞 Post-Call Webhook Received:');
    console.log('   Call ID:', call_id);
    console.log('   Conversation ID:', conversation_id);
    console.log('   Agent ID:', agent_id);
    console.log('   Transcript Length:', transcript?.length || 0, 'chars');

    // Acknowledge immediately (ElevenLabs requires 200 response)
    res.json({ success: true, message: 'Processing post-call actions with AI extraction' });

    // Find agent to get userId
    let userId = null;
    try {
      const agent = await VoiceAgent.findOne({ elevenLabsAgentId: agent_id });
      userId = agent?.userId;
      console.log('   Agent User ID:', userId);
    } catch (error) {
      console.error('⚠️ Could not find agent, proceeding without userId');
    }

    // ============================================
    // PHASE 1: AI EXTRACTION & LEAD SCORING
    // ============================================

    console.log('\n🤖 Starting AI extraction from transcript...');
    let extractedData = null;
    let leadScore = 0;
    let leadQuality = null;

    if (transcript && transcript.length > 50) {
      try {
        // Extract structured data from transcript using GPT-4
        extractedData = await extractLeadDataFromTranscript(transcript);

        // Calculate lead score (0-20)
        leadScore = calculateLeadScore(extractedData, transcript);

        // Get lead quality category
        leadQuality = getLeadQuality(leadScore);

        console.log('\n✅ AI Extraction Complete:');
        console.log('   Customer:', extractedData.customerName || 'Unknown');
        console.log('   Industry:', extractedData.industry);
        console.log('   Interest Level:', extractedData.interestLevel);
        console.log('   Lead Score:', `${leadScore}/20`);
        console.log('   Lead Quality:', leadQuality.label);

      } catch (error) {
        console.error('❌ AI extraction failed:', error.message);
        // Fallback to basic extraction
        extractedData = {
          customerName: null,
          customerPhone: metadata?.caller_number || null,
          customerEmail: null,
          industry: 'Unknown',
          painPoints: [],
          interestLevel: 'Medium'
        };
        leadScore = 5; // Default medium score
        leadQuality = getLeadQuality(leadScore);
      }
    } else {
      console.log('⚠️ Transcript too short, skipping AI extraction');
      extractedData = {
        customerName: null,
        customerPhone: metadata?.caller_number || null,
        customerEmail: null,
        industry: 'Unknown',
        painPoints: [],
        interestLevel: 'Low'
      };
      leadScore = 3;
      leadQuality = getLeadQuality(leadScore);
    }

    // Estimate deal value
    const estimatedValue = estimateDealValue(extractedData.industry, extractedData.budgetMentioned);

    // Generate recommended next steps
    const nextSteps = generateNextSteps(extractedData, leadScore);

    // ============================================
    // PHASE 1: CREATE LEAD IN CRM
    // ============================================

    let lead = null;
    if (userId && extractedData.customerPhone) {
      try {
        console.log('\n💾 Creating Lead in CRM...');

        lead = await Lead.create({
          userId,
          name: extractedData.customerName || 'Unknown Caller',
          email: extractedData.customerEmail || `call-${call_id}@temp.voiceflow.ai`,
          phone: extractedData.customerPhone,
          company: extractedData.companyName,
          source: 'ai_call',
          qualified: leadScore >= 10, // Qualified if warm or hot
          qualificationScore: leadScore * 5, // Convert 0-20 to 0-100
          value: estimatedValue,
          status: leadScore >= 15 ? 'hot' : leadScore >= 10 ? 'warm' : 'cold',
          tags: [
            extractedData.industry,
            leadQuality.level,
            ...extractedData.featuresInterested.slice(0, 3),
            ...(extractedData.requestedDemo ? ['demo-requested'] : [])
          ].filter(Boolean),
          notes: `Call Transcript:\n${transcript}\n\n` +
                 `Pain Points: ${extractedData.painPoints.join(', ') || 'None mentioned'}\n` +
                 `Budget: ${extractedData.budgetMentioned || 'Not mentioned'}\n` +
                 `Timeline: ${extractedData.timeline || 'Not mentioned'}\n` +
                 `Objections: ${extractedData.objections.join(', ') || 'None'}\n` +
                 `Competitors: ${extractedData.competitorsMentioned.join(', ') || 'None'}\n` +
                 `Sentiment: ${extractedData.sentiment}\n` +
                 `Decision Maker: ${extractedData.isDecisionMaker === true ? 'Yes' : extractedData.isDecisionMaker === false ? 'No' : 'Unknown'}`,
          customFields: {
            callId: call_id,
            conversationId: conversation_id,
            agentId: agent_id,
            industry: extractedData.industry,
            painPoints: extractedData.painPoints,
            featuresInterested: extractedData.featuresInterested,
            leadScore: leadScore,
            leadQuality: leadQuality.level,
            sentiment: extractedData.sentiment,
            isDecisionMaker: extractedData.isDecisionMaker,
            keyQuotes: extractedData.keyQuotes
          }
        });

        console.log('✅ Lead created:', lead._id);

      } catch (error) {
        console.error('❌ Failed to create Lead:', error.message);
      }
    }

    // ============================================
    // PHASE 1: CREATE FOLLOW-UP TASK
    // ============================================

    if (userId && lead) {
      try {
        console.log('\n📋 Creating follow-up Task...');

        // Calculate due date based on lead quality
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + leadQuality.followUpHours);

        const task = await Task.create({
          user: userId,
          title: `${leadQuality.label} Follow-up: ${extractedData.customerName || 'Unknown Caller'}`,
          description: `${leadQuality.action}\n\n` +
                      `Lead Score: ${leadScore}/20\n` +
                      `Industry: ${extractedData.industry}\n` +
                      `Key Pain Points: ${extractedData.painPoints.slice(0, 2).join(', ') || 'None'}\n\n` +
                      `Recommended Next Steps:\n${nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
          type: leadScore >= 15 ? 'call' : leadScore >= 10 ? 'demo' : 'follow_up',
          status: 'pending',
          priority: leadQuality.priority,
          dueDate,
          relatedContact: lead._id
        });

        console.log('✅ Task created:', task._id);
        console.log('   Priority:', task.priority);
        console.log('   Due:', task.dueDate.toLocaleString());

      } catch (error) {
        console.error('❌ Failed to create Task:', error.message);
      }
    }

    // ============================================
    // PHASE 1: PERSONALIZED SMS
    // ============================================

    if (extractedData.customerPhone) {
      console.log('\n📱 Sending personalized SMS...');
      try {
        const customerName = extractedData.customerName?.split(' ')[0] || 'there';
        const features = extractedData.featuresInterested.slice(0, 2).join(' and ') || 'our platform';

        let smsMessage = `Hi ${customerName}! `;

        if (leadScore >= 15) {
          smsMessage += `It was great talking about ${features}! I'm excited to help you get started. Start your free trial: https://voicenowcrm.com/signup`;
        } else if (leadScore >= 10) {
          smsMessage += `Thanks for chatting about ${features}. Here's your trial link: https://voicenowcrm.com/signup - 50 free minutes, no credit card needed!`;
        } else {
          smsMessage += `Thanks for your interest in VoiceNow CRM. Learn more and start free: https://voicenowcrm.com/signup`;
        }

        smsMessage += ` - Sarah from VoiceNow CRM AI`;

        await agentSMSService.sendSMS({
          agentId: agent_id,
          to: extractedData.customerPhone,
          message: smsMessage,
          userId,
          metadata: {
            callId: call_id,
            conversationId: conversation_id,
            leadId: lead?._id,
            leadScore,
            type: 'post_call_followup'
          }
        });
        console.log('✅ Personalized SMS sent');
      } catch (error) {
        console.error('❌ SMS failed:', error.message);
      }
    }

    // ============================================
    // PHASE 1: INTELLIGENT SALES NOTIFICATION
    // ============================================

    console.log('\n📧 Sending intelligent sales notification...');
    try {
      const customerName = extractedData.customerName || 'Unknown Caller';
      const phone = extractedData.customerPhone || 'Not provided';
      const email = extractedData.customerEmail || 'Not provided';

      // Build pain points HTML
      const painPointsHTML = extractedData.painPoints.length > 0
        ? `<ul>${extractedData.painPoints.map(p => `<li>${p}</li>`).join('')}</ul>`
        : '<p style="color: #9ca3af;">No specific pain points mentioned</p>';

      // Build features HTML
      const featuresHTML = extractedData.featuresInterested.length > 0
        ? `<ul>${extractedData.featuresInterested.map(f => `<li>${f}</li>`).join('')}</ul>`
        : '<p style="color: #9ca3af;">No specific features discussed</p>';

      // Build next steps HTML
      const nextStepsHTML = `<ol>${nextSteps.map(s => `<li>${s}</li>`).join('')}</ol>`;

      await emailTransporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: 'help.voicenowcrm@gmail.com',
        subject: `${leadQuality.label} ${customerName} - Score: ${leadScore}/20`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 700px;">
            <div style="background: ${leadQuality.color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">${leadQuality.label} ${customerName}</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px; opacity: 0.9;">Lead Score: ${leadScore}/20</p>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-left: 4px solid ${leadQuality.color};">
              <h3 style="margin-top: 0;">📊 Quick Stats</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Interest Level:</strong> ${extractedData.interestLevel}</div>
                <div><strong>Sentiment:</strong> ${extractedData.sentiment}</div>
                <div><strong>Industry:</strong> ${extractedData.industry}</div>
                <div><strong>Est. Value:</strong> $${estimatedValue.toLocaleString()}/year</div>
              </div>
            </div>

            <div style="background: white; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #374151;">👤 Contact Information</h3>
              <p><strong>Name:</strong> ${customerName}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Email:</strong> ${email}</p>
              ${extractedData.companyName ? `<p><strong>Company:</strong> ${extractedData.companyName}</p>` : ''}
              ${extractedData.isDecisionMaker !== null ? `<p><strong>Decision Maker:</strong> ${extractedData.isDecisionMaker ? '✅ Yes' : '❌ No'}</p>` : ''}
            </div>

            <div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #991b1b;">💔 Pain Points</h3>
              ${painPointsHTML}
            </div>

            <div style="background: #eff6ff; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #1e40af;">✨ Features Interested In</h3>
              ${featuresHTML}
            </div>

            ${extractedData.budgetMentioned || extractedData.timeline ? `
            <div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #166534;">💰 Budget & Timeline</h3>
              ${extractedData.budgetMentioned ? `<p><strong>Budget:</strong> ${extractedData.budgetMentioned}</p>` : ''}
              ${extractedData.timeline ? `<p><strong>Timeline:</strong> ${extractedData.timeline}</p>` : ''}
            </div>
            ` : ''}

            ${extractedData.objections.length > 0 ? `
            <div style="background: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #92400e;">⚠️ Objections Raised</h3>
              <ul>${extractedData.objections.map(o => `<li>${o}</li>`).join('')}</ul>
            </div>
            ` : ''}

            ${extractedData.keyQuotes.length > 0 ? `
            <div style="background: #f5f3ff; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #5b21b6;">💬 Key Quotes</h3>
              ${extractedData.keyQuotes.map(q => `<blockquote style="margin: 10px 0; padding-left: 15px; border-left: 3px solid #8b5cf6; color: #6b7280;">"${q}"</blockquote>`).join('')}
            </div>
            ` : ''}

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">🎯 Recommended Next Steps</h3>
              ${nextStepsHTML}
              <p style="margin-bottom: 0; margin-top: 15px; font-size: 14px; opacity: 0.9;">
                ⏰ Follow up within: <strong>${leadQuality.followUpHours} hours</strong>
              </p>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <h3 style="margin-top: 0;">✅ Actions Completed</h3>
              <p>✅ AI analysis complete</p>
              <p>✅ Lead created in CRM${lead ? ` (ID: ${lead._id})` : ''}</p>
              <p>✅ Personalized SMS sent to customer</p>
              <p>✅ Follow-up task created</p>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

            <p style="color: #6b7280; font-size: 12px;">
              Call ID: ${call_id}<br>
              Conversation ID: ${conversation_id}<br>
              Agent ID: ${agent_id}<br>
              Powered by VoiceNow CRM AI
            </p>
          </div>
        `
      });
      console.log('✅ Intelligent sales notification sent to help.voicenowcrm@gmail.com');
    } catch (error) {
      console.error('❌ Sales notification failed:', error.message);
    }

    console.log('\n✅ Phase 1 Post-call processing complete!\n');

  } catch (error) {
    console.error('❌ Post-call webhook error:', error);
    // Don't return error to ElevenLabs - we already acknowledged
  }
});

// ==========================================
// BROWSER AUTOMATION TOOL HANDLERS
// ==========================================

/**
 * Handle research_company tool from voice agent
 * Uses browser-use to research a company in real-time during calls
 */
async function handleResearchCompany(parameters, agentId, callId) {
  try {
    const { company_name, contact_name } = parameters;

    if (!company_name) {
      return {
        success: false,
        error: 'Company name is required for research'
      };
    }

    console.log(`🔍 Voice agent researching company: ${company_name}`);

    // Check if browser agent service is available
    const isHealthy = await browserAgentService.isHealthy();

    if (!isHealthy) {
      console.log('⚠️ Browser agent service unavailable, returning basic response');
      return {
        success: true,
        response: `I'll note that you're interested in information about ${company_name}. Our team will research this and follow up with you.`,
        data: { company_name, researched: false }
      };
    }

    // Use quick research for real-time voice calls
    const result = await browserAgentService.voiceAgentResearch(company_name, contact_name);

    if (result.success && result.research) {
      return {
        success: true,
        response: result.research,
        data: { company_name, contact_name, researched: true }
      };
    } else {
      return {
        success: true,
        response: `I found some basic information about ${company_name}. Would you like me to have our team do deeper research and send it to you?`,
        data: { company_name, researched: false }
      };
    }

  } catch (error) {
    console.error('❌ Research company failed:', error);
    return {
      success: true,
      response: "I'll have our team research that company and follow up with you.",
      error: error.message
    };
  }
}

/**
 * Handle check_calendar_availability tool from voice agent
 * Checks scheduling page availability during calls
 */
async function handleCheckAvailability(parameters, agentId, callId) {
  try {
    const { date } = parameters;
    const calendarUrl = process.env.DEFAULT_CALENDAR_URL || 'https://calendly.com/voicenowcrm-ai';

    if (!date) {
      return {
        success: false,
        error: 'Date is required to check availability'
      };
    }

    console.log(`📅 Voice agent checking availability for: ${date}`);

    // Check if browser agent service is available
    const isHealthy = await browserAgentService.isHealthy();

    if (!isHealthy) {
      console.log('⚠️ Browser agent service unavailable');
      return {
        success: true,
        response: `I can schedule you for ${date}. What time works best for you - morning, afternoon, or evening?`,
        data: { date, checked: false }
      };
    }

    const result = await browserAgentService.voiceAgentCheckAvailability(calendarUrl, date);

    if (result.success && result.availability) {
      return {
        success: true,
        response: result.availability,
        data: { date, availability: result.availability, checked: true }
      };
    } else {
      return {
        success: true,
        response: `I have availability on ${date}. What time works best - morning around 10am, afternoon around 2pm, or later in the day around 4pm?`,
        data: { date, checked: false }
      };
    }

  } catch (error) {
    console.error('❌ Check availability failed:', error);
    return {
      success: true,
      response: "Let me check our calendar. What time of day works best for you?",
      error: error.message
    };
  }
}

/**
 * Handle fill_web_form tool from voice agent
 * Fills out web forms on behalf of customers
 */
async function handleFillWebForm(parameters, agentId, callId) {
  try {
    const { form_url, customer_name, customer_email, customer_phone, additional_info } = parameters;

    if (!form_url) {
      return {
        success: false,
        error: 'Form URL is required'
      };
    }

    console.log(`📝 Voice agent filling form: ${form_url}`);

    // Check if browser agent service is available
    const isHealthy = await browserAgentService.isHealthy();

    if (!isHealthy) {
      console.log('⚠️ Browser agent service unavailable');
      return {
        success: true,
        response: "I'll send you a link to that form so you can fill it out at your convenience. Can I get your email to send it to?",
        data: { form_url, filled: false }
      };
    }

    const formData = {
      name: customer_name,
      email: customer_email,
      phone: customer_phone
    };

    if (additional_info) {
      formData.message = additional_info;
      formData.notes = additional_info;
    }

    const result = await browserAgentService.fillForm(form_url, formData, false);

    if (result.success) {
      return {
        success: true,
        response: `I've pre-filled the form with your information. You'll just need to review and submit it. Would you like me to send you the link?`,
        data: { form_url, filled: true, formData }
      };
    } else {
      return {
        success: true,
        response: "I'll send you a direct link to that form. It should only take a minute to fill out.",
        data: { form_url, filled: false }
      };
    }

  } catch (error) {
    console.error('❌ Fill form failed:', error);
    return {
      success: true,
      response: "Let me send you that form link directly. What's the best email to reach you?",
      error: error.message
    };
  }
}

export default router;
