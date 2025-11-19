# Integrations & Credentials Management Architecture

## Current Problem

Users are being asked for API keys when configuring nodes:
- **AI Decision Node** → Asks for API key (should use YOUR backend AI)
- **AI Intent Node** → Asks for API key (should use YOUR backend AI)
- **AI Extract Node** → Asks for API key (should use YOUR backend AI)
- **AI Generator Node** → Asks for API key (should use YOUR backend AI)
- **Calendar Node** → Asks for API key (should use saved OAuth)
- **Code Node** → Asks for API key

## The Solution

### 1. **Two Types of Services**

#### A. Backend-Provided Services (No User Keys Needed)
These should use YOUR configured API keys transparently:
- ✅ Claude API (you have `ANTHROPIC_API_KEY`)
- ✅ OpenAI API (you have `OPENAI_API_KEY`)
- ✅ Google Gemini (you have `GOOGLE_AI_API_KEY`)
- ✅ ElevenLabs (you have `ELEVENLABS_API_KEY`)
- ✅ Twilio (you have `TWILIO_*` credentials)

**How it works:**
- User configures AI Decision node
- Frontend sends request to YOUR backend: `POST /api/ai/decision`
- Backend uses YOUR Claude/OpenAI key
- Returns result to user
- User never sees or needs API key

#### B. User-Connected Services (OAuth/API Keys)
These require user to connect their own accounts:
- Google Calendar (OAuth 2.0)
- Google Sheets (OAuth 2.0)
- QuickBooks (OAuth 2.0)
- Shopify (OAuth 2.0)
- Stripe (API Key)
- Custom Webhooks (Headers/Auth)

**How it works:**
- User goes to "Integrations" page
- Clicks "Connect Google Calendar"
- OAuth flow → User authorizes
- Backend saves access/refresh tokens encrypted
- When building workflow, Calendar node auto-loads their connected account

---

## Proposed Architecture

### Database Schema

```javascript
// backend/models/Integration.js
const integrationSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true },
  service: {
    type: String,
    enum: ['google_calendar', 'google_sheets', 'quickbooks', 'shopify', 'stripe', 'custom_webhook'],
    required: true
  },

  // OAuth services
  credentials: {
    accessToken: String,      // Encrypted
    refreshToken: String,     // Encrypted
    expiresAt: Date,
    scope: [String],
    accountEmail: String,     // User's connected email
    accountName: String       // Display name
  },

  // API Key services (like Stripe)
  apiKey: String,             // Encrypted

  // Custom webhook
  customConfig: {
    url: String,
    method: String,
    headers: Map,
    authType: String          // 'none', 'bearer', 'basic', 'api_key'
  },

  status: {
    type: String,
    enum: ['active', 'expired', 'error', 'disconnected'],
    default: 'active'
  },

  lastSyncedAt: Date,
  lastError: String,

  createdAt: Date,
  updatedAt: Date
});

// Index for fast lookup
integrationSchema.index({ userId: 1, service: 1 });
```

### Backend API Routes

```javascript
// backend/routes/integrations.js

// List user's connected integrations
GET /api/integrations
// Response: [{ service: 'google_calendar', status: 'active', accountEmail: 'user@gmail.com' }, ...]

// Start OAuth flow
GET /api/integrations/google-calendar/connect
// Redirects to Google OAuth consent screen

// OAuth callback
GET /api/integrations/google-calendar/callback?code=...
// Exchanges code for tokens, saves to DB, redirects to frontend

// Disconnect integration
DELETE /api/integrations/:id

// Test integration
POST /api/integrations/:id/test
// Tests if credentials still work

// Refresh expired token
POST /api/integrations/:id/refresh
```

### Backend AI Proxy Routes

```javascript
// backend/routes/ai.js

// AI Decision (uses YOUR Claude/OpenAI)
POST /api/ai/decision
Body: { prompt, options, context }
// Uses process.env.ANTHROPIC_API_KEY

// AI Intent Detection
POST /api/ai/intent
Body: { text, intents }
// Uses YOUR AI key

// AI Extract
POST /api/ai/extract
Body: { text, schema }

// AI Generate
POST /api/ai/generate
Body: { prompt, type }
```

### Frontend Integrations Page

```
/app/integrations

┌─────────────────────────────────────────────────────────┐
│  🔌 Integrations                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Connected Services (3)                                  │
│  ┌────────────────────────────────────────────┐         │
│  │ 📅 Google Calendar                          │         │
│  │ Connected as: help.remodely@gmail.com       │         │
│  │ [Disconnect]  [Test Connection]             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │ 📊 Google Sheets                            │         │
│  │ Connected as: help.remodely@gmail.com       │         │
│  │ [Disconnect]  [Test Connection]             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │ 💳 Stripe                                   │         │
│  │ API Key: sk_live_••••••••••••1234           │         │
│  │ [Disconnect]  [Update Key]                  │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  Available Services (5)                                  │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 📚 QuickBooks    │  │ 🛍️  Shopify       │            │
│  │ [Connect]        │  │ [Connect]        │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 📧 SendGrid      │  │ 🔗 Custom        │            │
│  │ [Connect]        │  │ [Configure]      │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Updated Node Configuration

#### AI Decision Node (NEW - No API Key)

```jsx
<div className="config-section">
  <label>Decision Prompt</label>
  <textarea
    value={formData.decisionPrompt}
    onChange={e => setFormData({...formData, decisionPrompt: e.target.value})}
    placeholder="Analyze the conversation and decide next action..."
  />

  <label>Options</label>
  {formData.options?.map((opt, i) => (
    <input key={i} value={opt} onChange={...} />
  ))}

  {/* NO API KEY FIELD - Uses backend */}
  <p className="text-xs text-muted">Powered by Claude AI</p>
</div>
```

#### Calendar Node (NEW - Uses Saved Connection)

```jsx
<div className="config-section">
  <label>Calendar Account</label>
  <select
    value={formData.integrationId}
    onChange={e => setFormData({...formData, integrationId: e.target.value})}
  >
    {userIntegrations
      .filter(i => i.service === 'google_calendar')
      .map(i => (
        <option key={i._id} value={i._id}>
          {i.accountEmail}
        </option>
      ))
    }
  </select>

  {userIntegrations.filter(i => i.service === 'google_calendar').length === 0 && (
    <div className="alert">
      <p>No calendar connected</p>
      <button onClick={() => navigate('/app/integrations')}>
        Connect Google Calendar
      </button>
    </div>
  )}

  <label>Event Duration (minutes)</label>
  <input type="number" value={formData.duration} />
</div>
```

---

## Implementation Plan

### Phase 1: Backend Infrastructure
1. Create `Integration` model
2. Create `/api/integrations` routes
3. Implement Google Calendar OAuth flow
4. Create `/api/ai/*` proxy routes
5. Add encryption for tokens/keys

### Phase 2: Frontend Integrations Page
1. Create `/app/integrations` page
2. Build OAuth connection flow
3. Display connected services
4. Test/disconnect functionality

### Phase 3: Update Nodes
1. Remove API key fields from AI nodes
2. Update AI nodes to call `/api/ai/*` instead
3. Update Calendar node to use saved integrations
4. Update other OAuth nodes (Sheets, QuickBooks, etc.)

### Phase 4: Additional Services
1. Add more OAuth providers (QuickBooks, Shopify)
2. Add API key services (Stripe, SendGrid)
3. Add custom webhook configuration

---

## Benefits

### For Users
✅ **No AI API keys needed** - Use your built-in AI
✅ **Connect once, use everywhere** - OAuth flows saved
✅ **Faster workflow building** - No repeated auth
✅ **Secure** - Credentials encrypted in database
✅ **Easy management** - One place to view all connections

### For You (Platform)
✅ **Control AI usage** - Can rate limit, monitor, charge
✅ **Better UX** - Users don't need technical knowledge
✅ **Monetization** - Can charge for AI calls, premium integrations
✅ **Security** - Centralized credential management
✅ **Analytics** - Track which services users connect

---

## Security Considerations

1. **Encryption**
   - Use `crypto.createCipher` with secret key
   - Encrypt `accessToken`, `refreshToken`, `apiKey` fields
   - Decrypt only when needed for API calls

2. **Token Refresh**
   - Automatically refresh OAuth tokens before expiry
   - Background job checks `expiresAt` every hour
   - Updates tokens transparently

3. **Rate Limiting**
   - Limit AI API calls per user (e.g., 1000/day)
   - Prevent abuse of your API keys

4. **Scopes**
   - Request minimal OAuth scopes needed
   - Google Calendar: `calendar.events` only

---

## Example User Flow

### Connecting Google Calendar

1. User clicks "VoiceFlow Builder" → New Workflow
2. Adds Calendar node
3. Node shows: "No calendar connected. [Connect Now]"
4. Clicks "Connect Now" → Redirects to `/app/integrations`
5. Clicks "Connect" on Google Calendar
6. OAuth flow → Google consent screen
7. User authorizes
8. Redirects back → Shows "Connected as user@gmail.com"
9. Returns to workflow builder
10. Calendar node now shows dropdown with their account
11. Configures event duration, saves
12. Done! No API key needed

### Using AI Decision

1. User adds AI Decision node
2. Configures prompt: "Decide if customer needs sales or support"
3. Adds options: ["Transfer to Sales", "Transfer to Support", "Handle with AI"]
4. Saves node
5. Tests workflow → Backend calls YOUR Claude API
6. Works! User never needed API key

---

## Technical Details

### OAuth Flow Implementation

```javascript
// backend/controllers/integrationController.js

export const connectGoogleCalendar = async (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/integrations/google-calendar/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: req.user._id.toString() // Pass user ID
  });

  res.redirect(authUrl);
};

export const googleCalendarCallback = async (req, res) => {
  const { code, state: userId } = req.query;

  const oauth2Client = new google.auth.OAuth2(...);
  const { tokens } = await oauth2Client.getToken(code);

  // Get user's email
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { data } = await calendar.calendarList.list();
  const primaryCalendar = data.items.find(c => c.primary);

  // Save to database (encrypted)
  await Integration.create({
    userId,
    service: 'google_calendar',
    credentials: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: new Date(tokens.expiry_date),
      accountEmail: primaryCalendar.summary
    },
    status: 'active'
  });

  // Redirect back to integrations page
  res.redirect(`${process.env.FRONTEND_URL}/app/integrations?success=google_calendar`);
};
```

### AI Proxy Implementation

```javascript
// backend/controllers/aiController.js

export const aiDecision = async (req, res) => {
  const { prompt, options, context } = req.body;

  // Use YOUR Claude API key
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `${context}\n\n${prompt}\n\nOptions: ${options.join(', ')}\n\nReturn only the selected option.`
    }]
  });

  // Track usage for billing
  await AIUsage.create({
    userId: req.user._id,
    type: 'decision',
    tokens: message.usage.total_tokens,
    cost: calculateCost(message.usage.total_tokens)
  });

  res.json({
    decision: message.content[0].text,
    tokens: message.usage.total_tokens
  });
};
```

---

## Next Steps

1. **Review this architecture** - Does it match your vision?
2. **Prioritize services** - Which integrations are most important?
3. **Start implementation** - Begin with Phase 1 (backend)?

Would you like me to start building this system?
