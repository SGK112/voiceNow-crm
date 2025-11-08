# n8n Manual Setup - Final Steps

## Current Status

✅ **5 Master Workflows Created and Active:**
1. Master: Save Lead to CRM (ID: DTABZoE2aKI8lcVj)
2. Master: Send SMS After Call (ID: l1k6ZbtLHKaANPLz) - **Has Twilio node**
3. Master: Book Appointment (ID: ppg4X6w1CG02hWDb) - **Has Twilio node**
4. Master: Slack Notification (ID: R99fGLywAAUVA4ms)
5. Master: Send Follow-up Email (ID: 5BqXWOZbZ2H22tuw)

✅ **All Workflows Are Active**
✅ **Webhook URLs Are Live**

## What You Need to Do Manually

### Step 1: Add Twilio Credential (5 minutes)

1. Open your n8n dashboard: https://remodely.app.n8n.cloud

2. Click on **"Credentials"** in the left sidebar

3. Click **"Add Credential"** button

4. Search for **"Twilio"** and select **"Twilio API"**

5. Fill in the form:
   ```
   Name: twilio_credentials
   Account SID: YOUR_TWILIO_ACCOUNT_SID
   Auth Token: YOUR_TWILIO_AUTH_TOKEN
   ```

6. Click **"Save"**

### Step 2: Link Twilio Credential to Workflows (3 minutes)

#### Workflow 1: Master: Send SMS After Call

1. Go to: https://remodely.app.n8n.cloud/workflow/l1k6ZbtLHKaANPLz

2. Click to open the workflow for editing

3. Find the **"Twilio SMS"** node and click on it

4. In the node settings:
   - Under **"Credential to connect with"**, select **"twilio_credentials"**
   - Under **"From"**, enter: `+16028334780`
   - Under **"To"**, it should have: `={{ $json.phone }}` (dynamic)
   - Under **"Message"**, it should have: `={{ $json.message }}` (dynamic)

5. Click **"Save"** (bottom right)

6. Workflow should still be active (green toggle at top)

#### Workflow 2: Master: Book Appointment

1. Go to: https://remodely.app.n8n.cloud/workflow/ppg4X6w1CG02hWDb

2. Click to open the workflow for editing

3. Find the **"Send Confirmation SMS"** node and click on it

4. In the node settings:
   - Under **"Credential to connect with"**, select **"twilio_credentials"**
   - Under **"From"**, enter: `+16028334780`
   - The To and Message fields should be dynamic

5. Click **"Save"**

## Step 3: Test the Webhooks

### Test 1: SMS Workflow

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+16028334780",
    "message": "Test SMS from VoiceFlow CRM! Your Twilio integration is working perfectly! 🎉"
  }'
```

**Expected Result:**
- You should receive an SMS at (602) 833-4780
- The webhook should return a success response
- Check n8n Executions tab to see the workflow run

### Test 2: Save Lead Workflow

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/save-lead \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "callData": {
      "caller_name": "John Doe",
      "caller_phone": "+15551234567",
      "email": "john.doe@example.com",
      "agent_type": "lead_gen",
      "duration": 180,
      "qualified": true,
      "transcript": "Customer is interested in kitchen remodeling. Budget: $50k. Timeline: 3 months.",
      "lead_score": 85
    },
    "config": {}
  }'
```

**Expected Result:**
- Webhook returns success
- Lead data is processed by n8n
- Check Executions tab to verify

### Test 3: Book Appointment Workflow

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/book-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Jane Smith",
    "customer_phone": "+16028334780",
    "customer_email": "jane@example.com",
    "appointment_date": "2025-11-15",
    "appointment_time": "2:00 PM",
    "service_type": "Kitchen Consultation",
    "notes": "Interested in granite countertops"
  }'
```

**Expected Result:**
- SMS confirmation sent to (602) 833-4780
- Appointment saved
- Check both SMS and n8n Executions

## Webhook URLs (Ready to Use)

| Webhook | URL | Status |
|---------|-----|--------|
| Save Lead | `https://remodely.app.n8n.cloud/webhook/save-lead` | ✅ Active |
| Send SMS | `https://remodely.app.n8n.cloud/webhook/send-sms` | ✅ Active |
| Book Appointment | `https://remodely.app.n8n.cloud/webhook/book-appointment` | ✅ Active |
| Slack Notification | `https://remodely.app.n8n.cloud/webhook/slack-notify` | ✅ Active |
| Send Email | `https://remodely.app.n8n.cloud/webhook/send-email` | ✅ Active |

## Integration with VoiceFlow CRM Backend

Your backend is already configured to call these webhooks when calls complete:

**File:** `/Users/homepc/voiceflow-crm/backend/controllers/callWebhookController.js`

When ElevenLabs sends a webhook to your backend at:
```
POST /api/webhooks/elevenlabs/call-completed
```

Your backend will:
1. Save the call to MongoDB
2. Trigger the appropriate n8n workflows based on workflow configuration
3. n8n will execute actions (send SMS, save to CRM, etc.)

## Monitoring & Debugging

### Check Workflow Executions

1. Go to: https://remodely.app.n8n.cloud/executions

2. You'll see a log of all workflow runs:
   - ✅ Green = Success
   - ❌ Red = Failed
   - ⏸️ Gray = Waiting

3. Click on any execution to see:
   - Input data received
   - Each node's output
   - Error messages if failed

### Check Twilio Logs

1. Go to: https://console.twilio.com/us1/monitor/logs/sms

2. See all SMS messages sent:
   - Delivered
   - Failed
   - Queued

3. Check costs and usage

### Check Backend Logs

Your backend should be running on port 5001. Check logs with:

```bash
cd /Users/homepc/voiceflow-crm && npm run dev
```

Look for:
```
📞 Received call completion webhook: ...
✅ Executing workflow: send_sms
```

## Common Issues

### Issue: "Credential not found" error in n8n

**Solution:**
- Make sure you created the Twilio credential exactly as described
- Name must be: `twilio_credentials`
- Ensure it's saved before linking to workflows

### Issue: Webhook returns 404

**Solution:**
- Check that workflow is Active (green toggle)
- Verify webhook path matches exactly
- Make sure you're using the correct n8n instance URL

### Issue: SMS not received

**Solution:**
- Check Twilio logs for delivery status
- Verify phone number format (+1 country code)
- Ensure Twilio account has sufficient balance ($34.66 remaining)
- For trial accounts, verify recipient number in Twilio

### Issue: Workflow runs but no SMS sent

**Solution:**
- Check if Twilio node has credential linked
- Verify From number is set to +16028334780
- Check n8n execution details for error messages

## Next Steps After Testing

Once you've verified the webhooks work:

1. **Configure ElevenLabs Agents:**
   - Run: `node scripts/setup-elevenlabs-agents.js`
   - Add webhook URL to each agent: `https://your-domain.com/api/webhooks/elevenlabs/call-completed`

2. **Add Other Credentials:**
   - **Google Calendar** (for appointment booking)
   - **Slack** (for notifications)
   - **SendGrid** (for email workflows)

3. **Deploy Backend:**
   - Deploy your backend to production
   - Update ElevenLabs webhook URLs to production URL

4. **Test End-to-End:**
   - Make a call to one of your ElevenLabs agents
   - Verify webhook received by backend
   - Check that n8n workflows trigger automatically
   - Confirm SMS/email/notifications sent

## Quick Reference

**Twilio Credentials:**
- Account SID: `YOUR_TWILIO_ACCOUNT_SID`
- Auth Token: `YOUR_TWILIO_AUTH_TOKEN`
- Phone: `+16028334780`
- Balance: `$34.66` (~4,600 SMS messages)

**n8n Dashboard:**
- URL: https://remodely.app.n8n.cloud
- Workflows: https://remodely.app.n8n.cloud/workflows
- Executions: https://remodely.app.n8n.cloud/executions
- Credentials: https://remodely.app.n8n.cloud/credentials

**Backend:**
- Local: http://localhost:5001
- Webhook: POST /api/webhooks/elevenlabs/call-completed

**Twilio Dashboard:**
- Console: https://console.twilio.com
- SMS Logs: https://console.twilio.com/us1/monitor/logs/sms
- Phone Numbers: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
