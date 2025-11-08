# Local Testing Guide

## Quick Start - Test Everything Locally

### Prerequisites
- Node.js 18+ installed
- MongoDB running (or use MongoDB Atlas - already configured in .env)
- Redis running locally

### Step 1: Start Redis

```bash
# Option 1: If you have Redis installed
redis-server

# Option 2: Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Option 3: Using Homebrew (Mac)
brew services start redis
```

### Step 2: Start Backend

```bash
# In terminal 1
cd /Users/homepc/voiceflow-crm/backend
npm install
npm start
```

Backend will run on: **http://localhost:5001**

You should see:
```
✅ MongoDB Connected
✅ Redis Connected
✅ Email service initialized with Gmail SMTP
🚀 Server running on port 5001
```

### Step 3: Start Frontend

```bash
# In terminal 2
cd /Users/homepc/voiceflow-crm/frontend
npm install
npm run dev
```

Frontend will run on: **http://localhost:5173**

### Step 4: Test the Flow

1. **Visit Marketing Page**
   - Open: http://localhost:5173/
   - Should redirect to `/index.html` (marketing page)
   - Click "Start Free Trial" buttons

2. **Sign Up**
   - Click any "Start Free Trial" button
   - Should go to `/login`
   - Click "Create Account"
   - Fill in:
     - Email: test@example.com
     - Password: password123
     - Company Name: Test Company
   - Submit

3. **Dashboard**
   - After signup, should redirect to `/app/dashboard`
   - Should see:
     - Welcome message
     - Stats cards (0 agents, 0 calls, etc.)
     - Quick actions

4. **Create Agent**
   - Click "Agents" in sidebar
   - Click "Create Agent"
   - Choose type: "Lead Generation"
   - Fill in:
     - Name: "Sarah - Lead Qualifier"
     - Voice: Any voice
     - Script: (optional, has defaults)
   - Click "Create Agent"
   - Agent should appear in list

5. **Add Lead**
   - Click "Leads" in sidebar
   - Click "Add Lead"
   - Fill in:
     - Name: John Doe
     - Email: john@example.com
     - Phone: +1234567890
     - Value: 5000
   - Submit

6. **Initiate Test Call** (Won't actually call without valid ElevenLabs setup)
   - In Leads page, find your lead
   - Click "Call" button
   - Select the agent you created
   - Click "Initiate Call"
   - Should see success message or error if ElevenLabs not configured

7. **Check Usage**
   - Go to Dashboard
   - Should see usage stats updating
   - Minutes used should increment after calls

---

## Troubleshooting

### Backend won't start

**Error**: `Cannot connect to MongoDB`
```bash
# Check your .env file has correct MONGODB_URI
# If using MongoDB Atlas (default), check your internet connection
# Or install MongoDB locally:
brew install mongodb-community  # Mac
# Then: brew services start mongodb-community
```

**Error**: `Redis connection failed`
```bash
# Start Redis:
redis-server

# Or using Docker:
docker run -d -p 6379:6379 redis:7-alpine

# Check if Redis is running:
redis-cli ping
# Should return: PONG
```

**Error**: `Port 5001 already in use`
```bash
# Find process on port 5001:
lsof -i :5001

# Kill it:
kill -9 <PID>

# Or change port in backend/.env:
PORT=5002
```

### Frontend won't start

**Error**: `Module not found`
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error**: `Cannot connect to backend`
- Check `frontend/.env` has: `VITE_API_URL=http://localhost:5001/api`
- Make sure backend is running on port 5001
- Check browser console for CORS errors

### Can't create agents

**Error**: "Failed to create agent"

This is expected if you haven't configured ElevenLabs API key. The platform is configured to use YOUR ElevenLabs account.

To test without ElevenLabs:
1. The agent will be created in the database
2. You just won't be able to make actual calls
3. Everything else (CRM, leads, workflows) will work

To enable real calls:
1. Get ElevenLabs API key from elevenlabs.io
2. Update `.env`: `ELEVENLABS_API_KEY=sk_your_key_here`
3. Restart backend
4. Create agents - they'll be created in your ElevenLabs account

### Calls don't work

**Expected**: Calls require:
1. Valid ElevenLabs API key in `.env`
2. Valid Twilio credentials in `.env`
3. Agent created successfully in ElevenLabs
4. Valid phone number to call

For testing without actual calls:
- The UI will work
- Call logs will be created
- Usage tracking will work
- You just won't hear actual voice calls

---

## What's Working Locally

✅ **Frontend React App**:
- Marketing page at `/`
- Login/Signup at `/login`, `/signup`
- Dashboard at `/app/dashboard`
- All CRM pages (Agents, Leads, Calls, etc.)

✅ **Backend API**:
- Authentication (JWT)
- User management
- Agent CRUD
- Lead CRUD
- Call logging
- Usage tracking (minutes-based)

✅ **Database**:
- MongoDB Atlas (cloud) - already configured
- User accounts stored
- Agents, leads, calls stored
- Usage tracking per month

✅ **Pricing Model**:
- Minute-based billing
- Usage limits enforced
- Overage calculation
- Cost tracking

⏳ **Not Working Without Setup**:
- Actual voice calls (need ElevenLabs API key)
- SMS (need Twilio configured)
- Email sending (need Gmail app password)
- Stripe billing (need Stripe keys)

---

## Testing Scenarios

### Scenario 1: Basic User Flow
1. Visit marketing page
2. Sign up for trial account
3. Create first agent
4. Add first lead
5. View dashboard stats

**Expected Result**: ✅ All works without any external APIs

### Scenario 2: Usage Limits
1. Sign up as trial user (30 minutes)
2. Check dashboard - should show "30 minutes remaining"
3. Simulate calls completing (via webhook or database)
4. Watch minutes decrease
5. Try to make call when out of minutes → Should be blocked

**Expected Result**: ✅ Usage tracking works

### Scenario 3: Multiple Users
1. Sign up user 1 (trial)
2. Sign up user 2 (starter - manually update DB)
3. Each user creates agents
4. Check that agents are isolated per user
5. Each user's usage tracked separately

**Expected Result**: ✅ Multi-tenancy works

---

## Manual Testing Checklist

### Authentication
- [ ] Sign up with new account
- [ ] Log in with existing account
- [ ] Log out
- [ ] Protected routes redirect to login when not authenticated
- [ ] Authenticated users can access dashboard

### Agents
- [ ] Create new agent
- [ ] View agents list
- [ ] View agent details
- [ ] Edit agent (if implemented)
- [ ] Delete agent
- [ ] Agent count matches plan limit

### Leads
- [ ] Add new lead manually
- [ ] View leads list
- [ ] Search/filter leads
- [ ] Export leads to CSV
- [ ] Click "Call" button on lead

### Calls
- [ ] View calls list
- [ ] Call log shows duration and cost
- [ ] Call details show transcript (if webhook received)
- [ ] Calls filtered by agent/date

### Usage & Billing
- [ ] Dashboard shows usage stats
- [ ] Minutes used vs. included shown
- [ ] Cost calculated correctly
- [ ] Overage warning shown when approaching limit
- [ ] Trial users blocked when out of minutes

### Settings
- [ ] View company information
- [ ] Update company info
- [ ] View team members
- [ ] NO API keys section (removed for platform model)

---

## Database Inspection

### View Users
```bash
# If using MongoDB locally
mongo voiceflowAI
db.users.find().pretty()

# Or using MongoDB Compass (GUI):
# Connect to: mongodb+srv://helpremodely_db_user:...
# Database: voiceflowAI
# Collection: users
```

### View Usage Records
```bash
db.usages.find().pretty()

# Should see:
# - userId
# - month (e.g., "2025-01")
# - minutesUsed
# - minutesIncluded
# - platformCost
```

### Manually Update Plan
```bash
# Give a user Pro plan for testing
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { plan: "professional" } }
)

# Check usage limits updated
db.usages.updateOne(
  { userId: ObjectId("..."), month: "2025-01" },
  { $set: { minutesIncluded: 1000 } }
)
```

---

## API Testing (Using curl or Postman)

### Health Check
```bash
curl http://localhost:5001/api/health
# Should return: {"status":"ok"}
```

### Register User
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "password123",
    "company": "Test Company 2"
  }'
```

### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "password123"
  }'

# Returns: { "token": "...", "user": {...} }
# Copy the token for next requests
```

### Get Agents (Authenticated)
```bash
curl http://localhost:5001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Agent (Authenticated)
```bash
curl -X POST http://localhost:5001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "type": "lead_generation",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "script": "Hi! I am calling about your inquiry..."
  }'
```

---

## Next Steps

After local testing works:

1. **Deploy to Production** (see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))
2. **Configure Production APIs**:
   - ElevenLabs API key
   - Twilio credentials
   - Gmail app password or SendGrid
   - Stripe keys
3. **Test Production Flow**:
   - Sign up
   - Create real agent
   - Make test call to your phone
   - Verify webhook received
   - Check usage updated

---

## Quick Commands Summary

```bash
# Start Redis
redis-server

# Start Backend (Terminal 1)
cd backend && npm start

# Start Frontend (Terminal 2)
cd frontend && npm run dev

# Open in browser
open http://localhost:5173

# Check backend health
curl http://localhost:5001/api/health

# Stop everything
# Ctrl+C in both terminals
```

---

## Demo Flow for Testing

1. **Open**: http://localhost:5173/
2. **See**: Marketing page with pricing
3. **Click**: "Start Free Trial" on Starter plan
4. **Sign up**: Create account
5. **Redirected to**: Dashboard (`/app/dashboard`)
6. **See**:
   - 0 agents
   - 30 trial minutes remaining
   - Quick action buttons
7. **Click**: "Create Agent" or go to Agents page
8. **Create**: Lead Generation agent named "Sarah"
9. **Go to**: Leads page
10. **Add**: Test lead with your email
11. **Click**: "Call" button (will fail without ElevenLabs, but UI works)
12. **See**: Usage dashboard updates

✅ **Success**: You've tested the complete local flow!
