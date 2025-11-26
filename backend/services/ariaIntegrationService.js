/**
 * Aria Integration Service
 *
 * Unified service for all Aria's data access capabilities:
 * - Phone data (contacts, messages, calls)
 * - Email (Gmail integration)
 * - Calendar (Google Calendar)
 * - Team collaboration
 * - RAG knowledge base
 * - CRM data
 */

import Contact from '../models/Contact.js';
import Lead from '../models/Lead.js';
import Appointment from '../models/Appointment.js';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import TeamMessage from '../models/TeamMessage.js';
import Task from '../models/Task.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import ragService from './ragService.js';
import { pushNotificationService } from './pushNotificationService.js';
import emailService from './emailService.js';
import agentSMSService from './agentSMSService.js';

class AriaIntegrationService {
  constructor() {
    console.log('✅ Aria Integration Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHONE DATA ACCESS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all contacts from synced phone data
   */
  async getPhoneContacts(userId, options = {}) {
    const { limit = 100, search = '', sortBy = 'lastInteraction' } = options;

    let query = { user: userId, isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {
      lastInteraction: { lastInteraction: -1 },
      name: { name: 1 },
      recent: { createdAt: -1 }
    };

    const contacts = await Contact.find(query)
      .sort(sortOptions[sortBy] || sortOptions.lastInteraction)
      .limit(limit)
      .lean();

    return {
      success: true,
      contacts,
      count: contacts.length,
      summary: `Found ${contacts.length} contacts${search ? ` matching "${search}"` : ''}`
    };
  }

  /**
   * Get contact by name (fuzzy match)
   */
  async findContactByName(userId, name) {
    const contacts = await Contact.find({
      user: userId,
      isDeleted: false,
      name: { $regex: name, $options: 'i' }
    }).limit(5);

    if (contacts.length === 0) {
      return { success: false, message: `No contact found named "${name}"` };
    }

    if (contacts.length === 1) {
      return {
        success: true,
        contact: contacts[0],
        summary: `Found ${contacts[0].name}: ${contacts[0].phone}${contacts[0].email ? `, ${contacts[0].email}` : ''}`
      };
    }

    return {
      success: true,
      contacts,
      count: contacts.length,
      summary: `Found ${contacts.length} contacts matching "${name}": ${contacts.map(c => c.name).join(', ')}`
    };
  }

  /**
   * Get recent call history
   */
  async getCallHistory(userId, options = {}) {
    const { limit = 20, direction = null, contactPhone = null } = options;

    let query = { userId };
    if (direction) query.direction = direction;
    if (contactPhone) query.phoneNumber = { $regex: contactPhone.replace(/\D/g, '').slice(-10) };

    const calls = await CallLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const summary = calls.length > 0
      ? `Recent calls: ${calls.slice(0, 3).map(c => `${c.callerName || c.phoneNumber} (${c.direction}, ${Math.round(c.duration / 60)}min)`).join(', ')}`
      : 'No recent calls found';

    return { success: true, calls, count: calls.length, summary };
  }

  /**
   * Get message history for a contact
   */
  async getMessageHistory(userId, contactIdentifier) {
    // Find contact by phone or name
    let contact;
    if (contactIdentifier.match(/\d{10,}/)) {
      contact = await Contact.findOne({
        user: userId,
        phone: { $regex: contactIdentifier.replace(/\D/g, '').slice(-10) },
        isDeleted: false
      });
    } else {
      contact = await Contact.findOne({
        user: userId,
        name: { $regex: contactIdentifier, $options: 'i' },
        isDeleted: false
      });
    }

    if (!contact) {
      return { success: false, message: `Contact "${contactIdentifier}" not found` };
    }

    const messages = contact.conversationHistory?.slice(-20) || [];

    return {
      success: true,
      contact: { name: contact.name, phone: contact.phone },
      messages,
      count: messages.length,
      summary: messages.length > 0
        ? `Last ${messages.length} messages with ${contact.name}`
        : `No messages with ${contact.name}`
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEAM COLLABORATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get team members
   */
  async getTeamMembers(userId) {
    const user = await User.findById(userId).lean();
    if (!user) return { success: false, message: 'User not found' };

    const teamMembers = user.teamMembers || [];

    // Get full user details for team members
    const memberDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const memberUser = await User.findOne({ email: member.email }).select('email company profile').lean();
        return {
          email: member.email,
          role: member.role,
          name: memberUser?.profile?.name || memberUser?.company || member.email.split('@')[0],
          addedAt: member.addedAt
        };
      })
    );

    return {
      success: true,
      teamMembers: memberDetails,
      count: memberDetails.length,
      summary: memberDetails.length > 0
        ? `Team: ${memberDetails.map(m => m.name).join(', ')}`
        : 'No team members found'
    };
  }

  /**
   * Send message to team member
   */
  async messageTeamMember(userId, memberEmail, message, options = {}) {
    const { channel = 'general', urgent = false } = options;

    // Find team member
    const user = await User.findById(userId);
    const member = user?.teamMembers?.find(m =>
      m.email.toLowerCase() === memberEmail.toLowerCase() ||
      m.email.toLowerCase().includes(memberEmail.toLowerCase())
    );

    if (!member) {
      return { success: false, message: `Team member "${memberEmail}" not found` };
    }

    // Create team message
    const teamMessage = await TeamMessage.create({
      channel,
      senderId: userId,
      senderName: user.company || user.email,
      content: message,
      mentions: [member.email],
      messageType: urgent ? 'alert' : 'text',
      metadata: { fromAria: true }
    });

    // Try to send notification
    try {
      await pushNotificationService.sendAriaNotification(
        member.email,
        urgent ? 'Urgent message from Aria' : 'Message from Aria',
        message,
        { urgent }
      );
    } catch (e) {
      console.log('Push notification failed:', e.message);
    }

    // Also try SMS if we have their phone
    const memberUser = await User.findOne({ email: member.email });
    if (urgent && memberUser?.phone) {
      try {
        await agentSMSService.sendSMS(memberUser.phone, message);
      } catch (e) {
        console.log('SMS to team member failed:', e.message);
      }
    }

    return {
      success: true,
      message: `Message sent to ${member.email}`,
      teamMessage
    };
  }

  /**
   * Assign task to team member
   */
  async assignTask(userId, memberEmail, taskDescription, options = {}) {
    const { priority = 'medium', dueDate = null, relatedContact = null } = options;

    // Find team member
    const user = await User.findById(userId);
    const member = user?.teamMembers?.find(m =>
      m.email.toLowerCase().includes(memberEmail.toLowerCase())
    );

    if (!member) {
      return { success: false, message: `Team member "${memberEmail}" not found` };
    }

    // Find member's user ID
    const memberUser = await User.findOne({ email: member.email });

    // Create task
    const task = await Task.create({
      user: userId,
      assignedTo: memberUser?._id,
      title: taskDescription,
      description: taskDescription,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending',
      autoCreationSource: 'voice_agent',
      metadata: { createdByAria: true }
    });

    // Notify team member
    try {
      await pushNotificationService.sendTaskNotification(
        member.email,
        `New task assigned: ${taskDescription}`,
        { taskId: task._id, priority }
      );
    } catch (e) {
      console.log('Task notification failed:', e.message);
    }

    return {
      success: true,
      task,
      summary: `Task assigned to ${member.email}: "${taskDescription}"`
    };
  }

  /**
   * Request follow-up from team member
   */
  async requestFollowUp(userId, memberEmail, contactIdentifier, notes) {
    // Find contact
    const contact = await this.findContactByName(userId, contactIdentifier);
    if (!contact.success && !contact.contact) {
      return { success: false, message: `Contact "${contactIdentifier}" not found` };
    }

    const targetContact = contact.contact || contact.contacts?.[0];

    // Create follow-up task
    const result = await this.assignTask(userId, memberEmail,
      `Follow up with ${targetContact.name} (${targetContact.phone}). Notes: ${notes}`,
      { priority: 'high', relatedContact: targetContact._id }
    );

    if (result.success) {
      result.summary = `Follow-up request sent to team for ${targetContact.name}`;
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCHEDULE & CALENDAR
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get schedule for date range
   */
  async getSchedule(userId, options = {}) {
    const {
      startDate = new Date(),
      endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      includeCompleted = false
    } = options;

    let query = {
      userId,
      startTime: { $gte: startDate, $lte: endDate }
    };

    if (!includeCompleted) {
      query.status = { $in: ['scheduled', 'confirmed'] };
    }

    const appointments = await Appointment.find(query)
      .sort({ startTime: 1 })
      .lean();

    const summary = appointments.length > 0
      ? `${appointments.length} appointments: ${appointments.slice(0, 3).map(a =>
          `${a.title} (${new Date(a.startTime).toLocaleDateString()})`
        ).join(', ')}`
      : 'No upcoming appointments';

    return { success: true, appointments, count: appointments.length, summary };
  }

  /**
   * Check availability for a time slot
   */
  async checkAvailability(userId, proposedTime, durationMinutes = 60) {
    const startTime = new Date(proposedTime);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const conflicts = await Appointment.find({
      userId,
      status: { $in: ['scheduled', 'confirmed'] },
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (conflicts.length === 0) {
      return {
        success: true,
        available: true,
        summary: `Time slot available: ${startTime.toLocaleString()}`
      };
    }

    return {
      success: true,
      available: false,
      conflicts,
      summary: `Conflict with: ${conflicts.map(c => c.title).join(', ')}`
    };
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(userId, appointmentId) {
    const appointment = await Appointment.findOne({ _id: appointmentId, userId });
    if (!appointment) {
      return { success: false, message: 'Appointment not found' };
    }

    // Find lead/contact for this appointment
    let contact = null;
    if (appointment.leadId) {
      const lead = await Lead.findById(appointment.leadId);
      if (lead) {
        contact = { name: lead.name, phone: lead.phone, email: lead.email };
      }
    }

    if (!contact) {
      return { success: false, message: 'No contact associated with this appointment' };
    }

    const reminderMessage = `Reminder: You have an appointment "${appointment.title}" on ${new Date(appointment.startTime).toLocaleString()}${appointment.location ? ` at ${appointment.location}` : ''}`;

    // Send SMS
    if (contact.phone) {
      await agentSMSService.sendSMS(contact.phone, reminderMessage);
    }

    // Send email
    if (contact.email) {
      await emailService.send({
        to: contact.email,
        subject: `Appointment Reminder: ${appointment.title}`,
        html: `<p>${reminderMessage}</p>`
      });
    }

    appointment.reminderSent = true;
    await appointment.save();

    return {
      success: true,
      summary: `Reminder sent to ${contact.name}`
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // RAG KNOWLEDGE BASE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Search knowledge base for relevant information
   */
  async searchKnowledge(userId, query, options = {}) {
    const { limit = 5, threshold = 0.6 } = options;

    try {
      const results = await ragService.searchKnowledgeBase(userId, query, {
        limit,
        threshold
      });

      if (!results || results.length === 0) {
        return {
          success: true,
          results: [],
          summary: 'No relevant information found in knowledge base'
        };
      }

      const summary = results.slice(0, 2).map(r => r.summary || r.content?.slice(0, 100)).join('; ');

      return {
        success: true,
        results,
        count: results.length,
        summary: `Found ${results.length} relevant documents: ${summary}`
      };
    } catch (error) {
      console.error('RAG search error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get context-enhanced prompt with RAG data
   */
  async getEnhancedContext(userId, userMessage) {
    try {
      const enhanced = await ragService.enhancePromptWithContext(userId, userMessage);
      return enhanced;
    } catch (error) {
      console.error('RAG context enhancement error:', error);
      return userMessage;
    }
  }

  /**
   * List available knowledge bases
   */
  async listKnowledgeBases(userId) {
    const kbs = await KnowledgeBase.find({ userId, status: 'ready' })
      .select('name description sourceType keywords')
      .lean();

    return {
      success: true,
      knowledgeBases: kbs,
      count: kbs.length,
      summary: kbs.length > 0
        ? `Knowledge bases: ${kbs.map(k => k.name).join(', ')}`
        : 'No knowledge bases configured'
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHONE ORGANIZATION & CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Find duplicate contacts
   */
  async findDuplicateContacts(userId) {
    const contacts = await Contact.find({ user: userId, isDeleted: false }).lean();

    const duplicates = [];
    const seen = new Map();

    for (const contact of contacts) {
      const normalizedPhone = contact.phone?.replace(/\D/g, '').slice(-10);
      if (normalizedPhone && seen.has(normalizedPhone)) {
        duplicates.push({
          original: seen.get(normalizedPhone),
          duplicate: contact
        });
      } else if (normalizedPhone) {
        seen.set(normalizedPhone, contact);
      }
    }

    return {
      success: true,
      duplicates,
      count: duplicates.length,
      summary: duplicates.length > 0
        ? `Found ${duplicates.length} duplicate contacts that could be merged`
        : 'No duplicate contacts found'
    };
  }

  /**
   * Merge duplicate contacts
   */
  async mergeDuplicateContacts(userId, keepId, removeId) {
    const keepContact = await Contact.findOne({ _id: keepId, user: userId });
    const removeContact = await Contact.findOne({ _id: removeId, user: userId });

    if (!keepContact || !removeContact) {
      return { success: false, message: 'One or both contacts not found' };
    }

    // Merge data from removeContact to keepContact
    if (!keepContact.email && removeContact.email) keepContact.email = removeContact.email;
    if (!keepContact.company && removeContact.company) keepContact.company = removeContact.company;
    if (!keepContact.notes && removeContact.notes) keepContact.notes = removeContact.notes;

    // Merge conversation history
    if (removeContact.conversationHistory?.length > 0) {
      keepContact.conversationHistory = [
        ...(keepContact.conversationHistory || []),
        ...removeContact.conversationHistory
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Merge stats
    keepContact.totalCalls = (keepContact.totalCalls || 0) + (removeContact.totalCalls || 0);
    keepContact.totalSMS = (keepContact.totalSMS || 0) + (removeContact.totalSMS || 0);

    await keepContact.save();

    // Soft delete the duplicate
    removeContact.isDeleted = true;
    await removeContact.save();

    return {
      success: true,
      mergedContact: keepContact,
      summary: `Merged "${removeContact.name}" into "${keepContact.name}"`
    };
  }

  /**
   * Get contacts needing follow-up (no recent interaction)
   */
  async getStaleContacts(userId, daysSinceContact = 30) {
    const cutoffDate = new Date(Date.now() - daysSinceContact * 24 * 60 * 60 * 1000);

    const staleContacts = await Contact.find({
      user: userId,
      isDeleted: false,
      $or: [
        { lastInteraction: { $lt: cutoffDate } },
        { lastInteraction: { $exists: false } }
      ]
    })
    .sort({ lastInteraction: 1 })
    .limit(20)
    .lean();

    return {
      success: true,
      contacts: staleContacts,
      count: staleContacts.length,
      summary: staleContacts.length > 0
        ? `${staleContacts.length} contacts haven't been contacted in ${daysSinceContact}+ days`
        : 'All contacts are up to date'
    };
  }

  /**
   * Categorize/tag contacts automatically
   */
  async categorizeContact(userId, contactId, tags) {
    const contact = await Contact.findOne({ _id: contactId, user: userId });
    if (!contact) {
      return { success: false, message: 'Contact not found' };
    }

    const newTags = Array.isArray(tags) ? tags : [tags];
    contact.tags = [...new Set([...(contact.tags || []), ...newTags])];
    await contact.save();

    return {
      success: true,
      contact,
      summary: `Added tags to ${contact.name}: ${newTags.join(', ')}`
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // UNIFIED DATA ACCESS (for voice.js)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get full context for Aria conversation
   * Combines phone data, schedule, team info, and RAG
   */
  async getFullContext(userId, userMessage) {
    const context = {
      phone: {},
      schedule: {},
      team: {},
      knowledge: {}
    };

    // Get recent contacts and calls
    try {
      context.phone.recentContacts = await Contact.find({ user: userId, isDeleted: false })
        .sort({ lastInteraction: -1 })
        .limit(10)
        .select('name phone email lastInteraction')
        .lean();

      context.phone.recentCalls = await CallLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    } catch (e) {
      console.error('Error getting phone context:', e);
    }

    // Get upcoming schedule
    try {
      context.schedule.upcoming = await Appointment.find({
        userId,
        startTime: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .sort({ startTime: 1 })
      .limit(5)
      .lean();
    } catch (e) {
      console.error('Error getting schedule context:', e);
    }

    // Get team info
    try {
      const teamResult = await this.getTeamMembers(userId);
      context.team = teamResult;
    } catch (e) {
      console.error('Error getting team context:', e);
    }

    // Get relevant knowledge (RAG)
    try {
      const ragResults = await this.searchKnowledge(userId, userMessage);
      context.knowledge = ragResults;
    } catch (e) {
      console.error('Error getting knowledge context:', e);
    }

    return context;
  }
}

export const ariaIntegrationService = new AriaIntegrationService();
export default ariaIntegrationService;
