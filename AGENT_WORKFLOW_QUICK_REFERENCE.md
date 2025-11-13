# VoiceFlow CRM - Quick Reference Guide

## System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    VOICEFLOW CRM                            │
├─────────────────────────────────────────────────────────────┤
│ Frontend (React)          │ Backend (Node.js)               │
│ - Agents UI              │ - Voice Agent Controller        │
│ - Leads UI               │ - AI Agent Controller           │
│ - Workflows UI           │ - Call Controller               │
│ - Dashboard              │ - Workflow Engine               │
├─────────────────────────────────────────────────────────────┤
│ Integrations:                                               │
│ - ElevenLabs (Voice)  - OpenAI/Claude/Google (AI)         │
│ - Twilio (SMS)        - Stripe (Billing)                  │
│ - Slack                - Google Sheets/Calendar           │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files by Use Case

### I want to understand Voice Agents
1. Read: `/backend/models/VoiceAgent.js` - Data structure
2. Read: `/backend/controllers/agentController.js` - Business logic
3. Read: `/backend/routes/agents.js` - API endpoints
4. Read: `/backend/services/elevenLabsService.js` - ElevenLabs integration
5. Read: `/frontend/src/pages/Agents.jsx` - UI implementation

### I want to understand AI Agents
1. Read: `/backend/models/AIAgent.js` - Data structure
2. Read: `/backend/controllers/aiAgentController.js` - Business logic
3. Read: `/backend/routes/aiAgents.js` - API endpoints
4. Read: `/backend/services/aiAgentService.js` - Multi-provider LLM
5. Read: `/frontend/src/pages/AIAgents.jsx` - UI implementation

### I want to understand Dynamic Variables
1. Read: `/backend/controllers/callController.js` (lines 122-186)
2. Read: `/backend/services/elevenLabsService.js` (lines 81-148)
3. Read: `/DYNAMIC_VARIABLES.md` - Usage guide
4. Example: Custom fields converted to `{{snake_case}}`

### I want to understand Workflows
1. Read: `/backend/models/Workflow.js` - Schema with 15+ action types
2. Read: `/backend/services/workflowEngine.js` - Execution logic
3. Read: `/backend/controllers/workflowController.js` - API
4. Read: `/frontend/src/pages/Workflows.jsx` - UI

### I want to understand Calls & Personalization
1. Read: `/backend/controllers/callController.js` - Call initiation
2. Read: `/backend/models/CallLog.js` - Call data model
3. Read: `/backend/services/elevenLabsService.js` - ElevenLabs batch calling
4. Key: Dynamic variables injected into agent script at call time

### I want to understand User Data Access
1. Read: `/backend/models/User.js` - User schema
2. Read: `/backend/models/Lead.js` - Lead schema with customFields
3. Key: All queries filter by `userId` for multi-tenant isolation
4. Check: Auth middleware in `/backend/middleware/auth.js`

---

## Database Models (13 Total)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Account & config | email, company, plan, apiKeys, subscription |
| **VoiceAgent** | ElevenLabs agents | elevenLabsAgentId, script, voiceId, type |
| **AIAgent** | LLM agents | provider, model, systemPrompt, capabilities |
| **Lead** | CRM leads | name, email, phone, customFields, qualified |
| **CallLog** | Call records | duration, transcript, status, cost |
| **Workflow** | Automations | trigger, actions, execution tracking |
| **Project** | Deal/project mgmt | status, timeline, budget, team, photos |
| **Deal** | Sales pipeline | name, value, stage, probability |
| **Task** | Work items | title, dueDate, priority, assignedTo |
| **Note** | Rich notes | content, tags, pinned |
| **Campaign** | Marketing | name, type, recipients, metrics |
| **KnowledgeBase** | RAG storage | documents, embeddings |
| **Integration** | Third-party | service, status, credentials |

---

## API Endpoints Summary

### Voice Agents
```
GET    /api/agents                    List agents
POST   /api/agents/create             Create agent
GET    /api/agents/:id                Get agent details
PATCH  /api/agents/:id                Update agent
DELETE /api/agents/:id                Delete agent
GET    /api/agents/:id/calls          Get call history
GET    /api/agents/:id/performance    Get analytics
GET    /api/agents/helpers/voices     List ElevenLabs voices
GET    /api/agents/helpers/templates  Get templates
```

### AI Agents
```
GET    /api/ai-agents                 List AI agents
POST   /api/ai-agents/create          Create AI agent
GET    /api/ai-agents/:id             Get agent details
PATCH  /api/ai-agents/:id             Update agent
DELETE /api/ai-agents/:id             Delete agent
POST   /api/ai-agents/:id/chat        Chat with agent
POST   /api/ai-agents/:id/deploy      Deploy agent
POST   /api/ai-agents/:id/test        Test agent
GET    /api/ai-agents/helpers/models  List available models
```

### Calls & Leads
```
POST   /api/calls/initiate            Make a call (with dynamic vars)
GET    /api/calls                     Get calls history
GET    /api/calls/:id                 Get call details
GET    /api/leads                     List leads
POST   /api/leads                     Create lead
PATCH  /api/leads/:id                 Update lead (including customFields)
```

### Workflows
```
GET    /api/workflows                 List workflows
POST   /api/workflows                 Create workflow
GET    /api/workflows/:id             Get workflow
PATCH  /api/workflows/:id             Update workflow
POST   /api/workflows/:id/activate    Activate workflow
POST   /api/workflows/:id/deactivate  Deactivate workflow
GET    /api/workflows/templates       Get templates
```

---

## Dynamic Variables Reference

### Standard Variables (Always)
```
{{lead_name}}           # "John Smith"
{{lead_email}}          # "john@example.com"
{{lead_phone}}          # "+14802555887"
{{lead_status}}         # "new", "contacted", "qualified", etc.
{{lead_source}}         # "lead_gen", "booking", etc.
{{company_name}}        # User's company
{{agent_type}}          # "lead_gen", "booking", etc.
```

### Conditional Variables (If Available)
```
{{qualified}}           # "yes" (if lead.qualified === true)
{{qualification_score}} # "85"
{{estimated_value}}     # "$5000"
{{assigned_to}}         # "Sarah Johnson"
```

### Custom Fields (Auto-Converted)
```
Lead custom field: "Property Type" = "Kitchen Remodel"
→ {{property_type}} = "Kitchen Remodel"

Lead custom field: "Price Range" = "$25k-$35k"
→ {{price_range}} = "$25k-$35k"
```

### Usage in Agent Scripts
```javascript
// In agent script:
"You are calling {{lead_name}} about {{property_type}}"
"Estimated value: {{estimated_value}}"

// After variable replacement (at call time):
"You are calling John Smith about Kitchen Remodel"
"Estimated value: $25000"
```

---

## Subscription Plans

| Plan | Voice Agents | AI Agents | Minutes/Month |
|------|--------------|-----------|--------------|
| Trial | 1 | 1 | 50 |
| Starter | 1 | 3 | 500 |
| Professional | 5 | 10 | 2000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

**Check subscription**: All agent creation checked against `user.plan`

---

## Workflow Triggers

| Trigger Type | Fires When | Use Case |
|--------------|-----------|----------|
| `call_completed` | Call finishes | Post-call follow-up |
| `call_initiated` | Call starts | Log initiation |
| `lead_created` | New lead added | Welcome sequence |
| `lead_qualified` | Lead marked qualified | Send to sales |
| `appointment_booked` | Appointment created | Send reminder |
| `payment_received` | Payment confirmed | Thank you email |
| `manual` | User triggers manually | Ad-hoc actions |
| `schedule` | Cron schedule | Recurring tasks |

## Workflow Actions

```
Communication:  send_sms, send_email, make_call, send_slack
CRM:            create_lead, update_lead, create_task, update_deal, add_note
Calendar:       create_calendar_event, send_calendar_invite
Integration:    google_sheets_add_row, webhook, api_call
Flow Control:   delay, condition, loop
```

---

## Frontend Components

### Key Pages
- **Agents.jsx** - Voice agent list with create/edit
- **AgentDetail.jsx** - Agent editor with script, voice selection
- **AIAgents.jsx** - AI agent management
- **Leads.jsx** - Lead list with call button
- **Workflows.jsx** - Workflow creation/management
- **Dashboard.jsx** - Real-time metrics

### Key Component
- **AIPromptHelper.jsx** - Shows available dynamic variables

---

## Common Development Tasks

### Add a new dynamic variable
```javascript
// File: /backend/controllers/callController.js (line 123)
dynamicVariables.new_field = lead.newField;

// Document in: /DYNAMIC_VARIABLES.md
```

### Add a new workflow action type
```javascript
// File: /backend/models/Workflow.js
// Add to action.type enum: 'new_action'

// File: /backend/services/workflowEngine.js
// Add handler in executeAction() switch statement
```

### Add a new agent type
```javascript
// File: /backend/models/VoiceAgent.js
// Add to type enum: 'new_type'

// File: /frontend/src/pages/Agents.jsx
// Add to AGENT_TYPES constant
// Add form fields if needed
```

---

## Troubleshooting

### Call not using personalized variables
1. Check: Is `leadId` passed to `POST /api/calls/initiate`?
2. Check: Does lead have the custom fields filled?
3. Debug: Check server logs for "Initiating call with dynamic variables"

### Agent created but not showing up
1. Check: User's plan limit reached?
2. Check: ElevenLabs API key valid?
3. Check: Check server logs for ElevenLabs API errors

### Workflow not executing
1. Check: Is workflow `enabled: true`?
2. Check: Do trigger conditions match the event?
3. Check: Check `execution.lastRunError` in database

### Variables showing as "{{variable_name}}"
1. Check: Custom field name is in lead
2. Check: Custom field name uses correct snake_case
3. Check: Agent script has correct variable name

---

## Security Reminders

- All queries filter by `userId` (multi-tenant isolation)
- API credentials stored with `select: false`
- JWT tokens required for all endpoints
- Subscription limits enforced at creation
- Webhook callbacks validated

---

## Performance Tips

1. Use `lead.customFields` Map efficiently (don't store huge objects)
2. Cache ElevenLabs voices list (doesn't change often)
3. Batch API calls where possible
4. Use workflow templates (pre-configured)
5. Archive old workflows/agents to keep DB lean

---

## Key Integration Points

```
ElevenLabs
├─ createAgent()        Create voice agent
├─ initiateCall()       Make personalized call
└─ getVoices()         List 40+ voices

OpenAI/Anthropic/Google
├─ chatOpenAI()        GPT-4, GPT-3.5
├─ chatAnthropic()     Claude-3 models
└─ chatGoogle()        Gemini models

Twilio
└─ sendSMS()           SMS from workflows

Stripe
└─ Billing & subscriptions

Slack
├─ sendMessage()       Send to channels
└─ postNotification()  Team alerts

Google
├─ Sheets add row      Log to spreadsheet
└─ Calendar event      Create meetings
```

---

## Next Steps

1. Read `VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md` for deep dive
2. Review agent templates for conversation best practices
3. Set up custom fields for your lead use case
4. Create workflows for common post-call actions
5. Test dynamic variables with a sample lead

---

**For more details**: See `/VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md`
