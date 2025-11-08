# N8N Master Workflows Setup Guide

This guide explains how to set up master workflows in n8n cloud that work with VoiceFlow CRM's multi-tenant architecture.

## Architecture Overview

**Multi-Tenant Workflow Design:**
- ✅ **ONE master workflow per template type** in n8n cloud (5 total)
- ✅ **Unlimited user instances** stored in your MongoDB database
- ✅ **Your backend routes requests** to master workflows with user-specific data
- ✅ **Credentials managed per-user** in n8n or your backend

### Flow Diagram:
```
ElevenLabs Call Completes
         ↓
Your Backend Webhook (/api/webhooks/elevenlabs/call-completed)
         ↓
Check User's Enabled Workflows
         ↓
For Each Workflow:
  → Send to Master N8N Workflow with userId + callData + config
         ↓
Master N8N Workflow
  → Uses userId to look up credentials
  → Executes action (Slack, SMS, Email, etc.)
```

## Master Workflows to Create in N8N Cloud

Create these 5 workflows in your n8n cloud account at https://remodely.app.n8n.cloud

### 1. Save Lead to CRM (Webhook: `/webhook/save-lead`)

**Nodes:**
```
1. Webhook Trigger (path: /save-lead)
   - Method: POST
   - Response: Immediately

2. Function: Extract Data
   Code:
   const { userId, callData, config } = items[0].json;
   return [{
     json: {
       userId,
       name: callData.caller_name,
       phone: callData.caller_phone,
       email: callData.email,
       source: callData.agent_type,
       qualified: callData.qualified,
       transcript: callData.transcript
     }
   }];

3. HTTP Request: Save to VoiceFlow API
   Method: POST
   URL: https://your-domain.com/api/leads
   Headers:
     Authorization: Bearer {{ $json.userId_token }}
   Body:
     {{$json}}
```

### 2. Send SMS After Call (Webhook: `/webhook/send-sms`)

**Nodes:**
```
1. Webhook Trigger (path: /send-sms)
   - Method: POST

2. Function: Get User Twilio Credentials
   Code:
   const { userId, callData, config } = items[0].json;
   // In production, fetch from your credentials store
   // For now, use environment variables or n8n credentials per user
   return [{
     json: {
       to: callData.caller_phone,
       message: config.smsTemplate || "Thank you for your call! We'll follow up soon.",
       twilioSid: process.env[`TWILIO_SID_${userId}`],
       twilioToken: process.env[`TWILIO_TOKEN_${userId}`]
     }
   }];

3. Twilio Node: Send SMS
   - Use credentials from previous step
   - To: {{$json.to}}
   - Message: {{$json.message}}
```

### 3. Book Appointment (Webhook: `/webhook/book-appointment`)

**Nodes:**
```
1. Webhook Trigger (path: /book-appointment)

2. Function: Parse Appointment Data
   Code:
   const { userId, callData, config } = items[0].json;
   // Extract appointment time from transcript or callData
   return [{
     json: {
       userId,
       summary: `Call with ${callData.caller_name}`,
       description: callData.transcript,
       start: config.appointmentDate,
       end: config.appointmentEnd,
       attendees: [callData.email]
     }
   }];

3. Google Calendar Node: Create Event
   - Use userId to select credentials
   - Summary: {{$json.summary}}
   - Start: {{$json.start}}
   - End: {{$json.end}}

4. Twilio Node: Send Confirmation SMS
   - To: {{$node["Webhook"].json.callData.caller_phone}}
   - Message: "Appointment confirmed for {{$json.start}}"
```

### 4. Slack Notification (Webhook: `/webhook/slack-notify`)

**Nodes:**
```
1. Webhook Trigger (path: /slack-notify)

2. Function: Format Slack Message
   Code:
   const { userId, callData, config } = items[0].json;

   const slackChannel = config.slackChannel || '#leads';
   const message = `
🆕 New ${callData.agent_type} call
👤 ${callData.caller_name} - ${callData.caller_phone}
⏱️ Duration: ${callData.duration}s
${callData.qualified ? '✅ Qualified' : '❌ Not Qualified'}
📝 Transcript: ${callData.transcript.substring(0, 200)}...
   `;

   return [{
     json: {
       userId,
       channel: slackChannel,
       message: message,
       blocks: [
         {
           type: "section",
           text: {
             type: "mrkdwn",
             text: message
           }
         }
       ]
     }
   }];

3. Slack Node: Post Message
   - Use userId to select workspace credentials
   - Channel: {{$json.channel}}
   - Message: {{$json.message}}
   - Blocks: {{$json.blocks}}
```

### 5. Send Follow-up Email (Webhook: `/webhook/send-email`)

**Nodes:**
```
1. Webhook Trigger (path: /send-email)

2. Function: Prepare Email
   Code:
   const { userId, callData, config } = items[0].json;

   return [{
     json: {
       userId,
       to: callData.email || callData.caller_email,
       subject: config.emailSubject || "Thank you for your interest",
       html: `
         <h2>Thank you for reaching out!</h2>
         <p>Hi ${callData.caller_name},</p>
         <p>We appreciate your call and will be in touch soon.</p>
         <p>Call Summary:</p>
         <ul>
           <li>Duration: ${callData.duration} seconds</li>
           <li>Agent: ${callData.agent_type}</li>
         </ul>
         <p>Best regards,<br>Your Team</p>
       `
     }
   }];

3. SendGrid / Gmail Node: Send Email
   - Use userId to select email credentials
   - To: {{$json.to}}
   - Subject: {{$json.subject}}
   - HTML: {{$json.html}}
```

## Setting Up User-Specific Credentials

### Option 1: Environment Variables (Quick Setup)
```bash
# In n8n cloud settings, set:
TWILIO_SID_user123=ACxxxxx
TWILIO_TOKEN_user123=xxxxx
SLACK_TOKEN_user456=xoxb-xxxxx
```

### Option 2: N8N Credentials (Recommended)
1. Go to n8n Credentials section
2. Create credential sets named by userId: `twilio_user123`, `slack_user456`
3. In your Function nodes, reference: `$credentials('twilio_' + userId)`

### Option 3: External Credential Store (Production)
1. Store credentials in your own database (encrypted)
2. Add HTTP Request node at start of workflow to fetch credentials
3. Use fetched credentials in subsequent nodes

## Webhook URLs

After creating workflows, configure these in your `.env`:

```bash
N8N_WEBHOOK_URL=https://remodely.app.n8n.cloud/webhook
N8N_API_KEY=your_api_key

# Master workflow paths (configured in workflowExecutor.js)
# /webhook/save-lead
# /webhook/send-sms
# /webhook/book-appointment
# /webhook/slack-notify
# /webhook/send-email
```

## Testing the Integration

### 1. Configure ElevenLabs Webhook

In ElevenLabs dashboard, set webhook URL:
```
https://your-backend-domain.com/api/webhooks/elevenlabs/call-completed
```

### 2. Create a Test Call

When a call completes:
1. ElevenLabs sends webhook to your backend
2. Your backend saves call to database
3. Your backend finds user's enabled workflows
4. For each workflow, sends request to master n8n workflow
5. Master n8n workflow executes with user-specific credentials

### 3. Monitor Logs

Backend logs will show:
```
📞 Received call completion webhook
✅ Call saved: 60f7b3c4a1234567890abcde
Found 2 enabled workflows for user 60f7b3c4a1234567890abcde
Executing workflow: Slack Notification (slack_notification)
✅ Workflow executed successfully: Slack Notification
Executing workflow: Save Lead (save_lead)
✅ Workflow executed successfully: Save Lead
```

N8N logs will show:
```
Webhook received: /webhook/slack-notify
Processing for userId: 60f7b3c4a1234567890abcde
Slack message sent successfully
```

## Advantages of This Architecture

✅ **Scalability:** One workflow handles unlimited users
✅ **Cost-Effective:** Only 5 workflows in n8n instead of thousands
✅ **Maintainability:** Update one workflow, affects all users
✅ **Security:** Credentials isolated per user
✅ **Flexibility:** Users can customize config without creating new n8n workflows
✅ **Monitoring:** Centralized execution stats per user in your database

## Next Steps

1. Create the 5 master workflows in n8n cloud
2. Test each webhook path with Postman
3. Configure ElevenLabs webhook to your backend
4. Make a test call and verify workflows execute
5. Add credential management for your users
