# AI Agents - LangGraph Call Router

This directory contains the AI agents implementation for VoiceNow CRM, starting with an intelligent call routing system.

## Overview

The call router uses LangGraph (stateful workflows) and LangChain (LLM orchestration) to intelligently route incoming calls based on detected intent. This saves money by:

1. **Voicemail Detection**: Terminates calls immediately when voicemail is detected
2. **Intent-Based Routing**: Routes calls to specialized agents (sales, support, info)
3. **Low Confidence Escalation**: Transfers to human agents when uncertain

## Architecture

```
┌─────────────────┐
│  Incoming Call  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intent Detection│  ← GPT-4o-mini analyzes first 10-20 seconds
│   (LangChain)   │     Detects: sales, support, general_info, voicemail
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Routing Decision│  ← LangGraph workflow determines route
│   (LangGraph)   │     Routes: terminate, sales_agent, support_agent, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Save to MongoDB│  ← Stores routing metadata in CallLog
│   (CallLog)     │
└─────────────────┘
```

## Directory Structure

```
ai-agents/
├── routers/
│   └── callRouter.js       # LangGraph call routing workflow
├── qualifiers/
│   └── (future) leadQualifier.js
├── memory/
│   └── (future) conversationMemory.js
├── utils/
│   └── (future) shared utilities
└── README.md
```

## Call Router Features

### 1. Intent Detection

Uses GPT-4o-mini to analyze call transcripts and detect:

- **sales**: Customer wants to purchase or learn about products
- **support**: Customer has a problem or needs technical help
- **general_info**: Customer wants hours, location, policies
- **voicemail**: Automated message or no human detected

Example:
```javascript
const result = await router.route(callId, "Hi, I'm interested in your remodeling services");
// Result: { intent: 'sales', confidence: 0.95, route: 'sales_agent' }
```

### 2. Intelligent Routing

Routes based on intent and confidence:

| Intent | Confidence | Route | Action |
|--------|-----------|-------|--------|
| voicemail | any | terminate | End call immediately |
| * | < 0.6 | human_fallback | Transfer to human |
| sales | ≥ 0.6 | sales_agent | Use sales prompt |
| support | ≥ 0.6 | support_agent | Use support prompt |
| general_info | ≥ 0.6 | info_agent | Use info prompt |

### 3. Specialized Prompts

Each route gets a customized prompt:

- **Sales Agent**: Qualify leads, book consultations
- **Support Agent**: Resolve issues, escalate when needed
- **Info Agent**: Provide information, identify sales opportunities
- **General Agent**: Understand needs, route appropriately

### 4. MongoDB Integration

Saves routing metadata to `CallLog` model:

```javascript
{
  metadata: {
    intent: 'sales',
    intentConfidence: 0.95,
    route: 'sales_agent',
    routingMetadata: { ... },
    routedAt: '2025-11-20T23:00:00.000Z'
  }
}
```

## API Endpoint

### POST /api/webhooks/ai/route-call

Routes an incoming call based on transcript analysis.

**Request**:
```json
{
  "callId": "673e5d50a1b2c3d4e5f6g7h8",
  "transcript": "Hi, I'm interested in getting a quote for a kitchen remodel."
}
```

**Response**:
```json
{
  "success": true,
  "intent": "sales",
  "confidence": 0.95,
  "route": "sales_agent",
  "shouldTerminate": false,
  "response": "You are a sales agent for Remodely AI...",
  "metadata": {
    "intentReasoning": "Customer explicitly wants a quote",
    "detectedAt": "2025-11-20T23:00:00.000Z",
    "routingDecision": "Routed to sales_agent based on sales intent"
  }
}
```

## Usage

### In ElevenLabs Webhook Handler

```javascript
import { getCallRouter } from '../ai-agents/routers/callRouter.js';

const router = getCallRouter();

// After first 10-20 seconds of call
const routing = await router.route(callLog._id, firstUtterance);

if (routing.shouldTerminate) {
  // End the call
  await elevenLabsService.terminateCall(conversationId);
} else {
  // Update agent prompt with routing.response
  await elevenLabsService.updatePrompt(conversationId, routing.response);
}
```

### Direct API Call

```bash
curl -X POST http://localhost:5001/api/webhooks/ai/route-call \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "673e5d50a1b2c3d4e5f6g7h8",
    "transcript": "Hi, you've reached John's voicemail..."
  }'
```

## Testing

Run the test suite:

```bash
node backend/test-call-router.js
```

Tests 5 scenarios:
1. Voicemail detection
2. Sales intent
3. Support request
4. General information
5. Ambiguous query

## Cost Savings

### Voicemail Detection

**Before**: Agent leaves 30-60 second message on every voicemail
- 100 voicemails/month × 45 seconds = 75 minutes wasted
- At $0.15/minute = $11.25/month wasted

**After**: Router detects voicemail in 3-5 seconds, hangs up
- 100 voicemails × 4 seconds = 6.7 minutes
- At $0.15/minute = $1.00/month
- **Savings: $10.25/month (91% reduction)**

### Intent Routing

**Before**: General agent handles all calls, takes 3+ exchanges to route
- Average: 2 minutes to understand intent and transfer
- 200 calls/month × 2 minutes = 400 minutes
- At $0.15/minute = $60/month

**After**: Router detects intent in first 10 seconds, routes immediately
- Average: 20 seconds to route
- 200 calls × 0.33 minutes = 66.7 minutes
- At $0.15/minute = $10/month
- **Savings: $50/month (83% reduction)**

**Total Monthly Savings: ~$60/month**

## Future Enhancements

### Phase 2: Lead Qualifier (CrewAI)

Multi-agent lead qualification system:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Qualifier  │ →   │   Researcher │ →   │   Scorer     │
│    Agent     │     │    Agent     │     │   Agent      │
└──────────────┘     └──────────────┘     └──────────────┘
      ↓                     ↓                     ↓
  Extract info      Check company CRM      Score lead 1-10
```

### Phase 3: Conversation Memory

Dual-layer memory system:

- **Short-term**: Last 10 messages in Redis
- **Long-term**: Vector embeddings in MongoDB Atlas

### Phase 4: RAG Integration

Query knowledge base for complex questions:

```
Customer: "What's your warranty policy?"
  → Vector search knowledge base
  → Retrieve relevant policy docs
  → Generate contextual response
```

## Dependencies

```json
{
  "@langchain/core": "^0.3.28",
  "@langchain/openai": "^0.3.22",
  "@langchain/community": "^1.0.4",
  "@langchain/langgraph": "^0.2.37",
  "zod": "^3.24.1"
}
```

## Configuration

Requires environment variable:

```bash
OPENAI_API_KEY=sk-...
```

Uses GPT-4o-mini for cost efficiency:
- $0.15/1M input tokens
- $0.60/1M output tokens
- Average routing cost: $0.0001 per call

## Performance

- **Intent Detection**: ~2-3 seconds
- **Full Routing**: ~3-5 seconds
- **Accuracy**: 85-95% (based on GPT-4o-mini performance)
- **Fallback**: Low confidence calls escalate to human

## Contributing

When adding new agents:

1. Create file in appropriate subdirectory (`routers/`, `qualifiers/`, etc.)
2. Export singleton instance via `getInstance()` pattern
3. Document API in this README
4. Add test scenarios to test file
5. Update integration points in controllers

## Support

For issues or questions:
- Check logs for detailed error messages
- Review test scenarios in `test-call-router.js`
- Ensure OpenAI API key is configured
- Verify MongoDB connection for state persistence
