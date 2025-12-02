/**
 * VoiceNow CRM Product Knowledge Base
 * Complete reference for sales agents with pricing, features, and company info
 */

export const COMPANY_INFO = {
  name: 'Remodely.ai',
  product: 'VoiceNow CRM',
  tagline: 'AI-Powered Voice Agents for 24/7 Lead Engagement',
  website: 'https://remodely.ai',
  phone: '+1 (602) 833-7194',
  email: 'help.remodely@gmail.com',
  founded: '2024',
  headquarters: 'Phoenix, Arizona',
  mission: 'Helping service businesses never miss a lead with AI voice agents that sound human and work 24/7',

  description: `VoiceNow CRM is an AI-powered customer relationship management platform designed specifically for service businesses.
Our flagship feature is the AI Voice Agent that answers calls 24/7, qualifies leads, books appointments, and follows up automatically.
Unlike traditional answering services, VoiceNow AI sounds natural, understands context, and integrates directly with your CRM.`
};

export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 97,
    billingPeriod: 'month',
    yearlyPrice: 970, // Save 2 months
    yearlyDiscount: '17%',
    tagline: 'Perfect for solo operators and small teams',
    idealFor: ['Solo contractors', 'Small service businesses', 'Testing AI voice technology'],
    features: [
      '1 AI Voice Agent',
      '100 call minutes/month',
      '500 SMS messages/month',
      'Basic CRM dashboard',
      'Lead capture & qualification',
      'Appointment booking',
      'Email notifications',
      'Mobile app access',
      'Standard voice (English)',
      'Business hours support',
      '14-day free trial'
    ],
    limitations: [
      'Single agent only',
      'Limited analytics',
      'No custom voice training'
    ]
  },

  professional: {
    name: 'Professional',
    price: 297,
    billingPeriod: 'month',
    yearlyPrice: 2970, // Save 2 months
    yearlyDiscount: '17%',
    tagline: 'For growing businesses with multiple locations',
    mostPopular: true,
    idealFor: ['Multi-location businesses', 'Roofing companies', 'HVAC contractors', 'Plumbers', 'Electricians'],
    features: [
      'Up to 5 AI Voice Agents',
      '500 call minutes/month',
      '2,500 SMS messages/month',
      'Full CRM with pipeline view',
      'Advanced lead scoring',
      'Multi-location support',
      'Custom call scripts',
      'Workflow automation',
      'Email & SMS sequences',
      'Zapier integration',
      'Google Calendar sync',
      'Call recording & transcripts',
      'Analytics dashboard',
      'Priority support',
      '14-day free trial'
    ],
    limitations: [
      '5 agent limit',
      'Standard integrations only'
    ]
  },

  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    billingPeriod: 'month',
    tagline: 'Unlimited scale with dedicated support',
    idealFor: ['Large franchises', 'Call centers', 'Multi-brand operations', 'High-volume businesses'],
    features: [
      'Unlimited AI Voice Agents',
      'Unlimited call minutes',
      'Unlimited SMS messages',
      'Custom voice training/cloning',
      'White-label options',
      'Dedicated account manager',
      'Custom integrations',
      'API access',
      'SLA guarantee (99.9% uptime)',
      'Advanced reporting & analytics',
      'Multi-tenant dashboard',
      'SSO/SAML authentication',
      'Custom workflows',
      'Onboarding & training',
      '24/7 priority support'
    ],
    limitations: []
  }
};

export const ADD_ONS = {
  extraMinutes: {
    name: 'Additional Call Minutes',
    price: 0.12,
    unit: 'per minute',
    description: 'Add more call minutes beyond your plan limit'
  },
  extraSMS: {
    name: 'Additional SMS Messages',
    price: 0.02,
    unit: 'per message',
    description: 'Add more SMS messages beyond your plan limit'
  },
  voiceCloning: {
    name: 'Custom Voice Cloning',
    price: 500,
    type: 'one-time',
    description: 'Train the AI to use your own voice or a custom voice'
  },
  additionalAgent: {
    name: 'Additional AI Agent',
    price: 49,
    unit: 'per month',
    description: 'Add another AI voice agent to your account'
  },
  spanishLanguage: {
    name: 'Spanish Language Support',
    price: 49,
    unit: 'per month',
    description: 'Enable Spanish language for your AI agents'
  },
  zapierPremium: {
    name: 'Zapier Premium Integrations',
    price: 29,
    unit: 'per month',
    description: 'Access to premium Zapier workflows and automations'
  }
};

export const FEATURES = {
  aiVoiceAgent: {
    name: '24/7 AI Voice Agent',
    description: 'Never miss a lead. Our AI answers calls instantly, even at 3 AM.',
    benefits: [
      'Answers in 1-2 rings',
      'Sounds natural and conversational',
      'Handles objections intelligently',
      'Qualifies leads in real-time',
      'Books appointments on the spot'
    ]
  },
  speedToLead: {
    name: 'Speed-to-Lead Technology',
    description: 'Respond to leads in seconds, not hours. Industry data shows 78% of deals go to the first responder.',
    benefits: [
      'Instant callback within 60 seconds',
      'Automatic lead prioritization',
      'Hot lead alerts to your phone',
      'No more missed opportunities'
    ]
  },
  appointmentBooking: {
    name: 'Smart Appointment Booking',
    description: 'AI books appointments directly to your calendar with intelligent time slot selection.',
    benefits: [
      'Google Calendar integration',
      'Timezone-aware scheduling',
      'Conflict detection',
      'Automatic reminders',
      'Reschedule handling'
    ]
  },
  leadQualification: {
    name: 'Lead Qualification',
    description: 'AI asks the right questions to qualify leads before they reach your sales team.',
    benefits: [
      'Custom qualification questions',
      'Budget/timeline assessment',
      'Project scope understanding',
      'Priority scoring',
      'Automatic routing to right team member'
    ]
  },
  crmIntegration: {
    name: 'Built-in CRM',
    description: 'Full-featured CRM designed for service businesses with pipeline management.',
    benefits: [
      'Visual pipeline stages',
      'Contact management',
      'Deal tracking',
      'Task management',
      'Notes & activity history'
    ]
  },
  smsAutomation: {
    name: 'SMS Automation',
    description: 'Automated text message sequences for lead nurturing and appointment reminders.',
    benefits: [
      'Drip campaigns',
      'Appointment confirmations',
      'Review requests',
      'Two-way texting',
      'Bulk messaging'
    ]
  },
  callRecording: {
    name: 'Call Recording & Transcription',
    description: 'Every call is recorded and transcribed for training and quality assurance.',
    benefits: [
      'Full call recordings',
      'AI-powered transcription',
      'Searchable conversations',
      'Sentiment analysis',
      'Key moment highlights'
    ]
  },
  analytics: {
    name: 'Analytics Dashboard',
    description: 'See exactly how your AI is performing with detailed metrics and insights.',
    benefits: [
      'Call volume tracking',
      'Conversion rates',
      'Lead source analysis',
      'Agent performance',
      'Revenue attribution'
    ]
  }
};

export const INDUSTRIES = {
  roofing: {
    name: 'Roofing',
    pain_points: ['Missed storm leads', 'Slow response time', 'Insurance claim complexity'],
    value_props: [
      'Instant storm damage lead capture',
      'Insurance claim qualification',
      '24/7 emergency response handling',
      'Drone inspection scheduling'
    ],
    roi_example: 'Roofing companies typically close 3-5 extra deals per month worth $15,000-50,000 each'
  },
  hvac: {
    name: 'HVAC',
    pain_points: ['After-hours emergencies', 'Seasonal call spikes', 'Maintenance plan management'],
    value_props: [
      'Emergency service dispatch',
      'Maintenance reminder automation',
      'Seasonal promotion handling',
      'Warranty verification'
    ],
    roi_example: 'HVAC companies see 40% reduction in missed after-hours calls worth $200-500 each'
  },
  plumbing: {
    name: 'Plumbing',
    pain_points: ['24/7 emergency calls', 'Dispatch coordination', 'Quote followup'],
    value_props: [
      'Emergency triage and dispatch',
      'Same-day appointment booking',
      'Service area verification',
      'Price estimate guidance'
    ],
    roi_example: 'Plumbers capture 60% more weekend leads worth $300-1,200 per job'
  },
  electrical: {
    name: 'Electrical',
    pain_points: ['Commercial vs residential routing', 'Permit coordination', 'Safety compliance'],
    value_props: [
      'Commercial/residential lead routing',
      'Job scope qualification',
      'Emergency response handling',
      'Panel upgrade consultations'
    ],
    roi_example: 'Electricians report 25% increase in commercial leads worth $2,000-10,000 each'
  },
  landscaping: {
    name: 'Landscaping',
    pain_points: ['Seasonal demand', 'Estimate scheduling', 'Recurring service management'],
    value_props: [
      'Seasonal promotion handling',
      'Property size qualification',
      'Recurring service scheduling',
      'Weather-aware booking'
    ],
    roi_example: 'Landscapers see 35% improvement in estimate-to-close ratio'
  },
  solar: {
    name: 'Solar',
    pain_points: ['Long sales cycles', 'Utility bill analysis', 'Incentive education'],
    value_props: [
      'Lead qualification for solar readiness',
      'Roof suitability pre-screening',
      'Incentive/rebate education',
      'Site survey scheduling'
    ],
    roi_example: 'Solar companies reduce cost per acquisition by 40% with pre-qualified leads'
  },
  homeServices: {
    name: 'General Home Services',
    pain_points: ['Diverse service offerings', 'Quote coordination', 'Customer retention'],
    value_props: [
      'Multi-service inquiry handling',
      'Cross-sell opportunity detection',
      'Maintenance program enrollment',
      'Referral program promotion'
    ],
    roi_example: 'Home service companies see 30% increase in repeat customer bookings'
  }
};

export const OBJECTION_HANDLERS = {
  price: {
    objection: "It's too expensive",
    response: "I totally get that - budget is important. Let me put it this way: how many calls do you miss per month? Even 2-3 missed calls that turn into jobs pays for the entire system. Most of our customers see ROI in the first week. Plus, you can try it free for 14 days with no commitment."
  },

  aiQuality: {
    objection: "AI won't sound as good as a real person",
    response: "That's what everyone thinks until they hear it! Our AI actually sounds incredibly natural - most callers don't even realize they're talking to AI. Want me to call you right now so you can hear it for yourself? It takes 30 seconds."
  },

  complexity: {
    objection: "It sounds complicated to set up",
    response: "Actually, you'd be surprised how easy it is. We can have you up and running in literally 5 minutes. We handle all the technical stuff - you just tell us what you want the AI to say and how you want appointments booked. Many of our customers are not tech-savvy at all."
  },

  timing: {
    objection: "Maybe later / not the right time",
    response: "I hear you, but here's the thing - every day you wait is leads you're missing. And right now we have a special where you get 50 free call minutes to try it out. Why not grab the free trial and see if it works for you? No risk, no commitment."
  },

  existingSystem: {
    objection: "We already have an answering service",
    response: "That's great that you're already thinking about lead capture! The difference with VoiceNow is that our AI actually qualifies leads and books appointments - it doesn't just take messages. Plus it costs a fraction of human answering services. Most customers save 60-70% while getting better results."
  },

  trust: {
    objection: "How do I know this works?",
    response: "Great question - I'd be skeptical too! We have hundreds of contractors using VoiceNow right now. I can share some case studies if you want, or better yet, try the free trial and see results for yourself. We're based right here in Phoenix and we're not going anywhere."
  }
};

export const CASE_STUDIES = {
  roofingCompany: {
    company: 'Premier Roofing Solutions',
    industry: 'Roofing',
    location: 'Phoenix, AZ',
    challenge: 'Missing 40% of after-hours storm damage calls',
    solution: 'Deployed VoiceNow AI to answer all calls 24/7',
    results: [
      '92% of calls answered on first ring',
      '47 additional leads captured per month',
      '$127,000 in new revenue first quarter',
      'ROI achieved in first 2 weeks'
    ]
  },
  hvacContractor: {
    company: 'CoolBreeze HVAC',
    industry: 'HVAC',
    location: 'Scottsdale, AZ',
    challenge: 'Overwhelmed during summer season, losing emergency calls',
    solution: 'VoiceNow handles overflow and after-hours, qualifies urgency',
    results: [
      '67% reduction in missed emergency calls',
      'Average response time dropped to 47 seconds',
      '23% increase in maintenance plan signups',
      'Saved $4,200/month vs. answering service'
    ]
  },
  plumbingService: {
    company: 'FastFlow Plumbing',
    industry: 'Plumbing',
    location: 'Mesa, AZ',
    challenge: 'Owner answering calls at all hours, burnout',
    solution: 'VoiceNow AI handles all initial calls, books appointments',
    results: [
      'Owner reclaimed 20+ hours per week',
      'Lead conversion improved by 34%',
      'Customer satisfaction score up 15%',
      'Expanded to second service truck'
    ]
  }
};

export const FAQ = {
  howDoesItWork: {
    question: 'How does the AI voice agent work?',
    answer: 'When someone calls your business number, VoiceNow AI answers instantly. The AI engages in natural conversation, asks qualifying questions you choose, and either books an appointment, captures lead info, or routes urgent calls to you. All info is saved in your CRM automatically.'
  },

  setupTime: {
    question: 'How long does setup take?',
    answer: 'Most customers are live in 5-10 minutes. You just connect your phone number, customize your greeting, and set your calendar preferences. Our team can also do it for you if you prefer hands-off setup.'
  },

  existingNumber: {
    question: 'Can I keep my existing business number?',
    answer: 'Yes! We can forward your existing number to VoiceNow, or you can port it over completely. Either way, your customers never see a new number.'
  },

  afterHours: {
    question: 'What happens to calls after business hours?',
    answer: 'VoiceNow answers 24/7/365. You set your preferences - the AI can book next-day appointments, capture lead info for morning follow-up, or even route true emergencies to your cell phone.'
  },

  callerKnows: {
    question: 'Will callers know they\'re talking to AI?',
    answer: 'Most callers don\'t realize it\'s AI because the voice is so natural. You can choose to disclose it or not - we leave that up to you. Either way, callers get instant service which is what matters most.'
  },

  languages: {
    question: 'Does it support Spanish?',
    answer: 'Yes! Spanish is available as an add-on. The AI can detect language preference and switch automatically, or you can have dedicated Spanish and English lines.'
  },

  cancellation: {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. No long-term contracts required. You can cancel anytime from your dashboard. We believe you\'ll stay because you love the results, not because you\'re locked in.'
  },

  trial: {
    question: 'Is there really a free trial?',
    answer: 'Yes! 14 days free with 50 bonus call minutes. No credit card required to start. You\'ll have full access to all features so you can see real results before deciding.'
  }
};

export const COMPETITIVE_ADVANTAGES = [
  {
    advantage: 'Speed',
    description: 'Answers in 1-2 rings while competitors take 4-6 rings or go to voicemail',
    impact: '90% of callers hang up after 6 rings'
  },
  {
    advantage: 'Natural Conversation',
    description: 'Our AI handles back-and-forth conversation, not just scripts',
    impact: 'Callers feel heard and understood'
  },
  {
    advantage: 'Built-in CRM',
    description: 'All-in-one platform vs. having to connect multiple tools',
    impact: 'Saves $200-500/month on separate CRM'
  },
  {
    advantage: 'Service Industry Focus',
    description: 'Built specifically for contractors and service businesses',
    impact: 'Templates and workflows ready to go'
  },
  {
    advantage: 'Real-Time Booking',
    description: 'AI books appointments while on the call, not after',
    impact: '3x higher conversion than callback systems'
  },
  {
    advantage: 'US-Based Support',
    description: 'Phoenix-based team available during business hours',
    impact: 'Quick resolution of any issues'
  }
];

export const PROMOTIONS = {
  current: {
    name: 'Launch Special',
    discount: '50 free bonus minutes',
    validUntil: 'Limited time',
    details: 'Start your 14-day trial and get 50 extra call minutes free'
  },
  referral: {
    name: 'Referral Program',
    reward: 'One free month',
    details: 'Refer a contractor friend, both get one month free when they sign up'
  }
};

// Export everything as a single knowledge base object
export const PRODUCT_KNOWLEDGE = {
  company: COMPANY_INFO,
  pricing: PRICING_PLANS,
  addOns: ADD_ONS,
  features: FEATURES,
  industries: INDUSTRIES,
  objectionHandlers: OBJECTION_HANDLERS,
  caseStudies: CASE_STUDIES,
  faq: FAQ,
  competitiveAdvantages: COMPETITIVE_ADVANTAGES,
  promotions: PROMOTIONS
};

export default PRODUCT_KNOWLEDGE;
