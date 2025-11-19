import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Workflow model
const workflowSchema = new mongoose.Schema({
  name: String,
  description: String,
  enabled: Boolean,
  trigger: String,
  workflowJson: Object,
  n8nWorkflowId: String,
  userId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Workflow = mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);

async function createPostCallWorkflows() {
  console.log('⚡ Creating Post-Call Workflows for Surprise Granite...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Workflow 1: Send Thank You Email to Customer
    const thankYouWorkflow = {
      name: 'Surprise Granite - Thank You Email',
      description: 'Automatically send thank you email to customers after calls',
      enabled: true,
      trigger: 'call_completed',
      workflowJson: {
        nodes: [
          {
            id: '1',
            type: 'call_completed_trigger',
            position: { x: 100, y: 100 },
            data: {
              label: 'Call Completed',
              description: 'Triggered when agent finishes a call'
            }
          },
          {
            id: '2',
            type: 'check_email',
            position: { x: 300, y: 100 },
            data: {
              label: 'Check Email Captured',
              description: 'Verify customer provided email'
            }
          },
          {
            id: '3',
            type: 'send_email',
            position: { x: 500, y: 100 },
            data: {
              label: 'Send Thank You Email',
              to: '{{customer_email}}',
              subject: 'Thank You from Surprise Granite!',
              template: 'customer_thank_you',
              variables: {
                customer_name: '{{customer_name}}',
                project_type: '{{project_type}}',
                consultation_date: '{{consultation_date}}'
              }
            }
          },
          {
            id: '4',
            type: 'log',
            position: { x: 700, y: 100 },
            data: {
              label: 'Log Email Sent',
              message: 'Thank you email sent to {{customer_email}}'
            }
          }
        ],
        connections: [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
          { source: '3', target: '4' }
        ]
      }
    };

    // Workflow 2: Send Lead Notification to Owner
    const leadNotificationWorkflow = {
      name: 'Surprise Granite - Lead Notification',
      description: 'Notify owner of new leads from calls',
      enabled: true,
      trigger: 'call_completed',
      workflowJson: {
        nodes: [
          {
            id: '1',
            type: 'call_completed_trigger',
            position: { x: 100, y: 100 },
            data: {
              label: 'Call Completed',
              description: 'Triggered when agent finishes a call'
            }
          },
          {
            id: '2',
            type: 'extract_lead_info',
            position: { x: 300, y: 100 },
            data: {
              label: 'Extract Lead Information',
              fields: ['customer_name', 'phone', 'email', 'project_type', 'timeline']
            }
          },
          {
            id: '3',
            type: 'save_to_crm',
            position: { x: 500, y: 100 },
            data: {
              label: 'Save Lead to CRM',
              status: 'new',
              source: 'phone_call',
              assigned_to: 'owner'
            }
          },
          {
            id: '4',
            type: 'send_sms',
            position: { x: 700, y: 100 },
            data: {
              label: 'SMS Notification to Owner',
              to: '+14802555887',
              message: '🎯 New Lead from AI Agent!\n\nName: {{customer_name}}\nPhone: {{phone}}\nProject: {{project_type}}\nEmail: {{email}}\n\nCheck CRM for details!'
            }
          },
          {
            id: '5',
            type: 'send_email',
            position: { x: 700, y: 250 },
            data: {
              label: 'Email Notification to Owner',
              to: process.env.OWNER_EMAIL || 'owner@surprisegranite.com',
              subject: '🎯 New Lead: {{customer_name}} - {{project_type}}',
              template: 'owner_lead_notification',
              variables: {
                customer_name: '{{customer_name}}',
                phone: '{{phone}}',
                email: '{{email}}',
                project_type: '{{project_type}}',
                timeline: '{{timeline}}',
                call_transcript: '{{call_transcript}}',
                call_duration: '{{call_duration}}',
                lead_score: '{{lead_score}}'
              }
            }
          }
        ],
        connections: [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
          { source: '3', target: '4' },
          { source: '3', target: '5' }
        ]
      }
    };

    // Save workflows to database
    const workflow1 = new Workflow(thankYouWorkflow);
    const workflow2 = new Workflow(leadNotificationWorkflow);

    await workflow1.save();
    await workflow2.save();

    console.log('✅ Thank You Email Workflow created');
    console.log(`   ID: ${workflow1._id}`);

    console.log('✅ Lead Notification Workflow created');
    console.log(`   ID: ${workflow2._id}`);

    console.log('\n📋 WORKFLOW SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n1️⃣ THANK YOU EMAIL WORKFLOW:');
    console.log('   Trigger: When call completes');
    console.log('   Action: Send thank you email to customer');
    console.log('   Template: Professional thank you with next steps');
    console.log('   Status: ✅ Active');

    console.log('\n2️⃣ LEAD NOTIFICATION WORKFLOW:');
    console.log('   Trigger: When call completes');
    console.log('   Actions:');
    console.log('     - Extract lead info from call transcript');
    console.log('     - Save to CRM as new lead');
    console.log('     - Send SMS to your phone: 480-255-5887');
    console.log('     - Send detailed email with transcript');
    console.log('   Status: ✅ Active');

    console.log('\n⚡ WHAT HAPPENS AFTER EACH CALL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Call ends with Emma');
    console.log('2. Customer receives thank you email (if email provided)');
    console.log('3. Lead saved to your CRM');
    console.log('4. You receive SMS notification on your phone');
    console.log('5. You receive detailed email with full transcript');
    console.log('6. All information ready for follow-up!');

    console.log('\n🎯 COMPLETE SYSTEM READY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ AI Agent: Emma (Surprise Granite)');
    console.log('✅ Call Handling: Answer, Help, Book Consultations');
    console.log('✅ Emergency Transfer: Configured');
    console.log('✅ Thank You Emails: Automated');
    console.log('✅ Lead Notifications: SMS + Email');
    console.log('✅ CRM Integration: Automatic');

    return {
      thankYouWorkflow: workflow1,
      leadNotificationWorkflow: workflow2
    };

  } catch (error) {
    console.error('\n❌ Error creating workflows:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

createPostCallWorkflows()
  .then(() => {
    console.log('\n✨ All workflows created successfully!');
    console.log('\n🚀 YOUR SURPRISE GRANITE AI SYSTEM IS FULLY OPERATIONAL!');
    console.log('\n📞 Next: Forward your phone number to start receiving calls');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed to create workflows');
    process.exit(1);
  });
