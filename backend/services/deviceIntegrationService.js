import UserProfile from '../models/UserProfile.js';
import { ariaMemoryService } from './ariaMemoryService.js';

/**
 * Device Integration Service
 *
 * Handles syncing data from mobile device:
 * - Contacts
 * - Calendar events
 * - Call logs
 * - SMS messages
 * - Email (via OAuth)
 */
export class DeviceIntegrationService {
  /**
   * Sync contacts from mobile device
   */
  async syncContacts(userId, contacts) {
    try {
      console.log(`=ñ [CONTACTS] Syncing ${contacts.length} contacts for user ${userId}`);

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update permission info
      profile.permissions.contacts.lastSync = new Date();
      profile.permissions.contacts.contactCount = contacts.length;
      await profile.save();

      // Store high-value contacts in Aria's memory
      const importantContacts = contacts
        .filter(c => c.isImportant || c.isStarred || c.contactType === 'work')
        .slice(0, 50); // Limit to top 50

      for (const contact of importantContacts) {
        const contactInfo = `${contact.name}${contact.company ? ` (${contact.company})` : ''} - ${contact.phone || contact.email}`;

        await ariaMemoryService.storeMemory(
          userId,
          `contact_${contact.id}`,
          contactInfo,
          {
            category: 'fact',
            importance: contact.isImportant ? 8 : 6,
            source: 'contacts'
          }
        );
      }

      console.log(` [CONTACTS] Synced ${contacts.length} contacts (${importantContacts.length} stored in memory)`);

      return {
        success: true,
        totalContacts: contacts.length,
        importantContacts: importantContacts.length
      };
    } catch (error) {
      console.error('L [CONTACTS] Sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync calendar events
   */
  async syncCalendar(userId, events) {
    try {
      console.log(`=Å [CALENDAR] Syncing ${events.length} events for user ${userId}`);

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update permission info
      profile.permissions.calendar.lastSync = new Date();
      await profile.save();

      // Store upcoming important events (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcomingEvents = events
        .filter(e => {
          const eventDate = new Date(e.startDate);
          return eventDate >= now && eventDate <= nextWeek;
        })
        .slice(0, 20); // Limit to 20 events

      for (const event of upcomingEvents) {
        const eventInfo = `${event.title} on ${new Date(event.startDate).toLocaleString()}${event.location ? ` at ${event.location}` : ''}`;

        await ariaMemoryService.storeMemory(
          userId,
          `calendar_event_${event.id}`,
          eventInfo,
          {
            category: 'fact',
            importance: 7,
            source: 'calendar',
            expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
          }
        );
      }

      console.log(` [CALENDAR] Synced ${events.length} events (${upcomingEvents.length} upcoming stored)`);

      return {
        success: true,
        totalEvents: events.length,
        upcomingEvents: upcomingEvents.length
      };
    } catch (error) {
      console.error('L [CALENDAR] Sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync call logs
   */
  async syncCallLogs(userId, calls) {
    try {
      console.log(`=Þ [CALL LOGS] Syncing ${calls.length} calls for user ${userId}`);

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update permission info
      profile.permissions.callLog.lastSync = new Date();
      await profile.save();

      // Store recent important calls (last 7 days)
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentCalls = calls
        .filter(c => new Date(c.timestamp) >= lastWeek)
        .slice(0, 50);

      // Store missed calls as high priority
      const missedCalls = recentCalls.filter(c => c.type === 'missed');
      for (const call of missedCalls) {
        const callInfo = `Missed call from ${call.name || call.phoneNumber} at ${new Date(call.timestamp).toLocaleString()}`;

        await ariaMemoryService.storeMemory(
          userId,
          `missed_call_${call.id}`,
          callInfo,
          {
            category: 'context',
            importance: 8,
            source: 'call_log',
            expiresIn: 7 * 24 * 60 * 60 * 1000
          }
        );
      }

      console.log(` [CALL LOGS] Synced ${calls.length} calls (${missedCalls.length} missed stored)`);

      return {
        success: true,
        totalCalls: calls.length,
        missedCalls: missedCalls.length,
        recentCalls: recentCalls.length
      };
    } catch (error) {
      console.error('L [CALL LOGS] Sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync SMS messages
   */
  async syncSMS(userId, messages) {
    try {
      console.log(`=¬ [SMS] Syncing ${messages.length} messages for user ${userId}`);

      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update permission info
      profile.permissions.sms.lastSync = new Date();
      await profile.save();

      // Store recent unread or important messages
      const unreadMessages = messages
        .filter(m => !m.isRead || m.isImportant)
        .slice(0, 20);

      for (const message of unreadMessages) {
        const messageInfo = `${message.type === 'received' ? 'From' : 'To'} ${message.name || message.phoneNumber}: ${message.body}`;

        await ariaMemoryService.storeMemory(
          userId,
          `sms_${message.id}`,
          messageInfo,
          {
            category: 'context',
            importance: message.isImportant ? 8 : 6,
            source: 'sms',
            expiresIn: 7 * 24 * 60 * 60 * 1000
          }
        );
      }

      console.log(` [SMS] Synced ${messages.length} messages (${unreadMessages.length} unread/important stored)`);

      return {
        success: true,
        totalMessages: messages.length,
        unreadMessages: unreadMessages.length
      };
    } catch (error) {
      console.error('L [SMS] Sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get contact by phone number
   */
  async getContactByPhone(userId, phoneNumber) {
    try {
      // Search Aria's memory for contact
      const result = await ariaMemoryService.recallMemory(
        userId,
        phoneNumber,
        {
          category: 'fact',
          limit: 1
        }
      );

      if (result.success && result.memories.length > 0) {
        return {
          success: true,
          contact: result.memories[0]
        };
      }

      return {
        success: false,
        error: 'Contact not found'
      };
    } catch (error) {
      console.error('L [CONTACTS] Get by phone error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get upcoming calendar events
   */
  async getUpcomingEvents(userId, daysAhead = 7) {
    try {
      const result = await ariaMemoryService.recallMemory(
        userId,
        'calendar event',
        {
          category: 'fact',
          limit: 20
        }
      );

      if (result.success) {
        return {
          success: true,
          events: result.memories
        };
      }

      return {
        success: false,
        error: 'No events found'
      };
    } catch (error) {
      console.error('L [CALENDAR] Get upcoming error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search across all synced data
   */
  async searchSyncedData(userId, query) {
    try {
      const result = await ariaMemoryService.recallMemory(
        userId,
        query,
        {
          limit: 10
        }
      );

      return result;
    } catch (error) {
      console.error('L [SEARCH] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(userId) {
    try {
      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      return {
        success: true,
        permissions: profile.permissions,
        lastSync: {
          contacts: profile.permissions.contacts.lastSync,
          calendar: profile.permissions.calendar.lastSync,
          callLog: profile.permissions.callLog.lastSync,
          sms: profile.permissions.sms.lastSync
        }
      };
    } catch (error) {
      console.error('L [SYNC STATUS] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const deviceIntegrationService = new DeviceIntegrationService();
export default deviceIntegrationService;
