/**
 * Aria Background Processing Service
 *
 * Handles autonomous background operations:
 * - Real-time SMS monitoring and auto-response
 * - Email inbox monitoring (Gmail)
 * - Call log monitoring and missed call callbacks
 * - Workflow optimization and task automation
 * - Proactive lead follow-ups
 */

import cron from 'node-cron';
import OpenAI from 'openai';
import Contact from '../models/Contact.js';
import Lead from '../models/Lead.js';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import AgentSMS from '../models/AgentSMS.js';
import Appointment from '../models/Appointment.js';
import Task from '../models/Task.js';
import UserIntegration from '../models/UserIntegration.js';
import ariaSMSService from './ariaSMSService.js';
import agentSMSService from './agentSMSService.js';
import emailService from './emailService.js';
import { pushNotificationService } from './pushNotificationService.js';
import twilioService from './twilioService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AriaBackgroundService {
  constructor() {
    this.isRunning = false;
    this.processedItems = new Set(); // Track processed items to avoid duplicates
    this.userSettings = new Map(); // Cache user automation settings
    console.log('✅ Aria Background Service initialized');
  }

  /**
   * Start background processing for all enabled users
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Aria Background Service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Aria Background Service started');

    // Process incoming messages every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      await this.processIncomingMessages();
    });

    // Check for missed calls every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      await this.processMissedCalls();
    });

    // Check for stale leads every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.processStaleLeads();
    });

    // Workflow optimization every hour
    cron.schedule('0 * * * *', async () => {
      await this.optimizeWorkflows();
    });

    // Daily summary at 8 AM
    cron.schedule('0 8 * * *', async () => {
      await this.sendDailySummaries();
    });

    // Appointment reminders every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.sendAppointmentReminders();
    });
  }

  /**
   * Stop background processing
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Aria Background Service stopped');
  }

  // ═══════════════════════════════════════════════════════════════════
  // SMS PROCESSING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process incoming SMS messages that need AI response
   */
  async processIncomingMessages() {
    try {
      // Find unprocessed incoming SMS from the last 5 minutes
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000);

      const unprocessedMessages = await AgentSMS.find({
        direction: 'inbound',
        createdAt: { $gte: cutoffTime },
        'metadata.ariaProcessed': { $ne: true },
        'metadata.type': { $ne: 'aria_ai_response' }
      }).limit(20);

      for (const sms of unprocessedMessages) {
        if (this.processedItems.has(sms._id.toString())) continue;
        this.processedItems.add(sms._id.toString());

        try {
          // Get user settings to check if auto-response is enabled
          const userSettings = await this.getUserAriaSettings(sms.userId);

          if (userSettings?.autoRespondSMS) {
            // Find lead/contact
            const lead = await Lead.findOne({
              userId: sms.userId,
              phone: { $regex: sms.from.replace(/\D/g, '').slice(-10) }
            });

            // Process with Aria AI
            await ariaSMSService.processWithAria({
              from: sms.from,
              to: sms.to,
              message: sms.message,
              smsRecord: sms,
              lead
            });

            // Mark as processed
            sms.metadata = sms.metadata || {};
            sms.metadata.ariaProcessed = true;
            sms.metadata.ariaProcessedAt = new Date();
            await sms.save();

            console.log(`🤖 Aria auto-responded to SMS from ${sms.from}`);
          }
        } catch (error) {
          console.error(`Error processing SMS ${sms._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in processIncomingMessages:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALL PROCESSING & CALLBACK
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process missed calls and initiate callbacks
   */
  async processMissedCalls() {
    try {
      // Find missed calls from the last hour that haven't been handled
      const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);

      const missedCalls = await CallLog.find({
        status: 'no-answer',
        direction: 'inbound',
        createdAt: { $gte: cutoffTime },
        'metadata.ariaCallback': { $ne: true }
      }).limit(10);

      for (const call of missedCalls) {
        if (this.processedItems.has(`call_${call._id}`)) continue;
        this.processedItems.add(`call_${call._id}`);

        try {
          const userSettings = await this.getUserAriaSettings(call.userId);

          if (userSettings?.autoCallbackMissed) {
            // Check if we should call back (business hours, etc.)
            if (this.isBusinessHours()) {
              await this.initiateCallback(call);
            } else {
              // Schedule for next business hours
              await this.scheduleCallback(call);
            }
          } else if (userSettings?.notifyMissedCalls) {
            // Just send a notification
            await this.notifyMissedCall(call);
          }

          // Mark as processed
          call.metadata = call.metadata || {};
          call.metadata.ariaCallback = true;
          call.metadata.ariaProcessedAt = new Date();
          await call.save();
        } catch (error) {
          console.error(`Error processing missed call ${call._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in processMissedCalls:', error);
    }
  }

  /**
   * Initiate a callback to a missed caller
   */
  async initiateCallback(callLog) {
    try {
      console.log(`📞 Aria initiating callback to ${callLog.phoneNumber}`);

      // Find contact/lead info
      const contact = await Contact.findOne({
        user: callLog.userId,
        phone: { $regex: callLog.phoneNumber.replace(/\D/g, '').slice(-10) },
        isDeleted: false
      });

      // First, send an SMS letting them know we're calling back
      const smsMessage = contact?.name
        ? `Hi ${contact.name.split(' ')[0]}! We noticed we missed your call. Aria from VoiceFlow is calling you back now.`
        : `We noticed we missed your call. Aria from VoiceFlow is calling you back now.`;

      await agentSMSService.sendSMS(callLog.phoneNumber, smsMessage);

      // Wait 10 seconds, then initiate the call
      setTimeout(async () => {
        try {
          // Get the user's Twilio phone number
          const PhoneNumber = (await import('../models/PhoneNumber.js')).default;
          const userPhone = await PhoneNumber.findOne({ userId: callLog.userId, isActive: true });
          const fromNumber = userPhone?.phoneNumber || process.env.TWILIO_PHONE_NUMBER;

          // Use ElevenLabs agent for the callback (Aria agent)
          const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVENLABS_ARIA_AGENT_ID;

          const result = await twilioService.makeCallWithElevenLabs(
            fromNumber,
            callLog.phoneNumber,
            elevenLabsAgentId,
            contact?.name || 'Customer'
          );

          console.log(`✅ Callback initiated to ${callLog.phoneNumber}:`, result);

          // Log the callback
          await CallLog.create({
            userId: callLog.userId,
            direction: 'outbound',
            phoneNumber: callLog.phoneNumber,
            callerName: contact?.name || 'Callback',
            leadId: callLog.leadId,
            status: 'initiated',
            metadata: {
              type: 'aria_callback',
              originalMissedCall: callLog._id,
              triggeredBy: 'aria_background'
            }
          });
        } catch (callError) {
          console.error('Failed to initiate callback:', callError);
        }
      }, 10000);

      return { success: true, message: 'Callback initiated' };
    } catch (error) {
      console.error('Error initiating callback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule a callback for business hours
   */
  async scheduleCallback(callLog) {
    try {
      const nextBusinessHour = this.getNextBusinessHour();

      // Create a task for the callback
      await Task.create({
        user: callLog.userId,
        title: `Callback: ${callLog.callerName || callLog.phoneNumber}`,
        description: `Missed call callback. Original call time: ${callLog.createdAt.toLocaleString()}`,
        priority: 'high',
        dueDate: nextBusinessHour,
        status: 'pending',
        autoCreationSource: 'aria_background',
        metadata: {
          type: 'scheduled_callback',
          phoneNumber: callLog.phoneNumber,
          originalCallId: callLog._id
        }
      });

      // Notify user about scheduled callback
      await pushNotificationService.sendToUser(callLog.userId, {
        title: 'Callback Scheduled',
        body: `Aria scheduled a callback to ${callLog.callerName || callLog.phoneNumber} for ${nextBusinessHour.toLocaleTimeString()}`,
        data: { type: 'scheduled_callback', callLogId: callLog._id }
      });

      console.log(`📅 Callback scheduled for ${nextBusinessHour}`);
    } catch (error) {
      console.error('Error scheduling callback:', error);
    }
  }

  /**
   * Send notification about missed call
   */
  async notifyMissedCall(callLog) {
    try {
      await pushNotificationService.sendToUser(callLog.userId, {
        title: 'Missed Call',
        body: `You missed a call from ${callLog.callerName || callLog.phoneNumber}`,
        data: {
          type: 'missed_call',
          phoneNumber: callLog.phoneNumber,
          callLogId: callLog._id
        }
      });
    } catch (error) {
      console.error('Error sending missed call notification:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // EMAIL PROCESSING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process incoming emails (Gmail) for users with integration
   */
  async processIncomingEmails() {
    try {
      // Get users with Gmail integration enabled
      const integrations = await UserIntegration.find({
        service: 'google',
        'credentials.scope': { $regex: 'gmail' },
        status: 'connected',
        enabled: true
      });

      for (const integration of integrations) {
        try {
          const userSettings = await this.getUserAriaSettings(integration.userId);

          if (!userSettings?.autoRespondEmail) continue;

          // Get recent unread emails
          const gmailService = require('./gmailService.js').default;
          const emails = await gmailService.getRecentEmails(integration.userId, {
            maxResults: 10,
            q: 'is:unread'
          });

          for (const email of emails) {
            if (this.processedItems.has(`email_${email.id}`)) continue;
            this.processedItems.add(`email_${email.id}`);

            // Analyze email and determine if it needs response
            const shouldRespond = await this.analyzeEmailForResponse(email, userSettings);

            if (shouldRespond) {
              await this.generateAndSendEmailResponse(integration.userId, email, userSettings);
            }
          }
        } catch (error) {
          console.error(`Error processing emails for user ${integration.userId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in processIncomingEmails:', error);
    }
  }

  /**
   * Analyze if email needs AI response
   */
  async analyzeEmailForResponse(email, userSettings) {
    // Don't auto-respond to:
    // - No-reply addresses
    // - Marketing/newsletter emails
    // - Already replied threads
    const from = email.from?.toLowerCase() || '';

    if (from.includes('noreply') || from.includes('no-reply') || from.includes('mailer-daemon')) {
      return false;
    }

    // Check if this is a business inquiry
    const subject = email.subject?.toLowerCase() || '';
    const body = email.snippet?.toLowerCase() || '';

    const businessKeywords = ['quote', 'estimate', 'price', 'appointment', 'schedule', 'inquiry', 'question', 'help', 'service'];
    const isBusinessRelated = businessKeywords.some(kw => subject.includes(kw) || body.includes(kw));

    return isBusinessRelated;
  }

  /**
   * Generate and send AI email response
   */
  async generateAndSendEmailResponse(userId, email, userSettings) {
    try {
      // Get user info for context
      const user = await User.findById(userId);
      const profile = await UserProfile.findOne({ user: userId });

      const systemPrompt = `You are Aria, an AI assistant responding to emails for ${profile?.businessName || user?.company || 'the business'}.

STYLE:
- Professional and helpful
- Concise but thorough
- Warm and personable
- Proactive in offering next steps

RULES:
- Never make up information
- Offer to schedule a call or appointment if appropriate
- Include clear call-to-action
- Sign off as "Aria, AI Assistant"

Business context: ${profile?.businessDescription || 'A professional service business'}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please draft a response to this email:\n\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.snippet}` }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const responseText = completion.choices[0].message.content;

      // Send the email response
      const gmailService = require('./gmailService.js').default;
      await gmailService.sendEmail(userId, {
        to: email.from,
        subject: `Re: ${email.subject}`,
        body: responseText,
        replyToMessageId: email.id
      });

      console.log(`📧 Aria auto-responded to email from ${email.from}`);
    } catch (error) {
      console.error('Error generating email response:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // WORKFLOW OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process stale leads that need follow-up
   */
  async processStaleLeads() {
    try {
      const cutoffDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days

      // Find leads that haven't been contacted recently
      const staleLeads = await Lead.find({
        status: { $in: ['new', 'contacted', 'interested'] },
        lastActivityAt: { $lt: cutoffDate },
        'metadata.ariaFollowupSent': { $ne: true }
      }).limit(10);

      for (const lead of staleLeads) {
        if (this.processedItems.has(`lead_${lead._id}`)) continue;
        this.processedItems.add(`lead_${lead._id}`);

        try {
          const userSettings = await this.getUserAriaSettings(lead.userId);

          if (userSettings?.autoFollowUpLeads) {
            await this.sendLeadFollowUp(lead);
          }
        } catch (error) {
          console.error(`Error processing stale lead ${lead._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in processStaleLeads:', error);
    }
  }

  /**
   * Send follow-up message to stale lead
   */
  async sendLeadFollowUp(lead) {
    try {
      const daysSinceContact = Math.floor((Date.now() - lead.lastActivityAt) / (1000 * 60 * 60 * 24));

      const message = `Hi ${lead.name.split(' ')[0]}! This is Aria from VoiceFlow. Just following up on our previous conversation. Is there anything I can help you with? Would you like to schedule a call?`;

      if (lead.phone) {
        await agentSMSService.sendSMS(lead.phone, message);
      }

      // Update lead
      lead.lastActivityAt = new Date();
      lead.lastActivityType = 'aria_followup';
      lead.metadata = lead.metadata || {};
      lead.metadata.ariaFollowupSent = true;
      lead.metadata.ariaFollowupAt = new Date();
      await lead.save();

      console.log(`📲 Aria sent follow-up to ${lead.name} (${daysSinceContact} days inactive)`);
    } catch (error) {
      console.error('Error sending lead follow-up:', error);
    }
  }

  /**
   * Optimize workflows - analyze patterns and suggest improvements
   */
  async optimizeWorkflows() {
    try {
      // Get active users
      const users = await User.find({
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      for (const user of users) {
        try {
          const userSettings = await this.getUserAriaSettings(user._id);

          if (!userSettings?.workflowOptimization) continue;

          // Analyze user's workflow patterns
          const analysis = await this.analyzeWorkflowPatterns(user._id);

          if (analysis.recommendations.length > 0) {
            await this.sendWorkflowRecommendations(user._id, analysis);
          }
        } catch (error) {
          console.error(`Error optimizing workflows for user ${user._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in optimizeWorkflows:', error);
    }
  }

  /**
   * Analyze workflow patterns for optimization
   */
  async analyzeWorkflowPatterns(userId) {
    const recommendations = [];

    // Check response times
    const avgResponseTime = await this.calculateAvgResponseTime(userId);
    if (avgResponseTime > 30 * 60 * 1000) { // > 30 min
      recommendations.push({
        type: 'response_time',
        message: 'Your average response time is over 30 minutes. Consider enabling Aria auto-responses to improve lead engagement.',
        action: 'enable_auto_response'
      });
    }

    // Check follow-up rate
    const followUpRate = await this.calculateFollowUpRate(userId);
    if (followUpRate < 0.5) { // < 50%
      recommendations.push({
        type: 'follow_up',
        message: 'Over 50% of your leads haven\'t received follow-ups. Enable automatic follow-ups to improve conversion.',
        action: 'enable_auto_followup'
      });
    }

    // Check appointment conversion
    const appointmentRate = await this.calculateAppointmentRate(userId);
    if (appointmentRate < 0.2) { // < 20%
      recommendations.push({
        type: 'appointments',
        message: 'Your lead-to-appointment conversion is below 20%. Consider letting Aria proactively suggest scheduling.',
        action: 'enable_appointment_suggestions'
      });
    }

    return { recommendations, metrics: { avgResponseTime, followUpRate, appointmentRate } };
  }

  /**
   * Send workflow recommendations to user
   */
  async sendWorkflowRecommendations(userId, analysis) {
    try {
      const topRecommendation = analysis.recommendations[0];

      await pushNotificationService.sendToUser(userId, {
        title: '💡 Aria Workflow Tip',
        body: topRecommendation.message,
        data: {
          type: 'workflow_recommendation',
          action: topRecommendation.action,
          recommendations: analysis.recommendations
        }
      });
    } catch (error) {
      console.error('Error sending workflow recommendations:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPOINTMENT REMINDERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Send appointment reminders
   */
  async sendAppointmentReminders() {
    try {
      const now = new Date();
      const reminderWindows = [
        { minutes: 60, type: '1_hour' },
        { minutes: 15, type: '15_min' }
      ];

      for (const window of reminderWindows) {
        const windowStart = new Date(now.getTime() + (window.minutes - 2) * 60 * 1000);
        const windowEnd = new Date(now.getTime() + (window.minutes + 2) * 60 * 1000);

        const appointments = await Appointment.find({
          startTime: { $gte: windowStart, $lte: windowEnd },
          status: { $in: ['scheduled', 'confirmed'] },
          [`metadata.reminder_${window.type}`]: { $ne: true }
        });

        for (const apt of appointments) {
          try {
            await this.sendAppointmentReminder(apt, window.type);
          } catch (error) {
            console.error(`Error sending reminder for appointment ${apt._id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error in sendAppointmentReminders:', error);
    }
  }

  /**
   * Send a single appointment reminder
   */
  async sendAppointmentReminder(appointment, reminderType) {
    try {
      // Get lead/contact info
      let contact = null;
      if (appointment.leadId) {
        const lead = await Lead.findById(appointment.leadId);
        if (lead) {
          contact = { name: lead.name, phone: lead.phone, email: lead.email };
        }
      }

      if (!contact?.phone) return;

      const timeUntil = reminderType === '1_hour' ? 'in 1 hour' : 'in 15 minutes';
      const message = `Hi ${contact.name.split(' ')[0]}! Reminder: Your appointment "${appointment.title}" is ${timeUntil}${appointment.location ? ` at ${appointment.location}` : ''}. Reply CONFIRM to confirm or RESCHEDULE to reschedule.`;

      await agentSMSService.sendSMS(contact.phone, message);

      // Mark reminder as sent
      appointment.metadata = appointment.metadata || {};
      appointment.metadata[`reminder_${reminderType}`] = true;
      appointment.metadata[`reminder_${reminderType}_at`] = new Date();
      await appointment.save();

      console.log(`⏰ Sent ${reminderType} reminder for ${appointment.title}`);
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DAILY SUMMARIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Send daily summaries to all enabled users
   */
  async sendDailySummaries() {
    try {
      const users = await User.find({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      for (const user of users) {
        try {
          const userSettings = await this.getUserAriaSettings(user._id);

          if (userSettings?.dailySummary) {
            await this.sendDailySummary(user._id);
          }
        } catch (error) {
          console.error(`Error sending daily summary to ${user._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in sendDailySummaries:', error);
    }
  }

  /**
   * Generate and send daily summary for a user
   */
  async sendDailySummary(userId) {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Gather stats
      const stats = {
        newLeads: await Lead.countDocuments({ userId, createdAt: { $gte: yesterday } }),
        callsHandled: await CallLog.countDocuments({ userId, createdAt: { $gte: yesterday } }),
        messagesHandled: await AgentSMS.countDocuments({ userId, createdAt: { $gte: yesterday } }),
        appointmentsToday: await Appointment.countDocuments({
          userId,
          startTime: { $gte: new Date(), $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) }
        }),
        tasksCompleted: await Task.countDocuments({ user: userId, status: 'completed', updatedAt: { $gte: yesterday } })
      };

      const summary = `Good morning! Yesterday: ${stats.newLeads} new leads, ${stats.callsHandled} calls, ${stats.messagesHandled} messages. Today you have ${stats.appointmentsToday} appointments. ${stats.tasksCompleted} tasks completed.`;

      await pushNotificationService.sendToUser(userId, {
        title: 'Daily Summary from Aria',
        body: summary,
        data: { type: 'daily_summary', stats }
      });

      console.log(`📊 Daily summary sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get user's Aria automation settings
   */
  async getUserAriaSettings(userId) {
    if (this.userSettings.has(userId.toString())) {
      return this.userSettings.get(userId.toString());
    }

    try {
      const profile = await UserProfile.findOne({ user: userId });

      const settings = {
        autoRespondSMS: profile?.ariaSettings?.autoRespondSMS ?? true,
        autoRespondEmail: profile?.ariaSettings?.autoRespondEmail ?? false,
        autoCallbackMissed: profile?.ariaSettings?.autoCallbackMissed ?? false,
        notifyMissedCalls: profile?.ariaSettings?.notifyMissedCalls ?? true,
        autoFollowUpLeads: profile?.ariaSettings?.autoFollowUpLeads ?? true,
        workflowOptimization: profile?.ariaSettings?.workflowOptimization ?? true,
        dailySummary: profile?.ariaSettings?.dailySummary ?? true,
        businessHoursOnly: profile?.ariaSettings?.businessHoursOnly ?? true,
        businessHoursStart: profile?.ariaSettings?.businessHoursStart ?? 8,
        businessHoursEnd: profile?.ariaSettings?.businessHoursEnd ?? 18
      };

      this.userSettings.set(userId.toString(), settings);
      return settings;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  /**
   * Check if current time is within business hours
   */
  isBusinessHours(startHour = 8, endHour = 18) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check weekend
    if (day === 0 || day === 6) return false;

    return hour >= startHour && hour < endHour;
  }

  /**
   * Get next business hour
   */
  getNextBusinessHour(startHour = 8) {
    const now = new Date();
    const next = new Date(now);

    // If before business hours today
    if (now.getHours() < startHour) {
      next.setHours(startHour, 0, 0, 0);
      return next;
    }

    // Otherwise, next business day
    next.setDate(next.getDate() + 1);

    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }

    next.setHours(startHour, 0, 0, 0);
    return next;
  }

  /**
   * Calculate average response time
   */
  async calculateAvgResponseTime(userId) {
    try {
      const messages = await AgentSMS.find({
        userId,
        direction: 'inbound',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).lean();

      if (messages.length === 0) return 0;

      let totalResponseTime = 0;
      let count = 0;

      for (const msg of messages) {
        // Find the first outbound response
        const response = await AgentSMS.findOne({
          userId,
          direction: 'outbound',
          to: msg.from,
          createdAt: { $gt: msg.createdAt }
        }).sort({ createdAt: 1 });

        if (response) {
          totalResponseTime += response.createdAt - msg.createdAt;
          count++;
        }
      }

      return count > 0 ? totalResponseTime / count : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate follow-up rate
   */
  async calculateFollowUpRate(userId) {
    try {
      const totalLeads = await Lead.countDocuments({ userId });
      const followedUp = await Lead.countDocuments({
        userId,
        $or: [
          { callsMade: { $gt: 0 } },
          { messagesSent: { $gt: 0 } },
          { lastActivityType: { $exists: true } }
        ]
      });

      return totalLeads > 0 ? followedUp / totalLeads : 1;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Calculate appointment conversion rate
   */
  async calculateAppointmentRate(userId) {
    try {
      const totalLeads = await Lead.countDocuments({ userId });
      const leadsWithAppointments = await Appointment.distinct('leadId', { userId });

      return totalLeads > 0 ? leadsWithAppointments.length / totalLeads : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear processed items cache (call periodically)
   */
  clearCache() {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    this.processedItems.clear();
    this.userSettings.clear();
    console.log('🧹 Aria background cache cleared');
  }
}

// Create singleton instance
const ariaBackgroundService = new AriaBackgroundService();

// Auto-start when module is loaded
ariaBackgroundService.start();

// Clear cache every 30 minutes
setInterval(() => {
  ariaBackgroundService.clearCache();
}, 30 * 60 * 1000);

export default ariaBackgroundService;
