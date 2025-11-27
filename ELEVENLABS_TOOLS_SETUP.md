# 🔧 ElevenLabs Agent Tools - Setup Guide

## Important Discovery

After researching the ElevenLabs SDK and documentation, **tools (webhooks) must be configured through the ElevenLabs Dashboard**, not programmatically via the SDK during agent creation.

## Why Tools Failed

The `clientTools` property in our test script was **incorrect**. That property is for WebSocket-based conversations, not for batch calls. For phone calls, tools need to be set up through the ElevenLabs platform UI.

## Correct Setup Process

### Step 1: Configure Tools in ElevenLabs Dashboard

1. **Go to ElevenLabs Dashboard**
   https://elevenlabs.io/app/conversational-ai

2. **Navigate to Tools Section**
   - Click on "Tools" in the sidebar
   - Click "Create Tool"

3. **Create SMS Tool**
   ```
   Name: send_sms
   Description: Send an SMS message to the customer
   Type: Webhook (Server Tool)

   Webhook URL: https://your-app.com/api/elevenlabs-webhook/tool-invocation
   Method: POST

   Parameters:
   - to (string, required): Phone number in E.164 format
   - message (string, required): SMS message content
   ```

4. **Create Email Tool**
   ```
   Name: send_email
   Description: Send an email to the customer
   Type: Webhook (Server Tool)

   Webhook URL: https://your-app.com/api/elevenlabs-webhook/tool-invocation
   Method: POST

   Parameters:
   - to (string, required): Email address
   - subject (string, required): Email subject line
   - body (string, required): Email content
   ```

5. **Create End Call Tool**
   ```
   Name: end_call
   Description: End the phone call
   Type: Webhook (Server Tool)

   Webhook URL: https://your-app.com/api/elevenlabs-webhook/tool-invocation
   Method: POST

   Parameters: (none)
   ```

### Step 2: Create Agent with Tools

1. **In ElevenLabs Dashboard, Create New Agent**
   - Name: "Multi-Channel Demo Agent"
   - Configure voice, language, etc.

2. **Add Tools to Agent**
   - In agent configuration, go to "Tools" tab
   - Add the tools you created: `send_sms`, `send_email`, `end_call`

3. **Configure Agent Prompt**
   ```
   You are calling Josh to demonstrate multi-channel capabilities.

   CONVERSATION FLOW:

   1. Greet: "Hi Josh! Demo call from VoiceNow CRM."

   2. Send SMS: "Let me send you a text right now..."
      USE send_sms tool with:
      - to: "+14802555887"
      - message: "Hi Josh! Text from AI agent during call!"

   3. Confirm SMS: "Did you get the text?"

   4. Send Email: "Now sending you an email..."
      USE send_email tool with:
      - to: "josh@example.com"
      - subject: "VoiceNow CRM Demo"
      - body: "This email was sent during our call!"

   5. End: "Perfect! Goodbye!"
      USE end_call tool

   Be very explicit about using the tools - don't just talk about it, USE them!
   ```

4. **Save Agent and Note Agent ID**

### Step 3: Make Call Using Agent ID

Instead of creating an agent programmatically, use the agent you created in the dashboard:

```javascript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Use the agent ID from the dashboard
const AGENT_ID = 'agent_xxxxxxxxxxxxxxxxxxxxx'; // From dashboard

const call = await client.conversationalAi.batchCalls.create({
  callName: 'Demo Call with Tools',
  agentId: AGENT_ID, // Pre-configured agent with tools
  agentPhoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID,
  recipients: [{ phoneNumber: '+14802555887' }]
});
```

## Alternative: Programmatic Tool Configuration

If you need to configure tools programmatically (advanced), you can use the `workflow` property when creating agents. However, this requires understanding ElevenLabs workflow schema which is complex.

### Workflow-Based Tools (Advanced)

```javascript
const agent = await client.conversationalAi.agents.create({
  name: "Agent with Programmatic Tools",
  conversationConfig: {
    // ... conversation config
  },
  workflow: {
    nodes: {
      start: {
        type: "start",
        position: { x: 0, y: 0 },
        edgeOrder: ["tool_node"]
      },
      tool_node: {
        type: "tool",
        position: { x: 100, y: 0 },
        tools: [
          {
            toolId: "your_tool_id_from_dashboard"
          }
        ],
        edgeOrder: ["end"]
      },
      end: {
        type: "end",
        position: { x: 200, y: 0 }
      }
    },
    edges: {
      edge1: {
        sourceNodeId: "start",
        targetNodeId: "tool_node",
        type: "unconditional"
      },
      edge2: {
        sourceNodeId: "tool_node",
        targetNodeId: "end",
        type: "unconditional"
      }
    }
  }
});
```

**Note**: This approach still requires creating the tools in the dashboard first to get their `toolId`.

## Webhook Handler (Already Built)

Your webhook handler at `/backend/routes/elevenLabsWebhook.js` is already correct and ready to receive tool invocations from ElevenLabs.

When ElevenLabs calls your webhook, it will send:

```json
{
  "tool_name": "send_sms",
  "tool_parameters": {
    "to": "+14802555887",
    "message": "Hi Josh!"
  },
  "call_id": "call_123",
  "agent_id": "agent_456",
  "conversation_id": "conv_789"
}
```

Your webhook handles it, sends the SMS via Twilio, and returns:

```json
{
  "tool_name": "send_sms",
  "success": true,
  "result": {
    "success": true,
    "message": "SMS sent successfully",
    "smsId": "..."
  }
}
```

## Testing the Complete Flow

### Prerequisites

✅ Backend running with webhook endpoint
✅ ngrok tunnel exposing backend (for local testing)
✅ Tools created in ElevenLabs dashboard
✅ Agent created with tools attached
✅ Agent prompt instructs when to use tools

### Test Steps

1. **Start Backend**
   ```bash
   npm run server
   ```

2. **Ensure ngrok is Running**
   ```bash
   # Check ngrok status
   curl http://localhost:4040/api/tunnels
   ```

3. **Make Test Call**
   ```bash
   node call-with-dashboard-agent.js
   ```

4. **Answer Phone**
   - Listen to agent
   - Wait for SMS (should arrive during call)
   - Wait for email (should arrive during call)
   - Call should end automatically

5. **Check Logs**
   - Backend logs should show webhook calls
   - Should see "Tool: send_sms"
   - Should see "Tool: send_email"
   - Should see "Tool: end_call"

## Next Steps

1. **Create Tools in Dashboard**
   Follow Step 1 above

2. **Create Agent in Dashboard**
   Follow Step 2 above

3. **Update Test Script**
   Use agent ID from dashboard instead of creating agent programmatically

4. **Test End-to-End**
   Make call and verify tools work

## Troubleshooting

### Tools Not Being Invoked

- **Check agent prompt**: Must explicitly instruct agent to USE tools
- **Verify tools are attached**: In dashboard, agent should show tools in "Tools" tab
- **Check webhook URL**: Must be publicly accessible
- **Review ElevenLabs logs**: Dashboard shows tool invocation attempts

### Webhook Not Receiving Calls

- **Verify URL is correct**: In tool configuration
- **Check ngrok**: For local testing, ensure tunnel is active
- **Test webhook manually**: Use curl to verify it works
  ```bash
  curl -X POST https://your-url/api/elevenlabs-webhook/tool-invocation \
    -H "Content-Type: application/json" \
    -d '{"tool_name":"send_sms","tool_parameters":{"to":"+1234567890","message":"test"}}'
  ```

### SMS/Email Not Sending

- **Check Twilio credentials**: Verify in .env file
- **Check SMTP credentials**: Verify in .env file
- **Review webhook response**: Should return success: true
- **Check backend logs**: Should show actual sending attempt

## Summary

The key insight: **ElevenLabs tools are platform resources, not SDK resources**. You must:

1. Create tools in the dashboard
2. Attach tools to agents in the dashboard
3. Use the agent ID in your code
4. Your webhook handles the actual tool execution

This is the production-ready approach used by ElevenLabs.

---

**Status**: Ready to implement via dashboard
**Backend**: ✅ Ready
**Webhook**: ✅ Ready
**Next**: Configure tools in ElevenLabs dashboard
