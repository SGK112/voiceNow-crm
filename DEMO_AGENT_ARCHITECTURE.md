# Demo Agent Architecture

## System Overview

The demo agent uses **ElevenLabs Conversational AI** for voice interactions, NOT an internal VoiceNow CRM system. Here's how it works:

### Architecture Flow:

```
Customer texts "DEMO" or "call me"
         ↓
Twilio SMS webhook → VoiceNow CRM backend
         ↓
Backend initiates call via ElevenLabs API
         ↓
ElevenLabs Conversational AI calls customer
         ↓
Call ends → Webhook → VoiceNow CRM backend
         ↓
Email notification sent to help.remodely@gmail.com
```

## Components:

### 1. **ElevenLabs Conversational AI** (Voice Layer)
- **Agent ID**: `process.env.ELEVENLABS_DEMO_AGENT_ID`
- **Handles**: Voice synthesis, speech recognition, conversational flow
- **Configuration**: Prompt is managed in `backend/config/demoAgentTemplate.js`
- **Voice**: Ultra-realistic AI voice powered by ElevenLabs
- **Features**:
  - Natural conversation
  - Real-time responses
  - Interrupt handling
  - Realistic pauses and intonation

### 2. **VoiceNow CRM Backend** (Orchestration Layer)
- **Handles**:
  - SMS reception via Twilio
  - Call initiation via ElevenLabs API
  - Webhook processing
  - Post-call notifications
  - Lead tracking in CRM
- **Files**:
  - `backend/routes/sms-to-call.js` - SMS handler
  - `backend/services/elevenLabsService.js` - ElevenLabs API wrapper
  - `backend/services/callMonitorService.js` - Call tracking
  - `backend/routes/agentWebhooks.js` - Post-call notifications

### 3. **Twilio** (Communication Layer)
- **Handles**:
  - SMS reception
  - Phone number provisioning
  - (ElevenLabs handles actual voice calling, not Twilio Voice)

## What Customers Experience:

1. **Text "DEMO" or "call me"** to your Twilio number
2. **Receive confirmation SMS** from VoiceNow CRM
3. **Get called by ElevenLabs agent** within 2 seconds
4. **Have natural conversation** with ultra-realistic AI voice
5. **Receive follow-up email** at help.remodely@gmail.com with call summary

## What VoiceNow CRM Does:

### During the call:
- **NOTHING!** ElevenLabs handles everything (voice, conversation, AI logic)
- VoiceNow CRM just initiated the call

### After the call:
- ElevenLabs sends webhook to VoiceNow CRM
- VoiceNow CRM processes the webhook
- Sends email notification with:
  - Customer info
  - Call transcript
  - Whether they're interested
  - Recommended follow-up actions

## Key Difference:

**VoiceNow CRM is NOT the voice engine!**
- VoiceNow CRM = Orchestration platform (initiates calls, tracks data, sends notifications)
- ElevenLabs = Voice engine (handles actual conversations, AI logic, speech)

This is similar to:
- VoiceNow CRM = The "control tower"
- ElevenLabs = The "pilot" flying the plane

## Pronunciation:

The agent is configured to say:
- **"Remodelee"** (REM-oh-dee-lee) NOT "Remodely"
- **"Remodelee dot A I"** (spell out A-I)
- **"Remodelee dot A I forward slash signup"**

## Visual Agent Builder

The Visual Agent Builder in VoiceNow CRM is for:
- **Building workflows** (not voice agents)
- **Creating automation** (SMS, email, CRM workflows)
- **Testing nodes** before deployment
- **Managing leads** in the CRM

It does NOT build the actual voice agents - those are built using ElevenLabs conversational AI platform.

## Future Architecture (What You Could Build):

If you wanted to use VoiceNow CRM's own voice engine:
1. Build a custom conversational AI service
2. Integrate with Twilio Voice API
3. Use the Visual Agent Builder to define conversation flows
4. Use ElevenLabs just for voice synthesis (TTS), not full conversational AI

But currently, **ElevenLabs handles the entire conversation**, not VoiceNow CRM.
