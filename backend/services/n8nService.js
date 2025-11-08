import axios from 'axios';

class N8nService {
  constructor(webhookUrl = process.env.N8N_WEBHOOK_URL, apiKey = process.env.N8N_API_KEY) {
    this.webhookUrl = webhookUrl || 'http://localhost:5678/webhook';
    this.apiKey = apiKey;

    // N8N Cloud API URL is different from webhook URL
    // Extract base domain and construct API URL
    let apiBaseUrl = 'http://localhost:5678';
    if (this.webhookUrl.includes('n8n.cloud')) {
      // Convert webhook URL to API URL
      // https://remodely.app.n8n.cloud/webhook -> https://remodely.app.n8n.cloud/api/v1
      apiBaseUrl = this.webhookUrl.replace('/webhook', '/api/v1');
    } else {
      apiBaseUrl = this.webhookUrl.replace('/webhook', '');
    }

    this.client = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async triggerWorkflow(workflowId, data) {
    try {
      const response = await axios.post(
        `${this.webhookUrl}/${workflowId}`,
        data,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return response.data;
    } catch (error) {
      console.error('N8N Trigger Error:', error.response?.data || error.message);
      throw new Error('Failed to trigger n8n workflow');
    }
  }

  async createWorkflow(workflow) {
    try {
      console.log('Creating workflow in n8n cloud:', {
        baseURL: this.client.defaults.baseURL,
        webhookUrl: this.webhookUrl,
        apiKey: this.apiKey ? 'SET' : 'NOT SET',
        workflowName: workflow.name
      });
      const response = await this.client.post('/workflows', workflow);
      return response.data;
    } catch (error) {
      console.error('N8N API Error Details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw error;
    }
  }

  async updateWorkflow(workflowId, workflow) {
    try {
      const response = await this.client.patch(`/workflows/${workflowId}`, workflow);
      return response.data;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return null;
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      await this.client.delete(`/workflows/${workflowId}`);
      return true;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return false;
    }
  }

  async activateWorkflow(workflowId) {
    try {
      const response = await this.client.patch(`/workflows/${workflowId}/activate`);
      return response.data;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return null;
    }
  }

  async deactivateWorkflow(workflowId) {
    try {
      const response = await this.client.patch(`/workflows/${workflowId}/deactivate`);
      return response.data;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return null;
    }
  }

  getPrebuiltWorkflowTemplates() {
    return {
      save_lead: {
        name: 'Save Call to CRM',
        type: 'save_lead',
        workflowJson: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300],
              webhookId: '{{WEBHOOK_ID}}'
            },
            {
              name: 'Extract Lead Data',
              type: 'n8n-nodes-base.function',
              position: [450, 300],
              parameters: {
                functionCode: `
                  const callData = items[0].json;
                  return [{
                    json: {
                      name: callData.caller_name,
                      email: callData.email,
                      phone: callData.caller_phone,
                      source: callData.agent_type,
                      qualified: callData.qualified
                    }
                  }];
                `
              }
            },
            {
              name: 'Save to MongoDB',
              type: 'n8n-nodes-base.mongoDb',
              position: [650, 300],
              parameters: {
                operation: 'insert',
                collection: 'leads'
              }
            }
          ],
          connections: {
            Webhook: { main: [[{ node: 'Extract Lead Data', type: 'main', index: 0 }]] },
            'Extract Lead Data': { main: [[{ node: 'Save to MongoDB', type: 'main', index: 0 }]] }
          }
        }
      },
      send_sms: {
        name: 'Send SMS After Call',
        type: 'send_sms',
        workflowJson: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Send SMS',
              type: 'n8n-nodes-base.twilio',
              position: [450, 300],
              parameters: {
                operation: 'send',
                message: 'Thank you for your call! We will follow up soon.',
                toNumber: '={{$json["caller_phone"]}}'
              }
            }
          ]
        }
      },
      book_appointment: {
        name: 'Create Google Calendar Event',
        type: 'book_appointment',
        workflowJson: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Create Calendar Event',
              type: 'n8n-nodes-base.googleCalendar',
              position: [450, 300],
              parameters: {
                operation: 'create',
                calendar: 'primary',
                summary: 'Appointment - {{$json["caller_name"]}}',
                start: '={{$json["appointment_date"]}}',
                end: '={{$json["appointment_end"]}}'
              }
            },
            {
              name: 'Send Confirmation SMS',
              type: 'n8n-nodes-base.twilio',
              position: [650, 300],
              parameters: {
                operation: 'send',
                message: 'Your appointment is confirmed for {{$json["appointment_date"]}}',
                toNumber: '={{$json["caller_phone"]}}'
              }
            }
          ]
        }
      },
      slack_notification: {
        name: 'Slack Notification on Lead',
        type: 'slack_notification',
        workflowJson: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Send to Slack',
              type: 'n8n-nodes-base.slack',
              position: [450, 300],
              parameters: {
                operation: 'post',
                channel: '#leads',
                text: 'New lead: {{$json["caller_name"]}} - {{$json["caller_phone"]}}'
              }
            }
          ]
        }
      },
      send_email: {
        name: 'Send Follow-up Email',
        type: 'send_email',
        workflowJson: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Send Email',
              type: 'n8n-nodes-base.sendGrid',
              position: [450, 300],
              parameters: {
                operation: 'send',
                to: '={{$json["email"]}}',
                subject: 'Thank you for your interest',
                text: 'We appreciate your call and will be in touch soon.'
              }
            }
          ]
        }
      }
    };
  }
}

export default N8nService;
