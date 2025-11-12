import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import StripeService from '../services/stripeService.js';

const stripeService = new StripeService();

export const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ active: true });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const { planName } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.stripeCustomerId) {
      const customer = await stripeService.createCustomer(user.email, user.company);
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const priceId = stripeService.getPriceIdForPlan(planName);
    const subscription = await stripeService.createSubscription(user.stripeCustomerId, priceId);

    user.subscriptionId = subscription.id;
    user.plan = planName;
    user.subscriptionStatus = subscription.status;
    await user.save();

    // For trial subscriptions, there's no payment intent
    const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret || null;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.subscriptionId) {
      return res.status(400).json({ message: 'No active subscription' });
    }

    await stripeService.cancelSubscription(user.subscriptionId);

    user.subscriptionStatus = 'canceled';
    await user.save();

    res.json({ message: 'Subscription canceled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { planName } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.subscriptionId) {
      return res.status(400).json({ message: 'No active subscription' });
    }

    // Check if subscription is incomplete - if so, cancel it and create a new one
    if (user.subscriptionStatus === 'incomplete' || user.subscriptionStatus === 'incomplete_expired') {
      console.log('Canceling incomplete subscription and creating a new one');
      await stripeService.cancelSubscription(user.subscriptionId);

      // Create new subscription
      const priceId = stripeService.getPriceIdForPlan(planName);
      const subscription = await stripeService.createSubscription(user.stripeCustomerId, priceId);

      user.subscriptionId = subscription.id;
      user.plan = planName;
      user.subscriptionStatus = subscription.status;
      await user.save();

      return res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null,
        status: subscription.status,
        message: 'New subscription created'
      });
    }

    // For active/trialing subscriptions, update normally
    const priceId = stripeService.getPriceIdForPlan(planName);
    await stripeService.updateSubscription(user.subscriptionId, priceId);

    user.plan = planName;
    await user.save();

    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.stripeCustomerId) {
      return res.json([]);
    }

    const invoices = await stripeService.getInvoices(user.stripeCustomerId);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    await stripeService.handleWebhook(signature, req.body);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(400).json({ message: 'Webhook error' });
  }
};
