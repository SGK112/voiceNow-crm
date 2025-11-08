# Add Twilio Credential to n8n - 5 Minute Guide

## Step-by-Step Instructions

### Step 1: Open n8n Dashboard

1. Open your browser
2. Go to: **https://remodely.app.n8n.cloud**
3. Log in if needed

### Step 2: Navigate to Credentials

1. Look at the left sidebar
2. Click on **"Credentials"**
3. You'll see a list of existing credentials

### Step 3: Add New Twilio Credential

1. Click the blue **"Add Credential"** button (top right)
2. A search box will appear
3. Type: **"Twilio"**
4. Click on **"Twilio API"** from the results

### Step 4: Fill in Twilio Details

You'll see a form with these fields:

```
┌─────────────────────────────────────┐
│  Twilio API Credential              │
├─────────────────────────────────────┤
│                                     │
│  Credential Name (optional)         │
│  ┌───────────────────────────────┐ │
│  │ twilio_credentials            │ │
│  └───────────────────────────────┘ │
│                                     │
│  Account SID *                      │
│  ┌───────────────────────────────┐ │
│  │ AC1e960aa82c1f8b7800fe7fe5... │ │
│  └───────────────────────────────┘ │
│                                     │
│  Auth Token *                       │
│  ┌───────────────────────────────┐ │
│  │ 8038255c30b5dd76fbb4b5681... │ │
│  └───────────────────────────────┘ │
│                                     │
│        [Test] [Cancel] [Save]       │
└─────────────────────────────────────┘
```

**Enter these values:**

- **Credential Name**: `twilio_credentials`
- **Account SID**: `YOUR_TWILIO_ACCOUNT_SID`
- **Auth Token**: `YOUR_TWILIO_AUTH_TOKEN`

### Step 5: Test & Save

1. Click the **"Test"** button
2. Wait for green checkmark: "Connection successful!"
3. Click **"Save"** button
4. You should see "Credential saved successfully!"

---

## Link Credential to Workflows

Now you need to tell the workflows to use this credential.

### Workflow 1: Send SMS After Call

1. Go to: **https://remodely.app.n8n.cloud/workflow/l1k6ZbtLHKaANPLz**

2. Click anywhere on the canvas to open the workflow

3. Find the node labeled **"Twilio SMS"** (it will have a Twilio logo)

4. Click on the **"Twilio SMS"** node to open its settings

5. You'll see a form with these fields:
   - **Credential to connect with**: Click the dropdown
   - Select: **"twilio_credentials"** (the one you just created)
   - **From**: Enter `+16028334780`
   - **To**: Should show `={{ $json.phone }}` (leave as is)
   - **Message**: Should show `={{ $json.message }}` (leave as is)

6. Click **"Save"** button at the bottom right

7. The workflow should still be active (green toggle at top)

### Workflow 2: Book Appointment

1. Go to: **https://remodely.app.n8n.cloud/workflow/ppg4X6w1CG02hWDb**

2. Click to open the workflow

3. Find the node labeled **"Send Confirmation SMS"**

4. Click on it to open settings

5. Configure:
   - **Credential to connect with**: Select **"twilio_credentials"**
   - **From**: Enter `+16028334780`
   - **To**: Should be dynamic (leave as is)
   - **Message**: Should be dynamic (leave as is)

6. Click **"Save"**

---

## Test It Works!

Open your terminal and run this command:

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+16028334780",
    "message": "🎉 Success! Your Twilio integration is working perfectly!"
  }'
```

**You should:**
1. See response: `{"message":"Workflow was started"}`
2. Receive an SMS at (602) 833-4780 within seconds

---

## Verify in n8n

1. Go to: **https://remodely.app.n8n.cloud/executions**

2. You should see a new execution at the top:
   - Workflow: "Master: Send SMS After Call"
   - Status: ✅ Success (green)
   - Time: Just now

3. Click on it to see details:
   - Input data received
   - Twilio node executed successfully
   - SMS sent

---

## Troubleshooting

### "Credential not found" in workflow

**Problem:** The workflow can't find the Twilio credential

**Solution:**
1. Go back to Credentials page
2. Make sure the credential name is exactly: `twilio_credentials`
3. Save it again
4. Re-link it in the workflows

### "Authentication failed" error

**Problem:** The Twilio credentials are incorrect

**Solution:**
1. Double-check the Account SID and Auth Token
2. Make sure there are no extra spaces
3. Get fresh credentials from: https://console.twilio.com/us1/account/keys-credentials/api-keys

### SMS not received

**Problem:** Workflow runs but no SMS arrives

**Solution:**
1. Check Twilio logs: https://console.twilio.com/us1/monitor/logs/sms
2. Verify phone number format includes `+1` country code
3. Check Twilio account balance ($34.66 remaining)
4. For trial accounts, verify the recipient number in Twilio

### Workflow not active

**Problem:** Webhook returns 404 or workflow doesn't run

**Solution:**
1. Open the workflow
2. Check the toggle at top right - should be green (Active)
3. If gray, click it to activate
4. Save the workflow

---

## Visual Checklist

```
✅ Step 1: Open n8n dashboard
   └─ https://remodely.app.n8n.cloud

✅ Step 2: Click "Credentials" in left sidebar

✅ Step 3: Click "Add Credential" button

✅ Step 4: Search for "Twilio" → Select "Twilio API"

✅ Step 5: Fill in form:
   ├─ Name: twilio_credentials
   ├─ SID: YOUR_TWILIO_ACCOUNT_SID
   └─ Token: YOUR_TWILIO_AUTH_TOKEN

✅ Step 6: Click "Test" → Should succeed

✅ Step 7: Click "Save" → Credential created

✅ Step 8: Open "Send SMS" workflow
   └─ https://remodely.app.n8n.cloud/workflow/l1k6ZbtLHKaANPLz

✅ Step 9: Click "Twilio SMS" node

✅ Step 10: Select credential: twilio_credentials

✅ Step 11: Set From: +16028334780

✅ Step 12: Click "Save"

✅ Step 13: Repeat for "Book Appointment" workflow
   └─ https://remodely.app.n8n.cloud/workflow/ppg4X6w1CG02hWDb

✅ Step 14: Test with curl command

✅ Step 15: Check SMS received ✅

✅ DONE! 🎉
```

---

## Quick Copy-Paste Values

**Credential Name:**
```
twilio_credentials
```

**Account SID:**
```
YOUR_TWILIO_ACCOUNT_SID
```

**Auth Token:**
```
YOUR_TWILIO_AUTH_TOKEN
```

**From Phone Number:**
```
+16028334780
```

**Test Command:**
```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+16028334780", "message": "Test from VoiceFlow CRM!"}'
```

---

## After Setup Complete

Once you've verified SMS works:

1. ✅ Your workflows are fully operational
2. ✅ Ready to handle calls from ElevenLabs
3. ✅ Can send automated SMS to customers
4. ✅ Can book appointments with confirmations
5. ✅ Multi-tenant system ready to serve unlimited users

**Next:** Configure ElevenLabs agents to send webhooks to your backend, and the full system will be live!

---

## Need Help?

- **n8n Documentation**: https://docs.n8n.io/integrations/builtin/credentials/twilio/
- **Twilio Console**: https://console.twilio.com
- **SMS Logs**: https://console.twilio.com/us1/monitor/logs/sms
- **Backend Logs**: `npm run dev` in project directory
- **Executions**: https://remodely.app.n8n.cloud/executions

**Estimated Time:** 5-10 minutes
**Difficulty:** Easy ⭐⭐☆☆☆

You got this! 💪
