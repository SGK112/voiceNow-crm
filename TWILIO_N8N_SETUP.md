# Twilio Integration with n8n - Complete Setup Guide

## Overview

Your Twilio credentials have been tested and verified successfully. This guide will walk you through configuring Twilio in n8n and connecting it to your SMS workflows.

## Verified Twilio Account Details

- **Account Name:** My first Twilio account
- **Account Status:** Active
- **Available Phone Numbers:** 3
- **Current Balance:** $34.66 USD
- **Primary Phone:** (602) 833-4780

## Step 1: Add Twilio Credentials to n8n

### 1.1 Navigate to Credentials Page

Go to: https://remodely.app.n8n.cloud/credentials

### 1.2 Create New Twilio Credential

1. Click **"Add Credential"** button
2. Search for **"Twilio"** in the credential type list
3. Select **"Twilio API"**

### 1.3 Enter Credentials

Fill in the following information:

```
Credential Name: twilio_credentials
Account SID: YOUR_TWILIO_ACCOUNT_SID
Auth Token: YOUR_TWILIO_AUTH_TOKEN
```

### 1.4 Test Connection

1. Click **"Test"** button to verify credentials
2. Should see: "Connection test successful"
3. Click **"Save"** to store the credential

## Step 2: Update n8n Workflows to Use Twilio

You have 2 workflows that need Twilio credentials:

### Workflow 1: "Master: Send SMS After Call"
**Workflow ID:** `l1k6ZbtLHKaANPLz`
**Webhook Path:** `/webhook/send-sms`

### Workflow 2: "Master: Book Appointment"
**Workflow ID:** `ppg4X6w1CG02hWDb`
**Webhook Path:** `/webhook/book-appointment`

## Step 3: Configure SMS Workflow Nodes

### 3.1 Open "Master: Send SMS After Call" Workflow

1. Go to: https://remodely.app.n8n.cloud/workflow/l1k6ZbtLHKaANPLz
2. Click to edit the workflow

### 3.2 Update Twilio SMS Node

1. Find the **"Twilio"** node in the workflow
2. Click on the node to open settings
3. In the **"Credential to connect with"** dropdown:
   - Select **"twilio_credentials"** (the credential you just created)
4. Configure the node:
   ```
   From: +16028334780
   To: {{ $json.phone }} (dynamic from webhook)
   Message: {{ $json.message }} (dynamic from webhook)
   ```
5. Click **"Save"** on the node

### 3.3 Activate the Workflow

1. Toggle the **"Active"** switch at the top right
2. Should change from gray to green
3. Webhook URL should now be live: `https://remodely.app.n8n.cloud/webhook/send-sms`

## Step 4: Configure Appointment Booking Workflow

### 4.1 Open "Master: Book Appointment" Workflow

1. Go to: https://remodely.app.n8n.cloud/workflow/ppg4X6w1CG02hWDb
2. Click to edit the workflow

### 4.2 Update Twilio SMS Node

1. Find the **"Twilio"** node (for appointment confirmation)
2. Click on the node to open settings
3. Select credential: **"twilio_credentials"**
4. Configure:
   ```
   From: +16028334780
   To: {{ $json.customer_phone }}
   Message: Hi {{ $json.customer_name }}, your appointment is confirmed for {{ $json.appointment_date }} at {{ $json.appointment_time }}. See you then!
   ```
5. Click **"Save"**

### 4.3 Activate the Workflow

1. Toggle **"Active"** switch
2. Webhook should be live: `https://remodely.app.n8n.cloud/webhook/book-appointment`

## Step 5: Test SMS Functionality

### 5.1 Test SMS Webhook Directly

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+16028334780",
    "message": "Test SMS from VoiceFlow CRM! Your Twilio integration is working. 🎉"
  }'
```

**Expected Result:**
- SMS should be received at (602) 833-4780
- n8n execution log should show success
- Twilio logs should show outbound SMS

### 5.2 Test Appointment Booking

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/book-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "+16028334780",
    "appointment_date": "2025-11-15",
    "appointment_time": "2:00 PM",
    "service_type": "Consultation"
  }'
```

**Expected Result:**
- Appointment confirmation SMS received
- Calendar event created (if Google Calendar configured)
- Data saved to CRM

## Step 6: Monitor SMS Usage

### 6.1 Check Twilio Dashboard

1. Go to: https://console.twilio.com/us1/monitor/logs/sms
2. View all sent messages
3. Check delivery status
4. Monitor costs

### 6.2 Check n8n Execution Logs

1. Go to: https://remodely.app.n8n.cloud/executions
2. Filter by workflow: "Master: Send SMS After Call"
3. Check for any failed executions
4. Review error messages if any

## Step 7: Configure SMS Templates (Optional)

You can enhance your SMS messages with better templates:

### Template 1: Lead Follow-up SMS
```
Hi {{ name }}, thanks for your interest! I'm {{ agent_name }} from {{ company }}.

I'd love to discuss {{ service }} with you. When's a good time for a quick call?

Reply STOP to unsubscribe.
```

### Template 2: Appointment Reminder
```
Reminder: You have an appointment tomorrow at {{ time }} for {{ service }}.

Location: {{ address }}
Phone: {{ phone }}

Reply YES to confirm or RESCHEDULE to change.
```

### Template 3: Collections Follow-up
```
Hi {{ name }}, this is a friendly reminder about your account balance of ${{ amount }}.

To make a payment, call us at {{ phone }} or visit {{ payment_link }}

Thank you!
```

## Step 8: Set Up SMS Compliance

### 8.1 Add STOP/UNSUBSCRIBE Handling

Create a new workflow to handle opt-outs:

1. Create webhook: `/webhook/sms-reply`
2. Add Twilio node to receive incoming SMS
3. Check if message contains "STOP" or "UNSUBSCRIBE"
4. Update user preferences in MongoDB
5. Send confirmation: "You've been unsubscribed"

### 8.2 Register SMS Campaign (For Marketing)

If sending promotional SMS:
1. Go to Twilio Console → Messaging → Regulatory Compliance
2. Register your business
3. Submit campaign information
4. Wait for approval (usually 24-48 hours)

## Troubleshooting

### Issue: "Authentication failed"
**Solution:**
- Verify Account SID and Auth Token in n8n credential
- Check that credentials haven't expired
- Test with curl:
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

### Issue: "From number not verified"
**Solution:**
- Twilio trial accounts can only send to verified numbers
- Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- Add numbers or upgrade to paid account

### Issue: "SMS not delivered"
**Solution:**
- Check phone number format (must include country code: +1)
- Verify recipient number is not on DND list
- Check Twilio error codes: https://www.twilio.com/docs/api/errors

### Issue: "Rate limit exceeded"
**Solution:**
- Twilio has rate limits (default: 1 message/second)
- Add delays between bulk messages
- Contact Twilio to increase limits

## Cost Management

### Current Balance: $34.66

**SMS Costs:**
- US/Canada SMS: ~$0.0075 per message
- International SMS: Varies by country
- MMS: ~$0.02 per message

**Estimated Usage:**
- $34.66 = ~4,600 SMS messages
- Or ~150 SMS per day for 30 days

**Top-up Options:**
1. Set up auto-recharge in Twilio console
2. Get billing alerts at $10, $5, $1 remaining
3. Upgrade to paid account for better rates

## Integration with VoiceFlow CRM

### Backend Webhook Handler

Your backend already handles Twilio SMS via:
- **File:** `/Users/homepc/voiceflow-crm/backend/services/workflowExecutor.js`
- **Webhook:** `https://your-domain.com/api/webhooks/elevenlabs/call-completed`

When a call completes, the backend:
1. Receives webhook from ElevenLabs
2. Saves call data to MongoDB
3. Triggers n8n workflows
4. n8n sends SMS via Twilio

### Flow Diagram

```
ElevenLabs Call Completes
        ↓
Backend Webhook (/api/webhooks/elevenlabs/call-completed)
        ↓
WorkflowExecutor Service
        ↓
n8n Master Workflow (send-sms)
        ↓
Twilio API
        ↓
SMS Delivered to Customer
```

## Next Steps

1. ✅ Twilio credentials tested (DONE)
2. ⏳ Add credentials to n8n (PENDING - follow Step 1)
3. ⏳ Update workflow nodes (PENDING - follow Step 3)
4. ⏳ Activate workflows (PENDING - follow Step 3.3)
5. ⏳ Test SMS sending (PENDING - follow Step 5)
6. ⏳ Configure other credentials (Google Calendar, Slack, SendGrid)

## Additional Resources

- **Twilio Console:** https://console.twilio.com
- **n8n Twilio Docs:** https://docs.n8n.io/integrations/builtin/credentials/twilio/
- **SMS Best Practices:** https://www.twilio.com/docs/sms/best-practices
- **Compliance Guide:** https://www.twilio.com/docs/sms/regulatory-compliance

## Support

If you encounter issues:
1. Check n8n execution logs
2. Review Twilio error logs
3. Test credentials with test script: `node scripts/test-twilio.js`
4. Check backend logs: `npm run dev`
