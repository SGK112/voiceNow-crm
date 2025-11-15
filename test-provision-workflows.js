import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkflowProvisioningService from './backend/services/workflowProvisioning.js';
import User from './backend/models/User.js';

dotenv.config();

async function provisionTestWorkflows() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test user or create one
    let user = await User.findOne({ email: 'test@example.com' });

    if (!user) {
      console.log('📝 No test user found. Please provide a valid user email:');
      // Get first user from database
      user = await User.findOne().sort({ createdAt: -1 });

      if (!user) {
        console.log('❌ No users found in database. Please create a user first.');
        process.exit(1);
      }
    }

    console.log(`👤 Using user: ${user.email} (${user._id})`);
    console.log(`📦 Subscription tier: ${user.subscription?.tier || 'starter'}`);

    // Provision workflows
    const provisioningService = new WorkflowProvisioningService();
    const tier = user.subscription?.tier || 'pro'; // Use 'pro' to get more workflows

    console.log(`\n🚀 Provisioning workflows for ${tier} tier...\n`);

    const workflows = await provisioningService.provisionUserWorkflows(
      user._id,
      {
        name: user.name || user.email.split('@')[0],
        email: user.email,
        slackWebhook: process.env.SLACK_WEBHOOK
      },
      tier
    );

    console.log('\n✅ Workflow Provisioning Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`Total Workflows Created: ${workflows.length}`);
    workflows.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.name}`);
      console.log(`     Type: ${w.type}`);
      console.log(`     n8n ID: ${w.n8nWorkflowId || 'Local only'}`);
      console.log(`     Enabled: ${w.enabled}`);
    });
    console.log('═══════════════════════════════════════\n');

    console.log('🌐 View workflows in n8n:');
    console.log(`   ${process.env.N8N_API_URL}\n`);

    console.log('📱 View in CRM:');
    console.log(`   ${process.env.CLIENT_URL}/app/workflows\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

provisionTestWorkflows();
