import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['starter', 'professional', 'enterprise']
  },
  displayName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  callLimit: {
    type: Number,
    required: true
  },
  agentsIncluded: [{
    type: String,
    enum: ['lead_gen', 'booking', 'collections', 'promo', 'support']
  }],
  features: [String],
  overageRate: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
