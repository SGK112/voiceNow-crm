# VoiceNow CRM - Quick Reference Guide

## System Overview

VoiceFlow is a **voice-first CRM** that automates lead generation, qualification, and sales pipeline management through AI voice agents.

```
┌─────────────────────────────────────────────────────────────┐
│                  LEAD → DEAL → CLOSE                        │
│                                                             │
│  Voice Agent Call → Extract Data → Create Lead → Task →   │
│  Manual Deal Creation → Pipeline Movement → Won/Lost       │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Models & Relationships

### Core Entities

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Lead** | Prospect captured from calls | name, phone, email, qualified, status, value |
| **Deal** | Opportunity in sales pipeline | title, value, stage, probability, contact |
| **CallLog** | Voice call record | duration, transcript, sentiment, extracted_data, status |
| **VoiceAgent** | AI agent that makes calls | name, type, script, elevenLabsAgentId |
| **Task** | Auto or manual action items | title, type, priority, dueDate, relatedContact |
| **Campaign** | Batch calling runs | contacts, schedule, stats, agentId |

### Relationships

```
User
  ├── Lead [name, email, phone, callId]
  │   ├── CallLog [transcript, sentiment]
  │   └── Deal [value, stage, probability]
  │
  ├── CallLog [recording_url, extracted_data]
  │   └── VoiceAgent [name, script]
  │
  ├── VoiceAgent [type: lead_gen|booking|collections|promo|support]
  │   └── Campaign [contacts, schedule]
  │
  └── Task [autoCreatedBy: 'voice_agent', relatedContact, relatedCall]
```

---

## Lead Status Flow

```
NEW (Entry point)
  ↓ (Contacted in call)
CONTACTED (Showed interest)
  ↓ (Passed qualification)
QUALIFIED (Ready for proposal)
  ↓ (Converted to customer)
CONVERTED (Closed/Customer)

❌ LOST (Rejected at any stage)
```

**Automation:** Status updates happen automatically when:
- qualified=true → QUALIFIED status + 24h follow-up task
- appointment_booked=true → QUALIFIED status + reminder task
- payment_captured=true → CONVERTED status + thank you task

---

## Deal Pipeline Stages

```
LEAD (10%) → QUALIFIED (25%) → PROPOSAL (50%) → NEGOTIATION (75%) → WON (100%) → ✅
                                                                       ↘
                                                                        LOST (0%) ❌
```

**Key Features:**
- Probability auto-set by stage
- Weighted value = value × (probability/100)
- Tracks multiple calls per deal
- Triggers n8n workflows on stage change

---

## The 6 Built-In Automations

After EVERY voice call, these run automatically:

| # | Trigger | Action | Timing | Priority |
|---|---------|--------|--------|----------|
| 1 | Lead qualified | Create follow-up task | 24h | High |
| 2 | Appointment booked | Create reminder task | 24h before | High |
| 3 | No answer/Failed | Create retry task | 2h | Medium |
| 4 | Interest (not qualified) | Create nurture task | 3 days | Medium |
| 5 | Payment captured | Create thank you task + update lead | 1h | High |
| 6 | Negative sentiment | Create URGENT escalation | 30min | URGENT |

**Code Location:** `backend/controllers/webhookController.js` lines 12-180

---

## Voice Agent Configuration

### Agent Types
- **lead_gen**: Generate new leads
- **booking**: Book appointments
- **collections**: Payment collection
- **promo**: Promotional campaigns
- **support**: Customer support
- **custom**: User-defined purpose

### What Agents Extract
```javascript
extracted_data {
  name: String,                  // Prospect name
  email: String,                 // Email
  phone: String,                 // Phone
  qualified: Boolean,            // Qualification assessment
  interest: String,              // What they're interested in
  appointment_booked: Boolean,   // Appointment scheduled?
  appointment_date: Date,        // When?
  payment_captured: Boolean,     // Payment received?
  payment_amount: Number,        // How much?
  qualification_score: 0-100,    // AI confidence score
  estimated_value: Number,       // Deal value estimate
}
```

---

## API Endpoints (Key Routes)

### Leads
```
GET    /api/leads                 - List all leads
GET    /api/leads/:id             - Get lead details
POST   /api/leads                 - Create lead manually
PATCH  /api/leads/:id             - Update lead (status, notes, etc.)
DELETE /api/leads/:id             - Delete lead
GET    /api/leads/export          - Export as CSV
```

### Deals
```
GET    /api/deals                 - List all deals
GET    /api/deals/pipeline/summary - Pipeline stats
GET    /api/deals/:id             - Get deal details
POST   /api/deals                 - Create deal
PATCH  /api/deals/:id             - Update deal
PATCH  /api/deals/:id/stage       - Move deal to new stage
DELETE /api/deals/:id             - Delete deal
```

### Calls
```
GET    /api/calls                 - List all calls
GET    /api/calls/:id             - Get call details + transcript
POST   /api/calls/initiate        - Initiate voice call
DELETE /api/calls/:id             - Delete call record
```

### Workflows
```
GET    /api/workflows             - List user workflows
GET    /api/workflows/templates   - Get pre-built templates
POST   /api/workflows             - Create workflow
PATCH  /api/workflows/:id         - Update workflow
DELETE /api/workflows/:id         - Delete workflow
```

---

## Data Flow: Voice Call → Lead → Deal

```
1. USER INITIATES CALL
   callController.initiateCall({leadId, agentId, phoneNumber})
   ↓

2. ELEVENLABS PROCESSES CALL
   - Natural conversation
   - Data extraction
   - Sentiment analysis
   ↓

3. CALL COMPLETES → WEBHOOK
   ElevenLabs sends: {call_id, duration, transcript, extracted_data, sentiment, status}
   ↓

4. CREATE/UPDATE CALL LOG
   CallLog.create({
     agentId, userId, phoneNumber, duration,
     transcript, sentiment, leadsCapured, status
   })
   ↓

5. AUTO-CREATE LEAD (if data extracted)
   IF extracted_data.name && extracted_data.phone THEN:
   Lead.create({
     name, email, phone, source: agent.type,
     qualified, qualificationScore, value, callId
   })
   ↓

6. RUN 6 BUILT-IN AUTOMATIONS
   - Check qualifications, appointments, sentiment, etc.
   - Create auto-tasks with full context
   - Update lead status automatically
   ↓

7. TRIGGER N8N WORKFLOWS (if configured)
   - User-defined custom automations
   - Third-party integrations
   ↓

8. USER MANUALLY CREATES DEAL (if desired)
   Deal.create({title, contact: leadId, value, stage: 'lead'})
   ↓

9. MOVE THROUGH PIPELINE
   Stage changes: lead → qualified → proposal → negotiation → won
   Each stage change triggers n8n workflows (if configured)
   ↓

10. CLOSE DEAL
    - Mark as 'won' (100% probability) or 'lost' (0%)
    - Actual close date recorded
    - Lead status updates to 'converted'
```

---

## Qualification Scoring

### Lead Becomes "Qualified" When:
1. **Voice Agent Assessment**: `qualified: true` in extracted_data
2. **Manual Override**: User manually sets `qualified: true`
3. **Behavioral Signal**: 
   - Appointment booked during call
   - Payment captured during call

### Qualification Score (0-100):
- Set by voice agent's AI assessment
- Updated manually by user
- Used for lead ranking and prioritization

---

## Usage Tracking & Billing

### Tracked Metrics (Monthly)
```
minutesUsed        - Total call minutes consumed
leadsGenerated     - Leads created from calls
costTracking       - Total cost of calls (minutes × $0.10)
```

### Subscription Tiers
| Plan | Price | Included Minutes | Max Agents | Overages |
|------|-------|------------------|-----------|----------|
| Trial | Free | 100 min | 1 | Not allowed |
| Starter | $99/mo | 1000 min | 1 | $0.15/min |
| Professional | $299/mo | 5000 min | 5 | $0.12/min |
| Enterprise | $999/mo | 20000 min | ∞ | $0.10/min |

---

## File Locations Quick Map

### Database Models
```
backend/models/
├── Lead.js              - Lead schema (status, qualified, value)
├── Deal.js              - Deal/Pipeline schema (stages, probability)
├── CallLog.js           - Call tracking (transcript, sentiment)
├── VoiceAgent.js        - Agent configuration
├── Task.js              - Auto-created tasks
├── Campaign.js          - Batch calling campaigns
├── Workflow.js          - Visual workflow (not implemented)
├── N8nWorkflow.js       - N8n integration
└── User.js              - User accounts + subscription
```

### Controllers (Business Logic)
```
backend/controllers/
├── leadController.js    - Lead CRUD operations
├── callController.js    - Call initiation & retrieval
├── webhookController.js ⭐ Built-in automations (lines 12-180)
├── workflowController.js - Workflow CRUD
├── campaignController.js - Campaign management
└── [others...]
```

### Key Routes
```
backend/routes/
├── leads.js             - /api/leads endpoints
├── deals.js             - /api/deals endpoints
├── calls.js             - /api/calls endpoints
├── workflows.js         - /api/workflows endpoints
├── campaigns.js         - /api/campaigns endpoints
└── webhooks.js          - ElevenLabs webhook endpoint
```

### Services (Integrations)
```
backend/services/
├── elevenLabsService.js - ElevenLabs API wrapper
├── n8nService.js        - N8n integration
├── workflowEngine.js    - Workflow execution engine
├── emailService.js      - Email sending
└── [others...]
```

---

## Workflow Trigger Events

### Available Triggers
```
- call_completed        (After any call finishes)
- call_initiated        (When call starts)
- lead_created          (When lead auto-created from call)
- lead_qualified        (When lead marked qualified)
- appointment_booked    (When appointment scheduled)
- payment_received      (When payment captured)
- deal_created          (When deal created)
- deal_stage_changed    (When deal moves stages)
- deal_won              (When deal won)
- deal_lost             (When deal lost)
- manual                (Triggered by user action)
- schedule              (Cron expressions)
```

### Workflow Trigger Conditions
```javascript
triggerConditions: {
  agentTypes: ['lead_gen', 'booking'],  // Which agent types trigger
  callStatus: ['completed', 'failed'],   // Which call statuses
  leadQualified: true/false/undefined,   // Qualification filter
}
```

---

## Common Workflows for Contractors

### 1. Lead Gen → Quick Follow-Up
```
Trigger: call_completed + agent_type='lead_gen'
Actions:
  - Create high-priority follow-up task (24h)
  - Send SMS reminder (1h)
  - Add to nurture sequence
```

### 2. Appointment → Confirmation
```
Trigger: appointment_booked = true
Actions:
  - Create reminder task (24h before)
  - Send SMS confirmation (immediate)
  - Add to calendar
```

### 3. Failed Call → Retry Sequence
```
Trigger: callStatus = 'no-answer' | 'busy'
Actions:
  - Create retry task (2h)
  - Auto-retry after 2h (if enabled)
  - Alert manager after 3 failed attempts
```

### 4. Payment → Thank You + Upsell
```
Trigger: payment_captured = true
Actions:
  - Create thank you task (1h)
  - Update lead to 'converted'
  - Create upsell/referral task (7 days)
```

---

## Debugging & Monitoring

### Call Webhook Processing
```
ElevenLabs sends webhook
  → webhookController.handleElevenLabsWebhook()
  → Create CallLog record
  → Auto-create Lead (if extractable)
  → Run 6 built-in automations
  → Trigger N8n workflows (if conditions match)
  → Return success

If something fails: Check logs for "❌ Built-in automation error:"
```

### Common Issues

**Lead Not Creating:**
- Check: extracted_data.name && extracted_data.phone in webhook
- Check: userId in CallLog (must be owner of agent)

**Task Not Creating:**
- Check: Lead exists before automation runs
- Check: Lead has valid _id

**Automation Not Triggering:**
- Check: N8nWorkflow.enabled = true
- Check: triggerConditions match call data
- Check: N8n webhook URL configured

---

## Key Performance Metrics

```
Agent Performance:
├── Total Calls
├── Successful Calls %
├── Leads Generated
├── Average Duration
└── Conversion Rate

Pipeline Performance:
├── Total Deal Value ($)
├── Weighted Value (realistic pipeline) ($)
├── Deals per Stage
├── Average Deal Value
└── Win Rate %

Lead Performance:
├── Leads This Month
├── Conversion Rate (lead → deal)
├── Average Time to Conversion
├── Cost Per Lead
└── Lead Quality Score
```

---

## What's NOT in VoiceFlow (For Contractors)

- ❌ Project/Job management
- ❌ Estimate/Quote generation
- ❌ Scheduling/Resource allocation
- ❌ Invoice generation
- ❌ Photo documentation
- ❌ Customer portal
- ❌ Work order tracking
- ❌ Material/Equipment management

These would need to be added for contractor-specific features.

---

## Getting Started

### 1. Create Voice Agent
- Set name, type (lead_gen, booking, etc.)
- Write script/prompt
- Configure ElevenLabs details

### 2. Make Test Call
- Initiate call to test number
- Listen to agent conversation
- Check extracted data in CallLog

### 3. Review Auto-Created Objects
- Check Lead created from call
- Check Tasks auto-created
- Review transcript + sentiment

### 4. Create Deal (Optional)
- Link call's lead to new deal
- Set value + expected close date
- Move through pipeline stages

### 5. Configure Workflows (Advanced)
- Create n8n workflows in n8n cloud
- Link trigger conditions in VoiceFlow
- Test with real calls

---

**Need more details? See: CRM_WORKFLOW_ANALYSIS.md**
