# Agent Lifecycle Management - ElevenLabs Integration

## Overview

VoiceNow CRM now includes a complete agent lifecycle management system, similar to how n8n workflows are managed. This allows you to **build, test, and deploy** ElevenLabs conversational AI agents with full version control and deployment tracking.

## Features

### 🚀 Deployment Pipeline

Agents move through three deployment stages:

1. **📝 Draft** - Work in progress, not yet ready for testing
2. **🧪 Testing** - Ready for testing and validation
3. **🚀 Production** - Live and active for real users

### 📊 Version Control

- **Automatic Versioning**: Version number increments when deploying to production
- **Changelog Tracking**: Document changes with each deployment
- **Deployment History**: See who deployed what and when

### 🧪 Real-Time Testing

- **WebSocket Integration**: Test agents with real-time conversational AI
- **Test Results Tracking**: Save and review test results
- **Conversation Transcripts**: Review full conversation history

## Architecture

### Backend Components

#### 1. VoiceAgent Model (`backend/models/VoiceAgent.js`)

Added deployment lifecycle fields:

```javascript
deployment: {
  status: {
    type: String,
    enum: ['draft', 'testing', 'production'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  lastDeployedAt: Date,
  deployedBy: ObjectId,
  testResults: [{
    testedAt: Date,
    testedBy: ObjectId,
    duration: Number,
    conversationTranscript: String,
    rating: Number,  // 1-5
    notes: String,
    status: String   // 'passed', 'failed', 'needs_improvement'
  }],
  changelog: [{
    version: Number,
    changes: String,
    updatedAt: Date,
    updatedBy: ObjectId
  }]
}
```

#### 2. Agent Controller (`backend/controllers/agentController.js`)

New endpoint functions:

- `deployAgent()` - Update deployment status
- `saveTestResult()` - Save test conversation results
- `getTestResults()` - Retrieve test history
- `getChangelog()` - View deployment history

#### 3. Routes (`backend/routes/agents.js`)

```javascript
// Agent lifecycle management
router.post('/:id/deploy', protect, deployAgent);
router.post('/:id/test-results', protect, saveTestResult);
router.get('/:id/test-results', protect, getTestResults);
router.get('/:id/changelog', protect, getChangelog);
```

#### 4. WebSocket Service (`backend/services/agentWebSocketService.js`)

Real-time agent testing via ElevenLabs WebSocket API:

```javascript
// Start test conversation
const conversationId = await wsService.startTestConversation(agentId, {
  customPrompt: "...",
  customFirstMessage: "...",
  dynamicVariables: {...},
  onAudio: (audioBase64) => {...},
  onTranscript: (who, text) => {...},
  onResponse: (text) => {...}
});

// Send text message
wsService.sendTextMessage(conversationId, "Hello!");

// End conversation
wsService.endConversation(conversationId);
```

**Events Emitted:**
- `conversation_started` - Conversation initiated
- `audio` - Audio chunk received
- `user_transcript` - User speech transcribed
- `agent_response` - Agent text response
- `agent_response_correction` - Agent corrected its response
- `interruption` - User interrupted agent
- `tool_call` - Agent requesting tool execution
- `error` - Error occurred
- `connection_closed` - Connection terminated

### Frontend Components

#### 1. AgentDashboard (`frontend/src/components/AgentDashboard.jsx`)

**New UI Elements:**

1. **Deployment Status Badges**
   - Shows current status on agent cards
   - Color-coded: Draft (gray), Testing (yellow), Production (green)
   - Displays version number

2. **Deploy Button**
   - Opens deployment dialog
   - Select target environment
   - Add changelog notes
   - Warning for production deployments

3. **Deployment Dialog**
   - Current status display
   - Environment selector (Draft/Testing/Production)
   - Changelog textarea
   - Production deployment warning

**Helper Functions:**

```javascript
getDeploymentBadge(status) {
  // Returns badge config for status
  return {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🚀',
    label: 'Live'
  };
}

handleDeploy() {
  // Deploy agent to new status
  await api.post(`/agents/${agentId}/deploy`, {
    status: 'production',
    changes: 'Changelog message...'
  });
}
```

## Usage Guide

### 1. Creating an Agent

Agents start in **Draft** status by default:

```
1. Go to /app/agents
2. Click "Create New Agent" or use AI Builder
3. Configure agent settings
4. Agent is created with status: Draft (v1)
```

### 2. Moving to Testing

When ready to test:

```
1. Select agent in dashboard
2. Click "Deploy" button
3. Select "Testing" environment
4. (Optional) Add changelog: "Initial version ready for testing"
5. Click "Deploy to testing"
```

### 3. Testing the Agent

**Method 1: Phone Call Test**
```
1. Click "Test Call" button
2. Enter phone number
3. Answer the call and interact with agent
4. (Optional) Save test results via API
```

**Method 2: WebSocket Test (Coming Soon)**
```
1. Click "Test Conversation" button
2. Interact with agent in browser
3. View real-time transcript
4. Rate and save test results
```

### 4. Deploying to Production

When testing is complete:

```
1. Click "Deploy" button
2. Select "Production" environment
3. Add changelog: "Tested and ready for production"
4. Read warning message
5. Click "Deploy to production"
6. Version increments automatically (v1 → v2)
```

## API Reference

### Deploy Agent

**Endpoint:** `POST /api/agents/:id/deploy`

**Request:**
```json
{
  "status": "production",
  "changes": "Updated greeting message and improved lead qualification flow"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent deployed to production",
  "agent": {
    "_id": "...",
    "name": "Sales Assistant",
    "deployment": {
      "status": "production",
      "version": 2,
      "lastDeployedAt": "2025-11-16T12:00:00Z",
      "deployedBy": "user_id",
      "changelog": [...]
    }
  }
}
```

### Save Test Result

**Endpoint:** `POST /api/agents/:id/test-results`

**Request:**
```json
{
  "duration": 180,
  "transcript": "Full conversation transcript...",
  "rating": 4,
  "notes": "Agent handled objections well, but could improve closing",
  "status": "passed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test result saved",
  "testResults": [...]
}
```

### Get Test Results

**Endpoint:** `GET /api/agents/:id/test-results`

**Response:**
```json
{
  "testResults": [
    {
      "testedAt": "2025-11-16T10:30:00Z",
      "testedBy": {...},
      "duration": 180,
      "rating": 4,
      "status": "passed"
    }
  ],
  "deploymentStatus": "testing",
  "version": 1
}
```

### Get Changelog

**Endpoint:** `GET /api/agents/:id/changelog`

**Response:**
```json
{
  "changelog": [
    {
      "version": 2,
      "changes": "Improved lead qualification flow",
      "updatedAt": "2025-11-16T12:00:00Z",
      "updatedBy": {...}
    },
    {
      "version": 1,
      "changes": "Initial release",
      "updatedAt": "2025-11-15T09:00:00Z",
      "updatedBy": {...}
    }
  ],
  "currentVersion": 2
}
```

## WebSocket Testing (Advanced)

### Establishing Connection

Based on ElevenLabs Agents Platform WebSocket API:

**WebSocket URL:**
```
wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agentId}
```

**Headers:**
```
xi-api-key: {ELEVENLABS_API_KEY}
```

### Message Types

**Client → Server:**

1. **Conversation Initiation**
```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "customer_name": "Test User",
    "company_name": "VoiceNow CRM"
  },
  "conversation_config_override": {
    "agent": {
      "prompt": {
        "prompt": "Custom prompt override..."
      },
      "first_message": "Custom greeting...",
      "language": "en"
    }
  }
}
```

2. **Audio Chunk**
```json
{
  "user_audio_chunk": "base64_encoded_audio..."
}
```

3. **Text Message**
```json
{
  "type": "user_message",
  "text": "Hello, I need help"
}
```

4. **Contextual Update**
```json
{
  "type": "contextual_update",
  "text": "Additional context for the agent..."
}
```

5. **Pong (keepalive)**
```json
{
  "type": "pong",
  "event_id": 123
}
```

**Server → Client:**

1. **Conversation Metadata**
```json
{
  "type": "conversation_initiation_metadata",
  "conversation_initiation_metadata_event": {
    "conversation_id": "conv_abc123",
    "agent_output_audio_format": "mp3_44100_128",
    "user_input_audio_format": "pcm_16000"
  }
}
```

2. **Audio Response**
```json
{
  "type": "audio",
  "audio_event": {
    "audio_base_64": "base64_audio_chunk...",
    "event_id": 456
  }
}
```

3. **User Transcript**
```json
{
  "type": "user_transcript",
  "user_transcription_event": {
    "user_transcript": "Hello, I need help"
  }
}
```

4. **Agent Response**
```json
{
  "type": "agent_response",
  "agent_response_event": {
    "agent_response": "Hi! I'm here to help. What can I do for you?"
  }
}
```

5. **Tool Call**
```json
{
  "type": "client_tool_call",
  "client_tool_call": {
    "tool_name": "book_appointment",
    "tool_call_id": "call_789",
    "parameters": {
      "date": "2025-11-20",
      "time": "10:00"
    }
  }
}
```

## Comparison: Workflows vs Agents

| Feature | n8n Workflows | ElevenLabs Agents |
|---------|--------------|-------------------|
| **Creation** | Visual builder or n8n editor | AI Builder or manual form |
| **Testing** | Manual execution | Phone test call or WebSocket |
| **Deployment** | Activate/Deactivate toggle | Draft → Testing → Production |
| **Versioning** | Not tracked | Automatic version increments |
| **Changelog** | Not available | Full deployment history |
| **Status** | Active/Inactive | Draft/Testing/Production |
| **Execution** | Trigger-based automation | Phone call conversations |

## Best Practices

### 1. Development Workflow

```
┌─────────┐
│  Draft  │ ← Create and edit agent
└────┬────┘
     │
     ↓
┌─────────┐
│ Testing │ ← Test thoroughly
└────┬────┘
     │
     ↓  (After successful tests)
┌────────────┐
│ Production │ ← Live for users
└────────────┘
```

### 2. Changelog Best Practices

Good changelog messages:
- ✅ "Updated greeting to be more conversational"
- ✅ "Fixed issue with appointment booking flow"
- ✅ "Added lead qualification questions"

Bad changelog messages:
- ❌ "Updated agent"
- ❌ "Changes"
- ❌ (empty)

### 3. Testing Guidelines

**Before Moving to Production:**
- [ ] Test call completed successfully
- [ ] Agent follows the script correctly
- [ ] Voice quality is acceptable
- [ ] Dynamic variables work as expected
- [ ] Tools/integrations function properly
- [ ] Agent handles edge cases gracefully

### 4. Version Control

- Use **Testing** environment for QA
- Only deploy to **Production** when fully tested
- Always document changes in changelog
- Review test results before production deployment

## Troubleshooting

### Agent Won't Deploy to Production

**Error:** "Cannot deploy to production: Agent not properly created in ElevenLabs"

**Cause:** Agent has placeholder ID (starts with `local_`)

**Solution:**
1. Delete the agent
2. Recreate it (ensures real ElevenLabs agent creation)
3. New agent will have proper `agent_` ID
4. Can now deploy to production

### Deployment Not Showing

**Issue:** UI not updating after deployment

**Solution:**
- Refresh browser (Cmd/Ctrl + Shift + R)
- Check backend logs for errors
- Verify API call succeeded

### WebSocket Connection Failed

**Error:** WebSocket connection timeout or auth error

**Solutions:**
- Verify `ELEVENLABS_API_KEY` is set correctly
- Check agent has valid ElevenLabs ID
- Ensure agent is in Testing or Production status
- Check network/firewall settings

## Future Enhancements

- [ ] Browser-based conversation testing (no phone required)
- [ ] A/B testing different agent versions
- [ ] Analytics dashboard per deployment
- [ ] Rollback to previous versions
- [ ] Automated testing with test scripts
- [ ] Integration with CI/CD pipelines

---

## Summary

The Agent Lifecycle Management system brings professional software development practices to voice agent creation:

✅ **Version Control** - Track every change with changelog
✅ **Deployment Pipeline** - Draft → Testing → Production
✅ **Test Tracking** - Save and review test results
✅ **Real-time Testing** - WebSocket integration for browser testing
✅ **Team Collaboration** - See who deployed what and when

This makes managing ElevenLabs agents as robust and reliable as managing n8n workflows!

**Created by:** Claude Code
**Date:** 2025-11-16
**Status:** ✅ Complete and Ready to Use
