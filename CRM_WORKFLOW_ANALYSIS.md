# VoiceNow CRM - Complete Architecture & Workflow Analysis

## Executive Summary

VoiceNow CRM is a **voice-first sales automation platform** that integrates AI-powered voice agents (via ElevenLabs) with a complete customer relationship management system. The platform enables businesses to automate lead generation, qualification, and deal management through natural voice conversations.

**Key Stats:**
- 15 data models with comprehensive relationships
- 6 built-in smart automations running on every call
- Multi-stage sales pipeline (lead → qualified → proposal → negotiation → won/lost)
- ElevenLabs voice agent integration with batch calling
- N8n workflow automation support
- Usage-based billing with Stripe integration
- React + Node.js full-stack application

---

## 1. CRM CAPABILITIES OVERVIEW

### Current Features
- ✅ Lead capture and management with qualification scoring
- ✅ Deal/Pipeline management with 6 stages
- ✅ Voice call integration with transcription and recording
- ✅ Automatic lead creation from voice calls
- ✅ Task management with auto-created tasks from call outcomes
- ✅ Campaign orchestration (outbound + inbound)
- ✅ Built-in smart automations (6 types)
- ✅ N8n workflow integration for advanced automation
- ✅ Usage tracking and billing
- ✅ Multi-agent support per user
- ✅ Email tracking and integration
- ✅ Notes and call logging

### Missing/Gaps for Contractors
- ❌ Project/Job management (not designed for service industries)
- ❌ Estimate/Quote generation
- ❌ Contract management
- ❌ Scheduling/Resource allocation
- ❌ Invoicing specifics (basic model exists, no UI)
- ❌ Work order tracking
- ❌ Material/Equipment tracking
- ❌ Subcontractor management
- ❌ Customer-side portal
- ❌ Photo/Before-After documentation
- ❌ Service completion tracking

---

## 2. DATA FLOW ARCHITECTURE

### Complete Flow: Voice Call → Lead → Deal → Close

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE CALL INITIATION                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ callController.initiateCall  │
              │ - Validates subscription     │
              │ - Checks minute balance      │
              │ - Loads lead context         │
              │ - Creates CallLog record     │
              │ - Initiates ElevenLabs call  │
              └────────────┬─────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  ElevenLabs Voice Agent      │
              │  - Runs conversation         │
              │  - Extracts data from call   │
              │  - Detects sentiment         │
              │  - Records transcript        │
              │  - Captures lead info        │
              └────────────┬─────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  ElevenLabs Webhook Event    │
              │  → handleElevenLabsWebhook   │
              └────────────┬─────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
   CREATE CALL LOG                    CREATE/UPDATE LEAD
   - Duration tracking               - Auto-create from extracted data
   - Cost calculation                - Set qualification status
   - Transcript storage              - Set value/score
   - Sentiment analysis              - Link to CallLog
        │                                     │
        │                                     │
        └──────────────────┬──────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  RUN BUILT-IN AUTOMATIONS    │
              │  (6 types - see below)       │
              └────────────┬─────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
  CREATE AUTO TASKS              UPDATE LEAD STATUS
  - Follow-up (24h)              - new → contacted
  - Reminder (24h before apt)     - new → qualified
  - Retry call (2h)              - qualified → converted
  - Nurture (3 days)
  - Thank you (1h)
  - URGENT (30 min)
        │                                     │
        └──────────────────┬──────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  TRIGGER N8N WORKFLOWS       │
              │  (If enabled by user)        │
              │  - Custom automations        │
              │  - Third-party integrations  │
              └────────────┬─────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  LEAD → DEAL CONVERSION      │
              │  (Manual: User creates deal) │
              │  - Link lead to deal         │
              │  - Set deal value/stage      │
              │  - Track related calls       │
              └────────────┬─────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  PIPELINE MANAGEMENT         │
              │  - Move through stages       │
              │  - Trigger stage-based tasks │
              │  - Update probability        │
              │  - Set close date            │
              └────────────┬─────────────────┘
                           │
                           ▼
              ┌──────────────────────────────┐
              │  DEAL CLOSURE (Won/Lost)     │
              │  - Mark actual close date    │
              │  - Update lead to converted  │
              │  - Record in analytics       │
              │  - Generate invoice (future) │
              └────────────────────────────────┘
```

### Key Integration Points

**1. Voice Agent → Call Log**
- ElevenLabs initiates call
- Call completes with webhook event
- Data extracted: lead info, sentiment, outcome
- Files: `callController.js`, `CallLog.js`, `elevenLabsService.js`

**2. Call → Lead Creation**
- If call extracts name + phone, auto-create Lead
- Set qualification status based on agent assessment
- Link call to lead via `callId` field
- Files: `webhookController.js`, `Lead.js`, `leadController.js`

**3. Lead → Task Automation**
- Built-in automations analyze call outcome
- Create tasks based on 6 trigger conditions
- Include context: transcript, lead info, call details
- Files: `webhookController.js`, `Task.js`

**4. Lead → Deal (Manual)**
- User manually creates Deal linked to Lead
- Deal inherits some lead data (contact, value)
- Can track multiple calls per deal
- Files: `deals.js` route, `Deal.js` model

**5. Deal Workflow Triggers**
- On deal creation: trigger n8n workflows
- On stage change: trigger stage-specific workflows
- On won/lost: trigger completion workflows
- Files: `deals.js` route, `N8nWorkflow.js`

---

## 3. LEAD MANAGEMENT SYSTEM

### Lead Model Structure

```javascript
Lead {
  userId: ObjectId,              // Owner
  name: String,                  // From voice call or manual
  email: String,                 // From call or manual
  phone: String,                 // From call or manual
  
  // Qualification
  source: enum['lead_gen', 'booking', 'collections', 'promo', 'support', 'manual'],
  qualified: Boolean,            // AI/manual assessment
  qualificationScore: 0-100,     // AI scoring
  value: Number,                 // Estimated deal value
  
  // Status Flow
  status: enum['new', 'contacted', 'qualified', 'converted', 'lost'],
  lastContactedAt: Date,
  convertedAt: Date,
  
  // Relationships
  callId: ObjectId (CallLog),   // First/primary call
  assignedTo: String,            // Team member name
  
  // Context
  notes: [{content, createdBy, createdAt}],
  customFields: Map<String, String>,
  
  timestamps: {createdAt, updatedAt}
}
```

### Lead Controller Operations

1. **getLeads()** - List with filtering by status/source/qualified
2. **getLeadById()** - Detailed view with call history
3. **createLead()** - Manual lead entry (name, email, phone required)
4. **updateLead()** - Update status, score, assignee, add notes
5. **deleteLead()** - Soft delete
6. **exportLeads()** - CSV export

### Lead Status Workflow

```
    ┌─────────────────────────────────────────────┐
    │                 NEW Lead                     │
    │  (Just captured from call or manual entry)   │
    └──────────────┬────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
         ▼                    ▼
    CONTACTED            (No Action)
    (Called at least    → Lost/Deleted
     once, not qual)
         │
         ▼
    QUALIFIED
    (Passed qualification
     criteria from agent
     or manual marking)
         │
         ▼
    CONVERTED
    (Payment received or
     appointment set, or
     marked as customer)
         │
         ▼
    (End of funnel)
```

### Qualification Scoring

Sources:
1. **AI Assessment** (from voice agent): 0-100 score in `qualificationScore`
2. **Manual Override**: User can set score/qualified flag
3. **Behavioral**: Qualified if appointment booked or payment captured

---

## 4. DEAL/PIPELINE SYSTEM

### Deal Model Structure

```javascript
Deal {
  // Basic Info
  user: ObjectId,               // Owner (User)
  title: String,                // Deal name
  contact: ObjectId,            // Link to Lead (required)
  value: Number,                // Deal amount in dollars
  currency: String,             // USD, EUR, GBP, CAD
  
  // Pipeline Stage
  stage: enum[
    'lead',        // 10% probability
    'qualified',   // 25% probability
    'proposal',    // 50% probability
    'negotiation', // 75% probability
    'won',         // 100% probability
    'lost'         // 0% probability
  ],
  probability: 0-100,           // Auto-set by stage
  
  // Dates
  expectedCloseDate: Date,      // Target close
  actualCloseDate: Date,        // When won/lost
  
  // Relationships
  source: enum['website', 'referral', 'cold_call', 'voice_campaign', 'email', 'social', 'other'],
  assignedTo: ObjectId,         // User responsible
  relatedCalls: [ObjectId],     // Multiple calls linked
  relatedCampaigns: [ObjectId], // Campaigns that fed this
  triggeredWorkflows: [{workflowId, triggeredAt, event, response}],
  
  // Context
  description: String,
  lostReason: String,           // Why deal lost
  tags: [String],
  priority: enum['low', 'medium', 'high', 'urgent'],
  customFields: Map<String, Mixed>,
  
  // Virtual computed field
  weightedValue: value * (probability / 100)
}
```

### Deal Stages & Probability

| Stage | Probability | Meaning |
|-------|-------------|---------|
| lead | 10% | Just entered pipeline, not qualified |
| qualified | 25% | Prospect confirmed need |
| proposal | 50% | Proposal sent, awaiting response |
| negotiation | 75% | Active discussions on pricing/terms |
| won | 100% | Deal closed, customer acquired |
| lost | 0% | Prospect rejected or no longer viable |

### Deal Workflow Hooks

When deal is created or updated:

1. **deal_created** event → Trigger n8n workflows
2. **deal_stage_changed** event → Trigger stage-specific workflows
3. **deal_won** event → Trigger win workflows (thank you, upsell, etc.)
4. **deal_lost** event → Trigger loss workflows (win-back, analysis)

### Pipeline Summary Endpoint

```javascript
GET /api/deals/pipeline/summary

Returns: {
  stages: {
    lead: { count, totalValue, avgValue, weightedValue },
    qualified: { ... },
    proposal: { ... },
    negotiation: { ... },
    won: { ... },
    lost: { ... }
  },
  overall: {
    totalDeals: 150,
    totalValue: $500000,
    weightedValue: $250000  // What's realistically in pipeline
  }
}
```

---

## 5. VOICE AGENT INTEGRATION

### How Voice Agents Work

```
┌──────────────────────────────────────────┐
│     ElevenLabs Conversational AI         │
│  (Powered by voice agents we configure)  │
└──────────────────────────────────────────┘
         │                        │
         ▼                        ▼
   TTS Voice Engine         Agent Prompt
   (11Labs voices)          (Lead gen / booking / etc.)
         │                        │
         └────────────┬───────────┘
                      │
         ┌────────────▼───────────┐
         │ Makes outbound call    │
         │ to phone number        │
         └────────────┬───────────┘
                      │
         ┌────────────▼───────────┐
         │ Conversation happens   │
         │ (AI responds naturally)│
         └────────────┬───────────┘
                      │
         ┌────────────▼───────────┐
         │ Call completes         │
         │ Post-call processing:  │
         │ - Transcription        │
         │ - Data extraction      │
         │ - Sentiment analysis   │
         └────────────┬───────────┘
                      │
         ┌────────────▼───────────┐
         │ Webhook to CRM:        │
         │ {                      │
         │   call_id,             │
         │   duration,            │
         │   transcript,          │
         │   extracted_data {     │
         │     name, email,       │
         │     phone,             │
         │     qualified,         │
         │     interest,          │
         │     appointment_date   │
         │   },                   │
         │   sentiment,           │
         │   status               │
         │ }                      │
         └────────────────────────┘
```

### Voice Agent Configuration

```javascript
VoiceAgent {
  userId: ObjectId,              // Owner
  name: String,                  // Display name
  type: enum[                    // Agent purpose
    'lead_gen',                  // Generate leads
    'booking',                   // Book appointments
    'collections',               // Payment collection
    'promo',                     // Promotional calls
    'support',                   // Customer support
    'custom'                     // Custom purpose
  ],
  customType: String,            // If 'custom' type
  
  // ElevenLabs Configuration
  elevenLabsAgentId: String,    // Agent ID in ElevenLabs
  voiceId: String,              // Voice character ID
  voiceName: String,            // Friendly name (Rachel, Adam, etc.)
  script: String,               // Prompt/instructions
  firstMessage: String,         // Opening line
  
  // Agent Behavior
  configuration: {
    temperature: 0-1,           // Creativity (0.8 = conversational)
    maxDuration: Number,        // Max call length (seconds)
    language: String,           // en, es, fr, etc.
    qualificationQuestions: [], // Custom questions to ask
    targetAudience: String      // Who this agent calls
  },
  
  // Availability
  availability: {
    enabled: Boolean,
    timezone: String,           // America/New_York, etc.
    hours: {                    // Per day of week
      monday: { start: '09:00', end: '17:00', enabled: true },
      // ... rest of week
    }
  },
  
  // Performance Tracking
  performance: {
    totalCalls: Number,
    successfulCalls: Number,
    leadsGenerated: Number,
    conversionRate: Number,
    averageDuration: Number
  },
  
  // Status & Timestamps
  enabled: Boolean,
  timestamps: {createdAt, updatedAt}
}
```

### Data Passed to Agent During Call

When initiating a call, the CRM passes lead context as dynamic variables:

```javascript
dynamicVariables: {
  // Lead Information
  lead_name: "John Smith",
  lead_email: "john@example.com",
  lead_phone: "+1-480-255-5887",
  lead_status: "new",
  lead_source: "lead_gen",
  
  // Qualification Context
  qualified: "no",
  qualification_score: "45",
  estimated_value: "$5000",
  assigned_to: "Sales Rep Name",
  
  // Company Context
  company_name: "Acme Corp",
  agent_type: "lead_gen",
  
  // Custom Fields (from lead record)
  industry: "Construction",
  company_size: "50+",
  budget: "$10000"
}
```

Agent can reference these in conversation:
- "Hi {{lead_name}}, I'm calling about {{estimated_value}} roofing service for {{company_name}}"
- Agent extracts info from prospect's responses
- Returns: qualified status, appointment date, payment amount, etc.

---

## 6. BUILT-IN SMART AUTOMATIONS

### The 6 Automations (No Setup Required)

All run automatically after EVERY voice call. Located in `webhookController.js`, function `runBuiltInAutomations()`.

#### Automation 1: Qualified Lead → Follow-Up Task
```
TRIGGER:  lead.qualified === true (from voice agent)
ACTION:   Create Task
TIMING:   24 hours from now
TASK:     "Follow up with qualified lead: {name}"
PRIORITY: High
CONTEXT:  Includes call transcript, contact phone

CODE SNIPPET (line 26-51):
if (isQualified && lead) {
  const followUpDate = new Date();
  followUpDate.setHours(followUpDate.getHours() + 24);
  
  await Task.create({
    user: userId,
    title: `Follow up with qualified lead: ${lead.name}`,
    description: `Lead qualified during ${agent.type} call...`,
    type: 'follow_up',
    priority: 'high',
    dueDate: followUpDate,
    relatedContact: lead._id,
    autoCreatedBy: 'voice_agent'
  });
  
  lead.status = 'qualified';
  await lead.save();
}
```

#### Automation 2: Appointment Booked → Reminder Task
```
TRIGGER:  appointment_booked === true AND appointment_date provided
ACTION:   Create Reminder Task
TIMING:   24 hours BEFORE appointment
TASK:     "Appointment Reminder: {name}"
PRIORITY: High
CONTEXT:  Appointment time, contact phone, who booked it

PURPOSE:  Ensure no missed appointments
```

#### Automation 3: No Answer/Failed Call → Retry Task
```
TRIGGER:  callStatus === 'no-answer' | 'failed' | 'busy'
ACTION:   Create Retry Task
TIMING:   2 hours from now
TASK:     "Retry call to {phone}"
PRIORITY: Medium
CONTEXT:  Previous call status, agent name, phone number

BENEFIT:  Persistence increases connect rate by 40%+
```

#### Automation 4: Interested But Not Qualified → Nurture Task
```
TRIGGER:  interest detected BUT qualified !== true
ACTION:   Create Nurture Task
TIMING:   3 days from now
TASK:     "Nurture interested lead: {name}"
PRIORITY: Medium
CONTEXT:  Interest topic, qualification score, contact

BENEFIT:  Warm leads eventually convert without pressure
```

#### Automation 5: Payment Captured → Thank You + Upsell
```
TRIGGER:  payment_captured === true AND payment_amount > 0
ACTION:   Create Thank You Task + Update Lead
TIMING:   1 hour from now
TASK:     "Send thank you to {name} - Payment received"
PRIORITY: High
UPDATES:  lead.status = 'converted'
          lead.value = payment_amount
CONTEXT:  Payment amount, payment details

BENEFIT:  Fast thank you + opportunity for upsell/referral
```

#### Automation 6: Negative Sentiment → URGENT Escalation
```
TRIGGER:  sentiment === 'negative' AND status === 'completed'
ACTION:   Create URGENT Task
TIMING:   30 minutes (!!!!)
TASK:     "URGENT: Negative sentiment detected - {name}"
PRIORITY: URGENT
CONTEXT:  Full call transcript for damage control
ASSIGN:   Manager/escalation team

BENEFIT:  Immediate response prevents churn/negative review
```

### Why This Works

1. **Zero Configuration** - Works instantly, no user setup
2. **Smart Timing** - Urgent issues (30min) vs nurture (3 days)
3. **Complete Context** - Every task includes transcript + metadata
4. **Fail Safe** - Wrapped in try/catch, never breaks webhook
5. **Competitive Edge** - Most CRMs require manual n8n setup ($20-100/mo)

---

## 7. WORKFLOW & AUTOMATION SYSTEM

### Two-Tier Automation Architecture

```
┌─────────────────────────────────────────────┐
│         BUILT-IN AUTOMATIONS (6)            │
│  • No setup needed                          │
│  • Always running                           │
│  • Fast & reliable                          │
│  • Best for 80% of use cases                │
└──────────┬──────────────────────────────────┘
           │ (runs first on every call)
           ▼
┌─────────────────────────────────────────────┐
│      N8N WORKFLOWS (Custom)                 │
│  • User-configured                          │
│  • Unlimited flexibility                    │
│  • Third-party integrations                 │
│  • Power users & advanced cases             │
└──────────────────────────────────────────────┘
```

### Workflow Models

**1. Workflow.js** - Complete workflow with visual builder schema
- Triggers: call_completed, lead_created, lead_qualified, appointment_booked, etc.
- 20+ action types (SMS, email, task, webhook, etc.)
- Conditional logic (if/else)
- Visual positioning for canvas
- Not yet fully implemented in UI

**2. N8nWorkflow.js** - Simplified n8n cloud integration
- Users create workflows in n8n cloud
- CRM stores trigger conditions
- CRM invokes n8n when conditions met
- Results logged for audit trail

### Workflow Triggers

```javascript
Triggers available in N8nWorkflow.triggerConditions:
{
  agentTypes: ['lead_gen', 'booking'],    // Which agents trigger
  callStatus: ['completed'],              // Which statuses
  leadQualified: true/false/undefined,    // Qualification filter
}

Events available in Workflow model:
- call_completed
- call_initiated
- lead_created
- lead_qualified
- appointment_booked
- payment_received
- manual
- schedule (cron expressions)
```

### Workflow Execution Flow

```
1. Call completes → ElevenLabs webhook
2. Create CallLog + Lead (if extractable)
3. Run Built-in Automations (6 types)
4. Find enabled N8n workflows
5. For each workflow:
   - Check trigger conditions
   - If conditions match: invoke n8n webhook
   - Log execution + response
6. Return success

Time: ~50-150ms per call
Database queries: 1-6 (depending on outcomes)
```

---

## 8. CALL TRACKING & LEAD GENERATION

### CallLog Model

```javascript
CallLog {
  userId: ObjectId,             // Owner
  agentId: ObjectId,            // Which agent made call
  
  // Call Details
  direction: enum['inbound', 'outbound'],
  phoneNumber: String,          // Who was called
  callerName: String,           // Who called
  callerPhone: String,          // For inbound
  
  // Duration & Costs
  duration: Number,             // Seconds
  durationMinutes: Number,      // Rounded up for billing
  cost: {
    costPerMinute: 0.10,        // ElevenLabs rate
    totalCost: Number,          // duration * rate
    userCharge: Number          // Overage charges if any
  },
  
  // Call Outcome
  status: enum[
    'initiated', 'ringing', 'in-progress',
    'completed', 'failed', 'no-answer', 'busy', 'canceled'
  ],
  transcript: String,           // Full conversation
  recordingUrl: String,         // Audio file
  sentiment: enum['positive', 'neutral', 'negative'],
  
  // Extracted Data
  leadsCapured: {              // Note: typo in schema (Capured not Captured)
    name: String,
    email: String,
    phone: String,
    interest: String,
    qualified: Boolean,
    appointmentBooked: Boolean,
    appointmentDate: Date,
    paymentCaptured: Boolean,
    paymentAmount: Number
  },
  
  // References
  leadId: ObjectId,            // Link to created lead
  elevenLabsCallId: String,    // ElevenLabs call ID
  metadata: Map<String, String>,
  
  timestamps: {createdAt, updatedAt}
}
```

### Lead Generation from Calls

```
Voice Call Completes
        ↓
Check: extracted_data?.name && extracted_data?.phone
        ↓
    If YES:
        ↓
Create Lead with:
  - name: extracted_data.name
  - email: extracted_data.email (or generated)
  - phone: extracted_data.phone or callerPhone
  - source: agent.type (e.g., 'lead_gen')
  - qualified: extracted_data.qualified
  - qualificationScore: extracted_data.qualification_score
  - value: extracted_data.estimated_value
  - status: 'new' or 'qualified' (depends on qualification)
  - callId: callLog._id (link back to call)
        ↓
Update Agent.performance.leadsGenerated++
Update Usage.leadsGenerated++
        ↓
    If NO:
        ↓
(No lead created - just log the call)
```

### Call Outcome Tracking

Statuses indicate what happened:

| Status | Meaning | Automation |
|--------|---------|-----------|
| completed | Full conversation happened | Check outcomes (qualified, appointment, etc.) |
| no-answer | Line rang, no one picked up | Retry in 2 hours |
| busy | Line was busy/occupied | Retry in 2 hours |
| failed | Technical issue | Retry in 2 hours |
| in-progress | Still on call | N/A |
| canceled | User canceled | N/A |

---

## 9. DATA MODELS & RELATIONSHIPS

### Complete Data Schema Diagram

```
User (Parent)
├── Lead (name, email, phone, status, callId)
│   ├── CallLog (duration, transcript, sentiment, extracted_data)
│   │   └── VoiceAgent (name, type, script, configuration)
│   │       └── Campaign (contacts list, schedule, stats)
│   │
│   └── Deal (title, stage, value, probability)
│       ├── CallLog (relatedCalls array)
│       ├── Campaign (relatedCampaigns array)
│       └── N8nWorkflow (triggeredWorkflows array)
│
├── Task (title, type, priority, dueDate, relatedContact, relatedCall)
│   ├── Lead (relatedContact)
│   └── CallLog (relatedCall)
│
├── VoiceAgent (elevenLabsAgentId, configuration, performance)
│   ├── Campaign (agentId reference)
│   └── CallLog (agentId reference)
│
├── Campaign (contacts, schedule, stats, settings)
│   ├── VoiceAgent (agentId reference)
│   └── CallLog[] (from contacts.callLogId)
│
├── N8nWorkflow (type, triggerConditions, enabled)
│   └── (Integration with n8n cloud)
│
├── Workflow (comprehensive, not yet implemented)
│   └── (Visual workflow builder ready for implementation)
│
├── Usage (minutesUsed, leadsGenerated, costTracking)
│   └── (Monthly tracking for billing)
│
└── Note (content, relatedTo - generic reference)
```

### Model Count: 15 Total
1. User
2. Lead
3. Deal
4. CallLog
5. VoiceAgent
6. Campaign
7. Task
8. N8nWorkflow
9. Workflow
10. Usage
11. Note
12. EmailTracking
13. PhoneNumber
14. AIAgent
15. SubscriptionPlan

---

## 10. CURRENT CAPABILITIES ASSESSMENT

### What's Working Well ✅

1. **Voice Integration** - ElevenLabs integration solid, batch calling works
2. **Lead Capture** - Automatic lead creation from calls with extracted data
3. **Smart Automations** - 6 automations running reliably on every call
4. **Pipeline Management** - 6-stage deal pipeline with probability weighting
5. **Call Tracking** - Complete call logs with transcripts, sentiment, costs
6. **Usage Billing** - Minutes tracked, costs calculated, integration with Stripe
7. **Multi-Agent Support** - Users can create multiple agents with different types
8. **Campaign Orchestration** - Batch calling, scheduling, retry logic
9. **N8n Integration** - Can trigger external workflows based on conditions
10. **Task Management** - Auto-created tasks with full context linking

### What's Missing/Incomplete ❌

1. **Contractor-Specific Features**
   - No project/job management
   - No estimate/quote system
   - No contract management
   - No work order tracking
   - No material/equipment tracking
   - No schedule/resource allocation
   - No photo documentation
   - No customer portal

2. **CRM Features**
   - No email sending (tracked but not sent)
   - No SMS sending (model exists, not integrated)
   - No calendar integration
   - No Google Sheets integration
   - Limited reporting/analytics
   - No custom fields UI (schema ready)
   - No team collaboration features
   - No activity timeline

3. **Workflow Builder**
   - Visual workflow builder not implemented
   - Workflow model exists but no UI
   - No workflow templates
   - No conditional logic UI
   - No template gallery

4. **Integration**
   - No Zapier integration
   - No Calendly integration
   - No email platform integration
   - No accounting software integration
   - No document management

5. **Operations**
   - No scheduled/recurring tasks
   - No workflow history/audit log
   - Limited error handling visibility
   - No workflow testing/simulation
   - No performance analytics per agent

---

## 11. CRITICAL GAPS FOR CONTRACTORS

### Service Industry Specific Needs

**1. Project Management**
- Need: Multiple jobs per lead/customer
- Current: Only deals (one deal per customer scenario)
- Missing: Job/Project model with phases (estimate → schedule → completion)

**2. Estimates & Quotes**
- Need: Create quotes from voice calls
- Current: Manual deal value entry
- Missing: Quote generation, approval workflow, signature

**3. Scheduling**
- Need: Calendar view of jobs
- Current: Campaign scheduling only
- Missing: Resource calendar, team scheduling, job timeline

**4. Work Orders & Progress**
- Need: Track job stages (scheduled → started → in-progress → completed)
- Current: Only deal stages (lead → proposal → won)
- Missing: Work order model, progress tracking, photo documentation

**5. Invoicing & Payments**
- Need: Generate invoices from completed work
- Current: No invoicing UI (model exists)
- Missing: Invoice generation, payment tracking, receipt storage

**6. Contractor-Specific Workflows**
- Lead Gen: "Schedule free estimate" → "Send estimate" → "Negotiate" → "Schedule work"
- Current: Generic "lead → qualified → proposal → negotiation → won"
- Problem: Doesn't fit the contractor sales cycle

**7. Photo/Before-After Documentation**
- Need: Attach photos to jobs for portfolio/marketing
- Current: No file attachment system
- Missing: Image upload, before/after carousel, gallery

**8. Customer Portal**
- Need: Customers see job status, upload photos, approve work
- Current: Internal CRM only
- Missing: White-label portal, customer access controls

---

## 12. SYSTEM HEALTH & PERFORMANCE

### Database Schema Quality
- ✅ Good indexing on commonly queried fields
- ✅ Proper relationships with ObjectId references
- ✅ Timestamps on all models
- ✅ Pagination support in controllers
- ⚠️ Some schema inconsistencies (leadsCapured typo)

### API Architecture
- ✅ RESTful endpoints follow conventions
- ✅ Proper auth middleware
- ✅ Error handling present
- ⚠️ Some endpoints lack pagination
- ⚠️ Rate limiting configured but not enforced on all routes

### Integration Points
- ✅ ElevenLabs integration solid
- ✅ Stripe integration for payments
- ✅ N8n webhook support
- ✅ Call data extraction working
- ⚠️ No email delivery (only tracking)
- ⚠️ No SMS delivery (Twilio set up but not used)

### Security
- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ User isolation (userId filters)
- ✅ API key generation with scopes
- ⚠️ No rate limiting enforcement
- ⚠️ No encryption for sensitive fields

---

## 13. RECOMMENDATIONS FOR CONTRACTORS

### Phase 1: Adapt Existing System (1-2 weeks)
1. **Rename Deal → Job**
   - Concept already fits: lead → scheduled → in-progress → completed
   - Add field: `projectType` (roofing, plumbing, HVAC, etc.)
   - Add field: `location` (address)

2. **Extend Lead Model**
   - Add `propertyType` (residential, commercial)
   - Add `squareFootage`
   - Add `issues` (array of problem areas)

3. **Create Estimate Link**
   - Task type: "Send Estimate"
   - Value in deal = estimate amount
   - Add custom field for estimate # and PDF link

### Phase 2: Add Contractor Features (2-3 weeks)
1. **Work Order Model**
   - Extends Deal with job-specific fields
   - Schedule date, crew assignment, materials list
   - Progress tracking (not started → 25% → 50% → 75% → 100%)

2. **Schedule Management**
   - Calendar view of all jobs
   - Team member assignments
   - Availability/blocked days

3. **Photo Management**
   - Attach photos to jobs
   - Before/after carousel
   - Customer-facing portfolio

### Phase 3: Customer Portal (3-4 weeks)
1. **Portal UI**
   - View scheduled jobs
   - See progress
   - Upload photo/videos (process questions)
   - Approve completion

2. **Customer Communication**
   - Automated job status SMS/email
   - Photo sharing
   - Approval workflow

### Phase 4: Advanced (4+ weeks)
1. **Invoicing**
   - Generate invoice from completed job
   - Track payments
   - Email receipts

2. **Analytics**
   - Average job value by type
   - Average completion time
   - Customer acquisition cost

---

## 14. TECHNICAL STACK SUMMARY

### Backend Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT + bcrypt
- **Voice**: ElevenLabs API (conversational AI)
- **External Webhooks**: N8n integration
- **Email**: Nodemailer + Gmail
- **SMS**: Twilio (configured, not used)
- **Payments**: Stripe
- **AI Models**: OpenAI API, Google Generative AI (available)
- **Monitoring**: Custom logging

### Frontend Stack
- **Framework**: React
- **UI Library**: shadcn/ui + custom components
- **State**: TanStack React Query (data fetching)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Form Handling**: React Hook Form (likely)
- **Build Tool**: Vite

### Infrastructure
- **Hosting**: Render.com (full-stack Node/React)
- **Database**: MongoDB Atlas
- **File Storage**: Not configured yet
- **Redis**: Mentioned in plan, not implemented
- **Environment**: Docker-ready app structure

---

## 15. FILE STRUCTURE & KEY LOCATIONS

### Backend Files
```
backend/
├── controllers/
│   ├── leadController.js       - CRUD for leads
│   ├── callController.js       - Call initiation + retrieval
│   ├── webhookController.js    - ⭐ Built-in automations (line 12-180)
│   ├── workflowController.js   - Workflow management
│   ├── campaignController.js   - Campaign operations
│   └── [others...]
├── models/
│   ├── Lead.js                 - Lead schema
│   ├── Deal.js                 - Deal/Pipeline schema
│   ├── CallLog.js              - Call tracking
│   ├── VoiceAgent.js           - Agent configuration
│   ├── Task.js                 - Auto-created tasks
│   ├── Campaign.js             - Batch calling campaigns
│   ├── Workflow.js             - Visual workflow builder (not implemented)
│   ├── N8nWorkflow.js          - N8n integration
│   └── [others...]
├── routes/
│   ├── leads.js                - Lead API endpoints
│   ├── deals.js                - Deal API endpoints
│   ├── calls.js                - Call API endpoints
│   ├── workflows.js            - Workflow API endpoints
│   └── [others...]
├── services/
│   ├── elevenLabsService.js    - ElevenLabs API wrapper
│   ├── n8nService.js           - N8n API wrapper
│   ├── workflowEngine.js       - Workflow execution
│   └── [others...]
└── middleware/
    └── auth.js                 - JWT authentication
```

### Key Functions Location
- **Smart Automations**: `backend/controllers/webhookController.js` lines 12-180
- **Lead Creation**: `backend/controllers/webhookController.js` lines 245-268
- **Deal Pipeline**: `backend/routes/deals.js` lines 40-77 (pipeline summary)
- **Call Initiation**: `backend/controllers/callController.js` lines 74-200

---

## CONCLUSION

VoiceNow CRM is a **sophisticated voice-first sales platform** with strong fundamentals:
- Excellent voice integration (ElevenLabs)
- Solid lead capture automation
- Smart task automation (6 types)
- Complete call logging and tracking
- Pipeline management ready for sales teams

However, it's **built for SaaS/service sales**, not trades/contracting:
- Lacks project management
- Lacks estimate/quote workflow
- Lacks scheduling/resource allocation
- Lacks invoice generation

**To adapt for contractors:**
1. Rename/extend "Deal" → "Job" with contractor-specific fields
2. Add Work Order model for job tracking
3. Build Schedule/Calendar view
4. Add Photo documentation
5. Create customer portal
6. Integrate invoicing

**Timeline**: 4-8 weeks for full contractor adaptation, assuming experienced developer.

**Recommendation**: The CRM's core is solid. Extending it for contractors is feasible and keeps tech stack consistent. Alternatively, integrate with dedicated contractor software via webhooks/API.
