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
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Create axios client
const client = axios.create({
  baseURL: N8N_BASE_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Workflow IDs
const WORKFLOWS = {
  send_sms: 'l1k6ZbtLHKaANPLz',
  book_appointment: 'ppg4X6w1CG02hWDb'
};

async function updateSMSWorkflow() {
  try {
    console.log('\n🔧 Updating "Master: Send SMS After Call" workflow...');

    // Get current workflow
    const response = await client.get(`/workflows/${WORKFLOWS.send_sms}`);
    const workflow = response.data;

    console.log(`Current nodes: ${workflow.nodes.length}`);

    // Find and update Twilio node
    let updated = false;
    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.twilio' || node.name === 'Twilio SMS') {
        console.log(`\n📱 Found Twilio node: "${node.name}"`);
        console.log(`   Current parameters:`, JSON.stringify(node.parameters, null, 2));

        // Update the node parameters
        node.parameters = {
          ...node.parameters,
          resource: 'sms',
          operation: 'send',
          from: TWILIO_PHONE_NUMBER,
          to: '={{ $json.phone }}',
          message: '={{ $json.message }}'
        };

        console.log(`\n   ✅ Updated parameters:`);
        console.log(`      From: ${TWILIO_PHONE_NUMBER}`);
        console.log(`      To: ={{ $json.phone }}`);
        console.log(`      Message: ={{ $json.message }}`);

        updated = true;
      }
    });

    if (!updated) {
      console.log('❌ No Twilio node found in workflow');
      return false;
    }

    // Update the workflow (use PUT with full workflow data)
    console.log('\n💾 Saving workflow...');
    await client.put(`/workflows/${WORKFLOWS.send_sms}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData
    });

    console.log('✅ Workflow updated successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error updating SMS workflow:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    return false;
  }
}

async function updateBookingWorkflow() {
  try {
    console.log('\n🔧 Updating "Master: Book Appointment" workflow...');

    // Get current workflow
    const response = await client.get(`/workflows/${WORKFLOWS.book_appointment}`);
    const workflow = response.data;

    console.log(`Current nodes: ${workflow.nodes.length}`);

    // Find and update Twilio node
    let updated = false;
    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.twilio' || node.name === 'Send Confirmation SMS') {
        console.log(`\n📱 Found Twilio node: "${node.name}"`);
        console.log(`   Current parameters:`, JSON.stringify(node.parameters, null, 2));

        // Update the node parameters with appointment confirmation message
        node.parameters = {
          ...node.parameters,
          resource: 'sms',
          operation: 'send',
          from: TWILIO_PHONE_NUMBER,
          to: '={{ $json.customer_phone }}',
          message: '={{ "Hi " + $json.customer_name + ", your appointment is confirmed for " + $json.appointment_date + " at " + $json.appointment_time + ". We look forward to seeing you!" }}'
        };

        console.log(`\n   ✅ Updated parameters:`);
        console.log(`      From: ${TWILIO_PHONE_NUMBER}`);
        console.log(`      To: ={{ $json.customer_phone }}`);
        console.log(`      Message: Dynamic appointment confirmation`);

        updated = true;
      }
    });

    if (!updated) {
      console.log('❌ No Twilio node found in workflow');
      return false;
    }

    // Update the workflow (use PUT with full workflow data)
    console.log('\n💾 Saving workflow...');
    await client.put(`/workflows/${WORKFLOWS.book_appointment}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData
    });

    console.log('✅ Workflow updated successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error updating booking workflow:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    return false;
  }
}

async function updateAll() {
  console.log('🚀 Updating Twilio Nodes in n8n Workflows...\n');
  console.log('═'.repeat(60));
  console.log(`Twilio Phone: ${TWILIO_PHONE_NUMBER}`);
  console.log('═'.repeat(60));

  try {
    // Update both workflows
    const smsResult = await updateSMSWorkflow();
    const bookingResult = await updateBookingWorkflow();

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Update Summary');
    console.log('═'.repeat(60));
    console.log(`SMS Workflow: ${smsResult ? '✅ Updated' : '❌ Failed'}`);
    console.log(`Booking Workflow: ${bookingResult ? '✅ Updated' : '❌ Failed'}`);

    if (smsResult && bookingResult) {
      console.log('\n🧪 Test SMS Workflow:');
      console.log('═'.repeat(60));
      console.log(`curl -X POST https://remodely.app.n8n.cloud/webhook/send-sms \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "${TWILIO_PHONE_NUMBER}",
    "message": "Test SMS from VoiceFlow CRM! Your Twilio integration is working! 🎉"
  }'`);

      console.log('\n🧪 Test Booking Workflow:');
      console.log('═'.repeat(60));
      console.log(`curl -X POST https://remodely.app.n8n.cloud/webhook/book-appointment \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "${TWILIO_PHONE_NUMBER}",
    "appointment_date": "2025-11-15",
    "appointment_time": "2:00 PM",
    "service_type": "Consultation"
  }'`);

      console.log('\n✅ All workflows updated successfully!\n');
    } else {
      console.log('\n⚠️  Some workflows failed to update. Check errors above.\n');
    }

  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    process.exit(1);
  }
}

// Run update
updateAll();
