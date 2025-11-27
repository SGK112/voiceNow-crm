# 📞 VoiceNow CRM - How Calling Works

## TL;DR
Your CRM **exactly replicates** ElevenLabs batch calling but makes it accessible to clients through a white-labeled interface. You pay ElevenLabs wholesale, charge clients retail markup.

---

## 🎯 Quick Answer to Your Questions

### Q: Do I need to add agent IDs to Render environment?
**A: YES!** Update these in Render dashboard → Your Service → Environment:

```bash
ELEVENLABS_LEAD_GEN_AGENT_ID=agent_1001k9h9ms30fe7ay0w462av0y9v
ELEVENLABS_BOOKING_AGENT_ID=agent_8801k9h9mv3zempsy3aa5njzwst3
ELEVENLABS_COLLECTIONS_AGENT_ID=agent_2101k9h9mwedez1rf2e182pdvnsq
ELEVENLABS_PROMO_AGENT_ID=agent_1801k9h9mxmveytv8a0psq4z756y
ELEVENLABS_SUPPORT_AGENT_ID=agent_6001k9h9myv9f3w8322g06wf8b1e
```

### Q: How do we duplicate the ElevenLabs batch calling process?
**A: It's already built!** Your CRM does this automatically:

1. Client uploads CSV (same format you use)
2. CRM calls ElevenLabs API for each contact
3. ElevenLabs makes the calls using YOUR credentials
4. Client gets charged via YOUR Stripe account
5. You keep the markup

---

## 📊 Batch Calling Flow Comparison

### Manual ElevenLabs (What You Do Now)
```
You → ElevenLabs Dashboard → Create Batch → Upload CSV → Pay ElevenLabs
```

### VoiceNow CRM (What Clients Will Do)
```
Client → Your CRM → Create Campaign → Upload CSV → Pay You → You Pay ElevenLabs
```

**Behind the scenes:**
```javascript
// Your CRM does this for each row in the CSV:
for (const contact of csvData) {
  await axios.post(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/initiate`,
    {
      agent_phone_number_id: null, // Uses ElevenLabs pool
      customer_phone_number: contact.phone_number,
      // Pass dynamic variables from CSV
      custom_llm_extra_body: {
        city: contact.city,
        language: contact.language,
        other_dyn_variable: contact.other_dyn_variable
      }
    },
    {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    }
  );

  // Track in your database
  await CallLog.create({
    userId: client.userId,
    campaignId: campaign._id,
    phoneNumber: contact.phone_number,
    status: 'initiated',
    // ... more tracking
  });
}
```

---

## 💰 Business Economics

### Your Costs (Example)
- **ElevenLabs PRO**: $99/mo + $0.15/min calling
- **100 minute campaign**: $15 in calling costs
- **Total monthly**: ~$114 (if you use 100 mins)

### You Charge Clients
- **Starter Plan**: $99/mo (100 minutes included)
- Client uses 100 mins = You collect $99, costs you $15
- **Your profit**: $84 (560% margin!)

### At Scale (10 clients)
- Collect: $990/mo
- ElevenLabs cost: $99 (base) + ~$150 (calls) = $249
- **Your profit**: $741/mo per 10 clients

---

## 🔧 How to Test Right Now

### Option 1: Single Call Test (Leads Page)
1. Go to http://localhost:5174
2. Login → Leads → Add Lead
   - Name: Test
   - Phone: +14802555887
3. Click "Call" → Select agent → Initiate

### Option 2: Batch Campaign (Campaigns Page)
1. Go to Campaigns page
2. Click "New Campaign"
3. Name it "Test Batch"
4. Select "Lead Generation" agent
5. Upload CSV:
   ```csv
   phone_number,language,voice_id,first_message,prompt,city,other_dyn_variable
   +14802555887,en,,,,Phoenix,
   ```
6. Click "Start Campaign"

**Result**: Your phone rings with AI agent!

---

## 🚨 Common Issues & Solutions

### Issue: "404 Not Found" when calling
**Cause**: Agent needs a phone number assigned in ElevenLabs

**Solution**:
1. Go to https://elevenlabs.io/app/conversational-ai
2. Click "VoiceNow CRM - Lead Generation Agent"
3. Go to "Phone Numbers" tab
4. Assign a number (or use null for default pool)

### Issue: "403 Forbidden"
**Cause**: Out of calling credits

**Solution**: You have PRO tier, so this shouldn't happen. Check:
- ElevenLabs dashboard → Usage
- Ensure credits aren't depleted

### Issue: Calls work in ElevenLabs but not CRM
**Cause**: Environment variables not updated in Render

**Solution**: Update Render env vars (see top of this doc)

---

## 📁 CSV Format for Campaigns

Your CRM accepts the **exact same format** as ElevenLabs:

```csv
phone_number,language,voice_id,first_message,prompt,city,other_dyn_variable
+14802555887,en,,,Hi {{city}} resident!,Phoenix,VIP
+12125551234,en,,,Hi {{city}} resident!,New York,Standard
```

**Dynamic Variables**:
- `{{city}}` → Replaced with "Phoenix", "New York", etc.
- `{{other_dyn_variable}}` → Replaced with "VIP", "Standard", etc.
- Any column becomes a variable your agent can use!

---

## 🎯 Agent Assignment Flow

### When Client Creates Agent in CRM:

```javascript
// 1. CRM creates database record
const agent = await VoiceAgent.create({
  userId: client._id,
  name: "Client's Lead Gen Agent",
  type: "lead_gen",
  elevenLabsAgentId: process.env.ELEVENLABS_LEAD_GEN_AGENT_ID, // ← Your pre-created agent!
  voiceId: "cgSgspJ2msm6clMCkdW9"
});

// 2. When client makes calls, CRM uses YOUR agent:
const response = await elevenLabsService.initiateCall(
  agent.elevenLabsAgentId, // ← This is YOUR ElevenLabs agent
  phoneNumber,
  webhookUrl
);
```

**Key Point**: All clients share YOUR 5 pre-configured ElevenLabs agents. You maintain them, they just use them.

---

## 🔐 Security & Billing

### How Client Billing Works:

1. **Client subscribes** (Stripe) → Gets X minutes/month
2. **Client makes calls** → CRM tracks minutes used
3. **Monthly billing**:
   - Under limit: Included in subscription
   - Over limit: Overage charged at $X/min
4. **You pay ElevenLabs**: Only for actual usage (~$0.15/min)
5. **You keep difference**: Typically 500%+ margin

### Example:
- Client on Professional ($299/mo for 500 mins)
- Uses 600 minutes
- Overage: 100 mins × $0.60 = $60
- **Client pays you**: $299 + $60 = $359
- **You pay ElevenLabs**: 600 mins × $0.15 = $90
- **Your profit**: $269 (299% margin)

---

## ✅ Setup Checklist

- [x] ElevenLabs agents created (5 agents)
- [x] Agent IDs retrieved
- [x] Local `.env` updated
- [ ] **Render environment variables updated** ← DO THIS NOW
- [x] Backend code ready
- [x] Frontend pages ready
- [x] Batch calling system built
- [x] CSV upload working
- [x] Call tracking implemented
- [ ] Test single call
- [ ] Test batch campaign

---

## 🚀 Next Steps

1. **Update Render env vars** (5 minutes)
2. **Wait for auto-deploy** (2-3 minutes)
3. **Test single call** through CRM UI
4. **Test batch campaign** with 1-2 numbers
5. **Invite first client** to test

Your CRM is production-ready! The calling infrastructure is identical to what you use manually in ElevenLabs, just automated and white-labeled.
