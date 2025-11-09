# AI Agents - Multi-Provider Chat AI System

## Overview

Your CRM now supports **multi-provider AI chat agents** that work alongside voice agents. Users can create AI assistants powered by:
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude-3 Opus, Sonnet, Haiku)
- **Google** (Gemini Pro, Gemini 1.5 Pro)

## Why Multi-Provider AI Agents?

### Benefits for Your Users:
1. **Choice**: Pick the best model for their use case
2. **Cost Control**: Use cheaper models for simple tasks, powerful models for complex ones
3. **Redundancy**: If one provider has issues, switch to another
4. **Specialization**: Each model has unique strengths

### Benefits for You (Platform Owner):
1. **Competitive Advantage**: Most CRMs don't offer this flexibility
2. **Revenue Opportunity**: Charge per token or per message
3. **Future-Proof**: Easy to add new providers as they emerge
4. **User Lock-In**: More value = harder to switch away

## Key Features

### 1. Chat Assistants
Deploy AI chatbots for:
- Customer support (24/7 automated help)
- Lead qualification (pre-qualify before human handoff)
- FAQ answering (instant responses from knowledge base)
- Appointment scheduling (book meetings automatically)
- Sales assistance (answer product questions)

### 2. Multi-Channel Deployment
AI agents can work on:
- **Web Widget**: Embed on your website
- **Slack**: Respond in Slack channels
- **WhatsApp**: Automated WhatsApp conversations
- **Telegram**: Telegram bot
- **Discord**: Discord bot
- **SMS**: Text message conversations
- **Email**: Automated email responses
- **API**: Direct API access for custom integrations

### 3. Knowledge Base (RAG)
Upload documents and let the AI answer questions from your content:
- PDFs (product manuals, policies)
- Text files (FAQs, documentation)
- URLs (scrape website content)
- Vector search for accurate retrieval

### 4. Function Calling / Tools
AI agents can take actions:
- Create leads in CRM
- Schedule appointments
- Send emails/SMS
- Update deals
- Query databases
- Call external APIs

### 5. Guardrails
Protect your brand:
- Block sensitive topics
- Profanity filter
- Rate limiting
- Max messages per session
- Sensitive data detection (PII, credit cards)

### 6. Testing Framework
Test agents before deployment:
- Run test conversations
- Compare expected vs actual output
- Track pass/fail rates
- Iterate on prompts

## API Endpoints

### GET /api/ai-agents
Get all AI agents for authenticated user

**Response**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "name": "Customer Support Bot",
    "type": "chat",
    "provider": "openai",
    "model": "gpt-4",
    "category": "customer_support",
    "enabled": true,
    "deployment": {
      "status": "active",
      "apiKey": "ai_abc123...",
      "embedCode": "<script>...</script>"
    },
    "analytics": {
      "totalConversations": 1523,
      "totalMessages": 8945,
      "averageResponseTime": 850,
      "satisfactionScore": 4.7
    }
  }
]
```

### POST /api/ai-agents/create
Create a new AI agent

**Request Body**:
```json
{
  "name": "Sales Assistant",
  "type": "chat",
  "provider": "anthropic",
  "model": "claude-3-sonnet-20240229",
  "systemPrompt": "You are a sales assistant for {{company_name}}...",
  "category": "sales",
  "configuration": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "responseFormat": "text"
  },
  "capabilities": {
    "functionCalling": true,
    "webSearch": false
  },
  "channels": [
    {
      "type": "web_widget",
      "enabled": true,
      "customization": {
        "primaryColor": "#0066FF",
        "welcomeMessage": "Hi! How can I help you today?",
        "position": "bottom-right"
      }
    }
  ],
  "guardrails": {
    "enabled": true,
    "profanityFilter": true,
    "maxMessagesPerSession": 50
  }
}
```

**Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Sales Assistant",
  "provider": "anthropic",
  "model": "claude-3-sonnet-20240229",
  "deployment": {
    "status": "draft",
    "apiKey": "ai_xyz789..."
  },
  "enabled": false,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### POST /api/ai-agents/:id/chat
Send a message to an AI agent

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "What are your pricing plans?" }
  ],
  "stream": false
}
```

**Response**:
```json
{
  "provider": "anthropic",
  "response": "We offer three pricing tiers:\n\n1. **Starter** ($99/mo)...",
  "usage": {
    "inputTokens": 45,
    "outputTokens": 128,
    "totalTokens": 173
  },
  "model": "claude-3-sonnet-20240229",
  "finishReason": "end_turn"
}
```

**Streaming** (set `"stream": true`):
Server-sent events stream:
```
data: {"chunk": "We"}
data: {"chunk": " offer"}
data: {"chunk": " three"}
data: [DONE]
```

### POST /api/ai-agents/:id/deploy
Activate an AI agent (generates API key and embed code)

**Response**:
```json
{
  "message": "AI agent deployed successfully",
  "agent": { ... },
  "apiKey": "ai_abc123xyz...",
  "embedCode": "<!-- VoiceFlow AI Chat Widget -->\n<script>...</script>"
}
```

### POST /api/ai-agents/:id/test
Test an AI agent with sample input

**Request Body**:
```json
{
  "input": "What are your business hours?",
  "expectedOutput": "Monday-Friday 9am-5pm"
}
```

**Response**:
```json
{
  "input": "What are your business hours?",
  "output": "We're open Monday through Friday from 9am to 5pm EST.",
  "passed": true,
  "usage": {
    "inputTokens": 12,
    "outputTokens": 18,
    "totalTokens": 30
  }
}
```

### GET /api/ai-agents/helpers/models
Get available AI models for each provider

**Response**:
```json
{
  "openai": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "description": "Most capable, best for complex tasks"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "description": "Fast and affordable"
    }
  ],
  "anthropic": [
    {
      "id": "claude-3-opus-20240229",
      "name": "Claude 3 Opus",
      "description": "Most intelligent model"
    },
    {
      "id": "claude-3-sonnet-20240229",
      "name": "Claude 3 Sonnet",
      "description": "Balanced performance"
    }
  ],
  "google": [
    {
      "id": "gemini-pro",
      "name": "Gemini Pro",
      "description": "Google's most capable model"
    }
  ]
}
```

### GET /api/ai-agents/helpers/templates
Get pre-built AI agent templates

**Response**: Array of 5 agent templates (Customer Support, Sales, Lead Qualification, FAQ Bot, Appointment Scheduler)

## 5 Pre-Built Templates

### 1. 💬 Customer Support Assistant
**Provider**: OpenAI GPT-4
**Purpose**: 24/7 automated customer support
**Capabilities**: Function calling enabled
**Use Cases**:
- Answer common questions
- Troubleshoot issues
- Escalate to humans when needed
- Collect customer information

**Sample Prompt**:
```
You are a helpful customer support assistant for {{company_name}}.

Your responsibilities:
- Answer customer questions professionally
- Troubleshoot common issues
- Escalate complex problems to human agents
- Maintain a friendly, empathetic tone

If you cannot help, say: "Let me connect you with a specialist."
```

### 2. 💼 Sales Assistant
**Provider**: Anthropic Claude-3 Sonnet
**Purpose**: Qualify leads and answer product questions
**Capabilities**: Function calling enabled
**Use Cases**:
- Answer product questions
- Qualify potential customers
- Schedule demos
- Move leads through funnel

**Discovery Questions**:
1. What challenges are you trying to solve?
2. What's your timeline?
3. Who else is involved in the decision?
4. What's your budget range?

### 3. 🎯 Lead Qualification Bot
**Provider**: OpenAI GPT-3.5-turbo (cost-effective)
**Purpose**: Automatically qualify inbound leads
**Scoring**: 0-100 based on BANT criteria
**Use Cases**:
- Ask qualifying questions
- Calculate lead score
- Route to appropriate salesperson
- Trigger nurture campaigns

**Qualification Criteria**:
- Budget (25 points)
- Authority (25 points)
- Need (25 points)
- Timeline (25 points)

### 4. ❓ FAQ Bot
**Provider**: Google Gemini Pro
**Purpose**: Answer FAQs from knowledge base
**Capabilities**: File analysis, RAG enabled
**Use Cases**:
- Answer common questions instantly
- Search through documentation
- Reduce support ticket volume
- Provide accurate information

### 5. 📅 Appointment Scheduler
**Provider**: OpenAI GPT-4
**Purpose**: Book appointments automatically
**Capabilities**: Function calling, calendar integration
**Use Cases**:
- Check availability
- Book meetings
- Send confirmations
- Handle rescheduling

## Pricing Strategy

### Token-Based Pricing
Track usage and charge accordingly:

| Provider | Model | Input (per 1k tokens) | Output (per 1k tokens) |
|----------|-------|----------------------|------------------------|
| OpenAI | GPT-4 | $0.03 | $0.06 |
| OpenAI | GPT-3.5-turbo | $0.0005 | $0.0015 |
| Anthropic | Claude-3 Opus | $0.015 | $0.075 |
| Anthropic | Claude-3 Sonnet | $0.003 | $0.015 |
| Anthropic | Claude-3 Haiku | $0.00025 | $0.00125 |
| Google | Gemini Pro | $0.00025 | $0.0005 |

### Your Markup Strategy
**Example**: Charge 2x what you pay:

**Provider Cost**: GPT-4 conversation (500 tokens in, 500 out) = $0.045
**Your Price**: $0.09
**Profit**: $0.045 (100% margin)

**Alternative**: Include in subscription with token limits:
- **Starter**: 10,000 AI tokens/month included
- **Professional**: 50,000 AI tokens/month included
- **Enterprise**: 250,000 AI tokens/month included

### Subscription Limits

| Plan | Max AI Agents | Monthly AI Tokens |
|------|---------------|-------------------|
| Trial | 1 | 1,000 (testing) |
| Starter | 3 | 10,000 |
| Professional | 10 | 50,000 |
| Enterprise | Unlimited | 250,000+ |

## Environment Variables

Add these to your `.env` file:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google AI
GOOGLE_AI_API_KEY=AIza...
```

**Where to Get API Keys**:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Google AI: https://makersuite.google.com/app/apikey

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER REQUEST                         │
│  "What are your pricing plans?"                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  AI AGENT CONTROLLER                    │
│  - Validate request                                     │
│  - Check token balance                                  │
│  - Load agent configuration                             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  AI AGENT SERVICE                       │
│  - Route to correct provider                            │
│  - Add system prompt                                    │
│  - Handle streaming/non-streaming                       │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   OpenAI     │  │  Anthropic   │  │  Google AI   │
│   GPT-4      │  │  Claude-3    │  │  Gemini      │
└──────────────┘  └──────────────┘  └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    RESPONSE                             │
│  "We offer three plans: Starter ($99)..."              │
│  + Track tokens used                                    │
│  + Update analytics                                     │
│  + Bill user account                                    │
└─────────────────────────────────────────────────────────┘
```

### Example Conversation Flow

1. **User visits website** with embedded chat widget
2. **Widget loads** using agent's embed code
3. **User types message**: "Do you offer refunds?"
4. **Frontend sends** POST to `/api/ai-agents/{agentId}/chat`
5. **Backend validates** user has tokens available
6. **Service routes** to correct provider (e.g., Claude-3)
7. **AI responds**: "Yes, we offer a 30-day money-back guarantee..."
8. **Backend tracks** tokens used (45 input + 67 output = 112 total)
9. **User billed** $0.003 × (112/1000) = $0.000336
10. **Response sent** back to widget
11. **Widget displays** AI response to user

## Knowledge Base / RAG Implementation

### How to Add Documents

**Upload Document**:
```javascript
// Frontend: Upload file
const formData = new FormData();
formData.append('document', file);
formData.append('name', 'Product Manual');
formData.append('type', 'pdf');

await fetch(`/api/ai-agents/${agentId}/knowledge-base/upload`, {
  method: 'POST',
  body: formData
});
```

**Backend Processing**:
1. Extract text from PDF/document
2. Split into chunks (500 tokens each)
3. Generate embeddings using OpenAI `text-embedding-3-small`
4. Store in vector database (Pinecone, Weaviate, or MongoDB Atlas Vector Search)
5. Link to agent's `knowledgeBase.vectorStoreId`

**Query Time**:
1. User asks: "What's your refund policy?"
2. Generate embedding for question
3. Vector search for top 3 relevant chunks
4. Inject chunks into system prompt as context
5. AI answers based on actual documentation

### Vector Database Options

**Option 1: Pinecone** (Easiest, managed)
```bash
npm install @pinecone-database/pinecone
```
- Free tier: 1 index, 100k vectors
- Paid: $70/mo for 10M vectors

**Option 2: MongoDB Atlas Vector Search** (Already using MongoDB)
- Enable vector search on existing cluster
- No additional cost
- Store embeddings directly in MongoDB

**Option 3: Weaviate** (Open source, self-hosted)
- Free if self-hosted
- More control

## Function Calling / Tools

Enable AI agents to take actions in your CRM.

### Example: Create Lead from Chat

**Define Tool**:
```javascript
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_lead',
      description: 'Create a new lead in the CRM',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Lead name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          source: { type: 'string', description: 'Lead source' }
        },
        required: ['name', 'email']
      }
    }
  }
];
```

**AI Decides to Call Function**:
```json
{
  "functionCall": {
    "name": "create_lead",
    "arguments": {
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890",
      "source": "chat_widget"
    }
  }
}
```

**Backend Executes Function**:
```javascript
if (result.functionCall) {
  const { name, arguments: args } = result.functionCall;

  if (name === 'create_lead') {
    await Lead.create({
      userId: agent.userId,
      ...args
    });

    // Send confirmation back to AI
    messages.push({
      role: 'assistant',
      content: 'I\'ve created the lead in the CRM.'
    });
  }
}
```

## Analytics & Insights

Track AI agent performance:

### Metrics to Monitor:
1. **Total Conversations**: Number of unique chats
2. **Total Messages**: All messages sent/received
3. **Average Response Time**: How fast AI responds (ms)
4. **Satisfaction Score**: User ratings (1-5 stars)
5. **Handoff Rate**: % of conversations escalated to humans
6. **Resolution Rate**: % of conversations fully resolved
7. **Token Usage**: Total tokens consumed
8. **Cost**: Total API cost

### Dashboard View:
```
┌─────────────────────────────────────────────────┐
│  Customer Support Bot - Last 30 Days            │
├─────────────────────────────────────────────────┤
│  📊 Conversations:  1,523                       │
│  💬 Messages:       8,945                       │
│  ⚡ Avg Response:   850ms                       │
│  ⭐ Satisfaction:   4.7/5                       │
│  👤 Handoff Rate:   12%                         │
│  ✅ Resolution:     88%                         │
│  💰 Cost:           $127.45                     │
└─────────────────────────────────────────────────┘
```

## Best Practices

### 1. Choose the Right Model

**Use GPT-4 for**:
- Complex reasoning
- Creative tasks
- High-stakes conversations

**Use Claude-3 Sonnet for**:
- Balanced performance
- Long conversations
- Nuanced understanding

**Use GPT-3.5-turbo for**:
- Simple FAQs
- High-volume, low-complexity
- Cost optimization

**Use Gemini Pro for**:
- Long context (1M tokens)
- Multimodal (text + images)
- Cost-effective alternative

### 2. Write Effective System Prompts

**Good Prompt**:
```
You are a customer support agent for Acme Corp.

CONTEXT:
- Company: {{company_name}}
- Customer: {{customer_name}} ({{customer_email}})
- Tier: {{subscription_tier}}

YOUR ROLE:
- Answer questions about products/services
- Troubleshoot common issues
- Escalate complex problems

TONE: Friendly, professional, empathetic

CONSTRAINTS:
- Don't make promises about refunds (escalate)
- Don't share competitor information
- Don't reveal internal processes

If you don't know something, say: "Let me connect you with a specialist."
```

**Bad Prompt**:
```
Answer customer questions.
```

### 3. Implement Guardrails

```javascript
guardrails: {
  enabled: true,
  blockedTopics: ['politics', 'religion', 'competitors'],
  sensitiveDataDetection: true, // Block SSN, credit cards
  profanityFilter: true,
  maxMessagesPerSession: 50,
  rateLimitPerUser: {
    maxRequests: 20,
    windowSeconds: 60 // 20 messages per minute max
  }
}
```

### 4. Test Before Deploying

Always run tests:
```bash
curl -X POST http://localhost:5000/api/ai-agents/{agentId}/test \
  -H "Authorization: Bearer {token}" \
  -d '{
    "input": "What is your refund policy?",
    "expectedOutput": "30-day money-back guarantee"
  }'
```

### 5. Monitor & Iterate

- Review conversation logs weekly
- Identify common failure patterns
- Update system prompts based on learnings
- A/B test different prompts

## Roadmap

### Phase 1: Foundation ✅ (DONE)
- Multi-provider support (OpenAI, Anthropic, Google)
- Basic chat API
- Agent CRUD operations
- Templates

### Phase 2: Advanced Features (Next)
- Knowledge base / RAG implementation
- Function calling for CRM actions
- Multi-channel deployment (Slack, WhatsApp)
- Conversation history & context management

### Phase 3: Enterprise Features
- Custom model fine-tuning
- Team collaboration (shared agents)
- Advanced analytics dashboard
- A/B testing framework
- Sentiment analysis
- Conversation insights

### Phase 4: Monetization
- Token tracking & billing
- Usage dashboards
- Overage alerts
- Cost optimization recommendations

## Support & Documentation

### For Platform Owner:
- Multi-provider AI integration complete
- Cost tracking built-in
- Scalable architecture ready

### For End Users:
- 5 proven templates to start
- Documentation guide (this file)
- Testing framework included
- Analytics out of the box

---

**Bottom Line**: Give users the power to deploy enterprise-grade AI assistants across multiple channels, powered by the best AI models available, all managed from your CRM. This is a massive competitive advantage and revenue opportunity!
