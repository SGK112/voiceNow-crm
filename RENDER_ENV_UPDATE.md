# 🚀 Update Render Environment Variables

Your local `.env` file has been updated with the real ElevenLabs agent IDs, but Render is still using the old placeholder values. Here's how to update them:

## Step 1: Go to Render Dashboard

1. Go to: https://dashboard.render.com
2. Find your `voiceflow-crm-backend` service
3. Click on it

## Step 2: Update Environment Variables

Click on "Environment" in the left sidebar, then add/update these variables:

```bash
ELEVENLABS_API_KEY=[your_elevenlabs_api_key]
ELEVENLABS_PHONE_NUMBER_ID=phnum_1801k7xb68cefjv89rv10f90qykv
ELEVENLABS_LEAD_GEN_AGENT_ID=agent_1001k9h9ms30fe7ay0w462av0y9v
ELEVENLABS_BOOKING_AGENT_ID=agent_8801k9h9mv3zempsy3aa5njzwst3
ELEVENLABS_COLLECTIONS_AGENT_ID=agent_2101k9h9mwedez1rf2e182pdvnsq
ELEVENLABS_PROMO_AGENT_ID=agent_1801k9h9mxmveytv8a0psq4z756y
ELEVENLABS_SUPPORT_AGENT_ID=agent_6001k9h9myv9f3w8322g06wf8b1e
```

**NEW:** `ELEVENLABS_PHONE_NUMBER_ID` is required for the batch calling API to work.

## Step 3: Save and Deploy

1. Click "Save Changes"
2. Render will automatically redeploy with the new values
3. Wait for deployment to complete (~2-3 minutes)

---

## 📞 How Your CRM's Batch Calling Works

### Your CRM replicates the ElevenLabs batch calling process:

**1. Campaign Creation** (in your CRM UI):
- Name the campaign
- Select an agent (Lead Gen, Booking, etc.)
- Upload CSV with contacts
- Set schedule

**2. Backend Processing** (automatic):
```javascript
// For each contact in the CSV:
await axios.post(
  `https://api.elevenlabs.io/v1/convai/agents/${agentId}/initiate`,
  {
    agent_phone_number_id: assignedPhoneNumberId, // From ElevenLabs dashboard
    customer_phone_number: contact.phone_number,
    // Dynamic variables from CSV
    custom_llm_extra_body: {
      city: contact.city,
      other_dyn_variable: contact.other_dyn_variable
    }
  },
  { headers: { 'xi-api-key': YOUR_ELEVENLABS_API_KEY }}
);
```

**3. Call Tracking**:
- CRM logs each call
- Tracks status, duration, cost
- Stores transcripts via webhook
- Updates lead status automatically

---

## 🔑 Key Differences from Manual ElevenLabs

| Feature | Manual ElevenLabs | Your CRM |
|---------|------------------|----------|
| **Who pays?** | You (your ElevenLabs account) | You (platform owner) |
| **Client access?** | Client needs ElevenLabs account | Client only needs CRM login |
| **Billing** | Direct to ElevenLabs | You charge clients via Stripe |
| **Branding** | ElevenLabs interface | Your white-labeled CRM |
| **Analytics** | Basic ElevenLabs dashboard | Full CRM integration |
| **Lead management** | Separate system | Built-in pipeline |

---

## 💰 Business Model

**Your Platform Costs:**
- ElevenLabs: ~$0.10-0.20 per minute of calling
- Twilio: ~$0.01-0.02 per minute (if used)

**You Charge Clients:**
- Starter: $99/mo (100 minutes included = $1/min markup)
- Professional: $299/mo (500 minutes = $0.60/min)
- Enterprise: $999/mo (2000 minutes = $0.50/min)

**Your Margin:** 200-500% markup on calling costs

---

## 🎯 Next Steps for Testing

1. **Update Render environment variables** (instructions above)
2. **Wait for redeploy**
3. **Test in CRM UI:**
   - Create an agent
   - Add yourself as a lead (+14802555887)
   - Click "Call" button
   - Select agent → Initiate call

4. **Test batch campaign:**
   - Go to Campaigns page
   - Create new campaign
   - Upload CSV with your number
   - Start campaign

The call should work because:
- ✅ You have PRO tier with credits
- ✅ Agent IDs are now correct
- ✅ Your API key has permissions
- ⚠️ You may need to assign a phone number to the agent in ElevenLabs dashboard first

---

## 📱 Assigning Phone Number to Agent (if needed)

If calls still fail with 404:

1. Go to: https://elevenlabs.io/app/conversational-ai
2. Click on "VoiceNow CRM - Lead Generation Agent"
3. Go to "Phone Numbers" tab
4. Click "Add Phone Number"
5. Purchase or assign an existing number
6. Save

This tells ElevenLabs which outbound caller ID to use.

Alternatively, the CRM can use `agent_phone_number_id: null` which uses ElevenLabs' default pool (but may have restrictions).
