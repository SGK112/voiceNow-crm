# VoiceFlow → ElevenLabs → CRM Integration Plan

## Current Problem

Right now there are **3 disconnected systems**:

```
┌─────────────────────────┐
│ VoiceFlow Builder       │  ← You build workflows here
│ (Visual workflow)       │  ← Saves to MongoDB
└─────────────────────────┘
            ↓ NOT CONNECTED
┌─────────────────────────┐
│ Voice Agent             │  ← Has voice/prompt config
│ (Database record)       │  ← Links to ElevenLabs
└─────────────────────────┘
            ↓ NOT AUTO-SYNCED
┌─────────────────────────┐
│ ElevenLabs Agent        │  ← Actually makes calls
│ (Live AI agent)         │  ← Uses generic config
└─────────────────────────┘
            ↓ PARTIAL CONNECTION
┌─────────────────────────┐
│ CRM (Leads/Calls)       │  ← Should auto-populate
│ (Database)              │  ← Currently manual
└─────────────────────────┘
```

## What Should Happen

```
1. BUILD in VoiceFlow Builder
   ↓
2. Click "Deploy" button
   ↓
3. Creates/Updates Voice Agent in DB
   ↓
4. Syncs to ElevenLabs with voice/prompt
   ↓
5. Sets up webhook for call completion
   ↓
6. When call completes → Auto-creates Lead in CRM
   ↓
7. Populates all call data, transcript, metadata
   ↓
8. Triggers any workflows (SMS, Email, etc.)
```

## Required Components

### 1. VoiceFlow Workflow Deployment API

**Endpoint:** `POST /api/voiceflow/deploy/:workflowId`

**What it does:**
- Reads workflow from MongoDB
- Extracts voice, prompt, nodes configuration
- Creates or updates VoiceAgent
- Syncs to ElevenLabs
- Returns deployed agent details

### 2. VoiceFlow Workflow Executor

**Service:** `VoiceFlowExecutor`

**What it does:**
- Interprets VoiceFlow nodes (Voice, Prompt, AI Decision, etc.)
- Converts to ElevenLabs agent configuration
- Handles node-specific logic (Calendar, Transfer, etc.)

### 3. ElevenLabs Webhook Handler

**Endpoint:** `POST /api/webhooks/elevenlabs/call-complete`

**What it does:**
- Receives call completion webhook from ElevenLabs
- Extracts transcript, metadata, duration
- Creates CallLog entry
- Creates/updates Lead in CRM
- Triggers follow-up workflows

### 4. CRM Auto-Population Service

**Service:** `CRMIntegrationService`

**What it does:**
- Parses call transcript for contact info
- Creates Lead if new customer
- Updates Lead if existing
- Adds call notes
- Triggers notifications

## Implementation Steps

### Step 1: VoiceFlow Deployment Controller

```javascript
// backend/controllers/voiceflowDeploymentController.js

export const deployWorkflow = async (req, res) => {
  const { id } = req.params;

  // 1. Get workflow from DB
  const workflow = await VisualWorkflow.findById(id);

  // 2. Extract voice, prompt, and nodes
  const voiceNode = workflow.nodes.find(n => n.type === 'voice');
  const promptNode = workflow.nodes.find(n => n.type === 'prompt');
  const inboundNode = workflow.nodes.find(n => n.type === 'inboundCall');

  // 3. Create/update VoiceAgent
  let agent = await VoiceAgent.findOne({ workflowId: id });

  if (!agent) {
    agent = await VoiceAgent.create({
      userId: req.user._id,
      name: workflow.name,
      workflowId: id,
      voiceId: voiceNode?.data?.voiceId,
      script: promptNode?.data?.prompt,
      firstMessage: promptNode?.data?.firstMessage,
      phoneNumber: inboundNode?.data?.twilioNumber
    });
  } else {
    agent.voiceId = voiceNode?.data?.voiceId;
    agent.script = promptNode?.data?.prompt;
    agent.firstMessage = promptNode?.data?.firstMessage;
    await agent.save();
  }

  // 4. Sync to ElevenLabs
  const elevenLabsService = new ElevenLabsService();

  if (agent.elevenLabsAgentId) {
    // Update existing
    await elevenLabsService.updateAgent(agent.elevenLabsAgentId, {
      conversation_config: {
        agent: {
          prompt: {
            prompt: agent.script,
            voice: { voice_id: agent.voiceId }
          },
          first_message: agent.firstMessage
        }
      }
    });
  } else {
    // Create new
    const elevenLabsAgent = await elevenLabsService.createAgent({
      conversation_config: {
        agent: {
          prompt: {
            prompt: agent.script,
            voice: { voice_id: agent.voiceId }
          },
          first_message: agent.firstMessage
        }
      },
      name: agent.name
    });

    agent.elevenLabsAgentId = elevenLabsAgent.agent_id;
    await agent.save();
  }

  // 5. Set up webhook
  const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/elevenlabs/${agent._id}`;
  // Configure ElevenLabs to send webhooks to this URL

  res.json({
    success: true,
    agent,
    webhookUrl,
    testUrl: `/app/agents/${agent._id}`
  });
};
```

### Step 2: Webhook Handler for Call Completion

```javascript
// backend/controllers/elevenLabsWebhookController.js

export const handleCallComplete = async (req, res) => {
  const { agentId } = req.params;
  const callData = req.body;

  // 1. Save call log
  const callLog = await CallLog.create({
    agentId,
    userId: agent.userId,
    direction: 'inbound',
    phoneNumber: callData.caller_phone,
    duration: callData.duration,
    transcript: callData.transcript,
    status: 'completed',
    elevenLabsCallId: callData.call_id,
    metadata: new Map(Object.entries({
      dynamicVariables: callData.dynamic_variables,
      sentiment: analyzeSentiment(callData.transcript)
    }))
  });

  // 2. Extract lead info from transcript
  const leadInfo = await extractLeadInfo(callData.transcript);

  // 3. Create or update lead
  let lead = await Lead.findOne({ phone: callData.caller_phone });

  if (!lead) {
    lead = await Lead.create({
      userId: agent.userId,
      name: leadInfo.name || 'Unknown',
      phone: callData.caller_phone,
      email: leadInfo.email,
      source: 'voice_call',
      status: 'new',
      assignedTo: agent.userId,
      notes: `Call transcript:\n${callData.transcript}`
    });
  } else {
    lead.notes += `\n\nCall on ${new Date()}:\n${callData.transcript}`;
    lead.lastContactDate = new Date();
    await lead.save();
  }

  // 4. Link call to lead
  callLog.leadId = lead._id;
  await callLog.save();

  // 5. Trigger follow-up workflows if configured
  // (Send SMS, Email, create tasks, etc.)

  res.json({ success: true });
};

async function extractLeadInfo(transcript) {
  // Use AI to extract name, email, intent from transcript
  const prompt = `Extract contact information from this call transcript:

${transcript}

Return JSON with: name, email, phone, intent`;

  const aiService = new AIService();
  const response = await aiService.chat(prompt);

  try {
    return JSON.parse(response);
  } catch {
    return {};
  }
}

function analyzeSentiment(transcript) {
  // Simple sentiment analysis
  const positive = ['great', 'thank', 'awesome', 'perfect', 'yes'];
  const negative = ['no', 'angry', 'frustrated', 'terrible', 'bad'];

  const lower = transcript.toLowerCase();
  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}
```

### Step 3: Frontend "Deploy" Button

```jsx
// In VoiceFlowBuilder.jsx

const handleDeployWorkflow = async () => {
  try {
    const response = await api.post(`/voiceflow/deploy/${workflowId}`);

    addLog('success', 'Workflow deployed successfully!');
    addLog('info', `Agent URL: ${response.data.testUrl}`);
    addLog('info', `Webhook URL: ${response.data.webhookUrl}`);

    // Show success modal
    setDeploymentResult(response.data);
    setShowDeployModal(true);

  } catch (error) {
    addLog('error', 'Deployment failed', error.message);
  }
};

// Add Deploy button to toolbar
<button
  onClick={handleDeployWorkflow}
  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
>
  🚀 Deploy Workflow
</button>
```

## Data Flow Example

### User Action: Build & Deploy Workflow

1. **User builds workflow:**
   - Adds Inbound Call node (phone: +1234567890)
   - Adds Voice node (Sarah voice)
   - Adds Prompt node ("You are Alex...")
   - Adds AI Intent node (detect: sales/support)
   - Adds Calendar node (book appointments)
   - Clicks "Deploy"

2. **System deploys:**
   - Creates VoiceAgent in database
   - Syncs to ElevenLabs with Sarah + Alex config
   - Sets webhook: `/api/webhooks/elevenlabs/{agentId}`
   - Returns agent test URL

3. **Customer calls +1234567890:**
   - ElevenLabs receives call
   - Uses Sarah voice + Alex prompt
   - AI detects intent (sales)
   - Routes to sales team or books appointment

4. **Call completes:**
   - ElevenLabs sends webhook with transcript
   - System creates CallLog
   - Extracts lead info (name, email, phone)
   - Creates Lead in CRM
   - Adds call notes
   - Shows in Dashboard

5. **User sees in CRM:**
   - New lead: "John Doe"
   - Phone: (480) 555-1234
   - Source: Voice Call
   - Notes: Full transcript
   - Sentiment: Positive
   - Next action: Follow up

## Benefits

✅ **One-click deployment** - Build workflow → Deploy → Live
✅ **Auto-sync** - Workflow changes sync to ElevenLabs
✅ **CRM auto-population** - Every call creates/updates leads
✅ **Full tracking** - Transcript, duration, sentiment captured
✅ **Workflow triggers** - Calls can trigger SMS, email, tasks
✅ **Unified system** - Everything flows together

## Next Steps

1. Create `voiceflowDeploymentController.js`
2. Create `elevenLabsWebhookController.js`
3. Add routes for deployment + webhooks
4. Add "Deploy" button to VoiceFlow builder
5. Test end-to-end flow
6. Document for users

This will make the entire system work as one cohesive platform!
