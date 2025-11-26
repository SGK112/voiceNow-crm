import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { ariaMemoryService } from '../services/ariaMemoryService.js';
import { ariaSlackService } from '../services/ariaSlackService.js';
import { pushNotificationService } from '../services/pushNotificationService.js';
import N8nService from '../services/n8nService.js';
import { ariaIntegrationService } from '../services/ariaIntegrationService.js';
import shopifySyncService from '../services/shopifySyncService.js';
import replicateMediaService from '../services/replicateMediaService.js';

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

  // Group SMS capability
  send_group_sms: {
    name: 'send_group_sms',
    description: 'Send a text message (SMS) to multiple recipients at once. Great for announcements, reminders, or team notifications.',
    parameters: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of phone numbers to send SMS to (E.164 format, e.g., ["+1234567890", "+1987654321"])'
        },
        message: {
          type: 'string',
          description: 'Text message content to send to all recipients'
        },
        personalizeGreeting: {
          type: 'boolean',
          description: 'If true and contact names are known, personalize each message with their name',
          default: false
        }
      },
      required: ['recipients', 'message']
    }
  },

  // Group Email capability
  send_group_email: {
    name: 'send_group_email',
    description: 'Send an email to multiple recipients. Can send as individual emails or as CC/BCC.',
    parameters: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of email addresses to send to'
        },
        subject: {
          type: 'string',
          description: 'Email subject line'
        },
        body: {
          type: 'string',
          description: 'Email body content (supports HTML)'
        },
        sendType: {
          type: 'string',
          enum: ['individual', 'cc', 'bcc'],
          description: 'How to send: individual (separate emails), cc (all visible), or bcc (hidden recipients)',
          default: 'individual'
        },
        personalizeGreeting: {
          type: 'boolean',
          description: 'If true and sending individual emails, personalize each with their name',
          default: false
        }
      },
      required: ['recipients', 'subject', 'body']
    }
  },

  // Voice Message capability
  send_voice_message: {
    name: 'send_voice_message',
    description: 'Send a pre-recorded voice message (voicemail drop) to a phone number. Uses text-to-speech if no audio file is provided.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Phone number to send voice message to (E.164 format)'
        },
        message: {
          type: 'string',
          description: 'Text content of the voice message (will be converted to speech)'
        },
        voice: {
          type: 'string',
          enum: ['aria', 'professional', 'friendly', 'warm'],
          description: 'Voice style to use for text-to-speech',
          default: 'aria'
        },
        audioUrl: {
          type: 'string',
          description: 'Optional URL to a pre-recorded audio file to use instead of TTS'
        }
      },
      required: ['to', 'message']
    }
  },

  // Conference Call capability
  initiate_conference_call: {
    name: 'initiate_conference_call',
    description: 'Start a conference call with multiple participants. Aria can moderate or just connect the parties.',
    parameters: {
      type: 'object',
      properties: {
        participants: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of phone numbers to include in the conference call'
        },
        moderatorPhone: {
          type: 'string',
          description: 'Phone number of the call moderator (usually the user)'
        },
        title: {
          type: 'string',
          description: 'Name/title of the conference call for reference'
        },
        recordCall: {
          type: 'boolean',
          description: 'Whether to record the conference call',
          default: false
        },
        announceJoins: {
          type: 'boolean',
          description: 'Announce when participants join/leave',
          default: true
        },
        ariaModerate: {
          type: 'boolean',
          description: 'Have Aria AI moderate and facilitate the call',
          default: false
        }
      },
      required: ['participants']
    }
  },

  // Transfer Call to Agent capability
  transfer_call_to_agent: {
    name: 'transfer_call_to_agent',
    description: 'Transfer the current call to another AI agent or specialist. Use when the conversation requires a different expertise.',
    parameters: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of the agent to transfer to'
        },
        agentType: {
          type: 'string',
          enum: ['sales', 'support', 'scheduling', 'billing', 'technical', 'general'],
          description: 'Type of agent needed if ID not known'
        },
        context: {
          type: 'string',
          description: 'Brief context to pass to the receiving agent about the conversation so far'
        },
        warmTransfer: {
          type: 'boolean',
          description: 'If true, introduce the call to the new agent before transfer. If false, cold transfer.',
          default: true
        }
      },
      required: ['context']
    }
  },

  // Transfer Call to Human capability
  transfer_call_to_human: {
    name: 'transfer_call_to_human',
    description: 'Transfer the current call to a human team member or external number. Use when human intervention is needed.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Phone number to transfer to (if known)'
        },
        teamMember: {
          type: 'string',
          description: 'Name or ID of team member to transfer to (will look up their number)'
        },
        department: {
          type: 'string',
          enum: ['sales', 'support', 'management', 'operations', 'billing', 'emergency'],
          description: 'Department to route to if specific person not specified'
        },
        context: {
          type: 'string',
          description: 'Brief summary of the conversation and reason for transfer'
        },
        priority: {
          type: 'string',
          enum: ['normal', 'high', 'urgent'],
          description: 'Priority level of the transfer',
          default: 'normal'
        },
        warmTransfer: {
          type: 'boolean',
          description: 'If true, brief the human before connecting the caller',
          default: true
        }
      },
      required: ['context']
    }
  },

  // Calendar Invite capability
  send_calendar_invite: {
    name: 'send_calendar_invite',
    description: 'Send a calendar invite (ICS) via email or SMS. The recipient can add it directly to their calendar app.',
    parameters: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of email addresses or phone numbers to send invite to'
        },
        title: {
          type: 'string',
          description: 'Event title'
        },
        startTime: {
          type: 'string',
          description: 'Start date and time in ISO format or natural language'
        },
        endTime: {
          type: 'string',
          description: 'End date and time (or duration can be specified instead)'
        },
        duration: {
          type: 'number',
          description: 'Duration in minutes if endTime not specified',
          default: 60
        },
        location: {
          type: 'string',
          description: 'Meeting location or video call link'
        },
        description: {
          type: 'string',
          description: 'Event description and agenda'
        },
        sendMethod: {
          type: 'string',
          enum: ['email', 'sms', 'both'],
          description: 'How to send the invite',
          default: 'email'
        },
        reminderMinutes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of reminder times in minutes before event (e.g., [60, 15] for 1 hour and 15 min)',
          default: [60, 15]
        }
      },
      required: ['recipients', 'title', 'startTime']
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
  },

  // N8N Workflow Automation
  trigger_workflow: {
    name: 'trigger_workflow',
    description: 'Trigger an automated n8n workflow. Available workflows: emergency_dispatch (plumbing/HVAC emergencies), estimate_request (send estimate request to team), job_complete (trigger completion workflow with payment/review), quote_followup (start follow-up sequence), send_team_notification (notify team via Slack/SMS)',
    parameters: {
      type: 'object',
      properties: {
        workflowType: {
          type: 'string',
          enum: ['emergency_dispatch', 'estimate_request', 'job_complete', 'quote_followup', 'send_team_notification', 'custom'],
          description: 'Type of workflow to trigger'
        },
        data: {
          type: 'object',
          description: 'Data to pass to the workflow (lead info, contact details, job details, etc.)',
          properties: {
            lead_name: { type: 'string', description: 'Contact/lead name' },
            lead_phone: { type: 'string', description: 'Phone number' },
            lead_email: { type: 'string', description: 'Email address' },
            address: { type: 'string', description: 'Service/job address' },
            urgency: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'], description: 'Urgency level' },
            project_type: { type: 'string', description: 'Type of project (e.g., plumbing, electrical, remodel)' },
            issue_description: { type: 'string', description: 'Description of issue or request' },
            notes: { type: 'string', description: 'Additional notes' }
          }
        },
        customWebhookPath: {
          type: 'string',
          description: 'For custom workflows, the webhook path in n8n'
        }
      },
      required: ['workflowType', 'data']
    }
  },

  list_workflows: {
    name: 'list_workflows',
    description: 'List available n8n automation workflows',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'construction', 'general'],
          description: 'Filter by category'
        }
      }
    }
  },

  deploy_workflow: {
    name: 'deploy_workflow',
    description: 'Deploy a new workflow from a template to n8n. Use this when setting up new automations.',
    parameters: {
      type: 'object',
      properties: {
        templateName: {
          type: 'string',
          enum: ['plumbing_emergency_dispatch', 'project_estimate_workflow', 'job_completion_workflow', 'quote_follow_up', 'material_delivery_tracking', 'slack_notification', 'send_sms', 'send_email', 'book_appointment'],
          description: 'Name of the workflow template to deploy'
        },
        customName: {
          type: 'string',
          description: 'Custom name for this workflow instance'
        }
      },
      required: ['templateName']
    }
  },

  // Estimate/Quote capabilities
  create_estimate: {
    name: 'create_estimate',
    description: 'Create a new estimate/quote for a client. Use this when the user wants to write up a quote or estimate for work.',
    parameters: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Name of the client'
        },
        clientPhone: {
          type: 'string',
          description: 'Client phone number (optional)'
        },
        clientEmail: {
          type: 'string',
          description: 'Client email address (optional)'
        },
        projectType: {
          type: 'string',
          description: 'Type of project (e.g., "kitchen remodel", "countertop installation", "bathroom renovation")'
        },
        projectDescription: {
          type: 'string',
          description: 'Description of the work to be done'
        },
        items: {
          type: 'array',
          description: 'Line items for the estimate',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Item description' },
              quantity: { type: 'number', description: 'Quantity' },
              rate: { type: 'number', description: 'Price per unit' }
            }
          }
        },
        notes: {
          type: 'string',
          description: 'Additional notes for the estimate'
        }
      },
      required: ['clientName', 'projectType']
    }
  },

  get_estimates: {
    name: 'get_estimates',
    description: 'Get recent estimates/quotes',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'draft', 'sent', 'accepted', 'declined'],
          description: 'Filter by status'
        },
        limit: {
          type: 'number',
          description: 'Number of estimates to retrieve (default 5)'
        }
      }
    }
  },

  send_estimate: {
    name: 'send_estimate',
    description: 'Send an estimate to the client via email',
    parameters: {
      type: 'object',
      properties: {
        estimateId: {
          type: 'string',
          description: 'ID of the estimate to send'
        },
        message: {
          type: 'string',
          description: 'Custom message to include with the estimate email'
        }
      },
      required: ['estimateId']
    }
  },

  // Invoice capabilities
  create_invoice: {
    name: 'create_invoice',
    description: 'Create a new invoice for a client',
    parameters: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Name of the client'
        },
        clientEmail: {
          type: 'string',
          description: 'Client email address'
        },
        items: {
          type: 'array',
          description: 'Line items for the invoice',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Item description' },
              quantity: { type: 'number', description: 'Quantity' },
              rate: { type: 'number', description: 'Price per unit' }
            }
          }
        },
        dueDate: {
          type: 'string',
          description: 'Due date (e.g., "30 days", "2025-12-15")'
        },
        notes: {
          type: 'string',
          description: 'Additional notes'
        }
      },
      required: ['clientName', 'items']
    }
  },

  send_invoice: {
    name: 'send_invoice',
    description: 'Send an invoice to the client via email',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'ID of the invoice to send'
        },
        message: {
          type: 'string',
          description: 'Custom message to include with the invoice email'
        }
      },
      required: ['invoiceId']
    }
  },

  get_invoices: {
    name: 'get_invoices',
    description: 'Get recent invoices',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'draft', 'sent', 'paid', 'overdue'],
          description: 'Filter by status'
        },
        limit: {
          type: 'number',
          description: 'Number of invoices to retrieve (default 5)'
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // PHONE DATA ACCESS
  // ═══════════════════════════════════════════════════════════════════

  get_phone_contacts: {
    name: 'get_phone_contacts',
    description: 'Get contacts from synced phone/device. Use this to look up contact details, find someone\'s phone number or email.',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search term to filter contacts (name, phone, email, or company)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return (default 20)',
          default: 20
        }
      }
    }
  },

  find_contact: {
    name: 'find_contact',
    description: 'Find a specific contact by name. Returns detailed info including phone, email, and recent interactions.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the contact to find'
        }
      },
      required: ['name']
    }
  },

  get_call_history: {
    name: 'get_call_history',
    description: 'Get recent call history from phone. Shows who called, call duration, and direction.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of calls to retrieve (default 20)',
          default: 20
        },
        direction: {
          type: 'string',
          enum: ['inbound', 'outbound', 'missed'],
          description: 'Filter by call direction'
        },
        contactPhone: {
          type: 'string',
          description: 'Filter calls to/from a specific phone number'
        }
      }
    }
  },

  get_message_history: {
    name: 'get_message_history',
    description: 'Get SMS/text message history with a specific contact',
    parameters: {
      type: 'object',
      properties: {
        contactIdentifier: {
          type: 'string',
          description: 'Contact name or phone number to get messages for'
        }
      },
      required: ['contactIdentifier']
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // TEAM COLLABORATION
  // ═══════════════════════════════════════════════════════════════════

  get_team_members: {
    name: 'get_team_members',
    description: 'Get list of team members and their roles',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  message_team_member: {
    name: 'message_team_member',
    description: 'Send a message to a team member. Can be marked as urgent for SMS delivery.',
    parameters: {
      type: 'object',
      properties: {
        memberEmail: {
          type: 'string',
          description: 'Email or name of the team member to message'
        },
        message: {
          type: 'string',
          description: 'Message content to send'
        },
        urgent: {
          type: 'boolean',
          description: 'Mark as urgent (sends via SMS in addition to push notification)',
          default: false
        }
      },
      required: ['memberEmail', 'message']
    }
  },

  assign_task_to_team: {
    name: 'assign_task_to_team',
    description: 'Assign a task to a team member for follow-up or action',
    parameters: {
      type: 'object',
      properties: {
        memberEmail: {
          type: 'string',
          description: 'Email or name of the team member to assign task to'
        },
        taskDescription: {
          type: 'string',
          description: 'Description of the task'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Task priority level',
          default: 'medium'
        },
        dueDate: {
          type: 'string',
          description: 'Due date for the task (YYYY-MM-DD format or natural language)'
        }
      },
      required: ['memberEmail', 'taskDescription']
    }
  },

  request_follow_up: {
    name: 'request_follow_up',
    description: 'Request a team member to follow up with a specific contact',
    parameters: {
      type: 'object',
      properties: {
        memberEmail: {
          type: 'string',
          description: 'Email or name of the team member to request follow-up from'
        },
        contactName: {
          type: 'string',
          description: 'Name of the contact to follow up with'
        },
        notes: {
          type: 'string',
          description: 'Notes or context for the follow-up'
        }
      },
      required: ['memberEmail', 'contactName', 'notes']
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // SCHEDULE & CALENDAR
  // ═══════════════════════════════════════════════════════════════════

  get_schedule: {
    name: 'get_schedule',
    description: 'Get schedule/calendar for upcoming days. Shows all appointments and events.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days ahead to show (default 7)',
          default: 7
        },
        includeCompleted: {
          type: 'boolean',
          description: 'Include completed appointments',
          default: false
        }
      }
    }
  },

  check_availability: {
    name: 'check_availability',
    description: 'Check if a specific time slot is available for scheduling',
    parameters: {
      type: 'object',
      properties: {
        proposedTime: {
          type: 'string',
          description: 'The proposed date/time to check (ISO format or natural language like "tomorrow at 2pm")'
        },
        durationMinutes: {
          type: 'number',
          description: 'Duration of the proposed meeting in minutes (default 60)',
          default: 60
        }
      },
      required: ['proposedTime']
    }
  },

  send_appointment_reminder: {
    name: 'send_appointment_reminder',
    description: 'Send a reminder for an upcoming appointment to the contact',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID of the appointment to send reminder for'
        }
      },
      required: ['appointmentId']
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // RAG KNOWLEDGE BASE
  // ═══════════════════════════════════════════════════════════════════

  search_knowledge: {
    name: 'search_knowledge',
    description: 'Search the knowledge base for relevant information, pricing, policies, or business data',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for in the knowledge base'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default 5)',
          default: 5
        }
      },
      required: ['query']
    }
  },

  list_knowledge_bases: {
    name: 'list_knowledge_bases',
    description: 'List all available knowledge bases and their topics',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // PHONE ORGANIZATION & CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  find_duplicate_contacts: {
    name: 'find_duplicate_contacts',
    description: 'Find duplicate contacts that could be merged to clean up the contact list',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  merge_contacts: {
    name: 'merge_contacts',
    description: 'Merge two duplicate contacts into one',
    parameters: {
      type: 'object',
      properties: {
        keepContactId: {
          type: 'string',
          description: 'ID of the contact to keep (primary)'
        },
        removeContactId: {
          type: 'string',
          description: 'ID of the contact to merge and remove'
        }
      },
      required: ['keepContactId', 'removeContactId']
    }
  },

  get_stale_contacts: {
    name: 'get_stale_contacts',
    description: 'Find contacts that haven\'t been contacted in a while and may need follow-up',
    parameters: {
      type: 'object',
      properties: {
        daysSinceContact: {
          type: 'number',
          description: 'Number of days since last contact (default 30)',
          default: 30
        }
      }
    }
  },

  tag_contact: {
    name: 'tag_contact',
    description: 'Add tags/categories to a contact for organization',
    parameters: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'ID of the contact to tag'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add to the contact (e.g., ["VIP", "contractor", "supplier"])'
        }
      },
      required: ['contactId', 'tags']
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // AI IMAGE GENERATION & VISION (via Replicate)
  // ═══════════════════════════════════════════════════════════════════

  generate_image: {
    name: 'generate_image',
    description: 'Generate AI images from text descriptions using Replicate (Flux, SDXL models). Great for creating marketing materials, product visualizations, before/after mockups, social media content, and project visualizations.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate. Be specific about style, colors, composition, lighting, etc.'
        },
        model: {
          type: 'string',
          enum: ['flux_schnell', 'flux_dev', 'flux_pro', 'sdxl'],
          description: 'AI model to use: flux_schnell (fast, good quality), flux_dev (better quality), flux_pro (best quality), sdxl (Stable Diffusion XL)',
          default: 'flux_schnell'
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Image aspect ratio: 1:1 (square), 16:9 (landscape), 9:16 (portrait/story), 4:3, 3:4',
          default: '1:1'
        },
        style: {
          type: 'string',
          enum: ['photorealistic', 'artistic', 'cartoon', 'sketch', '3d_render', 'watercolor', 'oil_painting'],
          description: 'Visual style for the generated image',
          default: 'photorealistic'
        },
        numOutputs: {
          type: 'number',
          description: 'Number of images to generate (1-4)',
          default: 1
        }
      },
      required: ['prompt']
    }
  },

  analyze_image: {
    name: 'analyze_image',
    description: 'Analyze an image using AI vision to understand its contents, extract text (OCR), identify objects, describe scenes, or answer questions about the image. Use this when users upload photos, screenshots, or documents.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the image to analyze'
        },
        question: {
          type: 'string',
          description: 'Specific question to answer about the image, or leave blank for general description'
        },
        analysisType: {
          type: 'string',
          enum: ['general', 'ocr', 'objects', 'scene', 'document', 'product', 'construction'],
          description: 'Type of analysis: general (describe), ocr (extract text), objects (identify items), scene (describe setting), document (analyze docs), product (identify products), construction (analyze job site/progress)',
          default: 'general'
        }
      },
      required: ['imageUrl']
    }
  },

  save_image_to_project: {
    name: 'save_image_to_project',
    description: 'Save an image to a CRM project or contact for organization and project management. Useful for storing before/after photos, job site images, receipts, documents, and progress photos.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the image to save'
        },
        projectId: {
          type: 'string',
          description: 'ID of the project/deal to attach the image to (optional)'
        },
        contactId: {
          type: 'string',
          description: 'ID of the contact to attach the image to (optional)'
        },
        category: {
          type: 'string',
          enum: ['before', 'after', 'progress', 'receipt', 'document', 'product', 'site_photo', 'marketing', 'other'],
          description: 'Category for organizing the image',
          default: 'other'
        },
        description: {
          type: 'string',
          description: 'Description or notes about the image'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for searchability (e.g., ["kitchen", "remodel", "day-1"])'
        }
      },
      required: ['imageUrl']
    }
  },

  get_project_images: {
    name: 'get_project_images',
    description: 'Get all images associated with a project or contact',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project to get images for'
        },
        contactId: {
          type: 'string',
          description: 'ID of the contact to get images for'
        },
        category: {
          type: 'string',
          enum: ['all', 'before', 'after', 'progress', 'receipt', 'document', 'product', 'site_photo', 'marketing', 'other'],
          description: 'Filter by image category',
          default: 'all'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of images to return',
          default: 20
        }
      }
    }
  },

  // Enhanced web scraping with intelligent extraction
  scrape_webpage: {
    name: 'scrape_webpage',
    description: 'Scrape and intelligently extract structured data from a webpage. Better than fetch_url for extracting specific information like prices, contact info, product details, or lists.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the webpage to scrape'
        },
        extractionType: {
          type: 'string',
          enum: ['full_text', 'contact_info', 'prices', 'products', 'links', 'tables', 'article', 'custom'],
          description: 'What type of data to extract',
          default: 'full_text'
        },
        customSelector: {
          type: 'string',
          description: 'For custom extraction, provide a CSS selector or description of what to extract'
        },
        summarize: {
          type: 'boolean',
          description: 'Whether to provide an AI summary of the extracted content',
          default: true
        }
      },
      required: ['url']
    }
  }
};

// Get all capability function definitions for OpenAI
export function getCapabilityDefinitions() {
  return Object.values(capabilities);
}

// Initialize n8n service singleton
const n8nService = new N8nService();

// Replicate media service singleton (imported above)

// Capability implementations
export class AriaCapabilities {
  constructor(services = {}) {
    this.emailService = services.emailService;
    this.twilioService = services.twilioService;
    this.memoryStore = services.memoryStore || new Map();
    this.models = services.models; // Database models
    this.n8nService = n8nService;
    this.replicateService = replicateMediaService;
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

  // Group SMS - Send to multiple recipients
  async sendGroupSms(recipients, message, personalizeGreeting = false) {
    try {
      if (!this.twilioService) {
        throw new Error('SMS service not configured');
      }

      console.log(`📱 [GROUP SMS] Sending to ${recipients.length} recipients`);

      const results = [];
      const failed = [];

      for (const recipient of recipients) {
        try {
          let finalMessage = message;

          // If personalize is enabled, try to look up contact name
          if (personalizeGreeting && this.models?.Contact) {
            const contact = await this.models.Contact.findOne({ phone: recipient });
            if (contact?.name) {
              finalMessage = `Hi ${contact.name.split(' ')[0]}, ${message}`;
            }
          }

          await this.twilioService.sendSMS({
            agentId: null,
            to: recipient,
            message: finalMessage,
            metadata: { type: 'aria_group_sms' }
          });

          results.push({ to: recipient, success: true });
        } catch (err) {
          failed.push({ to: recipient, error: err.message });
        }
      }

      console.log(`✅ [GROUP SMS] Sent ${results.length}/${recipients.length} messages`);

      return {
        success: failed.length === 0,
        sent: results.length,
        failed: failed.length,
        details: { successful: results, failed },
        message: `Group SMS sent to ${results.length} of ${recipients.length} recipients`
      };
    } catch (error) {
      console.error('❌ [GROUP SMS] Error:', error.message);
      return {
        success: false,
        error: `Group SMS failed: ${error.message}`
      };
    }
  }

  // Group Email - Send to multiple recipients
  async sendGroupEmail(recipients, subject, body, sendType = 'individual', personalizeGreeting = false) {
    try {
      if (!this.emailService) {
        throw new Error('Email service not configured');
      }

      console.log(`📧 [GROUP EMAIL] Sending to ${recipients.length} recipients (${sendType})`);

      if (sendType === 'individual') {
        // Send separate emails to each recipient
        const results = [];
        const failed = [];

        for (const recipient of recipients) {
          try {
            let finalBody = body;

            if (personalizeGreeting && this.models?.Contact) {
              const contact = await this.models.Contact.findOne({ email: recipient });
              if (contact?.name) {
                finalBody = `Hi ${contact.name.split(' ')[0]},\n\n${body}`;
              }
            }

            await this.emailService.send(recipient, subject, finalBody);
            results.push({ to: recipient, success: true });
          } catch (err) {
            failed.push({ to: recipient, error: err.message });
          }
        }

        return {
          success: failed.length === 0,
          sent: results.length,
          failed: failed.length,
          details: { successful: results, failed },
          message: `Group email sent to ${results.length} of ${recipients.length} recipients`
        };
      } else {
        // Send as CC or BCC
        const mainRecipient = recipients[0];
        const otherRecipients = recipients.slice(1);

        await this.emailService.send(mainRecipient, subject, body, {
          [sendType]: otherRecipients
        });

        return {
          success: true,
          sent: recipients.length,
          message: `Group email sent to ${recipients.length} recipients via ${sendType.toUpperCase()}`
        };
      }
    } catch (error) {
      console.error('❌ [GROUP EMAIL] Error:', error.message);
      return {
        success: false,
        error: `Group email failed: ${error.message}`
      };
    }
  }

  // Send Voice Message (Voicemail Drop)
  async sendVoiceMessage(to, message, voice = 'aria', audioUrl = null) {
    try {
      if (!this.twilioService) {
        throw new Error('Voice service not configured');
      }

      console.log(`🎙️ [VOICE MSG] Sending voice message to: ${to}`);

      // If no audio URL, generate TTS
      let mediaUrl = audioUrl;
      if (!mediaUrl) {
        // Use TTS service to generate audio
        const ttsService = (await import('../services/ttsService.js')).default;
        const audioBase64 = await ttsService.synthesizeBase64(message, { voice, style: 'warm' });

        // For Twilio, we need a publicly accessible URL
        // Store temporarily and get URL (this would need cloud storage integration)
        // For now, use Twilio's TTS via TwiML
        mediaUrl = null; // Will use TwiML-based TTS
      }

      // Use Twilio to make a call that plays the voice message
      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      const call = await client.calls.create({
        to: to,
        from: process.env.TWILIO_PHONE_NUMBER,
        twiml: mediaUrl
          ? `<Response><Play>${mediaUrl}</Play></Response>`
          : `<Response><Say voice="Polly.Joanna">${message}</Say></Response>`,
        machineDetection: 'DetectMessageEnd', // Optimize for voicemail
      });

      console.log(`✅ [VOICE MSG] Call initiated: ${call.sid}`);

      return {
        success: true,
        callSid: call.sid,
        message: `Voice message being delivered to ${to}`
      };
    } catch (error) {
      console.error('❌ [VOICE MSG] Error:', error.message);
      return {
        success: false,
        error: `Voice message failed: ${error.message}`
      };
    }
  }

  // Initiate Conference Call
  async initiateConferenceCall(participants, moderatorPhone = null, title = 'Conference Call', options = {}) {
    try {
      if (!this.twilioService) {
        throw new Error('Call service not configured');
      }

      console.log(`📞 [CONFERENCE] Starting conference with ${participants.length} participants`);

      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      // Create a unique conference name
      const conferenceName = `aria-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const callResults = [];

      // Call each participant and add to conference
      for (const participant of participants) {
        try {
          const call = await client.calls.create({
            to: participant,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `<Response>
              <Say>You are being connected to a conference call${title ? `: ${title}` : ''}.</Say>
              <Dial>
                <Conference
                  ${options.recordCall ? 'record="record-from-start"' : ''}
                  ${options.announceJoins ? 'startConferenceOnEnter="true" endConferenceOnExit="false"' : ''}
                  waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
                >${conferenceName}</Conference>
              </Dial>
            </Response>`
          });

          callResults.push({ participant, callSid: call.sid, success: true });
        } catch (err) {
          callResults.push({ participant, error: err.message, success: false });
        }
      }

      // If moderator specified, call them too
      if (moderatorPhone) {
        try {
          const modCall = await client.calls.create({
            to: moderatorPhone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `<Response>
              <Say>You are the moderator for this conference call.</Say>
              <Dial>
                <Conference
                  startConferenceOnEnter="true"
                  endConferenceOnExit="true"
                  ${options.recordCall ? 'record="record-from-start"' : ''}
                >${conferenceName}</Conference>
              </Dial>
            </Response>`
          });
          callResults.push({ participant: moderatorPhone, role: 'moderator', callSid: modCall.sid, success: true });
        } catch (err) {
          callResults.push({ participant: moderatorPhone, role: 'moderator', error: err.message, success: false });
        }
      }

      const successful = callResults.filter(r => r.success).length;
      console.log(`✅ [CONFERENCE] Connected ${successful}/${callResults.length} participants`);

      return {
        success: successful > 0,
        conferenceName,
        title,
        participants: callResults,
        connected: successful,
        total: callResults.length,
        message: `Conference call started with ${successful} of ${callResults.length} participants`
      };
    } catch (error) {
      console.error('❌ [CONFERENCE] Error:', error.message);
      return {
        success: false,
        error: `Conference call failed: ${error.message}`
      };
    }
  }

  // Transfer Call to AI Agent
  async transferCallToAgent(currentCallSid, agentId = null, agentType = 'general', context = '', warmTransfer = true) {
    try {
      console.log(`🔀 [TRANSFER AGENT] Transferring call to ${agentType} agent`);

      // Look up agent configuration based on type
      const agentConfigs = {
        sales: { name: 'Sales Agent', prompt: 'You are a sales specialist...' },
        support: { name: 'Support Agent', prompt: 'You are a customer support specialist...' },
        scheduling: { name: 'Scheduling Agent', prompt: 'You are a scheduling assistant...' },
        billing: { name: 'Billing Agent', prompt: 'You are a billing specialist...' },
        technical: { name: 'Technical Agent', prompt: 'You are a technical support specialist...' },
        general: { name: 'General Agent', prompt: 'You are a helpful assistant...' }
      };

      const agent = agentConfigs[agentType] || agentConfigs.general;

      // If warm transfer, brief the receiving agent
      let transferMessage = '';
      if (warmTransfer && context) {
        transferMessage = `Transferring to ${agent.name}. Context: ${context}`;
      }

      // In a real implementation, this would:
      // 1. Update the current call's TwiML to play transfer message
      // 2. Switch to the new agent's voice/personality
      // 3. Pass conversation context to the new agent

      return {
        success: true,
        transferredTo: agent.name,
        agentType,
        context: context,
        warmTransfer,
        message: `Call transferred to ${agent.name}. ${transferMessage}`
      };
    } catch (error) {
      console.error('❌ [TRANSFER AGENT] Error:', error.message);
      return {
        success: false,
        error: `Agent transfer failed: ${error.message}`
      };
    }
  }

  // Transfer Call to Human
  async transferCallToHuman(currentCallSid, phoneNumber = null, teamMember = null, department = null, context = '', priority = 'normal', warmTransfer = true) {
    try {
      console.log(`🔀 [TRANSFER HUMAN] Transferring call to human`);

      // Resolve phone number
      let targetPhone = phoneNumber;
      let targetName = teamMember || department || 'Team Member';

      // If team member name provided, look up their number
      if (!targetPhone && teamMember) {
        // Look up team member in database
        if (this.models?.User) {
          const user = await this.models.User.findOne({
            $or: [
              { name: new RegExp(teamMember, 'i') },
              { 'profile.displayName': new RegExp(teamMember, 'i') }
            ]
          });
          if (user?.phone) {
            targetPhone = user.phone;
            targetName = user.name || user.profile?.displayName || teamMember;
          }
        }
      }

      // If department specified, use department routing
      if (!targetPhone && department) {
        const departmentNumbers = {
          sales: process.env.SALES_PHONE,
          support: process.env.SUPPORT_PHONE,
          management: process.env.MANAGEMENT_PHONE,
          operations: process.env.OPERATIONS_PHONE,
          billing: process.env.BILLING_PHONE,
          emergency: process.env.EMERGENCY_PHONE
        };
        targetPhone = departmentNumbers[department];
        targetName = `${department.charAt(0).toUpperCase() + department.slice(1)} Department`;
      }

      if (!targetPhone) {
        throw new Error('No transfer destination found. Please specify a phone number, team member, or department.');
      }

      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      // Build TwiML for transfer
      let twiml;
      if (warmTransfer) {
        // First call the human to brief them
        twiml = `<Response>
          <Say>Please hold while we connect you.</Say>
          <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}">
            <Number statusCallbackEvent="initiated ringing answered completed"
                    statusCallback="/api/voice/transfer-status">
              ${targetPhone}
            </Number>
          </Dial>
          <Say>We were unable to connect you. Please try again later.</Say>
        </Response>`;
      } else {
        // Cold transfer
        twiml = `<Response>
          <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}">
            ${targetPhone}
          </Dial>
        </Response>`;
      }

      // Update the current call with transfer TwiML
      if (currentCallSid) {
        await client.calls(currentCallSid).update({ twiml });
      }

      // Send notification about the transfer
      if (this.twilioService) {
        await this.twilioService.sendSMS({
          to: targetPhone,
          message: `Incoming call transfer${priority === 'urgent' ? ' (URGENT)' : ''}. Context: ${context}`,
          metadata: { type: 'transfer_notification', priority }
        }).catch(e => console.warn('Failed to send transfer notification:', e.message));
      }

      console.log(`✅ [TRANSFER HUMAN] Transferring to ${targetName} at ${targetPhone}`);

      return {
        success: true,
        transferredTo: targetName,
        phone: targetPhone,
        department,
        priority,
        warmTransfer,
        context,
        message: `Call being transferred to ${targetName}${warmTransfer ? ' (warm transfer)' : ''}`
      };
    } catch (error) {
      console.error('❌ [TRANSFER HUMAN] Error:', error.message);
      return {
        success: false,
        error: `Human transfer failed: ${error.message}`
      };
    }
  }

  // Send Calendar Invite
  async sendCalendarInvite(recipients, title, startTime, endTime = null, duration = 60, location = '', description = '', sendMethod = 'email', reminderMinutes = [60, 15]) {
    try {
      console.log(`📅 [CALENDAR INVITE] Sending invite to ${recipients.length} recipients`);

      // Parse start time
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        throw new Error('Invalid start time');
      }

      // Calculate end time
      const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60000);

      // Generate ICS content
      const icsContent = this.generateICS({
        title,
        start,
        end,
        location,
        description,
        organizer: process.env.FROM_EMAIL || 'aria@voiceflow.ai',
        reminderMinutes
      });

      const results = [];
      const failed = [];

      for (const recipient of recipients) {
        const isEmail = recipient.includes('@');
        const isPhone = /^\+?[\d\s-()]+$/.test(recipient);

        try {
          if ((sendMethod === 'email' || sendMethod === 'both') && isEmail) {
            // Send via email with ICS attachment
            await this.emailService.send(recipient, `Calendar Invite: ${title}`,
              `You've been invited to: ${title}\n\nWhen: ${start.toLocaleString()}\nWhere: ${location || 'TBD'}\n\n${description}\n\nPlease find the calendar invite attached.`,
              {
                attachments: [{
                  filename: 'invite.ics',
                  content: icsContent,
                  contentType: 'text/calendar'
                }]
              }
            );
            results.push({ to: recipient, method: 'email', success: true });
          }

          if ((sendMethod === 'sms' || sendMethod === 'both') && isPhone) {
            // Send via SMS with details
            const smsMessage = `📅 Calendar Invite: ${title}\n📆 ${start.toLocaleDateString()} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n📍 ${location || 'TBD'}\n\nAdd to calendar: [link would go here]`;

            await this.twilioService.sendSMS({
              to: recipient,
              message: smsMessage,
              metadata: { type: 'calendar_invite' }
            });
            results.push({ to: recipient, method: 'sms', success: true });
          }
        } catch (err) {
          failed.push({ to: recipient, error: err.message });
        }
      }

      console.log(`✅ [CALENDAR INVITE] Sent ${results.length}/${recipients.length} invites`);

      return {
        success: failed.length === 0,
        sent: results.length,
        failed: failed.length,
        event: { title, start: start.toISOString(), end: end.toISOString(), location },
        details: { successful: results, failed },
        message: `Calendar invite sent to ${results.length} of ${recipients.length} recipients`
      };
    } catch (error) {
      console.error('❌ [CALENDAR INVITE] Error:', error.message);
      return {
        success: false,
        error: `Calendar invite failed: ${error.message}`
      };
    }
  }

  // Helper: Generate ICS file content
  generateICS({ title, start, end, location, description, organizer, reminderMinutes }) {
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@voiceflow.ai`;

    let alarms = '';
    for (const mins of reminderMinutes) {
      alarms += `
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder
TRIGGER:-PT${mins}M
END:VALARM`;
    }

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VoiceFlow CRM//Aria AI//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${title}
LOCATION:${location || ''}
DESCRIPTION:${description ? description.replace(/\n/g, '\\n') : ''}
ORGANIZER:mailto:${organizer}
STATUS:CONFIRMED${alarms}
END:VEVENT
END:VCALENDAR`;
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

  // Create a new lead
  async createLead(args) {
    try {
      if (!this.models?.Lead) {
        throw new Error('Lead model not available');
      }

      const { name, phone, email, notes, source, status } = args;

      console.log(`➕ [CRM] Creating lead: ${name}`);

      // Check for duplicate by phone or email
      const existingLead = await this.models.Lead.findOne({
        $or: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : [])
        ]
      });

      if (existingLead) {
        return {
          success: false,
          error: `A lead with this ${existingLead.phone === phone ? 'phone number' : 'email'} already exists: ${existingLead.name}`,
          existingLead: {
            id: existingLead._id,
            name: existingLead.name,
            phone: existingLead.phone,
            email: existingLead.email
          }
        };
      }

      const lead = new this.models.Lead({
        name: name || 'New Lead',
        phone: phone || '',
        email: email || '',
        notes: notes || '',
        source: source || 'aria_conversation',
        status: status || 'new',
        createdAt: new Date()
      });

      await lead.save();
      console.log(`✅ [CRM] Lead created: ${lead._id}`);

      return {
        success: true,
        lead: {
          id: lead._id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status
        },
        summary: `Created new lead: ${lead.name}${lead.phone ? ` (${lead.phone})` : ''}`
      };
    } catch (error) {
      console.error('❌ [CRM] Error creating lead:', error.message);
      return {
        success: false,
        error: `Failed to create lead: ${error.message}`
      };
    }
  }

  // Update an existing lead
  async updateLead(args) {
    try {
      if (!this.models?.Lead) {
        throw new Error('Lead model not available');
      }

      const { leadId, name, phone, email, notes, status } = args;

      console.log(`✏️ [CRM] Updating lead: ${leadId}`);

      const lead = await this.models.Lead.findById(leadId);
      if (!lead) {
        return {
          success: false,
          error: 'Lead not found'
        };
      }

      // Update fields if provided
      if (name) lead.name = name;
      if (phone) lead.phone = phone;
      if (email) lead.email = email;
      if (notes) lead.notes = notes;
      if (status) lead.status = status;
      lead.updatedAt = new Date();

      await lead.save();
      console.log(`✅ [CRM] Lead updated: ${lead._id}`);

      return {
        success: true,
        lead: {
          id: lead._id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status
        },
        summary: `Updated lead: ${lead.name}`
      };
    } catch (error) {
      console.error('❌ [CRM] Error updating lead:', error.message);
      return {
        success: false,
        error: `Failed to update lead: ${error.message}`
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

  // N8N Workflow Methods
  async triggerWorkflow(workflowType, data, customWebhookPath) {
    try {
      console.log(`🔄 [N8N] Triggering workflow: ${workflowType}`);
      console.log(`📦 [N8N] Data:`, JSON.stringify(data, null, 2));

      // Map workflow types to webhook paths
      const workflowPaths = {
        'emergency_dispatch': 'emergency-dispatch',
        'estimate_request': 'estimate-request',
        'job_complete': 'job-complete',
        'quote_followup': 'quote-followup',
        'send_team_notification': 'team-notification'
      };

      const webhookPath = workflowType === 'custom'
        ? customWebhookPath
        : workflowPaths[workflowType] || workflowType;

      // Add timestamp and source
      const enrichedData = {
        ...data,
        triggered_at: new Date().toISOString(),
        source: 'aria_ai',
        workflow_type: workflowType
      };

      const result = await this.n8nService.triggerWorkflow(webhookPath, enrichedData);

      console.log(`✅ [N8N] Workflow triggered successfully`);

      // Also send notification
      await this.sendNotification(
        `Workflow "${workflowType}" triggered for ${data.lead_name || 'lead'}`,
        'Aria Automation',
        'task'
      );

      return {
        success: true,
        workflowType,
        webhookPath,
        result,
        summary: `Automation "${workflowType}" triggered successfully${data.lead_name ? ` for ${data.lead_name}` : ''}`
      };
    } catch (error) {
      console.error('❌ [N8N] Workflow trigger failed:', error.message);
      return {
        success: false,
        error: `Failed to trigger workflow: ${error.message}`,
        summary: `Could not trigger automation: ${error.message}`
      };
    }
  }

  async listWorkflows(category = 'all') {
    try {
      console.log(`📋 [N8N] Listing workflows (category: ${category})`);

      const templates = this.n8nService.getPrebuiltWorkflowTemplates();

      let workflows = Object.entries(templates).map(([key, value]) => ({
        id: key,
        name: value.name,
        type: value.type,
        category: value.category || 'general',
        description: value.description || ''
      }));

      // Filter by category if specified
      if (category !== 'all') {
        workflows = workflows.filter(w => w.category === category);
      }

      console.log(`✅ [N8N] Found ${workflows.length} workflows`);

      return {
        success: true,
        workflows,
        summary: `Found ${workflows.length} available workflows: ${workflows.map(w => w.name).join(', ')}`
      };
    } catch (error) {
      console.error('❌ [N8N] List workflows failed:', error.message);
      return {
        success: false,
        error: `Failed to list workflows: ${error.message}`
      };
    }
  }

  async deployWorkflow(templateName, customName) {
    try {
      console.log(`🚀 [N8N] Deploying workflow: ${templateName}`);

      const options = {};
      if (customName) {
        options.userId = customName; // Used to customize workflow name
      }

      const result = await this.n8nService.deployWorkflowFromTemplate(templateName, options);

      console.log(`✅ [N8N] Workflow deployed: ${result.workflowId}`);

      // Send notification about new workflow
      await this.sendNotification(
        `New automation deployed: ${result.workflowName}`,
        'Aria Automation',
        'task'
      );

      return {
        success: true,
        workflowId: result.workflowId,
        workflowName: result.workflowName,
        webhookUrl: result.webhookUrl,
        active: result.active,
        summary: `Workflow "${result.workflowName}" deployed and ${result.active ? 'activated' : 'created'}. Webhook: ${result.webhookUrl}`
      };
    } catch (error) {
      console.error('❌ [N8N] Deployment failed:', error.message);
      return {
        success: false,
        error: `Failed to deploy workflow: ${error.message}`,
        summary: `Could not deploy workflow: ${error.message}`
      };
    }
  }

  // Estimate/Quote capabilities
  async createEstimate(params) {
    try {
      console.log(`📋 [ESTIMATE] Creating estimate for: ${params.clientName}`);

      // Dynamically import VoiceEstimate model
      const VoiceEstimate = (await import('../models/VoiceEstimate.js')).default;

      // Calculate item amounts if not provided
      const items = (params.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: (item.quantity || 1) * (item.rate || 0)
      }));

      const estimate = await VoiceEstimate.create({
        user: params.userId || '000000000000000000000000',
        title: params.projectType || 'New Estimate',
        description: params.projectDescription,
        client: {
          name: params.clientName,
          email: params.clientEmail,
          phone: params.clientPhone
        },
        projectType: params.projectType,
        projectScope: params.projectDescription,
        items,
        notes: params.notes,
        status: 'draft',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      console.log(`✅ [ESTIMATE] Created: ${estimate.estimateNumber}`);

      return {
        success: true,
        estimate: {
          id: estimate._id,
          number: estimate.estimateNumber,
          client: estimate.client.name,
          total: estimate.total,
          status: estimate.status
        },
        summary: `Created estimate ${estimate.estimateNumber} for ${params.clientName}. Total: $${estimate.total.toFixed(2)}`
      };
    } catch (error) {
      console.error('❌ [ESTIMATE] Error creating estimate:', error.message);
      return {
        success: false,
        error: `Failed to create estimate: ${error.message}`
      };
    }
  }

  async getEstimates(status = 'all', limit = 5) {
    try {
      console.log(`📋 [ESTIMATES] Getting estimates (status: ${status}, limit: ${limit})`);

      const VoiceEstimate = (await import('../models/VoiceEstimate.js')).default;

      const query = {};
      if (status !== 'all') {
        query.status = status;
      }

      const estimates = await VoiceEstimate.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('estimateNumber title client total status createdAt');

      console.log(`✅ [ESTIMATES] Found ${estimates.length} estimates`);

      return {
        success: true,
        estimates: estimates.map(e => ({
          id: e._id,
          number: e.estimateNumber,
          title: e.title,
          client: e.client?.name,
          total: e.total,
          status: e.status,
          date: e.createdAt
        })),
        summary: estimates.length > 0
          ? `Found ${estimates.length} estimates. Most recent: ${estimates[0].estimateNumber} for ${estimates[0].client?.name} ($${estimates[0].total})`
          : 'No estimates found'
      };
    } catch (error) {
      console.error('❌ [ESTIMATES] Error:', error.message);
      return {
        success: false,
        error: `Failed to get estimates: ${error.message}`
      };
    }
  }

  async sendEstimate(estimateId, customMessage) {
    try {
      console.log(`📧 [ESTIMATE] Sending estimate: ${estimateId}`);

      const VoiceEstimate = (await import('../models/VoiceEstimate.js')).default;

      const estimate = await VoiceEstimate.findById(estimateId);
      if (!estimate) {
        return { success: false, error: 'Estimate not found' };
      }

      if (!estimate.client?.email) {
        return { success: false, error: 'Client email not set on estimate' };
      }

      // Build email content
      const subject = `Estimate ${estimate.estimateNumber} - ${estimate.title}`;
      const body = `${customMessage || 'Please find your estimate attached.'}\n\n` +
        `Estimate #: ${estimate.estimateNumber}\n` +
        `Project: ${estimate.title}\n` +
        `Total: $${estimate.total.toFixed(2)}\n` +
        `Valid Until: ${estimate.validUntil?.toLocaleDateString() || 'N/A'}\n\n` +
        `Items:\n${estimate.items.map(i => `- ${i.description}: $${i.amount}`).join('\n')}`;

      // Send email
      const emailResult = await this.sendEmail(estimate.client.email, subject, body);

      if (emailResult.success) {
        estimate.status = 'sent';
        estimate.sentDate = new Date();
        await estimate.save();
      }

      return {
        success: emailResult.success,
        summary: emailResult.success
          ? `Estimate ${estimate.estimateNumber} sent to ${estimate.client.email}`
          : `Failed to send estimate: ${emailResult.error}`
      };
    } catch (error) {
      console.error('❌ [ESTIMATE] Send error:', error.message);
      return {
        success: false,
        error: `Failed to send estimate: ${error.message}`
      };
    }
  }

  // Invoice capabilities
  async createInvoice(params) {
    try {
      console.log(`🧾 [INVOICE] Creating invoice for: ${params.clientName}`);

      const Invoice = (await import('../models/Invoice.js')).default;

      // Calculate item amounts
      const items = (params.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: (item.quantity || 1) * (item.rate || 0),
        taxable: true
      }));

      // Parse due date
      let dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
      if (params.dueDate) {
        if (params.dueDate.includes('day')) {
          const days = parseInt(params.dueDate) || 30;
          dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        } else {
          dueDate = new Date(params.dueDate);
        }
      }

      const invoice = await Invoice.create({
        user: params.userId || '000000000000000000000000',
        type: 'invoice',
        status: 'draft',
        client: {
          name: params.clientName,
          email: params.clientEmail
        },
        items,
        issueDate: new Date(),
        dueDate,
        notes: params.notes
      });

      console.log(`✅ [INVOICE] Created: ${invoice.invoiceNumber}`);

      return {
        success: true,
        invoice: {
          id: invoice._id,
          number: invoice.invoiceNumber,
          client: invoice.client.name,
          total: invoice.total,
          status: invoice.status,
          dueDate: invoice.dueDate
        },
        summary: `Created invoice ${invoice.invoiceNumber} for ${params.clientName}. Total: $${invoice.total.toFixed(2)}, Due: ${dueDate.toLocaleDateString()}`
      };
    } catch (error) {
      console.error('❌ [INVOICE] Error creating invoice:', error.message);
      return {
        success: false,
        error: `Failed to create invoice: ${error.message}`
      };
    }
  }

  async sendInvoice(invoiceId, customMessage) {
    try {
      console.log(`📧 [INVOICE] Sending invoice: ${invoiceId}`);

      const Invoice = (await import('../models/Invoice.js')).default;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      if (!invoice.client?.email) {
        return { success: false, error: 'Client email not set on invoice' };
      }

      // Build email content
      const subject = `Invoice ${invoice.invoiceNumber}`;
      const body = `${customMessage || 'Please find your invoice below.'}\n\n` +
        `Invoice #: ${invoice.invoiceNumber}\n` +
        `Amount Due: $${invoice.total.toFixed(2)}\n` +
        `Due Date: ${invoice.dueDate?.toLocaleDateString() || 'Upon Receipt'}\n\n` +
        `Items:\n${invoice.items.map(i => `- ${i.description}: $${i.amount}`).join('\n')}`;

      // Send email
      const emailResult = await this.sendEmail(invoice.client.email, subject, body);

      if (emailResult.success) {
        invoice.status = 'sent';
        invoice.sentDate = new Date();
        await invoice.save();
      }

      return {
        success: emailResult.success,
        summary: emailResult.success
          ? `Invoice ${invoice.invoiceNumber} sent to ${invoice.client.email}`
          : `Failed to send invoice: ${emailResult.error}`
      };
    } catch (error) {
      console.error('❌ [INVOICE] Send error:', error.message);
      return {
        success: false,
        error: `Failed to send invoice: ${error.message}`
      };
    }
  }

  async getInvoices(status = 'all', limit = 5) {
    try {
      console.log(`🧾 [INVOICES] Getting invoices (status: ${status}, limit: ${limit})`);

      const Invoice = (await import('../models/Invoice.js')).default;

      const query = { type: 'invoice' };
      if (status !== 'all') {
        query.status = status;
      }

      const invoices = await Invoice.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('invoiceNumber client total status dueDate createdAt amountPaid');

      console.log(`✅ [INVOICES] Found ${invoices.length} invoices`);

      return {
        success: true,
        invoices: invoices.map(i => ({
          id: i._id,
          number: i.invoiceNumber,
          client: i.client?.name,
          total: i.total,
          paid: i.amountPaid,
          balance: i.total - i.amountPaid,
          status: i.status,
          dueDate: i.dueDate,
          date: i.createdAt
        })),
        summary: invoices.length > 0
          ? `Found ${invoices.length} invoices. Most recent: ${invoices[0].invoiceNumber} for ${invoices[0].client?.name} ($${invoices[0].total})`
          : 'No invoices found'
      };
    } catch (error) {
      console.error('❌ [INVOICES] Error:', error.message);
      return {
        success: false,
        error: `Failed to get invoices: ${error.message}`
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

      // N8N Workflow capabilities
      case 'trigger_workflow':
        return await this.triggerWorkflow(args.workflowType, args.data, args.customWebhookPath);

      case 'list_workflows':
        return await this.listWorkflows(args.category);

      case 'deploy_workflow':
        return await this.deployWorkflow(args.templateName, args.customName);

      // Estimate capabilities
      case 'create_estimate':
        return await this.createEstimate(args);

      case 'get_estimates':
        return await this.getEstimates(args.status, args.limit);

      case 'send_estimate':
        return await this.sendEstimate(args.estimateId, args.message);

      // Invoice capabilities
      case 'create_invoice':
        return await this.createInvoice(args);

      case 'send_invoice':
        return await this.sendInvoice(args.invoiceId, args.message);

      case 'get_invoices':
        return await this.getInvoices(args.status, args.limit);

      // ═══════════════════════════════════════════════════════════════
      // Phone Data Access (via AriaIntegrationService)
      // ═══════════════════════════════════════════════════════════════
      case 'get_phone_contacts':
        return await this.getPhoneContacts(args.search, args.limit);

      case 'find_contact':
        return await this.findContact(args.name);

      case 'get_call_history':
        return await this.getCallHistory(args.limit, args.direction, args.contactPhone);

      case 'get_message_history':
        return await this.getMessageHistory(args.contactIdentifier);

      // ═══════════════════════════════════════════════════════════════
      // Team Collaboration (via AriaIntegrationService)
      // ═══════════════════════════════════════════════════════════════
      case 'get_team_members':
        return await this.getTeamMembers();

      case 'message_team_member':
        return await this.messageTeamMember(args.memberEmail, args.message, args.urgent);

      case 'assign_task_to_team':
        return await this.assignTaskToTeam(args.memberEmail, args.taskDescription, args.priority, args.dueDate);

      case 'request_follow_up':
        return await this.requestFollowUp(args.memberEmail, args.contactName, args.notes);

      // ═══════════════════════════════════════════════════════════════
      // Schedule & Calendar (via AriaIntegrationService)
      // ═══════════════════════════════════════════════════════════════
      case 'get_schedule':
        return await this.getSchedule(args.days, args.includeCompleted);

      case 'check_availability':
        return await this.checkAvailability(args.proposedTime, args.durationMinutes);

      case 'send_appointment_reminder':
        return await this.sendAppointmentReminder(args.appointmentId);

      // ═══════════════════════════════════════════════════════════════
      // RAG Knowledge Base (via AriaIntegrationService)
      // ═══════════════════════════════════════════════════════════════
      case 'search_knowledge':
        return await this.searchKnowledge(args.query, args.limit);

      case 'list_knowledge_bases':
        return await this.listKnowledgeBases();

      // ═══════════════════════════════════════════════════════════════
      // Phone Organization & Cleanup (via AriaIntegrationService)
      // ═══════════════════════════════════════════════════════════════
      case 'find_duplicate_contacts':
        return await this.findDuplicateContacts();

      case 'merge_contacts':
        return await this.mergeContacts(args.keepContactId, args.removeContactId);

      case 'get_stale_contacts':
        return await this.getStaleContacts(args.daysSinceContact);

      case 'tag_contact':
        return await this.tagContact(args.contactId, args.tags);

      // ═══════════════════════════════════════════════════════════════
      // Advanced Communication (Group Messaging, Voice, Conference)
      // ═══════════════════════════════════════════════════════════════
      case 'send_group_sms':
        return await this.sendGroupSms(args.recipients, args.message, args.personalizeGreeting);

      case 'send_group_email':
        return await this.sendGroupEmail(args.recipients, args.subject, args.body, args.sendType, args.personalizeGreeting);

      case 'send_voice_message':
        return await this.sendVoiceMessage(args.to, args.message, args.voiceId);

      case 'initiate_conference_call':
        return await this.initiateConferenceCall(args.participants, args.moderatorPhone, args.conferenceOptions);

      case 'transfer_call_to_agent':
        return await this.transferCallToAgent(args.callSid, args.agentType, args.context);

      case 'transfer_call_to_human':
        return await this.transferCallToHuman(args.callSid, args.department, args.agentPhone, args.context);

      case 'send_calendar_invite':
        return await this.sendCalendarInvite(args.recipients, args.eventDetails, args.deliveryMethod);

      // ═══════════════════════════════════════════════════════════════
      // Shopify Integration (E-commerce)
      // ═══════════════════════════════════════════════════════════════
      case 'get_shopify_products':
        return await this.getShopifyProducts(args.limit, args.query);

      case 'get_shopify_orders':
        return await this.getShopifyOrders(args.limit, args.status);

      case 'get_shopify_customers':
        return await this.getShopifyCustomers(args.limit, args.query);

      case 'lookup_order':
        return await this.lookupOrder(args.orderNumber);

      case 'get_order_tracking':
        return await this.getOrderTracking(args.orderId);

      // ═══════════════════════════════════════════════════════════════
      // AI Image Generation & Vision (via Replicate)
      // ═══════════════════════════════════════════════════════════════
      case 'generate_image':
        return await this.generateImage(args.prompt, args.model, args.aspectRatio, args.style, args.numOutputs);

      case 'analyze_image':
        return await this.analyzeImage(args.imageUrl, args.question, args.analysisType);

      case 'save_image_to_project':
        return await this.saveImageToProject(args.imageUrl, args.projectId, args.contactId, args.category, args.description, args.tags);

      case 'get_project_images':
        return await this.getProjectImages(args.projectId, args.contactId, args.category, args.limit);

      case 'scrape_webpage':
        return await this.scrapeWebpage(args.url, args.extractionType, args.customSelector, args.summarize);

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

  // ═══════════════════════════════════════════════════════════════════
  // PHONE DATA ACCESS (via AriaIntegrationService)
  // ═══════════════════════════════════════════════════════════════════

  async getPhoneContacts(search = '', limit = 20, userId = 'default') {
    try {
      console.log(`📱 [PHONE] Getting contacts (search: "${search}", limit: ${limit})`);
      return await ariaIntegrationService.getPhoneContacts(userId, { search, limit });
    } catch (error) {
      console.error('❌ [PHONE] Error getting contacts:', error.message);
      return { success: false, error: error.message };
    }
  }

  async findContact(name, userId = 'default') {
    try {
      console.log(`🔍 [PHONE] Finding contact: ${name}`);
      return await ariaIntegrationService.findContactByName(userId, name);
    } catch (error) {
      console.error('❌ [PHONE] Error finding contact:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getCallHistory(limit = 20, direction = null, contactPhone = null, userId = 'default') {
    try {
      console.log(`📞 [PHONE] Getting call history (limit: ${limit})`);
      return await ariaIntegrationService.getCallHistory(userId, { limit, direction, contactPhone });
    } catch (error) {
      console.error('❌ [PHONE] Error getting call history:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getMessageHistory(contactIdentifier, userId = 'default') {
    try {
      console.log(`💬 [PHONE] Getting message history for: ${contactIdentifier}`);
      return await ariaIntegrationService.getMessageHistory(userId, contactIdentifier);
    } catch (error) {
      console.error('❌ [PHONE] Error getting message history:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEAM COLLABORATION (via AriaIntegrationService)
  // ═══════════════════════════════════════════════════════════════════

  async getTeamMembers(userId = 'default') {
    try {
      console.log(`👥 [TEAM] Getting team members`);
      return await ariaIntegrationService.getTeamMembers(userId);
    } catch (error) {
      console.error('❌ [TEAM] Error getting team members:', error.message);
      return { success: false, error: error.message };
    }
  }

  async messageTeamMember(memberEmail, message, urgent = false, userId = 'default') {
    try {
      console.log(`📨 [TEAM] Messaging ${memberEmail}: "${message.substring(0, 50)}..."`);
      return await ariaIntegrationService.messageTeamMember(userId, memberEmail, message, { urgent });
    } catch (error) {
      console.error('❌ [TEAM] Error messaging team member:', error.message);
      return { success: false, error: error.message };
    }
  }

  async assignTaskToTeam(memberEmail, taskDescription, priority = 'medium', dueDate = null, userId = 'default') {
    try {
      console.log(`📋 [TEAM] Assigning task to ${memberEmail}: "${taskDescription.substring(0, 50)}..."`);
      return await ariaIntegrationService.assignTask(userId, memberEmail, taskDescription, { priority, dueDate });
    } catch (error) {
      console.error('❌ [TEAM] Error assigning task:', error.message);
      return { success: false, error: error.message };
    }
  }

  async requestFollowUp(memberEmail, contactName, notes, userId = 'default') {
    try {
      console.log(`🔔 [TEAM] Requesting follow-up from ${memberEmail} for ${contactName}`);
      return await ariaIntegrationService.requestFollowUp(userId, memberEmail, contactName, notes);
    } catch (error) {
      console.error('❌ [TEAM] Error requesting follow-up:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCHEDULE & CALENDAR (via AriaIntegrationService)
  // ═══════════════════════════════════════════════════════════════════

  async getSchedule(days = 7, includeCompleted = false, userId = 'default') {
    try {
      console.log(`📅 [SCHEDULE] Getting schedule for next ${days} days`);
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      return await ariaIntegrationService.getSchedule(userId, { endDate, includeCompleted });
    } catch (error) {
      console.error('❌ [SCHEDULE] Error getting schedule:', error.message);
      return { success: false, error: error.message };
    }
  }

  async checkAvailability(proposedTime, durationMinutes = 60, userId = 'default') {
    try {
      console.log(`📅 [SCHEDULE] Checking availability: ${proposedTime}`);
      return await ariaIntegrationService.checkAvailability(userId, proposedTime, durationMinutes);
    } catch (error) {
      console.error('❌ [SCHEDULE] Error checking availability:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendAppointmentReminder(appointmentId, userId = 'default') {
    try {
      console.log(`⏰ [SCHEDULE] Sending reminder for appointment: ${appointmentId}`);
      return await ariaIntegrationService.sendAppointmentReminder(userId, appointmentId);
    } catch (error) {
      console.error('❌ [SCHEDULE] Error sending reminder:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // RAG KNOWLEDGE BASE (via AriaIntegrationService)
  // ═══════════════════════════════════════════════════════════════════

  async searchKnowledge(query, limit = 5, userId = 'default') {
    try {
      console.log(`🧠 [RAG] Searching knowledge base: "${query}"`);
      return await ariaIntegrationService.searchKnowledge(userId, query, { limit });
    } catch (error) {
      console.error('❌ [RAG] Error searching knowledge:', error.message);
      return { success: false, error: error.message };
    }
  }

  async listKnowledgeBases(userId = 'default') {
    try {
      console.log(`📚 [RAG] Listing knowledge bases`);
      return await ariaIntegrationService.listKnowledgeBases(userId);
    } catch (error) {
      console.error('❌ [RAG] Error listing knowledge bases:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHONE ORGANIZATION & CLEANUP (via AriaIntegrationService)
  // ═══════════════════════════════════════════════════════════════════

  async findDuplicateContacts(userId = 'default') {
    try {
      console.log(`🔍 [CLEANUP] Finding duplicate contacts`);
      return await ariaIntegrationService.findDuplicateContacts(userId);
    } catch (error) {
      console.error('❌ [CLEANUP] Error finding duplicates:', error.message);
      return { success: false, error: error.message };
    }
  }

  async mergeContacts(keepContactId, removeContactId, userId = 'default') {
    try {
      console.log(`🔗 [CLEANUP] Merging contacts: keep ${keepContactId}, remove ${removeContactId}`);
      return await ariaIntegrationService.mergeDuplicateContacts(userId, keepContactId, removeContactId);
    } catch (error) {
      console.error('❌ [CLEANUP] Error merging contacts:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getStaleContacts(daysSinceContact = 30, userId = 'default') {
    try {
      console.log(`🕸️ [CLEANUP] Finding stale contacts (${daysSinceContact}+ days)`);
      return await ariaIntegrationService.getStaleContacts(userId, daysSinceContact);
    } catch (error) {
      console.error('❌ [CLEANUP] Error getting stale contacts:', error.message);
      return { success: false, error: error.message };
    }
  }

  async tagContact(contactId, tags, userId = 'default') {
    try {
      console.log(`🏷️ [CLEANUP] Tagging contact ${contactId} with: ${tags}`);
      return await ariaIntegrationService.categorizeContact(userId, contactId, tags);
    } catch (error) {
      console.error('❌ [CLEANUP] Error tagging contact:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SHOPIFY INTEGRATION
  // ═══════════════════════════════════════════════════════════════════

  async getShopifyProducts(limit = 10, query = null, userId = 'default') {
    try {
      console.log(`🛍️ [SHOPIFY] Getting products (limit: ${limit}, query: ${query})`);

      if (query) {
        const result = await shopifySyncService.searchProducts(userId, query);
        return {
          success: result.success !== false,
          products: result.products || [],
          count: result.products?.length || 0,
          summary: result.products?.length > 0
            ? `Found ${result.products.length} products matching "${query}"`
            : `No products found matching "${query}"`
        };
      } else {
        const result = await shopifySyncService.getProducts(userId, { limit });
        return {
          success: result.success !== false,
          products: result.products || [],
          count: result.products?.length || 0,
          summary: result.products?.length > 0
            ? `Found ${result.products.length} products in store`
            : 'No products found in store'
        };
      }
    } catch (error) {
      console.error('❌ [SHOPIFY] Error getting products:', error.message);
      return { success: false, error: error.message, summary: 'Shopify may not be connected' };
    }
  }

  async getShopifyOrders(limit = 10, status = null, userId = 'default') {
    try {
      console.log(`🛍️ [SHOPIFY] Getting orders (limit: ${limit}, status: ${status})`);

      const options = { limit };
      if (status) options.status = status;

      const result = await shopifySyncService.getOrders(userId, options);
      return {
        success: result.success !== false,
        orders: result.orders || [],
        count: result.orders?.length || 0,
        summary: result.orders?.length > 0
          ? `Found ${result.orders.length} orders${status ? ` with status "${status}"` : ''}`
          : 'No orders found'
      };
    } catch (error) {
      console.error('❌ [SHOPIFY] Error getting orders:', error.message);
      return { success: false, error: error.message, summary: 'Shopify may not be connected' };
    }
  }

  async getShopifyCustomers(limit = 10, query = null, userId = 'default') {
    try {
      console.log(`🛍️ [SHOPIFY] Getting customers (limit: ${limit}, query: ${query})`);

      if (query) {
        const result = await shopifySyncService.searchCustomer(userId, query);
        return {
          success: result.success !== false,
          customers: result.customers || (result.customer ? [result.customer] : []),
          count: result.customers?.length || (result.customer ? 1 : 0),
          summary: result.customer
            ? `Found customer: ${result.customer.first_name} ${result.customer.last_name}`
            : 'No customer found'
        };
      } else {
        const result = await shopifySyncService.getCustomers(userId, { limit });
        return {
          success: result.success !== false,
          customers: result.customers || [],
          count: result.customers?.length || 0,
          summary: result.customers?.length > 0
            ? `Found ${result.customers.length} customers`
            : 'No customers found'
        };
      }
    } catch (error) {
      console.error('❌ [SHOPIFY] Error getting customers:', error.message);
      return { success: false, error: error.message, summary: 'Shopify may not be connected' };
    }
  }

  async lookupOrder(orderNumber, userId = 'default') {
    try {
      console.log(`🛍️ [SHOPIFY] Looking up order: ${orderNumber}`);

      const result = await shopifySyncService.getOrderByNumber(userId, orderNumber);
      if (result.success && result.order) {
        return {
          success: true,
          order: result.order,
          summary: `Order #${orderNumber}: ${result.order.financial_status}, ${result.order.fulfillment_status || 'unfulfilled'}, Total: $${result.order.total_price}`
        };
      }
      return { success: false, summary: `Order #${orderNumber} not found` };
    } catch (error) {
      console.error('❌ [SHOPIFY] Error looking up order:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getOrderTracking(orderId, userId = 'default') {
    try {
      console.log(`🛍️ [SHOPIFY] Getting tracking for order: ${orderId}`);

      const result = await shopifySyncService.getOrderTracking(userId, orderId);
      if (result.success && result.fulfillments?.length > 0) {
        const tracking = result.fulfillments[0];
        return {
          success: true,
          tracking: result.fulfillments,
          summary: `Tracking: ${tracking.tracking_company || 'N/A'} - ${tracking.tracking_number || 'No tracking number'}`
        };
      }
      return { success: true, tracking: [], summary: 'No tracking information available yet' };
    } catch (error) {
      console.error('❌ [SHOPIFY] Error getting tracking:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // AI IMAGE GENERATION & VISION (via Replicate)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Generate AI images from text prompts using Replicate
   */
  async generateImage(prompt, model = 'flux_schnell', aspectRatio = '1:1', style = 'photorealistic', numOutputs = 1) {
    try {
      console.log(`🎨 [IMAGE GEN] Generating image: "${prompt}" with ${model}`);

      // Enhance prompt with style if provided
      let enhancedPrompt = prompt;
      if (style && style !== 'photorealistic') {
        const styleEnhancements = {
          artistic: 'artistic style, painterly,',
          cartoon: 'cartoon style, animated,',
          sketch: 'pencil sketch style, hand-drawn,',
          '3d_render': '3D render, CGI, detailed,',
          watercolor: 'watercolor painting style,',
          oil_painting: 'oil painting style, classic art,'
        };
        if (styleEnhancements[style]) {
          enhancedPrompt = `${styleEnhancements[style]} ${prompt}`;
        }
      }

      const result = await this.replicateService.generateImage('default', {
        prompt: enhancedPrompt,
        model,
        aspectRatio,
        numOutputs: Math.min(numOutputs, 4),
        style
      });

      if (result.success) {
        console.log(`✅ [IMAGE GEN] Generated ${result.images.length} image(s)`);
        return {
          success: true,
          images: result.images,
          model: result.model,
          creditsUsed: result.creditsUsed,
          summary: `Generated ${result.images.length} image(s) with ${model}. View: ${result.images[0]}`
        };
      }

      return { success: false, error: 'Image generation failed', summary: 'Failed to generate image' };
    } catch (error) {
      console.error('❌ [IMAGE GEN] Error:', error.message);
      return {
        success: false,
        error: error.message,
        summary: `Failed to generate image: ${error.message}`
      };
    }
  }

  /**
   * Analyze an image using AI vision (GPT-4 Vision)
   */
  async analyzeImage(imageUrl, question = null, analysisType = 'general') {
    try {
      console.log(`👁️ [IMAGE ANALYSIS] Analyzing image: ${imageUrl}`);

      // Build the analysis prompt based on type
      let systemPrompt = 'You are an AI assistant that analyzes images.';
      let userPrompt = question || 'Describe what you see in this image.';

      switch (analysisType) {
        case 'ocr':
          systemPrompt = 'You are an OCR specialist. Extract and return all text visible in the image.';
          userPrompt = question || 'Extract all text from this image. Return the text exactly as it appears.';
          break;
        case 'objects':
          systemPrompt = 'You are an object detection specialist.';
          userPrompt = question || 'List all objects and items you can identify in this image.';
          break;
        case 'scene':
          systemPrompt = 'You are a scene analysis specialist.';
          userPrompt = question || 'Describe the scene, setting, and environment in this image.';
          break;
        case 'document':
          systemPrompt = 'You are a document analysis specialist.';
          userPrompt = question || 'Analyze this document. Extract key information, summarize content, and identify the document type.';
          break;
        case 'product':
          systemPrompt = 'You are a product identification specialist.';
          userPrompt = question || 'Identify any products in this image. Include brand, model, specifications if visible.';
          break;
        case 'construction':
          systemPrompt = 'You are a construction and renovation specialist.';
          userPrompt = question || 'Analyze this construction/renovation image. Describe the work being done, progress status, and any notable observations.';
          break;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000
      });

      const analysis = response.choices[0]?.message?.content || 'Unable to analyze image';

      console.log(`✅ [IMAGE ANALYSIS] Analysis complete`);
      return {
        success: true,
        analysis,
        analysisType,
        imageUrl,
        summary: analysis.substring(0, 200) + (analysis.length > 200 ? '...' : '')
      };
    } catch (error) {
      console.error('❌ [IMAGE ANALYSIS] Error:', error.message);
      return {
        success: false,
        error: error.message,
        summary: `Failed to analyze image: ${error.message}`
      };
    }
  }

  /**
   * Save an image to a project or contact in the CRM
   */
  async saveImageToProject(imageUrl, projectId = null, contactId = null, category = 'other', description = '', tags = []) {
    try {
      console.log(`📁 [IMAGE SAVE] Saving image to project/contact`);

      // Import MediaAsset model
      const MediaAsset = (await import('../models/MediaAsset.js')).default;

      const mediaAsset = new MediaAsset({
        userId: 'default',
        type: 'image',
        url: imageUrl,
        category,
        description,
        tags: tags || [],
        projectId: projectId || undefined,
        contactId: contactId || undefined,
        source: 'aria_capability',
        metadata: {
          savedAt: new Date(),
          savedBy: 'Aria'
        }
      });

      await mediaAsset.save();

      console.log(`✅ [IMAGE SAVE] Saved image as asset ${mediaAsset._id}`);
      return {
        success: true,
        assetId: mediaAsset._id,
        category,
        summary: `Image saved to ${projectId ? 'project' : contactId ? 'contact' : 'library'} with category: ${category}`
      };
    } catch (error) {
      console.error('❌ [IMAGE SAVE] Error:', error.message);
      return {
        success: false,
        error: error.message,
        summary: `Failed to save image: ${error.message}`
      };
    }
  }

  /**
   * Get images associated with a project or contact
   */
  async getProjectImages(projectId = null, contactId = null, category = 'all', limit = 20) {
    try {
      console.log(`📸 [IMAGE GET] Getting images for project/contact`);

      const MediaAsset = (await import('../models/MediaAsset.js')).default;

      const query = { type: 'image' };
      if (projectId) query.projectId = projectId;
      if (contactId) query.contactId = contactId;
      if (category && category !== 'all') query.category = category;

      const images = await MediaAsset.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      console.log(`✅ [IMAGE GET] Found ${images.length} images`);
      return {
        success: true,
        images,
        count: images.length,
        summary: `Found ${images.length} image(s)${category !== 'all' ? ` in category: ${category}` : ''}`
      };
    } catch (error) {
      console.error('❌ [IMAGE GET] Error:', error.message);
      return {
        success: false,
        error: error.message,
        summary: `Failed to get images: ${error.message}`
      };
    }
  }

  /**
   * Enhanced web scraping with intelligent data extraction
   */
  async scrapeWebpage(url, extractionType = 'full_text', customSelector = null, summarize = true) {
    try {
      console.log(`🕷️ [SCRAPE] Scraping ${url} for ${extractionType}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AriaBot/1.0; +https://remodely.ai)'
        },
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024 // 5MB max
      });

      const $ = cheerio.load(response.data);

      // Remove unwanted elements
      $('script, style, noscript, iframe, nav, footer, header, .ad, .ads, .advertisement').remove();

      let extractedData = {};

      switch (extractionType) {
        case 'contact_info':
          extractedData = {
            emails: [],
            phones: [],
            addresses: []
          };
          // Extract emails
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const bodyText = $('body').text();
          const emails = bodyText.match(emailRegex);
          if (emails) extractedData.emails = [...new Set(emails)];
          // Extract phones
          const phoneRegex = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
          const phones = bodyText.match(phoneRegex);
          if (phones) extractedData.phones = [...new Set(phones)].slice(0, 5);
          break;

        case 'prices':
          extractedData = { prices: [] };
          const priceRegex = /\$[\d,]+\.?\d*/g;
          const priceText = $('body').text();
          const prices = priceText.match(priceRegex);
          if (prices) extractedData.prices = [...new Set(prices)].slice(0, 20);
          break;

        case 'products':
          extractedData = { products: [] };
          $('[class*="product"], [class*="item"], [data-product], article').each((i, el) => {
            if (i >= 10) return;
            const title = $(el).find('h1, h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
            const price = $(el).find('[class*="price"]').first().text().trim();
            if (title) {
              extractedData.products.push({ title, price: price || 'N/A' });
            }
          });
          break;

        case 'links':
          extractedData = { links: [] };
          $('a[href]').each((i, el) => {
            if (i >= 30) return;
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
              extractedData.links.push({ text: text.substring(0, 100), href });
            }
          });
          break;

        case 'tables':
          extractedData = { tables: [] };
          $('table').each((i, table) => {
            if (i >= 5) return;
            const rows = [];
            $(table).find('tr').each((j, row) => {
              if (j >= 20) return;
              const cells = [];
              $(row).find('td, th').each((k, cell) => {
                cells.push($(cell).text().trim());
              });
              if (cells.length) rows.push(cells);
            });
            if (rows.length) extractedData.tables.push(rows);
          });
          break;

        case 'article':
          const articleEl = $('article, [class*="article"], [class*="content"], main').first();
          extractedData = {
            title: $('h1').first().text().trim() || $('title').text().trim(),
            content: (articleEl.length ? articleEl.text() : $('body').text())
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 5000)
          };
          break;

        case 'custom':
          if (customSelector) {
            extractedData = { results: [] };
            $(customSelector).each((i, el) => {
              if (i >= 20) return;
              extractedData.results.push($(el).text().trim());
            });
          }
          break;

        case 'full_text':
        default:
          extractedData = {
            title: $('title').text().trim(),
            content: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000)
          };
      }

      // Optional AI summary
      let aiSummary = null;
      if (summarize && extractedData.content) {
        try {
          const summaryResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Summarize the following web content in 2-3 sentences.' },
              { role: 'user', content: extractedData.content.substring(0, 3000) }
            ],
            max_tokens: 200
          });
          aiSummary = summaryResponse.choices[0]?.message?.content;
        } catch (e) {
          console.log('Summary generation skipped:', e.message);
        }
      }

      console.log(`✅ [SCRAPE] Extraction complete`);
      return {
        success: true,
        url,
        extractionType,
        data: extractedData,
        aiSummary,
        summary: aiSummary || `Extracted ${extractionType} data from ${url}`
      };
    } catch (error) {
      console.error('❌ [SCRAPE] Error:', error.message);
      return {
        success: false,
        error: error.message,
        summary: `Failed to scrape webpage: ${error.message}`
      };
    }
  }
}

export default AriaCapabilities;
