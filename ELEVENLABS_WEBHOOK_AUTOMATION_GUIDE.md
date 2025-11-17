# ElevenLabs Webhook Automation - Complete Guide

## ✅ What You Already Have Built

You have a **complete automation system** that combines:
- **ElevenLabs Conversational AI** (Voice agents with intelligence)
- **Twilio** (SMS/MMS)
- **SendGrid** (Email)
- **n8n** (Workflow automation)
- **Your Backend** (Webhook orchestration)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  1. ElevenLabs Conversational AI Agent                      │
│     - Uses voice from Voice Library (39 voices)             │
│     - Has intelligent conversation with customer            │
│     - Can understand speech and respond naturally           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ During call (real-time action)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Agent Triggers Webhook Action                           │
│     POST https://your-domain/api/webhooks/elevenlabs/action │
│     {                                                        │
│       "phone_number": "+14802555887",                       │
│       "customer_name": "John",                              │
│       "conversation_id": "conv_123"                         │
│     }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Your Backend Processes Action                           │
│     File: elevenLabsWebhookController.js                    │
│                                                              │
│     sendSignupLinkAction() {                                │
│       - Sends MMS via Twilio                                │
│       - Includes image and signup link                      │
│       - Returns success to agent                            │
│     }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Call continues...
                     │ Call ends
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Post-Call Webhook Fired                                 │
│     POST https://your-domain/api/webhooks/elevenlabs/       │
│          post-call                                           │
│     {                                                        │
│       "conversation_id": "conv_123",                        │
│       "call_id": "call_456",                                │
│       "transcript": "Full conversation...",                 │
│       "metadata": {                                         │
│         "customer_name": "John",                            │
│         "customer_phone": "+14802555887",                   │
│         "customer_email": "john@example.com"                │
│       },                                                    │
│       "analysis": {                                         │
│         "outcome": "interested",                            │
│         "sentiment": "positive"                             │
│       }                                                     │
│     }                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Automatic Follow-up                                     │
│     File: elevenLabsWebhookController.js                    │
│                                                              │
│     handlePostCallFollowUp() {                              │
│       // 1. Send SMS via Twilio                             │
│       await twilioService.sendSMS(phone, message);          │
│                                                              │
│       // 2. Send Email via SendGrid                         │
│       await emailService.sendEmail(email, template);        │
│                                                              │
│       // 3. Update CRM                                      │
│       await updateLeadInDatabase();                         │
│                                                              │
│       // 4. Trigger n8n workflow (optional)                 │
│       await workflowEngine.trigger(workflow_id);            │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Your Implementation Files

### Backend Controllers

**1. `/backend/controllers/elevenLabsWebhookController.js`**
- ✅ `sendSignupLinkAction()` - Send MMS during call
- ✅ `handlePostCallFollowUp()` - Automatic post-call SMS + Email
- ✅ Integrates Twilio, SendGrid, AI Service, Workflow Engine

**2. `/backend/routes/webhooks.js`**
- Routes for webhook endpoints
- Connected to ElevenLabs agent configurations

**3. `/backend/services/twilioService.js`**
- SMS sending
- MMS with images
- Phone number management

**4. `/backend/services/emailService.js`**
- SendGrid email integration
- Template support
- Transactional emails

**5. `/backend/services/workflowEngine.js`**
- n8n workflow triggering
- Automation orchestration

---

## 🎯 What You're NOT Dependent On

### ❌ You're NOT Using (and don't need to):
- ElevenLabs built-in SMS/Email features (they don't have these)
- ElevenLabs workflow automation (they don't have this)
- Third-party automation platforms (you built your own!)

### ✅ What You ARE Using from ElevenLabs:
1. **Conversational AI Platform** - The intelligent voice agent
2. **Voice Library** - Access to thousands of voices
3. **Batch Calling API** - Initiate phone calls
4. **Webhooks** - Notify your backend of events

### ✅ What You Control (Your Own Code):
1. **SMS/MMS** - Twilio integration (your code)
2. **Email** - SendGrid integration (your code)
3. **Workflows** - n8n automation (your code)
4. **CRM** - Database management (your code)
5. **Business Logic** - All orchestration (your code)

---

## 🔄 Example Workflows You Can Build

### Workflow 1: Sales Lead Follow-up

```javascript
// Agent calls lead
ElevenLabs Agent → Customer answers
                 → Conversation happens
                 → Customer shows interest
                 → Agent triggers webhook: "Send pricing info"
                 → Your Backend:
                    ✓ Sends MMS with pricing PDF via Twilio
                    ✓ Agent continues call
                 → Call ends
                 → Post-call webhook fires
                 → Your Backend:
                    ✓ Sends SMS: "Thanks for your time"
                    ✓ Sends Email: Detailed proposal
                    ✓ Updates CRM: Lead = "Warm"
                    ✓ Triggers n8n: Schedule follow-up call in 2 days
```

### Workflow 2: Appointment Confirmation

```javascript
// Agent calls to confirm appointment
ElevenLabs Agent → Customer confirms
                 → Agent triggers webhook: "Send confirmation"
                 → Your Backend:
                    ✓ Sends SMS via Twilio: "Confirmed for 3PM tomorrow"
                    ✓ Sends MMS: Map image to location
                 → Call ends
                 → Post-call webhook fires
                 → Your Backend:
                    ✓ Sends Email: Calendar invite
                    ✓ Updates database: Appointment confirmed
                    ✓ Triggers n8n: Send reminder 1 hour before
```

### Workflow 3: Customer Support

```javascript
// Customer calls support number
Twilio receives call → Forwards to ElevenLabs Agent
                    → Agent helps customer
                    → Issue resolved
                    → Agent triggers webhook: "Send ticket number"
                    → Your Backend:
                       ✓ Creates ticket in CRM
                       ✓ Sends SMS: Ticket #12345
                    → Call ends
                    → Post-call webhook fires
                    → Your Backend:
                       ✓ Sends Email: Full transcript + ticket details
                       ✓ Updates CRM: Ticket status
                       ✓ Triggers n8n: Send satisfaction survey
```

---

## 🛠️ How to Configure Agent Webhooks

### Method 1: Via Script (Automated)

You have scripts to configure webhooks:

```bash
# Configure webhook URL for an agent
node scripts/configure-agent-webhooks.js

# Enable webhooks for all agents
node scripts/enable-agent-webhooks.js

# Set specific webhook for agent
node scripts/set-agent-webhook.js
```

### Method 2: Via API (Manual)

```bash
# Update agent with webhook URL
curl -X PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id} \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_config": {
      "agent": {
        "webhook_url": "https://your-domain.ngrok-free.app/api/webhooks/elevenlabs/action"
      }
    }
  }'
```

### Method 3: Via ElevenLabs Dashboard

1. Go to https://elevenlabs.io/app/conversational-ai
2. Select your agent
3. Go to "Advanced Settings"
4. Add webhook URL: `https://your-domain.com/api/webhooks/elevenlabs/action`
5. Save

---

## 📊 Webhook Payload Examples

### During-Call Action Webhook

**What ElevenLabs Sends:**
```json
POST /api/webhooks/elevenlabs/action
{
  "phone_number": "+14802555887",
  "customer_name": "John Smith",
  "conversation_id": "conv_abc123",
  "action": "send_signup_link"
}
```

**Your Response (to agent):**
```json
{
  "success": true,
  "message": "MMS sent successfully",
  "action": "mms_sent"
}
```

### Post-Call Webhook

**What ElevenLabs Sends:**
```json
POST /api/webhooks/elevenlabs/post-call
{
  "conversation_id": "conv_abc123",
  "call_id": "call_xyz789",
  "agent_id": "agent_8001...",
  "metadata": {
    "customer_name": "John Smith",
    "customer_phone": "+14802555887",
    "customer_email": "john@example.com",
    "lead_id": "lead_123"
  },
  "transcript": "Agent: Hi John, this is Sarah from VoiceFlow...",
  "analysis": {
    "outcome": "interested",
    "sentiment": "positive",
    "next_action": "send_proposal"
  },
  "call_duration": 180,
  "ended_reason": "customer_hangup"
}
```

---

## 🚀 Current Webhook Endpoints

### Your Backend Routes (`/backend/routes/webhooks.js`)

```javascript
// Real-time action during call
POST /api/webhooks/elevenlabs/action
→ sendSignupLinkAction()

// Post-call follow-up
POST /api/webhooks/elevenlabs/post-call
→ handlePostCallFollowUp()

// Twilio incoming call
POST /api/webhooks/twilio/voice
→ Handle incoming calls

// Twilio SMS received
POST /api/webhooks/twilio/sms
→ Handle incoming SMS
```

---

## 🎨 Customization Examples

### Add Custom Action: Send Quote

**1. Add to `elevenLabsWebhookController.js`:**

```javascript
export const sendQuoteAction = async (req, res) => {
  try {
    const { phone_number, customer_name, service_type } = req.body;

    // Generate quote based on service type
    const quote = generateQuote(service_type);

    // Send via MMS with quote image
    const message = `Hi ${customer_name}! Here's your quote for ${service_type}`;
    const quoteImageUrl = await generateQuoteImage(quote);

    await twilioService.sendMMSWithImage(phone_number, message, quoteImageUrl);

    res.json({
      success: true,
      message: 'Quote sent',
      quote_amount: quote.total
    });

  } catch (error) {
    console.error('Error sending quote:', error);
    res.status(500).json({ success: false, error: 'Failed to send quote' });
  }
};
```

**2. Add route:**
```javascript
router.post('/webhooks/elevenlabs/send-quote', sendQuoteAction);
```

**3. Configure agent to use it:**
```javascript
agent.conversation_config.agent.webhook_url =
  'https://your-domain.com/api/webhooks/elevenlabs/send-quote';
```

---

## 🔐 Security Best Practices

### 1. Validate Webhook Signatures
```javascript
// Verify webhook is from ElevenLabs
const validateWebhook = (req, signature) => {
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.ELEVENLABS_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
};
```

### 2. Use HTTPS (Already configured via ngrok)
```bash
WEBHOOK_URL=https://f66af302a875.ngrok-free.app
```

### 3. Rate Limiting (Already implemented)
```javascript
// backend/middleware/security.js
rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})
```

---

## 📈 Monitoring & Debugging

### Check Webhook Logs

```bash
# View backend logs
tail -f backend/server.log

# Search for webhook calls
grep "elevenlabs" backend/server.log

# Check Twilio activity
grep "Twilio" backend/server.log
```

### Test Webhooks Locally

```bash
# Test during-call action
curl -X POST http://localhost:5001/api/webhooks/elevenlabs/action \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+14802555887",
    "customer_name": "Test User",
    "conversation_id": "test_123"
  }'

# Test post-call webhook
curl -X POST http://localhost:5001/api/webhooks/elevenlabs/post-call \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test_123",
    "metadata": {
      "customer_phone": "+14802555887",
      "customer_email": "test@example.com"
    }
  }'
```

---

## 🎯 Summary

### What You Have:
✅ **ElevenLabs Conversational AI** - Intelligent voice agents with 39 voices
✅ **Twilio Integration** - SMS/MMS sending capability
✅ **SendGrid Integration** - Email automation
✅ **n8n Workflows** - Advanced automation
✅ **Webhook System** - Real-time and post-call actions
✅ **Full Control** - You own all the automation logic

### What You're Independent From:
❌ ElevenLabs SMS/Email (they don't have it anyway)
❌ Third-party automation (you built your own)
❌ Platform lock-in (everything is in your code)

### What You Depend On:
✓ ElevenLabs for: Voice AI + Calling infrastructure
✓ Twilio for: SMS/MMS/Phone numbers
✓ SendGrid for: Email delivery
✓ Your Backend for: Everything else

---

## 📚 Related Documentation

- `ELEVENLABS_VOICE_LIBRARY_GUIDE.md` - Voice selection guide
- `POST_CALL_EMAIL_SYSTEM.md` - Email automation details
- `WEBHOOK_SETUP.md` - Webhook configuration
- `TWILIO_ELEVENLABS_SETUP.md` - Integration setup

---

**Created:** 2025-11-17
**Status:** ✅ Fully Implemented and Working
**Your Architecture:** Independent, scalable, and under your control
