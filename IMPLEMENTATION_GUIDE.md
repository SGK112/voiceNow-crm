# VoiceNow CRM Implementation Guide

## Overview

This guide provides a structured approach to understanding and extending the VoiceNow CRM voice agent and workflow implementation.

## Getting Started (5 minutes)

1. Read: `/AGENT_WORKFLOW_QUICK_REFERENCE.md`
2. Skim: `/VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md` (Executive Summary & Architecture sections)
3. Start exploring: Pick a use case from below

## Documentation Map

```
Project Root
├── AGENT_WORKFLOW_QUICK_REFERENCE.md      <- START HERE
├── VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md   <- Deep reference
├── DYNAMIC_VARIABLES.md                   <- Variable usage guide
├── WORKFLOW_SYSTEM_PLAN.md                <- Workflow details
├── AI_AGENTS.md                           <- AI capabilities
│
└── backend/
    ├── models/
    │   ├── VoiceAgent.js                  <- Voice agent schema
    │   ├── AIAgent.js                     <- AI agent schema
    │   ├── Workflow.js                    <- Workflow schema
    │   ├── Lead.js                        <- Lead with customFields
    │   ├── CallLog.js                     <- Call records
    │   ├── User.js                        <- User account
    │   └── Project.js                     <- Deal tracking
    │
    ├── controllers/
    │   ├── agentController.js             <- Voice agent logic
    │   ├── aiAgentController.js           <- AI agent logic
    │   ├── callController.js              <- IMPORTANT: Dynamic vars (lines 122-186)
    │   ├── workflowController.js          <- Workflow management
    │   └── leadController.js              <- Lead CRUD
    │
    ├── routes/
    │   ├── agents.js                      <- Voice agent endpoints
    │   ├── aiAgents.js                    <- AI agent endpoints
    │   ├── calls.js                       <- Call endpoints
    │   ├── workflows.js                   <- Workflow endpoints
    │   └── leads.js                       <- Lead endpoints
    │
    ├── services/
    │   ├── elevenLabsService.js           <- ElevenLabs API (batch calling)
    │   ├── aiAgentService.js              <- Multi-provider LLM
    │   ├── workflowEngine.js              <- Workflow trigger & execution
    │   ├── workflowExecutor.js            <- Action execution
    │   ├── aiService.js                   <- AI utilities
    │   ├── twilio Service.js              <- SMS sending
    │   ├── emailService.js                <- Email sending
    │   └── stripeService.js               <- Billing
    │
    ├── middleware/
    │   └── auth.js                        <- JWT & subscription checks
    │
    └── webhooks/
        └── elevenlabs/                    <- Call completion webhooks
```

## Use Case Guides

### UC1: I want to create a voice agent

**Files to read (in order)**:
1. `/backend/models/VoiceAgent.js` - Understand data structure
2. `/backend/controllers/agentController.js` - Understand createAgent()
3. `/backend/services/elevenLabsService.js` - Understand ElevenLabs integration
4. `/frontend/src/pages/Agents.jsx` - See how UI works

**Key code paths**:
- Voice agent creation → ElevenLabs API (lines 100-117 in agentController.js)
- Voice selection → Default to "Sarah" (line 94)
- Templates → getAgentTemplates() returns 6 pre-built types

**Next steps**:
- Define agent script with {{variables}}
- Select voice from ElevenLabs list
- Test with sample lead

### UC2: I want to add dynamic variables

**Files to modify**:
1. `/backend/controllers/callController.js` (lines 122-151)
   - Add variable to dynamicVariables object
   - Ensure safe stringification

2. `/DYNAMIC_VARIABLES.md`
   - Document new variable
   - Add usage example

3. `/frontend/src/pages/AgentDetail.jsx` (lines 43-51)
   - Add to DYNAMIC_VARIABLES array (optional, for UI reference)

**Example: Add estimated timeline**:
```javascript
// In callController.js, after line 136:
if (lead.estimatedTimeline) {
  dynamicVariables.estimated_timeline = lead.estimatedTimeline;
}

// In agent script:
"Your estimated timeline: {{estimated_timeline}}"
```

### UC3: I want to understand call personalization

**Key locations**:
1. Call initiation: `/api/calls/initiate` (POST)
2. Backend handler: `/backend/controllers/callController.js`
   - Lines 122-186: Variable building & replacement
   - Lines 174-183: Regex replacement logic
3. ElevenLabs service: `/backend/services/elevenLabsService.js`
   - Lines 81-148: initiateCall() with personalizedScript

**Flow**:
```
User calls Lead → API receives leadId
  ↓
Fetch lead data with customFields
  ↓
Build dynamicVariables object
  ↓
Replace {{variable}} in script & first message
  ↓
Send to ElevenLabs with conversation_config_override
  ↓
Call is made with personalized content
```

### UC4: I want to create a workflow

**Files to read**:
1. `/backend/models/Workflow.js` - Understand workflow structure
2. `/backend/services/workflowEngine.js` - Understand trigger/execution
3. `/frontend/src/pages/Workflows.jsx` - See UI

**Key code**:
- Triggers: 8 types (call_completed, lead_created, etc.)
- Actions: 15+ types (send_sms, create_lead, etc.)
- Execution: Sequential with conditions/loops
- Variables: Supports {{variable}} substitution

**Example workflow**:
1. Trigger: call_completed
2. Condition: callStatus === 'completed' AND agent.type === 'lead_gen'
3. Action 1: create_lead (from captured data)
4. Action 2: send_email (to assigned sales rep)
5. Action 3: create_task (follow-up reminder)

### UC5: I want to create an AI agent

**Files to read**:
1. `/backend/models/AIAgent.js` - Complete schema
2. `/backend/controllers/aiAgentController.js` - Controller logic
3. `/backend/services/aiAgentService.js` - Multi-provider LLM

**Key features**:
- Multiple providers: OpenAI, Anthropic, Google
- Knowledge base support (RAG)
- Tool/function calling
- Deployment & testing
- Analytics tracking

**Example: Create Claude agent**:
```javascript
{
  name: "Customer Support Claude",
  type: "chat",
  provider: "anthropic",
  model: "claude-3-opus-20240229",
  systemPrompt: "You are a helpful customer support representative...",
  configuration: { temperature: 0.7, maxTokens: 2000 },
  capabilities: { functionCalling: true, webSearch: false }
}
```

### UC6: I want to add a new workflow trigger

**Files to modify**:
1. `/backend/models/Workflow.js` (line 19-23)
   - Add trigger type to enum

2. `/backend/services/workflowEngine.js`
   - Add condition checking logic
   - Add trigger handler

3. `/backend/controllers/workflowController.js`
   - Add to templates (if applicable)

4. Document in `/WORKFLOW_SYSTEM_PLAN.md`

### UC7: I want to understand call data

**Files to read**:
1. `/backend/models/CallLog.js` - Call record schema
2. `/backend/models/Lead.js` - Lead with customFields
3. `/backend/controllers/callController.js` (lines 122-186) - Variable extraction

**Key data captured**:
- Call duration, status, transcript
- Captured lead data (appointment_booked, etc.)
- Cost tracking
- Sentiment analysis
- Recording URL

**Data flow**:
```
Call initiated → ElevenLabs executes call → Webhook callback
  ↓
Update CallLog with transcript, duration, status
  ↓
Trigger workflows based on call_completed trigger
  ↓
Extract leadsCapured data for next steps
```

## Architecture Deep Dives

### Voice Agent Pipeline

```
Voice Agent Created
  ├─ name, script, voiceId
  ├─ elevenLabsAgentId (from ElevenLabs)
  └─ Store in DB with userId

Call Initiated
  ├─ Fetch lead data
  ├─ Build dynamic variables
  ├─ Replace {{variable}} in script
  ├─ Send to ElevenLabs batch calling
  └─ Create CallLog record

Call Executed
  ├─ ElevenLabs handles conversation
  ├─ Captures transcript & data
  └─ Sends webhook callback

Post-Call
  ├─ Update CallLog with results
  ├─ Trigger workflows
  ├─ Update lead/deal if applicable
  └─ Charge user account
```

### Workflow Execution Pipeline

```
Trigger Event Occurs
  ├─ call_completed, lead_created, etc.
  └─ Carry context (lead, call, agent data)

Find Matching Workflows
  ├─ Match trigger type
  └─ Check enabled flag

Check Trigger Conditions
  ├─ agentTypes, callStatus, sentiment, etc.
  └─ Custom field conditions

Execute Actions (Sequential)
  ├─ For each action in workflow.actions
  ├─ Substitute {{variables}}
  ├─ Execute action (send_sms, create_lead, etc.)
  ├─ Handle conditions/loops
  └─ Log results

Track Execution
  ├─ Update workflow.execution metrics
  ├─ Log errors
  └─ Update lastRunStatus
```

### Dynamic Variable Flow

```
Lead Record
  ├─ name, email, phone
  ├─ status, source
  ├─ qualificationScore, value
  └─ customFields (Map)
      ├─ "Property Type" → {{property_type}}
      ├─ "Price Range" → {{price_range}}
      └─ "Timeline" → {{timeline}}

Call Initiation
  ├─ Read lead data
  ├─ Extract to dynamicVariables
  ├─ Replace in agent script
  └─ Replace in firstMessage

Agent Receives
  ├─ Personalized script with real values
  └─ Personalized first message with real values
```

## Common Patterns

### Pattern 1: Subscription Limits

```javascript
// Before allowing agent creation
const maxAgents = planLimits[user.plan] || 1;
if (agentCount >= maxAgents) {
  return error: "Plan limit reached"
}
```

### Pattern 2: User Isolation

```javascript
// All queries filter by userId
const agent = await VoiceAgent.findOne({
  _id: agentId,
  userId: req.user._id  // REQUIRED
})
```

### Pattern 3: Variable Substitution

```javascript
Object.keys(dynamicVariables).forEach(key => {
  const placeholder = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g');
  script = script.replace(placeholder, safeStringify(dynamicVariables[key]));
});
```

### Pattern 4: Workflow Conditional Execution

```javascript
// Check conditions before executing
if (this.checkTriggerConditions(workflow.trigger.conditions, context)) {
  await this.executeWorkflow(workflow, context);
}
```

## Testing Checklist

### Voice Agent Testing
- [ ] Agent created successfully
- [ ] Agent appears in ElevenLabs dashboard
- [ ] Can edit agent script and voice
- [ ] Can view call history
- [ ] Performance metrics populated

### Dynamic Variable Testing
- [ ] Create lead with custom fields
- [ ] Initiate call to lead
- [ ] Check server logs for variable substitution
- [ ] Verify agent receives personalized script
- [ ] Confirm custom fields converted to snake_case

### Workflow Testing
- [ ] Create workflow with trigger
- [ ] Set up conditions
- [ ] Configure actions
- [ ] Trigger event occurs
- [ ] Actions execute in sequence
- [ ] Check workflow.execution.lastRunStatus

### AI Agent Testing
- [ ] Create agent with provider
- [ ] Chat with agent
- [ ] Send test message
- [ ] Verify response format
- [ ] Check token usage

## Performance Optimization

1. **Lead Queries**: Index by userId and status
2. **Voice Lists**: Cache ElevenLabs voices (rarely changes)
3. **Workflow Triggers**: Index by trigger.type
4. **Custom Fields**: Don't store large objects in Map
5. **API Calls**: Batch operations where possible

## Security Checklist

- [ ] All queries filter by userId
- [ ] API credentials stored with `select: false`
- [ ] JWT tokens validated on all endpoints
- [ ] Webhook callbacks signature-verified (if applicable)
- [ ] Rate limiting on call initiation
- [ ] Subscription limits enforced
- [ ] User data never shared between accounts

## Extending the System

### Add New Voice Agent Type
1. Add to VoiceAgent schema
2. Add to AGENT_TYPES frontend constant
3. Create template in agentController.js
4. Document in AGENT_WORKFLOW_QUICK_REFERENCE.md

### Add New AI Provider
1. Add to AIAgent schema provider enum
2. Implement in aiAgentService.js
3. Add routes and templates
4. Document in AI_AGENTS.md

### Add New Workflow Action
1. Add to Workflow schema action.type enum
2. Implement executor in workflowEngine.js
3. Add template in controller
4. Document in WORKFLOW_SYSTEM_PLAN.md

## Quick Reference Links

- Models: `/backend/models/`
- Controllers: `/backend/controllers/`
- Services: `/backend/services/`
- Routes: `/backend/routes/`
- Frontend: `/frontend/src/pages/`
- Documentation: `/DYNAMIC_VARIABLES.md`, `/WORKFLOW_SYSTEM_PLAN.md`, etc.

## Support Resources

1. Check existing documentation first
2. Look for similar implementations
3. Review error messages in server logs
4. Check database records directly
5. Add console.log() in key functions for debugging

---

**Start here**: Read `/AGENT_WORKFLOW_QUICK_REFERENCE.md`

**Then explore**: Pick a use case and follow the files listed in that section.
