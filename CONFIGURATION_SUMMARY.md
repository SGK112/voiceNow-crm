# ElevenLabs Voice Agent Configuration Summary

## ✅ Fix Applied and Documented

### The Fix

**File**: `/backend/services/elevenLabsService.js`
**Lines**: 149-155

**Change**: Removed automatic `conversation_config_override` creation that was breaking TTS.

```javascript
// ✅ FIXED CODE
// Only modify script if one is explicitly provided
if (personalizedScript) {
  const cleanedScript = personalizedScript.replace(/\*\*CURRENT DATE & TIME INFORMATION:\*\*[\s\S]*?(?=\n\n(?:\*\*[A-Z]|\w+:)|$)/, '').trim();
  personalizedScript = dateTimeContext + '\n\n' + cleanedScript;
}
// If no personalizedScript is provided, don't override - let agent use its default config
```

---

## Correct Configuration

### 1. Agent Creation (ElevenLabs API)

**Endpoint**: `POST /v1/convai/agents/create`

```javascript
{
  "name": "Sarah - Sales Assistant",
  "conversation_config": {
    "tts": {
      "voice_id": "EXAVITQu4vr4xnSDxMaL",  // Sarah (female)
      "model_id": "eleven_flash_v2"         // Required for English
    },
    "agent": {
      "prompt": {
        "prompt": "You are a friendly and professional sales assistant..."
      },
      "first_message": "Hi! This is Sarah from VoiceNow CRM...",
      "language": "en"
    }
  }
}
```

**Response:**
```json
{
  "agent_id": "agent_8901ka7yahqxedjb36ccdnj855b1",
  "name": "Sarah - Sales Assistant",
  ...
}
```

### 2. Phone Call Initiation (Batch Calling)

**Endpoint**: `POST /v1/convai/batch-calling/submit`

#### ✅ Option A: Use Agent Defaults (Recommended)

```javascript
{
  "call_name": "Test Call - Sarah",
  "agent_id": "agent_8901ka7yahqxedjb36ccdnj855b1",
  "agent_phone_number_id": "phnum_1801k7xb68cefjv89rv10f90qykv",
  "recipients": [
    {
      "phone_number": "+14802555887"
    }
  ],
  "webhook_url": "https://your-domain.com/api/webhooks/elevenlabs/conversation-event"
  // ✅ NO conversation_config_override
  // ✅ Agent uses its default TTS + prompt
  // ✅ Voice output works!
}
```

#### ⚠️ Option B: Override (Advanced - Requires Full Config)

```javascript
{
  "call_name": "Personalized Call - Sarah",
  "agent_id": "agent_8901ka7yahqxedjb36ccdnj855b1",
  "agent_phone_number_id": "phnum_1801k7xb68cefjv89rv10f90qykv",
  "recipients": [
    {
      "phone_number": "+14802555887"
    }
  ],
  "conversation_config_override": {
    "tts": {  // ⚠️ MUST include TTS or voice breaks
      "voice_id": "EXAVITQu4vr4xnSDxMaL",
      "model_id": "eleven_flash_v2"
    },
    "agent": {
      "prompt": {
        "prompt": "Custom personalized prompt for this specific call..."
      },
      "first_message": "Hi John! This is Sarah calling specifically for you...",
      "language": "en"
    }
  },
  "webhook_url": "https://your-domain.com/api/webhooks/elevenlabs/conversation-event"
}
```

---

## VoiceNow CRM Implementation

### How Test Calls Work

```
User clicks "Test Call" in UI
    ↓
POST /api/agents/test-call
    {
      "agentId": "673888fa50d2e4f0e1d7d9a1",
      "phoneNumber": "4802555887"
    }
    ↓
agentController.testCall()
    (backend/controllers/agentController.js:1111-1215)
    ↓
elevenLabsService.initiateCall(
    agent.elevenLabsAgentId,
    formattedNumber,
    agentPhoneNumberId,
    webhookUrl,
    dynamicVariables,
    null,  // ✅ personalizedScript = null
    null   // ✅ personalizedFirstMessage = null
)
    ↓
elevenLabsService.initiateCall()
    (backend/services/elevenLabsService.js:139-262)
    ↓
Lines 149-155: Check if personalizedScript is provided
    ✅ It's null, so skip override creation
    ↓
Lines 191-205: Only create override if needed
    ✅ personalizedScript is null
    ✅ personalizedFirstMessage is null
    ✅ NO override is created
    ↓
requestBody sent to ElevenLabs:
    {
      call_name: "...",
      agent_id: "agent_xxx",
      agent_phone_number_id: "phnum_xxx",
      recipients: [...]
      // NO conversation_config_override
    }
    ↓
ElevenLabs receives request
    ✅ Uses agent's default config
    ✅ TTS settings preserved
    ↓
Phone call initiated
    ✅ Phone rings
    ✅ User answers
    ✅ Agent speaks with voice!
```

---

## Environment Variables

**File**: `.env`

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=sk_cd3bed51d94fdfaf8ae2b7b3815c9cdde05ca3e7b0b807e0
ELEVENLABS_PHONE_NUMBER_ID=phnum_1801k7xb68cefjv89rv10f90qykv

# Webhook for call events
WEBHOOK_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://localhost:27017/voiceflow-crm

# Server
PORT=5000
NODE_ENV=development
```

---

## Voice IDs Reference

### Female Voices
| Name   | Voice ID                     | Description           |
|--------|------------------------------|-----------------------|
| Sarah  | `EXAVITQu4vr4xnSDxMaL`      | Warm, professional    |
| Rachel | `21m00Tcm4TlvDq8ikWAM`      | Friendly, clear       |
| Bella  | `MF3mGyEYCl7XYWbV9V6O`      | Professional          |

### Male Voices
| Name   | Voice ID                     | Description           |
|--------|------------------------------|-----------------------|
| George | `JBFqnCBsd6RMkjVDRZzb`      | Deep, authoritative   |
| Adam   | `pNInz6obpgDQGcFmaJgB`      | Professional, clear   |

### TTS Models
| Model ID            | Supported Languages | Status              |
|---------------------|---------------------|---------------------|
| `eleven_flash_v2`   | English             | ✅ Recommended      |
| `eleven_turbo_v2`   | English             | ✅ Supported        |
| `eleven_flash_v2_5` | Non-English         | ❌ NOT for English  |

---

## Code Patterns

### ✅ Correct Pattern (No Override)

```javascript
const elevenLabsService = new ElevenLabsService();

await elevenLabsService.initiateCall(
  'agent_8901ka7yahqxedjb36ccdnj855b1',
  '+14802555887',
  'phnum_1801k7xb68cefjv89rv10f90qykv',
  'https://domain.com/webhook',
  { lead_name: 'John Doe' },
  null,  // ✅ No script override
  null   // ✅ No message override
);
// Result: Voice works!
```

### ❌ Broken Pattern (Override Without TTS)

```javascript
// DON'T DO THIS - It breaks voice
await axios.post('https://api.elevenlabs.io/v1/convai/batch-calling/submit', {
  call_name: 'Test',
  agent_id: 'agent_xxx',
  agent_phone_number_id: 'phnum_xxx',
  recipients: [{ phone_number: '+14802555887' }],
  conversation_config_override: {
    agent: {
      prompt: { prompt: 'Custom prompt' }
      // ❌ Missing TTS config!
    }
  }
});
// Result: No voice output
```

### ✅ Correct Pattern (Override With TTS)

```javascript
// If you MUST override, include TTS
await axios.post('https://api.elevenlabs.io/v1/convai/batch-calling/submit', {
  call_name: 'Test',
  agent_id: 'agent_xxx',
  agent_phone_number_id: 'phnum_xxx',
  recipients: [{ phone_number: '+14802555887' }],
  conversation_config_override: {
    tts: {  // ✅ Include TTS
      voice_id: 'EXAVITQu4vr4xnSDxMaL',
      model_id: 'eleven_flash_v2'
    },
    agent: {
      prompt: { prompt: 'Custom prompt' },
      first_message: 'Custom greeting',
      language: 'en'
    }
  }
});
// Result: Voice works with custom prompt
```

---

## Testing Commands

### Test with Script

```bash
# Run standalone test
node test-voice-fix.js

# Expected output:
# ✅ Call initiated: btcal_xxx
# 📞 Phone should ring with VOICE!
```

### Test via API

```bash
# Login first to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Save the token, then:
curl -X POST http://localhost:5000/api/agents/test-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "agentId": "673888fa50d2e4f0e1d7d9a1",
    "phoneNumber": "4802555887"
  }'
```

### Verify Call Status

```bash
# Get call details from ElevenLabs
curl -X GET \
  "https://api.elevenlabs.io/v1/convai/calls/btcal_xxx" \
  -H "xi-api-key: sk_cd3bed51d94fdfaf8ae2b7b3815c9cdde05ca3e7b0b807e0"

# Expected response includes:
# - status: "completed"
# - transcript with agent messages
# - duration_seconds > 0
```

---

## Common Issues & Solutions

### Issue: "No voice" on calls

**Status**: ✅ FIXED

**Cause**: `conversation_config_override` missing TTS config

**Solution**: Already fixed in `elevenLabsService.js:149-155`

**Verification**:
```bash
grep -A 3 "If no personalizedScript is provided" backend/services/elevenLabsService.js
```

Should show the comment without any code following it.

---

### Issue: "Agent not properly created"

**Error**: "This agent was not properly created in ElevenLabs"

**Cause**: Agent has placeholder ID (starts with `local_`)

**Solution**: Delete and recreate the agent in the UI

---

### Issue: Wrong TTS model

**Error**: "English Agents must use turbo or flash v2"

**Cause**: Using `eleven_flash_v2_5` instead of `eleven_flash_v2`

**Solution**: Change to `eleven_flash_v2` in agent creation

---

## Documentation Files

| File | Purpose |
|------|---------|
| `ELEVENLABS_VOICE_FIX_DOCUMENTATION.md` | Complete technical details of the fix |
| `VOICE_CALL_INTEGRATION_GUIDE.md` | Integration guide and architecture |
| `QUICK_START_VOICE_CALLS.md` | Quick reference for using voice calls |
| `CONFIGURATION_SUMMARY.md` | This file - configuration reference |
| `AGENT_LIFECYCLE_MANAGEMENT.md` | Agent deployment pipeline docs |

---

## Summary

✅ **Fix Status**: Applied and working

✅ **Configuration**: Documented and correct

✅ **Testing**: Ready to use

🎯 **How to Use**:
1. Create agent in UI with voice selection
2. Click "Test Call" button
3. Enter phone number: `480-255-5887`
4. Phone rings → Agent speaks with voice!

📚 **References**:
- ElevenLabs API Docs: https://elevenlabs.io/docs/conversational-ai
- Code Location: `/backend/services/elevenLabsService.js:149-155`
- Test Script: `test-voice-fix.js`

---

**Last Updated**: 2025-11-16
**Status**: ✅ Production Ready
**Verified**: Voice output working correctly
