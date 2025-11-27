# 🚀 Multi-Channel AI Agents - Implementation Guide

## Overview

VoiceNow CRM now supports **multi-channel AI agents** that can:
- 📞 Make and receive phone calls
- 📱 Send SMS messages **during** phone conversations
- 📧 Send emails **during** phone conversations
- 🔚 Properly end calls when done

This is achieved using ElevenLabs Conversational AI with **Client Tools** pattern.

## How It Works

### Architecture

```
┌─────────────────┐
│  ElevenLabs     │ ──(1. Makes call)──> 📱 Customer Phone
│  Agent          │
└────────┬────────┘
         │
         │ (2. Agent decides to use tool)
         │
         ▼
┌─────────────────┐
│  Your Webhook   │ ──(3. Execute action)──> 📱 Send SMS
│  Endpoint       │                         📧 Send Email
└────────┬────────┘
         │
         │ (4. Return result)
         │
         ▼
┌─────────────────┐
│  ElevenLabs     │ ──(5. Continue conversation)──> 📱 Customer
│  Agent          │     "I just sent you a text!"
└─────────────────┘
```

### Flow

1. **Agent makes phone call** to customer
2. **During conversation**, agent decides to use a tool (e.g., "send_sms")
3. **ElevenLabs calls your webhook** with tool invocation request
4. **Your backend executes** the tool (actually sends SMS via Twilio)
5. **Your backend returns result** to ElevenLabs
6. **Agent continues conversation** knowing the result ("I sent you a text with the details")

## Quick Start

### 1. Prerequisites

```bash
# Required environment variables in .env
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_app_password
WEBHOOK_URL=https://your-app.com
```

### 2. Start Backend

```bash
npm run server
```

The webhook endpoint is automatically available at:
```
POST /api/elevenlabs-webhook/tool-invocation
```

### 3. Run Test Call

```bash
node call-josh-with-sms-email.js
```

This will:
- Create an agent with SMS/email tools
- Make a phone call
- Agent sends SMS during the call
- Agent sends email during the call
- Agent hangs up properly

## Creating Agents with Tools

### Basic Example

```javascript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

const agent = await client.conversationalAi.agents.create({
  conversationConfig: {
    agent: {
      prompt: {
        prompt: `You are a helpful assistant. You can send SMS and emails during calls.

When the customer asks for information, send them a text with the details.`,
        llm: 'gemini-2.5-flash'
      },
      firstMessage: "Hi! How can I help you today?",
      language: 'en',
      clientTools: [
        {
          name: 'send_sms',
          description: 'Send an SMS to the customer',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Phone number (E.164 format)' },
              message: { type: 'string', description: 'Message content' }
            },
            required: ['to', 'message']
          }
        },
        {
          name: 'send_email',
          description: 'Send an email to the customer',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email content' }
            },
            required: ['to', 'subject', 'body']
          }
        },
        {
          name: 'end_call',
          description: 'End the call',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      ],
      clientToolsWebhook: {
        url: process.env.WEBHOOK_URL + '/api/elevenlabs-webhook/tool-invocation',
        method: 'POST'
      }
    },
    tts: {
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      model: 'eleven_flash_v2_5'
    },
    asr: {
      quality: 'high',
      provider: 'elevenlabs'
    }
  }
});
```

### Make Call

```javascript
const call = await client.conversationalAi.batchCalls.create({
  callName: 'Test Call',
  agentId: agent.agentId,
  agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
  recipients: [{ phoneNumber: '+14802555887' }]
});
```

## Agent Templates

### 1. Reception Agent

**Use Case**: Answer incoming calls, qualify leads, send appointment confirmations

```javascript
prompt: `You are a professional receptionist for [Business Name].

GREETING:
"Hello! Thank you for calling [Business]. My name is Sarah. How can I help you today?"

DURING CALL:
- Ask for customer name and phone number
- Ask what service they're interested in
- If they want an appointment:
  1. Find available times
  2. USE send_sms TOOL to send appointment confirmation
  3. USE send_email TOOL to send calendar invite

ENDING:
"I've sent you a text and email with the appointment details. See you then!"
USE end_call TOOL`
```

### 2. Consultation Agent

**Use Case**: Provide consultations, send quotes, schedule follow-ups

```javascript
prompt: `You are a consultation specialist for [Business].

CONSULTATION:
- Understand customer needs
- Provide expert advice
- When discussing pricing:
  USE send_email TOOL to send detailed quote

FOLLOW-UP:
- Schedule next call if needed
- USE send_sms TOOL to send reminder
- USE end_call TOOL when done`
```

### 3. Interview Agent

**Use Case**: Screen candidates, send interview confirmations

```javascript
prompt: `You are an HR interview agent for [Company].

INTERVIEW:
- Ask screening questions
- Evaluate responses
- If candidate is qualified:
  USE send_email TOOL to send next steps
  USE send_sms TOOL to confirm interview time

USE end_call TOOL when done`
```

### 4. Training Agent

**Use Case**: Onboard employees, send training materials

```javascript
prompt: `You are a training coordinator.

TRAINING:
- Explain onboarding process
- Answer questions
- USE send_email TOOL to send training materials
- USE send_sms TOOL to send important dates

USE end_call TOOL when training intro is complete`
```

## Webhook Handler

The webhook handler in `/backend/routes/elevenLabsWebhook.js` processes tool invocations:

```javascript
router.post('/tool-invocation', async (req, res) => {
  const { tool_name, tool_parameters, call_id, agent_id } = req.body;

  let result = {};

  switch (tool_name) {
    case 'send_sms':
      result = await handleSendSMS(tool_parameters, agent_id, call_id);
      break;
    case 'send_email':
      result = await handleSendEmail(tool_parameters, agent_id, call_id);
      break;
    case 'end_call':
      result = { success: true, message: 'Call ending' };
      break;
  }

  res.json({ tool_name, result, success: result.success !== false });
});
```

## Testing

### Test Script

The `call-josh-with-sms-email.js` script demonstrates the full flow:

1. Creates agent with tools
2. Makes call to test number
3. Agent sends SMS during call
4. Agent sends email during call
5. Agent hangs up

### Expected Behavior

When you run the test:

1. Phone rings
2. Agent greets you
3. **You receive SMS** while still on the call
4. **You receive email** while still on the call
5. Call ends automatically

### Monitoring

Check server logs for:
```
📞 Tool Invocation Received:
   Tool: send_sms
   Parameters: { to: '+14802555887', message: '...' }
   Call ID: ...
   Agent ID: ...
   Result: { success: true, ... }
```

## Production Deployment

### 1. Deploy Backend

Deploy to Render, Heroku, or any platform:

```bash
# Build
npm run build

# Deploy
# Your platform will set environment variables
```

### 2. Set Webhook URL

Update `.env` with your production URL:

```
WEBHOOK_URL=https://your-production-app.com
```

### 3. Test End-to-End

1. Create agent with tools
2. Make test call
3. Verify SMS/email are sent
4. Check logs for errors

## Troubleshooting

### Webhook Not Called

- Check `clientToolsWebhook.url` is correct
- Ensure URL is publicly accessible (use ngrok for local testing)
- Check ElevenLabs dashboard for webhook errors

### SMS Not Sending

- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Check Twilio console for delivery errors
- Ensure phone number is in E.164 format (+1234567890)

### Email Not Sending

- Verify `SMTP_USER` and `SMTP_PASSWORD`
- For Gmail, use App Password (not account password)
- Check spam folder

### Agent Not Using Tools

- Make prompt very explicit about when to use tools
- Use imperative language: "USE send_sms TOOL"
- Give examples in the prompt

## Best Practices

### 1. Prompt Engineering

✅ **Good**: "USE send_sms TOOL to send the appointment confirmation"
❌ **Bad**: "You can send a text if needed"

### 2. Tool Descriptions

Make tool descriptions clear and action-oriented:

```javascript
{
  name: 'send_appointment_confirmation',
  description: 'Send SMS with appointment date, time, and location. Use this after scheduling an appointment.',
  // ...
}
```

### 3. Error Handling

Always return success/failure in webhook:

```javascript
return {
  success: false,
  error: 'Customer phone number not provided'
};
```

### 4. Keep Calls Brief

- Set max duration: 60-120 seconds for most use cases
- Always include `end_call` tool
- Instruct agent to end call after completing task

## Advanced Features

### Custom Tools

You can create any tool for agents:

- `schedule_appointment` - Check calendar and book time
- `check_inventory` - Query database for product availability
- `create_ticket` - Open support ticket in CRM
- `transfer_call` - Transfer to human agent
- `send_invoice` - Generate and email invoice

### Multi-Step Workflows

Agents can use multiple tools in sequence:

```
1. check_availability
2. schedule_appointment
3. send_sms (confirmation)
4. send_email (calendar invite)
5. end_call
```

### Context Passing

Pass call context to tools via metadata:

```javascript
metadata: {
  callId,
  customerId,
  leadSource,
  previousInteractions
}
```

## Next Steps

1. ✅ Test the demo call (`node call-josh-with-sms-email.js`)
2. Create your first production agent
3. Define custom tools for your business
4. Build agent templates library
5. Monitor and optimize agent performance

## Support

- ElevenLabs Docs: https://elevenlabs.io/docs
- Twilio SMS Docs: https://www.twilio.com/docs/sms
- VoiceNow CRM: Internal documentation

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
**Status**: Production Ready ✅
