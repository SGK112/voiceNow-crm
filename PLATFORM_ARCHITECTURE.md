# VoiceFlow CRM - Platform-as-a-Service Architecture

## Business Model ✅

**You provide everything. Users just pay and use.**

### What Users Get:
- ✅ AI voice agents (using YOUR ElevenLabs account)
- ✅ Phone calling capability (using YOUR Twilio account)
- ✅ Email automation (using YOUR SMTP/SendGrid)
- ✅ n8n workflows (using YOUR n8n instance)
- ✅ Pre-built template agents
- ✅ Custom agent creation
- ✅ Knowledge bases & scripts
- ✅ Guardrails & compliance tools

### What Users Pay:
- **Trial**: $0 (14 days, 10 calls, 1 agent)
- **Starter**: $99/month (100 calls, 1 agent)
- **Professional**: $299/month (500 calls, 5 agents)
- **Enterprise**: $999/month (Unlimited calls & agents)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    VoiceFlow Platform                    │
│                                                          │
│  ┌────────────────┐                                     │
│  │   YOUR APIs    │                                     │
│  │  (from .env)   │                                     │
│  ├────────────────┤                                     │
│  │ ElevenLabs     │ ──┐                                │
│  │ Twilio         │   │                                │
│  │ SendGrid       │   │  Shared across                 │
│  │ n8n            │   │  all users                     │
│  └────────────────┘   │                                │
│                       │                                 │
│  ┌────────────────────▼──────────────┐                 │
│  │     Platform Service Layer        │                 │
│  │   (elevenLabsService, etc.)       │                 │
│  └────────────────┬──────────────────┘                 │
│                   │                                     │
│  ┌────────────────▼──────────────────┐                 │
│  │      Usage Tracking & Limits      │                 │
│  │  - Track calls per user           │                 │
│  │  - Enforce subscription limits    │                 │
│  │  - Bill based on usage            │                 │
│  └────────────────┬──────────────────┘                 │
│                   │                                     │
│  ┌────────────────▼──────────────────┐                 │
│  │         User Accounts              │                 │
│  │  User 1: Starter Plan (10 calls)  │                 │
│  │  User 2: Pro Plan (250 calls)     │                 │
│  │  User 3: Enterprise (∞ calls)     │                 │
│  └───────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

---

## What Changed

### Before (Multi-Tenant Model) ❌
- Each user needed their own ElevenLabs API key
- Users had to configure Twilio, SendGrid, etc.
- Users managed their own API accounts
- Complex setup, high barrier to entry

### After (Platform Model) ✅
- **One** ElevenLabs account (yours) for all users
- **One** Twilio account (yours) for all users
- **One** email service (yours) for all users
- Users just sign up and start using
- **Zero configuration required**

---

## Code Changes

### 1. Agent Creation ([agentController.js](backend/controllers/agentController.js))

**Before:**
```javascript
// Get user's API key
const user = await User.findById(req.user._id).select('+apiKeys.elevenlabs');
if (!user.apiKeys?.elevenlabs) {
  return res.status(400).json({ message: 'Add your API key first' });
}
const elevenLabsApiKey = decrypt(user.apiKeys.elevenlabs);
const userElevenLabsService = new ElevenLabsService(elevenLabsApiKey);
```

**After:**
```javascript
// Use platform credentials (from .env)
const elevenLabsService = new ElevenLabsService();

// Check subscription limits
const agentCount = await VoiceAgent.countDocuments({ userId: req.user._id });
const planLimits = { trial: 1, starter: 1, professional: 5, enterprise: Infinity };
if (agentCount >= planLimits[user.plan]) {
  return res.status(403).json({ message: 'Upgrade to create more agents' });
}
```

### 2. Call Initiation ([callController.js](backend/controllers/callController.js))

**Before:**
```javascript
// Get user's API key
const user = await User.findById(req.user._id).select('+apiKeys.elevenlabs');
if (!user.apiKeys?.elevenlabs) {
  return res.status(400).json({ message: 'Add your API key first' });
}
const elevenLabsApiKey = decrypt(user.apiKeys.elevenlabs);
const elevenLabsService = new ElevenLabsService(elevenLabsApiKey);
```

**After:**
```javascript
// Use platform credentials (from .env)
const elevenLabsService = new ElevenLabsService();

// Check monthly call limits
const callsThisMonth = await CallLog.countDocuments({
  userId: req.user._id,
  createdAt: { $gte: startOfMonth }
});
const planLimits = { trial: 10, starter: 100, professional: 500, enterprise: Infinity };
if (callsThisMonth >= planLimits[user.plan]) {
  return res.status(403).json({ message: 'Upgrade to make more calls' });
}
```

### 3. Settings Page ([Settings.jsx](frontend/src/pages/Settings.jsx))

**Before:**
- Had API Keys section
- Users entered ElevenLabs, Twilio, SendGrid keys
- Complex onboarding

**After:**
- **Removed** API Keys section entirely
- Only shows company info, phone numbers, team members
- Simple, clean interface

---

## Subscription Limits

### Trial Plan (Free, 14 days)
```javascript
{
  agents: 1,
  calls: 10,
  duration: '14 days',
  features: ['Basic agents', 'Email support']
}
```

### Starter Plan ($99/month)
```javascript
{
  agents: 1,
  calls: 100,
  features: ['1 custom agent', 'Basic templates', 'Email support']
}
```

### Professional Plan ($299/month)
```javascript
{
  agents: 5,
  calls: 500,
  features: [
    '5 custom agents',
    'All templates',
    'Priority support',
    'Advanced workflows',
    'Knowledge bases'
  ]
}
```

### Enterprise Plan ($999/month)
```javascript
{
  agents: Infinity,
  calls: Infinity,
  features: [
    'Unlimited agents',
    'Unlimited calls',
    'Dedicated support',
    'Custom workflows',
    'White-label option',
    'API access'
  ]
}
```

---

## Usage Tracking

### Per-User Metrics:
- **Call count** (monthly)
- **Agent count** (total)
- **Call duration** (total minutes)
- **Lead count** (total)
- **Email sends** (monthly)

### Enforcement Points:
1. **Agent Creation**: Check agent count before creating
2. **Call Initiation**: Check monthly call limit before making call
3. **Dashboard**: Show usage vs. limits
4. **Billing**: Track for invoicing

---

## Environment Variables Required

```env
# Platform Credentials (YOU provide these)
ELEVENLABS_API_KEY=your_elevenlabs_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Email Service (YOU provide this)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# n8n (YOU host this)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/

# Stripe (for billing)
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Database & Auth
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

**Users provide NOTHING. All config is on your side.**

---

## User Journey (New Model)

### Step 1: Sign Up
```
User visits voiceflow-crm.com
  → Clicks "Sign Up"
  → Enters: email, company, password
  → Gets 14-day trial automatically
  → NO API KEY REQUIRED ✅
```

### Step 2: Create Agent
```
User clicks "Create Agent"
  → Selects type (Lead Gen, Booking, etc.)
  → Customizes script (optional)
  → Clicks "Create"
  → Agent created in YOUR ElevenLabs account ✅
  → User sees agent immediately
```

### Step 3: Make Calls
```
User goes to Leads
  → Clicks "Call" on a lead
  → Selects agent
  → Click "Initiate Call"
  → Call made using YOUR Twilio + ElevenLabs ✅
  → Call log created
  → Usage tracked for billing
```

### Step 4: View Usage & Upgrade
```
Dashboard shows:
  - Calls this month: 8 / 10
  - Agents: 1 / 1
  - "Upgrade to Professional" CTA

User clicks "Upgrade"
  → Stripe checkout
  → Plan upgraded
  → New limits: 500 calls, 5 agents ✅
```

---

## Revenue Model

### Monthly Recurring Revenue (MRR):
- 100 Starter users × $99 = **$9,900/month**
- 50 Professional users × $299 = **$14,950/month**
- 10 Enterprise users × $999 = **$9,990/month**
- **Total MRR: $34,840/month**

### Your Costs:
- ElevenLabs: ~$0.05/minute
- Twilio: ~$0.02/minute + $1/number
- Server hosting: ~$100/month
- **Total costs: ~$2,000/month** (at scale)

### Profit Margin: **~94%** 💰

---

## Scaling Strategy

### Phase 1: Launch (0-100 users)
- Single ElevenLabs account
- Shared Twilio numbers
- Basic templates
- Manual onboarding

### Phase 2: Growth (100-1,000 users)
- Multiple ElevenLabs accounts for redundancy
- Dedicated phone numbers for Pro/Enterprise
- Advanced templates & workflows
- Automated onboarding
- Self-service billing

### Phase 3: Scale (1,000+ users)
- Load balancing across multiple ElevenLabs accounts
- Geographic phone number distribution
- White-label for Enterprise
- API for custom integrations
- Partner program

---

## Template Agents (Your Selling Points)

### 1. Lead Generation Agent
```javascript
{
  name: "Sarah - Lead Qualifier",
  voice: "Rachel (Professional Female)",
  script: "Hi! I'm Sarah calling from [Company]. I wanted to reach out about...",
  features: [
    "Qualification questions",
    "Budget discussion",
    "Timeline assessment",
    "Next steps scheduling"
  ]
}
```

### 2. Appointment Booking Agent
```javascript
{
  name: "Michael - Scheduler",
  voice: "Adam (Professional Male)",
  script: "Hi! I'm Michael. I'd love to help you schedule...",
  features: [
    "Calendar integration",
    "Availability checking",
    "Confirmation emails",
    "Reminder calls"
  ]
}
```

### 3. Collections Agent
```javascript
{
  name: "David - Collections",
  voice: "Josh (Friendly Male)",
  script: "Hi, this is David calling about your account...",
  features: [
    "Payment reminders",
    "Payment plan setup",
    "Compliance guardrails",
    "Escalation handling"
  ]
}
```

### 4. Customer Service Agent
```javascript
{
  name: "Emily - Support",
  voice: "Bella (Friendly Female)",
  script: "Hi! I'm Emily from support. How can I help...",
  features: [
    "FAQ answering",
    "Issue logging",
    "Escalation to human",
    "Follow-up scheduling"
  ]
}
```

### 5. Sales/Promo Agent
```javascript
{
  name: "Alex - Sales",
  voice: "Antoni (Energetic Male)",
  script: "Hi! I'm Alex. I wanted to tell you about...",
  features: [
    "Product pitches",
    "Objection handling",
    "Limited-time offers",
    "Order taking"
  ]
}
```

---

## Custom Workflows (Future Revenue)

### Social Media Agent Workflow
- Monitor mentions → Voice call to engage → Follow-up email
- **Price: +$50/month**

### Project Manager Agent
- Check-in calls → Status updates → Report generation
- **Price: +$100/month**

### Estimator Agent
- Qualification → Site visit scheduling → Estimate delivery
- **Price: +$75/month**

---

## Competitive Advantages

### vs. DIY Solutions:
- ✅ No API management
- ✅ No infrastructure setup
- ✅ Instant start
- ✅ Pre-built templates

### vs. Other Platforms:
- ✅ Industry-specific (contractors/service businesses)
- ✅ Voice + Email + Workflows integrated
- ✅ Knowledge bases for specialized industries
- ✅ Custom workflow builder

---

## Next Steps for Launch

### Technical:
- [x] Remove user API key requirements
- [x] Add subscription limits
- [x] Remove Settings API key section
- [ ] Add usage dashboard
- [ ] Add upgrade flow
- [ ] Stripe integration
- [ ] Template agent library

### Marketing:
- [ ] Landing page emphasizing "zero setup"
- [ ] Video demos of each template agent
- [ ] Case studies from contractors
- [ ] Free trial CTA everywhere
- [ ] "No credit card required" messaging

### Sales:
- [ ] Pricing page with clear limits
- [ ] Comparison table (Trial vs Starter vs Pro vs Enterprise)
- [ ] ROI calculator (calls automated = hours saved)
- [ ] Industry-specific landing pages

---

## Summary

**Your Platform = Plug & Play AI Voice Solution**

✅ Users sign up → Immediately start making calls
✅ YOU handle all APIs, infrastructure, complexity
✅ Users customize scripts, guardrails, knowledge bases
✅ You track usage and bill monthly
✅ High margins, scalable, contractor-focused

**Perfect for contractors who want AI calling without the tech headaches!** 🎯
