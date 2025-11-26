/**
 * Background Sync Service
 *
 * Handles automatic syncing of contacts, calendars, call history,
 * and other device data from mobile apps without user intervention.
 * Also handles social media data syncing.
 */

import Contact from '../models/Contact.js';
import Lead from '../models/Lead.js';
import Appointment from '../models/Appointment.js';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';

class BackgroundSyncService {
  constructor() {
    console.log('✅ Background Sync Service initialized');
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTACT SYNC
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Sync contacts from device
   * Called by mobile app in background
   */
  async syncContacts(userId, contacts) {
    console.log(`📱 Syncing ${contacts.length} contacts for user ${userId}`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const contactData of contacts) {
      try {
        const phone = this.normalizePhone(contactData.phone);
        if (!phone || phone.length < 10) {
          skipped++;
          continue;
        }

        // Check if contact exists
        const existingContact = await Contact.findOne({
          user: userId,
          phone: { $regex: phone.slice(-10) },
          isDeleted: false
        });

        if (existingContact) {
          // Update existing contact if newer data
          let changed = false;

          if (contactData.firstName && contactData.lastName) {
            const newName = `${contactData.firstName} ${contactData.lastName}`.trim();
            if (existingContact.name !== newName && newName.length > existingContact.name.length) {
              existingContact.name = newName;
              changed = true;
            }
          }

          if (contactData.email && !existingContact.email) {
            existingContact.email = contactData.email;
            changed = true;
          }

          if (contactData.company && !existingContact.company) {
            existingContact.company = contactData.company;
            changed = true;
          }

          if (contactData.notes && !existingContact.notes) {
            existingContact.notes = contactData.notes;
            changed = true;
          }

          if (changed) {
            await existingContact.save();
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new contact
          await Contact.create({
            user: userId,
            name: `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || 'Unknown',
            phone,
            email: contactData.email || '',
            company: contactData.company || '',
            notes: contactData.notes || '',
            importSource: contactData.source || 'phone',
            tags: ['device_sync']
          });
          imported++;
        }
      } catch (error) {
        console.error(`Error syncing contact:`, error.message);
        skipped++;
      }
    }

    console.log(`   ✅ Contacts sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    return { imported, updated, skipped, total: contacts.length };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALENDAR SYNC
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Sync calendar events from device
   */
  async syncCalendar(userId, events) {
    console.log(`📅 Syncing ${events.length} calendar events for user ${userId}`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const eventData of events) {
      try {
        const startTime = new Date(eventData.startDate);
        const endTime = new Date(eventData.endDate);

        // Skip events in the past
        if (endTime < new Date()) {
          skipped++;
          continue;
        }

        // Check if similar appointment exists
        const existingAppointment = await Appointment.findOne({
          userId,
          startTime: {
            $gte: new Date(startTime.getTime() - 60000), // Within 1 minute
            $lte: new Date(startTime.getTime() + 60000)
          }
        });

        if (existingAppointment) {
          // Update if title changed
          if (existingAppointment.title !== eventData.title) {
            existingAppointment.title = eventData.title;
            existingAppointment.description = eventData.notes || existingAppointment.description;
            existingAppointment.location = eventData.location || existingAppointment.location;
            await existingAppointment.save();
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Try to find or create a lead for this appointment
          let leadId = null;

          // Extract phone or email from event if available
          if (eventData.attendeePhone || eventData.attendeeEmail) {
            const lead = await this.findOrCreateLeadForEvent(userId, eventData);
            if (lead) leadId = lead._id;
          }

          // Create appointment (without lead if not found - that's ok for general calendar events)
          if (leadId || eventData.title) {
            await Appointment.create({
              userId,
              leadId,
              title: eventData.title || 'Calendar Event',
              description: eventData.notes || '',
              type: this.inferAppointmentType(eventData.title),
              startTime,
              endTime,
              location: eventData.location || '',
              status: 'scheduled',
              aiScheduled: false,
              metadata: { source: 'device_sync', originalId: eventData.id }
            });
            imported++;
          } else {
            skipped++;
          }
        }
      } catch (error) {
        console.error(`Error syncing calendar event:`, error.message);
        skipped++;
      }
    }

    console.log(`   ✅ Calendar sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    return { imported, updated, skipped, total: events.length };
  }

  /**
   * Find or create lead for calendar event
   */
  async findOrCreateLeadForEvent(userId, eventData) {
    if (eventData.attendeePhone) {
      const phone = this.normalizePhone(eventData.attendeePhone);
      let lead = await Lead.findOne({ userId, phone: { $regex: phone.slice(-10) } });

      if (!lead) {
        lead = await Lead.create({
          userId,
          name: eventData.attendeeName || 'Unknown',
          phone,
          email: eventData.attendeeEmail || `${phone.replace(/\D/g, '')}@placeholder.com`,
          source: 'manual',
          status: 'new'
        });
      }
      return lead;
    }

    if (eventData.attendeeEmail) {
      let lead = await Lead.findOne({ userId, email: eventData.attendeeEmail.toLowerCase() });
      if (!lead) {
        lead = await Lead.create({
          userId,
          name: eventData.attendeeName || eventData.attendeeEmail.split('@')[0],
          email: eventData.attendeeEmail.toLowerCase(),
          phone: '+10000000000', // Placeholder
          source: 'manual',
          status: 'new'
        });
      }
      return lead;
    }

    return null;
  }

  /**
   * Infer appointment type from title
   */
  inferAppointmentType(title) {
    if (!title) return 'other';
    const lower = title.toLowerCase();

    if (lower.includes('call')) return 'call';
    if (lower.includes('phone')) return 'call';
    if (lower.includes('site') || lower.includes('visit')) return 'site_visit';
    if (lower.includes('follow')) return 'follow_up';
    if (lower.includes('consult')) return 'consultation';
    if (lower.includes('meeting') || lower.includes('meet')) return 'meeting';

    return 'meeting';
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALL HISTORY SYNC
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Sync call history from device
   */
  async syncCallHistory(userId, calls) {
    console.log(`📞 Syncing ${calls.length} calls for user ${userId}`);

    let imported = 0;
    let skipped = 0;

    for (const callData of calls) {
      try {
        const phone = this.normalizePhone(callData.phoneNumber);
        if (!phone) {
          skipped++;
          continue;
        }

        // Check if we already have this call (by timestamp and phone)
        const callTime = new Date(callData.timestamp || callData.dateTime);
        const existingCall = await CallLog.findOne({
          userId,
          phoneNumber: { $regex: phone.slice(-10) },
          createdAt: {
            $gte: new Date(callTime.getTime() - 60000),
            $lte: new Date(callTime.getTime() + 60000)
          }
        });

        if (existingCall) {
          skipped++;
          continue;
        }

        // Find or create contact/lead
        let contact = await Contact.findOne({
          user: userId,
          phone: { $regex: phone.slice(-10) },
          isDeleted: false
        });

        let leadId = null;
        const lead = await Lead.findOne({ userId, phone: { $regex: phone.slice(-10) } });
        if (lead) leadId = lead._id;

        // Create call log
        await CallLog.create({
          userId,
          direction: callData.type === 'INCOMING' || callData.type === 'incoming' ? 'inbound' : 'outbound',
          phoneNumber: phone,
          callerName: contact?.name || callData.name || 'Unknown',
          duration: callData.duration || 0,
          leadId,
          status: callData.type === 'MISSED' ? 'no-answer' : 'completed',
          metadata: { source: 'device_sync', deviceCallId: callData.id }
        });

        // Update contact stats
        if (contact) {
          contact.totalCalls = (contact.totalCalls || 0) + 1;
          contact.lastInteraction = callTime;
          contact.lastInteractionType = 'call';
          await contact.save();
        }

        // Update lead stats
        if (lead) {
          if (callData.type === 'INCOMING' || callData.type === 'incoming') {
            lead.callsReceived = (lead.callsReceived || 0) + 1;
          } else {
            lead.callsMade = (lead.callsMade || 0) + 1;
          }
          lead.lastActivityAt = callTime;
          lead.lastActivityType = 'call';
          await lead.save();
        }

        imported++;
      } catch (error) {
        console.error(`Error syncing call:`, error.message);
        skipped++;
      }
    }

    console.log(`   ✅ Call history sync complete: ${imported} imported, ${skipped} skipped`);

    return { imported, skipped, total: calls.length };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SMS HISTORY SYNC
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Sync SMS history from device
   */
  async syncSMSHistory(userId, messages) {
    console.log(`💬 Syncing ${messages.length} SMS messages for user ${userId}`);

    let imported = 0;
    let skipped = 0;

    for (const smsData of messages) {
      try {
        const phone = this.normalizePhone(smsData.address || smsData.phoneNumber);
        if (!phone) {
          skipped++;
          continue;
        }

        // Find contact
        const contact = await Contact.findOne({
          user: userId,
          phone: { $regex: phone.slice(-10) },
          isDeleted: false
        });

        if (contact) {
          // Add to conversation history
          const direction = smsData.type === 'inbox' || smsData.type === 'INBOX' || smsData.type === 1 ? 'incoming' : 'outgoing';

          // Check if already exists in conversation history
          const smsTime = new Date(parseInt(smsData.date) || smsData.dateTime);
          const existing = contact.conversationHistory.find(h =>
            h.type === 'sms' &&
            Math.abs(new Date(h.timestamp) - smsTime) < 60000 &&
            h.content === smsData.body
          );

          if (!existing) {
            contact.conversationHistory.push({
              type: 'sms',
              direction,
              content: smsData.body,
              timestamp: smsTime
            });

            contact.totalSMS = (contact.totalSMS || 0) + 1;
            contact.lastInteraction = smsTime;
            contact.lastInteractionType = 'sms';

            // Keep only last 100 messages per contact
            if (contact.conversationHistory.length > 100) {
              contact.conversationHistory = contact.conversationHistory.slice(-100);
            }

            await contact.save();
            imported++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error syncing SMS:`, error.message);
        skipped++;
      }
    }

    console.log(`   ✅ SMS sync complete: ${imported} imported, ${skipped} skipped`);

    return { imported, skipped, total: messages.length };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SOCIAL MEDIA SYNC (Future integration points)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Sync Facebook contacts/messages
   */
  async syncFacebook(userId, accessToken) {
    // Placeholder for Facebook integration
    // Requires Facebook Graph API and app approval
    console.log('📘 Facebook sync not yet implemented');
    return { imported: 0, message: 'Facebook integration coming soon' };
  }

  /**
   * Sync Instagram contacts/DMs
   */
  async syncInstagram(userId, accessToken) {
    // Placeholder for Instagram integration
    // Requires Instagram Basic Display API or Graph API
    console.log('📸 Instagram sync not yet implemented');
    return { imported: 0, message: 'Instagram integration coming soon' };
  }

  /**
   * Sync LinkedIn connections
   */
  async syncLinkedIn(userId, accessToken) {
    // Placeholder for LinkedIn integration
    // Requires LinkedIn API and partner program
    console.log('💼 LinkedIn sync not yet implemented');
    return { imported: 0, message: 'LinkedIn integration coming soon' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FULL DEVICE SYNC
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Perform full device sync (contacts, calendar, calls, SMS)
   */
  async fullDeviceSync(userId, deviceData) {
    console.log(`🔄 Starting full device sync for user ${userId}`);

    const results = {
      contacts: null,
      calendar: null,
      calls: null,
      sms: null
    };

    try {
      // Sync contacts
      if (deviceData.contacts && deviceData.contacts.length > 0) {
        results.contacts = await this.syncContacts(userId, deviceData.contacts);
      }

      // Sync calendar
      if (deviceData.calendar && deviceData.calendar.length > 0) {
        results.calendar = await this.syncCalendar(userId, deviceData.calendar);
      }

      // Sync call history
      if (deviceData.calls && deviceData.calls.length > 0) {
        results.calls = await this.syncCallHistory(userId, deviceData.calls);
      }

      // Sync SMS
      if (deviceData.sms && deviceData.sms.length > 0) {
        results.sms = await this.syncSMSHistory(userId, deviceData.sms);
      }

      // Update user's last sync time
      await UserProfile.findOneAndUpdate(
        { user: userId },
        { lastDeviceSync: new Date() },
        { upsert: true }
      );

      console.log(`✅ Full device sync complete for user ${userId}`);
    } catch (error) {
      console.error(`❌ Full device sync failed:`, error);
      throw error;
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Normalize phone number
   */
  normalizePhone(phone) {
    if (!phone) return '';
    const digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
    if (digits.length > 11) return `+${digits}`;
    return digits;
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(userId) {
    const profile = await UserProfile.findOne({ user: userId });

    const stats = {
      contacts: await Contact.countDocuments({ user: userId, isDeleted: false }),
      leads: await Lead.countDocuments({ userId }),
      appointments: await Appointment.countDocuments({ userId }),
      calls: await CallLog.countDocuments({ userId }),
      lastSync: profile?.lastDeviceSync || null
    };

    return stats;
  }
}

export default new BackgroundSyncService();
