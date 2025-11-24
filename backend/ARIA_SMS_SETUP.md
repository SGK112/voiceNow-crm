# Aria SMS Integration Setup Guide

## Overview

Aria can now intelligently respond to SMS messages using her full AI capabilities, including:
- Natural language understanding with GPT-4o-mini
- Function calling for CRM operations, web search, email, and more
- Conversation memory across SMS threads
- Context-aware responses based on lead information

## Architecture

```
Incoming SMS → Twilio → /api/webhooks/twilio/sms → agentSMSService → ariaSMSService → GPT-4o-mini → Response
```

### Key Files

1. **`/backend/services/ariaSMSService.js`** (NEW)
   - Core AI processing for SMS
   - GPT-4o-mini integration with function calling
   - Conversation history management
   - SMS response generation

2. **`/backend/services/agentSMSService.js`** (MODIFIED)
   - Twilio webhook handler
   - Routes messages to Aria AI processing
   - Handles STOP/START compliance
   - SMS database logging

3. **`/backend/routes/webhooks.js`**
   - Webhook endpoint: `POST /api/webhooks/twilio/sms`

## Setup Instructions

### Step 1: Verify Environment Variables

Ensure your `.env` file has:

```bash
# Twilio credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI for Aria
OPENAI_API_KEY=your_openai_key
```

### Step 2: Configure Twilio Webhook

1. Log into [Twilio Console](https://console.twilio.com)
2. Navigate to: Phone Numbers → Manage → Active Numbers
3. Click your Twilio phone number
4. Scroll to "Messaging Configuration"
5. Set "A MESSAGE COMES IN" webhook:
   ```
   POST https://your-backend-domain.com/api/webhooks/twilio/sms
   ```
   **Important**: Your backend must be publicly accessible. Options:
   - Production: Use your live domain
   - Development: Use ngrok or similar tunneling service

### Step 3: Test the Integration

Send a text message to your Twilio number:

```
You: "What are my recent leads?"
Aria: "Let me check your recent leads for you..."
```

Aria will:
- Understand your question
- Use CRM capabilities to fetch leads
- Respond with relevant information
- Remember the conversation for follow-up questions

## How It Works

### 1. Message Reception

When someone texts your Twilio number:
```javascript
// Twilio webhook sends:
{
  From: "+1234567890",
  To: "+1987654321",
  Body: "What are my recent leads?",
  MessageSid: "SM..."
}
```

### 2. Lead Lookup

The system automatically:
- Searches for the sender in your CRM
- Retrieves their contact information
- Loads SMS conversation history (last 10 messages)

### 3. AI Processing

Aria receives:
- The current message
- Conversation history
- Lead context (name, status, notes, etc.)
- Access to all capabilities (CRM, web search, email, SMS, memory)

### 4. Intelligent Response

Aria can:
- Answer questions about CRM data
- Search the web for information
- Send follow-up emails or SMS
- Remember information for later
- Perform multi-step tasks

### Example Conversations

**Appointment Confirmation:**
```
Customer: "Can I reschedule my appointment?"
Aria: "Of course! When works better for you? Reply with your preferred date and time."

Customer: "How about Thursday at 3pm?"
Aria: "Perfect! I've noted Thursday at 3pm. A team member will call to confirm shortly."
```

**Product Inquiry:**
```
Customer: "What's the price for your premium plan?"
Aria: "Our premium plan is $99/month. Would you like me to send you detailed pricing info via email?"

Customer: "Yes please"
Aria: "Great! I've sent the pricing details to your email. Check your inbox!"
[Aria uses send_email capability automatically]
```

**CRM Query:**
```
You: "How many new leads this week?"
Aria: "You have 12 new leads this week. 5 are qualified and 2 have appointments scheduled."
[Aria uses get_recent_leads capability]
```

## SMS Compliance Features

### Automatic Handling

Aria automatically handles required compliance keywords:

- **STOP / UNSUBSCRIBE**: Opts user out, updates database
- **START / SUBSCRIBE**: Opts user back in

These are handled immediately before AI processing to ensure compliance.

### SMS Opt-Out Checking

Aria will NOT respond to users who have opted out (`lead.smsOptOut = true`).

## Advanced Features

### Conversation Memory

Aria maintains context across SMS threads:
```
User: "What's my account status?"
Aria: "Your account is active with premium features."

User: "When does it renew?"
Aria: "Your premium plan renews on March 15th, 2025."
[Aria remembers "it" refers to the premium plan]
```

### Function Calling Examples

Aria can automatically use capabilities without explicit prompting:

**Web Search:**
```
User: "What's the weather in New York?"
Aria: [uses web_search capability] "It's currently 72°F and sunny in New York!"
```

**Send Email:**
```
User: "Email me that information"
Aria: [uses send_email capability] "Sent! Check your inbox."
```

**CRM Operations:**
```
User: "What calls did I have today?"
Aria: [uses get_calls_summary capability] "You had 3 calls today: 2 qualified leads, 1 follow-up."
```

## Message Length Handling

- SMS limit: 160 characters (single message)
- Aria's limit: 320 characters (allows 2-part messages)
- Longer responses are truncated with "..."
- For complex info, Aria offers to email instead

## Monitoring & Debugging

### Check Server Logs

Watch for these log messages:
```bash
📨 Received SMS from +1234567890: "message text"
🤖 Routing to Aria for AI processing...
🤖 Aria processing SMS from +1234567890: "message text"
✅ Aria response: "response text"
```

### View SMS History in Database

All SMS messages are logged in the `AgentSMS` collection:
```javascript
{
  direction: 'inbound' | 'outbound',
  from: phone_number,
  to: phone_number,
  message: text,
  status: 'received' | 'sent' | 'delivered',
  twilioSid: 'SM...',
  metadata: {
    type: 'aria_ai_response',
    modelUsed: 'gpt-4o-mini',
    tokensUsed: 150
  }
}
```

### Common Issues

**1. No response from Aria**
- Check server logs for errors
- Verify Twilio webhook is configured correctly
- Ensure OpenAI API key is valid
- Check that backend is publicly accessible

**2. Generic fallback responses**
- Indicates Aria AI processing failed
- Check OpenAI API quota/limits
- Review server logs for error details

**3. Responses take too long**
- GPT-4o-mini should respond in 1-3 seconds
- Check network connectivity
- Verify OpenAI API status

## Cost Considerations

### OpenAI Costs

- Model: GPT-4o-mini (very cost-effective)
- Average cost per SMS: ~$0.001-0.003
- Max tokens per response: 150
- Conversation history: Last 10 messages

### Twilio Costs

- Inbound SMS: $0.0075 per message
- Outbound SMS: $0.0075 per message
- Total per exchange: ~$0.015 + OpenAI costs

## Security & Privacy

### Message Privacy

- All SMS stored in your MongoDB database
- Twilio webhooks should use HTTPS only
- Consider encrypting sensitive lead data

### Rate Limiting

The webhook endpoint uses rate limiting:
```javascript
webhookLimiter // Configured in /middleware/rateLimiter.js
```

## Customization

### Adjust Aria's Personality

Edit `/backend/services/ariaSMSService.js` line 59-80:

```javascript
PERSONALITY:
- Professional, friendly, and helpful
- Concise responses (SMS format)
- Use natural, conversational language
- Proactive and solution-oriented
```

### Change Response Length

Edit line 111 in `ariaSMSService.js`:

```javascript
max_tokens: 150, // Increase for longer responses (costs more)
```

### Modify Capabilities

Aria has access to all capabilities in `/backend/utils/ariaCapabilities.js`:
- `web_search`
- `send_email`
- `send_sms`
- `get_recent_leads`
- `get_recent_messages`
- `get_calls_summary`
- `search_contacts`
- `remember_info`
- `recall_info`

## Testing Checklist

- [ ] Environment variables configured
- [ ] Twilio webhook points to correct URL
- [ ] Backend is publicly accessible
- [ ] Test basic SMS: "Hello Aria"
- [ ] Test capability: "How many leads do I have?"
- [ ] Test conversation memory: Ask follow-up question
- [ ] Test STOP/START compliance
- [ ] Check SMS logs in database
- [ ] Monitor server logs for errors

## Support

For issues or questions:
1. Check server logs for error messages
2. Review Twilio webhook logs in console
3. Verify all environment variables are set
4. Test with simple messages first

## Next Steps

Consider adding:
1. **Push notifications** to your mobile app when Aria responds
2. **Admin dashboard** to view/manage SMS conversations
3. **Custom capabilities** specific to your business
4. **Scheduled messages** for appointment reminders
5. **Multi-language support** for international customers
