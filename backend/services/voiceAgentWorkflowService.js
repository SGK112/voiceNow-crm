import N8nService from './n8nService.js';
import VoiceAgent from '../models/VoiceAgent.js';

/**
 * Voice Agent Workflow Service
 * Creates n8n workflows for voice agents that:
 * 1. Receive ElevenLabs webhook
 * 2. Parse call data and transcript
 * 3. Update CRM (leads, deals, appointments)
 * 4. Send SMS/Email confirmations
 * 5. Log everything to MongoDB
 */
class VoiceAgentWorkflowService {
  constructor() {
    this.n8nService = new N8nService();
  }

  /**
   * Create a complete voice agent workflow in n8n
   * @param {Object} agent - Voice agent from database
   * @param {String} userId - User ID
   */
  async createVoiceAgentWorkflow(agent, userId) {
    console.log(`📞 Creating voice agent workflow for: ${agent.name}`);

    const workflowDefinition = {
      name: `Voice Agent: ${agent.name}`,
      nodes: [
        // 1. Webhook trigger - receives call completion from ElevenLabs
        {
          parameters: {
            httpMethod: 'POST',
            path: `elevenlabs-call-${agent._id}`,
            responseMode: 'onReceived',
            options: {}
          },
          name: 'ElevenLabs Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },

        // 2. Parse call data
        {
          parameters: {
            functionCode: `
const callData = items[0].json.body;

// Extract key information
const customerPhone = callData.caller_phone;
const customerName = callData.caller_name || callData.customer_name;
const customerEmail = callData.customer_email || callData.email;
const transcript = callData.transcript || '';
const duration = callData.duration;
const consultationBooked = callData.consultation_booked;

// Extract appointment info if present
const appointmentDate = callData.consultation_date;
const appointmentTime = callData.consultation_time;
const address = callData.address;

// Parse transcript for key info using AI
const intent = transcript.toLowerCase().includes('appointment') ? 'schedule' :
               transcript.toLowerCase().includes('question') ? 'inquiry' :
               transcript.toLowerCase().includes('price') || transcript.toLowerCase().includes('cost') ? 'pricing' :
               'general';

return [{
  json: {
    callId: callData.call_id,
    agentId: '${agent._id}',
    customerPhone,
    customerName,
    customerEmail,
    transcript,
    duration,
    intent,
    consultationBooked,
    appointmentDate,
    appointmentTime,
    address,
    timestamp: new Date().toISOString()
  }
}];
`
          },
          name: 'Parse Call Data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },

        // 3. Check if customer exists in CRM
        {
          parameters: {
            url: `${process.env.WEBHOOK_BASE_URL}/api/leads/search`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            httpHeaderAuth: 'voiceflowCrmAuth',
            method: 'POST',
            jsonParameters: true,
            options: {},
            bodyParametersJson: '={{ { "phone": $json.customerPhone } }}'
          },
          name: 'Find Customer',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [650, 300]
        },

        // 4. Branch: Create or Update Lead
        {
          parameters: {
            conditions: {
              number: [
                {
                  value1: '={{ $json.length }}',
                  operation: 'equal',
                  value2: 0
                }
              ]
            }
          },
          name: 'Customer Exists?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },

        // 5. Create New Lead
        {
          parameters: {
            url: `${process.env.WEBHOOK_BASE_URL}/api/leads`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            httpHeaderAuth: 'voiceflowCrmAuth',
            method: 'POST',
            jsonParameters: true,
            bodyParametersJson: `={{
              {
                "name": $node["Parse Call Data"].item.json.customerName,
                "phone": $node["Parse Call Data"].item.json.customerPhone,
                "email": $node["Parse Call Data"].item.json.customerEmail,
                "source": "voice_call",
                "status": "new",
                "notes": "Inbound call via ${agent.name}\\n\\nTranscript:\\n" + $node["Parse Call Data"].item.json.transcript
              }
            }}`
          },
          name: 'Create Lead',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1050, 200]
        },

        // 6. Update Existing Lead
        {
          parameters: {
            url: `${process.env.WEBHOOK_BASE_URL}/api/leads/{{$json.id}}`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            httpHeaderAuth: 'voiceflowCrmAuth',
            method: 'PATCH',
            jsonParameters: true,
            bodyParametersJson: `={{
              {
                "lastContact": $node["Parse Call Data"].item.json.timestamp,
                "notes": $json.notes + "\\n\\n" + $node["Parse Call Data"].item.json.timestamp + " - Call:\\n" + $node["Parse Call Data"].item.json.transcript
              }
            }}`
          },
          name: 'Update Lead',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1050, 400]
        },

        // 7. If consultation booked, create appointment
        {
          parameters: {
            conditions: {
              boolean: [
                {
                  value1: '={{ $node["Parse Call Data"].json.consultationBooked }}',
                  value2: true
                }
              ]
            }
          },
          name: 'Consultation Booked?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [1250, 300]
        },

        // 8. Create Appointment
        {
          parameters: {
            url: `${process.env.WEBHOOK_BASE_URL}/api/appointments`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            httpHeaderAuth: 'voiceflowCrmAuth',
            method: 'POST',
            jsonParameters: true,
            bodyParametersJson: `={{
              {
                "leadId": $node["Find Customer"].item.json[0]?.id || $node["Create Lead"].item.json.id,
                "date": $node["Parse Call Data"].item.json.appointmentDate,
                "time": $node["Parse Call Data"].item.json.appointmentTime,
                "address": $node["Parse Call Data"].item.json.address,
                "type": "consultation",
                "status": "scheduled",
                "notes": "Scheduled via voice call with ${agent.name}"
              }
            }}`
          },
          name: 'Create Appointment',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1450, 200]
        },

        // 9. Send Confirmation Email
        {
          parameters: {
            url: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/elevenlabs/call-completed`,
            method: 'POST',
            jsonParameters: true,
            bodyParametersJson: '={{ $node["Parse Call Data"].item.json }}'
          },
          name: 'Send Email Confirmation',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1450, 300]
        },

        // 10. Send SMS Confirmation (optional)
        {
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{ $node["Parse Call Data"].json.customerPhone }}',
                  operation: 'isNotEmpty'
                }
              ]
            }
          },
          name: 'Has Phone?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [1650, 300]
        },

        // 11. Twilio SMS
        {
          parameters: {
            fromPhoneNumber: agent.phoneNumber || '+16028337194',
            toPhoneNumber: '={{ $node["Parse Call Data"].json.customerPhone }}',
            message: `Thank you for calling! We'll follow up with you shortly about your inquiry.`
          },
          name: 'Send SMS',
          type: 'n8n-nodes-base.twilio',
          typeVersion: 1,
          position: [1850, 200],
          credentials: {
            twilioApi: {
              id: '1',
              name: 'Twilio Account'
            }
          }
        },

        // 12. Log to VoiceFlow CRM
        {
          parameters: {
            url: `${process.env.WEBHOOK_BASE_URL}/api/call-logs`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            httpHeaderAuth: 'voiceflowCrmAuth',
            method: 'POST',
            jsonParameters: true,
            bodyParametersJson: '={{ $node["Parse Call Data"].item.json }}'
          },
          name: 'Save Call Log',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1850, 400]
        }
      ],
      connections: {
        'ElevenLabs Webhook': {
          main: [[{ node: 'Parse Call Data', type: 'main', index: 0 }]]
        },
        'Parse Call Data': {
          main: [[{ node: 'Find Customer', type: 'main', index: 0 }]]
        },
        'Find Customer': {
          main: [[{ node: 'Customer Exists?', type: 'main', index: 0 }]]
        },
        'Customer Exists?': {
          main: [
            [{ node: 'Create Lead', type: 'main', index: 0 }],
            [{ node: 'Update Lead', type: 'main', index: 0 }]
          ]
        },
        'Create Lead': {
          main: [[{ node: 'Consultation Booked?', type: 'main', index: 0 }]]
        },
        'Update Lead': {
          main: [[{ node: 'Consultation Booked?', type: 'main', index: 0 }]]
        },
        'Consultation Booked?': {
          main: [
            [{ node: 'Create Appointment', type: 'main', index: 0 }],
            [{ node: 'Send Email Confirmation', type: 'main', index: 0 }]
          ]
        },
        'Create Appointment': {
          main: [[{ node: 'Send Email Confirmation', type: 'main', index: 0 }]]
        },
        'Send Email Confirmation': {
          main: [[{ node: 'Has Phone?', type: 'main', index: 0 }]]
        },
        'Has Phone?': {
          main: [
            [{ node: 'Send SMS', type: 'main', index: 0 }],
            [{ node: 'Save Call Log', type: 'main', index: 0 }]
          ]
        },
        'Send SMS': {
          main: [[{ node: 'Save Call Log', type: 'main', index: 0 }]]
        }
      },
      settings: {},
      staticData: null,
      tags: [{ id: 'voice-agent' }, { id: `user-${userId}` }]
    };

    // Create workflow in n8n
    const workflow = await this.n8nService.createWorkflow(workflowDefinition);
    console.log(`✅ Created n8n workflow: ${workflow.id}`);

    // Activate workflow
    await this.n8nService.activateWorkflow(workflow.id);
    console.log(`✅ Activated workflow: ${workflow.id}`);

    // Get webhook URL
    const webhookUrl = `${process.env.N8N_WEBHOOK_URL}/webhook/elevenlabs-call-${agent._id}`;

    // Update agent with workflow info
    agent.n8nWorkflowId = workflow.id;
    agent.webhookUrl = webhookUrl;
    await agent.save();

    console.log(`✅ Voice agent workflow ready: ${webhookUrl}`);

    return {
      workflowId: workflow.id,
      webhookUrl,
      workflow
    };
  }

  /**
   * Delete voice agent workflow from n8n
   */
  async deleteVoiceAgentWorkflow(agent) {
    if (agent.n8nWorkflowId) {
      await this.n8nService.deleteWorkflow(agent.n8nWorkflowId);
      console.log(`🗑️  Deleted workflow: ${agent.n8nWorkflowId}`);
    }
  }
}

export default VoiceAgentWorkflowService;
