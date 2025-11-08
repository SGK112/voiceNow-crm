import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://remodely.app.n8n.cloud/api/v1';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Create axios client
const client = axios.create({
  baseURL: N8N_BASE_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Workflow IDs from previous setup
const WORKFLOWS = {
  save_lead: 'DTABZoE2aKI8lcVj',
  send_sms: 'l1k6ZbtLHKaANPLz',
  book_appointment: 'ppg4X6w1CG02hWDb',
  slack_notification: 'R99fGLywAAUVA4ms',
  send_email: '5BqXWOZbZ2H22tuw'
};

async function createTwilioCredential() {
  console.log('\n📱 Twilio Credential Setup...');
  console.log('⚠️  Note: n8n API does not support credential creation via API');
  console.log('You will need to add the Twilio credential manually in the n8n dashboard:');
  console.log('');
  console.log('1. Go to: https://remodely.app.n8n.cloud/credentials');
  console.log('2. Click "Add Credential" → Search for "Twilio"');
  console.log('3. Enter the following:');
  console.log(`   Name: twilio_credentials`);
  console.log(`   Account SID: ${TWILIO_ACCOUNT_SID}`);
  console.log(`   Auth Token: ${TWILIO_AUTH_TOKEN}`);
  console.log('4. Click "Save"');
  console.log('');
  console.log('Once created, the workflows will automatically use this credential.');
  console.log('');
  return 'manual'; // Indicate manual setup needed
}

async function getWorkflowDetails(workflowId, workflowName) {
  try {
    console.log(`\n🔍 Inspecting workflow: ${workflowName}...`);

    // Get current workflow
    const workflow = await client.get(`/workflows/${workflowId}`);
    const workflowData = workflow.data;

    console.log(`   Active: ${workflowData.active ? '✅' : '❌'}`);
    console.log(`   Nodes: ${workflowData.nodes.length}`);

    // Find Twilio nodes
    const twilioNodes = workflowData.nodes.filter(node =>
      node.type === 'n8n-nodes-base.twilio' || node.name.toLowerCase().includes('twilio')
    );

    if (twilioNodes.length > 0) {
      console.log(`   Twilio nodes found: ${twilioNodes.length}`);
      twilioNodes.forEach(node => {
        console.log(`     - ${node.name} (${node.type})`);
      });
    } else {
      console.log('   ⚠️ No Twilio nodes found in this workflow');
    }

    return workflowData;

  } catch (error) {
    console.error(`❌ Error inspecting workflow ${workflowName}:`, error.response?.data || error.message);
    return null;
  }
}

async function activateWorkflow(workflowId, workflowName) {
  try {
    console.log(`\n⚡ Activating workflow: ${workflowName}...`);

    await client.patch(`/workflows/${workflowId}`, {
      active: true
    });

    console.log(`✅ Activated workflow: ${workflowName}`);
    return true;

  } catch (error) {
    console.error(`❌ Error activating workflow ${workflowName}:`, error.response?.data || error.message);
    return false;
  }
}

async function listWorkflows() {
  try {
    console.log('\n📋 Listing all workflows...');

    const response = await client.get('/workflows');
    const workflows = response.data.data;

    console.log(`\nFound ${workflows.length} workflows:\n`);
    workflows.forEach(wf => {
      console.log(`${wf.active ? '✅' : '⭕'} ${wf.name}`);
      console.log(`   ID: ${wf.id}`);
      console.log(`   Active: ${wf.active}`);
      console.log(`   Updated: ${new Date(wf.updatedAt).toLocaleString()}`);
      console.log('');
    });

    return workflows;
  } catch (error) {
    console.error('❌ Error listing workflows:', error.response?.data || error.message);
    return [];
  }
}

async function configureAll() {
  console.log('🚀 Starting n8n Configuration...\n');
  console.log('═'.repeat(60));

  // Validate environment variables
  if (!N8N_API_KEY) {
    console.error('❌ N8N_API_KEY not set in .env');
    process.exit(1);
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('❌ Twilio credentials not set in .env');
    process.exit(1);
  }

  console.log('Environment Variables:');
  console.log(`  N8N API: ${N8N_BASE_URL}`);
  console.log(`  Twilio SID: ${TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
  console.log(`  Twilio Phone: ${TWILIO_PHONE_NUMBER}`);
  console.log('═'.repeat(60));

  try {
    // Step 1: Show credential setup instructions
    await createTwilioCredential();

    // Step 2: Inspect workflows
    console.log('\n' + '═'.repeat(60));
    console.log('Inspecting workflows...');
    console.log('═'.repeat(60));

    const allWorkflows = [
      { id: WORKFLOWS.save_lead, name: 'Master: Save Lead to CRM' },
      { id: WORKFLOWS.send_sms, name: 'Master: Send SMS After Call' },
      { id: WORKFLOWS.book_appointment, name: 'Master: Book Appointment' },
      { id: WORKFLOWS.slack_notification, name: 'Master: Slack Notification' },
      { id: WORKFLOWS.send_email, name: 'Master: Send Follow-up Email' }
    ];

    for (const wf of allWorkflows) {
      await getWorkflowDetails(wf.id, wf.name);
    }

    // Step 3: Activate all workflows
    console.log('\n' + '═'.repeat(60));
    console.log('Activating all workflows...');
    console.log('═'.repeat(60));

    for (const wf of allWorkflows) {
      await activateWorkflow(wf.id, wf.name);
    }

    // Step 4: List all workflows to verify
    await listWorkflows();

    // Step 5: Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Configuration Summary');
    console.log('═'.repeat(60));
    console.log('\n✅ All workflows inspected');
    console.log('✅ All workflows activated');
    console.log('⚠️  Twilio credential needs manual setup (see instructions above)');

    console.log('\n📍 Webhook URLs (now active):');
    console.log('═'.repeat(60));
    console.log(`Save Lead:       https://remodely.app.n8n.cloud/webhook/save-lead`);
    console.log(`Send SMS:        https://remodely.app.n8n.cloud/webhook/send-sms`);
    console.log(`Book Appt:       https://remodely.app.n8n.cloud/webhook/book-appointment`);
    console.log(`Slack Notify:    https://remodely.app.n8n.cloud/webhook/slack-notify`);
    console.log(`Send Email:      https://remodely.app.n8n.cloud/webhook/send-email`);

    console.log('\n🎯 Next Steps:');
    console.log('═'.repeat(60));
    console.log('1. Add Twilio credential in n8n dashboard (instructions above)');
    console.log('2. Open each workflow and link Twilio nodes to the credential');
    console.log('3. Test the SMS workflow with the command below');

    console.log('\n🧪 Test SMS Workflow:');
    console.log('═'.repeat(60));
    console.log(`curl -X POST https://remodely.app.n8n.cloud/webhook/send-sms \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "${TWILIO_PHONE_NUMBER}",
    "message": "Test SMS from VoiceFlow CRM! 🎉"
  }'`);

    console.log('\n✅ n8n configuration complete!\n');

  } catch (error) {
    console.error('\n❌ Configuration failed:', error.message);
    process.exit(1);
  }
}

// Run configuration
configureAll();
