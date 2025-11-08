import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

dotenv.config();

const plans = [
  {
    name: 'starter',
    displayName: 'Starter',
    price: 99,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    callLimit: 100,
    agentsIncluded: ['lead_gen'],
    features: [
      'Lead Generation Agent',
      '100 calls per month',
      'Basic analytics',
      'Email support',
      '1 workflow automation',
    ],
    overageRate: 0.5,
    active: true,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 299,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
    callLimit: 500,
    agentsIncluded: ['lead_gen', 'booking', 'collections'],
    features: [
      'Lead Gen + Booking + Collections',
      '500 calls per month',
      'Advanced analytics',
      'SMS notifications',
      'Priority email support',
      '5 workflow automations',
      'Google Calendar sync',
    ],
    overageRate: 0.3,
    active: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 999,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    callLimit: -1,
    agentsIncluded: ['lead_gen', 'booking', 'collections', 'promo', 'support'],
    features: [
      'All 5 AI agents',
      'Unlimited calls',
      'Premium analytics & reporting',
      'SMS + Email notifications',
      'Dedicated support',
      'Unlimited workflow automations',
      'Custom agent training',
      'API access',
      'White-label option',
    ],
    overageRate: 0,
    active: true,
  },
];

const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing plans');

    await SubscriptionPlan.insertMany(plans);
    console.log('Seeded subscription plans successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
};

seedPlans();
