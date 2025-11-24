/**
 * Agent SMS Service
 *
 * Enables agents to send and receive SMS messages
 * Integrates with Twilio for SMS delivery
 */

import twilio from 'twilio';
import AgentSMS from '../models/AgentSMS.js';
import VoiceAgent from '../models/VoiceAgent.js';
import Lead from '../models/Lead.js';
import ariaSMSService from './ariaSMSService.js';

class AgentSMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      console.warn('⚠️ Twilio credentials not fully configured for SMS');
      this.client = null;
    } else {
      this.client = twilio(this.accountSid, this.authToken);
      console.log('✅ Agent SMS Service initialized');
    }
  }

  /**
   * Send SMS from an agent to a lead/customer
   */
  async sendSMS({ agentId, to, message, leadId, userId, metadata = {} }) {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized. Check credentials.');
      }

      console.log(`📱 Sending SMS from agent ${agentId} to ${to}`);

      // Send via Twilio
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: to
      });

      // Log in database
      const smsRecord = await AgentSMS.create({
        userId,
        agentId,
        leadId,
        direction: 'outbound',
        to,
        from: this.phoneNumber,
        message,
        status: twilioMessage.status,
        twilioSid: twilioMessage.sid,
        metadata
      });

      console.log(`✅ SMS sent successfully: ${twilioMessage.sid}`);

      return {
        success: true,
        smsId: smsRecord._id,
        twilioSid: twilioMessage.sid,
        status: twilioMessage.status
      };

    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send appointment reminder SMS
   */
  async sendAppointmentReminder({ agentId, leadPhone, leadName, appointmentDate, appointmentTime, userId }) {
    const message = `Hi ${leadName}! This is a reminder about your appointment on ${appointmentDate} at ${appointmentTime}. Reply CONFIRM to confirm or RESCHEDULE if you need to change it.`;

    return this.sendSMS({
      agentId,
      to: leadPhone,
      message,
      userId,
      metadata: {
        type: 'appointment_reminder',
        appointmentDate,
        appointmentTime
      }
    });
  }

  /**
   * Send post-call follow-up SMS
   */
  async sendPostCallFollowUp({ agentId, leadPhone, leadName, callSummary, nextSteps, userId }) {
    const message = `Hi ${leadName}! Thanks for speaking with us. ${callSummary ? 'Summary: ' + callSummary + '. ' : ''}${nextSteps || 'We\'ll be in touch soon!'}`;

    return this.sendSMS({
      agentId,
      to: leadPhone,
      message,
      userId,
      metadata: {
        type: 'post_call_followup'
      }
    });
  }

  /**
   * Send link via SMS
   */
  async sendLink({ agentId, leadPhone, leadName, linkUrl, linkDescription, userId }) {
    const message = `Hi ${leadName}! ${linkDescription || 'Here\'s the link we discussed'}: ${linkUrl}`;

    return this.sendSMS({
      agentId,
      to: leadPhone,
      message,
      userId,
      metadata: {
        type: 'link_share',
        url: linkUrl
      }
    });
  }

  /**
   * Handle incoming SMS (webhook handler)
   */
  async handleIncomingSMS({ from, to, body, twilioSid }) {
    try {
      console.log(`📨 Received SMS from ${from}: "${body}"`);

      // Find lead by phone number
      const lead = await Lead.findOne({
        $or: [
          { phone: from },
          { phone: from.replace('+1', '') },
          { phone: '+1' + from }
        ]
      });

      // Find the agent that last contacted this lead
      let agent = null;
      if (lead) {
        const lastSMS = await AgentSMS.findOne({
          leadId: lead._id,
          direction: 'outbound'
        }).sort({ createdAt: -1 });

        if (lastSMS) {
          agent = await VoiceAgent.findById(lastSMS.agentId);
        }
      }

      // Log incoming SMS
      const smsRecord = await AgentSMS.create({
        userId: lead?.userId || agent?.userId,
        agentId: agent?._id,
        leadId: lead?._id,
        direction: 'inbound',
        from,
        to,
        message: body,
        status: 'received',
        twilioSid
      });

      // Process the message
      await this.processIncomingSMS(smsRecord, lead, agent);

      return {
        success: true,
        smsId: smsRecord._id
      };

    } catch (error) {
      console.error('❌ Failed to handle incoming SMS:', error);
      throw error;
    }
  }

  /**
   * Process incoming SMS and trigger appropriate actions
   */
  async processIncomingSMS(smsRecord, lead, agent) {
    const message = smsRecord.message.toLowerCase().trim();

    // Handle STOP/UNSUBSCRIBE (compliance requirement - must handle immediately)
    if (message.includes('stop') || message.includes('unsubscribe')) {
      console.log('🛑 Lead opted out');
      if (lead) {
        lead.smsOptOut = true;
        await lead.save();
      }
      await this.sendSMS({
        agentId: agent?._id,
        to: smsRecord.from,
        message: 'You have been unsubscribed from SMS messages. Reply START to opt back in.',
        leadId: lead?._id,
        userId: lead?.userId || agent?.userId,
        metadata: { type: 'auto_reply', context: 'optout' }
      });
      return;
    }

    // Handle START (compliance requirement)
    else if (message.includes('start')) {
      console.log('✅ Lead opted in');
      if (lead) {
        lead.smsOptOut = false;
        await lead.save();
      }
      await this.sendSMS({
        agentId: agent?._id,
        to: smsRecord.from,
        message: 'Welcome back! You\'re subscribed to SMS updates.',
        leadId: lead?._id,
        userId: lead?.userId || agent?.userId,
        metadata: { type: 'auto_reply', context: 'optin' }
      });
      return;
    }

    // Check if Aria should respond
    if (ariaSMSService.shouldAriaRespond(smsRecord.message, lead)) {
      try {
        console.log('🤖 Routing to Aria for AI processing...');
        await ariaSMSService.processWithAria({
          from: smsRecord.from,
          to: smsRecord.to,
          message: smsRecord.message,
          smsRecord,
          lead,
          agent
        });
      } catch (error) {
        console.error('❌ Aria processing failed, fallback to manual:', error);
        // Fall back to manual response
        console.log('💬 SMS needs manual response (Aria failed)');
      }
    } else {
      // Forward to user for manual response
      console.log('💬 SMS needs manual response');
      // Could trigger notification to user or create a task in CRM
    }
  }

  /**
   * Send bulk SMS campaign (with rate limiting)
   */
  async sendBulkSMS({ agentId, recipients, message, userId, delayBetweenMessages = 1000 }) {
    const results = [];

    for (const recipient of recipients) {
      try {
        // Check if opted out
        if (recipient.smsOptOut) {
          console.log(`⏭️ Skipping ${recipient.phone} (opted out)`);
          results.push({
            phone: recipient.phone,
            success: false,
            reason: 'opted_out'
          });
          continue;
        }

        const result = await this.sendSMS({
          agentId,
          to: recipient.phone,
          message: this.personalizeMessage(message, recipient),
          leadId: recipient._id,
          userId,
          metadata: {
            type: 'bulk_campaign',
            campaignId: recipient.campaignId
          }
        });

        results.push({
          phone: recipient.phone,
          success: true,
          smsId: result.smsId
        });

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));

      } catch (error) {
        console.error(`❌ Failed to send to ${recipient.phone}:`, error.message);
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message
        });
      }
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Personalize message with recipient data
   */
  personalizeMessage(template, recipient) {
    let message = template;

    // Replace common variables
    message = message.replace(/\{name\}/gi, recipient.name || 'there');
    message = message.replace(/\{firstName\}/gi, recipient.firstName || recipient.name?.split(' ')[0] || 'there');
    message = message.replace(/\{company\}/gi, recipient.company || 'your company');

    return message;
  }

  /**
   * Get SMS history for a lead
   */
  async getSMSHistory(leadId, limit = 50) {
    return AgentSMS.find({ leadId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('agentId', 'name');
  }

  /**
   * Get SMS analytics for an agent
   */
  async getAgentSMSAnalytics(agentId, startDate, endDate) {
    const match = {
      agentId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const stats = await AgentSMS.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$direction',
          count: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [{ $in: ['$status', ['delivered', 'sent', 'received']] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $in: ['$status', ['failed', 'undelivered']] }, 1, 0]
            }
          }
        }
      }
    ]);

    return {
      outbound: stats.find(s => s._id === 'outbound') || { count: 0, successful: 0, failed: 0 },
      inbound: stats.find(s => s._id === 'inbound') || { count: 0, successful: 0, failed: 0 }
    };
  }
}

export default new AgentSMSService();
