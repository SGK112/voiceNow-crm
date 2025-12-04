import N8nWorkflow from '../models/N8nWorkflow.js';
import N8nService from './n8nService.js';

/**
 * Workflow Provisioning Service
 * Auto-creates personalized n8n workflows for Pro+ users
 */
class WorkflowProvisioningService {
  constructor() {
    this.n8nService = new N8nService();
  }

  /**
   * Create personalized workflows for a new Pro/Enterprise user
   * @param {String} userId - User ID
   * @param {Object} user - User object with email, name, etc.
   * @param {String} tier - User's subscription tier (starter, pro, enterprise)
   */
  async provisionUserWorkflows(userId, user, tier = 'starter') {
    console.log(`🔧 Provisioning workflows for user ${userId} (${tier})`);

    const workflowsCreated = [];

    try {
      // Determine which workflows to create based on tier
      const workflowTemplates = this.getWorkflowsForTier(tier);

      for (const templateType of workflowTemplates) {
        const workflow = await this.createPersonalWorkflow(userId, user, templateType);
        if (workflow) {
          workflowsCreated.push(workflow);
        }
      }

      console.log(`✅ Created ${workflowsCreated.length} workflows for user ${userId}`);
      return workflowsCreated;
    } catch (error) {
      console.error(`❌ Error provisioning workflows for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow templates based on subscription tier
   */
  getWorkflowsForTier(tier) {
    const tiers = {
      starter: ['save_lead'], // Starter: Just basic lead capture
      pro: ['save_lead', 'send_sms', 'send_email', 'slack_notification'], // Pro: Full automation
      enterprise: ['save_lead', 'send_sms', 'send_email', 'slack_notification', 'book_appointment'] // Enterprise: Everything
    };

    return tiers[tier] || tiers.starter;
  }

  /**
   * Create a single personalized workflow in n8n
   */
  async createPersonalWorkflow(userId, user, templateType) {
    try {
      console.log(`Creating ${templateType} workflow for user ${userId}`);

      // Get template definition
      const template = this.getWorkflowTemplate(templateType, userId, user);

      // Create workflow in n8n via API
      const n8nWorkflow = await this.n8nService.createWorkflow({
        name: template.name,
        nodes: template.nodes,
        connections: template.connections,
        settings: { executionOrder: 'v1' }
      });

      console.log(`✅ Created n8n workflow:`, n8nWorkflow.id);

      // Save to database
      const dbWorkflow = await N8nWorkflow.create({
        userId,
        name: template.name,
        type: templateType,
        description: template.description,
        workflowJson: template,
        n8nWorkflowId: n8nWorkflow.id,
        enabled: true, // Auto-enable for new users
        triggerConditions: template.triggerConditions || {}
      });

      return dbWorkflow;
    } catch (error) {
      console.error(`Error creating ${templateType} workflow:`, error);
      return null;
    }
  }

  /**
   * Generate workflow template with user-specific configuration
   */
  getWorkflowTemplate(type, userId, user) {
    const templates = {
      save_lead: {
        name: `${user.name || user.email} - Save Lead`,
        description: 'Automatically save call leads to CRM',
        nodes: [
          {
            parameters: {
              httpMethod: 'POST',
              path: `${userId}/save-lead`,
              responseMode: 'onReceived'
            },
            id: `${userId}-webhook-save`,
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300]
          },
          {
            parameters: {
              jsCode: `const callData = $input.item.json.callData || {};
return [{
  json: {
    name: callData.caller_name || 'Unknown',
    email: callData.email || '',
    phone: callData.caller_phone || '',
    source: callData.agent_type || 'phone',
    qualified: callData.qualified || false,
    notes: 'Call from ' + callData.agent_type,
    userId: '${userId}'
  }
}];`
            },
            id: `${userId}-code-extract`,
            name: 'Extract Lead Data',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [450, 300]
          },
          {
            parameters: {
              method: 'POST',
              url: `${process.env.API_URL}/api/leads`,
              sendBody: true,
              contentType: 'json',
              jsonBody: '={{ JSON.stringify($json) }}'
            },
            id: `${userId}-http-save`,
            name: 'Save to CRM',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4,
            position: [650, 300]
          }
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Extract Lead Data', type: 'main', index: 0 }]] },
          'Extract Lead Data': { main: [[{ node: 'Save to CRM', type: 'main', index: 0 }]] }
        },
        triggerConditions: {}
      },

      send_sms: {
        name: `${user.name || user.email} - Send SMS`,
        description: 'Send SMS notifications via Twilio',
        nodes: [
          {
            parameters: {
              httpMethod: 'POST',
              path: `${userId}/send-sms`,
              responseMode: 'onReceived'
            },
            id: `${userId}-webhook-sms`,
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300]
          },
          {
            parameters: {
              method: 'POST',
              url: 'https://api.twilio.com/2010-04-01/Accounts/{{$credentials.twilioAccountSid}}/Messages.json',
              authentication: 'genericCredentialType',
              genericAuthType: 'httpBasicAuth',
              sendBody: true,
              contentType: 'form-urlencoded',
              bodyParameters: {
                parameters: [
                  { name: 'From', value: '+16028337194' },
                  { name: 'To', value: '={{ $json.callData.caller_phone }}' },
                  { name: 'Body', value: `Thank you for calling ${user.name || 'us'}! We'll follow up within 24 hours. - VoiceNow CRM` }
                ]
              }
            },
            id: `${userId}-twilio-sms`,
            name: 'Send SMS',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4,
            position: [450, 300],
            credentials: { httpBasicAuth: { id: 'twilio', name: 'Twilio' } }
          }
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Send SMS', type: 'main', index: 0 }]] }
        }
      },

      send_email: {
        name: `${user.name || user.email} - Send Email`,
        description: 'Send follow-up emails',
        nodes: [
          {
            parameters: {
              httpMethod: 'POST',
              path: `${userId}/send-email`,
              responseMode: 'onReceived'
            },
            id: `${userId}-webhook-email`,
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300]
          },
          {
            parameters: {
              fromEmail: user.email || 'help.voicenowcrm@gmail.com',
              toEmail: '={{ $json.callData.email }}',
              subject: `Thank you for contacting ${user.name || 'us'}`,
              emailType: 'text',
              message: `=Hi {{ $json.callData.caller_name }},\n\nThank you for reaching out! We'll be in touch soon.\n\nBest regards,\n${user.name || 'The Team'}`
            },
            id: `${userId}-email-send`,
            name: 'Send Email',
            type: 'n8n-nodes-base.emailSend',
            typeVersion: 2,
            position: [450, 300],
            credentials: { smtp: { id: 'gmail', name: 'Gmail SMTP' } }
          }
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] }
        }
      },

      slack_notification: {
        name: `${user.name || user.email} - Slack Notifications`,
        description: 'Post new leads to Slack',
        nodes: [
          {
            parameters: {
              httpMethod: 'POST',
              path: `${userId}/slack-notify`,
              responseMode: 'onReceived'
            },
            id: `${userId}-webhook-slack`,
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300]
          },
          {
            parameters: {
              method: 'POST',
              url: user.slackWebhook || process.env.SLACK_WEBHOOK,
              sendBody: true,
              contentType: 'json',
              jsonBody: `={ "text": "🎯 New Lead for ${user.name || 'User'}: " + $json.callData.caller_name + " - " + $json.callData.caller_phone }`
            },
            id: `${userId}-slack-post`,
            name: 'Post to Slack',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4,
            position: [450, 300]
          }
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Post to Slack', type: 'main', index: 0 }]] }
        }
      },

      book_appointment: {
        name: `${user.name || user.email} - Book Appointments`,
        description: 'Process appointment bookings',
        nodes: [
          {
            parameters: {
              httpMethod: 'POST',
              path: `${userId}/book-appointment`,
              responseMode: 'onReceived'
            },
            id: `${userId}-webhook-appt`,
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 2,
            position: [250, 300]
          },
          {
            parameters: {
              jsCode: `return [{ json: { message: 'Appointment received for ' + $input.item.json.callData.caller_name, phone: $input.item.json.callData.caller_phone, userId: '${userId}' } }];`
            },
            id: `${userId}-process-appt`,
            name: 'Process Appointment',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [450, 300]
          }
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Process Appointment', type: 'main', index: 0 }]] }
        }
      }
    };

    return templates[type];
  }

  /**
   * Upgrade user workflows when they change tier
   */
  async upgradeUserWorkflows(userId, user, newTier) {
    console.log(`⬆️ Upgrading user ${userId} to ${newTier}`);

    const existingWorkflows = await N8nWorkflow.find({ userId });
    const existingTypes = existingWorkflows.map(w => w.type);
    const requiredTypes = this.getWorkflowsForTier(newTier);

    // Create missing workflows
    const newWorkflows = [];
    for (const type of requiredTypes) {
      if (!existingTypes.includes(type)) {
        const workflow = await this.createPersonalWorkflow(userId, user, type);
        if (workflow) {
          newWorkflows.push(workflow);
        }
      }
    }

    console.log(`✅ Added ${newWorkflows.length} new workflows for tier upgrade`);
    return newWorkflows;
  }

  /**
   * Deprovision workflows when user downgrades or cancels
   */
  async deprovisionUserWorkflows(userId) {
    console.log(`🗑️ Deprovisioning workflows for user ${userId}`);

    const workflows = await N8nWorkflow.find({ userId });

    for (const workflow of workflows) {
      if (workflow.n8nWorkflowId) {
        try {
          await this.n8nService.deleteWorkflow(workflow.n8nWorkflowId);
        } catch (error) {
          console.warn(`Could not delete n8n workflow ${workflow.n8nWorkflowId}:`, error.message);
        }
      }
      await workflow.deleteOne();
    }

    console.log(`✅ Deleted ${workflows.length} workflows`);
  }
}

export default WorkflowProvisioningService;
