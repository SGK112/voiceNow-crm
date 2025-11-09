# VoiceFlow CRM - Development Roadmap

## Current Status

✅ **Completed:**
- AI Chat Agents (Multi-provider: OpenAI, Anthropic, Google)
- Basic Voice Agents (ElevenLabs integration)
- Leads, Deals, Tasks, Campaigns (Basic CRUD)
- Workflows (Automation engine)
- Dashboard (Analytics)
- Basic Billing page

❌ **Needs Development:**
1. Complete Billing/Subscription system with Stripe
2. ElevenLabs Voice Agent detail pages
3. Google Calendar integration
4. Calendar/Scheduling UI
5. Invoicing & Estimating
6. QuickBooks integration
7. Enhanced AI Agent templates

---

## Priority 1: Revenue Generation (Week 1)

### 1.1 Billing & Subscription System
**Why Critical:** Can't make money without billing!

**Frontend:**
- [ ] Pricing cards with plan comparison
- [ ] Stripe Checkout integration
- [ ] Payment method management
- [ ] Usage meters (calls, AI tokens, SMS)
- [ ] Upgrade/downgrade UI
- [ ] Cancellation flow

**Backend:**
- [ ] Stripe webhook handlers (payment success/failed)
- [ ] Subscription creation/update/cancel
- [ ] Usage tracking middleware
- [ ] Invoice generation
- [ ] Proration calculations

**Models:**
```javascript
// backend/models/Subscription.js
{
  userId: ObjectId,
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  plan: String, // starter, professional, enterprise
  status: String, // active, canceled, past_due
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean,
  usage: {
    voiceMinutes: Number,
    aiTokens: Number,
    smsMessages: Number,
    emailsSent: Number,
  }
}
```

**Estimated Time:** 8-10 hours

---

## Priority 2: Voice Agent Enhancement (Week 1-2)

### 2.1 ElevenLabs Voice Agent Detail Page
**Why Critical:** Users can't configure voice agents properly!

**Features:**
- [ ] Agent configuration panel
- [ ] Voice selection from ElevenLabs library
- [ ] Voice preview/playback
- [ ] System prompt editor with variables
- [ ] Dynamic variables picker ({{lead_name}}, {{company}}, etc.)
- [ ] Test call interface
- [ ] Call history for specific agent
- [ ] Performance metrics

**UI Sections:**
1. **Agent Settings**
   - Name, description
   - Voice selection dropdown
   - Play voice sample button

2. **Prompt Engineering**
   - System prompt textarea
   - Variable insertion buttons
   - Prompt templates
   - Examples/suggestions

3. **Voice Library Browser**
   - Grid of available voices
   - Filter by gender, accent, age
   - Preview each voice
   - Favorite voices

4. **Test Interface**
   - Phone number input
   - "Make Test Call" button
   - Call log with transcripts
   - Sentiment analysis

**Backend:**
- [ ] ElevenLabs API: GET /v1/voices (list voices)
- [ ] ElevenLabs API: POST /v1/convai/conversation (test call)
- [ ] Save voice preferences to agent model
- [ ] Dynamic variable replacement engine

**Estimated Time:** 10-12 hours

---

## Priority 3: Calendar & Scheduling (Week 2)

### 3.1 Google Calendar Integration
**Why Critical:** AI agents need to schedule appointments!

**Google OAuth Setup:**
- [ ] Create Google Cloud project
- [ ] Enable Google Calendar API
- [ ] Set up OAuth 2.0 credentials
- [ ] Implement OAuth flow

**Backend:**
- [ ] Google Calendar API integration
- [ ] Event CRUD operations
- [ ] Calendar sync service
- [ ] Webhook for calendar updates
- [ ] Timezone handling

**Frontend:**
- [ ] "Connect Google Calendar" button
- [ ] OAuth flow UI
- [ ] Calendar selection (for multiple calendars)
- [ ] Sync status indicator

**Models:**
```javascript
// backend/models/CalendarIntegration.js
{
  userId: ObjectId,
  provider: 'google',
  accessToken: String,
  refreshToken: String,
  calendarId: String,
  syncEnabled: Boolean,
  lastSyncAt: Date,
}
```

### 3.2 Calendar/Scheduling UI
**Features:**
- [ ] Monthly/Weekly/Daily calendar view
- [ ] Appointment creation modal
- [ ] Drag-and-drop rescheduling
- [ ] Appointment details sidebar
- [ ] Customer info display
- [ ] SMS/Email reminders
- [ ] Color coding by type/status

**Components:**
- FullCalendar.js or react-big-calendar
- Custom event renderer
- Appointment form
- Reminder settings

**Estimated Time:** 12-15 hours

---

## Priority 4: Invoicing & Estimating (Week 3)

### 4.1 Invoicing System
**Why Critical:** Users need to bill their customers!

**Features:**
- [ ] Invoice creation UI
- [ ] Line items (description, qty, rate)
- [ ] Tax calculation
- [ ] Discount application
- [ ] PDF generation
- [ ] Email invoice to customer
- [ ] Payment tracking
- [ ] Recurring invoices

**UI Screens:**
1. **Invoices List**
   - Table with filters (paid/unpaid/overdue)
   - Search by customer/invoice number
   - Quick actions (view, edit, send, delete)

2. **Invoice Editor**
   - Customer selector
   - Line items table
   - Subtotal/Tax/Total calculator
   - Notes/Terms section
   - Save as draft/Send invoice

3. **Invoice View (PDF)**
   - Professional template
   - Company logo/branding
   - Itemized breakdown
   - Payment instructions

**Backend:**
- [ ] Invoice model with line items
- [ ] PDF generation (puppeteer or PDFKit)
- [ ] Email invoice with PDF attachment
- [ ] Payment status tracking
- [ ] Automatic payment reminders

**Models:**
```javascript
// backend/models/Invoice.js
{
  userId: ObjectId,
  customerId: ObjectId, // or leadId
  invoiceNumber: String,
  date: Date,
  dueDate: Date,
  lineItems: [{
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number,
  }],
  subtotal: Number,
  tax: Number,
  discount: Number,
  total: Number,
  status: String, // draft, sent, paid, overdue, canceled
  paidAt: Date,
  notes: String,
  terms: String,
}
```

### 4.2 Estimating System
Similar to invoicing but for quotes/proposals.

**Estimated Time:** 10-12 hours

---

## Priority 5: QuickBooks Integration (Week 4)

### 5.1 QuickBooks OAuth & Sync
**Why Critical:** Users need accounting integration!

**Features:**
- [ ] QuickBooks OAuth flow
- [ ] Sync customers/leads
- [ ] Sync invoices to QuickBooks
- [ ] Sync payments
- [ ] Two-way sync (QB → CRM)
- [ ] Mapping settings (which fields sync)

**Backend:**
- [ ] QuickBooks OAuth setup
- [ ] QuickBooks API integration
- [ ] Sync service (cron job)
- [ ] Conflict resolution
- [ ] Sync logs/history

**Frontend:**
- [ ] "Connect QuickBooks" button
- [ ] Sync settings page
- [ ] Field mapping UI
- [ ] Sync status/logs viewer
- [ ] Manual sync trigger

**Estimated Time:** 15-20 hours

---

## Implementation Order

### Phase 1: Revenue (Week 1)
1. Build Stripe billing system - **CRITICAL**
2. Usage tracking
3. Upgrade/downgrade paths

### Phase 2: Voice (Week 1-2)
4. Voice Agent detail page
5. Voice library browser
6. Prompt engineering UI

### Phase 3: Scheduling (Week 2)
7. Google Calendar OAuth
8. Calendar sync service
9. Calendar UI with appointments

### Phase 4: Business Tools (Week 3)
10. Invoicing system
11. Estimating system
12. PDF generation

### Phase 5: Integrations (Week 4)
13. QuickBooks OAuth
14. QuickBooks sync

---

## Quick Wins (Can Do Now)

### Fix Immediate Issues:
- [x] AI Agent modal styling
- [ ] Voice Agent detail page (blank page fix)
- [ ] Template card click handlers
- [ ] Add "Calendar" to sidebar navigation
- [ ] Add "Invoices" to sidebar navigation

### Enhancement Opportunities:
- [ ] Better error messages
- [ ] Loading states
- [ ] Empty states with illustrations
- [ ] Onboarding tour
- [ ] Help documentation inline

---

## Tech Stack Decisions

### Billing:
- **Stripe Elements** for payment forms
- **Stripe Checkout** for subscription flow
- **Stripe Webhooks** for payment events

### Calendar:
- **react-big-calendar** or **FullCalendar**
- **Google Calendar API** for sync
- **date-fns** for date manipulation

### PDF Generation:
- **PDFKit** (lightweight) or **Puppeteer** (HTML to PDF)
- **React-PDF** for preview

### QuickBooks:
- **QuickBooks Online API**
- **OAuth 2.0** for authentication

---

## Next Steps (Immediate)

1. **Build comprehensive Billing page** (Now)
   - Pricing comparison
   - Stripe Checkout integration
   - Usage meters

2. **Fix Voice Agent detail page** (Next)
   - Show agent configuration
   - Voice selection
   - Test call interface

3. **Add Calendar navigation** (Quick)
   - Add to sidebar
   - Create placeholder page
   - Plan Google Calendar integration

---

## Estimated Total Time

- **Phase 1 (Billing)**: 8-10 hours
- **Phase 2 (Voice)**: 10-12 hours
- **Phase 3 (Calendar)**: 12-15 hours
- **Phase 4 (Invoicing)**: 10-12 hours
- **Phase 5 (QuickBooks)**: 15-20 hours

**Total: 55-69 hours** (7-9 full work days)

---

## Success Metrics

### By End of Week 1:
- ✅ Users can upgrade to paid plans
- ✅ Stripe payments processing
- ✅ Usage tracking working

### By End of Week 2:
- ✅ Voice agents fully configurable
- ✅ Users can schedule appointments
- ✅ Calendar syncing with Google

### By End of Week 3:
- ✅ Users can create/send invoices
- ✅ Invoices generating PDFs
- ✅ Payment tracking

### By End of Week 4:
- ✅ QuickBooks syncing
- ✅ Complete business workflow
- ✅ Ready for production customers

---

**Let's start building! 🚀**

Next: Comprehensive Billing page with Stripe Checkout
