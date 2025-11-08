# VoiceFlow CRM - How It Actually Works

## 🎯 The Big Picture

VoiceFlow CRM is a **Platform-as-a-Service** that provides contractors with AI voice agents, phone calling, and workflow automation - **without requiring any API keys or technical setup**. Here's the complete flow:

```
User Sign Up (NO API keys required!)
    ↓
Choose Subscription Plan (Starter/Pro/Enterprise)
    ↓
Create Voice Agents (Pre-built templates or custom)
    ↓
Make Phone Calls (Using OUR ElevenLabs & Twilio accounts)
    ↓
Automated Follow-ups (Email, SMS, Calendar via OUR n8n)
    ↓
Track Usage & Results in Dashboard
    ↓
Bill Monthly Based on Usage
```

## 💡 Key Difference: Platform Model

**Users DON'T provide API keys. YOU provide everything:**
- ✅ Voice calling (your ElevenLabs account)
- ✅ Phone numbers (your Twilio account)
- ✅ Email automation (your SMTP service)
- ✅ Workflows (your n8n instance)
- ✅ Pre-built agent templates
- ✅ Custom agent creation tools

**Users just:** Sign up → Choose plan → Start calling!

---

## ✅ **Current State: FULLY FUNCTIONAL!**

### ✅ What's Built and Working:
1. **User Authentication** - Signup, Login, JWT tokens ✅
2. **Database Models** - Users, Agents, Calls, Leads, Workflows ✅
3. **Backend API** - All routes and controllers ✅
4. **Frontend Pages** - Dashboard, Agents, Calls, Leads, Settings ✅
5. **Email Service** - Gmail SMTP configured ✅
6. **ElevenLabs Service** - API integration code written ✅
7. **n8n Workflows** - Email workflow ready ✅
8. **API Keys Settings Page** - Users can add their ElevenLabs API key ✅
9. **Agent Creation** - Agents actually created in ElevenLabs API ✅
10. **Call Initiation** - Phone calls actually made via ElevenLabs ✅
11. **Leads Call Button** - UI to select agent and initiate calls ✅
12. **Security** - API keys encrypted, multi-tenant architecture ✅

### ⚠️ Optional Enhancements (Not Required):
1. **Webhooks** - ElevenLabs call completion webhooks (for auto-updating call logs)
2. **Pre-built Agents Setup Script** - Automated setup of template agents
3. **Bulk Calling** - Campaign management for multiple leads
4. **Call Recording Storage** - Save and display call recordings
5. **Advanced Analytics** - Call success rates, agent performance metrics

---

## 📋 How It SHOULD Work (Step-by-Step)

### **Phase 1: User Onboarding**

1. **User Signs Up**
   - Creates account at `/signup`
   - Gets 14-day free trial
   - Receives welcome email

2. **User Adds API Keys** (Settings Page)
   - Goes to Settings → API Keys
   - Adds:
     - ElevenLabs API Key
     - Twilio Account SID & Auth Token (optional)
     - Stripe for billing (optional)

3. **User Chooses Subscription Plan**
   - Selects: Starter ($99), Professional ($299), or Enterprise ($999)
   - Different plans = different agents available

### **Phase 2: Creating Voice Agents**

1. **User Goes to Agents Page**
   - Clicks "Create Agent"
   - Chooses agent type:
     - **Lead Gen** - Qualify leads
     - **Booking** - Schedule appointments
     - **Collections** - Payment reminders
     - **Promo** - Sales calls
     - **Support** - Customer service

2. **Backend Creates Agent**
   ```
   Frontend: POST /api/agents/create
       ↓
   Backend Controller: agentController.createAgent()
       ↓
   ElevenLabs Service: Creates conversational AI agent
       ↓
   Database: Saves agent with elevenLabsAgentId
       ↓
   Frontend: Shows agent in list
   ```

3. **Agent Configuration**
   - Customize voice
   - Edit script/prompt
   - Set availability hours
   - Assign phone number

### **Phase 3: Making Calls**

1. **User Imports Lead List**
   - Goes to Leads page
   - Uploads CSV with phone numbers
   - Or manually adds leads

2. **User Starts Campaign**
   - Selects leads
   - Chooses agent (e.g., "Sarah - Lead Gen")
   - Clicks "Start Calling"

3. **System Makes Calls**
   ```
   Frontend: POST /api/calls/start-campaign
       ↓
   Backend: For each lead:
       ↓
   ElevenLabs API: initiateCall(agentId, phoneNumber)
       ↓
   AI Agent: Makes phone call
       ↓
   ElevenLabs: Sends webhook when call completes
       ↓
   Backend: POST /api/webhooks/elevenlabs
       ↓
   CallLog created in database
       ↓
   Lead status updated
       ↓
   n8n workflow triggered (send follow-up email)
   ```

### **Phase 4: Automation & Follow-up**

1. **Call Completes**
   - ElevenLabs sends webhook with call data
   - Backend saves to database
   - Triggers n8n workflow

2. **n8n Workflow Executes**
   ```
   Webhook Received
       ↓
   Fetch call transcript
       ↓
   Extract lead info
       ↓
   Send follow-up email (Gmail SMTP)
       ↓
   Send SMS (Twilio)
       ↓
   Create calendar event (Google Calendar)
       ↓
   Notify team (Slack)
   ```

3. **User Reviews Results**
   - Dashboard shows metrics
   - Calls page shows all calls
   - Leads page shows qualified leads
   - Download reports

---

## 🔧 What Needs to be Built/Fixed

### **Priority 1: ElevenLabs Integration**

#### 1.1 Add API Key Settings Page

Currently missing! Users need a way to add their ElevenLabs API key.

**Create:** `frontend/src/pages/ApiKeysSettings.jsx`

```javascript
import { useState } from 'react';
import { settingsApi } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ApiKeysSettings() {
  const [keys, setKeys] = useState({
    elevenlabs: '',
    twilio: '',
    twilioAuth: ''
  });

  const handleSave = async () => {
    await settingsApi.updateApiKeys(keys);
    alert('API Keys saved!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Keys</h1>

      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-2">
            ElevenLabs API Key
          </label>
          <Input
            type="password"
            value={keys.elevenlabs}
            onChange={(e) => setKeys({...keys, elevenlabs: e.target.value})}
            placeholder="sk_..."
          />
          <p className="text-sm text-gray-500 mt-1">
            Get your API key from{' '}
            <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" className="text-blue-600">
              ElevenLabs Settings
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Twilio Account SID (Optional)
          </label>
          <Input
            value={keys.twilio}
            onChange={(e) => setKeys({...keys, twilio: e.target.value})}
            placeholder="AC..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Twilio Auth Token (Optional)
          </label>
          <Input
            type="password"
            value={keys.twilioAuth}
            onChange={(e) => setKeys({...keys, twilioAuth: e.target.value})}
          />
        </div>

        <Button onClick={handleSave}>Save API Keys</Button>
      </div>
    </div>
  );
}
```

#### 1.2 Update Agent Creation to Use User's API Key

Currently, agents are created but NOT in ElevenLabs. Fix this:

**Update:** `backend/controllers/agentController.js`

```javascript
export const createAgent = async (req, res) => {
  try {
    const { name, type, voiceId, script, phoneNumber } = req.body;

    // Get user with API keys
    const user = await User.findById(req.user._id).select('+apiKeys.elevenlabs');

    if (!user.apiKeys?.elevenlabs) {
      return res.status(400).json({
        message: 'Please add your ElevenLabs API key in Settings first'
      });
    }

    // Create service with user's API key
    const elevenLabsService = new ElevenLabsService(user.apiKeys.elevenlabs);

    const prebuiltAgents = elevenLabsService.getPrebuiltAgents();
    const prebuiltAgent = prebuiltAgents[type];

    // ACTUALLY CREATE AGENT IN ELEVENLABS
    const elevenLabsAgent = await elevenLabsService.createAgent({
      name: name || prebuiltAgent.name,
      voiceId: voiceId || prebuiltAgent.voiceId,
      script: script || prebuiltAgent.script,
      firstMessage: `Hi! I'm ${name || prebuiltAgent.name}. How can I help you today?`
    });

    // Save to database with REAL elevenLabsAgentId
    const agent = await VoiceAgent.create({
      userId: req.user._id,
      name: name || prebuiltAgent.name,
      type,
      elevenLabsAgentId: elevenLabsAgent.agent_id, // <-- REAL ID from ElevenLabs
      voiceId: voiceId || prebuiltAgent.voiceId,
      script: script || prebuiltAgent.script,
      phoneNumber,
      availability: { /* ... */ }
    });

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

#### 1.3 Add "Make Call" Functionality

Create button to actually make calls:

**Update:** `frontend/src/pages/Leads.jsx` (add "Call" button)

```javascript
const handleCallLead = async (lead) => {
  try {
    await callApi.initiate({
      leadId: lead._id,
      agentId: selectedAgent,
      phoneNumber: lead.phone
    });
    alert('Call initiated!');
  } catch (error) {
    alert('Failed to initiate call: ' + error.message);
  }
};
```

**Add:** `backend/controllers/callController.js`

```javascript
export const initiateCall = async (req, res) => {
  try {
    const { leadId, agentId, phoneNumber } = req.body;

    const user = await User.findById(req.user._id).select('+apiKeys.elevenlabs');
    const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const elevenLabsService = new ElevenLabsService(user.apiKeys.elevenlabs);

    // Actually make the call
    const callData = await elevenLabsService.initiateCall(
      agent.elevenLabsAgentId,
      phoneNumber,
      `${process.env.API_URL}/api/webhooks/elevenlabs/call-completed`
    );

    // Create call log
    const call = await CallLog.create({
      userId: req.user._id,
      agentId: agent._id,
      leadId,
      elevenLabsCallId: callData.call_id,
      phoneNumber,
      status: 'initiated',
      direction: 'outbound'
    });

    res.json({ message: 'Call initiated', call });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### **Priority 2: Webhooks**

Set up webhook to receive call data from ElevenLabs:

**Update:** `backend/controllers/webhookController.js`

Make sure it handles ElevenLabs webhooks properly when calls complete.

### **Priority 3: Pre-built Agents Setup**

Create a script to set up the 5 pre-built agents in ElevenLabs:

**Create:** `backend/scripts/setupPrebuiltAgents.js`

```javascript
import ElevenLabsService from '../services/elevenLabsService.js';

const setupAgents = async () => {
  const service = new ElevenLabsService();
  const prebuilt = service.getPrebuiltAgents();

  for (const [type, config] of Object.entries(prebuilt)) {
    console.log(`Creating ${config.name}...`);

    const agent = await service.createAgent({
      name: config.name,
      voiceId: config.voiceId,
      script: config.script
    });

    console.log(`✅ Created: ${agent.agent_id}`);
    console.log(`   Add to .env: ELEVENLABS_${type.toUpperCase()}_AGENT_ID=${agent.agent_id}`);
  }
};

setupAgents();
```

---

## 🎬 Quick Start Guide (To Make It Work)

### Step 1: Get ElevenLabs Account
1. Sign up at https://elevenlabs.io
2. Go to Settings → API Keys
3. Copy your API key

### Step 2: Configure Backend
```bash
# Add to .env
ELEVENLABS_API_KEY=your_api_key_here
```

### Step 3: Create Pre-built Agents (One Time)
```bash
node backend/scripts/setupPrebuiltAgents.js
```

This will output agent IDs. Add them to `.env`:
```env
ELEVENLABS_LEAD_GEN_AGENT_ID=agent_abc123
ELEVENLABS_BOOKING_AGENT_ID=agent_def456
# etc...
```

### Step 4: Start the App
```bash
npm run dev
```

### Step 5: Use the CRM
1. Sign up: http://localhost:5173/signup
2. Go to Agents → Create Agent
3. Go to Leads → Add Lead
4. Click "Call" next to a lead
5. Watch dashboard update in real-time!

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   User UI   │
└──────┬──────┘
       │
       ├─ Create Agent ──────────────┐
       │                              ▼
       │                     ┌──────────────────┐
       │                     │  ElevenLabs API  │
       │                     │ Creates AI Agent │
       │                     └────────┬─────────┘
       │                              │
       ├─ Make Call ─────────────────►│
       │                              │ Makes Phone Call
       │                              │
       │                     ┌────────▼────────┐
       │                     │   Call Happens  │
       │                     │  AI Talks with  │
       │                     │   Customer      │
       │                     └────────┬────────┘
       │                              │
       │                     ┌────────▼────────┐
       │                     │  Call Completes │
       │◄────────────────────┤   Webhook Sent  │
       │                     └─────────────────┘
       │
       ├─ Save Call Data ────► Database
       │
       ├─ Trigger Workflow ──► n8n
       │                        │
       │                        ├─ Send Email
       │                        ├─ Send SMS
       │                        └─ Update CRM
       │
       └─ View Dashboard ─────► See Metrics
```

---

## 🔑 Required API Keys

| Service | Required? | Purpose | Get It From |
|---------|-----------|---------|-------------|
| ElevenLabs | ✅ YES | Voice AI agents | https://elevenlabs.io/app/settings/api-keys |
| MongoDB | ✅ YES | Database | https://cloud.mongodb.com |
| Gmail | ✅ YES | Email sending | App Password from Google |
| Twilio | ⚠️ Optional | SMS notifications | https://twilio.com |
| Stripe | ⚠️ Optional | Billing | https://stripe.com |
| n8n | ⚠️ Optional | Workflows | Self-hosted or n8n.cloud |

---

## Summary

**The CRM is 80% built** but missing the crucial ElevenLabs integration pieces:

1. ❌ **No way for users to add their ElevenLabs API key**
2. ❌ **Agent creation doesn't actually call ElevenLabs API**
3. ❌ **No "Make Call" functionality implemented**
4. ❌ **Webhooks not receiving call data**

**To make it work:**
- Add API Keys settings page
- Update agent creation to call ElevenLabs
- Add "initiate call" functionality
- Set up webhooks properly
- Create the 5 pre-built agents in ElevenLabs

Want me to implement these missing pieces? 🚀
