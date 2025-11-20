import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';

/**
 * Call Routing Service
 * Handles intelligent routing of calls to multiple agents using a single phone number
 */
class CallRoutingService {
  /**
   * Route incoming call to appropriate agent
   * @param {string} phoneNumber - The Twilio number called
   * @param {string} callerNumber - The caller's phone number
   * @param {object} options - Routing options (time, userInput, etc.)
   * @returns {Promise<VoiceAgent>} - The selected agent
   */
  async routeCall(phoneNumber, callerNumber, options = {}) {
    const {
      userInput,      // IVR menu selection (e.g., "1" for sales)
      time = new Date(),
      routingStrategy = 'default'
    } = options;

    // Find all agents associated with this phone number
    const agents = await VoiceAgent.find({
      phoneNumber: phoneNumber,
      enabled: true,
      status: 'active'
    }).sort({ priority: -1 }); // Higher priority first

    if (agents.length === 0) {
      throw new Error(`No agents found for number ${phoneNumber}`);
    }

    // If only one agent, return it
    if (agents.length === 1) {
      return agents[0];
    }

    // Apply routing strategy
    let selectedAgent;

    switch (routingStrategy) {
      case 'ivr':
        selectedAgent = await this.routeByIVR(agents, userInput);
        break;

      case 'time':
        selectedAgent = await this.routeByTime(agents, time);
        break;

      case 'caller':
        selectedAgent = await this.routeByCaller(agents, callerNumber);
        break;

      case 'round-robin':
        selectedAgent = await this.routeRoundRobin(agents, phoneNumber);
        break;

      case 'load-balance':
        selectedAgent = await this.routeByLoad(agents);
        break;

      default:
        // Default: Use highest priority agent
        selectedAgent = agents[0];
    }

    if (!selectedAgent) {
      // Fallback to first available agent
      selectedAgent = agents[0];
    }

    console.log(`📞 Routed call from ${callerNumber} to agent: ${selectedAgent.name}`);
    return selectedAgent;
  }

  /**
   * Route based on IVR menu selection
   * Example: Press 1 for Sales, 2 for Support, 3 for Billing
   */
  async routeByIVR(agents, userInput) {
    if (!userInput) return null;

    // Find agent matching IVR option
    const agent = agents.find(a =>
      a.routingConfig?.ivrOption === userInput.toString()
    );

    return agent;
  }

  /**
   * Route based on time of day
   * Example: Business hours → Sales, After hours → Support
   */
  async routeByTime(agents, time) {
    const hour = time.getHours();
    const day = time.getDay(); // 0 = Sunday, 6 = Saturday

    // Find agent with matching time-based routing
    const agent = agents.find(a => {
      if (!a.routingConfig?.timeBasedRouting) return false;

      const config = a.routingConfig.timeBasedRouting;

      // Check if day matches
      if (config.days && !config.days.includes(day)) return false;

      // Check if hour matches
      if (config.startHour !== undefined && hour < config.startHour) return false;
      if (config.endHour !== undefined && hour > config.endHour) return false;

      return true;
    });

    return agent;
  }

  /**
   * Route based on caller history
   * Existing customers → Support, New callers → Sales
   */
  async routeByCaller(agents, callerNumber) {
    // Check if caller is existing customer
    const existingLead = await Lead.findOne({ phoneNumber: callerNumber });
    const hasCallHistory = await CallLog.exists({
      from: callerNumber,
      status: 'completed'
    });

    const isExistingCustomer = existingLead || hasCallHistory;

    // Find appropriate agent
    const agent = agents.find(a => {
      const config = a.routingConfig?.callerBased;
      if (!config) return false;

      if (isExistingCustomer && config.existingCustomers) return true;
      if (!isExistingCustomer && config.newCallers) return true;

      return false;
    });

    return agent;
  }

  /**
   * Round-robin routing
   * Distribute calls evenly across all agents
   */
  async routeRoundRobin(agents, phoneNumber) {
    // Get last routed agent for this number
    const lastCall = await CallLog.findOne({
      to: phoneNumber,
      status: { $in: ['in-progress', 'completed'] }
    }).sort({ createdAt: -1 });

    if (!lastCall || !lastCall.agentId) {
      // First call, use first agent
      return agents[0];
    }

    // Find index of last agent used
    const lastIndex = agents.findIndex(a =>
      a._id.toString() === lastCall.agentId.toString()
    );

    // Get next agent (wrap around if at end)
    const nextIndex = (lastIndex + 1) % agents.length;
    return agents[nextIndex];
  }

  /**
   * Load-based routing
   * Route to agent with fewest active calls
   */
  async routeByLoad(agents) {
    // Get active call count for each agent
    const agentLoads = await Promise.all(
      agents.map(async (agent) => {
        const activeCallCount = await CallLog.countDocuments({
          agentId: agent._id,
          status: 'in-progress'
        });

        return {
          agent,
          load: activeCallCount
        };
      })
    );

    // Sort by load (lowest first)
    agentLoads.sort((a, b) => a.load - b.load);

    return agentLoads[0].agent;
  }

  /**
   * Generate IVR TwiML menu
   * @param {string} phoneNumber - The called number
   * @param {Array} agents - Available agents
   * @returns {string} - TwiML XML
   */
  generateIVRMenu(phoneNumber, agents) {
    const twilio = require('twilio');
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Build menu options from agents
    let menuText = 'Welcome. Please select from the following options: ';

    agents.forEach(agent => {
      if (agent.routingConfig?.ivrOption && agent.routingConfig?.ivrPrompt) {
        menuText += `Press ${agent.routingConfig.ivrOption} for ${agent.routingConfig.ivrPrompt}. `;
      }
    });

    const gather = response.gather({
      numDigits: 1,
      action: `/api/webhooks/twilio/voice/route?number=${phoneNumber}`,
      method: 'POST',
      timeout: 10
    });

    gather.say({ voice: 'alice' }, menuText);

    // If no input, repeat menu
    response.redirect(`/api/webhooks/twilio/voice?From=&To=${phoneNumber}`);

    return response.toString();
  }
}

export default new CallRoutingService();
