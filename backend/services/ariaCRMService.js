/**
 * Aria CRM Service
 *
 * Gives Aria full read/write access to all CRM data and autonomous capabilities
 * to manage contacts, leads, appointments, calls, SMS, emails without user intervention
 */

import OpenAI from 'openai';
import twilio from 'twilio';
import Lead from '../models/Lead.js';
import Contact from '../models/Contact.js';
import Appointment from '../models/Appointment.js';
import CallLog from '../models/CallLog.js';
import AgentSMS from '../models/AgentSMS.js';
import User from '../models/User.js';
import AriaMemory from '../models/AriaMemory.js';
import AriaConversation from '../models/AriaConversation.js';
import emailService from './emailService.js';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

class AriaCRMService {
  constructor() {
    this.twilioClient = null;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    console.log('✅ Aria CRM Service initialized with full access');
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTACT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Search contacts by any field
   */
  async searchContacts(userId, query) {
    const searchRegex = new RegExp(query, 'i');
    return Contact.find({
      user: userId,
      isDeleted: false,
      $or: [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { notes: searchRegex }
      ]
    }).sort({ lastInteraction: -1 }).limit(50);
  }

  /**
   * Get contact by phone number
   */
  async getContactByPhone(userId, phone) {
    const normalizedPhone = this.normalizePhone(phone);
    return Contact.findOne({
      user: userId,
      phone: { $regex: normalizedPhone.slice(-10) },
      isDeleted: false
    });
  }

  /**
   * Create or update contact
   */
  async upsertContact(userId, contactData) {
    const { phone, name, email, company, notes, tags } = contactData;
    const normalizedPhone = this.normalizePhone(phone);

    let contact = await this.getContactByPhone(userId, normalizedPhone);

    if (contact) {
      // Update existing contact
      if (name) contact.name = name;
      if (email) contact.email = email;
      if (company) contact.company = company;
      if (notes) contact.notes = (contact.notes || '') + '\n' + notes;
      if (tags) contact.tags = [...new Set([...(contact.tags || []), ...tags])];
      contact.lastInteraction = new Date();
      await contact.save();
    } else {
      // Create new contact
      contact = await Contact.create({
        user: userId,
        name: name || 'Unknown',
        phone: normalizedPhone,
        email,
        company,
        notes,
        tags: tags || [],
        importSource: 'api'
      });
    }

    return contact;
  }

  /**
   * Add conversation to contact history
   */
  async addContactConversation(userId, phone, type, direction, content) {
    const contact = await this.getContactByPhone(userId, phone);
    if (contact) {
      await contact.addConversation(type, direction, content);
    }
    return contact;
  }

  // ═══════════════════════════════════════════════════════════════════
  // LEAD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Search leads
   */
  async searchLeads(userId, query) {
    const searchRegex = new RegExp(query, 'i');
    return Lead.find({
      userId,
      $or: [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { projectDescription: searchRegex }
      ]
    }).sort({ createdAt: -1 }).limit(50);
  }

  /**
   * Get lead by phone
   */
  async getLeadByPhone(userId, phone) {
    const normalizedPhone = this.normalizePhone(phone);
    return Lead.findOne({
      userId,
      phone: { $regex: normalizedPhone.slice(-10) }
    });
  }

  /**
   * Create new lead from caller info
   */
  async createLeadFromCaller(userId, callerData) {
    const { phone, name, email, service, source, notes, value } = callerData;

    // Check if lead already exists
    let lead = await this.getLeadByPhone(userId, phone);
    if (lead) {
      // Update existing lead
      if (name && lead.name === 'Unknown') lead.name = name;
      if (email && !lead.email) lead.email = email;
      if (service) lead.projectType = service;
      if (notes) lead.notes.push({ content: notes, createdBy: 'Aria AI', createdAt: new Date() });
      lead.lastActivityAt = new Date();
      lead.lastActivityType = source === 'ai_call' ? 'ai_call' : 'call';
      await lead.save();
      return lead;
    }

    // Create new lead
    lead = await Lead.create({
      userId,
      name: name || 'Unknown',
      phone: this.normalizePhone(phone),
      email: email || `${phone.replace(/\D/g, '')}@placeholder.com`,
      source: source || 'ai_call',
      status: 'new',
      priority: 'medium',
      projectType: service,
      value: value || 0,
      notes: notes ? [{ content: notes, createdBy: 'Aria AI', createdAt: new Date() }] : []
    });

    return lead;
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId, status, notes) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    lead.status = status;
    lead.lastActivityAt = new Date();
    if (notes) {
      lead.notes.push({ content: notes, createdBy: 'Aria AI', createdAt: new Date() });
    }

    if (status === 'converted') {
      lead.convertedAt = new Date();
    }

    await lead.save();
    return lead;
  }

  /**
   * Get leads needing follow-up
   */
  async getLeadsNeedingFollowUp(userId, daysOld = 3) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return Lead.find({
      userId,
      status: { $in: ['new', 'contacted', 'qualified'] },
      $or: [
        { lastContactedAt: { $lt: cutoffDate } },
        { lastContactedAt: null }
      ]
    }).sort({ createdAt: -1 }).limit(20);
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPOINTMENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create appointment
   */
  async createAppointment(userId, appointmentData) {
    const { leadId, title, description, type, startTime, endTime, location, attendees } = appointmentData;

    // Get lead info
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const appointment = await Appointment.create({
      userId,
      leadId,
      title: title || `Meeting with ${lead.name}`,
      description,
      type: type || 'meeting',
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
      location,
      attendees: attendees || [{ name: lead.name, phone: lead.phone, email: lead.email }],
      status: 'scheduled',
      aiScheduled: true
    });

    // Update lead
    lead.meetingsScheduled = (lead.meetingsScheduled || 0) + 1;
    lead.lastActivityAt = new Date();
    lead.lastActivityType = 'meeting';
    await lead.save();

    return appointment;
  }

  /**
   * Get today's appointments
   */
  async getTodayAppointments(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Appointment.find({
      userId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] }
    }).populate('leadId').sort({ startTime: 1 });
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(userId, days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return Appointment.find({
      userId,
      startTime: { $gte: now, $lte: futureDate },
      status: { $nin: ['cancelled', 'completed'] }
    }).populate('leadId').sort({ startTime: 1 });
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(appointmentId, newStartTime, reason) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const oldTime = appointment.startTime;
    const duration = appointment.endTime - appointment.startTime;

    appointment.startTime = new Date(newStartTime);
    appointment.endTime = new Date(new Date(newStartTime).getTime() + duration);
    appointment.notes = (appointment.notes || '') + `\nRescheduled from ${oldTime.toISOString()} by Aria: ${reason}`;

    await appointment.save();
    return appointment;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Make outbound call via Twilio
   */
  async makeCall(userId, to, message) {
    if (!this.twilioClient) throw new Error('Twilio not configured');

    const call = await this.twilioClient.calls.create({
      twiml: `<Response>
        <Say voice="Polly.Joanna" language="en-US">${message}</Say>
        <Gather input="speech" timeout="5" action="${process.env.WEBHOOK_URL}/api/twilio/voice/aria-respond" method="POST">
          <Say voice="Polly.Joanna">How can I help you today?</Say>
        </Gather>
      </Response>`,
      to: to,
      from: this.phoneNumber
    });

    // Log the call
    await CallLog.create({
      userId,
      direction: 'outbound',
      phoneNumber: to,
      status: 'initiated',
      twilioCallSid: call.sid,
      metadata: { initiatedBy: 'aria', message }
    });

    return call;
  }

  /**
   * Get recent calls for a lead
   */
  async getLeadCallHistory(userId, leadId) {
    return CallLog.find({
      userId,
      leadId
    }).sort({ createdAt: -1 }).limit(20);
  }

  /**
   * Log call with transcript
   */
  async logCall(userId, callData) {
    const { direction, phone, duration, transcript, sentiment, leadId, twilioSid } = callData;

    const callLog = await CallLog.create({
      userId,
      direction,
      phoneNumber: phone,
      duration,
      transcript,
      sentiment: sentiment || 'neutral',
      leadId,
      twilioCallSid: twilioSid,
      status: 'completed'
    });

    // Update lead if exists
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        if (direction === 'inbound') lead.callsReceived++;
        else lead.callsMade++;
        lead.lastContactedAt = new Date();
        lead.lastActivityAt = new Date();
        lead.lastActivityType = 'call';
        await lead.save();
      }
    }

    return callLog;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SMS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Send SMS using A2P compliant messaging service
   */
  async sendSMS(userId, to, message, leadId = null) {
    if (!this.twilioClient) throw new Error('Twilio not configured');

    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
    const twilioMessage = await this.twilioClient.messages.create({
      body: message,
      messagingServiceSid: messagingServiceSid,
      to: to
    });

    // Log SMS
    const smsRecord = await AgentSMS.create({
      userId,
      leadId,
      direction: 'outbound',
      from: this.phoneNumber,
      to: to,
      message,
      status: twilioMessage.status,
      twilioSid: twilioMessage.sid,
      metadata: { sentBy: 'aria' }
    });

    // Update contact conversation history
    await this.addContactConversation(userId, to, 'sms', 'outgoing', message);

    // Update lead if exists
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        lead.smsSent++;
        lead.lastContactedAt = new Date();
        lead.lastActivityAt = new Date();
        await lead.save();
      }
    }

    return smsRecord;
  }

  /**
   * Send MMS with media using A2P compliant messaging service
   */
  async sendMMS(userId, to, message, mediaUrls, leadId = null) {
    if (!this.twilioClient) throw new Error('Twilio not configured');

    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
    const twilioMessage = await this.twilioClient.messages.create({
      body: message,
      messagingServiceSid: messagingServiceSid,
      to: to,
      mediaUrl: Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls]
    });

    await AgentSMS.create({
      userId,
      leadId,
      direction: 'outbound',
      from: this.phoneNumber,
      to: to,
      message,
      status: twilioMessage.status,
      twilioSid: twilioMessage.sid,
      metadata: { sentBy: 'aria', mediaUrls, type: 'mms' }
    });

    return twilioMessage;
  }

  /**
   * Get SMS conversation history
   */
  async getSMSHistory(userId, phone, limit = 50) {
    const normalizedPhone = this.normalizePhone(phone);
    return AgentSMS.find({
      userId,
      $or: [
        { from: { $regex: normalizedPhone.slice(-10) } },
        { to: { $regex: normalizedPhone.slice(-10) } }
      ]
    }).sort({ createdAt: -1 }).limit(limit);
  }

  // ═══════════════════════════════════════════════════════════════════
  // EMAIL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Send email
   */
  async sendEmail(userId, to, subject, body, leadId = null) {
    const result = await emailService.sendEmail({
      to,
      subject,
      html: body
    });

    // Update lead if exists
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        lead.emailsSent++;
        lead.lastContactedAt = new Date();
        lead.lastActivityAt = new Date();
        await lead.save();
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MEMORY & CONTEXT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Remember something about a contact
   */
  async rememberAboutContact(userId, phone, key, value) {
    const contact = await this.getContactByPhone(userId, phone);
    if (!contact) return null;

    if (!contact.customFields) contact.customFields = new Map();
    contact.customFields.set(key, value);
    await contact.save();

    // Also store in Aria's memory
    await AriaMemory.findOneAndUpdate(
      { userId, key: `contact_${phone}_${key}` },
      { value: JSON.stringify(value), updatedAt: new Date() },
      { upsert: true }
    );

    return contact;
  }

  /**
   * Recall something about a contact
   */
  async recallAboutContact(userId, phone, key) {
    const contact = await this.getContactByPhone(userId, phone);
    if (!contact || !contact.customFields) return null;
    return contact.customFields.get(key);
  }

  /**
   * Get full context for a caller
   */
  async getCallerContext(userId, phone) {
    const normalizedPhone = this.normalizePhone(phone);

    // Get contact
    const contact = await this.getContactByPhone(userId, normalizedPhone);

    // Get lead
    const lead = await this.getLeadByPhone(userId, normalizedPhone);

    // Get recent SMS history
    const smsHistory = await this.getSMSHistory(userId, normalizedPhone, 10);

    // Get call history
    const callHistory = lead ? await this.getLeadCallHistory(userId, lead._id) : [];

    // Get upcoming appointments
    const appointments = lead ? await Appointment.find({
      leadId: lead._id,
      startTime: { $gte: new Date() },
      status: { $nin: ['cancelled', 'completed'] }
    }).sort({ startTime: 1 }).limit(5) : [];

    return {
      contact,
      lead,
      smsHistory,
      callHistory,
      appointments,
      isKnown: !!(contact || lead),
      name: contact?.name || lead?.name || 'Unknown',
      hasUpcomingAppointment: appointments.length > 0,
      nextAppointment: appointments[0] || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // AI DECISION MAKING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Have Aria decide what action to take
   */
  async decideAction(userId, context, userMessage) {
    const systemPrompt = `You are Aria, an autonomous AI assistant for VoiceNow CRM.
You have full access to the CRM system and can take actions autonomously.

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}

USER MESSAGE: "${userMessage}"

Based on this context, decide what action to take. Respond with a JSON object:
{
  "action": "one of: respond, create_lead, update_lead, schedule_appointment, send_sms, send_email, make_call, search_contacts, no_action",
  "parameters": { ... action-specific parameters ... },
  "response": "what to say to the user/caller",
  "reasoning": "brief explanation of why you chose this action"
}

Be proactive - if a caller mentions needing a service, create a lead. If they want to schedule, create an appointment.
Always be helpful and professional.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const decision = JSON.parse(completion.choices[0].message.content);
    return decision;
  }

  /**
   * Execute Aria's decided action
   */
  async executeAction(userId, decision) {
    const { action, parameters } = decision;

    switch (action) {
      case 'create_lead':
        return this.createLeadFromCaller(userId, parameters);

      case 'update_lead':
        return this.updateLeadStatus(parameters.leadId, parameters.status, parameters.notes);

      case 'schedule_appointment':
        return this.createAppointment(userId, parameters);

      case 'send_sms':
        return this.sendSMS(userId, parameters.to, parameters.message, parameters.leadId);

      case 'send_email':
        return this.sendEmail(userId, parameters.to, parameters.subject, parameters.body, parameters.leadId);

      case 'make_call':
        return this.makeCall(userId, parameters.to, parameters.message);

      case 'search_contacts':
        return this.searchContacts(userId, parameters.query);

      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUTONOMOUS FOLLOW-UP
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process follow-ups for all users (run as cron job)
   */
  async processAutonomousFollowUps() {
    console.log('🤖 Aria: Processing autonomous follow-ups...');

    // Get all active users
    const users = await User.find({ status: 'active' }).select('_id email');

    for (const user of users) {
      try {
        // Get leads needing follow-up
        const leads = await this.getLeadsNeedingFollowUp(user._id, 3);

        for (const lead of leads) {
          // Generate follow-up message
          const message = await this.generateFollowUpMessage(lead);

          // Send SMS follow-up
          if (lead.phone) {
            await this.sendSMS(user._id, lead.phone, message, lead._id);
            console.log(`   📱 Sent follow-up SMS to ${lead.name}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing follow-ups for user ${user._id}:`, error.message);
      }
    }
  }

  /**
   * Generate personalized follow-up message
   */
  async generateFollowUpMessage(lead) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate a brief, friendly follow-up SMS message (under 160 chars) for a lead.
Lead info:
- Name: ${lead.name}
- Service interest: ${lead.projectType || 'general inquiry'}
- Status: ${lead.status}
- Last contact: ${lead.lastContactedAt || 'Never'}

Be professional but warm. Include a call-to-action.`
        }
      ],
      max_tokens: 60,
      temperature: 0.8
    });

    return completion.choices[0].message.content;
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
    return `+${digits}`;
  }

  /**
   * Get business hours status
   */
  isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Monday-Friday, 8am-6pm
    return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
  }
}

export default new AriaCRMService();
