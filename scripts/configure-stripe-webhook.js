/**
 * Stripe Webhook Configuration Script
 *
 * This script automatically configures the Stripe webhook endpoint
 * for your VoiceNow CRM production environment.
 */

import Stripe from 'stripe';
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTION_URL = 'https://voiceflow-crm-1.onrender.com';
const WEBHOOK_PATH = '/api/webhooks/stripe';
const WEBHOOK_URL = `${PRODUCTION_URL}${WEBHOOK_PATH}`;

// Events to listen for
const WEBHOOK_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.created',
  'customer.updated'
];

async function configureWebhook() {
  try {
    console.log('\n🔧 Stripe Webhook Configuration\n');
    console.log('═'.repeat(60));

    // Step 1: Check if webhook already exists
    console.log('\n1️⃣  Checking for existing webhooks...');
    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });

    const existingWebhook = existingWebhooks.data.find(
      wh => wh.url === WEBHOOK_URL
    );

    if (existingWebhook) {
      console.log('   ⚠️  Webhook already exists:', existingWebhook.id);
      console.log('   📋 URL:', existingWebhook.url);
      console.log('   📊 Status:', existingWebhook.status);
      console.log('   🔔 Events:', existingWebhook.enabled_events.length);

      // Ask if user wants to update or keep existing
      console.log('\n   Options:');
      console.log('   - To update this webhook, delete it first from Stripe dashboard');
      console.log('   - Or use this existing webhook secret in your environment:');
      console.log('\n   ✅ Your webhook is already configured!');
      console.log(`\n   🔑 Webhook Secret: ${existingWebhook.secret}`);
      console.log('\n   Add this to your Render environment variables:');
      console.log(`   STRIPE_WEBHOOK_SECRET=${existingWebhook.secret}`);

      return existingWebhook;
    }

    // Step 2: Create new webhook endpoint
    console.log('   ✅ No existing webhook found. Creating new one...\n');

    console.log('2️⃣  Creating webhook endpoint...');
    console.log('   📍 URL:', WEBHOOK_URL);
    console.log('   🔔 Events:', WEBHOOK_EVENTS.length);

    const webhook = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: 'VoiceNow CRM Production Webhook',
      metadata: {
        environment: 'production',
        created_by: 'configure-stripe-webhook.js',
        created_at: new Date().toISOString()
      }
    });

    console.log('   ✅ Webhook created successfully!');
    console.log('\n3️⃣  Webhook Details:');
    console.log('   ═'.repeat(60));
    console.log(`   ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Status: ${webhook.status}`);
    console.log(`   Created: ${new Date(webhook.created * 1000).toLocaleString()}`);
    console.log(`   API Version: ${webhook.api_version}`);

    console.log('\n   🔔 Enabled Events:');
    webhook.enabled_events.forEach(event => {
      console.log(`      ✓ ${event}`);
    });

    console.log('\n4️⃣  Webhook Secret (SAVE THIS!):');
    console.log('   ═'.repeat(60));
    console.log(`   🔑 ${webhook.secret}`);
    console.log('   ═'.repeat(60));

    console.log('\n5️⃣  Next Steps:');
    console.log('   ═'.repeat(60));
    console.log('   1. Copy the webhook secret above');
    console.log('   2. Go to your Render dashboard');
    console.log('   3. Add environment variable:');
    console.log(`\n      STRIPE_WEBHOOK_SECRET=${webhook.secret}\n`);
    console.log('   4. Restart your Render service');
    console.log('   5. Test the webhook with a test payment');
    console.log('   ═'.repeat(60));

    console.log('\n✅ Webhook configuration complete!\n');

    return webhook;

  } catch (error) {
    console.error('\n❌ Error configuring webhook:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n   🔑 Authentication Error:');
      console.error('   - Check that STRIPE_SECRET_KEY is set correctly');
      console.error('   - Make sure you are using the LIVE key (sk_live_...)');
      console.error('   - Current key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 10));
    } else if (error.type === 'StripeInvalidRequestError') {
      console.error('\n   ⚠️  Invalid Request:');
      console.error('   - URL may already be registered');
      console.error('   - Check Stripe dashboard for existing webhooks');
    }

    console.error('\n   Full error:', error);
    throw error;
  }
}

// List all existing webhooks (for debugging)
async function listWebhooks() {
  try {
    console.log('\n📋 Listing all webhook endpoints:\n');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 100 });

    if (webhooks.data.length === 0) {
      console.log('   No webhooks configured.');
      return;
    }

    webhooks.data.forEach((wh, index) => {
      console.log(`\n${index + 1}. ${wh.id}`);
      console.log(`   URL: ${wh.url}`);
      console.log(`   Status: ${wh.status}`);
      console.log(`   Events: ${wh.enabled_events.length}`);
      console.log(`   Created: ${new Date(wh.created * 1000).toLocaleString()}`);
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Error listing webhooks:', error.message);
  }
}

// Test webhook by sending a test event
async function testWebhook() {
  try {
    console.log('\n🧪 Testing webhook...\n');

    // List webhook endpoints to get the webhook ID
    const webhooks = await stripe.webhookEndpoints.list({ limit: 1 });

    if (webhooks.data.length === 0) {
      console.log('❌ No webhook endpoint found. Run configuration first.');
      return;
    }

    const webhookId = webhooks.data[0].id;
    console.log(`   Testing webhook: ${webhookId}`);
    console.log(`   URL: ${webhooks.data[0].url}`);

    // Note: Stripe doesn't have a direct API to trigger test events
    // You need to use Stripe CLI or create actual test events
    console.log('\n   To test the webhook:');
    console.log('   1. Use Stripe CLI: stripe trigger customer.subscription.created');
    console.log('   2. Or make a test subscription in your app');
    console.log('   3. Or use Stripe Dashboard > Webhooks > Send test webhook');

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Main execution
const command = process.argv[2];

if (command === 'list') {
  listWebhooks();
} else if (command === 'test') {
  testWebhook();
} else {
  configureWebhook();
}
