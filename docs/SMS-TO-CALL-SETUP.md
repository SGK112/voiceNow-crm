# SMS-to-Call Integration Setup Guide

This guide explains how to set up bidirectional SMS/voice integration using Twilio and ElevenLabs.

## Features

1. **SMS-to-Call**: Users text "DEMO" to trigger an AI voice call
2. **Call-to-SMS**: Voice agents can send SMS/MMS messages during calls
3. **Short Code Support**: Ready for short code (88337) integration

## Architecture

```
┌─────────────┐      SMS "DEMO"       ┌──────────────┐
│   Customer  │ ───────────────────> │    Twilio    │
│             │                       │              │
└─────────────┘                       └──────┬───────┘
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │  Your Server API    │
                                  │ /api/sms-to-call/   │
                                  │  trigger-demo-call  │
                                  └─────────┬───────────┘
                                            │
                    ┌──────────────────────┼─────────────────┐
                    ▼                      ▼                 ▼
            Send Confirmation      Wait 2 seconds    Initiate Call
                  SMS                                       │
                    │                                       ▼
                    │                              ┌─────────────────┐
                    │                              │  ElevenLabs AI  │
                    │                              │  Voice Agent    │
                    │                              └────────┬────────┘
                    │                                       │
                    │                                       │
                    │       During call, agent can:         │
                    │       - Send SMS via webhook          │
                    │       - Send MMS with media           │
                    └───────────────────────────────────────┘
```

## Environment Variables

Add to your `.env` file (already configured):

```bash
# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ElevenLabs Demo Agent
ELEVENLABS_DEMO_AGENT_ID=your_elevenlabs_agent_id

# Your server base URL
BASE_URL=http://localhost:5001  # Change to your public URL in production
```

## Available Endpoints

### 1. Trigger Demo Call (SMS Webhook)
**Endpoint**: `POST /api/sms-to-call/trigger-demo-call`

Receives SMS messages from Twilio and triggers demo calls.

**Twilio Webhook Body**:
```
From: +1234567890
Body: "DEMO"
```

**Behavior**:
- If message is exactly "DEMO" (case insensitive): Sends confirmation SMS, then initiates call after 2 seconds
- If message contains "demo" or "call me": Sends instructions
- Otherwise: Sends welcome message

### 2. Call Status Callback
**Endpoint**: `POST /api/sms-to-call/call-status`

Receives call status updates from Twilio.

**Events**: initiated, ringing, answered, completed

### 3. Send SMS from Agent
**Endpoint**: `POST /api/sms-to-call/send-sms-from-agent`

Allows ElevenLabs voice agent to send SMS during calls.

**Request Body**:
```json
{
  "to": "+1234567890",
  "message": "Here's the link we discussed: https://remodely.ai/pricing",
  "callSid": "CA123...",
  "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
}
```

**Response**:
```json
{
  "success": true,
  "messageSid": "SM123...",
  "status": "queued"
}
```

### 4. Send MMS from Agent
**Endpoint**: `POST /api/sms-to-call/send-mms-from-agent`

Allows ElevenLabs voice agent to send MMS with media during calls.

**Request Body**:
```json
{
  "to": "+1234567890",
  "message": "Here's the project photo we discussed",
  "mediaUrl": "https://example.com/image.jpg",
  "callSid": "CA123...",
  "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
}
```

## Setup Instructions

### Step 1: Configure Twilio SMS Webhook

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** > **Manage** > **Active Numbers**
3. Click on your phone number: `+16028337194`
4. Scroll to **Messaging Configuration**
5. Under "A MESSAGE COMES IN", set:
   - **Webhook**: `https://your-domain.com/api/sms-to-call/trigger-demo-call`
   - **HTTP Method**: POST
   - **Content Type**: application/x-www-form-urlencoded
6. Click **Save**

**For local development** (using ngrok):
```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 5001

# Use the ngrok URL in Twilio
https://<your-ngrok-id>.ngrok.io/api/sms-to-call/trigger-demo-call
```

### Step 2: Configure ElevenLabs Agent for SMS Sending

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Select your demo agent: **Remodely.ai Marketing Assistant**
3. Navigate to **Agent Configuration**
4. Add a **Custom Webhook/Tool**:

**Option A: Using Agent Tools (if available)**
```json
{
  "name": "send_sms",
  "description": "Send an SMS message to the customer during the call",
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The SMS message to send"
      }
    },
    "required": ["message"]
  },
  "webhook": {
    "url": "https://your-domain.com/api/sms-to-call/send-sms-from-agent",
    "method": "POST"
  }
}
```

**Option B: Using Conversation Variables**
In your agent's system prompt, add:
```
You are a helpful AI assistant for Remodely.ai. During the conversation,
you can send SMS messages to the customer by requesting a webhook call.

To send an SMS, use the format:
SEND_SMS: [your message here]

For example:
SEND_SMS: Here's the link we discussed: https://remodely.ai/pricing
```

Then configure a webhook trigger in ElevenLabs to detect "SEND_SMS:" patterns.

### Step 3: Test the Integration

#### Test SMS-to-Call:
```bash
# From your phone, send SMS to +16028337194
"DEMO"

# Expected flow:
# 1. You receive confirmation SMS: "🎙️ Great! Our AI demo agent will call you..."
# 2. After 2 seconds, you receive a voice call
# 3. Call connects to ElevenLabs AI agent
```

#### Test Call-to-SMS (using curl):
```bash
curl -X POST http://localhost:5001/api/sms-to-call/send-sms-from-agent \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test SMS from agent",
    "callSid": "test",
    "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
  }'
```

#### Test MMS (with image):
```bash
curl -X POST http://localhost:5001/api/sms-to-call/send-mms-from-agent \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Here is the project image",
    "mediaUrl": "https://demo.twilio.com/owl.png",
    "callSid": "test",
    "agentId": "agent_9701k9xptd0kfr383djx5zk7300x"
  }'
```

## Short Code Setup (88337)

To use a short code like 88337 instead of a regular phone number:

### 1. Apply for Short Code with Twilio

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** > **Manage** > **Short Codes**
3. Click **Buy a Short Code**
4. Select **Random Short Code** or **Vanity Short Code**
   - Random: Available immediately (~$1000/month)
   - Vanity (88337): Submit application (~2-12 weeks approval, ~$1000-1500/month)
5. Complete the application with:
   - Use case: "Customer demos and lead generation"
   - Sample messages: "DEMO" keyword
   - Opt-out method: Reply "STOP"

### 2. Configure Short Code
Once approved, configure the same webhook:
- **URL**: `https://your-domain.com/api/sms-to-call/trigger-demo-call`
- **Method**: POST

### 3. Update Marketing Materials
```
"Text DEMO to 88337 for an instant AI-powered demo call!"
```

## Monitoring and Logs

All SMS and call events are logged to the console:

```bash
📱 SMS received from +1234567890: "DEMO"
🎯 Demo request detected! Initiating call to +1234567890...
📞 Demo call initiated: CA123abc...
📞 Call status update: CA123abc... - answered
   From: +16028337194, To: +1234567890
📤 Agent SMS request: { to: '+1234567890', agentId: 'agent_9701k9xptd0kfr383djx5zk7300x' }
✅ SMS sent from agent: SM456def...
```

You can also view these logs in the Admin > Monitoring tab of the application.

## Production Deployment

### 1. Update Environment Variables
```bash
# Production BASE_URL (replace with your actual domain)
BASE_URL=https://your-production-domain.com

# Optional: Use different demo agent for production
ELEVENLABS_DEMO_AGENT_ID=agent_production_id
```

### 2. Update Twilio Webhooks
Replace all webhook URLs with production URLs:
- SMS Webhook: `https://your-production-domain.com/api/sms-to-call/trigger-demo-call`
- Call Status: `https://your-production-domain.com/api/sms-to-call/call-status`

### 3. Configure HTTPS
Ensure your production server has SSL/TLS configured. Twilio requires HTTPS webhooks.

### 4. Test Production Flow
1. Send test SMS to verify webhook connectivity
2. Monitor logs for any errors
3. Verify call initiation and agent connection
4. Test SMS sending during calls

## Troubleshooting

### SMS not triggering call
- **Check Twilio webhook configuration**: Verify URL is correct and accessible
- **Check logs**: Look for incoming SMS webhook calls
- **Verify phone number**: Ensure TWILIO_PHONE_NUMBER is correct in .env
- **Test webhook URL**: Use curl to test the endpoint directly

### Call not connecting
- **Verify ElevenLabs agent ID**: Check ELEVENLABS_DEMO_AGENT_ID is correct
- **Check Twilio account balance**: Ensure sufficient funds for outbound calls
- **Verify BASE_URL**: Must be publicly accessible for status callbacks
- **Check agent availability**: Ensure ElevenLabs agent is active

### Agent can't send SMS
- **Verify webhook configuration** in ElevenLabs dashboard
- **Check endpoint accessibility**: Test `/send-sms-from-agent` with curl
- **Verify phone number format**: Must include country code (+1...)
- **Check Twilio SMS capabilities**: Ensure your number supports SMS

### Testing webhooks locally
```bash
# Use ngrok for local testing
ngrok http 5001

# Update Twilio webhooks with ngrok URL
https://abc123.ngrok.io/api/sms-to-call/trigger-demo-call
```

## Security Considerations

1. **Webhook Authentication**: Consider adding Twilio signature validation
2. **Rate Limiting**: Implement rate limits to prevent abuse
3. **Phone Number Validation**: Validate phone numbers before sending SMS/calls
4. **Environment Variables**: Never commit .env file to version control
5. **HTTPS Only**: Always use HTTPS in production

## Cost Estimates

### Twilio Costs (as of 2024)
- **SMS (US)**: $0.0079 per message
- **Outbound calls (US)**: $0.013 per minute
- **Short Code (Random)**: ~$1000/month
- **Short Code (Vanity)**: ~$1000-1500/month

### ElevenLabs Costs
- **Growing Business Plan**: Included in subscription
- **Conversational AI**: Character-based billing
- **Phone calls**: Varies by plan and usage

## Next Steps

1. **Configure ElevenLabs agent webhook**: Add SMS sending capability to agent
2. **Test complete workflow**: SMS → Call → Agent sends SMS
3. **Apply for short code**: If using 88337 or similar
4. **Deploy to production**: Update webhooks and test live
5. **Monitor usage**: Track SMS/call volumes and costs

## Support

For issues or questions:
- **Twilio Support**: https://support.twilio.com
- **ElevenLabs Support**: https://elevenlabs.io/support
- **Application Support**: help.remodely@gmail.com

## References

- [Twilio SMS Webhooks](https://www.twilio.com/docs/messaging/guides/webhook-request)
- [Twilio Programmable Voice](https://www.twilio.com/docs/voice)
- [ElevenLabs Conversational AI](https://elevenlabs.io/docs/conversational-ai)
- [Twilio Short Codes](https://www.twilio.com/docs/messaging/services/short-codes)
