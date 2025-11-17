# Quick Test Guide - Test Call Feature

## Step-by-Step Testing Instructions

### Option 1: Test with Existing Agent (Quickest)

1. **Open the Agents page** (should already be open in your browser):
   ```
   http://localhost:5173/app/agents
   ```

2. **Look for the demo agent** we created earlier:
   - Name: "VoiceFlow Test Agent - Claude Code"
   - Or use the demo agent: "Remodely.ai Marketing Assistant"

3. **Click the three dots (⋮)** on the right side of any agent row

4. **Click "Test Call"** (first option in the menu)

5. **In the dialog that opens:**
   - You'll see the agent name, voice, and ElevenLabs ID
   - Enter your phone number: `+14802555887` (or `4802555887`)
   - Click "Make Test Call"

6. **Wait for the call:**
   - You should see a success message
   - Your phone will ring in 5-15 seconds
   - Answer to hear the AI agent!

### Option 2: Create a NEW Agent and Test It

If you don't have any agents yet:

1. **Go to** http://localhost:5173/app/agents

2. **Click "Create Agent"** button (top right)

3. **Fill in the form:**
   - **Step 1 - Type & Name:**
     - Select "Lead Generation" (or any type)
     - Name: "My Test Agent"
     - Click "Next"

   - **Step 2 - Script:**
     - Script: "You are a friendly AI assistant testing VoiceFlow CRM. Greet the caller warmly and ask if they can hear you clearly."
     - First Message: "Hi! This is a test call from VoiceFlow CRM. Can you hear me?"
     - Click "Next"

   - **Step 3 - Voice:**
     - Select any voice (e.g., "Sarah")
     - Click "Create Agent"

4. **Once created, test it:**
   - Find your new agent in the list
   - Click the three dots (⋮)
   - Click "Test Call"
   - Enter phone: `+14802555887`
   - Click "Make Test Call"

### What to Look For

**✅ Success Indicators:**
- Green toast notification: "Test call initiated! Your phone should ring shortly."
- Dialog closes automatically
- Backend logs show call initiated (check terminal)

**❌ Error Indicators:**
- Red toast with error message
- If it says "not properly created in ElevenLabs", the agent needs to be recreated
- Check that agent's ElevenLabs ID starts with `agent_` (not `local_`)

### Monitoring the Call

**Backend logs will show:**
```
📞 [TEST CALL] Initiating test call
   Agent ID: 675b1234567890abcdef1234
   Phone: +14802555887
   Agent Name: My Test Agent
   ElevenLabs ID: agent_1701ka7v2exqejhbws4kp8s1axdk
   Formatted Phone: +14802555887
   Calling ElevenLabs API...
   ✅ Call initiated: btcal_1501ka7v2fwxexq869f7s0tqfjd8
```

**To see backend logs:**
```bash
tail -f backend/server.log
```

### Troubleshooting

**Problem: "Agent not properly created in ElevenLabs"**
- **Cause:** Agent has placeholder ID (starts with `local_`)
- **Fix:** Delete and recreate the agent

**Problem: Phone doesn't ring**
- Check phone number format (include country code: +1...)
- Verify `ELEVENLABS_PHONE_NUMBER_ID` is set in .env
- Check backend logs for API errors

**Problem: Can't find agents page**
- You may need to log in first
- Go to http://localhost:5173 and sign in
- Then navigate to http://localhost:5173/app/agents

**Problem: "Test Call" option not showing**
- Refresh the page (browser cache)
- Make sure server restarted (check terminal)
- Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Quick Commands

**Restart backend:**
```bash
lsof -ti:5001 | xargs kill && npm run server > backend/server.log 2>&1 &
```

**View backend logs:**
```bash
tail -f backend/server.log
```

**Check what's running:**
```bash
lsof -ti:5173  # Frontend (should return a number)
lsof -ti:5001  # Backend (should return a number)
```

---

## Need Help?

If you're still stuck, let me know:
- What do you see when you open http://localhost:5173/app/agents?
- Do you see any agents in the list?
- Can you see the three-dots menu on each agent?
- Any error messages?

I can walk you through it step by step!
