import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import VoiceAgentWorkflowService from '../services/voiceAgentWorkflowService.js';

// Factory function to get ElevenLabs service with platform credentials
const getElevenLabsService = () => {
  return new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
};

const workflowService = new VoiceAgentWorkflowService();

export const getAgents = async (req, res) => {
  try {
    const agents = await VoiceAgent.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentById = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAgent = async (req, res) => {
  try {
    console.log('\n🚀 [CREATE AGENT] Request received');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    const {
      name,
      type,
      customType,
      voiceId,
      voiceName,
      script,
      firstMessage,
      phoneNumber,
      language,
      temperature
    } = req.body;

    console.log('✅ [CREATE AGENT] Extracted fields:', { name, type, voiceId, voiceName });

    // Validate required fields
    if (!name) {
      console.log('❌ [CREATE AGENT] Validation failed: Missing name');
      return res.status(400).json({ message: 'Agent name is required' });
    }

    if (!script) {
      console.log('❌ [CREATE AGENT] Validation failed: Missing script');
      return res.status(400).json({ message: 'Agent script/prompt is required' });
    }

    console.log('✅ [CREATE AGENT] Validation passed');

    // Get user to check subscription limits
    const user = await User.findById(req.user._id);
    console.log('👤 [CREATE AGENT] User plan:', user.plan);

    // Check subscription limits based on plan
    const agentCount = await VoiceAgent.countDocuments({ userId: req.user._id });
    const planLimits = {
      trial: 1,
      starter: 1,
      professional: 5,
      enterprise: Infinity
    };

    const maxAgents = planLimits[user.plan] || 1;
    console.log(`📊 [CREATE AGENT] Agent count: ${agentCount}/${maxAgents}`);

    if (agentCount >= maxAgents) {
      console.log('❌ [CREATE AGENT] Subscription limit reached');
      return res.status(403).json({
        message: `Your ${user.plan} plan allows up to ${maxAgents} agent(s). Upgrade to create more agents.`
      });
    }

    // Determine voice to use
    let selectedVoiceId = voiceId;
    let selectedVoiceName = voiceName;

    // If using a prebuilt type and no voice specified, use default for that type
    if (!selectedVoiceId && type && type !== 'custom') {
      const elevenLabsService = getElevenLabsService();
      const prebuiltAgents = elevenLabsService.getPrebuiltAgents();
      const prebuiltAgent = prebuiltAgents[type];
      if (prebuiltAgent) {
        selectedVoiceId = prebuiltAgent.voiceId;
        selectedVoiceName = prebuiltAgent.name;
      }
    }

    // Default to a good general voice if still not specified
    if (!selectedVoiceId) {
      selectedVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm, professional female voice
      selectedVoiceName = 'Sarah';
    }

    // Extract additional configuration from request body (for AI Builder)
    const agentConfiguration = req.body.configuration || {};
    console.log('⚙️  [CREATE AGENT] Configuration:', agentConfiguration);

    // CREATE REAL ELEVENLABS CONVERSATIONAL AI AGENT
    console.log('🤖 [CREATE AGENT] Creating ElevenLabs Conversational AI agent...');

    let elevenLabsAgentId;
    try {
      const elevenLabsService = getElevenLabsService();

      // Build the agent configuration for ElevenLabs
      const elevenLabsConfig = {
        name: name,
        voiceId: selectedVoiceId,
        script: script,
        firstMessage: firstMessage || `Hi! I'm calling from {{company_name}}. How are you today?`,
        language: language || 'en',
        temperature: temperature || 0.8
      };

      console.log('📤 [CREATE AGENT] Calling ElevenLabs API to create agent...');
      const elevenLabsAgent = await elevenLabsService.createAgent(elevenLabsConfig);

      elevenLabsAgentId = elevenLabsAgent.agent_id || elevenLabsAgent.id;
      console.log(`✅ [CREATE AGENT] ElevenLabs agent created: ${elevenLabsAgentId}`);

    } catch (elevenLabsError) {
      console.error('❌ [CREATE AGENT] Failed to create ElevenLabs agent:', elevenLabsError.message);

      // If ElevenLabs creation fails, use a placeholder ID so the agent can still be saved
      // This allows the system to work even if ElevenLabs API is down
      elevenLabsAgentId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.warn(`⚠️  [CREATE AGENT] Using placeholder ID: ${elevenLabsAgentId}`);
      console.warn('   Agent will be saved to database but calls may not work until ElevenLabs agent is created');
    }

    console.log('💾 [CREATE AGENT] Saving agent to database...');

    // Save agent to database with the real ElevenLabs agent ID
    const agent = await VoiceAgent.create({
      userId: req.user._id,
      name: name,
      type: type || 'custom',
      customType: customType,
      elevenLabsAgentId: elevenLabsAgentId, // Real ElevenLabs agent ID
      voiceId: selectedVoiceId,
      voiceName: selectedVoiceName,
      script: script,
      firstMessage: firstMessage || `Hi! I'm calling from {{company_name}}. How are you today?`,
      phoneNumber,
      configuration: {
        temperature: temperature || 0.8,
        maxDuration: 300,
        language: language || 'en',
        // Store additional config from AI Builder
        purpose: agentConfiguration.purpose,
        main_message: agentConfiguration.main_message,
        tone: agentConfiguration.tone,
        greeting: agentConfiguration.greeting,
        system_prompt: agentConfiguration.system_prompt,
        first_message: agentConfiguration.first_message,
        ...agentConfiguration
      },
      availability: {
        enabled: true,
        timezone: 'America/New_York',
        hours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      }
    });

    console.log(`✅ [CREATE AGENT] SUCCESS! Agent saved to database: ${agent._id}`);
    console.log(`📋 [CREATE AGENT] Agent details:`, {
      id: agent._id,
      name: agent.name,
      voiceId: agent.voiceId,
      voiceName: agent.voiceName,
      type: agent.type
    });

    // Create n8n workflow for this agent
    try {
      console.log(`🔄 [CREATE AGENT] Creating n8n workflow for agent automation...`);
      const workflowResult = await workflowService.createVoiceAgentWorkflow(agent, req.user._id);
      console.log(`✅ [CREATE AGENT] n8n workflow created: ${workflowResult.workflowId}`);
      console.log(`📞 [CREATE AGENT] Webhook URL: ${workflowResult.webhookUrl}`);

      // Now assign phone number with the n8n webhook URL
      if (phoneNumber && elevenLabsAgentId && !elevenLabsAgentId.startsWith('local_')) {
        try {
          const elevenLabsService = getElevenLabsService();
          console.log(`📞 [CREATE AGENT] Assigning phone ${phoneNumber} to agent ${elevenLabsAgentId} with n8n webhook`);
          await elevenLabsService.assignPhoneToAgent(phoneNumber, elevenLabsAgentId, workflowResult.webhookUrl);
          console.log(`✅ [CREATE AGENT] Phone number assigned successfully with webhook: ${workflowResult.webhookUrl}`);
        } catch (phoneError) {
          console.error('⚠️  [CREATE AGENT] Failed to assign phone number:', phoneError.message);
        }
      }
    } catch (workflowError) {
      console.error('⚠️  [CREATE AGENT] Failed to create n8n workflow:', workflowError.message);
      // Don't fail the whole request if workflow creation fails
    }

    console.log('🎉 [CREATE AGENT] Sending response to client\n');

    res.status(201).json(agent);
  } catch (error) {
    console.error('❌ [CREATE AGENT] ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const { name, script, phoneNumber, enabled, availability, configuration } = req.body;

    if (name) agent.name = name;
    if (script) agent.script = script;
    if (phoneNumber !== undefined) agent.phoneNumber = phoneNumber;
    if (enabled !== undefined) agent.enabled = enabled;
    if (availability) agent.availability = { ...agent.availability, ...availability };
    if (configuration) agent.configuration = { ...agent.configuration, ...configuration };

    if (script && agent.elevenLabsAgentId) {
      try {
        const elevenLabsService = getElevenLabsService();
        await elevenLabsService.updateAgent(agent.elevenLabsAgentId, {
          name: agent.name,
          script: agent.script
        });

        // CRITICAL FIX: Re-assign phone number after updating agent config
        // ElevenLabs API clears phone assignment when agent is updated
        if (agent.phoneNumber) {
          console.log(`📞 Re-assigning phone ${agent.phoneNumber} to agent ${agent.elevenLabsAgentId}`);

          const webhookUrl = process.env.WEBHOOK_BASE_URL
            ? `${process.env.WEBHOOK_BASE_URL}/api/webhooks/elevenlabs/call-completed`
            : `${req.protocol}://${req.get('host')}/api/webhooks/elevenlabs/call-completed`;

          await elevenLabsService.assignPhoneToAgent(agent.phoneNumber, agent.elevenLabsAgentId, webhookUrl);
          console.log(`✅ Phone number re-assigned successfully with webhook: ${webhookUrl}`);
        }
      } catch (error) {
        console.error('Failed to update ElevenLabs agent:', error);
      }
    }

    await agent.save();
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAgent = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await agent.deleteOne();
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentCalls = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const calls = await CallLog.find({ agentId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVoices = async (req, res) => {
  try {
    const elevenLabsService = getElevenLabsService();
    const response = await elevenLabsService.getVoices();

    // ElevenLabs returns { voices: [...] }
    // Wrap it in success response for frontend
    res.json({
      success: true,
      voices: response.voices || []
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voices from ElevenLabs'
    });
  }
};

export const getAgentTemplates = async (req, res) => {
  try {
    const templates = [
      // === CONSTRUCTION TRADE AGENTS ===
      {
        id: 'plumber_dispatch',
        name: 'Plumber Dispatch Agent',
        type: 'plumber',
        description: 'Schedule plumbing jobs and emergency calls',
        icon: '🔧',
        category: 'construction',
        script: `You are a professional plumber dispatch assistant for {{company_name}}.

CUSTOMER INFORMATION:
- Name: {{lead_name}}
- Phone: {{lead_phone}}
- Email: {{lead_email}}
- Address: {{address}}
- Property Type: {{property_type}}

YOUR GOAL: Assess the plumbing issue and schedule appropriate service.

CONVERSATION FLOW:
1. Greet warmly: "Hi {{lead_name}}, this is {{company_name}} plumbing services."
2. Ask about the plumbing issue (leak, clog, installation, emergency?)
3. Assess urgency level (emergency, urgent, routine)
4. Check if water is shut off for emergencies
5. Provide estimated arrival time or schedule appointment
6. Confirm address: {{address}}
7. Give them technician's name when assigned
8. Provide price range if applicable

EMERGENCY INDICATORS:
- Burst pipes or major leaks
- No water supply
- Sewage backup
- Gas line issues

TONE: Calm, professional, reassuring
If emergency, dispatch within 2 hours. Otherwise, offer next available slot.`,
        firstMessage: `Hi {{lead_name}}, this is calling from {{company_name}} plumbing services. I understand you need plumbing assistance. What's going on?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },
      {
        id: 'carpenter_estimator',
        name: 'Carpentry Estimator Agent',
        type: 'carpenter',
        description: 'Gather project details and schedule estimates',
        icon: '🪚',
        category: 'construction',
        script: `You are a carpentry project estimator for {{company_name}}.

CLIENT INFORMATION:
- Name: {{lead_name}}
- Phone: {{lead_phone}}
- Email: {{lead_email}}
- Project Location: {{address}}
- Budget Range: {{budget_range}}

YOUR GOAL: Understand the carpentry project and schedule an on-site estimate.

CONVERSATION FLOW:
1. Introduce yourself professionally
2. Ask about the type of project:
   - Custom cabinets
   - Framing/structural
   - Trim and molding
   - Deck/outdoor structures
   - Furniture building
   - Repairs/restoration
3. Ask about:
   - Project timeline/deadline
   - Materials preference (provided by them or you source?)
   - Existing plans or designs
   - Budget range (if not already known)
4. Explain estimate process:
   - Free on-site evaluation
   - Detailed written quote within 48 hours
   - 3D renderings for complex projects (if applicable)
5. Schedule on-site visit
6. Gather measurements if they have them

TONE: Professional craftsman, detail-oriented, consultative
Show expertise and build confidence in your work quality.`,
        firstMessage: `Hi {{lead_name}}, this is from {{company_name}} carpentry. I'm calling about your project inquiry. Tell me what you're looking to build?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },
      {
        id: 'electrician_service',
        name: 'Electrician Service Agent',
        type: 'electrician',
        description: 'Electrical service scheduling and safety assessment',
        icon: '⚡',
        category: 'construction',
        script: `You are an electrical service coordinator for {{company_name}}.

CUSTOMER DETAILS:
- Name: {{lead_name}}
- Phone: {{lead_phone}}
- Property: {{address}}
- Property Type: {{property_type}}

YOUR GOAL: Assess electrical needs and schedule licensed electrician visit.

CONVERSATION FLOW:
1. Greet professionally and mention licensed/insured status
2. Identify the electrical issue:
   - Power outage (partial/complete?)
   - Sparking outlets or breakers
   - New installation (outlets, lighting, panels)
   - Upgrade service panel
   - EV charger installation
   - Smart home wiring
   - Inspection/code compliance
3. SAFETY FIRST: Ask about immediate hazards:
   - Burning smell?
   - Sparking or arcing?
   - Hot outlets or switches?
   - If YES to any: Advise to turn off main breaker and dispatch emergency
4. For non-emergency: Schedule appointment
5. Mention permit requirements if needed
6. Confirm contact info and provide arrival window

CRITICAL SAFETY:
If any dangerous conditions, dispatch immediately (within 2-4 hours).
Always emphasize we're licensed and insured.

TONE: Safety-focused, professional, knowledgeable
Never advise DIY electrical work - safety first!`,
        firstMessage: `Hi {{lead_name}}, this is calling from {{company_name}} electrical services. We're licensed and insured electricians. What electrical work do you need help with?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },
      {
        id: 'drywall_specialist',
        name: 'Drywall Specialist Agent',
        type: 'drywall_tech',
        description: 'Drywall installation and repair coordination',
        icon: '🧱',
        category: 'construction',
        script: `You are a drywall project coordinator for {{company_name}}.

PROJECT CONTACT:
- Name: {{lead_name}}
- Phone: {{lead_phone}}
- Location: {{address}}
- Project Type: {{project_type}}

YOUR GOAL: Assess drywall needs and provide service timeline.

CONVERSATION FLOW:
1. Greet and introduce services
2. Identify project type:
   - New drywall installation
   - Repair (holes, cracks, water damage)
   - Ceiling work
   - Texture matching
   - Full finishing (mud, tape, sand, paint)
3. Get project details:
   - Square footage or number of sheets
   - Ceiling height
   - Texture preference (smooth, orange peel, knockdown, popcorn removal)
   - Access to the space
   - Timeline requirements
4. Ask about additional needs:
   - Insulation
   - Soundproofing
   - Moisture-resistant drywall (bathrooms/basements)
5. Provide estimate range based on scope
6. Schedule walk-through for accurate quote
7. Mention clean-up and dust containment practices

PRICING FACTORS:
- Material costs
- Labor (hanging, taping, mudding, sanding)
- Ceiling vs wall rates
- Texture application
- Number of coats needed

TONE: Efficient, detail-oriented, emphasize quality finish`,
        firstMessage: `Hi {{lead_name}}, this is from {{company_name}} drywall services. I understand you need drywall work done. Is this new installation or repair?`,
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        voiceName: 'Mike'
      },
      {
        id: 'handyman_service',
        name: 'Handyman Service Agent',
        type: 'handyman',
        description: 'General handyman and repair services',
        icon: '🔨',
        category: 'construction',
        script: `You are a handyman service coordinator for {{company_name}}.

CUSTOMER INFO:
- Name: {{lead_name}}
- Phone: {{lead_phone}}
- Address: {{address}}

YOUR GOAL: Understand their repair/maintenance needs and schedule service.

CONVERSATION FLOW:
1. Friendly greeting
2. Ask about their to-do list (most customers have multiple tasks)
3. Common services:
   - Minor plumbing repairs
   - Electrical (non-licensed work: fixtures, ceiling fans)
   - Carpentry repairs
   - Drywall patching
   - Painting touch-ups
   - Door/window repairs
   - Assembly (furniture, shelving)
   - Caulking/weatherproofing
   - Deck/fence repairs
   - Gutter cleaning
   - Pressure washing
   - And more!
4. Prioritize tasks (urgent vs nice-to-have)
5. Estimate time needed (charge by hour or project)
6. Schedule appointment
7. Mention "honey-do list" services - knock out multiple tasks in one visit!

PRICING:
- Hourly rate: $75-125/hour depending on job
- Minimum service call (usually 2 hours)
- Flat rate pricing for specific tasks

TONE: Friendly, versatile, solution-oriented
Position as the "one call solves it all" service!`,
        firstMessage: `Hi {{lead_name}}! This is from {{company_name}} handyman services. What can we help you fix or build today?`,
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        voiceName: 'Mike'
      },
      {
        id: 'construction_estimator',
        name: 'Construction Estimator Agent',
        type: 'estimator',
        description: 'Project estimation and bidding specialist',
        icon: '📐',
        category: 'construction',
        script: `You are a construction project estimator for {{company_name}}.

CLIENT DETAILS:
- Name: {{lead_name}}
- Company: {{company}}
- Phone: {{lead_phone}}
- Email: {{lead_email}}
- Project Location: {{address}}
- Project Type: {{project_type}}
- Budget: {{budget_range}}
- Timeline: {{timeline}}

YOUR GOAL: Gather comprehensive project details for accurate bidding.

CONVERSATION FLOW:
1. Professional introduction
2. Understand project scope:
   - Residential or commercial?
   - New construction, addition, or renovation?
   - Square footage
   - Number of floors/units
3. Gather specifications:
   - Architectural plans available?
   - Engineering requirements
   - Permit status
   - Material preferences
   - Finish level (basic, mid-grade, high-end)
4. Discuss timeline:
   - Desired start date
   - Completion deadline
   - Phasing requirements
5. Ask about:
   - Financing/payment terms
   - Previous contractor (if renovation)
   - Special requirements (accessibility, green building, etc.)
6. Next steps:
   - Schedule site visit
   - Review plans/specs
   - Provide detailed bid within 5-7 business days
   - Break down: Materials, Labor, Permits, Timeline
7. Mention insurance, licensing, references

QUALIFICATION:
- Budget alignment (don't waste time on unrealistic budgets)
- Timeline feasibility
- Decision-maker confirmation
- Competing bids

TONE: Professional, thorough, consultative expert
Build confidence in your process and accuracy.`,
        firstMessage: `Hi {{lead_name}}, this is from {{company_name}}. I'm calling about your construction project. Tell me about what you're looking to build?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },
      {
        id: 'fabricator_shop',
        name: 'Metal Fabricator Agent',
        type: 'fabricator',
        description: 'Custom metal fabrication and welding',
        icon: '⚙️',
        category: 'construction',
        script: `You are a metal fabrication specialist for {{company_name}}.

CLIENT INFO:
- Name: {{lead_name}}
- Company: {{company}}
- Phone: {{lead_phone}}
- Project: {{project_type}}

YOUR GOAL: Understand fabrication requirements and provide quote timeline.

CONVERSATION FLOW:
1. Introduce fabrication capabilities
2. Identify project type:
   - Structural steel
   - Ornamental/decorative metalwork
   - Custom railings/stairs
   - Gates and fencing
   - Metal furniture
   - Industrial equipment
   - Repairs/modifications
3. Gather specifications:
   - Material type (steel, aluminum, stainless, etc.)
   - Dimensions and tolerances
   - Drawings or CAD files available?
   - Finish requirements (powder coat, paint, galvanize, raw)
   - Quantity (one-off or production run)
4. Technical requirements:
   - Welding specifications
   - Load-bearing requirements
   - Code compliance needs
   - Installation included?
5. Timeline and logistics:
   - Shop time vs field work
   - Delivery/installation schedule
   - Access and equipment needs
6. Provide quote process:
   - Material costs (subject to market)
   - Shop time
   - Finishing
   - Installation (if needed)
   - Delivery

CAPABILITIES TO MENTION:
- MIG/TIG/Stick welding
- CNC plasma cutting
- Press brake forming
- Rolling and bending
- CAD design services

TONE: Technical expertise, precision-focused, can-do attitude`,
        firstMessage: `Hi {{lead_name}}, this is from {{company_name}} metal fabrication. What kind of custom metalwork do you need?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },

      // === BUSINESS OPERATIONS AGENTS ===
      {
        id: 'supplier_rep_caller',
        name: 'Supplier Rep Caller',
        type: 'supplier_rep',
        description: 'Calls supplier reps to check availability and pricing',
        icon: '📞',
        category: 'business_operations',
        script: `You are calling supplier representatives on behalf of {{company_name}}.

YOUR COMPANY: {{company_name}}
YOUR NAME: {{agent_name}}
ACCOUNT NUMBER: {{account_number}}
CONTACT PERSON: {{contact_name}}

YOUR GOAL: Get pricing and availability information for materials.

CONVERSATION FLOW:
1. Identify yourself: "Hi, this is {{agent_name}} from {{company_name}}, account {{account_number}}."
2. Ask for {{contact_name}} or their department
3. State your needs clearly:
   - "I need pricing and availability on the following items..."
   - Provide SKUs, descriptions, quantities
4. Key questions to ask:
   - Current pricing (any discounts available?)
   - In-stock quantities
   - Lead time if not in stock
   - Minimum order quantities
   - Delivery options and costs
   - Payment terms
5. Take detailed notes on responses
6. Get quote reference number
7. Confirm delivery timeline
8. Thank them and get direct callback info

ITEMS NEEDED:
{{order_items}}

CRITICAL INFO TO CAPTURE:
- Part numbers and descriptions
- Unit prices
- Available quantity
- Lead time
- Delivery date
- Quote validity period
- Rep name and direct contact

TONE: Professional, efficient, friendly business relationship
Represent {{company_name}} professionally.`,
        firstMessage: `Good morning, this is calling from {{company_name}}. I need to check pricing and availability on some materials. Who should I speak with?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },
      {
        id: 'order_placement_agent',
        name: 'Order Placement Agent',
        type: 'order_placement',
        description: 'Places orders with suppliers automatically',
        icon: '🛒',
        category: 'business_operations',
        script: `You are placing an order on behalf of {{company_name}}.

COMPANY DETAILS:
- Company: {{company_name}}
- Account #: {{account_number}}
- Contact: {{contact_name}}
- Phone: {{company_phone}}
- Email: {{company_email}}
- Delivery Address: {{delivery_address}}

ORDER INFORMATION:
{{order_details}}

YOUR GOAL: Place the order accurately and get confirmation.

CONVERSATION FLOW:
1. Identify yourself and company
2. State you're ready to place an order
3. Provide account number: {{account_number}}
4. Clearly communicate each line item:
   - SKU/Part number
   - Description
   - Quantity
   - Confirm unit price
5. Verify total amount
6. Confirm delivery address: {{delivery_address}}
7. Request delivery date: {{requested_delivery_date}}
8. Provide PO number: {{po_number}}
9. Get order confirmation:
   - Order number
   - Estimated delivery date
   - Tracking information (if available)
   - Rep name
10. Confirm they have correct callback info
11. Ask about order confirmation email

PAYMENT TERMS: {{payment_terms}}

IMPORTANT:
- Read back quantities to confirm
- Double-check part numbers
- Get confirmation number before ending call
- Confirm delivery date explicitly

TONE: Clear, detailed, professional
Accuracy is critical - verify everything!`,
        firstMessage: `Hi, this is calling from {{company_name}}, account {{account_number}}. I'm ready to place an order. Who can help me with that?`,
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Sarah'
      },
      {
        id: 'inventory_check_agent',
        name: 'Inventory Check Agent',
        type: 'inventory_check',
        description: 'Calls multiple suppliers to check inventory levels',
        icon: '📦',
        category: 'business_operations',
        script: `You are checking inventory availability for {{company_name}}.

YOUR INFO:
- Company: {{company_name}}
- Account: {{account_number}}

ITEMS TO CHECK:
{{inventory_items}}

YOUR GOAL: Quickly verify what's in stock and when it's available.

CONVERSATION FLOW:
1. Quick introduction: "Hi, this is from {{company_name}}. I need to verify inventory on a few items."
2. Provide account number if requested
3. List items one by one:
   - "Do you have [item SKU/description] in stock?"
   - "How many units available?"
   - "If not in stock, when's the next delivery?"
4. Ask about alternatives if out of stock
5. Get pricing if it's changed
6. Thank them quickly - keep call efficient

CAPTURE:
- Item SKU/name
- In stock: YES/NO
- Quantity available
- Lead time if not available
- Alternative options
- Price verification

EFFICIENCY:
This is a quick check call - aim for under 3 minutes.
Be friendly but efficient.

TONE: Professional, efficient, appreciative of their time`,
        firstMessage: `Hi, this is calling from {{company_name}}. I need to do a quick inventory check on a few items. Do you have a moment?`,
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        voiceName: 'Mike'
      },
      {
        id: 'quote_request_agent',
        name: 'Quote Request Agent',
        type: 'quote_request',
        description: 'Requests quotes from subcontractors and suppliers',
        icon: '💼',
        category: 'business_operations',
        script: `You are requesting quotes on behalf of {{company_name}}.

PROJECT INFORMATION:
- Company: {{company_name}}
- Project Name: {{project_name}}
- Project Location: {{project_address}}
- Contact: {{contact_name}}
- Phone: {{company_phone}}
- Email: {{company_email}}

YOUR GOAL: Request a detailed quote for specified work/materials.

CONVERSATION FLOW:
1. Professional introduction and company name
2. Explain you're requesting a quote for: {{project_name}}
3. Provide project overview:
   - Type of work/materials needed
   - Project location: {{project_address}}
   - Timeline: {{project_timeline}}
   - Budget range (if willing to share): {{budget_range}}
4. Share detailed scope:
   {{scope_of_work}}
5. Ask about:
   - Availability to take on project
   - Timeline for quote delivery
   - Site visit needed?
   - References available?
   - Licensing and insurance current?
6. Provide documentation:
   - "Can I email you plans/specifications?"
   - Get best email: {{quote_email}}
7. Set expectations:
   - Quote deadline: {{quote_deadline}}
   - Decision timeline
   - Selection process
8. Thank them and confirm follow-up process

INFORMATION TO GATHER:
- Company name and license number
- Contact person and direct phone
- Estimated quote delivery date
- Questions/concerns about scope
- Alternate suggestions

TONE: Professional, organized, respectful of their time
You're establishing a business relationship.`,
        firstMessage: `Hi, this is calling from {{company_name}}. We have an upcoming project and would like to request a quote for your services. Is now a good time?`,
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Sarah'
      },

      // === GENERAL PURPOSE TEMPLATES (existing) ===
      {
        id: 'lead_qualification',
        name: 'Lead Qualification Agent',
        type: 'lead_gen',
        description: 'Qualify inbound leads by asking discovery questions',
        icon: '🎯',
        category: 'general',
        script: `You are a friendly lead qualification specialist for {{company_name}}.

Your goal is to qualify leads by understanding their needs and timeline.

LEAD INFORMATION:
- Name: {{lead_name}}
- Email: {{lead_email}}
- Source: {{lead_source}}

CONVERSATION FLOW:
1. Greet them warmly: "Hi {{lead_name}}! Thanks for your interest in {{company_name}}."
2. Ask about their specific needs
3. Understand their timeline (urgent, next 3 months, just exploring)
4. Gauge their budget range
5. Determine if they're decision maker
6. Book appointment if qualified

QUALIFICATION CRITERIA:
- Has specific need
- Timeline within 6 months
- Budget awareness
- Decision maker or influencer

Be conversational, not interrogative. Make it feel natural!`,
        firstMessage: `Hi {{lead_name}}! This is calling from {{company_name}}. How are you today?`,
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Sarah'
      },
      {
        id: 'appointment_booking',
        name: 'Appointment Booking Agent',
        type: 'booking',
        description: 'Schedule appointments and consultations',
        icon: '📅',
        category: 'general',
        script: `You are a helpful appointment booking assistant for {{company_name}}.

Your goal is to book an appointment for {{lead_name}}.

LEAD DETAILS:
- Name: {{lead_name}}
- Email: {{lead_email}}
- Phone: {{lead_phone}}

AVAILABLE TIME SLOTS:
- Weekdays: 9 AM - 5 PM
- Consultations are 30-60 minutes

CONVERSATION FLOW:
1. Confirm their interest in scheduling
2. Ask what days/times work best
3. Offer 2-3 specific time slot options
4. Confirm their contact info ({{lead_email}}, {{lead_phone}})
5. Set the appointment
6. Send confirmation and next steps

TONE: Friendly, efficient, accommodating
Be flexible and helpful!`,
        firstMessage: `Hi {{lead_name}}! I'm calling to help schedule your consultation with {{company_name}}. Do you have a few minutes?`,
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        voiceName: 'Mike'
      },
      {
        id: 'customer_feedback',
        name: 'Customer Feedback Survey',
        type: 'custom',
        customType: 'feedback',
        description: 'Collect customer satisfaction feedback',
        icon: '⭐',
        category: 'general',
        script: `You are conducting a brief customer satisfaction survey for {{company_name}}.

CUSTOMER: {{lead_name}}

SURVEY QUESTIONS:
1. How would you rate your overall experience? (1-10)
2. What did you like most about our service?
3. What could we improve?
4. Would you recommend us to others?
5. Any additional comments?

TONE: Appreciative, genuine interest in feedback
KEEP IT BRIEF: 2-3 minutes maximum

Thank them for their time and feedback!`,
        firstMessage: `Hi {{lead_name}}! This is from {{company_name}}. Do you have 2 minutes for a quick satisfaction survey?`,
        voiceId: 'XrExE9yKIg1WjnnlVkGX',
        voiceName: 'Lisa'
      },
      {
        id: 'payment_reminder',
        name: 'Payment Reminder Agent',
        type: 'collections',
        description: 'Professional payment reminder calls',
        icon: '💰',
        category: 'general',
        script: `You are a professional accounts specialist for {{company_name}}.

CUSTOMER: {{lead_name}}

Your goal is to collect payment professionally and courteously.

CONVERSATION FLOW:
1. Greet professionally
2. Mention outstanding balance (without specific amount unless they ask)
3. Ask if there are any issues preventing payment
4. Offer payment options (credit card, ACH, payment plan)
5. Get commitment on payment date
6. Confirm contact info

TONE: Professional, firm but respectful
NEVER: Threaten, be rude, or aggressive
ALWAYS: Be understanding and solution-oriented

If they commit to payment, confirm the date and method.`,
        firstMessage: `Hello {{lead_name}}, this is from {{company_name}}. I'm calling regarding your account. Do you have a moment?`,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'James'
      },
      {
        id: 'event_reminder',
        name: 'Event Reminder Agent',
        type: 'custom',
        customType: 'reminder',
        description: 'Remind customers about upcoming events',
        icon: '🎉',
        category: 'general',
        script: `You are calling to remind {{lead_name}} about their upcoming event with {{company_name}}.

EVENT DETAILS:
- Customer: {{lead_name}}
- Contact: {{lead_phone}}, {{lead_email}}

CONVERSATION FLOW:
1. Greet warmly
2. Remind them about the event/appointment
3. Confirm they're still planning to attend
4. Answer any questions
5. Provide any prep instructions if needed
6. Get confirmation

TONE: Enthusiastic, helpful
Make them feel excited about the event!`,
        firstMessage: `Hi {{lead_name}}! This is calling from {{company_name}} with a friendly reminder about your upcoming appointment.`,
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Sarah'
      },
      {
        id: 'winback_campaign',
        name: 'Win-Back Campaign Agent',
        type: 'promo',
        description: 'Re-engage inactive customers with special offers',
        icon: '🎁',
        category: 'general',
        script: `You are calling to win back a former customer for {{company_name}}.

CUSTOMER: {{lead_name}}

Your goal is to re-engage them with a special offer.

CONVERSATION FLOW:
1. Acknowledge they were a valued customer
2. Ask why they stopped using the service (listen!)
3. Address their concerns
4. Present exclusive win-back offer
5. Create urgency (limited time)
6. Get commitment or book follow-up

SPECIAL OFFER:
- 20% off their next purchase
- Exclusive access to new features
- Waived fees for 3 months

TONE: Appreciative, understanding, excited to have them back`,
        firstMessage: `Hi {{lead_name}}! This is from {{company_name}}. We noticed it's been a while and wanted to reach out personally.`,
        voiceId: 'XrExE9yKIg1WjnnlVkGX',
        voiceName: 'Lisa'
      }
    ];

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const agent = await VoiceAgent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const totalCalls = await CallLog.countDocuments({ agentId: req.params.id });
    const successfulCalls = await CallLog.countDocuments({ agentId: req.params.id, status: 'completed' });

    const avgDuration = await CallLog.aggregate([
      { $match: { agentId: agent._id } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const callsByDay = await CallLog.aggregate([
      {
        $match: {
          agentId: agent._id,
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalCalls,
      successfulCalls,
      successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0,
      averageDuration: avgDuration.length > 0 ? Math.round(avgDuration[0].avgDuration) : 0,
      leadsGenerated: agent.performance.leadsGenerated,
      callsByDay
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Test call - make a quick test call with an agent
export const testCall = async (req, res) => {
  try {
    const { agentId, phoneNumber } = req.body;

    console.log('\n📞 [TEST CALL] Initiating test call via Twilio + ElevenLabs');
    console.log('   Agent ID:', agentId);
    console.log('   Phone:', phoneNumber);

    if (!agentId || !phoneNumber) {
      return res.status(400).json({
        message: 'Agent ID and phone number are required'
      });
    }

    // Fetch the agent
    const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    console.log('   Agent Name:', agent.name);
    console.log('   ElevenLabs Agent ID:', agent.elevenLabsAgentId);
    console.log('   Voice ID:', agent.voiceId);

    // Check if agent has ElevenLabs configuration
    if (!agent.elevenLabsAgentId) {
      return res.status(400).json({
        message: 'Agent must have an ElevenLabs agent ID configured'
      });
    }

    // Get Twilio phone number from environment
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioFromNumber) {
      return res.status(500).json({
        message: 'Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER in environment variables.'
      });
    }

    // Format phone number
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
    }

    console.log('   From Number:', twilioFromNumber);
    console.log('   To Number:', formattedNumber);

    // Initialize Twilio service
    const TwilioService = (await import('../services/twilioService.js')).default;
    const twilioService = new TwilioService();

    if (!twilioService.client) {
      return res.status(500).json({
        message: 'Twilio not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
      });
    }

    // Make outbound call using Twilio + ElevenLabs WebSocket
    console.log('   Initiating Twilio call with ElevenLabs WebSocket...');

    const call = await twilioService.makeCallWithElevenLabs(
      twilioFromNumber,
      formattedNumber,
      agent.elevenLabsAgentId
    );

    const callId = call.sid;
    console.log('   ✅ Call initiated via Twilio:', callId);

    // Log the call
    await CallLog.create({
      userId: req.user._id,
      agentId: agent._id,
      elevenLabsCallId: callId,
      phoneNumber: formattedNumber,
      status: 'initiated',
      direction: 'outbound',
      metadata: {
        testCall: true,
        twilioCallSid: callId,
        fromNumber: twilioFromNumber,
        method: 'twilio_elevenlabs_websocket'
      }
    });

    res.json({
      success: true,
      message: 'Test call initiated successfully via Twilio',
      callId: callId,
      method: 'twilio_elevenlabs_websocket'
    });

  } catch (error) {
    console.error('❌ [TEST CALL] Error:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to initiate test call'
    });
  }
};

// ==========================================
// AGENT LIFECYCLE MANAGEMENT
// ==========================================

/**
 * Update agent deployment status
 * POST /api/agents/:id/deploy
 */
export const deployAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, changes } = req.body; // status: 'draft', 'testing', 'production'

    console.log(`🚀 [DEPLOY AGENT] Updating deployment status to: ${status}`);

    const agent = await VoiceAgent.findOne({ _id: id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Validate status transition
    const validStatuses = ['draft', 'testing', 'production'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid deployment status' });
    }

    // Check if agent has valid ElevenLabs ID for production deployment
    if (status === 'production' && (!agent.elevenLabsAgentId || agent.elevenLabsAgentId.startsWith('local_'))) {
      return res.status(400).json({
        message: 'Cannot deploy to production: Agent not properly created in ElevenLabs'
      });
    }

    // Update deployment status
    agent.deployment.status = status;
    agent.deployment.lastDeployedAt = new Date();
    agent.deployment.deployedBy = req.user._id;

    // Increment version if moving to production
    if (status === 'production') {
      agent.deployment.version += 1;
    }

    // Add changelog entry if changes provided
    if (changes) {
      agent.deployment.changelog.push({
        version: agent.deployment.version,
        changes: changes,
        updatedAt: new Date(),
        updatedBy: req.user._id
      });
    }

    await agent.save();

    console.log(`✅ [DEPLOY AGENT] Agent deployed to ${status} (v${agent.deployment.version})`);

    res.json({
      success: true,
      message: `Agent deployed to ${status}`,
      agent: agent
    });

  } catch (error) {
    console.error('❌ [DEPLOY AGENT] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Save test results for an agent
 * POST /api/agents/:id/test-results
 */
export const saveTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, transcript, rating, notes, status } = req.body;

    console.log(`📝 [TEST RESULT] Saving test result for agent ${id}`);

    const agent = await VoiceAgent.findOne({ _id: id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Add test result
    agent.deployment.testResults.push({
      testedAt: new Date(),
      testedBy: req.user._id,
      duration: duration,
      conversationTranscript: transcript,
      rating: rating,
      notes: notes,
      status: status // 'passed', 'failed', 'needs_improvement'
    });

    await agent.save();

    console.log(`✅ [TEST RESULT] Test result saved (Status: ${status}, Rating: ${rating}/5)`);

    res.json({
      success: true,
      message: 'Test result saved',
      testResults: agent.deployment.testResults
    });

  } catch (error) {
    console.error('❌ [TEST RESULT] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get test results for an agent
 * GET /api/agents/:id/test-results
 */
export const getTestResults = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await VoiceAgent.findOne({ _id: id, userId: req.user._id })
      .populate('deployment.testResults.testedBy', 'name email');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      testResults: agent.deployment.testResults || [],
      deploymentStatus: agent.deployment.status,
      version: agent.deployment.version
    });

  } catch (error) {
    console.error('❌ [GET TEST RESULTS] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get deployment changelog for an agent
 * GET /api/agents/:id/changelog
 */
export const getChangelog = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await VoiceAgent.findOne({ _id: id, userId: req.user._id })
      .populate('deployment.changelog.updatedBy', 'name email');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      changelog: agent.deployment.changelog || [],
      currentVersion: agent.deployment.version
    });

  } catch (error) {
    console.error('❌ [GET CHANGELOG] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get ElevenLabs Voice Library (shared voices)
export const getVoiceLibrary = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const requestedPage = parseInt(page);
    const requestedLimit = parseInt(limit);

    console.log('\n========================================');
    console.log('📚 [VOICE LIBRARY] API CALL RECEIVED');
    console.log(`📊 Request from: ${req.user?.email || 'Unknown user'}`);
    console.log(`📊 Page: ${requestedPage}, Limit: ${requestedLimit}`);
    console.log('🔑 ElevenLabs API Key exists:', !!process.env.ELEVENLABS_API_KEY);

    const elevenLabsService = getElevenLabsService();
    console.log('✅ ElevenLabs service initialized');

    // Fetch only the requested page from ElevenLabs
    console.log('🌐 Calling ElevenLabs /shared-voices endpoint...');
    const response = await elevenLabsService.client.get('/shared-voices', {
      params: {
        page_size: requestedLimit,
        page: requestedPage
      }
    });

    const voices = response.data.voices || [];
    const hasMore = response.data.has_more || false;

    console.log(`✅ [VOICE LIBRARY] Successfully fetched ${voices.length} voices from ElevenLabs`);
    if (voices.length > 0) {
      console.log(`📋 Sample voice structure:`, {
        voice_id: voices[0].voice_id,
        name: voices[0].name,
        language: voices[0].language,
        accent: voices[0].accent,
        gender: voices[0].gender
      });
    }

    // Get user's saved voices to check which ones are already in library
    const userId = req.user?.id || req.user?._id;
    const user = userId ? await User.findById(userId) : null;
    const savedVoiceIds = new Set((user?.savedVoices || []).map(v => v.voiceId));

    console.log(`📋 [VOICE LIBRARY] User ID: ${userId}, User has ${savedVoiceIds.size} voices in their library`);

    // Format voices for frontend
    const formattedVoices = voices.map(v => ({
      id: v.voice_id,
      publicOwnerId: v.public_owner_id,
      name: v.name,
      gender: v.gender || 'unknown',
      age: v.age || 'unknown',
      accent: v.accent || 'unknown',
      useCase: v.use_case || 'general',
      category: v.category || 'general',
      language: v.language || 'en',
      locale: v.locale || 'en-US',
      description: v.description || '',
      previewUrl: v.preview_url || null,
      freeUsersAllowed: v.free_users_allowed || false,
      isAddedByUser: savedVoiceIds.has(v.voice_id), // Check against user's saved voices
      clonedByCount: v.cloned_by_count || 0,
      verifiedLanguages: v.verified_languages || []
    }));

    // Pagination info
    const pagination = {
      currentPage: requestedPage,
      pageSize: requestedLimit,
      count: formattedVoices.length,
      hasMore: hasMore
    };

    console.log(`📤 [VOICE LIBRARY] Sending response to frontend:`);
    console.log(`   - Total voices: ${formattedVoices.length}`);
    console.log(`   - Has more pages: ${hasMore}`);
    console.log('========================================\n');

    res.json({
      success: true,
      voices: formattedVoices,
      pagination,
      hasMore
    });

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ [VOICE LIBRARY] ERROR OCCURRED');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('ElevenLabs response:', error.response?.data);
    console.error('Status code:', error.response?.status);
    console.error('Full error:', error);
    console.error('========================================\n');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch voice library',
      error: error.message
    });
  }
};

// Add voice from library to user's account
export const addVoiceFromLibrary = async (req, res) => {
  try {
    const { publicOwnerId, voiceId, voiceName } = req.body;

    console.log('\n➕ [ADD VOICE] Adding voice to account:', {
      voiceId,
      voiceName,
      publicOwnerId
    });

    if (!publicOwnerId || !voiceId) {
      return res.status(400).json({
        success: false,
        message: 'publicOwnerId and voiceId are required'
      });
    }

    const elevenLabsService = getElevenLabsService();

    // Add voice to user's ElevenLabs account using the correct endpoint
    // The endpoint is: POST /v1/voices/add/{public_user_id}/{voice_id}
    // Body should contain: {"new_name": "Custom Name"} (optional)
    const response = await elevenLabsService.client.post(
      `/voices/add/${publicOwnerId}/${voiceId}`,
      {
        new_name: voiceName  // Optional: rename the voice when adding
      }
    );

    console.log(`✅ [ADD VOICE] Successfully added: ${voiceName}`);

    res.json({
      success: true,
      message: `Voice "${voiceName}" added to your account`,
      voice: response.data
    });

  } catch (error) {
    console.error('❌ [ADD VOICE] Error:', error.response?.data || error.message);

    // Handle specific errors
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Voice may already be in your account or limit reached'
      });
    }

    if (error.response?.status === 422) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voice or user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add voice to account',
      error: error.message
    });
  }
};

// ============================================
// USER VOICE LIBRARY MANAGEMENT
// ============================================

// Get user's saved voices
export const getSavedVoices = async (req, res) => {
  try {
    console.log('\n📚 [GET SAVED VOICES] Fetching user voice library...');

    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const savedVoices = user.savedVoices || [];

    console.log(`✅ [GET SAVED VOICES] Found ${savedVoices.length} saved voices`);

    res.json({
      success: true,
      voices: savedVoices,
      total: savedVoices.length
    });

  } catch (error) {
    console.error('❌ [GET SAVED VOICES] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved voices',
      error: error.message
    });
  }
};

// Save a voice to user's library
export const saveVoiceToLibrary = async (req, res) => {
  try {
    const voiceData = req.body;

    console.log('\n💾 [SAVE VOICE] Saving voice to user library:', {
      voiceId: voiceData.voiceId,
      name: voiceData.name
    });

    if (!voiceData.voiceId || !voiceData.name) {
      return res.status(400).json({
        success: false,
        message: 'voiceId and name are required'
      });
    }

    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if voice already saved
    const existingVoice = user.savedVoices.find(v => v.voiceId === voiceData.voiceId);

    if (existingVoice) {
      return res.status(400).json({
        success: false,
        message: 'Voice already in your library'
      });
    }

    // Add voice to user's saved voices
    user.savedVoices.push({
      voiceId: voiceData.voiceId,
      publicOwnerId: voiceData.publicOwnerId,
      name: voiceData.name,
      gender: voiceData.gender,
      age: voiceData.age,
      accent: voiceData.accent,
      useCase: voiceData.useCase,
      category: voiceData.category,
      language: voiceData.language,
      locale: voiceData.locale,
      description: voiceData.description,
      previewUrl: voiceData.previewUrl,
      freeUsersAllowed: voiceData.freeUsersAllowed,
      clonedByCount: voiceData.clonedByCount,
      tags: voiceData.tags || [],
      notes: voiceData.notes || ''
    });

    await user.save();

    console.log(`✅ [SAVE VOICE] Voice "${voiceData.name}" saved to library`);

    res.json({
      success: true,
      message: `Voice "${voiceData.name}" saved to your library`,
      voice: user.savedVoices[user.savedVoices.length - 1]
    });

  } catch (error) {
    console.error('❌ [SAVE VOICE] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save voice',
      error: error.message
    });
  }
};

// Remove voice from user's library
export const removeVoiceFromLibrary = async (req, res) => {
  try {
    const { voiceId } = req.params;

    console.log('\n🗑️  [REMOVE VOICE] Removing voice from library:', voiceId);

    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const voiceIndex = user.savedVoices.findIndex(v => v.voiceId === voiceId);

    if (voiceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Voice not found in your library'
      });
    }

    const voiceName = user.savedVoices[voiceIndex].name;
    user.savedVoices.splice(voiceIndex, 1);

    await user.save();

    console.log(`✅ [REMOVE VOICE] Voice "${voiceName}" removed from library`);

    res.json({
      success: true,
      message: `Voice "${voiceName}" removed from your library`
    });

  } catch (error) {
    console.error('❌ [REMOVE VOICE] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to remove voice',
      error: error.message
    });
  }
};

// Update voice metadata (tags, notes)
export const updateSavedVoice = async (req, res) => {
  try {
    const { voiceId } = req.params;
    const { tags, notes } = req.body;

    console.log('\n✏️  [UPDATE VOICE] Updating voice metadata:', voiceId);

    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const voice = user.savedVoices.find(v => v.voiceId === voiceId);

    if (!voice) {
      return res.status(404).json({
        success: false,
        message: 'Voice not found in your library'
      });
    }

    if (tags !== undefined) voice.tags = tags;
    if (notes !== undefined) voice.notes = notes;

    await user.save();

    console.log(`✅ [UPDATE VOICE] Voice "${voice.name}" metadata updated`);

    res.json({
      success: true,
      message: 'Voice updated successfully',
      voice
    });

  } catch (error) {
    console.error('❌ [UPDATE VOICE] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update voice',
      error: error.message
    });
  }
};

// Test agent conversation (simulated)
export const testConversation = async (req, res) => {
  try {
    const { agentId, message, prompt, firstMessage, conversationHistory } = req.body;

    console.log(`🧪 [TEST CONVERSATION] Testing agent ${agentId} with message: "${message}"`);

    // In a real implementation, this would call ElevenLabs or OpenAI
    // For now, we'll create a simple simulated response based on the prompt

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate a context-aware response
    let response = '';

    // Check if this is the first message in the conversation
    if (!conversationHistory || conversationHistory.length === 0) {
      response = firstMessage || 'Hello! How can I help you today?';
    } else {
      // Simple keyword-based responses for testing
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        response = 'Hello! How can I assist you today?';
      } else if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
        response = 'I\'d be happy to help you. What do you need assistance with?';
      } else if (lowerMessage.includes('thank')) {
        response = 'You\'re welcome! Is there anything else I can help you with?';
      } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
        response = 'Goodbye! Have a great day!';
      } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
        response = 'I can help you with pricing information. Could you please provide more details about what you\'re interested in?';
      } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
        response = 'I\'d be happy to help you schedule an appointment. What date and time works best for you?';
      } else {
        // Generic response
        response = `I understand you said "${message}". Based on my instructions, I'm here to help. Could you provide more details so I can assist you better?`;
      }
    }

    console.log(`✅ [TEST CONVERSATION] Generated response: "${response}"`);

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [TEST CONVERSATION] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test response',
      error: error.message
    });
  }
};

// @desc    Connect agent to workflow
// @route   POST /api/agents/:id/connect-workflow
// @access  Private
export const connectWorkflow = async (req, res) => {
  try {
    const { workflowId, webhookUrl } = req.body;

    const agent = await Agent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Update agent with workflow connection
    agent.connectedWorkflowId = workflowId;
    agent.webhookUrl = webhookUrl || agent.webhookUrl;
    await agent.save();

    // Configure ElevenLabs agent to use the webhook
    try {
      const elevenLabsService = getElevenLabsService();
      if (agent.elevenLabsAgentId) {
        await elevenLabsService.updateAgent(agent.elevenLabsAgentId, {
          webhook: {
            url: webhookUrl,
            events: ['conversation.end']
          }
        });
      }
    } catch (elevenLabsError) {
      console.warn('Could not update ElevenLabs webhook:', elevenLabsError.message);
    }

    res.json({
      success: true,
      message: 'Workflow connected successfully',
      agent
    });
  } catch (error) {
    console.error('Connect workflow error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Disconnect workflow from agent
// @route   DELETE /api/agents/:id/disconnect-workflow
// @access  Private
export const disconnectWorkflow = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Remove workflow connection
    agent.connectedWorkflowId = null;
    agent.webhookUrl = null;
    await agent.save();

    // Remove webhook from ElevenLabs agent
    try {
      const elevenLabsService = getElevenLabsService();
      if (agent.elevenLabsAgentId) {
        await elevenLabsService.updateAgent(agent.elevenLabsAgentId, {
          webhook: null
        });
      }
    } catch (elevenLabsError) {
      console.warn('Could not remove ElevenLabs webhook:', elevenLabsError.message);
    }

    res.json({
      success: true,
      message: 'Workflow disconnected successfully',
      agent
    });
  } catch (error) {
    console.error('Disconnect workflow error:', error);
    res.status(500).json({ message: error.message });
  }
};
