import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, Annotation } from '@langchain/langgraph';
import CallLog from '../../models/CallLog.js';

/**
 * LangGraph Call Router
 *
 * Intelligent call routing system that:
 * 1. Detects call intent from initial utterance
 * 2. Routes to appropriate handler (sales, support, info, voicemail)
 * 3. Saves routing decision to MongoDB
 * 4. Returns appropriate response prompt
 */

// Define state annotation for LangGraph
const CallRouterState = Annotation.Root({
  callId: Annotation,
  transcript: Annotation,
  intent: Annotation,
  confidence: Annotation,
  route: Annotation,
  response: Annotation,
  metadata: Annotation,
});

class CallRouter {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Build the routing graph
    this.graph = this.buildGraph();
  }

  /**
   * Intent Detection Node
   * Analyzes initial transcript to determine caller intent
   */
  async detectIntent(state) {
    const { transcript } = state;

    const prompt = `You are an expert call center AI analyzing the intent of an incoming call.

TRANSCRIPT: "${transcript}"

Analyze this transcript and determine the caller's primary intent. Respond with ONLY a JSON object in this exact format:
{
  "intent": "sales|support|general_info|voicemail",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

INTENT DEFINITIONS:
- "sales": Caller wants to purchase, upgrade, or learn about products/services for buying
- "support": Caller has a problem, complaint, or needs technical help with existing service
- "general_info": Caller wants information about hours, location, policies (not buying intent)
- "voicemail": This is a voicemail greeting, automated message, or no human response detected

VOICEMAIL INDICATORS:
- Phrases like "leave a message", "not available", "you've reached", "please hold"
- Beep sounds or long silences
- Automated voice patterns

Examples:
- "Hi, I'm interested in your remodeling services" → sales
- "My invoice is wrong, I need help" → support
- "What are your business hours?" → general_info
- "You've reached John Smith, please leave..." → voicemail`;

    try {
      const response = await this.llm.invoke(prompt);
      const result = JSON.parse(response.content);

      console.log('🎯 Intent Detection:', {
        transcript: transcript.substring(0, 100),
        intent: result.intent,
        confidence: result.confidence,
        reasoning: result.reasoning
      });

      return {
        ...state,
        intent: result.intent,
        confidence: result.confidence,
        metadata: {
          ...state.metadata,
          intentReasoning: result.reasoning,
          detectedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error('❌ Intent detection error:', error);
      return {
        ...state,
        intent: 'unknown',
        confidence: 0,
        metadata: {
          ...state.metadata,
          error: error.message,
        }
      };
    }
  }

  /**
   * Routing Decision Node
   * Determines which handler should take the call
   */
  async routeCall(state) {
    const { intent, confidence, callId } = state;

    // Voicemail detection - terminate immediately
    if (intent === 'voicemail') {
      return {
        ...state,
        route: 'terminate',
        response: "I'll try calling back later. Goodbye!",
        metadata: {
          ...state.metadata,
          routingDecision: 'Voicemail detected - terminating to save costs',
        }
      };
    }

    // Low confidence - escalate to human
    if (confidence < 0.6) {
      return {
        ...state,
        route: 'human_fallback',
        response: "Let me connect you with someone who can better assist you. Please hold.",
        metadata: {
          ...state.metadata,
          routingDecision: `Low confidence (${confidence}) - escalating to human`,
        }
      };
    }

    // Route based on intent
    let route, response;
    switch (intent) {
      case 'sales':
        route = 'sales_agent';
        response = this.getSalesPrompt();
        break;
      case 'support':
        route = 'support_agent';
        response = this.getSupportPrompt();
        break;
      case 'general_info':
        route = 'info_agent';
        response = this.getInfoPrompt();
        break;
      default:
        route = 'general_agent';
        response = this.getGeneralPrompt();
    }

    console.log('🔀 Routing Decision:', {
      callId,
      intent,
      confidence,
      route,
    });

    return {
      ...state,
      route,
      response,
      metadata: {
        ...state.metadata,
        routingDecision: `Routed to ${route} based on ${intent} intent`,
      }
    };
  }

  /**
   * Save Routing Node
   * Persists routing decision to MongoDB
   */
  async saveRouting(state) {
    const { callId, intent, confidence, route, metadata } = state;

    try {
      await CallLog.findByIdAndUpdate(callId, {
        $set: {
          'metadata.intent': intent,
          'metadata.intentConfidence': confidence,
          'metadata.route': route,
          'metadata.routingMetadata': metadata,
          'metadata.routedAt': new Date(),
        }
      });

      console.log('💾 Routing saved to MongoDB:', callId);
    } catch (error) {
      console.error('❌ Failed to save routing:', error);
    }

    return state;
  }

  /**
   * Build the LangGraph workflow
   */
  buildGraph() {
    const workflow = new StateGraph(CallRouterState);

    // Add nodes
    workflow.addNode('detect_intent', (state) => this.detectIntent(state));
    workflow.addNode('route_call', (state) => this.routeCall(state));
    workflow.addNode('save_routing', (state) => this.saveRouting(state));

    // Define edges (flow)
    workflow.setEntryPoint('detect_intent');
    workflow.addEdge('detect_intent', 'route_call');
    workflow.addEdge('route_call', 'save_routing');
    workflow.addEdge('save_routing', END);

    return workflow.compile();
  }

  /**
   * Execute routing for a call
   */
  async route(callId, transcript) {
    try {
      const initialState = {
        callId,
        transcript,
        metadata: {},
      };

      const result = await this.graph.invoke(initialState);

      return {
        success: true,
        intent: result.intent,
        confidence: result.confidence,
        route: result.route,
        response: result.response,
        shouldTerminate: result.route === 'terminate',
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('❌ Call routing error:', error);
      return {
        success: false,
        error: error.message,
        route: 'general_agent',
        response: this.getGeneralPrompt(),
      };
    }
  }

  // Response prompts for each route
  getSalesPrompt() {
    return `You are a sales agent for VoiceNow CRM. The customer has shown buying interest.

Your goal: Qualify the lead and book a consultation.

Key points:
- Ask about their project (kitchen, bathroom, full home remodel?)
- Ask about timeline (urgent, planning, just exploring?)
- Offer to schedule a free consultation with our design team
- Get their contact information if not already captured

Be friendly, consultative, and focus on understanding their needs.`;
  }

  getSupportPrompt() {
    return `You are a support agent for VoiceNow CRM. The customer needs help with an existing issue.

Your goal: Resolve the issue or escalate appropriately.

Key points:
- Listen carefully to the problem
- Ask clarifying questions
- Offer immediate solutions if possible
- Escalate to technical team if needed
- Always confirm the issue is resolved before ending

Be empathetic, patient, and solution-focused.`;
  }

  getInfoPrompt() {
    return `You are an information agent for VoiceNow CRM. The customer wants general information.

Your goal: Provide accurate information and identify if there's sales potential.

Key points:
- Business hours: Monday-Friday 9AM-6PM, Saturday 10AM-4PM
- Location: Serving all of [Your Area]
- Services: Kitchen, bathroom, and full home remodeling
- Free consultations available
- If they show interest in services, offer to connect with sales

Be helpful, informative, and watch for buying signals.`;
  }

  getGeneralPrompt() {
    return `You are a general assistant for VoiceNow CRM.

Your goal: Understand what the caller needs and assist appropriately.

Key points:
- Ask how you can help them today
- Listen for intent (sales, support, or info request)
- Route internally once you understand their need
- Be professional and courteous

Keep it conversational and helpful.`;
  }
}

// Singleton instance
let routerInstance = null;

export function getCallRouter() {
  if (!routerInstance) {
    routerInstance = new CallRouter();
  }
  return routerInstance;
}

export default CallRouter;
