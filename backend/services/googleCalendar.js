/**
 * Google Calendar Service
 *
 * Integrates with Google Calendar API to create appointments
 */

import { google } from 'googleapis';
import nodemailer from 'nodemailer';

class GoogleCalendarService {
  constructor() {
    // For now, we'll use service account or OAuth credentials
    // You'll need to set up Google Calendar API credentials
    this.initialized = false;

    // Check if credentials are configured
    if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
        this.initialized = true;
        console.log('✅ Google Calendar service initialized');
      } catch (error) {
        console.warn('⚠️  Google Calendar credentials invalid:', error.message);
      }
    } else {
      console.warn('⚠️  Google Calendar not configured - calendar invites will be sent via email only');
    }
  }

  /**
   * Create calendar event
   */
  async createEvent({ summary, description, startTime, endTime, attendees, location }) {
    if (!this.initialized) {
      console.log('📧 Google Calendar not configured, will send email calendar invite instead');
      return this.createEmailCalendarInvite({ summary, description, startTime, endTime, attendees, location });
    }

    try {
      const event = {
        summary,
        description,
        location,
        start: {
          dateTime: startTime,
          timeZone: 'America/Phoenix', // Arizona time
        },
        end: {
          dateTime: endTime,
          timeZone: 'America/Phoenix',
        },
        attendees: attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
        sendUpdates: 'all', // Send email notifications to attendees
      });

      console.log('✅ Calendar event created:', response.data.id);
      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink
      };

    } catch (error) {
      console.error('❌ Failed to create calendar event:', error.message);
      // Fallback to email invite
      return this.createEmailCalendarInvite({ summary, description, startTime, endTime, attendees, location });
    }
  }

  /**
   * Create email-based calendar invite (iCal format)
   * This works even without Google Calendar API access
   */
  async createEmailCalendarInvite({ summary, description, startTime, endTime, attendees, location }) {
    // Generate iCal format
    const ical = this.generateICalInvite({
      summary,
      description,
      startTime,
      endTime,
      attendees,
      location
    });

    console.log('✅ Email calendar invite created (iCal format)');
    return {
      success: true,
      icalContent: ical,
      method: 'email'
    };
  }

  /**
   * Generate iCal format for email calendar invites
   */
  generateICalInvite({ summary, description, startTime, endTime, attendees, location }) {
    const formatDate = (date) => {
      return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const uid = `${Date.now()}@voicenowcrm.com`;
    const dtstamp = formatDate(new Date());
    const dtstart = formatDate(startTime);
    const dtend = formatDate(endTime);

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VoiceNow CRM//VoiceNow CRM//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${summary}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location || ''}
STATUS:CONFIRMED
SEQUENCE:0
ORGANIZER:mailto:help.voicenowcrm@gmail.com
${attendees.map(email => `ATTENDEE:mailto:${email}`).join('\n')}
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: ${summary}
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Send calendar invite via email with iCal attachment
   */
  async sendCalendarInviteEmail({ to, summary, description, startTime, endTime, location }) {
    const emailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const icalContent = this.generateICalInvite({
      summary,
      description,
      startTime,
      endTime,
      attendees: [to],
      location
    });

    const startDate = new Date(startTime);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    try {
      await emailTransporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: `Appointment Confirmed: ${summary}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Appointment Confirmed</h2>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${summary}</h3>
              <p style="margin: 10px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 10px 0;"><strong>🕐 Time:</strong> ${formattedTime}</p>
              ${location ? `<p style="margin: 10px 0;"><strong>📍 Location:</strong> ${location}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              ${description.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>

            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>💡 Add to Your Calendar:</strong></p>
              <p style="margin: 10px 0;">The calendar invite is attached to this email. Open it to add this appointment to your calendar app.</p>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

            <p style="color: #6b7280; font-size: 14px;">
              Questions? Contact us:<br>
              📧 help.voicenowcrm@gmail.com<br>
              📞 (602) 833-4780
            </p>
          </div>
        `,
        icalEvent: {
          filename: 'appointment.ics',
          method: 'request',
          content: icalContent
        }
      });

      console.log('✅ Calendar invite email sent to:', to);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to send calendar invite email:', error.message);
      throw error;
    }
  }
}

export default new GoogleCalendarService();
