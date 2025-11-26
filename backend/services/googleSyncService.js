/**
 * Google Sync Service
 * Handles syncing Gmail, Calendar, and Contacts data from Google APIs
 */

import { google } from 'googleapis';
import UserIntegration from '../models/UserIntegration.js';
import Contact from '../models/Contact.js';
import Appointment from '../models/Appointment.js';

class GoogleSyncService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  /**
   * Get OAuth2 client with user's tokens
   */
  async getOAuth2Client(userId, service = 'gmail') {
    const integration = await UserIntegration.findOne({
      userId,
      service,
      status: 'connected',
      enabled: true
    });

    if (!integration) {
      throw new Error(`No ${service} integration found for user`);
    }

    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: integration.credentials.accessToken,
      refresh_token: integration.credentials.refreshToken
    });

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        integration.credentials.accessToken = tokens.access_token;
        integration.tokenExpiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));
        await integration.save();
        console.log('✅ Refreshed Google access token for user', userId);
      }
    });

    return { oauth2Client, integration };
  }

  // ============================================
  // GOOGLE CONTACTS SYNC
  // ============================================

  /**
   * Sync contacts from Google People API
   */
  async syncContacts(userId) {
    try {
      const { oauth2Client, integration } = await this.getOAuth2Client(userId, 'gmail');

      const people = google.people({ version: 'v1', auth: oauth2Client });

      // Fetch contacts with pagination
      let allContacts = [];
      let nextPageToken = null;

      do {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 100,
          pageToken: nextPageToken,
          personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses,photos,biographies'
        });

        if (response.data.connections) {
          allContacts = allContacts.concat(response.data.connections);
        }
        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      console.log(`📇 Fetched ${allContacts.length} contacts from Google`);

      // Process and save contacts
      let imported = 0;
      let skipped = 0;

      for (const person of allContacts) {
        const name = person.names?.[0]?.displayName;
        const phone = person.phoneNumbers?.[0]?.value;
        const email = person.emailAddresses?.[0]?.value;
        const company = person.organizations?.[0]?.name;

        // Skip if no name or no phone/email
        if (!name || (!phone && !email)) {
          skipped++;
          continue;
        }

        // Check if contact already exists
        const existingQuery = { user: userId, isDeleted: false };
        if (phone) {
          existingQuery.phone = phone.replace(/\D/g, '').slice(-10);
        } else if (email) {
          existingQuery.email = email;
        }

        const existing = await Contact.findOne(existingQuery);

        if (existing) {
          // Update existing contact with Google data
          if (!existing.googleId) {
            existing.googleId = person.resourceName;
            existing.importSource = 'google';
            await existing.save();
          }
          skipped++;
          continue;
        }

        // Create new contact
        await Contact.create({
          user: userId,
          name,
          phone: phone || undefined,
          email: email || undefined,
          company: company || undefined,
          googleId: person.resourceName,
          importSource: 'google',
          tags: ['google-synced']
        });

        imported++;
      }

      // Update integration record
      integration.lastUsed = new Date();
      integration.usageCount += 1;
      await integration.save();

      return {
        success: true,
        total: allContacts.length,
        imported,
        skipped,
        message: `Synced ${imported} new contacts from Google (${skipped} already existed)`
      };

    } catch (error) {
      console.error('Google Contacts sync error:', error);
      throw error;
    }
  }

  // ============================================
  // GOOGLE CALENDAR SYNC
  // ============================================

  /**
   * Sync calendar events from Google Calendar API
   */
  async syncCalendarEvents(userId, options = {}) {
    try {
      const { oauth2Client, integration } = await this.getOAuth2Client(userId, 'google_calendar');

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Default to syncing events from last 30 days to next 90 days
      const timeMin = options.timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = options.timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      console.log(`📅 Fetched ${events.length} calendar events from Google`);

      let imported = 0;
      let skipped = 0;

      for (const event of events) {
        // Skip cancelled events
        if (event.status === 'cancelled') {
          skipped++;
          continue;
        }

        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;

        if (!startTime) {
          skipped++;
          continue;
        }

        // Check if event already exists
        const existing = await Appointment.findOne({
          userId,
          googleEventId: event.id
        });

        if (existing) {
          // Update existing event
          existing.title = event.summary || 'Untitled Event';
          existing.description = event.description || '';
          existing.location = event.location || '';
          existing.startTime = new Date(startTime);
          existing.endTime = endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000);
          existing.status = new Date() > new Date(startTime) ? 'completed' : 'scheduled';
          await existing.save();
          skipped++;
          continue;
        }

        // Create new appointment
        await Appointment.create({
          userId,
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          location: event.location || '',
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
          type: 'meeting',
          status: new Date() > new Date(startTime) ? 'completed' : 'scheduled',
          googleEventId: event.id,
          metadata: {
            googleSync: true,
            attendees: event.attendees?.map(a => a.email) || [],
            organizer: event.organizer?.email
          }
        });

        imported++;
      }

      // Update integration record
      integration.lastUsed = new Date();
      integration.usageCount += 1;
      await integration.save();

      return {
        success: true,
        total: events.length,
        imported,
        skipped,
        message: `Synced ${imported} new calendar events from Google (${skipped} updated/skipped)`
      };

    } catch (error) {
      console.error('Google Calendar sync error:', error);
      throw error;
    }
  }

  /**
   * Create a calendar event in Google Calendar
   */
  async createCalendarEvent(userId, eventData) {
    try {
      const { oauth2Client } = await this.getOAuth2Client(userId, 'google_calendar');

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: new Date(eventData.startTime).toISOString(),
          timeZone: eventData.timezone || 'America/Phoenix'
        },
        end: {
          dateTime: new Date(eventData.endTime).toISOString(),
          timeZone: eventData.timezone || 'America/Phoenix'
        },
        attendees: eventData.attendees?.map(email => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all'
      });

      console.log('✅ Created Google Calendar event:', response.data.id);

      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        message: 'Event created in Google Calendar'
      };

    } catch (error) {
      console.error('Create Google Calendar event error:', error);
      throw error;
    }
  }

  // ============================================
  // GMAIL SYNC
  // ============================================

  /**
   * Get recent Gmail messages
   */
  async getRecentEmails(userId, options = {}) {
    try {
      const { oauth2Client, integration } = await this.getOAuth2Client(userId, 'gmail');

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const maxResults = options.maxResults || 20;
      const query = options.query || 'is:inbox';

      // List messages
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query
      });

      const messages = listResponse.data.messages || [];
      const emails = [];

      // Fetch full message details
      for (const message of messages.slice(0, 10)) { // Limit to 10 full fetches
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });

        const headers = msgResponse.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value;

        emails.push({
          id: message.id,
          threadId: message.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: msgResponse.data.snippet,
          labelIds: msgResponse.data.labelIds
        });
      }

      // Update integration record
      integration.lastUsed = new Date();
      await integration.save();

      return {
        success: true,
        total: messages.length,
        emails,
        message: `Fetched ${emails.length} recent emails`
      };

    } catch (error) {
      console.error('Gmail fetch error:', error);
      throw error;
    }
  }

  /**
   * Send an email via Gmail API
   */
  async sendEmail(userId, emailData) {
    try {
      const { oauth2Client } = await this.getOAuth2Client(userId, 'gmail');

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email in RFC 2822 format
      const email = [
        `To: ${emailData.to}`,
        `Subject: ${emailData.subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        emailData.body
      ].join('\r\n');

      // Base64 encode
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      console.log('✅ Email sent via Gmail:', response.data.id);

      return {
        success: true,
        messageId: response.data.id,
        message: 'Email sent successfully'
      };

    } catch (error) {
      console.error('Gmail send error:', error);
      throw error;
    }
  }

  // ============================================
  // INTEGRATION STATUS
  // ============================================

  /**
   * Get Google integration status for a user
   */
  async getIntegrationStatus(userId) {
    const integrations = await UserIntegration.find({
      userId,
      service: { $in: ['gmail', 'google_calendar', 'google_contacts'] }
    }).select('service status enabled displayName lastUsed tokenExpiresAt');

    return {
      gmail: integrations.find(i => i.service === 'gmail') || null,
      calendar: integrations.find(i => i.service === 'google_calendar') || null,
      contacts: integrations.find(i => i.service === 'google_contacts') || null,
      connected: integrations.some(i => i.status === 'connected' && i.enabled)
    };
  }

  /**
   * Disconnect Google integration
   */
  async disconnectGoogle(userId) {
    await UserIntegration.updateMany(
      {
        userId,
        service: { $in: ['gmail', 'google_calendar', 'google_contacts'] }
      },
      {
        $set: {
          status: 'disconnected',
          enabled: false
        }
      }
    );

    return { success: true, message: 'Google integrations disconnected' };
  }
}

export default new GoogleSyncService();
