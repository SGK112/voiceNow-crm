# VoiceFlow CRM - Complete Frontend Testing Guide

## Overview

This guide will walk you through testing every feature of your VoiceFlow CRM from the frontend, step by step, as a user would experience it.

---

## Prerequisites

### 1. Start the Application

**Terminal 1 - Backend:**
```bash
cd /Users/homepc/voiceflow-crm
npm run server
```

**Terminal 2 - Frontend:**
```bash
cd /Users/homepc/voiceflow-crm/frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5174
- Backend API: http://localhost:5001/api

### 2. Get Test API Keys (Optional but Recommended)

For full AI agent testing, you'll need at least one AI provider API key:

**OpenAI (Easiest to get):**
1. Go to https://platform.openai.com/api-keys
2. Sign up (free $5 credit)
3. Create API key
4. Add to `.env`: `OPENAI_API_KEY=sk-proj-...`
5. Restart backend server

---

## Testing Flow: Complete User Journey

### Phase 1: Authentication & Setup

#### Test 1.1: Sign Up
1. Navigate to http://localhost:5174/signup
2. Fill in the form:
   - **Name**: Test User
   - **Email**: test@example.com
   - **Password**: Test123456
   - **Plan**: Professional ($99/mo)
3. Click "Sign Up"
4. **Expected**: Redirected to `/app/dashboard`
5. **Verify**: Dashboard loads with welcome message

#### Test 1.2: Logout & Login
1. Click on your name in the header → "Logout"
2. **Expected**: Redirected to `/login`
3. Enter credentials:
   - **Email**: test@example.com
   - **Password**: Test123456
4. Click "Sign In"
5. **Expected**: Back to dashboard

---

### Phase 2: AI Chat Agents (NEW!)

#### Test 2.1: View Templates
1. Click "AI Chat Agents" in sidebar (🤖 Bot icon)
2. **Expected**: See 5 pre-built templates:
   - 🎧 Customer Support Bot
   - 💰 Sales Assistant
   - 📋 Lead Qualification Bot
   - ❓ FAQ Bot
   - 📅 Appointment Scheduler

#### Test 2.2: Create AI Agent from Template
1. Click on "🎧 Customer Support Bot" template
2. **Expected**: Create modal opens with pre-filled data
3. Review the form:
   - Name: "Customer Support Bot"
   - Type: Chat
   - Provider: OpenAI
   - Model: gpt-3.5-turbo
   - System Prompt: Pre-filled helpful prompt
4. Click "Create AI Agent"
5. **Expected**:
   - Success message
   - Agent appears in "Your AI Agents" section
   - Status: "draft"

#### Test 2.3: Create Custom AI Agent
1. Click "+ Create AI Agent" button
2. Fill in form:
   - **Name**: My Custom Assistant
   - **Type**: Chat
   - **Provider**: OpenAI (or Anthropic/Google if you have keys)
   - **Model**: gpt-3.5-turbo
   - **System Prompt**: "You are a friendly assistant for a real estate company. Help customers find their dream home."
   - **Temperature**: 0.8 (adjust slider)
   - **Max Tokens**: 1500
   - **Capabilities**: Check "Function Calling"
3. Click "Create AI Agent"
4. **Expected**: New agent created successfully

#### Test 2.4: Test Chat with AI Agent
1. Find your created agent in the list
2. Click "Test Chat" button
3. **Expected**: Chat modal opens
4. Type a test message: "Hello, can you help me find a home?"
5. Press "Send"
6. **Expected** (if API key is set):
   - Loading animation (3 dots)
   - AI response appears in chat
   - Response matches your system prompt personality
7. **Expected** (if no API key):
   - Error message: "OpenAI API key not configured"
8. Continue conversation:
   - "What's your refund policy?"
   - "How can I contact support?"
9. **Verify**: Chat history shows all messages

#### Test 2.5: Deploy AI Agent
1. Click "Deploy" button on your agent
2. **Expected**:
   - Status changes to "active"
   - Button changes to "Pause"
   - Success message

#### Test 2.6: Pause AI Agent
1. Click "Pause" button on active agent
2. **Expected**: Status changes to "paused"

#### Test 2.7: Delete AI Agent
1. Click "Delete" button on any agent
2. **Expected**: Confirmation dialog
3. Click "OK"
4. **Expected**: Agent removed from list

---

### Phase 3: Voice Agents (ElevenLabs)

#### Test 3.1: View Voice Agents
1. Click "Voice Agents" in sidebar (📞 Phone icon)
2. **Expected**: See your configured ElevenLabs agents:
   - Lead Generation Agent
   - Booking Agent
   - Collections Agent
   - Promotional Agent
   - Support Agent

#### Test 3.2: View Agent Details
1. Click on any agent card
2. **Expected**: Agent detail page with:
   - Agent configuration
   - Call history
   - Performance metrics

---

### Phase 4: Leads Management

#### Test 4.1: Create Lead
1. Click "Leads" in sidebar
2. Click "+ Add Lead"
3. Fill in form:
   - **Name**: John Smith
   - **Email**: john@example.com
   - **Phone**: +1234567890
   - **Company**: ABC Corp
   - **Source**: Website
   - **Status**: New
   - **Tags**: hot-lead, interested
4. Click "Save Lead"
5. **Expected**: Lead appears in list

#### Test 4.2: View & Edit Lead
1. Click on "John Smith" lead
2. **Expected**: Lead detail panel opens
3. Edit phone number to: +1987654321
4. Click "Update Lead"
5. **Expected**: Lead updated successfully

#### Test 4.3: Call Lead (Integration Test)
1. In lead detail, click "Call Lead"
2. Select agent: "Lead Generation Agent"
3. Click "Initiate Call"
4. **Expected**:
   - Call initiated
   - Redirected to Calls page
   - New call record appears

#### Test 4.4: Delete Lead
1. In leads list, click delete icon (🗑️) on a lead
2. Confirm deletion
3. **Expected**: Lead removed

---

### Phase 5: Campaigns

#### Test 5.1: Create Campaign
1. Click "Campaigns" in sidebar
2. Click "+ New Campaign"
3. Fill in form:
   - **Name**: Summer Promotion
   - **Type**: Outbound Calls
   - **Agent**: Lead Generation Agent
   - **Status**: Draft
   - **Start Date**: Today
   - **End Date**: +7 days
4. Click "Create Campaign"
5. **Expected**: Campaign created

#### Test 5.2: Add Leads to Campaign
1. Open campaign detail
2. Click "Add Leads"
3. Select leads from list
4. Click "Add Selected"
5. **Expected**: Leads added to campaign

#### Test 5.3: Start Campaign
1. Click "Start Campaign"
2. **Expected**:
   - Status changes to "Active"
   - Calls begin processing

---

### Phase 6: Workflows (Automation)

#### Test 6.1: View Workflow Templates
1. Click "Workflows" in sidebar
2. Click "Browse Templates"
3. **Expected**: See workflow templates:
   - Welcome new leads
   - Follow-up after call
   - Lead nurture sequence
   - Appointment reminders

#### Test 6.2: Create Workflow from Scratch
1. Click "+ Create Workflow"
2. Fill in form:
   - **Name**: Welcome SMS
   - **Trigger**: Lead Created
3. Add action:
   - **Type**: Send SMS
   - **To**: {{lead_phone}}
   - **Message**: "Welcome {{lead_name}}! Thanks for your interest."
4. Click "Save Workflow"
5. **Expected**: Workflow created

#### Test 6.3: Enable Workflow
1. Toggle workflow to "Active"
2. **Expected**: Workflow status = Active

#### Test 6.4: Test Workflow
1. Go to Leads page
2. Create a new lead with valid phone number
3. **Expected** (if Twilio configured):
   - SMS sent to lead
   - Check workflow execution logs
4. **Expected** (if Twilio not configured):
   - Workflow logged but SMS not sent

---

### Phase 7: Deals Pipeline

#### Test 7.1: Create Deal
1. Click "Deals" in sidebar
2. Click "+ New Deal"
3. Fill in form:
   - **Title**: New Home Sale
   - **Value**: $250,000
   - **Stage**: Qualification
   - **Lead**: John Smith
   - **Close Date**: +30 days
4. Click "Create Deal"
5. **Expected**: Deal appears in pipeline

#### Test 7.2: Move Deal Between Stages
1. Drag deal card from "Qualification" to "Proposal"
2. **Expected**: Deal moves smoothly
3. Click "Save Changes" if prompted
4. **Expected**: Deal stage updated

#### Test 7.3: Update Deal Value
1. Click on deal card
2. Edit value to: $275,000
3. Click "Update"
4. **Expected**:
   - Deal value updated
   - Pipeline total recalculates

---

### Phase 8: Tasks

#### Test 8.1: Create Task
1. Click "Tasks" in sidebar
2. Click "+ New Task"
3. Fill in form:
   - **Title**: Follow up with John
   - **Description**: Call to discuss proposal
   - **Due Date**: Tomorrow
   - **Priority**: High
   - **Type**: Call
   - **Related Lead**: John Smith
4. Click "Create Task"
5. **Expected**: Task appears in "Pending" list

#### Test 8.2: Complete Task
1. Check checkbox on task
2. **Expected**: Task moves to "Completed" section

#### Test 8.3: Filter Tasks
1. Click filter: "High Priority Only"
2. **Expected**: Only high priority tasks shown
3. Click filter: "Due Today"
4. **Expected**: Only today's tasks shown

---

### Phase 9: Calls History

#### Test 9.1: View Call Records
1. Click "Calls" in sidebar
2. **Expected**: List of all calls
3. **Verify columns**:
   - Date/Time
   - Lead Name
   - Agent Used
   - Duration
   - Status
   - Sentiment

#### Test 9.2: View Call Details
1. Click on a call record
2. **Expected**:
   - Call transcript (if available)
   - Call recording player (if available)
   - Sentiment analysis
   - Key points extracted

#### Test 9.3: Filter Calls
1. Use date range picker
2. **Expected**: Calls filtered by date
3. Filter by agent
4. **Expected**: Only calls from selected agent shown
5. Filter by sentiment: "Negative"
6. **Expected**: Only negative sentiment calls shown

---

### Phase 10: Dashboard & Analytics

#### Test 10.1: View Dashboard Metrics
1. Click "Dashboard" in sidebar
2. **Verify metrics displayed**:
   - Total Leads
   - Total Calls
   - Active Campaigns
   - Total AI Agents (NEW!)
   - Conversion Rate
   - Revenue This Month

#### Test 10.2: View Charts
1. **Verify charts**:
   - Calls over time (line chart)
   - Lead sources (pie chart)
   - Agent performance (bar chart)
   - AI Agent usage (NEW - bar chart)
2. Hover over chart elements
3. **Expected**: Tooltips show exact values

---

### Phase 11: Settings

#### Test 11.1: Update Profile
1. Click "Settings" in sidebar
2. Go to "Profile" tab
3. Update:
   - Name
   - Email
   - Phone
4. Click "Save Changes"
5. **Expected**: Profile updated

#### Test 11.2: API Keys Configuration
1. Go to "API Keys" tab
2. **Verify sections**:
   - ElevenLabs API Key (masked)
   - Twilio Credentials (masked)
   - AI Provider Keys (NEW!)
     - OpenAI
     - Anthropic
     - Google AI
3. Click "Update OpenAI Key"
4. Enter new key (or same key)
5. Click "Save"
6. **Expected**: Key saved successfully

#### Test 11.3: Notification Settings
1. Go to "Notifications" tab
2. Toggle settings:
   - Email notifications
   - SMS notifications
   - Slack notifications (NEW!)
3. Click "Save Preferences"
4. **Expected**: Settings saved

---

### Phase 12: Billing & Subscription

#### Test 12.1: View Current Plan
1. Click "Billing" in sidebar
2. **Verify displayed**:
   - Current plan: Professional
   - Price: $99/mo
   - Billing cycle
   - Next billing date

#### Test 12.2: View Usage
1. Scroll to "Usage This Month"
2. **Verify displayed**:
   - Voice minutes used
   - AI tokens used (NEW!)
   - SMS sent
   - Emails sent
   - Workflow executions

#### Test 12.3: Upgrade Plan
1. Click "Upgrade to Enterprise"
2. **Expected**: Stripe checkout modal opens
3. Cancel for now (don't actually pay)

---

## Advanced Testing Scenarios

### Scenario A: Complete Lead-to-Deal Flow

1. Create lead "Jane Doe"
2. Create workflow: "Auto-qualify new leads"
3. Workflow sends SMS to Jane
4. Create task: "Call Jane in 2 hours"
5. Make call using voice agent
6. Call completes successfully
7. Create deal from Jane's lead
8. Move deal through pipeline stages
9. Close deal as "Won"
10. **Verify**: All data connected properly

### Scenario B: AI Agent Deployment Flow

1. Create AI agent "Product Expert Bot"
2. Test chat with sample questions
3. Adjust temperature/max tokens
4. Re-test to see difference
5. Deploy agent
6. Generate embed code (if available)
7. Pause agent
8. View analytics (conversations, messages, avg response time)

### Scenario C: Campaign Performance Tracking

1. Create campaign "Q4 Outreach"
2. Add 10 leads
3. Start campaign
4. Monitor calls page for new calls
5. View campaign analytics:
   - Calls made
   - Success rate
   - Average duration
   - Sentiment breakdown
6. Adjust campaign settings based on data
7. Continue or pause campaign

---

## Testing Without Real API Keys

If you don't have real API keys yet, you can still test most features:

### What Works:
✅ UI/UX navigation
✅ Creating AI agents (saved to database)
✅ Creating leads, deals, tasks, campaigns
✅ Workflows (logged but not executed)
✅ Dashboard metrics
✅ All CRUD operations

### What Won't Work:
❌ Actual AI chat responses (will show error)
❌ Real voice calls (will show error)
❌ SMS sending (will show error)
❌ Email sending (will show error)

### Mock Testing:
You can test AI agents will show proper error messages like:
- "OpenAI API key not configured. Please add it in Settings."
- "Anthropic API key not configured."

---

## Key Features to Highlight During Testing

### 1. AI Chat Agents (NEW!)
- **Multi-provider**: OpenAI, Anthropic, Google AI
- **Templates**: 5 ready-to-use templates
- **Live chat testing**: Test your agent in real-time
- **Deployment**: One-click deploy/pause
- **Analytics**: Track conversations, messages, response time

### 2. Voice Agents (ElevenLabs)
- **5 pre-configured agents**: Different personalities
- **Dynamic variables**: Pass lead data to calls
- **Call analytics**: Sentiment, transcript, duration
- **Batch calling**: Call multiple leads at once

### 3. Workflow Automation
- **Visual builder**: Easy drag-and-drop (future)
- **Multiple triggers**: Lead created, call completed, deal won, etc.
- **Multiple actions**: SMS, email, create task, webhook, AI agent chat
- **Conditional logic**: If/then workflows
- **Delays**: Wait X hours before next action

### 4. Complete CRM
- **Leads**: Full contact management
- **Deals**: Kanban pipeline view
- **Tasks**: Priority-based task management
- **Campaigns**: Bulk outreach with tracking

---

## Troubleshooting

### Issue: AI agent shows "API key not configured"
**Fix**: Add API key to `.env` and restart backend server

### Issue: Frontend shows blank page
**Fix**:
1. Check console for errors
2. Ensure backend is running on port 5001
3. Check `frontend/.env` has correct API URL

### Issue: "Cannot read property of undefined" error
**Fix**:
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R)
3. Check network tab for failed API calls

### Issue: Workflows not executing
**Fix**:
1. Check workflow is enabled
2. Verify trigger conditions match
3. Check backend logs for errors
4. Ensure Redis is connected

---

## Performance Testing

### Load Testing:
1. Create 50 leads
2. Create 10 AI agents
3. Create 5 campaigns
4. Create 20 tasks
5. Navigate between pages
6. **Expected**: Smooth performance, <1s page loads

### Concurrent Testing:
1. Open 3 browser tabs
2. Create AI agent in tab 1
3. Test chat in tab 2
4. Create lead in tab 3
5. **Expected**: All operations work independently

---

## Success Criteria

After completing this testing guide, you should have:

✅ Created user account
✅ Created at least 2 AI chat agents
✅ Tested AI chat (if API keys configured)
✅ Created 5+ leads
✅ Created 2+ deals
✅ Created 3+ tasks
✅ Created 1+ workflow
✅ Created 1+ campaign
✅ Viewed all analytics dashboards
✅ Updated settings
✅ Navigated all pages without errors

---

## Next Steps

1. **Get Real API Keys**: Start with OpenAI ($5 free credit)
2. **Import Real Leads**: Upload CSV of real contacts
3. **Create Production Workflows**: Set up automation for real business
4. **Deploy to Production**: Push to Render for live use
5. **Invite Team Members**: Add your team to the platform

---

## Support

**Issues?**
- Check backend logs: Terminal 1
- Check frontend console: Browser DevTools
- Check network requests: Browser Network tab
- Review error messages carefully

**Common Fixes:**
1. Restart backend server
2. Clear browser cache
3. Check `.env` file has all required variables
4. Ensure MongoDB and Redis are connected (check startup logs)

---

## Summary

This guide covered:
- ✅ 12 testing phases
- ✅ 40+ individual test cases
- ✅ 3 advanced scenarios
- ✅ Complete user journey from signup to closing deals
- ✅ All new AI agent features
- ✅ Troubleshooting common issues

**Estimated Testing Time**: 45-60 minutes for complete walkthrough

**Ready to Test?** Start with Phase 1 and work your way through! 🚀
