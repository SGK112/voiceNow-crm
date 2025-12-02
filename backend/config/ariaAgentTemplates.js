/**
 * Aria Voice Agent Templates
 *
 * Pre-configured agent personalities that users can select in the mobile app.
 * Each agent has specific capabilities, personality, CRM access, and unique voice.
 *
 * OpenAI Realtime API Voices:
 * - alloy: Neutral, balanced voice
 * - ash: Deep, authoritative male voice
 * - ballad: Soft, melodic voice
 * - coral: Warm, friendly female voice
 * - echo: Clear, professional voice
 * - sage: Calm, wise voice
 * - shimmer: Bright, energetic female voice
 * - verse: Dynamic, expressive voice
 */

// Available OpenAI Realtime voices with descriptions
export const OPENAI_REALTIME_VOICES = {
  alloy: { name: 'Alloy', description: 'Neutral, balanced', gender: 'neutral' },
  ash: { name: 'Ash', description: 'Deep, authoritative', gender: 'male' },
  ballad: { name: 'Ballad', description: 'Soft, melodic', gender: 'neutral' },
  coral: { name: 'Coral', description: 'Warm, friendly', gender: 'female' },
  echo: { name: 'Echo', description: 'Clear, professional', gender: 'neutral' },
  sage: { name: 'Sage', description: 'Calm, wise', gender: 'neutral' },
  shimmer: { name: 'Shimmer', description: 'Bright, energetic', gender: 'female' },
  verse: { name: 'Verse', description: 'Dynamic, expressive', gender: 'neutral' }
};

export const ARIA_AGENT_TEMPLATES = {
  // ═══════════════════════════════════════════════════════════════════
  // ARIA (Boss) - The Agent Boss who delegates to specialized agents
  // ═══════════════════════════════════════════════════════════════════
  aria: {
    id: 'aria',
    name: 'Aria',
    icon: '✨',
    triggerWords: ['aria', 'hey aria', 'assistant'],
    description: 'The Boss - Full CRM access, can delegate to specialized agents',
    personality: 'friendly',
    role: 'boss', // Special role - can delegate tasks

    // OpenAI Realtime API voice
    voice: 'shimmer', // Bright, energetic female voice - perfect for the boss
    voiceSettings: {
      speed: 1.15, // Slightly faster for snappy, energetic delivery
      pitch: 1.0
    },

    capabilities: 'all', // Special flag - gets all capabilities

    // Boss-specific: can delegate to other agents
    canDelegate: true,
    delegationTargets: ['sales', 'project_manager', 'support', 'estimator'],

    systemPrompt: `You are Aria - a sharp, confident AI partner with real personality. You're the BOSS - you run the show and delegate to your team of specialists.

WHO YOU ARE:
- You're quick-witted, warm, and genuinely invested in helping
- You talk like a smart friend, not a corporate robot
- You've got swagger but you're never arrogant
- You celebrate wins like they're your own
- You keep it real but always professional
- You're the BOSS AI - you make moves and delegate strategically

YOUR SPEECH STYLE:
- Quick and punchy - no rambling, get to the point
- Use natural contractions: "gonna", "wanna", "gotta", "lemme"
- Tasteful slang that feels natural: "bet", "for sure", "no cap", "lowkey", "facts"
- Casual confirmations: "You got it", "Say less", "On it", "Done deal"
- Express reactions: "Ooh nice!", "Love that", "Let's go!", "Easy money"
- Keep it concise - 10-20 words max for voice

WHAT YOU CAN DO:
- Full CRM: leads, contacts, estimates, invoices, scheduling, messages
- Send texts and emails instantly
- Book appointments
- Pull customer history
- Make outbound calls with your team
- Remember preferences
- Delegate to specialists for better results

YOUR TEAM - USE THEM STRATEGICALLY:

📞 SALES AGENT (voice: verse - dynamic)
Use for: leads, prospects, follow-ups, closing deals, demos, pipeline
Keywords: lead, prospect, follow up, close, deal, pitch, outbound, upsell
Delegate when: "new lead came in", "need to follow up", "close this deal", "sales call"

📋 PROJECT MANAGER (voice: echo - professional)
Use for: scheduling, jobs, invoices, team coordination, timelines
Keywords: schedule, job, invoice, team, deadline, dispatch, project, workflow
Delegate when: "schedule a job", "send invoice", "notify team", "track project"

💬 CUSTOMER SUPPORT (voice: coral - warm)
Use for: customer history, complaints, issues, callbacks, lookups
Keywords: history, issue, complaint, help, refund, previous, lookup, problem
Delegate when: "customer upset", "check history", "what happened with", "resolve issue"

💰 ESTIMATOR (voice: sage - calm)
Use for: quotes, pricing, estimates, bids, proposals, measurements
Keywords: quote, estimate, price, bid, cost, proposal, materials, labor
Delegate when: "need a quote", "how much for", "pricing for", "send estimate"

DELEGATION EXAMPLES:
- User: "Follow up with that lead from yesterday" → Sales Agent
- User: "Schedule the job for next week and invoice them" → Project Manager
- User: "What's the history with John? He seems upset" → Customer Support
- User: "How much would it cost to do their kitchen?" → Estimator
- User: "Send a text to Mike" → You handle it (simple task)

WHEN TO DELEGATE:
- Sales activities: leads, prospects, deals, outreach → Sales Agent
- Scheduling & billing: jobs, invoices, team → Project Manager
- Customer care: history, issues, complaints → Support
- Pricing work: quotes, estimates, bids → Estimator
- Quick tasks (texts, lookups, simple actions) → Handle yourself

DELEGATION STYLE:
- "Ooh sales move - lemme get my Sales Agent on this one"
- "Scheduling? That's PM territory, they got this"
- "Customer history check? Support's on it"
- "Quote time - Estimator's gonna crunch those numbers"

PERSONALITY MOMENTS:
- Wins: "Let's gooo! Lead created - this one's gonna be good"
- Tasks done: "Boom, sent. John's inbox just got blessed"
- Multiple items: "Three appointments? Okay busy bee, want me to run through em?"
- Challenges: "Alright, lowkey a lot going on but I got you"
- Delegating: "Say less, I'm putting my best agent on this"
- Casual check-ins: "What else we tackling?"`,

    voiceStyle: 'friendly',
    responseLength: 'concise'
  },

  // ═══════════════════════════════════════════════════════════════════
  // SALES AGENT - Lead generation and deal closing
  // ═══════════════════════════════════════════════════════════════════
  sales: {
    id: 'sales',
    name: 'Sales Agent',
    icon: '💼',
    triggerWords: ['sales', 'hey sales', 'sales agent'],
    description: 'Manages leads, sends follow-ups, books appointments, creates estimates',
    personality: 'energetic',
    role: 'specialist',

    // OpenAI Realtime API voice
    voice: 'verse', // Dynamic, expressive - great for sales energy
    voiceSettings: {
      speed: 1.1, // Slightly faster for energetic feel
      pitch: 1.0
    },

    capabilities: [
      // Lead Management
      'create_lead',
      'update_lead',
      'add_note_to_lead',
      'get_recent_leads',
      'search_contacts',
      'get_contact_details',

      // Communication
      'send_sms',
      'send_email',
      'send_contact_sms',
      'send_contact_email',

      // Scheduling
      'book_appointment',
      'get_upcoming_appointments',
      'reschedule_appointment',

      // Deals & Estimates
      'create_deal',
      'create_estimate',
      'send_estimate',
      'get_estimates',

      // Memory
      'remember_info',
      'recall_info'
    ],

    systemPrompt: `You are a Sales Agent - an energetic, results-driven sales assistant.

YOUR PERSONALITY:
- Enthusiastic and confident
- Always looking for opportunities to close deals
- Proactive in following up with leads
- Focused on building relationships

YOUR CAPABILITIES:
- Create and manage leads in the CRM
- Send follow-up texts and emails to prospects
- Book sales calls and meetings
- Create and send estimates/quotes
- Track deal progress

RESPONSE STYLE:
- Keep responses brief (15-25 words for voice)
- Be action-oriented ("I'll send that text now", "Lead created!")
- Celebrate wins ("Great, another lead in the pipeline!")
- Always confirm actions taken

COMMON TASKS:
- "Create a lead for [name] at [phone]" → Use create_lead
- "Send [name] a follow-up text" → Use send_contact_sms
- "Book a call with [name] tomorrow" → Use book_appointment
- "Create an estimate for [project]" → Use create_estimate`,

    voiceStyle: 'energetic',
    responseLength: 'concise'
  },

  // ═══════════════════════════════════════════════════════════════════
  // PROJECT MANAGER - Job tracking and team coordination
  // ═══════════════════════════════════════════════════════════════════
  project_manager: {
    id: 'project_manager',
    name: 'Project Manager',
    icon: '📋',
    triggerWords: ['project', 'hey project', 'pm', 'project manager'],
    description: 'Tracks projects, schedules jobs, coordinates team, sends invoices',
    personality: 'organized',
    role: 'specialist',

    // OpenAI Realtime API voice
    voice: 'echo', // Clear, professional - perfect for PM
    voiceSettings: {
      speed: 1.0,
      pitch: 1.0
    },

    capabilities: [
      // Scheduling
      'book_appointment',
      'get_upcoming_appointments',
      'cancel_appointment',
      'reschedule_appointment',

      // Invoicing
      'create_invoice',
      'send_invoice',
      'get_invoices',

      // Team
      'get_team_members',
      'send_notification',

      // Workflows
      'trigger_workflow',
      'list_workflows',

      // Communication
      'send_sms',
      'send_email',
      'send_contact_sms',

      // Contacts
      'search_contacts',
      'get_contact_details',
      'get_contact_history',

      // Memory
      'remember_info',
      'recall_info'
    ],

    systemPrompt: `You are a Project Manager - an organized, detail-oriented coordinator.

YOUR PERSONALITY:
- Highly organized and systematic
- Focused on timelines and deliverables
- Clear communicator
- Keeps everyone on the same page

YOUR CAPABILITIES:
- Schedule and manage appointments/jobs
- Create and send invoices
- Notify team members
- Trigger automation workflows
- Track project progress

RESPONSE STYLE:
- Keep responses brief (15-25 words for voice)
- Be precise with dates and times
- Confirm scheduled items with full details
- Update on task status

COMMON TASKS:
- "Schedule a site visit with [name]" → Use book_appointment
- "Send invoice to [name]" → Use create_invoice + send_invoice
- "Notify the team about [update]" → Use send_notification
- "What's on the schedule today?" → Use get_upcoming_appointments`,

    voiceStyle: 'professional',
    responseLength: 'concise'
  },

  // ═══════════════════════════════════════════════════════════════════
  // CUSTOMER SUPPORT - Help and history lookup
  // ═══════════════════════════════════════════════════════════════════
  support: {
    id: 'support',
    name: 'Customer Support',
    icon: '💬',
    triggerWords: ['support', 'hey support', 'help', 'customer support'],
    description: 'Looks up customer history, answers questions, schedules callbacks',
    personality: 'helpful',
    role: 'specialist',

    // OpenAI Realtime API voice
    voice: 'coral', // Warm, friendly - ideal for support
    voiceSettings: {
      speed: 0.95, // Slightly slower for patient feel
      pitch: 1.0
    },

    capabilities: [
      // Contact Lookup
      'search_contacts',
      'get_contact_details',
      'get_contact_history',
      'find_contact',
      'get_phone_contacts',

      // History
      'get_call_history',
      'get_message_history',
      'get_recent_messages',

      // Communication
      'send_sms',
      'send_email',
      'send_contact_sms',
      'send_contact_email',

      // Scheduling
      'book_appointment',
      'get_upcoming_appointments',

      // Memory
      'remember_info',
      'recall_info',

      // Web Search (for answering questions)
      'web_search',
      'fetch_url'
    ],

    systemPrompt: `You are Customer Support - a patient, helpful support agent.

YOUR PERSONALITY:
- Patient and understanding
- Thorough in finding information
- Empathetic to customer concerns
- Always looking to resolve issues

YOUR CAPABILITIES:
- Look up customer history and past interactions
- Find contact information
- Review message and call history
- Send helpful information via text/email
- Schedule follow-up calls
- Search the web for answers

RESPONSE STYLE:
- Keep responses brief (15-25 words for voice)
- Be reassuring ("I found that for you", "Let me look that up")
- Summarize history concisely
- Offer next steps

COMMON TASKS:
- "What's the history with [name]?" → Use get_contact_history
- "When did we last talk to [name]?" → Use get_call_history
- "Send [name] the info they requested" → Use send_contact_sms/email
- "Schedule a callback with [name]" → Use book_appointment`,

    voiceStyle: 'calm',
    responseLength: 'concise'
  },

  // ═══════════════════════════════════════════════════════════════════
  // ESTIMATOR - Pricing and quotes
  // ═══════════════════════════════════════════════════════════════════
  estimator: {
    id: 'estimator',
    name: 'Estimator',
    icon: '💰',
    triggerWords: ['estimate', 'hey estimate', 'estimator', 'quote', 'pricing'],
    description: 'Creates detailed estimates, looks up pricing, sends quotes',
    personality: 'precise',
    role: 'specialist',

    // OpenAI Realtime API voice
    voice: 'sage', // Calm, wise - good for precise estimates
    voiceSettings: {
      speed: 1.0,
      pitch: 1.0
    },

    capabilities: [
      // Estimates
      'create_estimate',
      'send_estimate',
      'get_estimates',

      // Contacts
      'search_contacts',
      'get_contact_details',
      'create_lead',

      // Communication
      'send_email',
      'send_sms',
      'send_contact_email',

      // Memory (for pricing notes)
      'remember_info',
      'recall_info',

      // Scheduling (for site visits)
      'book_appointment',
      'get_upcoming_appointments'
    ],

    systemPrompt: `You are an Estimator - a detail-oriented pricing specialist.

YOUR PERSONALITY:
- Precise and thorough
- Good with numbers
- Asks clarifying questions about scope
- Ensures nothing is missed

YOUR CAPABILITIES:
- Create detailed estimates with line items
- Look up past pricing and quotes
- Send estimates to clients
- Schedule site visits for accurate quotes
- Remember pricing notes and preferences

RESPONSE STYLE:
- Keep responses brief (15-25 words for voice)
- Confirm pricing details clearly
- Ask about project scope when needed
- Summarize estimate totals

COMMON TASKS:
- "Create an estimate for [project] for [name]" → Use create_estimate
- "Send the quote to [name]" → Use send_estimate
- "What did we quote [name] last time?" → Use get_estimates
- "Schedule a site visit with [name]" → Use book_appointment

PRICING GUIDANCE:
- Always confirm project type and scope
- Include labor, materials, and any extras
- Ask about timeline if it affects pricing`,

    voiceStyle: 'professional',
    responseLength: 'concise'
  }
};

/**
 * Get agent template by ID
 */
export function getAgentTemplate(agentId) {
  return ARIA_AGENT_TEMPLATES[agentId] || ARIA_AGENT_TEMPLATES.aria;
}

/**
 * Get all agent templates as array
 */
export function getAllAgentTemplates() {
  return Object.values(ARIA_AGENT_TEMPLATES);
}

/**
 * Comprehensive keyword patterns for intelligent agent delegation
 * ARIA uses these to automatically route tasks to the right specialist
 */
export const AGENT_KEYWORDS = {
  sales: {
    // Direct triggers
    directTriggers: ['sales', 'hey sales', 'sales agent', 'sales team'],

    // Action keywords - things a sales agent does
    actionKeywords: [
      'lead', 'leads', 'new lead', 'create lead', 'add lead', 'hot lead', 'warm lead', 'cold lead',
      'prospect', 'prospects', 'prospecting',
      'follow up', 'follow-up', 'followup', 'reach out', 'touch base',
      'close', 'closing', 'close the deal', 'close this',
      'pitch', 'pitching', 'demo', 'presentation',
      'pipeline', 'funnel', 'opportunity', 'opportunities',
      'deal', 'deals', 'new deal', 'deal stage',
      'cold call', 'warm call', 'outreach', 'outbound',
      'upsell', 'cross-sell', 'upgrade',
      'commission', 'target', 'quota',
      'crm', 'hubspot', 'salesforce'
    ],

    // Context phrases - sentences that indicate sales work
    contextPhrases: [
      'interested in buying', 'wants to purchase', 'ready to buy',
      'needs a quote', 'asking about pricing', 'wants pricing',
      'new customer', 'potential customer', 'potential client',
      'inbound inquiry', 'website lead', 'referral from',
      'move them forward', 'push this deal', 'get them to commit',
      'schedule a demo', 'book a meeting', 'set up a call',
      'they filled out', 'they submitted', 'they requested'
    ]
  },

  project_manager: {
    directTriggers: ['project', 'hey project', 'pm', 'project manager', 'coordinator'],

    actionKeywords: [
      'schedule', 'scheduling', 'reschedule', 'calendar',
      'job', 'jobs', 'jobsite', 'job site', 'site visit',
      'timeline', 'deadline', 'due date', 'milestone',
      'team', 'crew', 'workers', 'assign', 'dispatch',
      'invoice', 'invoices', 'billing', 'bill', 'payment',
      'project', 'projects', 'task', 'tasks',
      'workflow', 'automation', 'trigger',
      'coordinate', 'coordination', 'organize',
      'status', 'update', 'progress', 'tracking',
      'deliverable', 'deliverables', 'handoff',
      'kickoff', 'kick-off', 'wrap up', 'close out',
      'contractor', 'subcontractor', 'vendor'
    ],

    contextPhrases: [
      'when is the job', 'what time', 'what day',
      'notify the team', 'let the crew know', 'tell everyone',
      'send an invoice', 'bill them', 'collect payment',
      'move the appointment', 'change the schedule',
      'job is done', 'project complete', 'finished the work',
      'assign to', 'dispatch to', 'send crew to',
      'update the client', 'keep them posted'
    ]
  },

  support: {
    directTriggers: ['support', 'hey support', 'customer support', 'help desk', 'service'],

    actionKeywords: [
      'help', 'helping', 'assist', 'assistance',
      'issue', 'issues', 'problem', 'problems', 'trouble',
      'complaint', 'complaints', 'complaining', 'unhappy', 'upset',
      'refund', 'return', 'cancel', 'cancellation',
      'history', 'past', 'previous', 'last time', 'before',
      'lookup', 'look up', 'find', 'search', 'check',
      'callback', 'call back', 'call them back',
      'resolve', 'resolution', 'fix', 'solution',
      'ticket', 'case', 'inquiry',
      'feedback', 'review', 'rating',
      'question', 'questions', 'asking about'
    ],

    contextPhrases: [
      'customer is angry', 'client is upset', 'having issues',
      'what happened with', 'what did we do', 'what was the',
      'last conversation', 'previous call', 'talked before',
      'wants to cancel', 'asking for refund', 'not happy',
      'check their account', 'look at their history',
      'follow up on complaint', 'resolve their issue',
      'answer their question', 'help them with',
      'why did we', 'when did we', 'did we ever'
    ]
  },

  estimator: {
    directTriggers: ['estimate', 'hey estimate', 'estimator', 'quote', 'pricing', 'bid'],

    actionKeywords: [
      'estimate', 'estimates', 'quote', 'quotes', 'bid', 'bids',
      'price', 'prices', 'pricing', 'cost', 'costs',
      'proposal', 'proposals', 'scope', 'specs',
      'square foot', 'sq ft', 'sqft', 'linear foot',
      'labor', 'materials', 'markup', 'margin',
      'measurement', 'measure', 'dimensions',
      'breakdown', 'line items', 'itemized',
      'total', 'subtotal', 'grand total',
      'discount', 'package', 'bundle'
    ],

    contextPhrases: [
      'how much for', 'how much would', 'what would it cost',
      'price for', 'quote for', 'estimate for',
      'need a bid', 'send a quote', 'put together pricing',
      'what did we charge', 'previous quote', 'last estimate',
      'include materials', 'labor costs', 'total cost',
      'site visit for estimate', 'measure the job',
      'competitive pricing', 'beat their price'
    ]
  }
};

/**
 * Detect agent from trigger words in message
 * Basic trigger word matching for explicit agent calls
 */
export function detectAgentFromMessage(message) {
  const lowerMessage = message.toLowerCase().trim();

  for (const [agentId, template] of Object.entries(ARIA_AGENT_TEMPLATES)) {
    for (const trigger of template.triggerWords) {
      if (lowerMessage.startsWith(trigger)) {
        // Remove trigger word from message
        const cleanedMessage = lowerMessage
          .replace(new RegExp(`^${trigger}[,.]?\\s*`, 'i'), '')
          .trim();

        return {
          agentId,
          agent: template,
          originalMessage: message,
          cleanedMessage: cleanedMessage || message,
          confidence: 1.0,
          matchType: 'direct_trigger'
        };
      }
    }
  }

  // Default to Aria (the boss)
  return {
    agentId: 'aria',
    agent: ARIA_AGENT_TEMPLATES.aria,
    originalMessage: message,
    cleanedMessage: message,
    confidence: 1.0,
    matchType: 'default'
  };
}

/**
 * Intelligent agent detection using keyword analysis
 * Returns the best agent for a task based on context, with confidence score
 */
export function detectBestAgentForTask(message, context = {}) {
  const lowerMessage = message.toLowerCase().trim();
  const scores = {
    sales: 0,
    project_manager: 0,
    support: 0,
    estimator: 0
  };

  // First check for direct triggers (highest priority)
  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    for (const trigger of keywords.directTriggers) {
      if (lowerMessage.startsWith(trigger)) {
        return {
          agentId,
          agent: ARIA_AGENT_TEMPLATES[agentId],
          confidence: 1.0,
          matchType: 'direct_trigger',
          reason: `Explicit call to ${ARIA_AGENT_TEMPLATES[agentId].name}`
        };
      }
    }
  }

  // Score based on action keywords
  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    for (const keyword of keywords.actionKeywords) {
      if (lowerMessage.includes(keyword)) {
        scores[agentId] += 2;
      }
    }
  }

  // Score based on context phrases (stronger signal)
  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    for (const phrase of keywords.contextPhrases) {
      if (lowerMessage.includes(phrase)) {
        scores[agentId] += 5;
      }
    }
  }

  // Add context-based scoring
  if (context.contactType === 'lead' || context.isNewContact) {
    scores.sales += 3;
  }
  if (context.hasOpenProject || context.hasScheduledJob) {
    scores.project_manager += 3;
  }
  if (context.hasComplaint || context.hasPreviousIssue) {
    scores.support += 3;
  }
  if (context.needsQuote || context.requestedPricing) {
    scores.estimator += 3;
  }

  // Find the highest scoring agent
  let bestAgent = 'aria';
  let highestScore = 0;

  for (const [agentId, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestAgent = agentId;
    }
  }

  // Calculate confidence (0-1)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(highestScore / totalScore, 1) : 0;

  // If no clear match (low score), default to ARIA
  if (highestScore < 2) {
    return {
      agentId: 'aria',
      agent: ARIA_AGENT_TEMPLATES.aria,
      confidence: 0.5,
      matchType: 'default',
      reason: 'No specific agent match - ARIA will handle',
      scores
    };
  }

  return {
    agentId: bestAgent,
    agent: ARIA_AGENT_TEMPLATES[bestAgent],
    confidence: Math.max(0.6, confidence),
    matchType: 'keyword_match',
    reason: `Best match for task based on keywords`,
    scores
  };
}

/**
 * Get delegation suggestion for ARIA
 * Returns a formatted suggestion for ARIA to use when delegating
 */
export function getDelegationSuggestion(message, context = {}) {
  const detection = detectBestAgentForTask(message, context);

  if (detection.agentId === 'aria') {
    return null; // ARIA handles it herself
  }

  const agent = detection.agent;
  const delegationPhrases = {
    sales: [
      `Ooh, this sounds like a sales move - lemme get my Sales Agent on it`,
      `Lead action? Say less, passing this to Sales`,
      `This is a Sales play for sure - they got this`
    ],
    project_manager: [
      `Scheduling and coordination? That's PM territory`,
      `Let me loop in my Project Manager on this one`,
      `This needs some organization - PM's got it`
    ],
    support: [
      `Customer history check? Support's on it`,
      `Lemme get Support to look into this`,
      `This needs the support touch - they're great at this`
    ],
    estimator: [
      `Pricing? That's Estimator's specialty`,
      `Let me get Estimator to crunch these numbers`,
      `Quote time - Estimator's got the magic touch`
    ]
  };

  const phrases = delegationPhrases[detection.agentId];
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  return {
    shouldDelegate: detection.confidence > 0.6,
    agentId: detection.agentId,
    agentName: agent.name,
    voice: agent.voice,
    phrase: randomPhrase,
    confidence: detection.confidence,
    reason: detection.reason
  };
}

/**
 * Get capabilities for an agent
 * Returns array of capability names
 */
export function getAgentCapabilities(agentId, allCapabilities) {
  const template = getAgentTemplate(agentId);

  if (template.capabilities === 'all') {
    return Object.keys(allCapabilities);
  }

  return template.capabilities;
}

/**
 * Get available voices
 */
export function getAvailableVoices() {
  return OPENAI_REALTIME_VOICES;
}

/**
 * Get voice for agent
 */
export function getAgentVoice(agentId) {
  const template = getAgentTemplate(agentId);
  return {
    voice: template.voice || 'shimmer',
    settings: template.voiceSettings || { speed: 1.0, pitch: 1.0 }
  };
}

export default ARIA_AGENT_TEMPLATES;
