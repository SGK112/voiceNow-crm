import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { ariaMemoryService } from '../services/ariaMemoryService.js';
import { ariaSlackService } from '../services/ariaSlackService.js';
import { pushNotificationService } from '../services/pushNotificationService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Aria's available capabilities with function definitions for OpenAI function calling
export const capabilities = {
  // Web scraping
  web_search: {
    name: 'web_search',
    description: 'Search the web for current information, news, or answers to questions',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up'
        }
      },
      required: ['query']
    }
  },

  fetch_url: {
    name: 'fetch_url',
    description: 'Fetch and extract text content from a specific URL or webpage',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch content from'
        }
      },
      required: ['url']
    }
  },

  // Email capabilities
  send_email: {
    name: 'send_email',
    description: 'Send an email to a recipient',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Email address of the recipient'
        },
        subject: {
          type: 'string',
          description: 'Email subject line'
        },
        body: {
          type: 'string',
          description: 'Email message body'
        }
      },
      required: ['to', 'subject', 'body']
    }
  },

  // SMS/MMS capabilities
  send_sms: {
    name: 'send_sms',
    description: 'Send a text message (SMS) to a phone number',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Phone number to send SMS to (E.164 format, e.g., +1234567890)'
        },
        message: {
          type: 'string',
          description: 'Text message content'
        }
      },
      required: ['to', 'message']
    }
  },

  send_mms: {
    name: 'send_mms',
    description: 'Send a multimedia message (MMS) with text and media to a phone number',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Phone number to send MMS to (E.164 format)'
        },
        message: {
          type: 'string',
          description: 'Text message content'
        },
        mediaUrl: {
          type: 'string',
          description: 'URL of the media file to attach (image, video, etc.)'
        }
      },
      required: ['to', 'message', 'mediaUrl']
    }
  },

  // Memory capabilities
  remember_info: {
    name: 'remember_info',
    description: 'Store important information to long-term memory for future conversations',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'A short identifier for this memory (e.g., "user_preference", "important_date")'
        },
        value: {
          type: 'string',
          description: 'The information to remember'
        },
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'task', 'personal', 'business'],
          description: 'Category of information'
        }
      },
      required: ['key', 'value', 'category']
    }
  },

  recall_info: {
    name: 'recall_info',
    description: 'Retrieve previously stored information from long-term memory',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for in memory'
        }
      },
      required: ['query']
    }
  },

  // CRM data access
  get_recent_leads: {
    name: 'get_recent_leads',
    description: 'Get recent leads from the CRM system',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of leads to retrieve (default 5)',
          default: 5
        }
      }
    }
  },

  get_recent_messages: {
    name: 'get_recent_messages',
    description: 'Get recent messages from conversations',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of messages to retrieve (default 5)',
          default: 5
        }
      }
    }
  },

  get_calls_summary: {
    name: 'get_calls_summary',
    description: 'Get summary of recent calls',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of calls to retrieve (default 5)',
          default: 5
        }
      }
    }
  },

  search_contacts: {
    name: 'search_contacts',
    description: 'Search for contacts/leads by name, email, or phone',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (name, email, or phone number)'
        }
      },
      required: ['query']
    }
  },

  // Push notification capability
  send_notification: {
    name: 'send_notification',
    description: 'Send a push notification to the user\'s mobile device. Use this to remind, alert, or notify the user about something important.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The notification message to send'
        },
        title: {
          type: 'string',
          description: 'Optional title for the notification (defaults to "Aria AI Assistant")'
        },
        category: {
          type: 'string',
          description: 'Category of notification: message, reminder, alert, task',
          enum: ['message', 'reminder', 'alert', 'task']
        }
      },
      required: ['message']
    }
  },

  // CRM write capabilities
  create_lead: {
    name: 'create_lead',
    description: 'Create a new lead in the CRM from conversation data (phone calls, SMS, etc.)',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the lead'
        },
        phone: {
          type: 'string',
          description: 'Phone number (E.164 format preferred)'
        },
        email: {
          type: 'string',
          description: 'Email address (optional)'
        },
        company: {
          type: 'string',
          description: 'Company name (optional)'
        },
        notes: {
          type: 'string',
          description: 'Initial notes about the lead'
        },
        source: {
          type: 'string',
          description: 'How the lead was acquired (e.g., "phone_call", "sms", "website")',
          default: 'aria_conversation'
        },
        status: {
          type: 'string',
          enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
          description: 'Initial status of the lead',
          default: 'new'
        }
      },
      required: ['name', 'phone']
    }
  },

  update_lead: {
    name: 'update_lead',
    description: 'Update an existing lead\'s information in the CRM',
    parameters: {
      type: 'object',
      properties: {
        leadId: {
          type: 'string',
          description: 'The ID of the lead to update (can be phone number if ID unknown)'
        },
        name: {
          type: 'string',
          description: 'Updated name'
        },
        email: {
          type: 'string',
          description: 'Updated email'
        },
        company: {
          type: 'string',
          description: 'Updated company'
        },
        status: {
          type: 'string',
          enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
          description: 'Updated status'
        },
        notes: {
          type: 'string',
          description: 'Additional notes to append'
        }
      },
      required: ['leadId']
    }
  },

  add_note_to_lead: {
    name: 'add_note_to_lead',
    description: 'Add a note/comment to a lead\'s record',
    parameters: {
      type: 'object',
      properties: {
        leadId: {
          type: 'string',
          description: 'The ID of the lead (or phone number)'
        },
        note: {
          type: 'string',
          description: 'The note to add'
        },
        category: {
          type: 'string',
          enum: ['general', 'call', 'meeting', 'email', 'follow_up'],
          description: 'Type of note',
          default: 'general'
        }
      },
      required: ['leadId', 'note']
    }
  },

  create_deal: {
    name: 'create_deal',
    description: 'Create a new deal/opportunity in the CRM',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Deal title/name'
        },
        leadId: {
          type: 'string',
          description: 'Associated lead ID (or phone number)'
        },
        value: {
          type: 'number',
          description: 'Deal value in dollars'
        },
        stage: {
          type: 'string',
          enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
          description: 'Current stage of the deal',
          default: 'lead'
        },
        expectedCloseDate: {
          type: 'string',
          description: 'Expected close date (YYYY-MM-DD format)'
        },
        notes: {
          type: 'string',
          description: 'Deal notes/description'
        }
      },
      required: ['title', 'value']
    }
  },

  // Enhanced Contact Management with Metadata
  get_contact_details: {
    name: 'get_contact_details',
    description: 'Get full details of a specific contact including conversation history, timestamps, and metadata',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Name, phone number, or email of the contact to retrieve'
        }
      },
      required: ['query']
    }
  },

  get_contact_history: {
    name: 'get_contact_history',
    description: 'Get conversation history for a contact including all calls, SMS, and emails with timestamps',
    parameters: {
      type: 'object',
      properties: {
        contactIdentifier: {
          type: 'string',
          description: 'Contact name or phone number'
        },
        limit: {
          type: 'number',
          description: 'Number of history items to retrieve (default 10)',
          default: 10
        }
      },
      required: ['contactIdentifier']
    }
  },

  // Appointment/Calendar capabilities
  book_appointment: {
    name: 'book_appointment',
    description: 'Book an appointment with a contact. Sends notifications to both you and the contact.',
    parameters: {
      type: 'object',
      properties: {
        contactIdentifier: {
          type: 'string',
          description: 'Contact name or phone number'
        },
        title: {
          type: 'string',
          description: 'Appointment title (e.g., "Site Visit", "Consultation Call")'
        },
        startTime: {
          type: 'string',
          description: 'Start date and time in ISO format or natural language (e.g., "2025-01-15T10:00:00" or "tomorrow at 10am")'
        },
        duration: {
          type: 'number',
          description: 'Duration in minutes (default 60)',
          default: 60
        },
        type: {
          type: 'string',
          enum: ['call', 'meeting', 'site_visit', 'follow_up', 'consultation', 'other'],
          description: 'Type of appointment',
          default: 'meeting'
        },
        location: {
          type: 'string',
          description: 'Location or meeting link (optional)'
        },
        description: {
          type: 'string',
          description: 'Appointment description/notes (optional)'
        },
        sendReminder: {
          type: 'boolean',
          description: 'Whether to send a reminder notification (default true)',
          default: true
        },
        reminderMinutesBefore: {
          type: 'number',
          description: 'How many minutes before to send reminder (default 60)',
          default: 60
        }
      },
      required: ['contactIdentifier', 'title', 'startTime']
    }
  },

  get_upcoming_appointments: {
    name: 'get_upcoming_appointments',
    description: 'Get list of upcoming appointments',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days ahead to check (default 7)',
          default: 7
        },
        limit: {
          type: 'number',
          description: 'Maximum number of appointments to return (default 10)',
          default: 10
        }
      }
    }
  },

  cancel_appointment: {
    name: 'cancel_appointment',
    description: 'Cancel an appointment and notify the contact',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID of the appointment to cancel'
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation (will be included in notification)'
        },
        notifyContact: {
          type: 'boolean',
          description: 'Whether to notify the contact (default true)',
          default: true
        }
      },
      required: ['appointmentId']
    }
  },

  reschedule_appointment: {
    name: 'reschedule_appointment',
    description: 'Reschedule an existing appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID of the appointment to reschedule'
        },
        newStartTime: {
          type: 'string',
          description: 'New start time in ISO format or natural language'
        },
        notifyContact: {
          type: 'boolean',
          description: 'Whether to notify the contact (default true)',
          default: true
        }
      },
      required: ['appointmentId', 'newStartTime']
    }
  },

  // Enhanced contact communication
  send_contact_sms: {
    name: 'send_contact_sms',
    description: 'Send SMS to a contact (looks up phone number automatically)',
    parameters: {
      type: 'object',
      properties: {
        contactIdentifier: {
          type: 'string',
          description: 'Contact name or phone number'
        },
        message: {
          type: 'string',
          description: 'Message to send'
        }
      },
      required: ['contactIdentifier', 'message']
    }
  },

  send_contact_email: {
    name: 'send_contact_email',
    description: 'Send email to a contact (looks up email automatically)',
    parameters: {
      type: 'object',
      properties: {
        contactIdentifier: {
          type: 'string',
          description: 'Contact name or email address'
        },
        subject: {
          type: 'string',
          description: 'Email subject'
        },
        body: {
          type: 'string',
          description: 'Email body'
        }
      },
      required: ['contactIdentifier', 'subject', 'body']
    }
  }
};

// Get all capability function definitions for OpenAI
export function getCapabilityDefinitions() {
  return Object.values(capabilities);
}

// Capability implementations
export class AriaCapabilities {
  constructor(services = {}) {
    this.emailService = services.emailService;
    this.twilioService = services.twilioService;
    this.memoryStore = services.memoryStore || new Map();
    this.models = services.models; // Database models
  }

  // Web scraping
  async webSearch(query) {
    try {
      console.log(`🔍 [WEB SEARCH] Searching for: ${query}`);

      // Use DuckDuckGo HTML search (no API key needed)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AriaBot/1.0)'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Extract search results
      $('.result').slice(0, 5).each((i, elem) => {
        const title = $(elem).find('.result__title').text().trim();
        const snippet = $(elem).find('.result__snippet').text().trim();
        const url = $(elem).find('.result__url').text().trim();

        if (title && snippet) {
          results.push({ title, snippet, url });
        }
      });

      console.log(`✅ [WEB SEARCH] Found ${results.length} results`);

      return {
        success: true,
        query,
        results,
        summary: results.length > 0
          ? `Found ${results.length} results. Top result: ${results[0].title} - ${results[0].snippet}`
          : 'No results found'
      };
    } catch (error) {
      console.error('❌ [WEB SEARCH] Error:', error.message);
      return {
        success: false,
        error: `Search failed: ${error.message}`
      };
    }
  }

  async fetchUrl(url) {
    try {
      console.log(`🌐 [FETCH URL] Fetching: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AriaBot/1.0)'
        },
        timeout: 10000,
        maxContentLength: 1024 * 1024 // 1MB max
      });

      const $ = cheerio.load(response.data);

      // Remove script, style, and nav elements
      $('script, style, nav, header, footer').remove();

      // Extract text content
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000); // Limit to 2000 chars

      console.log(`✅ [FETCH URL] Extracted ${text.length} characters`);

      return {
        success: true,
        url,
        content: text,
        summary: text.slice(0, 200) + '...'
      };
    } catch (error) {
      console.error('❌ [FETCH URL] Error:', error.message);
      return {
        success: false,
        error: `Failed to fetch URL: ${error.message}`
      };
    }
  }

  // Email capability
  async sendEmail(to, subject, body) {
    try {
      if (!this.emailService) {
        throw new Error('Email service not configured - please add SMTP credentials');
      }

      // Fix common transcription errors with email addresses
      // "joshb.surprisegranite.com" -> "joshb@surprisegranite.com"
      // "joshb at surprisegranite dot com" -> "joshb@surprisegranite.com"
      let fixedEmail = to;

      // If missing @ but has a domain pattern, add @
      if (!fixedEmail.includes('@') && /^[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/.test(fixedEmail)) {
        // Find the last dot before TLD and replace with @
        const parts = fixedEmail.split('.');
        if (parts.length >= 2) {
          const tld = parts.pop();
          const domain = parts.pop();
          const username = parts.join('.');
          fixedEmail = `${username}@${domain}.${tld}`;
          console.log(`📧 [EMAIL] Auto-corrected email: ${to} -> ${fixedEmail}`);
        }
      }

      // Replace " at " with @
      fixedEmail = fixedEmail.replace(/\s+at\s+/gi, '@');
      // Replace " dot " with .
      fixedEmail = fixedEmail.replace(/\s+dot\s+/gi, '.');
      // Remove spaces
      fixedEmail = fixedEmail.replace(/\s+/g, '');

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(fixedEmail)) {
        throw new Error(`Invalid email address format: ${fixedEmail}. Please provide a valid email address.`);
      }

      console.log(`📧 [EMAIL] Sending to: ${fixedEmail}`);
      console.log(`📧 [EMAIL] Subject: ${subject}`);

      // Convert plain text body to HTML with line breaks
      const htmlBody = body.replace(/\n/g, '<br>');

      const result = await this.emailService.sendEmail({
        to: fixedEmail,
        subject,
        text: body, // Plain text version
        html: htmlBody // HTML version
      });

      console.log('✅ [EMAIL] Sent successfully:', result.messageId);

      return {
        success: true,
        message: `Email sent to ${fixedEmail}`,
        summary: `Successfully sent email to ${fixedEmail} with subject "${subject}"`
      };
    } catch (error) {
      console.error('❌ [EMAIL] Error:', error.message);
      console.error('❌ [EMAIL] Stack:', error.stack);
      return {
        success: false,
        error: error.message,
        summary: `Failed to send email: ${error.message}`
      };
    }
  }

  // SMS/MMS capabilities
  async sendSms(to, message) {
    try {
      if (!this.twilioService) {
        throw new Error('SMS service not configured');
      }

      console.log(`📱 [SMS] Sending to: ${to}`);

      await this.twilioService.sendSMS({
        agentId: null, // Aria doesn't have an agentId
        to: to,
        message: message,
        leadId: null, // Could be enhanced to lookup lead by phone
        userId: null, // Could be enhanced to get from context
        metadata: {
          type: 'aria_capability',
          capability: 'send_sms'
        }
      });

      console.log('✅ [SMS] Sent successfully');

      return {
        success: true,
        message: `SMS sent to ${to}`
      };
    } catch (error) {
      console.error('❌ [SMS] Error:', error.message);
      return {
        success: false,
        error: `SMS failed: ${error.message}`
      };
    }
  }

  async sendMms(to, message, mediaUrl) {
    try {
      if (!this.twilioService) {
        throw new Error('MMS service not configured');
      }

      console.log(`📱 [MMS] Sending to: ${to} with media: ${mediaUrl}`);

      await this.twilioService.sendMMS(to, message, [mediaUrl]);

      console.log('✅ [MMS] Sent successfully');

      return {
        success: true,
        message: `MMS sent to ${to}`
      };
    } catch (error) {
      console.error('❌ [MMS] Error:', error.message);
      return {
        success: false,
        error: `MMS failed: ${error.message}`
      };
    }
  }

  // Memory capabilities (using persistent storage)
  async rememberInfo(key, value, category, userId = 'default') {
    try {
      const result = await ariaMemoryService.storeMemory(userId, key, value, {
        category,
        importance: 7, // User-requested memories are important
        source: 'voice_command'
      });

      // Also notify Slack
      if (result.success) {
        ariaSlackService.sendMemoryUpdate('stored', {
          key,
          value,
          category,
          importance: 7,
          accessCount: 0
        }).catch(err => console.error('Slack notification failed:', err));
      }

      return result;
    } catch (error) {
      console.error('❌ [MEMORY] Error:', error.message);
      return {
        success: false,
        error: `Memory storage failed: ${error.message}`
      };
    }
  }

  async recallInfo(query, userId = 'default') {
    try {
      const result = await ariaMemoryService.recallMemory(userId, query, {
        limit: 3,
        minImportance: 3
      });

      // Notify Slack if memories found
      if (result.success && result.memories.length > 0) {
        ariaSlackService.sendMemoryUpdate('recalled', {
          key: query,
          value: result.summary,
          category: result.memories[0].category,
          importance: result.memories[0].importance,
          accessCount: result.memories[0].accessCount
        }).catch(err => console.error('Slack notification failed:', err));
      }

      return result;
    } catch (error) {
      console.error('❌ [MEMORY] Error:', error.message);
      return {
        success: false,
        error: `Memory recall failed: ${error.message}`
      };
    }
  }

  // CRM data access
  async getRecentLeads(limit = 5) {
    try {
      if (!this.models?.Lead) {
        throw new Error('Lead model not available');
      }

      console.log(`📊 [CRM] Fetching ${limit} recent leads`);

      const leads = await this.models.Lead
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email phone status source createdAt');

      console.log(`✅ [CRM] Found ${leads.length} leads`);

      return {
        success: true,
        leads: leads.map(l => ({
          name: l.name,
          email: l.email,
          phone: l.phone,
          status: l.status,
          source: l.source,
          date: l.createdAt
        })),
        summary: `Found ${leads.length} recent leads${leads.length > 0 ? `. Most recent: ${leads[0].name}` : ''}`
      };
    } catch (error) {
      console.error('❌ [CRM] Error fetching leads:', error.message);
      return {
        success: false,
        error: `Failed to get leads: ${error.message}`
      };
    }
  }

  async getRecentMessages(limit = 5) {
    try {
      if (!this.models?.Message) {
        throw new Error('Message model not available');
      }

      console.log(`💬 [CRM] Fetching ${limit} recent messages`);

      const messages = await this.models.Message
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('content direction status createdAt');

      console.log(`✅ [CRM] Found ${messages.length} messages`);

      return {
        success: true,
        messages: messages.map(m => ({
          content: m.content?.substring(0, 100),
          direction: m.direction,
          status: m.status,
          date: m.createdAt
        })),
        summary: `Found ${messages.length} recent messages`
      };
    } catch (error) {
      console.error('❌ [CRM] Error fetching messages:', error.message);
      return {
        success: false,
        error: `Failed to get messages: ${error.message}`
      };
    }
  }

  async getCallsSummary(limit = 5) {
    try {
      if (!this.models?.Call) {
        throw new Error('Call model not available');
      }

      console.log(`📞 [CRM] Fetching ${limit} recent calls`);

      const calls = await this.models.Call
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('direction duration status createdAt');

      console.log(`✅ [CRM] Found ${calls.length} calls`);

      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

      return {
        success: true,
        calls: calls.map(c => ({
          direction: c.direction,
          duration: c.duration,
          status: c.status,
          date: c.createdAt
        })),
        summary: `Found ${calls.length} recent calls. Total duration: ${Math.round(totalDuration / 60)} minutes`
      };
    } catch (error) {
      console.error('❌ [CRM] Error fetching calls:', error.message);
      return {
        success: false,
        error: `Failed to get calls: ${error.message}`
      };
    }
  }

  // Enhanced Contact Management
  async getContactDetails(query) {
    try {
      if (!this.models?.Contact) {
        throw new Error('Contact model not available');
      }

      console.log(`📇 [CONTACT] Getting details for: ${query}`);

      // Search by name, phone, or email
      const contact = await this.models.Contact.findOne({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ],
        isDeleted: false
      }).sort({ lastInteraction: -1 });

      if (!contact) {
        return {
          success: false,
          error: `No contact found matching "${query}"`
        };
      }

      console.log(`✅ [CONTACT] Found: ${contact.name}`);

      return {
        success: true,
        contact: {
          id: contact._id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          company: contact.company,
          notes: contact.notes,
          tags: contact.tags,
          lastInteraction: contact.lastInteraction,
          lastInteractionType: contact.lastInteractionType,
          totalCalls: contact.totalCalls,
          totalSMS: contact.totalSMS,
          totalEmails: contact.totalEmails,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
          importSource: contact.importSource
        },
        summary: `Found ${contact.name}. Last contact: ${contact.lastInteraction ? new Date(contact.lastInteraction).toLocaleDateString() : 'Never'}. Total interactions: ${contact.totalCalls} calls, ${contact.totalSMS} texts, ${contact.totalEmails} emails.`
      };
    } catch (error) {
      console.error('❌ [CONTACT] Error getting details:', error.message);
      return {
        success: false,
        error: `Failed to get contact details: ${error.message}`
      };
    }
  }

  async getContactHistory(contactIdentifier, limit = 10) {
    try {
      if (!this.models?.Contact) {
        throw new Error('Contact model not available');
      }

      console.log(`📜 [HISTORY] Getting history for: ${contactIdentifier}`);

      const contact = await this.models.Contact.findOne({
        $or: [
          { name: { $regex: contactIdentifier, $options: 'i' } },
          { phone: { $regex: contactIdentifier, $options: 'i' } }
        ],
        isDeleted: false
      });

      if (!contact) {
        return {
          success: false,
          error: `No contact found matching "${contactIdentifier}"`
        };
      }

      const history = contact.conversationHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      console.log(`✅ [HISTORY] Found ${history.length} interactions`);

      return {
        success: true,
        contact: contact.name,
        history: history.map(h => ({
          type: h.type,
          direction: h.direction,
          content: h.content,
          timestamp: h.timestamp,
          metadata: h.metadata
        })),
        summary: `${contact.name} has ${contact.conversationHistory.length} total interactions. Most recent ${limit}: ${history.map(h => `${h.type} (${new Date(h.timestamp).toLocaleDateString()})`).join(', ')}`
      };
    } catch (error) {
      console.error('❌ [HISTORY] Error getting history:', error.message);
      return {
        success: false,
        error: `Failed to get contact history: ${error.message}`
      };
    }
  }

  // Appointment Management
  async bookAppointment(params) {
    try {
      if (!this.models?.Contact || !this.models?.Appointment || !this.models?.Lead) {
        throw new Error('Required models not available');
      }

      console.log(`📅 [APPOINTMENT] Booking for: ${params.contactIdentifier}`);

      // Find contact
      const contact = await this.models.Contact.findOne({
        $or: [
          { name: { $regex: params.contactIdentifier, $options: 'i' } },
          { phone: { $regex: params.contactIdentifier, $options: 'i' } }
        ],
        isDeleted: false
      });

      if (!contact) {
        return {
          success: false,
          error: `No contact found matching "${params.contactIdentifier}"`
        };
      }

      // Find or create lead
      let lead = await this.models.Lead.findOne({ phone: contact.phone });
      if (!lead) {
        lead = await this.models.Lead.create({
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          company: contact.company,
          source: 'contact',
          status: 'new'
        });
      }

      // Parse start time (handle natural language or ISO format)
      let startTime = new Date(params.startTime);
      if (isNaN(startTime)) {
        // Simple natural language parsing
        const now = new Date();
        if (params.startTime.toLowerCase().includes('tomorrow')) {
          startTime = new Date(now);
          startTime.setDate(startTime.getDate() + 1);
          const timeMatch = params.startTime.match(/(\d+)\s*(am|pm)/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            if (timeMatch[2].toLowerCase() === 'pm' && hour !== 12) hour += 12;
            if (timeMatch[2].toLowerCase() === 'am' && hour === 12) hour = 0;
            startTime.setHours(hour, 0, 0, 0);
          }
        }
      }

      const duration = params.duration || 60;
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Create appointment
      const appointment = await this.models.Appointment.create({
        userId: lead.user || '000000000000000000000000',
        leadId: lead._id,
        title: params.title,
        description: params.description,
        type: params.type || 'meeting',
        startTime,
        endTime,
        location: params.location,
        attendees: [{
          name: contact.name,
          email: contact.email,
          phone: contact.phone
        }],
        status: 'scheduled',
        aiScheduled: true,
        reminderSent: false,
        reminderTime: params.sendReminder ? new Date(startTime.getTime() - (params.reminderMinutesBefore || 60) * 60000) : null
      });

      // Send notifications
      if (contact.phone && this.twilioService) {
        await this.sendSMS(contact.phone, `Appointment scheduled: ${params.title} on ${startTime.toLocaleString()}. ${params.location || ''}`);
      }

      if (this.pushNotificationService) {
        await this.sendNotification(`Appointment booked with ${contact.name} for ${startTime.toLocaleString()}`);
      }

      console.log(`✅ [APPOINTMENT] Booked: ${appointment._id}`);

      return {
        success: true,
        appointment: {
          id: appointment._id,
          title: appointment.title,
          contact: contact.name,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          type: appointment.type,
          location: appointment.location
        },
        summary: `Appointment "${params.title}" booked with ${contact.name} for ${startTime.toLocaleString()}. Notifications sent.`
      };
    } catch (error) {
      console.error('❌ [APPOINTMENT] Booking failed:', error.message);
      return {
        success: false,
        error: `Failed to book appointment: ${error.message}`
      };
    }
  }

  async getUpcomingAppointments(days = 7, limit = 10) {
    try {
      if (!this.models?.Appointment) {
        throw new Error('Appointment model not available');
      }

      console.log(`📅 [APPOINTMENTS] Getting upcoming (${days} days)`);

      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const appointments = await this.models.Appointment.find({
        startTime: { $gte: now, $lte: futureDate },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate('leadId', 'name phone email')
      .sort({ startTime: 1 })
      .limit(limit);

      console.log(`✅ [APPOINTMENTS] Found ${appointments.length} upcoming`);

      return {
        success: true,
        appointments: appointments.map(apt => ({
          id: apt._id,
          title: apt.title,
          contact: apt.leadId?.name || 'Unknown',
          startTime: apt.startTime,
          endTime: apt.endTime,
          type: apt.type,
          location: apt.location,
          status: apt.status
        })),
        summary: appointments.length > 0
          ? `You have ${appointments.length} appointments in the next ${days} days: ${appointments.map(a => `${a.title} with ${a.leadId?.name} on ${new Date(a.startTime).toLocaleDateString()}`).join(', ')}`
          : `No appointments scheduled in the next ${days} days`
      };
    } catch (error) {
      console.error('❌ [APPOINTMENTS] Error:', error.message);
      return {
        success: false,
        error: `Failed to get appointments: ${error.message}`
      };
    }
  }

  async cancelAppointment(appointmentId, reason, notifyContact = true) {
    try {
      if (!this.models?.Appointment) {
        throw new Error('Appointment model not available');
      }

      console.log(`❌ [APPOINTMENT] Cancelling: ${appointmentId}`);

      const appointment = await this.models.Appointment.findById(appointmentId).populate('leadId');
      if (!appointment) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }

      appointment.status = 'cancelled';
      appointment.notes = (appointment.notes || '') + `\nCancelled: ${reason || 'No reason provided'}`;
      await appointment.save();

      // Notify contact
      if (notifyContact && appointment.leadId?.phone && this.twilioService) {
        await this.sendSMS(
          appointment.leadId.phone,
          `Appointment cancelled: ${appointment.title} on ${new Date(appointment.startTime).toLocaleString()}. ${reason || ''}`
        );
      }

      console.log(`✅ [APPOINTMENT] Cancelled: ${appointmentId}`);

      return {
        success: true,
        summary: `Appointment "${appointment.title}" with ${appointment.leadId?.name} has been cancelled${notifyContact ? ' and contact has been notified' : ''}.`
      };
    } catch (error) {
      console.error('❌ [APPOINTMENT] Cancellation failed:', error.message);
      return {
        success: false,
        error: `Failed to cancel appointment: ${error.message}`
      };
    }
  }

  async rescheduleAppointment(appointmentId, newStartTime, notifyContact = true) {
    try {
      if (!this.models?.Appointment) {
        throw new Error('Appointment model not available');
      }

      console.log(`🔄 [APPOINTMENT] Rescheduling: ${appointmentId}`);

      const appointment = await this.models.Appointment.findById(appointmentId).populate('leadId');
      if (!appointment) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }

      const oldStartTime = appointment.startTime;
      const duration = appointment.endTime - appointment.startTime;

      appointment.startTime = new Date(newStartTime);
      appointment.endTime = new Date(appointment.startTime.getTime() + duration);
      appointment.notes = (appointment.notes || '') + `\nRescheduled from ${oldStartTime.toLocaleString()}`;
      await appointment.save();

      // Notify contact
      if (notifyContact && appointment.leadId?.phone && this.twilioService) {
        await this.sendSMS(
          appointment.leadId.phone,
          `Appointment rescheduled: ${appointment.title} moved to ${appointment.startTime.toLocaleString()}`
        );
      }

      console.log(`✅ [APPOINTMENT] Rescheduled: ${appointmentId}`);

      return {
        success: true,
        summary: `Appointment "${appointment.title}" with ${appointment.leadId?.name} rescheduled to ${appointment.startTime.toLocaleString()}${notifyContact ? '. Contact has been notified' : ''}.`
      };
    } catch (error) {
      console.error('❌ [APPOINTMENT] Rescheduling failed:', error.message);
      return {
        success: false,
        error: `Failed to reschedule appointment: ${error.message}`
      };
    }
  }

  // Enhanced Contact Communication
  async sendContactSMS(contactIdentifier, message) {
    try {
      if (!this.models?.Contact) {
        throw new Error('Contact model not available');
      }

      const contact = await this.models.Contact.findOne({
        $or: [
          { name: { $regex: contactIdentifier, $options: 'i' } },
          { phone: { $regex: contactIdentifier, $options: 'i' } }
        ],
        isDeleted: false
      });

      if (!contact) {
        return {
          success: false,
          error: `No contact found matching "${contactIdentifier}"`
        };
      }

      console.log(`💬 [SMS] Sending to ${contact.name} (${contact.phone})`);

      const result = await this.sendSMS(contact.phone, message);

      // Add to conversation history
      await contact.addConversation('sms', 'outgoing', message);

      return {
        success: true,
        summary: `Text message sent to ${contact.name} (${contact.phone})`
      };
    } catch (error) {
      console.error('❌ [SMS] Failed:', error.message);
      return {
        success: false,
        error: `Failed to send SMS: ${error.message}`
      };
    }
  }

  async sendContactEmail(contactIdentifier, subject, body) {
    try {
      if (!this.models?.Contact) {
        throw new Error('Contact model not available');
      }

      const contact = await this.models.Contact.findOne({
        $or: [
          { name: { $regex: contactIdentifier, $options: 'i' } },
          { email: { $regex: contactIdentifier, $options: 'i' } }
        ],
        isDeleted: false
      });

      if (!contact) {
        return {
          success: false,
          error: `No contact found matching "${contactIdentifier}"`
        };
      }

      if (!contact.email) {
        return {
          success: false,
          error: `${contact.name} does not have an email address on file`
        };
      }

      console.log(`📧 [EMAIL] Sending to ${contact.name} (${contact.email})`);

      const result = await this.sendEmail(contact.email, subject, body);

      // Add to conversation history
      await contact.addConversation('email', 'outgoing', `Subject: ${subject}\n\n${body}`);

      return {
        success: true,
        summary: `Email sent to ${contact.name} (${contact.email})`
      };
    } catch (error) {
      console.error('❌ [EMAIL] Failed:', error.message);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`
      };
    }
  }

  async searchContacts(query) {
    try {
      if (!this.models?.Lead) {
        throw new Error('Lead model not available');
      }

      console.log(`🔍 [CRM] Searching contacts: ${query}`);

      const leads = await this.models.Lead.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      }).limit(10);

      console.log(`✅ [CRM] Found ${leads.length} contacts`);

      return {
        success: true,
        contacts: leads.map(l => ({
          name: l.name,
          email: l.email,
          phone: l.phone,
          status: l.status
        })),
        summary: leads.length > 0
          ? `Found ${leads.length} contacts matching "${query}"`
          : `No contacts found matching "${query}"`
      };
    } catch (error) {
      console.error('❌ [CRM] Error searching contacts:', error.message);
      return {
        success: false,
        error: `Contact search failed: ${error.message}`
      };
    }
  }

  // Execute a capability function call
  async execute(functionName, args) {
    console.log(`⚡ [CAPABILITY] Executing: ${functionName}`, args);

    switch (functionName) {
      case 'web_search':
        return await this.webSearch(args.query);

      case 'fetch_url':
        return await this.fetchUrl(args.url);

      case 'send_email':
        return await this.sendEmail(args.to, args.subject, args.body);

      case 'send_sms':
        return await this.sendSms(args.to, args.message);

      case 'send_mms':
        return await this.sendMms(args.to, args.message, args.mediaUrl);

      case 'remember_info':
        return await this.rememberInfo(args.key, args.value, args.category);

      case 'recall_info':
        return await this.recallInfo(args.query);

      case 'get_recent_leads':
        return await this.getRecentLeads(args.limit);

      case 'get_recent_messages':
        return await this.getRecentMessages(args.limit);

      case 'get_calls_summary':
        return await this.getCallsSummary(args.limit);

      case 'search_contacts':
        return await this.searchContacts(args.query);

      case 'send_notification':
        return await this.sendNotification(args.message, args.title, args.category);

      case 'create_lead':
        return await this.createLead(args);

      case 'update_lead':
        return await this.updateLead(args);

      case 'add_note_to_lead':
        return await this.addNoteToLead(args.leadId, args.note, args.category);

      case 'create_deal':
        return await this.createDeal(args);

      case 'get_contact_details':
        return await this.getContactDetails(args.query);

      case 'get_contact_history':
        return await this.getContactHistory(args.contactIdentifier, args.limit);

      case 'book_appointment':
        return await this.bookAppointment(args);

      case 'get_upcoming_appointments':
        return await this.getUpcomingAppointments(args.days, args.limit);

      case 'cancel_appointment':
        return await this.cancelAppointment(args.appointmentId, args.reason, args.notifyContact);

      case 'reschedule_appointment':
        return await this.rescheduleAppointment(args.appointmentId, args.newStartTime, args.notifyContact);

      case 'send_contact_sms':
        return await this.sendContactSMS(args.contactIdentifier, args.message);

      case 'send_contact_email':
        return await this.sendContactEmail(args.contactIdentifier, args.subject, args.body);

      default:
        return {
          success: false,
          error: `Unknown capability: ${functionName}`
        };
    }
  }

  /**
   * Send push notification to user's device
   */
  async sendNotification(message, title = 'Aria AI Assistant', category = 'message', userId = 'default') {
    try {
      console.log(`📲 [NOTIFICATION] Sending to user ${userId}:`, message);

      const result = await pushNotificationService.sendAriaNotification(
        userId,
        message,
        {
          title,
          category
        }
      );

      if (result.success) {
        console.log(`✅ [NOTIFICATION] Sent successfully`);
        return {
          success: true,
          summary: `Notification sent: "${message}"`
        };
      } else {
        console.error(`❌ [NOTIFICATION] Failed:`, result.error);
        return {
          success: false,
          error: result.error,
          summary: 'Failed to send notification - user may not have notifications enabled'
        };
      }
    } catch (error) {
      console.error('❌ [NOTIFICATION] Error:', error);
      return {
        success: false,
        error: error.message,
        summary: 'Error sending notification'
      };
    }
  }
}

export default AriaCapabilities;
