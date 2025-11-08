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
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@voiceflow.com';

// Create axios client
const client = axios.create({
  baseURL: N8N_BASE_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

const WORKFLOW_ID = '5BqXWOZbZ2H22tuw';

async function updateEmailWorkflow() {
  try {
    console.log('\n🔧 Updating "Master: Send Follow-up Email" workflow...');

    // Get current workflow
    const response = await client.get(`/workflows/${WORKFLOW_ID}`);
    const workflow = response.data;

    console.log(`Current nodes: ${workflow.nodes.length}`);

    // Find and update SendGrid node
    let updated = false;
    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.sendGrid' || node.name === 'Send an email') {
        console.log(`\n📧 Found SendGrid node: "${node.name}"`);
        console.log(`   Current parameters:`, JSON.stringify(node.parameters, null, 2));

        // Update the node parameters
        node.parameters = {
          ...node.parameters,
          resource: 'mail',
          operation: 'send',
          from: SENDGRID_FROM_EMAIL,
          to: '={{ $json.to }}',
          subject: '={{ $json.subject }}',
          contentType: 'html',
          html: '={{ $json.html }}',
          additionalFields: {}
        };

        console.log(`\n   ✅ Updated parameters:`);
        console.log(`      From: ${SENDGRID_FROM_EMAIL}`);
        console.log(`      To: ={{ $json.to }}`);
        console.log(`      Subject: ={{ $json.subject }}`);
        console.log(`      HTML: ={{ $json.html }}`);

        updated = true;
      }
    });

    if (!updated) {
      console.log('❌ No SendGrid node found in workflow');
      return false;
    }

    // Update the workflow
    console.log('\n💾 Saving workflow...');
    await client.put(`/workflows/${WORKFLOW_ID}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData
    });

    console.log('✅ Workflow updated successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error updating email workflow:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    return false;
  }
}

async function updateAll() {
  console.log('🚀 Updating Email Workflow in n8n...\n');
  console.log('═'.repeat(60));
  console.log(`SendGrid From Email: ${SENDGRID_FROM_EMAIL}`);
  console.log('═'.repeat(60));

  try {
    const result = await updateEmailWorkflow();

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Update Summary');
    console.log('═'.repeat(60));
    console.log(`Email Workflow: ${result ? '✅ Updated' : '❌ Failed'}`);

    if (result) {
      console.log('\n📝 Important: SendGrid Credential Setup');
      console.log('═'.repeat(60));
      console.log('To send emails, you need to add SendGrid credentials:');
      console.log('');
      console.log('1. Go to: https://remodely.app.n8n.cloud/credentials');
      console.log('2. Click "Add Credential" → Search for "SendGrid"');
      console.log('3. Enter your SendGrid API Key');
      console.log('4. Save as: sendgrid_credentials');
      console.log('');
      console.log('5. Open workflow: https://remodely.app.n8n.cloud/workflow/5BqXWOZbZ2H22tuw');
      console.log('6. Click the "Send an email" node');
      console.log('7. Select credential: sendgrid_credentials');
      console.log('8. Save workflow');
      console.log('');
      console.log('Get your SendGrid API Key:');
      console.log('- Go to: https://app.sendgrid.com/settings/api_keys');
      console.log('- Create a new API key with "Mail Send" permission');
      console.log('- Copy the key and add it to n8n credentials');

      console.log('\n🧪 Test Email Workflow (after adding credential):');
      console.log('═'.repeat(60));
      console.log(`curl -X POST https://remodely.app.n8n.cloud/webhook/send-email \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "test_user",
    "callData": {
      "caller_name": "John Doe",
      "email": "your-email@example.com",
      "duration": 180,
      "agent_type": "lead_gen"
    },
    "config": {
      "emailSubject": "Thanks for your interest!"
    }
  }'`);

      console.log('\n✅ Email workflow updated successfully!\n');
      console.log('⚠️  Don\'t forget to add SendGrid credentials in n8n dashboard\n');
    } else {
      console.log('\n⚠️  Email workflow failed to update. Check errors above.\n');
    }

  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    process.exit(1);
  }
}

// Run update
updateAll();
