/**
 * Prompt Builder Utility
 *
 * Helper functions to build AI prompts enriched with user profile data
 */

/**
 * Build a comprehensive agent system prompt with profile context
 *
 * @param {Object} options - Prompt configuration
 * @param {string} options.agentName - Name of the agent
 * @param {string} options.purpose - Purpose of the agent
 * @param {string} options.mainMessage - Main message the agent should communicate
 * @param {string} [options.tone] - Tone/personality (defaults to profile brand voice)
 * @param {string} [options.specificDetails] - Additional specific details to mention
 * @param {Object} profileHelpers - Profile context helpers from useProfile hook
 * @param {Function} profileHelpers.getBusinessContext - Get business context
 * @param {Function} profileHelpers.getBrandVoice - Get brand voice
 * @param {Function} profileHelpers.getAIInstructions - Get AI instructions
 * @param {Function} profileHelpers.getContactInfo - Get contact information
 * @param {Function} profileHelpers.getLocation - Get location information
 * @returns {string} Complete system prompt
 */
export function buildAgentSystemPrompt(options, profileHelpers) {
  const {
    agentName,
    purpose,
    mainMessage,
    tone,
    specificDetails,
    conversationType = 'conversation'
  } = options;

  const {
    getBusinessContext,
    getBrandVoice,
    getAIInstructions,
    getContactInfo,
    getLocation
  } = profileHelpers;

  // Get profile data
  const businessContext = getBusinessContext();
  const brandVoice = getBrandVoice();
  const aiInstructions = getAIInstructions();
  const contactInfo = getContactInfo();
  const location = getLocation();

  // Build prompt sections
  let prompt = `You are ${agentName}, an AI voice agent for VoiceNow CRM.

PURPOSE: ${purpose}

MAIN MESSAGE: ${mainMessage}

TONE & PERSONALITY: ${tone || brandVoice || 'Professional and friendly'}
`;

  // Add business context if available
  if (businessContext) {
    prompt += `\nBUSINESS CONTEXT:\n${businessContext}\n`;
  }

  // Add contact info if available
  if (contactInfo?.fullName) {
    prompt += `\nYou are calling on behalf of ${contactInfo.fullName}`;
    if (contactInfo.phone) {
      prompt += ` (callback: ${contactInfo.phone})`;
    }
    prompt += `.\n`;
  }

  // Add location context if available
  if (location?.city || location?.state) {
    prompt += `\nLocation: ${[location.city, location.state].filter(Boolean).join(', ')}\n`;
  }

  // Add conversation guidelines
  prompt += `
CONVERSATION GUIDELINES:
- Greet the person warmly
- Clearly communicate: ${mainMessage}
${specificDetails ? `- Mention these details: ${specificDetails}` : ''}
- Answer any questions they have
- End the call professionally
`;

  // Add custom AI instructions if available
  if (aiInstructions) {
    prompt += `\nCUSTOM INSTRUCTIONS:\n${aiInstructions}\n`;
  }

  prompt += `\nRemember: Be concise, friendly, and stay on message. This is a ${conversationType}.`;

  return prompt;
}

/**
 * Build a simple prompt with profile context for manual editing
 *
 * @param {Object} profileHelpers - Profile context helpers from useProfile hook
 * @returns {string} Basic prompt template with profile context
 */
export function buildProfileContextPrompt(profileHelpers) {
  const {
    getBusinessContext,
    getContactInfo,
    getAIInstructions
  } = profileHelpers;

  const parts = [];
  const contactInfo = getContactInfo();
  const businessContext = getBusinessContext();
  const aiInstructions = getAIInstructions();

  if (contactInfo?.fullName) {
    parts.push(`You are an AI assistant for ${contactInfo.fullName}.`);
  }

  if (businessContext) {
    parts.push(`\n${businessContext}`);
  }

  if (aiInstructions) {
    parts.push(`\nCustom Instructions:\n${aiInstructions}`);
  }

  if (parts.length === 0) {
    return 'You are a helpful AI assistant.';
  }

  return parts.join('\n');
}

/**
 * Enhance an existing prompt with profile context
 *
 * @param {string} existingPrompt - The existing prompt to enhance
 * @param {Object} profileHelpers - Profile context helpers from useProfile hook
 * @returns {string} Enhanced prompt
 */
export function enhancePromptWithProfile(existingPrompt, profileHelpers) {
  if (!existingPrompt || existingPrompt.trim() === '') {
    return buildProfileContextPrompt(profileHelpers);
  }

  const {
    getBusinessContext,
    getBrandVoice,
    getContactInfo
  } = profileHelpers;

  const enhancements = [];
  const businessContext = getBusinessContext();
  const brandVoice = getBrandVoice();
  const contactInfo = getContactInfo();

  // Add business context if not already in prompt
  if (businessContext && !existingPrompt.includes(businessContext)) {
    enhancements.push(`\nBUSINESS CONTEXT:\n${businessContext}`);
  }

  // Add brand voice if not already mentioned
  if (brandVoice && !existingPrompt.toLowerCase().includes('tone') && !existingPrompt.toLowerCase().includes('personality')) {
    enhancements.push(`\nBrand Voice: ${brandVoice}`);
  }

  // Add contact info if not already mentioned
  if (contactInfo?.fullName && !existingPrompt.includes(contactInfo.fullName)) {
    enhancements.push(`\nYou are representing ${contactInfo.fullName}.`);
  }

  if (enhancements.length === 0) {
    return existingPrompt;
  }

  return existingPrompt + '\n' + enhancements.join('\n');
}

/**
 * Build a greeting message with profile context
 *
 * @param {Object} profileHelpers - Profile context helpers from useProfile hook
 * @param {string} [customGreeting] - Custom greeting to use instead of default
 * @returns {string} Greeting message
 */
export function buildGreeting(profileHelpers, customGreeting) {
  if (customGreeting) {
    return customGreeting;
  }

  const { getContactInfo } = profileHelpers;
  const contactInfo = getContactInfo();

  if (contactInfo?.fullName) {
    return `Hello! This is ${contactInfo.fullName}. How are you today?`;
  }

  return 'Hello! How can I help you today?';
}

/**
 * Get suggested first message based on agent type and profile
 *
 * @param {string} agentType - Type of agent (promo, vendor, appointment, etc.)
 * @param {Object} profileHelpers - Profile context helpers from useProfile hook
 * @returns {string} Suggested first message
 */
export function getSuggestedFirstMessage(agentType, profileHelpers) {
  const { getContactInfo } = profileHelpers;
  const contactInfo = getContactInfo();
  const name = contactInfo?.fullName || 'our company';

  const templates = {
    promo: `Hi! I'm calling from ${name} with an exciting offer for you.`,
    vendor: `Hello, this is ${name}. I wanted to reach out about an important update.`,
    appointment: `Hi! This is ${name} calling about your upcoming appointment.`,
    personal: `Hello! This is ${name}.`,
    lead: `Hi! I'm calling from ${name}. Do you have a moment to talk?`,
    custom: `Hello! This is ${name}. How can I help you today?`
  };

  return templates[agentType] || templates.custom;
}
