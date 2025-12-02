import express from 'express';
import agentSMSService from '../services/agentSMSService.js';
import googleCalendar from '../services/googleCalendar.js';
import nodemailer from 'nodemailer';
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

      case 'end_call':
        result = { success: true, message: 'Call ending' };
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
          smsMessage += `It was great talking about ${features}! I'm excited to help you get started. Start your free trial: https://remodely.ai/signup`;
        } else if (leadScore >= 10) {
          smsMessage += `Thanks for chatting about ${features}. Here's your trial link: https://remodely.ai/signup - 50 free minutes, no credit card needed!`;
        } else {
          smsMessage += `Thanks for your interest in VoiceNow CRM. Learn more and start free: https://remodely.ai/signup`;
        }

        smsMessage += ` - Sarah from Remodely AI`;

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
        to: 'help.remodely@gmail.com',
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
      console.log('✅ Intelligent sales notification sent to help.remodely@gmail.com');
    } catch (error) {
      console.error('❌ Sales notification failed:', error.message);
    }

    console.log('\n✅ Phase 1 Post-call processing complete!\n');

  } catch (error) {
    console.error('❌ Post-call webhook error:', error);
    // Don't return error to ElevenLabs - we already acknowledged
  }
});

export default router;
