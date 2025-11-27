# ElevenLabs Agent Webhook Configuration

This guide explains how to configure your ElevenLabs agent to send SMS/MMS messages during voice calls.

## Overview

The SMS/MMS webhooks are already implemented and running at:
- **Send SMS**: `POST /api/sms-to-call/send-sms-from-agent`
- **Send MMS**: `POST /api/sms-to-call/send-mms-from-agent`

You need to configure your ElevenLabs agent to call these endpoints during conversations.

## Step 1: Access ElevenLabs Agent Configuration

1. Go to [ElevenLabs Conversational AI Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Select your agent: **Remodely.ai Marketing Assistant**
   - Agent ID: `agent_9701k9xptd0kfr383djx5zk7300x`
3. Click on **Configure** or **Edit Agent**

## Step 2: Add Custom Tools/Functions

ElevenLabs agents support custom functions that can be called during conversations. Add these two functions:

### Function 1: Send SMS

```json
{
  "name": "send_sms",
  "description": "Send an SMS text message to the customer during the call. Use this to share links, confirmations, or information they requested.",
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The SMS message content to send to the customer"
      }
    },
    "required": ["message"]
  },
  "webhook": {
    "url": "https://your-domain.com/api/sms-to-call/send-sms-from-agent",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

### Function 2: Send MMS (with image)

```json
{
  "name": "send_mms",
  "description": "Send an MMS message with an image or media file to the customer. Use this to share photos, brochures, or visual content.",
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The message text to accompany the image"
      },
      "mediaUrl": {
        "type": "string",
        "description": "The URL of the image or media file to send"
      }
    },
    "required": ["message", "mediaUrl"]
  },
  "webhook": {
    "url": "https://your-domain.com/api/sms-to-call/send-mms-from-agent",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

## Step 3: Update Agent Prompt

Update your agent's system prompt to include instructions for when to use these functions:

```
You are a helpful AI assistant for Remodely.ai. During phone conversations, you can send text messages to customers.

**Available Tools:**
1. send_sms(message) - Send a text message to the customer
2. send_mms(message, mediaUrl) - Send a text with an image/file

**When to Send SMS:**
- Customer asks for a link → Send signup/pricing link
- Customer wants information saved → Send confirmation or details
- Customer requests specific info → Send the information via text
- You promise to send something → Use send_sms immediately

**Examples:**

Customer: "Can you send me the pricing info?"
You: "Absolutely! Let me text you our pricing page right now."
[Call send_sms with message: "Here's our pricing: https://remodely.ai/pricing - 14-day free trial, then $299/month. Questions? Reply here!"]

Customer: "I'd like to see some examples of your work"
You: "I'd love to show you! Let me send you a photo of our dashboard."
[Call send_mms with message: "Here's our VoiceNow CRM dashboard!" and mediaUrl: "https://remodely.ai/images/dashboard-screenshot.png"]

**Important:**
- Always announce you're sending a text before calling the function
- Confirm the text was sent after the function returns
- Keep the conversation flowing naturally

Remember: The customer you're talking to will receive the SMS at their current phone number automatically.
```

## Step 4: Set Up Webhook URL (Production)

Replace `https://your-domain.com` with your actual production URL:

### For Render.com deployment:
```
https://voiceflow-crm.onrender.com/api/sms-to-call/send-sms-from-agent
https://voiceflow-crm.onrender.com/api/sms-to-call/send-mms-from-agent
```

### For local testing with ngrok:
```bash
# Start ngrok
ngrok http 5001

# Use ngrok URL
https://abc123.ngrok.io/api/sms-to-call/send-sms-from-agent
https://abc123.ngrok.io/api/sms-to-call/send-mms-from-agent
```

## Step 5: Test the Integration

### Manual Test via curl:

```bash
# Test SMS webhook
curl -X POST https://your-domain.com/api/sms-to-call/send-sms-from-agent \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+14802555887",
    "message": "Test SMS from agent",
    "callSid": "test",
    "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
  }'

# Test MMS webhook
curl -X POST https://your-domain.com/api/sms-to-call/send-mms-from-agent \
  -H "Content-Type": application/json" \
  -d '{
    "to": "+14802555887",
    "message": "Check out this image!",
    "mediaUrl": "https://demo.twilio.com/owl.png",
    "callSid": "test",
    "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
  }'
```

### Live Test with Agent:

1. Text "DEMO" to your Twilio number: **+16028337194**
2. Answer the call from the AI agent
3. During the conversation, ask: "Can you send me a link?"
4. The agent should:
   - Say "I'll text you that right now!"
   - Call the `send_sms` function
   - You receive an SMS immediately
   - Agent confirms "Just sent it to you!"

## Webhook Request/Response Format

### Send SMS Request
```json
{
  "to": "+14802555887",
  "message": "Here's the link: https://remodely.ai/pricing",
  "callSid": "CA123abc...",
  "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
}
```

### Send SMS Response
```json
{
  "success": true,
  "messageSid": "SM456def...",
  "status": "queued"
}
```

### Send MMS Request
```json
{
  "to": "+14802555887",
  "message": "Here's the dashboard screenshot!",
  "mediaUrl": "https://remodely.ai/images/dashboard.png",
  "callSid": "CA123abc...",
  "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
}
```

### Send MMS Response
```json
{
  "success": true,
  "messageSid": "MM789ghi...",
  "status": "queued",
  "mediaCount": 1
}
```

## Webhook Payload Structure

When the agent calls your webhook, ElevenLabs will automatically include:
- `to`: The customer's phone number (from the active call)
- `callSid`: The Twilio call SID (if available)
- `agentId`: The ElevenLabs agent ID
- Additional parameters from the function call

The backend extracts the customer's phone number from the current conversation context.

## Troubleshooting

### Agent doesn't send SMS
- **Check agent prompt**: Ensure instructions for using send_sms are clear
- **Verify webhook URL**: Test endpoint with curl
- **Check ElevenLabs logs**: Look for function call attempts in agent analytics
- **Verify phone number**: Ensure customer phone is correctly captured

### SMS not received
- **Check Twilio balance**: Ensure sufficient funds
- **Verify phone number format**: Must include country code (+1...)
- **Check backend logs**: Look for Twilio errors
- **Test manually**: Use curl to test webhook directly

### Webhook timeout
- **Check endpoint response time**: Should respond in < 5 seconds
- **Verify public accessibility**: URL must be publicly accessible
- **Check firewall/security**: Ensure ElevenLabs IPs not blocked

## Monitoring

All SMS/MMS requests are logged to the backend console:

```
📤 Agent SMS request: { to: '+14802555887', agentId: '...', callSid: '...' }
✅ SMS sent from agent: SM456def...
```

You can also monitor in:
- **Admin Dashboard**: Settings > Admin > Monitoring
- **Twilio Console**: Monitor > Logs > Messaging
- **ElevenLabs Dashboard**: Agent > Analytics > Function Calls

## Security Considerations

1. **Webhook Authentication**: Consider adding HMAC signature validation
2. **Rate Limiting**: Implemented via API rate limiter
3. **Phone Number Validation**: Verified before sending
4. **HTTPS Required**: All webhooks must use HTTPS in production
5. **API Key Security**: Never expose ElevenLabs or Twilio keys

## Next Steps

1. ✅ Configure agent tools in ElevenLabs dashboard
2. ✅ Update agent prompt with SMS instructions
3. ✅ Update webhook URLs with production domain
4. ✅ Test with live call
5. ✅ Monitor logs for successful SMS delivery

## Support Resources

- **ElevenLabs Tools/Functions**: https://elevenlabs.io/docs/conversational-ai/tools
- **Twilio SMS API**: https://www.twilio.com/docs/sms
- **Application Logs**: Check Admin > Monitoring in dashboard
- **Support**: help.remodely@gmail.com

## Example Use Cases

### 1. Send Pricing Link
Customer: "How much does this cost?"
Agent: "Great question! Let me text you our pricing page right now."
→ Calls `send_sms("Remodely.ai Pricing: https://remodely.ai/pricing")`

### 2. Share Project Photo
Customer: "Can I see examples of your work?"
Agent: "Absolutely! I'll text you a screenshot of our dashboard."
→ Calls `send_mms("Our VoiceNow CRM dashboard!", "https://remodely.ai/images/dashboard.png")`

### 3. Booking Confirmation
Customer: "I'd like to schedule a demo"
Agent: "Perfect! I'm texting you the booking link now."
→ Calls `send_sms("Book your demo: https://remodely.ai/book")`

### 4. Follow-up Information
Customer: "Can you send me that after we hang up?"
Agent: "I'll text it to you right now so you have it!"
→ Calls `send_sms("Here's the information we discussed...")`
