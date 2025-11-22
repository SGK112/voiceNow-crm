import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe Products and Prices for Credit Packages
 *
 * This script creates one-time payment products in Stripe for
 * the VoiceFlow CRM credit system.
 */

const creditPackages = [
  {
    id: 'starter',
    name: 'Starter Credit Pack',
    description: 'Perfect for testing and small projects. 500 credits that never expire.',
    credits: 500,
    price: 4900, // $49.00 in cents
    features: [
      '500 credits',
      'All features included',
      'No expiration',
      'Email support'
    ],
    metadata: {
      credits: '500',
      package_type: 'credit_pack',
      tier: 'starter'
    }
  },
  {
    id: 'professional',
    name: 'Professional Credit Pack',
    description: 'Best value for growing businesses. 2,000 credits with 24% savings.',
    credits: 2000,
    price: 14900, // $149.00 in cents
    features: [
      '2,000 credits',
      'All features included',
      'No expiration',
      'Priority support',
      'Save 24% vs Starter'
    ],
    metadata: {
      credits: '2000',
      package_type: 'credit_pack',
      tier: 'professional',
      popular: 'true'
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise Credit Pack',
    description: 'Maximum value for high-volume users. 5,000 credits with 39% savings.',
    credits: 5000,
    price: 29900, // $299.00 in cents
    features: [
      '5,000 credits',
      'All features included',
      'No expiration',
      'Premium support',
      'Save 39% vs Starter',
      'Dedicated account manager'
    ],
    metadata: {
      credits: '5000',
      package_type: 'credit_pack',
      tier: 'enterprise'
    }
  },
  {
    id: 'mega',
    name: 'Mega Credit Pack',
    description: 'Ultimate package for large enterprises. 10,000 credits with 49% savings.',
    credits: 10000,
    price: 49900, // $499.00 in cents
    features: [
      '10,000 credits',
      'All features included',
      'No expiration',
      'Premium support',
      'Save 49% vs Starter',
      'Dedicated account manager',
      'Custom integrations available'
    ],
    metadata: {
      credits: '10000',
      package_type: 'credit_pack',
      tier: 'mega'
    }
  }
];

async function createCreditProducts() {
  console.log('🚀 Creating Stripe Products for Credit Packages...\n');

  const createdProducts = [];

  for (const pack of creditPackages) {
    try {
      console.log(`📦 Creating product: ${pack.name}`);

      // Create Product
      const product = await stripe.products.create({
        name: pack.name,
        description: pack.description,
        metadata: pack.metadata,
        features: pack.features.map(f => ({ name: f }))
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create Price (one-time payment)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.price,
        currency: 'usd',
        metadata: {
          ...pack.metadata,
          credits_amount: pack.credits.toString()
        }
      });

      console.log(`   ✅ Price created: ${price.id}`);
      console.log(`   💰 Amount: $${(pack.price / 100).toFixed(2)}`);
      console.log(`   🎁 Credits: ${pack.credits}`);

      createdProducts.push({
        packageId: pack.id,
        productId: product.id,
        priceId: price.id,
        name: pack.name,
        amount: pack.price / 100,
        credits: pack.credits
      });

      console.log('');
    } catch (error) {
      console.error(`   ❌ Error creating ${pack.name}:`, error.message);
      console.log('');
    }
  }

  return createdProducts;
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Stripe Credit Package Setup');
    console.log('═══════════════════════════════════════════════════════\n');

    // Verify Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
      process.exit(1);
    }

    console.log(`🔑 Using Stripe key: ${process.env.STRIPE_SECRET_KEY.substring(0, 20)}...\n`);

    // Create products
    const products = await createCreditProducts();

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ Setup Complete!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 Created Products:\n');
    products.forEach(p => {
      console.log(`${p.name}:`);
      console.log(`  Product ID: ${p.productId}`);
      console.log(`  Price ID:   ${p.priceId}`);
      console.log(`  Amount:     $${p.amount}`);
      console.log(`  Credits:    ${p.credits}`);
      console.log('');
    });

    console.log('📝 Next Steps:\n');
    console.log('1. Add these Price IDs to your .env file:');
    console.log('');
    products.forEach(p => {
      const envVar = `STRIPE_CREDIT_${p.packageId.toUpperCase()}_PRICE_ID`;
      console.log(`${envVar}=${p.priceId}`);
    });
    console.log('');
    console.log('2. Update your frontend to use these price IDs');
    console.log('3. Test purchasing credits in your application');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
