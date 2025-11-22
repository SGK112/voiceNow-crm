import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * AI Extraction Service
 * Uses GPT-4 to extract structured data from call transcripts
 */

/**
 * Extract lead data from call transcript
 * @param {string} transcript - Full conversation transcript
 * @returns {Promise<Object>} Extracted lead data
 */
export async function extractLeadDataFromTranscript(transcript) {
  try {
    const prompt = `Analyze this sales call transcript and extract structured data in JSON format.

TRANSCRIPT:
${transcript}

Extract and return ONLY valid JSON with these exact fields:
{
  "customerName": "full name mentioned or null",
  "customerPhone": "phone number if mentioned or null",
  "customerEmail": "email address if mentioned or null",
  "industry": "their industry or business type (e.g., construction, real estate, sales, etc.)",
  "companyName": "company name if mentioned or null",
  "painPoints": ["array of specific pain points or challenges they mentioned"],
  "budgetMentioned": "budget amount/range mentioned or null",
  "timeline": "urgency or timeline mentioned (e.g., 'this week', '30 days', 'soon', etc.) or null",
  "featuresInterested": ["specific features or capabilities they asked about"],
  "objections": ["any objections or concerns they raised"],
  "competitorsMentioned": ["any competing products/services mentioned"],
  "interestLevel": "High|Medium|Low based on their engagement and enthusiasm",
  "requestedDemo": true if they asked for a demo/trial/more info, false otherwise,
  "isDecisionMaker": true if they can make purchasing decisions, false if not, null if unknown,
  "sentiment": "Positive|Neutral|Negative based on overall tone and satisfaction",
  "keyQuotes": ["1-2 notable quotes from the customer that show intent or concerns"]
}

Be precise. If information isn't in the transcript, use null or empty arrays. Extract actual phrases for painPoints and features, not generic descriptions.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{
        role: 'user',
        content: prompt
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 1500
    });

    const extracted = JSON.parse(response.choices[0].message.content);

    console.log('✅ AI extraction completed:', {
      name: extracted.customerName,
      industry: extracted.industry,
      interest: extracted.interestLevel,
      painPoints: extracted.painPoints?.length || 0
    });

    return extracted;

  } catch (error) {
    console.error('❌ AI extraction failed:', error.message);

    // Return safe defaults if AI extraction fails
    return {
      customerName: null,
      customerPhone: null,
      customerEmail: null,
      industry: 'Unknown',
      companyName: null,
      painPoints: [],
      budgetMentioned: null,
      timeline: null,
      featuresInterested: [],
      objections: [],
      competitorsMentioned: [],
      interestLevel: 'Medium',
      requestedDemo: false,
      isDecisionMaker: null,
      sentiment: 'Neutral',
      keyQuotes: []
    };
  }
}

/**
 * Calculate lead quality score from extracted data
 * Score range: 0-20 points
 * @param {Object} extractedData - Data from AI extraction
 * @param {string} transcript - Original transcript for additional analysis
 * @returns {number} Lead score 0-20
 */
export function calculateLeadScore(extractedData, transcript = '') {
  let score = 0;

  // Budget mentioned (+3 points) - shows they're serious
  if (extractedData.budgetMentioned) {
    score += 3;
    console.log('  +3 Budget mentioned:', extractedData.budgetMentioned);
  }

  // Timeline urgency (+3 points) - ready to move fast
  if (extractedData.timeline) {
    const urgentKeywords = ['immediate', 'today', 'this week', 'asap', 'urgent', 'soon', 'now', 'days'];
    const isUrgent = urgentKeywords.some(keyword =>
      extractedData.timeline.toLowerCase().includes(keyword)
    );
    if (isUrgent) {
      score += 3;
      console.log('  +3 Urgent timeline:', extractedData.timeline);
    } else {
      score += 1;
      console.log('  +1 Timeline mentioned:', extractedData.timeline);
    }
  }

  // Decision maker (+2 points) - can actually buy
  if (extractedData.isDecisionMaker === true) {
    score += 2;
    console.log('  +2 Decision maker');
  }

  // Pain points (+1 per point, max 2) - real problems to solve
  const painPointScore = Math.min(extractedData.painPoints?.length || 0, 2);
  score += painPointScore;
  if (painPointScore > 0) {
    console.log(`  +${painPointScore} Pain points:`, extractedData.painPoints);
  }

  // Features interested (+0.5 per feature, max 2) - engaged in conversation
  const featureScore = Math.min(Math.floor((extractedData.featuresInterested?.length || 0) / 2), 2);
  score += featureScore;
  if (featureScore > 0) {
    console.log(`  +${featureScore} Features interested:`, extractedData.featuresInterested);
  }

  // Requested demo/trial (+3 points) - clear next step interest
  if (extractedData.requestedDemo) {
    score += 3;
    console.log('  +3 Requested demo/trial');
  }

  // Competitors mentioned (+1 point) - actively comparing solutions
  if (extractedData.competitorsMentioned?.length > 0) {
    score += 1;
    console.log('  +1 Competitors mentioned:', extractedData.competitorsMentioned);
  }

  // Sentiment bonus/penalty
  if (extractedData.sentiment === 'Positive') {
    score += 2;
    console.log('  +2 Positive sentiment');
  } else if (extractedData.sentiment === 'Negative') {
    score -= 3;
    console.log('  -3 Negative sentiment');
  }

  // Objections but still interested (+2 points) - engaged enough to ask hard questions
  if (extractedData.objections?.length > 0 && extractedData.interestLevel !== 'Low') {
    score += 2;
    console.log('  +2 Objections raised but still interested');
  }

  // Interest level modifier
  if (extractedData.interestLevel === 'High') {
    score += 2;
    console.log('  +2 High interest level');
  } else if (extractedData.interestLevel === 'Low') {
    score -= 2;
    console.log('  -2 Low interest level');
  }

  // Ensure score is between 0-20
  const finalScore = Math.min(Math.max(score, 0), 20);

  console.log(`\n🎯 Final Lead Score: ${finalScore}/20`);

  return finalScore;
}

/**
 * Get lead quality category from score
 * @param {number} score - Lead score 0-20
 * @returns {Object} Category info
 */
export function getLeadQuality(score) {
  if (score >= 15) {
    return {
      level: 'hot',
      label: '🔥 HOT',
      color: '#16a34a',
      priority: 'urgent',
      followUpHours: 1,
      action: 'Call immediately - ready to buy!'
    };
  } else if (score >= 10) {
    return {
      level: 'warm',
      label: '🌡️ WARM',
      color: '#f59e0b',
      priority: 'high',
      followUpHours: 24,
      action: 'Follow up within 24 hours with personalized demo offer'
    };
  } else if (score >= 5) {
    return {
      level: 'cool',
      label: '❄️ COOL',
      color: '#6b7280',
      priority: 'normal',
      followUpHours: 72,
      action: 'Add to nurture sequence, follow up in 3-5 days'
    };
  } else {
    return {
      level: 'cold',
      label: '🧊 COLD',
      color: '#9ca3af',
      priority: 'low',
      followUpHours: 168, // 1 week
      action: 'Add to long-term nurture, educational content only'
    };
  }
}

/**
 * Estimate deal value based on industry and budget
 * @param {string} industry - Customer's industry
 * @param {string} budgetMentioned - Budget range mentioned
 * @returns {number} Estimated deal value in dollars
 */
export function estimateDealValue(industry, budgetMentioned) {
  // Try to extract number from budget string
  if (budgetMentioned) {
    const match = budgetMentioned.match(/\$?(\d+)/);
    if (match) {
      const amount = parseInt(match[1]);
      // If they mentioned a monthly budget, estimate 12-month value
      if (budgetMentioned.toLowerCase().includes('month') ||
          budgetMentioned.toLowerCase().includes('/mo')) {
        return amount * 12;
      }
      return amount;
    }
  }

  // Industry-based estimates (annual contract value)
  const industryEstimates = {
    'construction': 3000,
    'real estate': 5000,
    'sales': 4000,
    'customer service': 2000,
    'healthcare': 4500,
    'legal': 6000,
    'finance': 5500,
    'insurance': 4000,
    'marketing': 3500,
    'recruiting': 4000,
    'default': 2500
  };

  const normalizedIndustry = industry?.toLowerCase() || 'default';

  // Find matching industry or use default
  for (const [key, value] of Object.entries(industryEstimates)) {
    if (normalizedIndustry.includes(key)) {
      return value;
    }
  }

  return industryEstimates.default;
}

/**
 * Generate recommended next steps based on extracted data and score
 * @param {Object} extractedData - Extracted lead data
 * @param {number} score - Lead quality score
 * @returns {Array<string>} List of recommended actions
 */
export function generateNextSteps(extractedData, score) {
  const quality = getLeadQuality(score);
  const steps = [];

  // High priority actions
  if (score >= 15) {
    steps.push(`🔥 URGENT: Call within 1 hour - they're ready to buy!`);
    steps.push(`Offer to help with onboarding personally`);
    steps.push(`Send calendar invite for implementation kickoff call`);
    if (extractedData.budgetMentioned) {
      steps.push(`Prepare custom proposal based on ${extractedData.budgetMentioned} budget`);
    }
  }
  // Medium priority
  else if (score >= 10) {
    steps.push(`Follow up within 24 hours`);
    steps.push(`Send personalized video walkthrough`);
    if (extractedData.painPoints?.length > 0) {
      steps.push(`Address their pain point: "${extractedData.painPoints[0]}"`);
    }
    steps.push(`Offer screen-share demo focusing on ${extractedData.featuresInterested[0] || 'key features'}`);
  }
  // Lower priority
  else {
    steps.push(`Add to nurture email sequence`);
    if (extractedData.featuresInterested?.length > 0) {
      steps.push(`Send educational content about ${extractedData.featuresInterested[0]}`);
    }
    if (extractedData.industry) {
      steps.push(`Share ${extractedData.industry} industry case study`);
    }
    steps.push(`Follow up in 3-5 days with value-focused content`);
  }

  // Handle objections
  if (extractedData.objections?.length > 0) {
    steps.push(`Address objection: "${extractedData.objections[0]}"`);
  }

  // Competitor mentions
  if (extractedData.competitorsMentioned?.length > 0) {
    steps.push(`Send comparison guide vs ${extractedData.competitorsMentioned[0]}`);
  }

  return steps;
}

export default {
  extractLeadDataFromTranscript,
  calculateLeadScore,
  getLeadQuality,
  estimateDealValue,
  generateNextSteps
};
