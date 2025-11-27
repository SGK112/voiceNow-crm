# Test Call Feature - Complete

## Summary

Added a "Test Call" button to each agent in the Agents panel that allows users to make a quick test call with any agent to verify it's working correctly.

## Changes Made

### 1. **Installed ElevenLabs SDK**

```bash
npm install @elevenlabs/elevenlabs-js
```

### 2. **Frontend Changes** (`frontend/src/pages/Agents.jsx`)

**Added:**
- Test call dialog with phone number input
- "Test Call" option in agent dropdown menu
- Shows agent details (name, voice, ElevenLabs ID) before calling
- Loading state while call is being initiated

**Key Features:**
- Phone number validation
- Auto-formats US numbers (adds +1 if missing)
- Shows ElevenLabs agent ID to verify proper setup
- Success/error toasts for user feedback

**UI Flow:**
1. User clicks agent's "..." menu
2. Clicks "Test Call"
3. Dialog opens with:
   - Agent name and voice info
   - ElevenLabs agent ID (verifies it's real, not placeholder)
   - Phone number input
4. User enters phone number
5. Clicks "Make Test Call"
6. Call initiated via backend API

### 3. **Backend Changes**

#### **Route** (`backend/routes/agents.js`)
- Added `POST /api/agents/test-call` endpoint

#### **Controller** (`backend/controllers/agentController.js`)
- Added `testCall` function that:
  - Validates agent exists and belongs to user
  - Checks for valid ElevenLabs agent ID
  - Formats phone number (adds +1 if needed)
  - Calls ElevenLabs batch calling API
  - Logs the call in database
  - Returns success/error response

**Dynamic Variables for Test Calls:**
```javascript
{
  customer_name: 'Test User',
  lead_name: 'Test User',
  lead_phone: phoneNumber,
  company_name: 'VoiceNow CRM',
  demo_type: 'agent_test_call'
}
```

## How It Works

### Agent Tied to ElevenLabs

**When Agent is Created:**
1. User creates agent in VoiceFlow UI (Agents → Create Agent)
2. Backend calls `POST /v1/convai/agents/create` on ElevenLabs API
3. ElevenLabs returns `agent_id` (e.g., `agent_1701ka7v2exqejhbws4kp8s1axdk`)
4. Agent saved to MongoDB with real ElevenLabs ID

**Agent Fields:**
```javascript
{
  _id: '...', // MongoDB ID
  name: 'Test Agent',
  elevenLabsAgentId: 'agent_1701ka7v2exqejhbws4kp8s1axdk', // REAL ElevenLabs ID
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // ElevenLabs voice ID
  voiceName: 'Sarah',
  script: '...',
  firstMessage: '...',
  // ... other fields
}
```

**Making a Call:**
1. Uses `elevenLabsAgentId` to identify the agent
2. Calls `POST /v1/convai/batch-calling/submit` with:
   - `agent_id`: The real ElevenLabs agent ID
   - `agent_phone_number_id`: From env (`ELEVENLABS_PHONE_NUMBER_ID`)
   - `recipients`: Array with phone number
   - `dynamic_variables`: Personalization data
3. ElevenLabs initiates call via Twilio
4. Phone rings with conversational AI agent

## Testing

### Using the Test Call Button

1. **Navigate to Agents Page:**
   ```
   http://localhost:5173/app/agents
   ```

2. **Find an Agent:**
   - Look for agents with "Active" badge
   - Click the "..." menu (three vertical dots)

3. **Click "Test Call":**
   - Dialog opens showing agent details
   - **Important**: Check the ElevenLabs ID field
     - ✅ Should start with `agent_` (real agent)
     - ❌ If it starts with `local_`, agent needs to be recreated

4. **Enter Phone Number:**
   - Format: `+1 (480) 555-5887` or `4802555887`
   - System auto-adds `+1` for US numbers

5. **Make Test Call:**
   - Click "Make Test Call"
   - Button shows "Calling..." with loading animation
   - Toast notification confirms success
   - Phone should ring in 5-15 seconds

### Verifying Agent Setup

**Check if Agent is Properly Created:**

```javascript
// In test call dialog, look at ElevenLabs ID:
agent_1701ka7v2exqejhbws4kp8s1axdk ✅ GOOD - Real ElevenLabs agent
local_1763347349_x8s9d2k ❌ BAD - Placeholder, needs recreation
```

**If Agent Has Placeholder ID:**
1. Delete the agent
2. Create new agent (will call ElevenLabs API)
3. New agent will have real `agent_` ID
4. Test call will work

## Environment Variables Required

```bash
# ElevenLabs API Key
ELEVENLABS_API_KEY=sk_...

# ElevenLabs Phone Number ID (for outbound calls)
ELEVENLABS_PHONE_NUMBER_ID=phnum_1801k7xb68cefjv89rv10f90qykv

# Webhook URL (for call events)
WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app
```

## API Reference

### Test Call Endpoint

**Request:**
```http
POST /api/agents/test-call
Authorization: Bearer {token}
Content-Type: application/json

{
  "agentId": "675b1234567890abcdef1234",
  "phoneNumber": "+14802555887"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Test call initiated successfully",
  "callId": "btcal_1501ka7v2fwxexq869f7s0tqfjd8"
}
```

**Response (Error - No ElevenLabs ID):**
```json
{
  "message": "This agent was not properly created in ElevenLabs. Please recreate the agent."
}
```

## Call Flow

```
User clicks "Test Call"
    ↓
Frontend: Opens dialog with agent details
    ↓
User enters phone number
    ↓
Frontend: POST /api/agents/test-call {agentId, phoneNumber}
    ↓
Backend: Fetch agent from database
    ↓
Backend: Validate ElevenLabs agent ID
    ↓
Backend: Call ElevenLabs batch calling API
    ↓
ElevenLabs: Initiates call via Twilio
    ↓
Phone rings → Conversational AI agent speaks
    ↓
Backend: Log call in database
    ↓
Frontend: Show success toast
```

## Troubleshooting

### Call Doesn't Ring

**Check:**
1. Agent has real ElevenLabs ID (not `local_...`)
2. `ELEVENLABS_PHONE_NUMBER_ID` is set in `.env`
3. Phone number is formatted correctly (+1...)
4. Check backend logs for API errors

**Backend Logs:**
```
📞 [TEST CALL] Initiating test call
   Agent ID: 675b1234567890abcdef1234
   Phone: +14802555887
   Agent Name: Test Agent
   ElevenLabs ID: agent_1701ka7v2exqejhbws4kp8s1axdk
   Formatted Phone: +14802555887
   Calling ElevenLabs API...
   ✅ Call initiated: btcal_1501ka7v2fwxexq869f7s0tqfjd8
```

### Agent Has Placeholder ID

**Cause:** Agent was created when ElevenLabs API was down or misconfigured

**Solution:**
1. Delete the agent
2. Ensure `ELEVENLABS_API_KEY` is valid
3. Create new agent (triggers ElevenLabs API call)
4. New agent will have real ID

### No Voice During Call

**Cause:** Agent was created but voice configuration failed

**Check:**
1. Agent's `voiceId` matches an ElevenLabs voice
2. Voice is compatible with conversational AI
3. Check ElevenLabs API for agent configuration

## Files Changed

1. `frontend/src/pages/Agents.jsx` - Added test call button and dialog
2. `backend/routes/agents.js` - Added test call route
3. `backend/controllers/agentController.js` - Added testCall controller
4. `package.json` - Added @elevenlabs/elevenlabs-js

---

**Status**: ✅ Complete and Ready to Test

**Test URL**: http://localhost:5173/app/agents

**Created by**: Claude Code
**Date**: 2025-11-16
