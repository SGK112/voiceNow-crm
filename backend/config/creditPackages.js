/**
 * Credit Package Pricing
 *
 * Pay-as-you-go credit packages for VoiceNow CRM
 */

export const CREDIT_PACKAGES = {
  starter: {
    name: 'Starter Pack',
    credits: 500,
    price: 49,
    pricePerCredit: 0.098,
    popular: false,
    description: 'Perfect for testing and small projects',
    features: [
      '500 credits',
      'All features included',
      'No expiration',
      'Email support'
    ]
  },
  professional: {
    name: 'Professional Pack',
    credits: 2000,
    price: 149,
    pricePerCredit: 0.0745,
    savings: '24%',
    popular: true,
    description: 'Best value for growing businesses',
    features: [
      '2,000 credits',
      'All features included',
      'No expiration',
      'Priority support',
      'Save 24% vs Starter'
    ]
  },
  enterprise: {
    name: 'Enterprise Pack',
    credits: 5000,
    price: 299,
    pricePerCredit: 0.0598,
    savings: '39%',
    popular: false,
    description: 'Maximum value for high-volume users',
    features: [
      '5,000 credits',
      'All features included',
      'No expiration',
      'Premium support',
      'Save 39% vs Starter',
      'Dedicated account manager'
    ]
  },
  mega: {
    name: 'Mega Pack',
    credits: 10000,
    price: 499,
    pricePerCredit: 0.0499,
    savings: '49%',
    popular: false,
    description: 'Ultimate package for large enterprises',
    features: [
      '10,000 credits',
      'All features included',
      'No expiration',
      'Premium support',
      'Save 49% vs Starter',
      'Dedicated account manager',
      'Custom integrations available'
    ]
  }
};

/**
 * Credit costs for different actions
 */
export const CREDIT_COSTS = {
  // Voice Agent Calls
  voiceCall: {
    perMinute: 1,
    description: 'Voice AI phone calls'
  },

  // SMS
  sms: {
    perMessage: 0.1,
    description: 'SMS text messages'
  },

  // Email
  email: {
    perEmail: 0.05,
    description: 'Email sending'
  },

  // AI Conversations
  aiMessage: {
    perMessage: 0.02,
    description: 'AI chat messages'
  },

  // Workflows
  workflowExecution: {
    perExecution: 0.5,
    description: 'Automated workflow runs'
  },

  // Calendar
  calendarInvite: {
    perInvite: 0.1,
    description: 'Calendar invite creation'
  }
};

/**
 * Get credit package by ID
 */
export function getCreditPackage(packageId) {
  return CREDIT_PACKAGES[packageId] || null;
}

/**
 * Calculate credit cost for an action
 */
export function calculateCreditCost(action, quantity = 1) {
  const cost = CREDIT_COSTS[action];
  if (!cost) {
    throw new Error(`Unknown action: ${action}`);
  }

  const unitCost = cost.perMessage || cost.perMinute || cost.perEmail || cost.perExecution || cost.perInvite;
  return unitCost * quantity;
}

/**
 * Check if user has enough credits
 */
export function hasEnoughCredits(userCredits, action, quantity = 1) {
  const cost = calculateCreditCost(action, quantity);
  return userCredits >= cost;
}

export default {
  CREDIT_PACKAGES,
  CREDIT_COSTS,
  getCreditPackage,
  calculateCreditCost,
  hasEnoughCredits
};
