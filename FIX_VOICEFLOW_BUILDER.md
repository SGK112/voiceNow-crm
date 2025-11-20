# VoiceFlow Builder - Diagnostic & Fix Guide

## Current Status ✅

After thorough code analysis:
- ✅ All 21 node types properly defined and registered
- ✅ Routes configured correctly
- ✅ All dependencies installed (reactflow, etc.)
- ✅ Build compiles successfully
- ✅ Servers running (frontend:5173, backend:5001)
- ✅ Error boundaries in place
- ✅ API endpoints exist

## Step-by-Step Diagnostic

### Step 1: Check if you're logged in

1. Open: http://localhost:5173/login
2. Login with your account (or create one if needed)
3. You should be redirected to `/app/dashboard`

**Why:** The VoiceFlow Builder is protected and requires authentication

### Step 2: Clear browser cache and reload

1. Open DevTools (F12 or Cmd+Option+I)
2. Right-click the reload button
3. Select "Empty Cache and Hard Reload"
4. Or use: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

**Why:** Old cached JavaScript might be causing conflicts

### Step 3: Check browser console systematically

1. Open: http://localhost:5173/app/voiceflow-builder
2. Open DevTools Console (F12)
3. Clear the console (trash icon)
4. Reload the page
5. Look for the **FIRST** error (ignore subsequent errors)

**Common First Errors & Solutions:**

#### Error: "Cannot read property 'voices' of undefined"
**Solution:** Voice library API is failing
```bash
# Check backend is running
lsof -ti:5001

# Restart backend if needed
cd backend && npm run dev
```

#### Error: "Unauthorized" or 401
**Solution:** Not logged in or token expired
- Logout and login again
- Check localStorage has a 'token' key

#### Error: "Network Error" or "Failed to fetch"
**Solution:** Backend not running or wrong URL
```bash
# Check .env file in frontend folder
cat frontend/.env

# Should have:
VITE_API_URL=http://localhost:5001/api
```

#### Error: Component rendering errors
**Solution:** React Flow might need re-installation
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Step 4: Test with minimal approach

If still having issues, test the page step by step:

1. **Test 1:** Can you see the page at all?
   - If NO: Check authentication (Step 1)
   - If YES: Continue to Test 2

2. **Test 2:** Can you see the sidebar with node types?
   - If NO: Check browser console for React errors
   - If YES: Continue to Test 3

3. **Test 3:** Can you drag nodes onto canvas?
   - If NO: React Flow might have issues
   - If YES: Continue to Test 4

4. **Test 4:** Can you configure nodes (click them)?
   - If NO: Check for modal/dialog errors in console
   - If YES: VoiceFlow Builder is working!

### Step 5: Check specific features you need

You mentioned needing these features:

#### ✅ Add Different VoiceFlow Nodes
**How to test:**
1. Look for sidebar on the left with 19 node types
2. Drag any node (Voice, Prompt, Inbound Call, etc.) onto canvas
3. Node should appear on canvas

**If not working:**
- Check console for "nodeTypes" errors
- Verify `reactflow` package is installed: `npm list reactflow`

#### ✅ Add a Voice
**How to test:**
1. Drag "Voice" node onto canvas
2. Click the Voice node
3. Modal should open with voice selection
4. Select a voice from dropdown

**If not working:**
- Check console for API errors to `/agents/helpers/voice-library`
- Check backend logs for voice library errors

#### ✅ Make Outbound Calls
**How to test:**
1. Drag "Outbound Call" node onto canvas
2. Click the node
3. Configure Twilio number and destination

**If not working:**
- Need Twilio account configured
- Check `.env` has TWILIO credentials

#### ✅ Inbound Calls
**How to test:**
1. Drag "Inbound Call" node onto canvas
2. Click the node
3. Select Twilio phone number

**If not working:**
- Need Twilio phone numbers provisioned
- Check phone numbers page first: http://localhost:5173/app/phone-numbers

## Quick Fix Commands

### Complete Reset (Nuclear Option)
```bash
# Stop all servers
killall node

# Clean and reinstall
cd /Users/homepc/voiceFlow-crm-1/frontend
rm -rf node_modules package-lock.json dist .vite
npm install

# Restart servers
cd /Users/homepc/voiceFlow-crm-1
npm run dev
```

In another terminal:
```bash
cd /Users/homepc/voiceFlow-crm-1/backend
npm run dev
```

### Check Server Health
```bash
# Check if servers are running
lsof -ti:5173  # Frontend
lsof -ti:5001  # Backend

# Check backend responds
curl http://localhost:5001/api/health

# Check frontend loads
curl -I http://localhost:5173
```

### View Server Logs
```bash
# Backend logs (in terminal where backend is running)
# Look for errors when you load the page

# Frontend logs (browser console)
# Open DevTools -> Console tab
```

## Still Having Issues?

If you've tried all the above and still seeing "too many errors", please:

1. **Count the errors:** How many unique errors? (not total errors, but unique types)

2. **Copy the FIRST error only:**
   - Clear console
   - Reload page
   - Copy just the first error message and stack trace

3. **Take a screenshot:** Of the browser showing:
   - The VoiceFlow Builder page
   - The console with errors visible

4. **Check specific node:** Which specific node or feature isn't working?
   - Adding nodes?
   - Configuring voice?
   - Making calls?
   - Saving workflows?

## Expected Behavior

When working correctly, you should see:

1. **VoiceFlow Builder Canvas:** Large white grid area in center
2. **Left Sidebar:** List of 19 draggable node types
3. **Top Toolbar:** Agent name, Save button, Test button
4. **Bottom Console:** Logs and debugging info
5. **Right Panel (optional):** AI Copilot chat

**Features:**
- Drag nodes from sidebar to canvas
- Click nodes to configure them
- Connect nodes by dragging from one handle to another
- Save workflows
- Test agents
- AI assistance for building workflows

## Technical Details

**Node Types Available:**
1. Inbound Call - Receive phone calls
2. Outbound Call - Make phone calls
3. Voice - Select AI voice
4. Prompt - Agent instructions
5. AI Decision - Smart routing
6. AI Generator - Generate content
7. AI Extract - Extract data
8. AI Intent - Classify intent
9. Variables - Dynamic data
10. Knowledge - Docs & URLs
11. Trigger - Start automation
12. Keywords - Keyword detection
13. Human Handoff - Transfer to human
14. Calendar - Book appointments
15. Code - Custom logic
16. Voice Call - Make AI calls
17. SMS - Send text
18. MMS - Send media
19. Email - Send email
20. Webhook - HTTP endpoint
21. Test - Test agent

All node components are implemented and registered. The code is valid.
