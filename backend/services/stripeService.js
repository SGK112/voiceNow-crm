import Stripe from 'stripe';
import User from '../models/User.js';
import Usage from '../models/Usage.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {
  async createCustomer(email, name) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { source: 'voiceflow-crm' }
      });
      return customer;
    } catch (error) {
      console.error('Stripe Error:', error);
      throw new Error('Failed to create Stripe customer');
    }
  }

  async createSubscription(customerId, priceId, options = {}) {
    try {
      // Check if Stripe is in test mode
      const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

      const subscriptionData = {
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent']
      };

      // In test mode, allow subscriptions without payment method using trial
      if (isTestMode || options.useTrialForTesting) {
        console.log('🧪 Test mode: Creating subscription with trial period');
        subscriptionData.trial_period_days = options.trialDays || 14;
        subscriptionData.payment_behavior = 'default_incomplete';
        subscriptionData.payment_settings = {
          save_default_payment_method: 'on_subscription'
        };
      } else {
        // Production mode requires payment method
        subscriptionData.payment_behavior = 'default_incomplete';
        subscriptionData.payment_settings = {
          save_default_payment_method: 'on_subscription'
        };
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);
      console.log('✅ Subscription created:', subscription.id, 'Status:', subscription.status);
      return subscription;
    } catch (error) {
      console.error('❌ Stripe Subscription Error:', error.message);
      console.error('Full error:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Stripe Error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async updateSubscription(subscriptionId, priceId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId
        }],
        proration_behavior: 'create_prorations'
      });
      return updatedSubscription;
    } catch (error) {
      console.error('Stripe Error:', error);
      throw new Error('Failed to update subscription');
    }
  }

  async getInvoices(customerId) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100
      });
      return invoices.data;
    } catch (error) {
      console.error('Stripe Error:', error);
      throw new Error('Failed to fetch invoices');
    }
  }

  async createPaymentIntent(amount, customerId) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'usd',
        customer: customerId,
        automatic_payment_methods: { enabled: true }
      });
      return paymentIntent;
    } catch (error) {
      console.error('Stripe Error:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async handleWebhook(signature, body) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook Error:', error);
      throw error;
    }
  }

  async handleSubscriptionUpdate(subscription) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (user) {
      const priceId = subscription.items.data[0].price.id;
      let plan = 'starter';

      if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
        plan = 'professional';
      } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        plan = 'enterprise';
      }

      user.plan = plan;
      user.subscriptionStatus = subscription.status;
      user.subscriptionId = subscription.id;
      user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
      await user.save();
    }
  }

  async handleSubscriptionCanceled(subscription) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (user) {
      user.subscriptionStatus = 'canceled';
      await user.save();
    }
  }

  async handlePaymentSucceeded(invoice) {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    if (user) {
      const usage = await Usage.findOne({ userId: user._id });
      if (usage) {
        usage.callsThisMonth = 0;
        const now = new Date();
        usage.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        await usage.save();
      }
    }
  }

  async handlePaymentFailed(invoice) {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    if (user) {
      user.subscriptionStatus = 'past_due';
      await user.save();
    }
  }

  getPriceIdForPlan(plan) {
    const priceIds = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
    };
    return priceIds[plan];
  }
}

export default StripeService;
