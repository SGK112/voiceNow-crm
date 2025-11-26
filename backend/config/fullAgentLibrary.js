/**
 * Full Agent Library - Complete collection of all agent types
 * Voice, SMS/MMS, Email, Marketing, Social Media, and more
 */

export const VOICE_AGENTS = {
  // Inbound Voice Agents
  'inbound-receptionist': {
    id: 'inbound-receptionist',
    name: '24/7 Virtual Receptionist',
    description: 'Professional AI receptionist answers all your calls, routes to the right person, takes messages',
    category: 'voice-inbound',
    icon: '📞',
    tier: 'professional',
    rating: 4.9,
    downloads: 3200,
    price: { monthly: 149, perCall: 0.10 },
    features: [
      'Answers 24/7',
      'Call routing',
      'Message taking',
      'Appointment scheduling',
      'CRM integration',
      'Voicemail transcription'
    ]
  },

  'support-helpline': {
    id: 'support-helpline',
    name: 'Customer Support Helpline',
    description: 'AI support agent handles common questions, troubleshoots issues, creates tickets',
    category: 'voice-inbound',
    icon: '🎧',
    tier: 'professional',
    rating: 4.8,
    downloads: 2100,
    price: { monthly: 199, perCall: 0.12 },
    features: [
      'FAQ handling',
      'Troubleshooting',
      'Ticket creation',
      'Knowledge base access',
      'Escalation to humans',
      'Call transcripts'
    ]
  },

  'order-taking': {
    id: 'order-taking',
    name: 'Phone Order Agent',
    description: 'Takes customer orders over the phone, processes payments, sends confirmations',
    category: 'voice-inbound',
    icon: '🛒',
    tier: 'professional',
    rating: 4.7,
    downloads: 1650,
    price: { monthly: 199, perCall: 0.15 },
    features: [
      'Order processing',
      'Payment collection',
      'Order confirmation',
      'Inventory checks',
      'Upsell suggestions',
      'Stripe integration'
    ]
  },

  // Outbound Voice Agents
  'sales-outreach': {
    id: 'sales-outreach',
    name: 'Outbound Sales Agent',
    description: 'Cold calls prospects, qualifies leads, books demos, follows up automatically',
    category: 'voice-outbound',
    icon: '📈',
    tier: 'enterprise',
    rating: 4.9,
    downloads: 1980,
    price: { monthly: 299, perCall: 0.18 },
    features: [
      'Lead qualification',
      'Demo booking',
      'Objection handling',
      'CRM sync',
      'Follow-up sequences',
      'Call recording'
    ]
  },

  'appointment-reminders': {
    id: 'appointment-reminders',
    name: 'Appointment Reminder Calls',
    description: 'Calls customers to confirm appointments, reduces no-shows by 70%',
    category: 'voice-outbound',
    icon: '⏰',
    tier: 'starter',
    rating: 4.8,
    downloads: 2800,
    price: { monthly: 79, perCall: 0.05 },
    features: [
      '24hr reminders',
      'Easy rescheduling',
      'Confirmation tracking',
      'SMS backup',
      'Calendar sync',
      'No-show reduction'
    ]
  },

  'customer-surveys': {
    id: 'customer-surveys',
    name: 'Customer Survey Agent',
    description: 'Conducts post-service surveys, collects feedback, measures satisfaction',
    category: 'voice-outbound',
    icon: '📊',
    tier: 'professional',
    rating: 4.6,
    downloads: 1200,
    price: { monthly: 129, perCall: 0.08 },
    features: [
      'Custom surveys',
      'NPS scoring',
      'Sentiment analysis',
      'Data export',
      'Automated follow-up',
      'Analytics dashboard'
    ]
  },

  'payment-collections': {
    id: 'payment-collections',
    name: 'Payment Collection Agent',
    description: 'Professional collection calls, payment plan negotiations, maintains relationships',
    category: 'voice-outbound',
    icon: '💰',
    tier: 'professional',
    rating: 4.7,
    downloads: 890,
    price: { monthly: 149, percentCollected: 5 },
    features: [
      'Friendly reminders',
      'Payment plans',
      'Link sharing',
      'Status tracking',
      'Escalation rules',
      'QuickBooks sync'
    ]
  }
};

export const SMS_MMS_AGENTS = {
  'sms-marketing-campaigns': {
    id: 'sms-marketing-campaigns',
    name: 'SMS Marketing Campaigns',
    description: 'Automated SMS campaigns with personalization, A/B testing, and analytics',
    category: 'sms-marketing',
    icon: '📱',
    tier: 'professional',
    rating: 4.9,
    downloads: 3500,
    price: { monthly: 99, perMessage: 0.02 },
    features: [
      'Bulk SMS sending',
      'Personalization',
      'A/B testing',
      'Link tracking',
      'Opt-out handling',
      'Compliance (TCPA)'
    ]
  },

  'sms-appointment-reminders': {
    id: 'sms-appointment-reminders',
    name: 'SMS Appointment Reminders',
    description: 'Automated appointment reminders, confirmations, and rescheduling via text',
    category: 'sms-service',
    icon: '📅',
    tier: 'starter',
    rating: 4.8,
    downloads: 4200,
    price: { monthly: 49, perMessage: 0.015 },
    features: [
      'Auto reminders',
      'Confirm with reply',
      'Reschedule link',
      'Calendar integration',
      'Timezone handling',
      'Multi-language'
    ]
  },

  'sms-customer-service': {
    id: 'sms-customer-service',
    name: 'SMS Customer Service Bot',
    description: 'AI-powered SMS bot answers questions, provides support, creates tickets',
    category: 'sms-service',
    icon: '💬',
    tier: 'professional',
    rating: 4.7,
    downloads: 2100,
    price: { monthly: 149, perMessage: 0.03 },
    features: [
      'AI responses',
      'FAQ automation',
      'Ticket creation',
      'Human handoff',
      'Knowledge base',
      '24/7 availability'
    ]
  },

  'sms-order-updates': {
    id: 'sms-order-updates',
    name: 'Order Status Updates (SMS)',
    description: 'Proactive SMS notifications for order confirmations, shipping, delivery',
    category: 'sms-transactional',
    icon: '📦',
    tier: 'professional',
    rating: 4.9,
    downloads: 3800,
    price: { monthly: 79, perMessage: 0.02 },
    features: [
      'Order confirmation',
      'Shipping updates',
      'Delivery alerts',
      'Tracking links',
      'Carrier integration',
      'Branded messages'
    ]
  },

  'mms-visual-marketing': {
    id: 'mms-visual-marketing',
    name: 'MMS Visual Marketing',
    description: 'Send MMS with images, videos, GIFs for higher engagement campaigns',
    category: 'mms-marketing',
    icon: '🖼️',
    tier: 'professional',
    rating: 4.8,
    downloads: 1650,
    price: { monthly: 129, perMessage: 0.05 },
    features: [
      'Image/video MMS',
      'GIF support',
      'Product showcases',
      'Event invites',
      'Analytics',
      'Link tracking'
    ]
  },

  'sms-two-way-conversations': {
    id: 'sms-two-way-conversations',
    name: 'Two-Way SMS Conversations',
    description: 'Back-and-forth SMS conversations with customers, team inbox',
    category: 'sms-service',
    icon: '💬',
    tier: 'professional',
    rating: 4.7,
    downloads: 2400,
    price: { monthly: 99, perMessage: 0.02 },
    features: [
      'Shared inbox',
      'Team assignment',
      'Auto-responses',
      'Conversation history',
      'Mobile app',
      'Canned responses'
    ]
  }
};

export const EMAIL_AGENTS = {
  'email-drip-campaigns': {
    id: 'email-drip-campaigns',
    name: 'Email Drip Campaigns',
    description: 'Automated email sequences based on triggers, behaviors, and schedules',
    category: 'email-marketing',
    icon: '📧',
    tier: 'professional',
    rating: 4.9,
    downloads: 4500,
    price: { monthly: 79, perEmail: 0.001 },
    features: [
      'Drip sequences',
      'Behavior triggers',
      'A/B testing',
      'Open/click tracking',
      'Personalization',
      'Template library'
    ]
  },

  'email-newsletter': {
    id: 'email-newsletter',
    name: 'Newsletter Automation',
    description: 'Beautiful newsletters with drag-and-drop builder, analytics, list management',
    category: 'email-marketing',
    icon: '📰',
    tier: 'starter',
    rating: 4.7,
    downloads: 5200,
    price: { monthly: 49, perEmail: 0.0008 },
    features: [
      'Drag-drop builder',
      'Mobile responsive',
      'List segmentation',
      'Send scheduling',
      'Analytics dashboard',
      'Unsubscribe handling'
    ]
  },

  'email-transactional': {
    id: 'email-transactional',
    name: 'Transactional Emails',
    description: 'Order confirmations, receipts, shipping notifications, password resets',
    category: 'email-transactional',
    icon: '✉️',
    tier: 'starter',
    rating: 4.9,
    downloads: 6800,
    price: { monthly: 29, perEmail: 0.0005 },
    features: [
      'Instant delivery',
      'Custom templates',
      'Dynamic content',
      'Tracking/logs',
      'High deliverability',
      'API integration'
    ]
  },

  'email-lead-nurture': {
    id: 'email-lead-nurture',
    name: 'Lead Nurture Sequences',
    description: 'Automated lead nurturing with scoring, segmentation, and sales handoff',
    category: 'email-sales',
    icon: '🎯',
    tier: 'professional',
    rating: 4.8,
    downloads: 3200,
    price: { monthly: 149, perEmail: 0.002 },
    features: [
      'Lead scoring',
      'Engagement tracking',
      'Sales alerts',
      'CRM sync',
      'Custom triggers',
      'Conversion tracking'
    ]
  },

  'email-winback': {
    id: 'email-winback',
    name: 'Win-Back Campaigns',
    description: 'Re-engage inactive customers with special offers and personalized messages',
    category: 'email-retention',
    icon: '🔄',
    tier: 'professional',
    rating: 4.6,
    downloads: 1800,
    price: { monthly: 99, perEmail: 0.0015 },
    features: [
      'Inactive detection',
      'Special offers',
      'Personalization',
      'Win-back tracking',
      'Segment testing',
      'ROI analytics'
    ]
  },

  'email-abandoned-cart': {
    id: 'email-abandoned-cart',
    name: 'Abandoned Cart Recovery',
    description: 'Recover lost sales with automated cart abandonment emails',
    category: 'email-ecommerce',
    icon: '🛒',
    tier: 'professional',
    rating: 4.9,
    downloads: 4100,
    price: { monthly: 99, percentRecovered: 3 },
    features: [
      'Cart tracking',
      'Timed sequences',
      'Discount codes',
      'Product images',
      'Recovery analytics',
      'Shopify/WooCommerce'
    ]
  }
};

export const MARKETING_AGENTS = {
  'social-media-poster': {
    id: 'social-media-poster',
    name: 'Social Media Auto-Poster',
    description: 'Schedule and auto-post to Facebook, Instagram, Twitter, LinkedIn',
    category: 'social-media',
    icon: '📱',
    tier: 'professional',
    rating: 4.8,
    downloads: 3800,
    price: { monthly: 79, perPost: 0 },
    features: [
      'Multi-platform posting',
      'Content calendar',
      'Optimal timing',
      'Hashtag suggestions',
      'Analytics',
      'Content library'
    ]
  },

  'social-dm-responder': {
    id: 'social-dm-responder',
    name: 'Social Media DM Responder',
    description: 'AI responds to DMs on Instagram, Facebook, with human handoff',
    category: 'social-media',
    icon: '💬',
    tier: 'professional',
    rating: 4.7,
    downloads: 2100,
    price: { monthly: 149, perMessage: 0.02 },
    features: [
      'AI responses',
      'Multi-platform',
      'Human handoff',
      'Quick replies',
      'Conversation history',
      '24/7 availability'
    ]
  },

  'review-request-agent': {
    id: 'review-request-agent',
    name: 'Review Request Automation',
    description: 'Automatically request Google, Yelp, Facebook reviews after service',
    category: 'reputation',
    icon: '⭐',
    tier: 'starter',
    rating: 4.9,
    downloads: 4500,
    price: { monthly: 49, perRequest: 0 },
    features: [
      'Multi-platform requests',
      'Timed sending',
      'Review monitoring',
      'Positive routing',
      'Negative filtering',
      'Analytics'
    ]
  },

  'google-ads-leads': {
    id: 'google-ads-leads',
    name: 'Google Ads Lead Follow-Up',
    description: 'Instant follow-up on Google Ads leads via call, SMS, email',
    category: 'advertising',
    icon: '🎯',
    tier: 'professional',
    rating: 4.8,
    downloads: 2800,
    price: { monthly: 129, perLead: 0 },
    features: [
      'Instant follow-up',
      'Multi-channel (call/SMS/email)',
      'Lead qualification',
      'Conversion tracking',
      'A/B testing',
      'ROI reporting'
    ]
  },

  'facebook-lead-sync': {
    id: 'facebook-lead-sync',
    name: 'Facebook Lead Ads Sync',
    description: 'Auto-sync Facebook lead ads to CRM, instant follow-up',
    category: 'advertising',
    icon: '👥',
    tier: 'professional',
    rating: 4.7,
    downloads: 3200,
    price: { monthly: 99, perLead: 0 },
    features: [
      'Real-time sync',
      'CRM integration',
      'Auto-assignment',
      'Follow-up sequences',
      'Lead scoring',
      'Performance tracking'
    ]
  },

  'referral-program': {
    id: 'referral-program',
    name: 'Referral Program Automation',
    description: 'Automated referral program with tracking, rewards, and notifications',
    category: 'growth',
    icon: '🤝',
    tier: 'professional',
    rating: 4.8,
    downloads: 1900,
    price: { monthly: 149, perReferral: 0 },
    features: [
      'Referral tracking',
      'Unique codes',
      'Reward automation',
      'Email/SMS notifications',
      'Analytics',
      'Fraud detection'
    ]
  }
};

export const SPECIALIZED_AGENTS = {
  'appointment-booking-ai': {
    id: 'appointment-booking-ai',
    name: 'AI Appointment Scheduler',
    description: 'Natural language booking via voice, SMS, email, or chat',
    category: 'scheduling',
    icon: '📅',
    tier: 'professional',
    rating: 4.9,
    downloads: 5200,
    price: { monthly: 129, perBooking: 0 },
    features: [
      'Multi-channel booking',
      'Calendar sync',
      'Availability checking',
      'Timezone handling',
      'Buffer times',
      'Cancellation handling'
    ]
  },

  'inventory-alerts': {
    id: 'inventory-alerts',
    name: 'Inventory Alert Agent',
    description: 'Monitors inventory, sends low stock alerts, auto-reorders',
    category: 'operations',
    icon: '📦',
    tier: 'professional',
    rating: 4.7,
    downloads: 1400,
    price: { monthly: 99, perAlert: 0 },
    features: [
      'Real-time monitoring',
      'Low stock alerts',
      'Auto-reorder',
      'Vendor notifications',
      'Multiple channels',
      'Custom thresholds'
    ]
  },

  'employee-onboarding': {
    id: 'employee-onboarding',
    name: 'Employee Onboarding Agent',
    description: 'Automates new hire onboarding with task lists, training, check-ins',
    category: 'hr',
    icon: '👔',
    tier: 'enterprise',
    rating: 4.8,
    downloads: 980,
    price: { monthly: 199, perEmployee: 0 },
    features: [
      'Welcome sequences',
      'Task automation',
      'Training tracking',
      'Check-in reminders',
      'Document collection',
      'Progress reporting'
    ]
  },

  'event-registration': {
    id: 'event-registration',
    name: 'Event Registration Agent',
    description: 'Event registration, confirmation, reminders, check-in management',
    category: 'events',
    icon: '🎟️',
    tier: 'professional',
    rating: 4.7,
    downloads: 1650,
    price: { monthly: 99, perAttendee: 0 },
    features: [
      'Registration forms',
      'Payment processing',
      'Email confirmations',
      'Calendar invites',
      'Reminders',
      'Check-in app'
    ]
  },

  'web-form-leads': {
    id: 'web-form-leads',
    name: 'Website Form Lead Handler',
    description: 'Instant response to website form submissions via call/SMS/email',
    category: 'lead-gen',
    icon: '🌐',
    tier: 'starter',
    rating: 4.9,
    downloads: 6200,
    price: { monthly: 49, perLead: 0 },
    features: [
      'Instant response',
      'Multi-channel follow-up',
      'Lead routing',
      'CRM sync',
      'Spam filtering',
      'Response templates'
    ]
  },

  'chatbot-to-human': {
    id: 'chatbot-to-human',
    name: 'Chatbot with Human Handoff',
    description: 'AI chatbot handles common questions, seamlessly hands off to humans',
    category: 'support',
    icon: '🤖',
    tier: 'professional',
    rating: 4.8,
    downloads: 4100,
    price: { monthly: 149, perConversation: 0.05 },
    features: [
      'AI conversations',
      'Smart handoff',
      'Team inbox',
      'Knowledge base',
      'Multi-language',
      '24/7 availability'
    ]
  }
};

// Shopify/E-commerce Agents
export const SHOPIFY_AGENTS = {
  'shopify-order-status': {
    id: 'shopify-order-status',
    name: 'Shopify Order Status Agent',
    description: 'AI agent answers "Where\'s my order?" via voice or SMS with real-time Shopify data',
    category: 'shopify-voice',
    icon: '📦',
    tier: 'professional',
    rating: 4.9,
    downloads: 4200,
    price: { monthly: 149, perCall: 0.08 },
    features: [
      'Order lookup by # or email',
      'Real-time tracking info',
      'Delivery estimates',
      'Voice & SMS support',
      'Multi-language',
      'Human handoff'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-customer-support': {
    id: 'shopify-customer-support',
    name: 'Shopify Customer Support Agent',
    description: 'Handle returns, exchanges, and order issues automatically via voice/SMS',
    category: 'shopify-voice',
    icon: '🎧',
    tier: 'professional',
    rating: 4.8,
    downloads: 3100,
    price: { monthly: 199, perCall: 0.12 },
    features: [
      'Return requests',
      'Exchange processing',
      'Refund status',
      'Order modifications',
      'Complaint handling',
      'Escalation rules'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-abandoned-cart': {
    id: 'shopify-abandoned-cart',
    name: 'Shopify Cart Recovery Agent',
    description: 'Recover abandoned carts with personalized SMS/voice follow-ups',
    category: 'shopify-marketing',
    icon: '🛒',
    tier: 'professional',
    rating: 4.9,
    downloads: 5800,
    price: { monthly: 129, percentRecovered: 4 },
    features: [
      'SMS cart reminders',
      'Voice call recovery',
      'Discount offers',
      'Product images (MMS)',
      'Timing optimization',
      'Recovery analytics'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-order-confirmation': {
    id: 'shopify-order-confirmation',
    name: 'Shopify Order Confirmation Calls',
    description: 'Automated voice calls to confirm orders and upsell',
    category: 'shopify-voice',
    icon: '✅',
    tier: 'starter',
    rating: 4.7,
    downloads: 2400,
    price: { monthly: 79, perCall: 0.05 },
    features: [
      'Order confirmation',
      'Delivery time estimate',
      'Upsell suggestions',
      'Special offers',
      'Review requests',
      'Branded experience'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-inventory-alerts': {
    id: 'shopify-inventory-alerts',
    name: 'Shopify Inventory Alert Agent',
    description: 'Low stock alerts via SMS/voice, auto-notify when products back in stock',
    category: 'shopify-operations',
    icon: '📊',
    tier: 'professional',
    rating: 4.8,
    downloads: 1900,
    price: { monthly: 99, perAlert: 0 },
    features: [
      'Low stock SMS alerts',
      'Back-in-stock notifications',
      'Reorder reminders',
      'Custom thresholds',
      'Vendor notifications',
      'Daily reports'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-shipping-updates': {
    id: 'shopify-shipping-updates',
    name: 'Shopify Shipping Updates Agent',
    description: 'Proactive shipping and delivery notifications via SMS',
    category: 'shopify-sms',
    icon: '🚚',
    tier: 'starter',
    rating: 4.9,
    downloads: 6200,
    price: { monthly: 69, perMessage: 0.02 },
    features: [
      'Shipped notifications',
      'Tracking links',
      'Delivery alerts',
      'Delivery exceptions',
      'Signature required',
      'Carrier integration'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-product-inquiry': {
    id: 'shopify-product-inquiry',
    name: 'Shopify Product Inquiry Agent',
    description: 'AI agent answers product questions via voice/SMS with store catalog data',
    category: 'shopify-voice',
    icon: '🏷️',
    tier: 'professional',
    rating: 4.7,
    downloads: 2800,
    price: { monthly: 149, perCall: 0.10 },
    features: [
      'Product Q&A',
      'Availability checks',
      'Size/color options',
      'Price inquiries',
      'Recommendations',
      'Add to cart links'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  },

  'shopify-review-collector': {
    id: 'shopify-review-collector',
    name: 'Shopify Review Collector Agent',
    description: 'Automated SMS/voice review requests after delivery',
    category: 'shopify-marketing',
    icon: '⭐',
    tier: 'starter',
    rating: 4.8,
    downloads: 4500,
    price: { monthly: 59, perRequest: 0 },
    features: [
      'Timed review requests',
      'Photo review prompts',
      'Incentive offers',
      'Negative feedback routing',
      'Multi-platform (Shopify/Google)',
      'Follow-up sequences'
    ],
    requiredIntegrations: ['shopify', 'twilio']
  }
};

// Export combined library
export const FULL_AGENT_LIBRARY = {
  voice: VOICE_AGENTS,
  sms: SMS_MMS_AGENTS,
  email: EMAIL_AGENTS,
  marketing: MARKETING_AGENTS,
  specialized: SPECIALIZED_AGENTS,
  shopify: SHOPIFY_AGENTS
};

// Category definitions
export const AGENT_CATEGORIES = [
  { id: 'all', name: 'All Agents', icon: '🎯' },
  { id: 'voice', name: 'Voice Agents', icon: '📞', count: Object.keys(VOICE_AGENTS).length },
  { id: 'sms', name: 'SMS/MMS Agents', icon: '📱', count: Object.keys(SMS_MMS_AGENTS).length },
  { id: 'email', name: 'Email Agents', icon: '📧', count: Object.keys(EMAIL_AGENTS).length },
  { id: 'marketing', name: 'Marketing & Social', icon: '📈', count: Object.keys(MARKETING_AGENTS).length },
  { id: 'specialized', name: 'Specialized', icon: '⚡', count: Object.keys(SPECIALIZED_AGENTS).length },
  { id: 'shopify', name: 'Shopify/E-commerce', icon: '🛍️', count: Object.keys(SHOPIFY_AGENTS).length }
];

export default FULL_AGENT_LIBRARY;
