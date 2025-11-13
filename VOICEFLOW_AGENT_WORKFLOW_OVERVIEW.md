# VoiceFlow CRM - Agent & Workflow Implementation Overview

## Executive Summary

VoiceFlow CRM is a sophisticated voice-first CRM system built on Node.js/Express backend with React frontend. It implements two distinct but complementary agent systems:

1. **Voice Agents** - ElevenLabs-based conversational AI for phone calls
2. **AI Agents** - Multi-provider LLM-based chat/content agents (OpenAI, Anthropic, Google)

Both systems integrate with workflows, lead management, and billing systems for a complete automation platform.

---

## Architecture Overview

### Backend Stack
- **Runtime**: Node.js with ES6+ modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Key Providers**: ElevenLabs, OpenAI, Anthropic, Google Generative AI, Twilio, SendGrid
- **Integrations**: n8n, Stripe, Slack, Google Sheets/Calendar

### Frontend Stack
- **Framework**: React 18+
- **Query Management**: TanStack React Query (@tanstack/react-query)
- **Styling**: Tailwind CSS with custom UI components
- **HTTP Client**: Axios with JWT interceptors

### Database Schema (13+ models)
- User, Project, Lead, Deal, Task, Note, Campaign, CallLog
- VoiceAgent, AIAgent, KnowledgeBase, Integration, Workflow

---

## 1. Voice Agent System (ElevenLabs)

### Data Model: VoiceAgent

**Location**: `/backend/models/VoiceAgent.js`

```javascript
{
  userId: ObjectId,                    // Owner
  name: String,                        // Agent name
  type: ['lead_gen', 'booking', 'collections', 'promo', 'support', 'custom'],
  customType: String,                  // For custom types like "Follow-up"
  
  // ElevenLabs Integration
  elevenLabsAgentId: String,          // Required: Agent ID in ElevenLabs
  voiceId: String,                     // Voice model (e.g., 'EXAVITQu4vr4xnSDxMaL')
  voiceName: String,                   // Human-readable name (e.g., "Sarah")
  phoneNumber: String,                 // Optional: Assigned phone number
  
  // Script & Configuration
  script: String,                      // System prompt with {{variable}} support
  firstMessage: String,                // Opening line (also supports variables)
  
  // Availability
  availability: {
    enabled: Boolean,
    timezone: String,
    hours: {
      monday-sunday: { start, end, enabled }
    }
  },
  
  // Performance
  configuration: {
    temperature: Number,               // 0-2 (default 0.8)
    maxDuration: Number,               // Max call duration (seconds)
    language: String,                  // 'en', etc.
    qualificationQuestions: [String]
  },
  performance: {
    totalCalls, successfulCalls, averageDuration,
    leadsGenerated, conversionRate
  },
  
  enabled: Boolean,
  timestamps: true
}
```

### Supported Voice Types

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| lead_gen | Blue | 🎯 | Qualify leads, gather requirements |
| booking | Green | 📅 | Schedule appointments |
| collections | Yellow | 💰 | Payment reminders & collection |
| promo | Purple | 🎁 | Promotional campaigns |
| support | Red | 🛠️ | Customer service |
| custom | Gray | ⚙️ | User-defined purpose |

### Controller Functions

**Location**: `/backend/controllers/agentController.js`

```
getAgents()              - List all agents for user
getAgentById(id)         - Get specific agent details
createAgent(data)        - Create new ElevenLabs agent
  ├─ Validates subscription limits (1-Infinity based on plan)
  ├─ Creates agent in ElevenLabs
  └─ Stores in database with elevenLabsAgentId
updateAgent(id, data)    - Update agent configuration
deleteAgent(id)          - Remove agent
getAgentCalls(id)        - Fetch call history for agent
getAgentPerformance(id)  - Analytics (calls, success rate, duration)
getVoices()              - List available ElevenLabs voices
getAgentTemplates()      - Return pre-built agent templates
```

### Routes

**Location**: `/backend/routes/agents.js`

```
GET    /agents                  - getAgents()
POST   /agents/create          - createAgent()
GET    /agents/:id             - getAgentById()
PATCH  /agents/:id             - updateAgent()
DELETE /agents/:id             - deleteAgent()
GET    /agents/:id/calls       - getAgentCalls()
GET    /agents/:id/performance - getAgentPerformance()
GET    /agents/helpers/voices  - getVoices()
GET    /agents/helpers/templates - getAgentTemplates()
```

---

## 2. AI Agent System (Multi-Provider LLM)

### Data Model: AIAgent

**Location**: `/backend/models/AIAgent.js`

```javascript
{
  userId: ObjectId,
  name: String,
  type: ['chat', 'voice', 'email', 'sms'],
  provider: ['openai', 'anthropic', 'google', 'elevenlabs', 'custom'],
  model: String,  // 'gpt-4', 'claude-3-opus', 'gemini-pro', etc.
  
  // Prompt & Behavior
  systemPrompt: String,              // System instructions
  configuration: {
    temperature: Number,              // 0-2
    maxTokens: Number,
    topP: Number,
    frequencyPenalty: Number,
    presencePenalty: Number,
    stopSequences: [String],
    responseFormat: ['text', 'json']
  },
  
  // Capabilities
  capabilities: {
    webSearch: Boolean,
    imageGeneration: Boolean,
    codeExecution: Boolean,
    fileAnalysis: Boolean,
    functionCalling: Boolean
  },
  
  // Knowledge Base (RAG)
  knowledgeBase: {
    enabled: Boolean,
    documents: [{
      id, name, type: ['text', 'pdf', 'url'],
      content, url, uploadedAt
    }],
    vectorStoreId: String             // For embeddings
  },
  
  // Tool Integration
  tools: [{
    name, description,
    type: ['function', 'api', 'database', 'webhook'],
    config: { endpoint, method, headers, params, authentication }
  }],
  
  // Deployment
  deployment: {
    status: ['draft', 'testing', 'active', 'paused'],
    apiKey: String,                   // Unique agent API key
    webhookUrl: String,
    embedCode: String,                // Web widget code
    lastDeployedAt: Date
  },
  
  // Analytics
  analytics: {
    totalConversations, totalMessages,
    averageResponseTime, satisfactionScore,
    handoffRate, resolutionRate
  },
  
  category: ['customer_support', 'sales', 'lead_qualification', 'faq', 'general', 'custom'],
  enabled: Boolean
}
```

### Controller Functions

**Location**: `/backend/controllers/aiAgentController.js`

```
getAIAgents()            - List all AI agents for user
getAIAgent(id)           - Get specific agent details
createAIAgent(data)      - Create new AI agent
  ├─ Validates provider & model
  ├─ Generates unique API key
  ├─ Checks subscription limits (1-Infinity based on plan)
  └─ Stores configuration
updateAIAgent(id, data)  - Update agent configuration
deleteAIAgent(id)        - Remove agent
chatWithAgent(id, msg)   - Send message to agent (streaming)
deployAIAgent(id)        - Deploy agent to production
pauseAIAgent(id)         - Pause agent
testAIAgent(id, input)   - Test agent with sample input
getAvailableModels()     - List models by provider
getAIAgentTemplates()    - Return pre-built templates
```

### Routes

**Location**: `/backend/routes/aiAgents.js`

```
GET    /ai-agents                   - getAIAgents()
GET    /ai-agents/helpers/models    - getAvailableModels()
GET    /ai-agents/helpers/templates - getAIAgentTemplates()
GET    /ai-agents/:id               - getAIAgent()
POST   /ai-agents/create            - createAIAgent()
PATCH  /ai-agents/:id               - updateAIAgent()
DELETE /ai-agents/:id               - deleteAIAgent()
POST   /ai-agents/:id/chat          - chatWithAgent()
POST   /ai-agents/:id/deploy        - deployAIAgent()
POST   /ai-agents/:id/pause         - pauseAIAgent()
POST   /ai-agents/:id/test          - testAIAgent()
```

---

## 3. Dynamic Variables System

### How It Works

When initiating a call with a lead, the system automatically populates dynamic variables from lead data and passes them to the agent.

**Location**: `/backend/controllers/callController.js` (lines 122-186)

### Variable Sources

#### 1. Standard Lead Variables (Always Available)
```javascript
{
  lead_name: String,           // "John Smith"
  lead_email: String,          // "john@example.com"
  lead_phone: String,          // "+14802555887"
  lead_status: String,         // "new", "contacted", "qualified", "converted", "lost"
  lead_source: String,         // "lead_gen", "booking", etc.
  company_name: String,        // From user.company
  agent_type: String           // Voice agent type
}
```

#### 2. Conditional Variables (If Available)
```javascript
{
  qualified: String,           // "yes" (if lead.qualified === true)
  qualification_score: String, // "85"
  estimated_value: String,     // "$5000"
  assigned_to: String          // "Sarah Johnson"
}
```

#### 3. Custom Fields
Any custom field on a lead is automatically converted:
- Field name converted to lowercase
- Spaces replaced with underscores
- Examples: "Property Type" → `{{property_type}}`, "Price Range" → `{{price_range}}`

### Variable Replacement Implementation

```javascript
// Helper function for safe replacement
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeStringify = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && value === 0) return '0';
  return String(value);
};

// Replace all {{variable}} placeholders
Object.keys(dynamicVariables).forEach(key => {
  const safeValue = safeStringify(dynamicVariables[key]);
  if (safeValue) {
    const placeholder = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g');
    personalizedScript = personalizedScript.replace(placeholder, safeValue);
    personalizedFirstMessage = personalizedFirstMessage.replace(placeholder, safeValue);
  }
});
```

### Usage in Agent Prompts

#### Example 1: Lead Generation Agent
```
You are a friendly lead qualification specialist for {{company_name}}.

LEAD INFORMATION:
- Name: {{lead_name}}
- Email: {{lead_email}}
- Source: {{lead_source}}

Your goal is to qualify {{lead_name}} by understanding their needs.
Qualification Score: {{qualification_score}}/100
Estimated Project Value: {{estimated_value}}
```

#### Example 2: Real Estate with Custom Fields
```
You're calling {{lead_name}} about {{property_type}} properties
in {{location}}, priced around {{price_range}}, with {{bedrooms}} bedrooms.

Timeline: {{timeline}}
Budget: {{budget}}
```

---

## 4. Workflow System

### Data Model: Workflow

**Location**: `/backend/models/Workflow.js`

```javascript
{
  userId: ObjectId,
  name: String,
  description: String,
  enabled: Boolean,
  
  // Trigger Configuration
  trigger: {
    type: ['call_completed', 'call_initiated', 'lead_created', 'lead_qualified',
            'appointment_booked', 'payment_received', 'manual', 'schedule'],
    conditions: {
      agentTypes: [String],           // Filter by agent types
      callStatus: [String],           // Filter by call status
      leadQualified: Boolean,
      sentiment: [String],            // 'positive', 'negative', 'neutral'
      minimumDuration: Number,        // Minimum call duration in seconds
      customFields: Map
    },
    schedule: {
      type: String,                   // Cron expression
      timezone: String
    }
  },
  
  // Workflow Actions
  actions: [{
    id: String,
    type: ['send_sms', 'send_email', 'make_call', 'send_slack',
           'create_lead', 'update_lead', 'create_task', 'update_deal', 'add_note',
           'create_calendar_event', 'send_calendar_invite',
           'google_sheets_add_row', 'webhook', 'api_call',
           'delay', 'condition', 'loop'],
    name: String,
    config: {
      // Varies by action type
      to: String,                      // Phone/email recipient (supports variables)
      message: String,                 // With {{variable}} support
      subject: String,
      body: String,
      leadData: Map,
      taskTitle: String,
      url: String,
      method: String,
      headers: Map,
      body: Map,
      // ... etc
    },
    position: { x: Number, y: Number },
    nextAction: String                // Action ID to run next
  }],
  
  // Workflow Variables
  variables: Map,                      // Custom variables for workflow
  
  // Execution Tracking
  execution: {
    totalRuns: Number,
    successfulRuns: Number,
    failedRuns: Number,
    lastRunAt: Date,
    lastRunStatus: ['success', 'failed', 'running'],
    lastRunError: String,
    averageExecutionTime: Number
  },
  
  // Integration Connections
  integrations: [{
    service: ['google_calendar', 'google_sheets', 'twilio', 'sendgrid', 'slack', 'stripe', 'zapier'],
    connected: Boolean,
    credentials: Map,
    lastSyncedAt: Date
  }],
  
  category: ['lead_nurture', 'follow_up', 'customer_service', 'sales', 'marketing', 'operations', 'custom'],
  tags: [String]
}
```

### Workflow Engine

**Location**: `/backend/services/workflowEngine.js`

```javascript
class WorkflowEngine {
  async handleTrigger(triggerType, context)
    // Find all enabled workflows matching trigger
    // Check trigger conditions
    // Execute matching workflows

  checkTriggerConditions(conditions, context)
    // Check if context meets all conditions
    // Filter by agentTypes, callStatus, sentiment, etc.

  async executeWorkflow(workflow, context)
    // Sequential execution of actions
    // Variable substitution
    // Integration calls
    // Error handling and retries
}
```

### Workflow Execution Flow

```
Trigger Event (e.g., call_completed)
    ↓
Find enabled workflows matching trigger
    ↓
Check trigger conditions
    ↓
For matching workflows:
    ├─ Extract context (lead, call, agent data)
    ├─ Substitute {{variables}}
    ├─ Execute actions sequentially
    ├─ Handle conditions/branches
    └─ Track execution metrics
```

---

## 5. Call Initiation Flow

### Sequence Diagram

```
User → Frontend (Leads page)
    ↓
initiateCall(leadId, agentId, phoneNumber)
    ↓
Backend: /api/calls/initiate
    ├─ Validate agent & user subscription
    ├─ Fetch lead data
    ├─ Build dynamic variables
    │   ├─ Standard fields (name, email, phone, status, source)
    │   ├─ Conditional fields (qualified, score, value)
    │   └─ Custom fields (convert to snake_case)
    │
    ├─ Personalize script & first message
    │   └─ Replace all {{variable}} placeholders
    │
    ├─ Call ElevenLabs initiateCall()
    │   ├─ agent_id: elevenLabsAgentId
    │   ├─ recipients: [{phone_number, variables}]
    │   ├─ conversation_config_override: {
    │   │   agent: {
    │   │     prompt: personalizedScript,
    │   │     first_message: personalizedFirstMessage
    │   │   }
    │   │ }
    │   └─ webhook_url: callback endpoint
    │
    ├─ Create CallLog record
    ├─ Update Usage metrics
    └─ Return call confirmation
```

### Dynamic Variables in Call

**Location**: `/backend/services/elevenLabsService.js` (lines 81-148)

```javascript
async initiateCall(agentId, phoneNumber, agentPhoneNumberId, 
                   callbackUrl, dynamicVariables, 
                   personalizedScript, personalizedFirstMessage)

// Request body sent to ElevenLabs:
{
  call_name: `Call to ${lead_name}`,
  agent_id: agentId,
  agent_phone_number_id: agentPhoneNumberId,
  recipients: [{
    phone_number: phoneNumber,
    variables: dynamicVariables  // Passed for {{var}} support
  }],
  conversation_config_override: {
    agent: {
      prompt: { prompt: personalizedScript },
      first_message: personalizedFirstMessage
    }
  },
  webhook_url: callbackUrl
}
```

---

## 6. Data Flow & User Data Access

### User Model

**Location**: `/backend/models/User.js`

```javascript
{
  email: String,
  password: String (hashed),
  googleId: String (OAuth),
  company: String,                     // Company name for {{company_name}}
  plan: ['starter', 'professional', 'enterprise', 'trial'],
  
  // API Credentials (sensitive - select: false)
  apiKeys: {
    elevenlabs: String,
    twilio: String,
    sendgrid: String
  },
  
  // Email Configuration
  emailConfig: {
    smtpHost, smtpPort, smtpSecure,
    smtpUser, smtpPassword (select: false),
    fromEmail, fromName
  },
  
  // Phone Numbers
  phoneNumbers: [{
    number: String,
    provider: String,
    assignedAgent: ObjectId (VoiceAgent ref)
  }],
  
  // Team
  teamMembers: [{
    email, role: ['admin', 'member']
  }],
  
  // API Keys
  userApiKeys: [{
    name, key (select: false), prefix,
    scopes: ['agents.read', 'agents.write', ...],
    environment: ['production', 'development'],
    expiresAt
  }],
  
  // Webhook Settings
  settings: {
    webhookUrl: String,
    notifications: { email: Boolean, slack: Boolean, slackWebhook: String }
  }
}
```

### Lead Model

**Location**: `/backend/models/Lead.js`

```javascript
{
  userId: ObjectId,                    // Owner
  name: String,
  email: String,
  phone: String,
  source: String,
  qualified: Boolean,
  qualificationScore: Number (0-100),
  value: Number,
  status: ['new', 'contacted', 'qualified', 'converted', 'lost'],
  assignedTo: String,
  
  // Dynamic Custom Fields
  customFields: Map,                   // Any key-value pairs
  
  // Relations
  callId: ObjectId (CallLog ref),
  notes: [{
    content, createdBy, createdAt
  }],
  
  timestamps: true
}
```

### Data Isolation

All queries filter by `userId`:
```javascript
// Example from callController.js
const calls = await CallLog.find({
  userId: req.user._id,
  agentId: agentId  // Further filtered by agent
})

// User data never shared across accounts
const agent = await VoiceAgent.findOne({
  _id: agentId,
  userId: req.user._id  // Enforced at DB level
})
```

---

## 7. Frontend Architecture

### Page Structure

| Page | Path | Purpose |
|------|------|---------|
| Agents | `/agents` | List/manage voice agents with ElevenLabs integration |
| AgentDetail | `/agents/:id` | Edit agent, configure script, view call history |
| AIAgents | `/ai-agents` | List/manage AI agents (OpenAI, Claude, etc.) |
| Leads | `/leads` | Manage leads with call initiation capability |
| Workflows | `/workflows` | Build and manage automation workflows |
| Calls | `/calls` | Call history and analytics |
| Dashboard | `/dashboard` | Real-time metrics and KPIs |

### API Service Layer

**Location**: `/frontend/src/services/api.js`

```javascript
// Agent Management
agentApi = {
  getAgents(),                  // GET /agents
  getAgentById(id),            // GET /agents/:id
  createAgent(data),           // POST /agents/create
  updateAgent(id, data),       // PATCH /agents/:id
  deleteAgent(id),             // DELETE /agents/:id
  getAgentCalls(id),           // GET /agents/:id/calls
  getAgentPerformance(id)      // GET /agents/:id/performance
}

// AI Agent Management
aiAgentApi = {
  getAIAgents(),              // GET /ai-agents
  getAIAgentById(id),         // GET /ai-agents/:id
  createAIAgent(data),        // POST /ai-agents/create
  updateAIAgent(id, data),    // PATCH /ai-agents/:id
  deleteAIAgent(id)           // DELETE /ai-agents/:id
}

// Call Management
callApi = {
  getCalls(params),           // GET /calls
  getCallById(id),            // GET /calls/:id
  initiateCall(data),         // POST /calls/initiate
  deleteCall(id)              // DELETE /calls/:id
}

// Lead Management
leadApi = {
  getLeads(params),           // GET /leads
  getLeadById(id),            // GET /leads/:id
  createLead(data),           // POST /leads
  updateLead(id, data),       // PATCH /leads/:id
  deleteLead(id)              // DELETE /leads/:id
}
```

### React Query Integration

```javascript
// Example from Agents.jsx
const { data: agents } = useQuery({
  queryKey: ['agents'],
  queryFn: () => agentApi.getAgents()
})

const createMutation = useMutation({
  mutationFn: (data) => agentApi.createAgent(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['agents'])
  }
})
```

---

## 8. Subscription & Billing

### Plan Limits

| Plan | Voice Agents | AI Agents | Monthly Minutes |
|------|--------------|-----------|-----------------|
| Trial | 1 | 1 | 50 |
| Starter | 1 | 3 | 500 |
| Professional | 5 | 10 | 2000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Usage Tracking

**Location**: `/backend/models/Usage.js`

```javascript
{
  userId: ObjectId,
  month: String,               // "2024-11"
  monthStart: Date,
  monthEnd: Date,
  
  minutesIncluded: Number,     // Based on plan
  minutesUsed: Number,
  callsIncluded: Number,
  callsUsed: Number,
  
  // Overage tracking
  overageMinutes: Number,
  overageCost: Number
}
```

---

## 9. Integration Points

### ElevenLabs Service

**Location**: `/backend/services/elevenLabsService.js`

```javascript
class ElevenLabsService {
  async getVoices()              // List available voices
  async getAgentById(agentId)    // Fetch agent from ElevenLabs
  async createAgent(config)      // Create new agent
  async updateAgent(agentId, config) // Update agent
  async initiateCall(...)        // Make outbound call
  async getPrebuiltAgents()      // Template agents
}
```

### AI Service (Multi-Provider)

**Location**: `/backend/services/aiAgentService.js`

```javascript
class AIAgentService {
  async chat(agent, messages, options)  // Unified chat interface
  
  // Provider-specific methods:
  async chatOpenAI(agent, messages)     // GPT-4, GPT-3.5
  async chatAnthropic(agent, messages)  // Claude-3 models
  async chatGoogle(agent, messages)     // Gemini models
}
```

### Workflow Engine

**Location**: `/backend/services/workflowEngine.js`

```javascript
class WorkflowEngine {
  async handleTrigger(triggerType, context)  // Find & execute workflows
  checkTriggerConditions(conditions, context) // Validate conditions
  async executeWorkflow(workflow, context)   // Run actions
  async executeAction(action, context)       // Individual action handler
}
```

---

## 10. Call Data Model

**Location**: `/backend/models/CallLog.js`

```javascript
{
  userId: ObjectId,
  agentId: ObjectId (VoiceAgent ref),
  leadId: ObjectId (Lead ref),
  
  // Call Details
  callerName: String,
  callerPhone: String,
  phoneNumber: String,
  direction: ['inbound', 'outbound'],
  duration: Number,              // Seconds
  
  // Recording & Transcript
  transcript: String,
  recordingUrl: String,
  
  // Status & Result
  status: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', ...],
  sentiment: ['positive', 'neutral', 'negative'],
  
  // Data Captured
  leadsCapured: {
    name, email, phone,
    interest, qualified, appointmentBooked,
    appointmentDate, paymentCaptured, paymentAmount
  },
  
  // Billing
  cost: {
    costPerMinute: Number,       // ElevenLabs rate
    totalCost: Number,
    userCharge: Number           // Overage charge
  },
  
  // Integration
  elevenLabsCallId: String,
  metadata: Map,
  
  timestamps: true
}
```

---

## 11. Key Features & Capabilities

### Voice Agent Features
- ElevenLabs integration with 40+ voices
- Dynamic variable personalization
- Real-time transcription
- Performance analytics (success rate, avg duration)
- Availability scheduling (business hours)
- Temperature/behavior configuration
- Pre-built templates (6 types)

### AI Agent Features
- Multi-provider LLM support (OpenAI, Anthropic, Google)
- Knowledge base with RAG support
- Function calling capabilities
- Tool/API integration
- JSON output formatting
- Streaming chat responses
- Testing framework
- Deployment versioning

### Workflow Automation
- 8+ trigger types
- 15+ action types
- Conditional branching
- Loop support
- Integration with 7+ services
- Execution tracking & error handling
- Variable substitution throughout

### Data Personalization
- 20+ dynamic variables
- Custom field support
- Automatic snake_case conversion
- Safe variable replacement
- Handling of null/undefined values
- Lead context awareness

---

## 12. Security & Access Control

### Authentication
- JWT tokens with Bearer scheme
- Google OAuth support
- Password hashing with bcrypt
- Session timeout handling

### Authorization
- User isolation at DB query level
- Role-based access (admin/member)
- Subscription-based feature access
- API key scopes (agents.read, agents.write, etc.)

### Data Protection
- API credentials stored with `select: false`
- Sensitive fields excluded from responses
- User-specific data filtering
- Webhook signature validation

---

## 13. Extending the System

### To Add a New Agent Type:

1. **Backend**:
   - Add type to VoiceAgent/AIAgent schema
   - Create controller function
   - Add route
   - Create template

2. **Frontend**:
   - Add to AGENT_TYPES constant
   - Create form UI
   - Add API call

### To Add New Dynamic Variables:

1. **Backend** (`callController.js`):
   - Add to dynamicVariables object (line 122+)
   - Ensure safe stringification

2. **Documentation**:
   - Update DYNAMIC_VARIABLES.md
   - Add examples

### To Add New Workflow Trigger:

1. **Backend**:
   - Add to Workflow schema trigger.type enum
   - Update workflowEngine.handleTrigger()
   - Add condition checking logic

2. **Frontend**:
   - Add to template list
   - Create trigger configuration UI

---

## 14. File Structure Summary

```
voiceFlow-crm-1/
├── backend/
│   ├── models/
│   │   ├── User.js              # User account
│   │   ├── VoiceAgent.js        # ElevenLabs agents
│   │   ├── AIAgent.js           # LLM agents
│   │   ├── Lead.js              # CRM leads
│   │   ├── CallLog.js           # Call records
│   │   ├── Workflow.js          # Automation workflows
│   │   ├── Project.js           # Project/deal tracking
│   │   └── ... (more models)
│   ├── controllers/
│   │   ├── agentController.js        # Voice agent logic
│   │   ├── aiAgentController.js      # AI agent logic
│   │   ├── callController.js         # Call handling + dynamic vars
│   │   ├── workflowController.js     # Workflow management
│   │   └── ... (more controllers)
│   ├── routes/
│   │   ├── agents.js            # Voice agent endpoints
│   │   ├── aiAgents.js          # AI agent endpoints
│   │   ├── calls.js             # Call endpoints
│   │   ├── workflows.js         # Workflow endpoints
│   │   └── ... (more routes)
│   ├── services/
│   │   ├── elevenLabsService.js     # ElevenLabs API
│   │   ├── aiAgentService.js        # Multi-provider LLM
│   │   ├── workflowEngine.js        # Workflow execution
│   │   ├── workflowExecutor.js      # Action execution
│   │   ├── aiService.js             # AI utilities
│   │   └── ... (more services)
│   └── middleware/
│       └── auth.js              # JWT & subscription checks
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Agents.jsx           # Voice agent list
│   │   │   ├── AgentDetail.jsx      # Voice agent editor
│   │   │   ├── AIAgents.jsx         # AI agent list
│   │   │   ├── Leads.jsx            # Lead management
│   │   │   ├── Workflows.jsx        # Workflow builder
│   │   │   ├── Dashboard.jsx        # Analytics
│   │   │   └── ... (more pages)
│   │   ├── components/
│   │   │   ├── layout/              # Layout components
│   │   │   ├── ui/                  # UI primitives
│   │   │   ├── AIPromptHelper.jsx   # Dynamic variable helper
│   │   │   └── ... (more components)
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   └── lib/
│   │       └── utils.js             # Helper functions
│   └── vite.config.js
│
└── Documentation/
    ├── DYNAMIC_VARIABLES.md     # Variable usage guide
    ├── WORKFLOW_SYSTEM_PLAN.md  # Workflow overview
    ├── AI_AGENTS.md             # AI agent features
    └── ... (more docs)
```

---

## 15. Current Limitations & Future Enhancements

### Known Limitations
1. Voice agents require ElevenLabs API key (platform-wide setup)
2. Workflows execute sequentially only (no parallel branches)
3. No workflow visual editor UI yet
4. Limited retry logic for failed actions
5. No workflow versioning/rollback

### Potential Enhancements
1. Parallel workflow execution branches
2. Visual workflow editor (drag-drop canvas)
3. Advanced conditional logic (JS expressions)
4. Workflow history/audit trail
5. Custom action types (community plugins)
6. Real-time collaboration on workflows
7. A/B testing for agent scripts
8. Sentiment analysis on calls
9. Auto-scaling for high-volume calling
10. Webhook signing for security

---

## 16. Development Tips

### Key Principles
- All user data queries filter by `userId`
- Dynamic variables use `{{variable}}` syntax
- ElevenLabs agentId required for voice agents
- Subscription limits checked before operations
- Sensitive data marked with `select: false`

### Common Tasks

**Add new voice agent variable**:
- Update `dynamicVariables` in `callController.js` line 123
- Add example to `DYNAMIC_VARIABLES.md`

**Create new workflow action**:
- Add to Workflow schema action.type enum
- Implement handler in `workflowEngine.js`
- Add to templates in controller

**Support new AI provider**:
- Add to AIAgent schema provider enum
- Implement in `aiAgentService.js`
- Add routes/templates

---

## Conclusion

VoiceFlow CRM provides a comprehensive foundation for voice-powered automation with:
- Sophisticated agent management (voice + AI)
- Dynamic variable personalization
- Workflow automation with conditional logic
- Multi-provider LLM support
- Subscription-based billing
- Full audit trail and analytics

The system is extensible and ready for customization to specific use cases while maintaining security, performance, and data isolation.
