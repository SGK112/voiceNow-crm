# Quick Start: ElevenLabs Voice Calls

## ✅ Status: WORKING (Fixed 2025-11-16)

## Quick Start Guide

### 1. Environment Setup

Verify these are in your `.env`:

```bash
ELEVENLABS_API_KEY=sk_cd3bed51d94fdfaf8ae2b7b3815c9cdde05ca3e7b0b807e0
ELEVENLABS_PHONE_NUMBER_ID=phnum_1801k7xb68cefjv89rv10f90qykv
WEBHOOK_URL=https://your-domain.com
MONGODB_URI=mongodb://localhost:27017/voiceflow-crm
```

### 2. Start the Backend

```bash
npm run server
```

### 3. Create an Agent (UI Method)

1. Open: http://localhost:3000/app/agents
2. Click "Create New Agent"
3. Select voice: **Sarah** (female) or **George** (male)
4. Write script: "You are a friendly assistant..."
5. Save

### 4. Make a Test Call

1. Find your agent in the dashboard
2. Click "Test Call" button
3. Enter phone: `480-255-5887`
4. Click "Initiate Call"
5. **Answer your phone - the agent will speak!**

---

## Configuration Reference

### Correct Agent Configuration

```javascript
{
  name: 'Sarah - Sales Assistant',
  conversation_config: {
    tts: {
      voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah's voice
      model_id: 'eleven_flash_v2'         // ✅ Required for English
    },
    agent: {
      prompt: {
        prompt: 'You are a friendly sales assistant...'
      },
      first_message: 'Hi! This is Sarah calling...',
      language: 'en'
    }
  }
}
```

### Correct Call Configuration

```javascript
// ✅ DO THIS - No override, voice works
{
  call_name: 'Test Call',
  agent_id: 'agent_xxx',
  agent_phone_number_id: 'phnum_xxx',
  recipients: [{ phone_number: '+14802555887' }],
  webhook_url: 'https://your-domain.com/webhook'
  // NO conversation_config_override
}
```

```javascript
// ❌ DON'T DO THIS - Override without TTS breaks voice
{
  call_name: 'Test Call',
  agent_id: 'agent_xxx',
  agent_phone_number_id: 'phnum_xxx',
  recipients: [{ phone_number: '+14802555887' }],
  conversation_config_override: {
    agent: {
      prompt: { prompt: 'Custom prompt' }
      // ❌ Missing TTS config - NO VOICE!
    }
  }
}
```

---

## Voice Selection

### Female Voices
- **Sarah**: `EXAVITQu4vr4xnSDxMaL` (warm, professional)
- **Rachel**: `21m00Tcm4TlvDq8ikWAM` (friendly)
- **Bella**: `MF3mGyEYCl7XYWbV9V6O` (clear)

### Male Voices
- **George**: `JBFqnCBsd6RMkjVDRZzb` (deep, authoritative)
- **Adam**: `pNInz6obpgDQGcFmaJgB` (professional)

### TTS Models (English Only)
- ✅ `eleven_flash_v2` (recommended)
- ✅ `eleven_turbo_v2` (also works)
- ❌ `eleven_flash_v2_5` (NOT supported)

---

## Testing Checklist

Before making a call:
- [ ] Backend is running (`npm run server`)
- [ ] Agent has valid `elevenLabsAgentId` (check MongoDB or UI)
- [ ] `ELEVENLABS_API_KEY` is set
- [ ] `ELEVENLABS_PHONE_NUMBER_ID` is set
- [ ] Phone number is correct: `480-255-5887`

After the call:
- [ ] Phone rang
- [ ] Agent spoke with voice (first message audible)
- [ ] User could respond
- [ ] Agent responded back
- [ ] Call transcript has both user and agent messages

---

## Troubleshooting

### "No voice" on calls

**Already fixed!** The issue was `conversation_config_override` breaking TTS.

**Verification:**
```bash
# Check the fix is applied
cat backend/services/elevenLabsService.js | grep -A 5 "Only modify script if one is explicitly provided"
```

Should show:
```javascript
// Only modify script if one is explicitly provided
if (personalizedScript) {
  // ... code ...
}
// If no personalizedScript is provided, don't override - let agent use its default config
```

### Agent not found

**Error**: "Agent not properly created in ElevenLabs"

**Solution**: Delete and recreate the agent in the UI

### Call not connecting

**Checklist:**
1. Check backend logs: `tail -f backend/server.log`
2. Verify API key: `echo $ELEVENLABS_API_KEY`
3. Check phone number format: `+14802555887`
4. Test API directly:
```bash
node test-voice-fix.js
```

---

## API Reference

### Test Call Endpoint

```bash
POST /api/agents/test-call
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "agentId": "673888fa50d2e4f0e1d7d9a1",
  "phoneNumber": "4802555887"
}
```

### Response

```json
{
  "success": true,
  "message": "Test call initiated successfully",
  "callId": "btcal_xxx"
}
```

### Get Call Status

```bash
GET /api/calls/{callId}
Authorization: Bearer {jwt_token}
```

---

## File Locations

### Key Files Modified
- **Fix Applied**: `/backend/services/elevenLabsService.js:149-155`

### Integration Points
- **Test Call Controller**: `/backend/controllers/agentController.js:1111-1215`
- **Agent Creation**: `/backend/controllers/agentController.js:79-206`
- **UI Dashboard**: `/frontend/src/components/AgentDashboard.jsx`

### Documentation
- **Technical Details**: `ELEVENLABS_VOICE_FIX_DOCUMENTATION.md`
- **Integration Guide**: `VOICE_CALL_INTEGRATION_GUIDE.md`
- **This Guide**: `QUICK_START_VOICE_CALLS.md`

---

## Summary

✅ **What's Working:**
- Agent creation with voice selection
- Test calls with voice output
- Conversation transcripts
- Webhook callbacks

✅ **What Was Fixed:**
- No voice on calls (conversation_config_override bug)
- TTS configuration preservation

🎯 **Next Steps:**
1. Test a call from the UI
2. Verify agent speaks with voice
3. Create more agents as needed

---

**Last Updated**: 2025-11-16
**Status**: Production Ready
**Tested With**: Sarah (female voice), George (male voice)
