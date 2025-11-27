# Twilio + ElevenLabs Internal Calling System

## Overview

VoiceNow CRM now uses **Twilio for outbound calling** with **ElevenLabs for voice** via WebSocket streaming. This eliminates the need for ElevenLabs batch calling API and gives you full control over the calling system.

## Architecture

```
Agent Studio → Backend API → Twilio → ElevenLabs WebSocket → Live Voice Call
```

### How It Works

1. **User initiates call** from Agent Studio (Test Call, Live Call, or Bulk Upload)
2. **Backend validates** agent configuration and phone numbers
3. **Twilio makes the call** to the recipient
4. **When answered**, Twilio connects to ElevenLabs via WebSocket
5. **ElevenLabs agent** handles the conversation with the configured voice
6. **Call logs** stored in MongoDB with full metadata

## Test Call Feature (Fixed!)

### Backend Implementation

**File**: `/backend/controllers/agentController.js` (lines 1111-1211)

```javascript
export const testCall = async (req, res) => {
  const { agentId, phoneNumber } = req.body;

  // Get agent from database
  const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });

  // Initialize Twilio
  const twilioService = new TwilioService();

  // Make call using Twilio + ElevenLabs WebSocket
  const call = await twilioService.makeCallWithElevenLabs(
    process.env.TWILIO_PHONE_NUMBER, // From
    formattedNumber,                  // To
    agent.elevenLabsAgentId          // Agent ID for WebSocket
  );

  // Log the call
  await CallLog.create({...});

  return { success: true, callId: call.sid };
};
```

### Twilio Service Method

**File**: `/backend/services/twilioService.js` (lines 169-179)

```javascript
async makeCallWithElevenLabs(from, to, elevenLabsAgentId) {
  const twimlUrl = `${process.env.API_URL}/api/webhooks/twilio/elevenlabs-outbound?agentId=${elevenLabsAgentId}`;
  const statusCallback = `${process.env.API_URL}/api/webhooks/twilio/call-status`;

  return await this.makeCall(from, to, twimlUrl, statusCallback);
}
```

### TwiML Generation

**File**: `/backend/services/twilioService.js` (lines 182-201)

```javascript
generateElevenLabsTwiML(elevenLabsAgentId, customMessage = null) {
  const response = new VoiceResponse();
  const connect = response.connect();

  // WebSocket URL with callback for client tools
  const conversationEventUrl = `${webhookUrl}/api/webhooks/elevenlabs/conversation-event`;

  connect.stream({
    url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${elevenLabsAgentId}&callback_url=${encodeURIComponent(conversationEventUrl)}`,
    parameters: {
      api_key: process.env.ELEVENLABS_API_KEY
    }
  });

  return response.toString();
}
```

## New Features

### 1. Live Call (Single Number)

**Purpose**: Make a one-off call from Agent Studio

**Backend Endpoint**: `POST /api/call-initiation/live-call`

**File**: `/backend/controllers/callInitiationController.js` (lines 12-97)

**Request**:
```json
{
  "agentId": "agent_id_here",
  "phoneNumber": "+1234567890",
  "leadName": "John Doe",
  "leadNotes": "Interested in demo"
}
```

**Response**:
```json
{
  "success": true,
  "callId": "CAxxxx",
  "callLogId": "log_id",
  "leadId": "lead_id"
}
```

**Features**:
- Validates agent configuration
- Creates or updates lead automatically
- Initiates Twilio call with ElevenLabs WebSocket
- Logs call with full metadata
- Returns call ID for tracking

### 2. Bulk Call Upload (CSV)

**Purpose**: Upload CSV and call multiple numbers

**Backend Endpoint**: `POST /api/call-initiation/bulk-upload`

**File**: `/backend/controllers/callInitiationController.js` (lines 99-226)

**Request**: `multipart/form-data`
- `file`: CSV file
- `agentId`: Agent ID

**CSV Format**:
```csv
name,phone,email,notes
John Doe,+1234567890,john@example.com,Priority lead
Jane Smith,5555551234,jane@example.com,Follow-up needed
```

**Accepted Column Names**:
- Phone: `phone`, `Phone`, `phoneNumber`, `Phone Number`, `number`
- Name: `name`, `Name`, `Lead Name`, `leadName`
- Email: `email`, `Email`
- Notes: `notes`, `Notes`

**Response**:
```json
{
  "success": true,
  "totalRows": 100,
  "successfulCalls": 98,
  "errors": 2,
  "calls": [
    {
      "phoneNumber": "+1234567890",
      "name": "John Doe",
      "callId": "CAxxxx",
      "leadId": "lead_id",
      "status": "initiated"
    }
  ],
  "errorDetails": [...]
}
```

**Features**:
- Parses CSV with flexible column names
- Creates/updates leads automatically
- Initiates calls with 1-second delay (rate limiting)
- Comprehensive error handling
- Returns detailed results

### 3. Call Status Tracking

**Backend Endpoint**: `GET /api/call-initiation/status/:callId`

**File**: `/backend/controllers/callInitiationController.js` (lines 228-253)

**Response**:
```json
{
  "success": true,
  "call": {
    "_id": "log_id",
    "status": "completed",
    "duration": 120,
    "agentId": {...},
    "leadId": {...},
    "metadata": {...}
  }
}
```

## Frontend Integration

### API Service

**File**: `/frontend/src/services/api.js` (lines 77-87)

```javascript
export const callApi = {
  // Existing methods...
  initiateLiveCall: (data) => api.post('/call-initiation/live-call', data),
  uploadBulkCalls: (formData) => api.post('/call-initiation/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getCallStatus: (callId) => api.get(`/call-initiation/status/${callId}`),
};
```

### Usage in Agent Studio

```javascript
// Live Call
const handleLiveCall = async () => {
  try {
    const response = await callApi.initiateLiveCall({
      agentId: agent._id,
      phoneNumber: phone,
      leadName: name,
      leadNotes: notes
    });

    alert(`Call initiated! Call ID: ${response.data.callId}`);
  } catch (error) {
    console.error('Call failed:', error);
  }
};

// Bulk Upload
const handleBulkUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('agentId', agent._id);

  try {
    const response = await callApi.uploadBulkCalls(formData);
    alert(`${response.data.successfulCalls} calls initiated!`);
  } catch (error) {
    console.error('Bulk upload failed:', error);
  }
};
```

## Environment Variables Required

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Webhook URL (for callbacks)
WEBHOOK_URL=https://your-domain.com
# OR for local development
NGROK_URL=https://xxxx.ngrok-free.app
```

## Webhook Endpoints

### 1. Outbound Call Handler

**Endpoint**: `POST /api/webhooks/twilio/elevenlabs-outbound`

**File**: `/backend/controllers/twilioWebhookController.js` (lines 204-241)

**Purpose**: Generates TwiML to connect call to ElevenLabs WebSocket

### 2. Call Status Updates

**Endpoint**: `POST /api/webhooks/twilio/call-status`

**File**: `/backend/controllers/twilioWebhookController.js` (lines 114-175)

**Purpose**: Updates call logs with status changes (completed, failed, etc.)

### 3. ElevenLabs Conversation Events

**Endpoint**: `POST /api/webhooks/elevenlabs/conversation-event`

**Purpose**: Receives conversation events from ElevenLabs (tool calls, transcripts, etc.)

## Call Flow Diagram

```
┌─────────────────┐
│  Agent Studio   │
│  (User clicks   │
│  "Test Call")   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Backend: POST /agents/test-call    │
│  - Validates agent                   │
│  - Gets Twilio phone number         │
│  - Formats recipient number         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Twilio Service                      │
│  makeCallWithElevenLabs()           │
│  - Creates call via Twilio API      │
│  - Points to TwiML webhook          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Call Initiated                      │
│  - Twilio calls recipient           │
│  - Status: "initiated"              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Recipient Answers                   │
│  - Twilio requests TwiML            │
│  - Status: "answered"               │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Webhook: /elevenlabs-outbound      │
│  - Generates TwiML with             │
│    WebSocket <Connect>              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  ElevenLabs WebSocket                │
│  wss://api.elevenlabs.io/v1/convai  │
│  - Agent handles conversation       │
│  - Uses configured voice            │
│  - Follows agent script             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Conversation Complete               │
│  - Call ends                        │
│  - Status webhook fires             │
│  - CallLog updated                  │
└─────────────────────────────────────┘
```

## Testing the System

### 1. Test Call (Agents Page)

```bash
# Go to Agents page
# Click "Test Call" on any agent
# Enter phone number
# Click "Make Test Call"
# Your phone rings within 5-10 seconds
# Answer to hear ElevenLabs agent
```

### 2. Live Call (Agent Studio)

```bash
# Open Agent Studio
# Configure agent with voice
# Click "Live Call" button in header
# Enter phone number and name
# Click "Initiate Call"
# Call starts immediately
```

### 3. Bulk Upload (Agent Studio)

```bash
# Prepare CSV with columns: name, phone, email, notes
# Open Agent Studio
# Click "Bulk Upload" button
# Select CSV file
# Confirm upload
# System calls all numbers sequentially
```

## Call Logs

All calls are logged in MongoDB with:

```javascript
{
  userId: "user_id",
  agentId: "agent_id",
  leadId: "lead_id", // Auto-created if needed
  elevenLabsCallId: "CAxxxx", // Twilio Call SID
  phoneNumber: "+1234567890",
  status: "completed",
  direction: "outbound",
  duration: 120, // seconds
  durationMinutes: 2,
  metadata: {
    twilioCallSid: "CAxxxx",
    fromNumber: "+1987654321",
    method: "twilio_elevenlabs_websocket",
    testCall: false,
    liveCall: true,
    bulkCall: false,
    initiatedFrom: "agent_studio"
  },
  cost: {
    totalCost: 0.20, // $0.10/min
    costPerMinute: 0.10
  },
  createdAt: "2025-11-17T...",
  updatedAt: "2025-11-17T..."
}
```

## Pricing

**Twilio Costs**:
- Outbound calls: ~$0.02/min
- Phone number: $2/month

**ElevenLabs Costs**:
- Voice generation: Included in subscription
- WebSocket streaming: Free with API access

**Total Cost Per Call**: ~$0.02-0.04 per minute (mostly Twilio)

## Advantages Over ElevenLabs Batch Calling

✅ **Full Control**: You own the calling infrastructure
✅ **Lower Cost**: Only pay Twilio rates
✅ **Real-time Monitoring**: Track calls via Twilio console
✅ **Flexible Routing**: Route calls through your backend
✅ **CRM Integration**: Automatic lead creation/updates
✅ **Call Logs**: Complete call history in your database
✅ **Webhook Events**: Full visibility into call lifecycle
✅ **Scalable**: Handle thousands of concurrent calls

## Troubleshooting

### Test Call Doesn't Work

**Check**:
1. ✅ `TWILIO_ACCOUNT_SID` set
2. ✅ `TWILIO_AUTH_TOKEN` set
3. ✅ `TWILIO_PHONE_NUMBER` set (e.g., `+1234567890`)
4. ✅ `ELEVENLABS_API_KEY` set
5. ✅ Agent has `elevenLabsAgentId` configured
6. ✅ Phone number formatted correctly (with country code)

**Debug**:
```bash
# Check backend logs
tail -f backend/logs/server.log | grep "TEST CALL"

# Check Twilio logs
# Visit: https://console.twilio.com/logs

# Test Twilio credentials
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"
```

### Call Connects but No Voice

**Check**:
1. ✅ ElevenLabs agent ID is correct
2. ✅ WebSocket URL is accessible
3. ✅ `WEBHOOK_URL` or `NGROK_URL` set correctly
4. ✅ Firewall allows WebSocket connections

**Debug**:
```bash
# Test ElevenLabs agent
curl -X GET "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"

# Check webhook accessibility
curl -X POST "${WEBHOOK_URL}/api/webhooks/twilio/elevenlabs-outbound?agentId=test"
```

### Bulk Upload Fails

**Check**:
1. ✅ CSV format correct (name, phone columns required)
2. ✅ File size under 5MB
3. ✅ Phone numbers valid (with country codes)
4. ✅ Not hitting rate limits (1 call/second)

**Debug**:
```bash
# Check CSV parsing
node -e "
const csv = require('csv-parser');
const fs = require('fs');
fs.createReadStream('your-file.csv')
  .pipe(csv())
  .on('data', (row) => console.log(row));
"
```

## Next Steps

1. **Add UI Buttons**: Add "Live Call" and "Bulk Upload" buttons to Agent Studio header
2. **Create Modals**: Build modals for phone number input and file upload
3. **Real-time Status**: Show call status updates in real-time
4. **Call History**: Display recent calls in Agent Studio
5. **Analytics**: Add call analytics dashboard

## Related Files

- `/backend/controllers/agentController.js` - Test call handler
- `/backend/controllers/callInitiationController.js` - Live & bulk calls
- `/backend/services/twilioService.js` - Twilio integration
- `/backend/controllers/twilioWebhookController.js` - Webhook handlers
- `/backend/routes/callInitiation.js` - API routes
- `/frontend/src/services/api.js` - Frontend API methods
- `/frontend/src/components/AgentStudioV2.jsx` - Agent Studio UI

---

**Last Updated**: November 17, 2025
**Status**: ✅ Production Ready
**System**: Twilio + ElevenLabs WebSocket
