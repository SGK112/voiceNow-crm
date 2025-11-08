# VoiceFlow CRM - Testing Guide

## Quick Start Testing (Local Development)

### 1. Prerequisites Check

```bash
# Check Node.js version (requires 20+)
node --version

# Check npm
npm --version

# Check if MongoDB is installed
mongod --version

# Check if Redis is installed
redis-server --version
```

### 2. Environment Setup

#### Step 1: Copy Environment Files

```bash
# Root .env
cp .env.example .env

# Frontend .env
cp frontend/.env.example frontend/.env
```

#### Step 2: Configure Gmail SMTP (Required)

Get a Gmail App Password:
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification (enable if not already)
3. Scroll to App passwords
4. Generate password for "Mail" / "Other (VoiceFlow CRM)"
5. Copy the 16-character password

Update `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcd-efgh-ijkl-mnop  # Your 16-char app password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=VoiceFlow CRM
```

#### Step 3: Configure MongoDB

**Option A: Local MongoDB**
```env
MONGODB_URI=mongodb://localhost:27017/voiceflow-crm
```

**Option B: MongoDB Atlas (Cloud)**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voiceflow?retryWrites=true&w=majority
```

#### Step 4: Configure Other Required Variables

```env
# Server
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5173

# Redis
REDIS_URL=redis://localhost:6379

# JWT (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-me
JWT_EXPIRE=30d
```

### 3. Installation

```bash
# Install all dependencies (root + frontend + backend)
npm run install-all

# Or manually:
npm install
cd frontend && npm install
cd ..
```

### 4. Database Setup

#### Start MongoDB and Redis

**Option A: Using Docker**
```bash
docker-compose up mongodb redis -d
```

**Option B: Local Installation**
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Redis
redis-server
```

#### Seed Database with Subscription Plans

```bash
node backend/scripts/seedPlans.js
```

You should see:
```
✅ Connected to MongoDB
✅ Cleared existing plans
✅ Seeded subscription plans successfully
```

### 5. Start the Application

#### Option A: Run Everything Together
```bash
npm run dev
```

This starts:
- Backend API on http://localhost:5001
- Frontend on http://localhost:5173

#### Option B: Run Separately (for debugging)

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd frontend && npm run dev
```

### 6. Verify Server Startup

You should see:

```
✅ Environment variables validated successfully

📋 ENVIRONMENT SUMMARY:
════════════════════════════════════════
Environment          development
Port                 5001
Database             ✅ Configured
Redis                ✅ Configured
Email                ✅ Configured
Stripe               ⚠️  Optional
Elevenlabs           ⚠️  Optional
Twilio               ⚠️  Optional
N8n                  ⚠️  Optional
Googleauth           ⚠️  Optional
════════════════════════════════════════

  ╔════════════════════════════════════════╗
  ║   VoiceFlow CRM Server Running         ║
  ║   Port: 5001                           ║
  ║   Environment: development             ║
  ║   API: http://localhost:5001/api       ║
  ╚════════════════════════════════════════╝

✅ MongoDB connected successfully
✅ Redis connected successfully
✅ Email service initialized with Gmail SMTP
```

---

## Testing Checklist

### ✅ Basic Functionality Tests

#### 1. Test User Registration
1. Open http://localhost:5173
2. Click "Sign up"
3. Enter:
   - Email: test@example.com
   - Password: Test123!
   - Company: Test Company
4. Submit
5. **Expected Result:**
   - Redirects to dashboard
   - Welcome email sent to your Gmail
   - Token stored in localStorage

#### 2. Test Login
1. Go to http://localhost:5173/login
2. Enter credentials from step 1
3. Click "Sign In"
4. **Expected Result:**
   - Redirects to dashboard
   - Shows user info in header

#### 3. Test Dashboard
1. After login, should see:
   - Total calls metric
   - Total leads metric
   - Active agents
   - Recent calls table

#### 4. Test Email Service
Check your Gmail inbox for welcome email with:
- Subject: "Welcome to VoiceFlow CRM!"
- Styled HTML email
- Link to dashboard

### 🔌 API Endpoint Tests

Use these curl commands to test API:

#### Health Check
```bash
curl http://localhost:5001/health
```
Expected: `{"status":"ok","timestamp":"..."}`

#### Register User
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "Test123!",
    "company": "API Test Co"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "Test123!"
  }'
```

#### Get Subscription Plans
```bash
curl http://localhost:5001/api/subscription/plans
```

### 📧 Email Templates Test

Test all email templates:

```bash
# In MongoDB, get a user ID first
mongo voiceflow-crm
db.users.findOne()

# Then test emails via Node console:
node
```

```javascript
import emailService from './backend/services/emailService.js';

// Test welcome email
await emailService.sendWelcomeEmail('your-email@gmail.com', 'John Doe');

// Test call summary
await emailService.sendCallSummary({
  to: 'your-email@gmail.com',
  leadName: 'Jane Smith',
  callDuration: '5 min 30 sec',
  callDate: new Date().toLocaleDateString(),
  transcript: 'Brief conversation about services...',
  nextSteps: 'Schedule follow-up call next week'
});

// Test appointment confirmation
await emailService.sendAppointmentConfirmation({
  to: 'your-email@gmail.com',
  leadName: 'Bob Johnson',
  appointmentDate: 'December 15, 2025',
  appointmentTime: '2:00 PM',
  meetingLink: 'https://meet.google.com/abc-defg-hij'
});
```

---

## Common Issues & Solutions

### Issue: "MONGODB_URI is required but not set"
**Solution:** Copy `.env.example` to `.env` and fill in all required variables

### Issue: "Email send failed: Invalid login"
**Solution:**
1. Verify 2-Step Verification is enabled in Google Account
2. Generate a new App Password
3. Use the 16-character password (remove spaces)
4. Ensure SMTP_USER matches the Gmail account

### Issue: "Redis connection failed"
**Solution:**
```bash
# Start Redis
redis-server

# Or with Docker
docker-compose up redis -d
```

### Issue: Port 5001 already in use
**Solution:**
```bash
# Find process using port
lsof -i :5001

# Kill it
kill -9 <PID>

# Or change PORT in .env
PORT=5002
```

### Issue: Frontend shows "Failed to fetch"
**Solution:** Verify backend is running and check CORS settings in `backend/server.js`

---

## Production Deployment Testing

### Build Frontend
```bash
cd frontend
npm run build
```

### Test Production Build Locally
```bash
# Serve frontend build
npx serve -s frontend/dist -l 3000

# Start backend in production mode
NODE_ENV=production npm start
```

### Environment Variables for Production

Before deploying, ensure these are set:
- ✅ `NODE_ENV=production`
- ✅ `JWT_SECRET` - Strong random string
- ✅ `MONGODB_URI` - Production database
- ✅ `CLIENT_URL` - Production frontend URL
- ✅ `SMTP_PASSWORD` - Gmail app password
- ⚠️  Remove any test/development credentials

---

## Next Steps

Once basic testing passes:

1. **Configure Optional Services:**
   - Stripe (for payments)
   - ElevenLabs (for voice agents)
   - Twilio (for SMS)
   - n8n (for workflows)

2. **Test Advanced Features:**
   - Voice agent creation
   - Call logging
   - Lead management
   - Workflow automation
   - Billing & subscriptions

3. **Deploy to Production:**
   - See README.md for deployment guides
   - Configure production environment
   - Set up monitoring
   - Enable HTTPS

---

## Support

If you encounter issues:
1. Check this guide first
2. Review console errors (backend terminal + browser DevTools)
3. Verify environment variables are set correctly
4. Check MongoDB and Redis are running
5. Test email service connection independently

**Happy Testing!** 🚀
