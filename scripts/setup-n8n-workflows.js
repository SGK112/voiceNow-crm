import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

// Convert webhook URL to API URL
const apiBaseUrl = N8N_WEBHOOK_URL.replace('/webhook', '/api/v1');

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Master workflow configurations
const workflowConfigs = [
  {
    name: 'Master: Save Lead to CRM',
    webhookPath: 'save-lead',
    description: 'Saves call data as a lead in the CRM',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'save-lead',
          responseMode: 'onReceived',
          options: {}
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          functionCode: `// Extract and format lead data from webhook
const { userId, callData, config } = items[0].json;

return [{
  json: {
    userId,
    name: callData.caller_name || 'Unknown',
    phone: callData.caller_phone,
    email: callData.email || '',
    source: \`AI Agent: \${callData.agent_type}\`,
    qualified: callData.qualified || false,
    transcript: callData.transcript || '',
    duration: callData.duration,
    callRecording: callData.recording_url,
    notes: \`Call completed on \${new Date().toISOString()}\`,
    metadata: {
      elevenlabs_call_id: callData.call_id,
      agent_type: callData.agent_type
    }
  }
}];`
        },
        name: 'Extract Lead Data',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: '={{$env.BACKEND_URL}}/api/leads',
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth',
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'name', value: '={{$json.name}}' },
              { name: 'phone', value: '={{$json.phone}}' },
              { name: 'email', value: '={{$json.email}}' },
              { name: 'source', value: '={{$json.source}}' },
              { name: 'qualified', value: '={{$json.qualified}}' },
              { name: 'notes', value: '={{$json.notes}}' }
            ]
          },
          options: {}
        },
        name: 'Save to CRM',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [650, 300]
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Extract Lead Data', type: 'main', index: 0 }]]
      },
      'Extract Lead Data': {
        main: [[{ node: 'Save to CRM', type: 'main', index: 0 }]]
      }
    }
  },
  {
    name: 'Master: Send SMS After Call',
    webhookPath: 'send-sms',
    description: 'Sends SMS notification after call completes',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'send-sms',
          responseMode: 'onReceived'
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          functionCode: `// Prepare SMS data
const { userId, callData, config } = items[0].json;

const message = config.smsTemplate ||
  \`Thank you for your call, \${callData.caller_name}! We'll follow up with you soon. - Your Team\`;

return [{
  json: {
    userId,
    to: callData.caller_phone,
    message: message,
    from: config.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER
  }
}];`
        },
        name: 'Format SMS',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          resource: 'sms',
          operation: 'send',
          message: '={{$json.message}}',
          toPhoneNumber: '={{$json.to}}',
          fromPhoneNumber: '={{$json.from}}'
        },
        name: 'Twilio SMS',
        type: 'n8n-nodes-base.twilio',
        typeVersion: 1,
        position: [650, 300],
        credentials: {
          twilioApi: {
            id: 'twilio_credentials',
            name: 'Twilio account'
          }
        }
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Format SMS', type: 'main', index: 0 }]]
      },
      'Format SMS': {
        main: [[{ node: 'Twilio SMS', type: 'main', index: 0 }]]
      }
    }
  },
  {
    name: 'Master: Book Appointment',
    webhookPath: 'book-appointment',
    description: 'Creates calendar appointment and sends confirmation',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'book-appointment',
          responseMode: 'onReceived'
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          functionCode: `// Extract appointment details
const { userId, callData, config } = items[0].json;

// Parse appointment date from config or transcript
const appointmentDate = config.appointmentDate || new Date(Date.now() + 86400000).toISOString();
const duration = config.duration || 60; // minutes
const endDate = new Date(new Date(appointmentDate).getTime() + duration * 60000).toISOString();

return [{
  json: {
    userId,
    summary: \`Appointment: \${callData.caller_name}\`,
    description: \`Follow-up from AI call.\\n\\nCall Transcript:\\n\${callData.transcript || 'N/A'}\`,
    start: appointmentDate,
    end: endDate,
    attendees: [callData.email].filter(Boolean),
    callerPhone: callData.caller_phone,
    callerName: callData.caller_name
  }
}];`
        },
        name: 'Prepare Appointment',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          resource: 'event',
          operation: 'create',
          calendarId: 'primary',
          start: '={{$json.start}}',
          end: '={{$json.end}}',
          summary: '={{$json.summary}}',
          description: '={{$json.description}}'
        },
        name: 'Google Calendar',
        type: 'n8n-nodes-base.googleCalendar',
        typeVersion: 1,
        position: [650, 300],
        credentials: {
          googleCalendarOAuth2Api: {
            id: 'google_calendar',
            name: 'Google Calendar'
          }
        }
      },
      {
        parameters: {
          resource: 'sms',
          operation: 'send',
          message: '={{\"Appointment confirmed for \" + $json.start + \" with \" + $json.callerName}}',
          toPhoneNumber: '={{$json.callerPhone}}',
          fromPhoneNumber: '={{$env.TWILIO_PHONE_NUMBER}}'
        },
        name: 'Send Confirmation SMS',
        type: 'n8n-nodes-base.twilio',
        typeVersion: 1,
        position: [850, 300]
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Prepare Appointment', type: 'main', index: 0 }]]
      },
      'Prepare Appointment': {
        main: [[{ node: 'Google Calendar', type: 'main', index: 0 }]]
      },
      'Google Calendar': {
        main: [[{ node: 'Send Confirmation SMS', type: 'main', index: 0 }]]
      }
    }
  },
  {
    name: 'Master: Slack Notification',
    webhookPath: 'slack-notify',
    description: 'Sends Slack notification for new calls',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'slack-notify',
          responseMode: 'onReceived'
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          functionCode: `// Format Slack message
const { userId, callData, config } = items[0].json;

const qualified = callData.qualified ? '✅ Qualified' : '❌ Not Qualified';
const channel = config.slackChannel || '#leads';

const message = \`🆕 *New \${callData.agent_type} Call*

👤 *Contact:* \${callData.caller_name}
📞 *Phone:* \${callData.caller_phone}
📧 *Email:* \${callData.email || 'N/A'}
⏱️ *Duration:* \${callData.duration}s
\${qualified}

📝 *Transcript Preview:*
\${(callData.transcript || 'No transcript').substring(0, 200)}...

🎧 <\${callData.recording_url || '#'}|Listen to Recording>\`;

return [{
  json: {
    channel: channel,
    text: message
  }
}];`
        },
        name: 'Format Message',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          resource: 'message',
          operation: 'post',
          channel: '={{$json.channel}}',
          text: '={{$json.text}}'
        },
        name: 'Slack',
        type: 'n8n-nodes-base.slack',
        typeVersion: 1,
        position: [650, 300],
        credentials: {
          slackOAuth2Api: {
            id: 'slack_credentials',
            name: 'Slack account'
          }
        }
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Format Message', type: 'main', index: 0 }]]
      },
      'Format Message': {
        main: [[{ node: 'Slack', type: 'main', index: 0 }]]
      }
    }
  },
  {
    name: 'Master: Send Follow-up Email',
    webhookPath: 'send-email',
    description: 'Sends follow-up email after call',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'send-email',
          responseMode: 'onReceived'
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          functionCode: `// Prepare email content
const { userId, callData, config } = items[0].json;

const subject = config.emailSubject || 'Thank you for your call!';
const html = \`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Call!</h1>
    </div>
    <div class="content">
      <p>Hi \${callData.caller_name},</p>
      <p>Thank you for taking the time to speak with us. We appreciate your interest and wanted to follow up on our conversation.</p>

      <h3>Call Summary:</h3>
      <ul>
        <li><strong>Duration:</strong> \${callData.duration} seconds</li>
        <li><strong>Agent Type:</strong> \${callData.agent_type}</li>
        <li><strong>Date:</strong> \${new Date().toLocaleDateString()}</li>
      </ul>

      <p>Our team will review your inquiry and get back to you within 24 hours.</p>

      <p>If you have any immediate questions, please don't hesitate to reach out to us.</p>

      <p>Best regards,<br>
      Your Team</p>
    </div>
    <div class="footer">
      <p>This email was sent in response to your call. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
\`;

return [{
  json: {
    to: callData.email || callData.caller_email,
    subject: subject,
    html: html
  }
}];`
        },
        name: 'Format Email',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          resource: 'email',
          operation: 'send',
          toEmail: '={{$json.to}}',
          subject: '={{$json.subject}}',
          emailType: 'html',
          message: '={{$json.html}}'
        },
        name: 'SendGrid',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [650, 300],
        credentials: {
          sendGridApi: {
            id: 'sendgrid_credentials',
            name: 'SendGrid'
          }
        }
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Format Email', type: 'main', index: 0 }]]
      },
      'Format Email': {
        main: [[{ node: 'SendGrid', type: 'main', index: 0 }]]
      }
    }
  }
];

async function createWorkflow(config) {
  try {
    console.log(`\n🔧 Creating workflow: ${config.name}...`);

    const workflow = {
      name: config.name,
      nodes: config.nodes,
      connections: config.connections,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      }
    };

    const response = await client.post('/workflows', workflow);

    console.log(`✅ Created workflow: ${config.name}`);
    console.log(`   Workflow ID: ${response.data.id}`);
    console.log(`   Webhook URL: ${N8N_WEBHOOK_URL}/${config.webhookPath}`);

    return {
      name: config.name,
      workflowId: response.data.id,
      webhookPath: config.webhookPath,
      webhookUrl: `${N8N_WEBHOOK_URL}/${config.webhookPath}`,
      description: config.description
    };
  } catch (error) {
    console.error(`❌ Error creating workflow ${config.name}:`);
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    return null;
  }
}

async function setupAllWorkflows() {
  console.log('🚀 Starting N8N Workflow Setup...');
  console.log(`API Base URL: ${apiBaseUrl}`);
  console.log(`API Key: ${N8N_API_KEY ? 'SET' : 'NOT SET'}`);

  if (!N8N_API_KEY || !N8N_WEBHOOK_URL) {
    console.error('❌ N8N credentials not found in environment variables');
    process.exit(1);
  }

  const createdWorkflows = [];

  for (const config of workflowConfigs) {
    const workflow = await createWorkflow(config);
    if (workflow) {
      createdWorkflows.push(workflow);
    }
    // Wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary');
  console.log('='.repeat(60));
  console.log(`\n✅ Successfully created ${createdWorkflows.length} workflows:`);

  createdWorkflows.forEach(workflow => {
    console.log(`\n${workflow.name}`);
    console.log(`   Workflow ID: ${workflow.workflowId}`);
    console.log(`   Webhook URL: ${workflow.webhookUrl}`);
    console.log(`   Description: ${workflow.description}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('📝 Next Steps:');
  console.log('='.repeat(60) + '\n');
  console.log('1. Go to n8n cloud dashboard: https://remodely.app.n8n.cloud');
  console.log('2. Configure credentials for each workflow:');
  console.log('   - Twilio (for SMS workflows)');
  console.log('   - Google Calendar (for appointment workflow)');
  console.log('   - Slack (for notification workflow)');
  console.log('   - SendGrid (for email workflow)');
  console.log('3. Activate each workflow in the n8n UI');
  console.log('4. Test by calling your ElevenLabs agents\n');

  console.log('✅ Workflow setup complete!');
}

// Run setup
setupAllWorkflows().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
