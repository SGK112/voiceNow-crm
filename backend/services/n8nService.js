import axios from 'axios';

class N8nService {
  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
    this.apiUrl = process.env.N8N_API_URL || 'http://localhost:5678';
    this.apiKey = process.env.N8N_API_KEY;
    this.basicAuthUser = process.env.N8N_BASIC_AUTH_USER;
    this.basicAuthPassword = process.env.N8N_BASIC_AUTH_PASSWORD;

    // Determine auth method
    const headers = {
      'Content-Type': 'application/json'
    };

    let auth = null;

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    } else if (this.basicAuthUser && this.basicAuthPassword) {
      // Use basic auth for self-hosted n8n
      auth = {
        username: this.basicAuthUser,
        password: this.basicAuthPassword
      };
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers,
      auth
    });

    console.log('✅ N8N Service initialized:', {
      apiUrl: this.apiUrl,
      authMethod: this.apiKey ? 'API Key' : (auth ? 'Basic Auth' : 'None')
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
      const response = await this.client.post('/api/v1/workflows', workflow);
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
      const response = await this.client.patch(`/api/v1/workflows/${workflowId}`, workflow);
      return response.data;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return null;
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      await this.client.delete(`/api/v1/workflows/${workflowId}`);
      return true;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return false;
    }
  }

  async activateWorkflow(workflowId) {
    try {
      const response = await this.client.patch(`/api/v1/workflows/${workflowId}/activate`);
      return response.data;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return null;
    }
  }

  async deactivateWorkflow(workflowId) {
    try {
      const response = await this.client.patch(`/api/v1/workflows/${workflowId}/deactivate`);
      return response.data;
    } catch (error) {
      console.error('N8N API Error:', error.response?.data || error.message);
      return null;
    }
  }

  getPrebuiltWorkflowTemplates() {
    return {
      // === CONSTRUCTION WORKFLOW TEMPLATES ===
      plumbing_emergency_dispatch: {
        name: 'Emergency Plumbing Dispatch',
        type: 'plumbing_emergency_dispatch',
        category: 'construction',
        description: 'Immediate dispatch for plumbing emergencies with SMS and team notifications',
        workflowJson: {
          nodes: [
            {
              name: 'Emergency Call Trigger',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Check Emergency Level',
              type: 'n8n-nodes-base.if',
              position: [450, 300],
              parameters: {
                conditions: {
                  string: [{
                    value1: '={{$json["urgency"]}}',
                    operation: 'equals',
                    value2: 'emergency'
                  }]
                }
              }
            },
            {
              name: 'Send SMS to Customer',
              type: 'n8n-nodes-base.twilio',
              position: [650, 200],
              parameters: {
                operation: 'send',
                message: 'Emergency plumber dispatched to {{$json["address"]}}. ETA: 30-60 minutes. Shut off water if possible.',
                toNumber: '={{$json["lead_phone"]}}'
              }
            },
            {
              name: 'Notify Team Slack',
              type: 'n8n-nodes-base.slack',
              position: [650, 400],
              parameters: {
                operation: 'post',
                channel: '#dispatch',
                text: '🚨 EMERGENCY: {{$json["lead_name"]}} - {{$json["address"]}} - {{$json["issue_description"]}}'
              }
            },
            {
              name: 'Create Priority Task',
              type: 'n8n-nodes-base.httpRequest',
              position: [850, 300],
              parameters: {
                method: 'POST',
                url: `${process.env.API_URL}/api/tasks`,
                body: {
                  title: 'EMERGENCY: Plumbing at {{$json["address"]}}',
                  priority: 'high',
                  dueDate: 'now'
                }
              }
            }
          ]
        }
      },
      project_estimate_workflow: {
        name: 'Construction Estimate Workflow',
        type: 'project_estimate_workflow',
        category: 'construction',
        description: 'Automated workflow for handling project estimates and follow-ups',
        workflowJson: {
          nodes: [
            {
              name: 'Estimate Request Received',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Create Lead in CRM',
              type: 'n8n-nodes-base.httpRequest',
              position: [450, 300],
              parameters: {
                method: 'POST',
                url: `${process.env.API_URL}/api/leads`,
                body: {
                  name: '={{$json["lead_name"]}}',
                  email: '={{$json["lead_email"]}}',
                  phone: '={{$json["lead_phone"]}}',
                  source: 'estimate_request',
                  customFields: {
                    project_type: '={{$json["project_type"]}}',
                    budget_range: '={{$json["budget_range"]}}',
                    timeline: '={{$json["timeline"]}}'
                  }
                }
              }
            },
            {
              name: 'Send Confirmation Email',
              type: 'n8n-nodes-base.sendGrid',
              position: [650, 200],
              parameters: {
                operation: 'send',
                to: '={{$json["lead_email"]}}',
                subject: 'Your {{$json["project_type"]}} Estimate Request - {{$json["company_name"]}}',
                text: 'Hi {{$json["lead_name"]}}, we received your request for a {{$json["project_type"]}} estimate. Our team will contact you within 24 hours to schedule an on-site evaluation.'
              }
            },
            {
              name: 'Schedule Follow-up Task',
              type: 'n8n-nodes-base.httpRequest',
              position: [650, 400],
              parameters: {
                method: 'POST',
                url: `${process.env.API_URL}/api/tasks`,
                body: {
                  title: 'Estimate: {{$json["lead_name"]}} - {{$json["project_type"]}}',
                  description: 'Contact to schedule on-site estimate for {{$json["project_type"]}} at {{$json["address"]}}',
                  priority: 'high',
                  dueDate: 'tomorrow'
                }
              }
            }
          ]
        }
      },
      supplier_order_confirmation: {
        name: 'Supplier Order Confirmation',
        type: 'supplier_order_confirmation',
        category: 'construction',
        description: 'Automate supplier order confirmations and delivery tracking',
        workflowJson: {
          nodes: [
            {
              name: 'Order Placed',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Save Order to Database',
              type: 'n8n-nodes-base.mongoDb',
              position: [450, 300],
              parameters: {
                operation: 'insert',
                collection: 'orders',
                fields: 'po_number,supplier_name,order_items,delivery_address,order_date'
              }
            },
            {
              name: 'Send Email Confirmation',
              type: 'n8n-nodes-base.sendGrid',
              position: [650, 200],
              parameters: {
                operation: 'send',
                to: '={{$json["company_email"]}}',
                subject: 'Order Confirmed: PO# {{$json["po_number"]}}',
                text: 'Your order has been placed with {{$json["supplier_name"]}}. PO#: {{$json["po_number"]}}. Delivery to {{$json["delivery_address"]}} on {{$json["requested_delivery_date"]}}.'
              }
            },
            {
              name: 'Notify Project Manager',
              type: 'n8n-nodes-base.slack',
              position: [650, 400],
              parameters: {
                operation: 'post',
                channel: '#orders',
                text: '📦 Order Placed: {{$json["order_items"]}} - Delivery: {{$json["requested_delivery_date"]}}'
              }
            }
          ]
        }
      },
      job_completion_workflow: {
        name: 'Job Completion & Payment',
        type: 'job_completion_workflow',
        category: 'construction',
        description: 'Handle job completion, customer feedback, and payment collection',
        workflowJson: {
          nodes: [
            {
              name: 'Job Marked Complete',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Update Project Status',
              type: 'n8n-nodes-base.httpRequest',
              position: [450, 300],
              parameters: {
                method: 'PATCH',
                url: `${process.env.API_URL}/api/projects/{{$json["project_id"]}}`,
                body: {
                  status: 'completed',
                  completedDate: new Date()
                }
              }
            },
            {
              name: 'Send Thank You SMS',
              type: 'n8n-nodes-base.twilio',
              position: [650, 200],
              parameters: {
                operation: 'send',
                message: 'Thank you {{$json["lead_name"]}}! Your {{$json["project_type"]}} is complete. Invoice sent to {{$json["lead_email"]}}. Payment link: {{$json["payment_link"]}}',
                toNumber: '={{$json["lead_phone"]}}'
              }
            },
            {
              name: 'Wait 24 Hours',
              type: 'n8n-nodes-base.wait',
              position: [850, 200],
              parameters: {
                amount: 24,
                unit: 'hours'
              }
            },
            {
              name: 'Send Feedback Survey',
              type: 'n8n-nodes-base.sendGrid',
              position: [1050, 200],
              parameters: {
                operation: 'send',
                to: '={{$json["lead_email"]}}',
                subject: 'How did we do? - {{$json["company_name"]}}',
                text: 'Hi {{$json["lead_name"]}}, we hope you love your {{$json["project_type"]}}! Please take 2 minutes to leave us a review: {{$json["review_link"]}}'
              }
            },
            {
              name: 'Send Invoice',
              type: 'n8n-nodes-base.httpRequest',
              position: [650, 400],
              parameters: {
                method: 'POST',
                url: `${process.env.API_URL}/api/billing/invoice`,
                body: {
                  customerId: '={{$json["customer_id"]}}',
                  projectId: '={{$json["project_id"]}}',
                  amount: '={{$json["project_total"]}}',
                  dueDate: 'net15'
                }
              }
            }
          ]
        }
      },
      quote_follow_up: {
        name: 'Quote Follow-Up Sequence',
        type: 'quote_follow_up',
        category: 'construction',
        description: 'Automated follow-up sequence for sent quotes',
        workflowJson: {
          nodes: [
            {
              name: 'Quote Sent',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Wait 3 Days',
              type: 'n8n-nodes-base.wait',
              position: [450, 300],
              parameters: {
                amount: 3,
                unit: 'days'
              }
            },
            {
              name: 'Send Follow-Up Email',
              type: 'n8n-nodes-base.sendGrid',
              position: [650, 300],
              parameters: {
                operation: 'send',
                to: '={{$json["lead_email"]}}',
                subject: 'Following up on your {{$json["project_type"]}} quote',
                text: 'Hi {{$json["lead_name"]}}, I wanted to follow up on the quote we sent for your {{$json["project_type"]}}. Do you have any questions? We can schedule a call to discuss.'
              }
            },
            {
              name: 'Wait 4 More Days',
              type: 'n8n-nodes-base.wait',
              position: [850, 300],
              parameters: {
                amount: 4,
                unit: 'days'
              }
            },
            {
              name: 'Final Follow-Up Call',
              type: 'n8n-nodes-base.httpRequest',
              position: [1050, 300],
              parameters: {
                method: 'POST',
                url: `${process.env.API_URL}/api/calls/schedule`,
                body: {
                  leadId: '={{$json["lead_id"]}}',
                  agentType: 'follow_up',
                  phoneNumber: '={{$json["lead_phone"]}}',
                  scheduledTime: 'next_business_day_10am'
                }
              }
            }
          ]
        }
      },
      material_delivery_tracking: {
        name: 'Material Delivery Tracking',
        type: 'material_delivery_tracking',
        category: 'construction',
        description: 'Track material deliveries and notify team',
        workflowJson: {
          nodes: [
            {
              name: 'Delivery Scheduled',
              type: 'n8n-nodes-base.webhook',
              position: [250, 300]
            },
            {
              name: 'Day Before Reminder',
              type: 'n8n-nodes-base.schedule',
              position: [450, 200],
              parameters: {
                triggerTimes: {
                  item: [{
                    hour: 16,
                    minute: 0
                  }]
                }
              }
            },
            {
              name: 'Send Reminder to Team',
              type: 'n8n-nodes-base.slack',
              position: [650, 200],
              parameters: {
                operation: 'post',
                channel: '#job-sites',
                text: '📦 Delivery Tomorrow: {{$json["order_items"]}} to {{$json["delivery_address"]}} at {{$json["delivery_time"]}}'
              }
            },
            {
              name: 'Send SMS to Foreman',
              type: 'n8n-nodes-base.twilio',
              position: [650, 400],
              parameters: {
                operation: 'send',
                message: 'Material delivery tomorrow at {{$json["delivery_address"]}} - {{$json["delivery_time"]}}. Items: {{$json["order_items"]}}',
                toNumber: '={{$json["foreman_phone"]}}'
              }
            }
          ]
        }
      },

      // === GENERAL WORKFLOW TEMPLATES (existing) ===
      save_lead: {
        name: 'Save Call to CRM',
        type: 'save_lead',
        category: 'general',
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
        category: 'general',
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
        category: 'general',
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
        category: 'general',
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
        category: 'general',
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
