import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_your_stripe_secret_key') {
  console.error('❌ Please set STRIPE_SECRET_KEY in your .env file');
  console.error('Get your key from: https://dashboard.stripe.com/test/apikeys');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Subscription plan configurations
const plans = [
  {
    name: 'VoiceFlow CRM - Starter',
    id: 'starter',
    description: 'Perfect for small businesses getting started with AI calling',
    price: 9900, // $99.00 in cents
    interval: 'month',
    features: [
      'Up to 500 AI calls/month',
      '2 AI agent types',
      'Basic CRM features',
      'Email support',
      'Call recordings (30 days)',
      'Basic analytics'
    ],
    metadata: {
      plan_id: 'starter',
      max_calls: '500',
      max_agents: '2',
      features: 'basic_crm,email_support,call_recordings_30days,basic_analytics'
    }
  },
  {
    name: 'VoiceFlow CRM - Professional',
    id: 'professional',
    description: 'For growing businesses that need advanced features',
    price: 29900, // $299.00 in cents
    interval: 'month',
    features: [
      'Up to 2,000 AI calls/month',
      'All 5 AI agent types',
      'Advanced CRM + Workflows',
      'Priority support',
      'Call recordings (90 days)',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated account manager'
    ],
    metadata: {
      plan_id: 'professional',
      max_calls: '2000',
      max_agents: '5',
      features: 'advanced_crm,workflows,priority_support,call_recordings_90days,advanced_analytics,custom_integrations,account_manager'
    }
  },
  {
    name: 'VoiceFlow CRM - Enterprise',
    id: 'enterprise',
    description: 'For large organizations with unlimited needs',
    price: 99900, // $999.00 in cents
    interval: 'month',
    features: [
      'Unlimited AI calls',
      'All 5 AI agent types',
      'Full CRM + Custom Workflows',
      '24/7 support',
      'Unlimited call recordings',
      'Custom analytics & reports',
      'API access',
      'White-label options',
      'SLA guarantee',
      'Custom development'
    ],
    metadata: {
      plan_id: 'enterprise',
      max_calls: 'unlimited',
      max_agents: 'unlimited',
      features: 'full_crm,custom_workflows,24_7_support,unlimited_recordings,custom_analytics,api_access,white_label,sla,custom_dev'
    }
  }
];

async function createProduct(planConfig) {
  try {
    console.log(`\n💳 Creating product: ${planConfig.name}...`);

    // Create product
    const product = await stripe.products.create({
      name: planConfig.name,
      description: planConfig.description,
      metadata: planConfig.metadata
    });

    console.log(`✅ Created product: ${product.id}`);

    // Create price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: planConfig.price,
      currency: 'usd',
      recurring: {
        interval: planConfig.interval
      },
      metadata: planConfig.metadata
    });

    console.log(`✅ Created price: ${price.id}`);
    console.log(`   Amount: $${(planConfig.price / 100).toFixed(2)}/${planConfig.interval}`);

    return {
      plan: planConfig.id,
      name: planConfig.name,
      productId: product.id,
      priceId: price.id,
      amount: planConfig.price / 100,
      interval: planConfig.interval,
      features: planConfig.features
    };
  } catch (error) {
    console.error(`❌ Error creating product ${planConfig.name}:`, error.message);
    return null;
  }
}

async function setupWebhook() {
  try {
    console.log('\n🔗 Setting up webhook endpoint...');

    // Note: Replace with your actual domain
    const webhookUrl = process.env.STRIPE_WEBHOOK_URL || 'https://your-domain.com/api/webhooks/stripe';

    // List existing webhooks to check if one already exists
    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = existingWebhooks.data.find(wh => wh.url === webhookUrl);

    if (existing) {
      console.log(`✅ Webhook already exists: ${existing.id}`);
      console.log(`   URL: ${existing.url}`);
      return existing;
    }

    // Create webhook endpoint
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'checkout.session.completed'
      ],
      description: 'VoiceFlow CRM - Subscription Events'
    });

    console.log(`✅ Created webhook: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Secret: ${webhook.secret}`);
    console.log('\n⚠️  IMPORTANT: Save the webhook secret to your .env file:');
    console.log(`   STRIPE_WEBHOOK_SECRET=${webhook.secret}`);

    return webhook;
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    return null;
  }
}

async function setupStripe() {
  console.log('🚀 Starting Stripe Setup...');
  console.log(`API Key: ${STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log('');

  const createdProducts = [];

  // Create products and prices
  for (const planConfig of plans) {
    const product = await createProduct(planConfig);
    if (product) {
      createdProducts.push(product);
    }
    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Set up webhook
  const webhook = await setupWebhook();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary');
  console.log('='.repeat(60));
  console.log(`\n✅ Successfully created ${createdProducts.length} products:`);

  createdProducts.forEach(product => {
    console.log(`\n${product.name}`);
    console.log(`   Plan: ${product.plan}`);
    console.log(`   Product ID: ${product.productId}`);
    console.log(`   Price ID: ${product.priceId}`);
    console.log(`   Amount: $${product.amount}/${product.interval}`);
    console.log(`   Features:`);
    product.features.forEach(feature => {
      console.log(`     • ${feature}`);
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log('📝 Update your .env file with these Price IDs:');
  console.log('='.repeat(60) + '\n');

  createdProducts.forEach(product => {
    const envVar = `STRIPE_${product.plan.toUpperCase()}_PRICE_ID`;
    console.log(`${envVar}=${product.priceId}`);
  });

  if (webhook) {
    console.log(`\nSTRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Next Steps:');
  console.log('='.repeat(60) + '\n');
  console.log('1. Update your .env file with the Price IDs and Webhook Secret above');
  console.log('2. Go to Stripe Dashboard: https://dashboard.stripe.com/test/products');
  console.log('3. Verify products were created correctly');
  console.log('4. Update webhook URL in .env: STRIPE_WEBHOOK_URL=https://your-domain.com/api/webhooks/stripe');
  console.log('5. Test subscription flow in your app');
  console.log('\n📚 For testing, use these test cards:');
  console.log('   • Success: 4242 4242 4242 4242');
  console.log('   • Decline: 4000 0000 0000 0002');
  console.log('   • 3D Secure: 4000 0025 0000 3155');
  console.log('\n✅ Stripe setup complete!\n');
}

// Run setup
setupStripe().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
