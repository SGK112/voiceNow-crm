# 🧪 VoiceFlowBuilder Testing Guide

## Quick Access
**URL**: http://localhost:5173/app/voiceflow-builder

---

## 📋 Test Scenarios

### **Test 1: Basic Voice Configuration** ✅
**Objective**: Verify that voices load and can be selected

**Steps**:
1. Navigate to http://localhost:5173/app/voiceflow-builder
2. From the left sidebar, drag a **"Voice"** node onto the canvas
3. Click the Voice node to open configuration
4. You should see:
   - ✅ Loading spinner → "Loading voices..."
   - ✅ Voice dropdown populated with voices
   - ✅ Language filter set to "All Languages"
5. Select a voice from the dropdown (e.g., "Kleopatra")
6. Click "Save Configuration"
7. The node should show the selected voice name

**Expected Result**: Voice configuration works and saves properly

**Browser Console Logs to Check**:
```
🎤 VOICE CONFIG COMPONENT RENDER
📊 VoiceConfig voicesArray length: 100
✅ Voices loaded successfully!
```

**Backend Console Logs to Check**:
```
📚 [VOICE LIBRARY] API CALL RECEIVED
✅ Successfully fetched 100 voices from ElevenLabs
```

---

### **Test 2: Simple Inbound Call Flow**
**Objective**: Create a basic agent that answers calls

**Workflow Structure**:
```
[Inbound Call] → [Voice] → [Prompt] → [Test]
```

**Steps**:
1. **Add Inbound Call Node**
   - Drag "Inbound Call" node to canvas
   - Configure with your Twilio phone number or ElevenLabs number
   - Set greeting message

2. **Add Voice Node**
   - Drag "Voice" node to canvas
   - Connect Inbound Call → Voice
   - Select a voice (e.g., "Kleopatra")

3. **Add Prompt Node**
   - Drag "Prompt" node to canvas
   - Connect Voice → Prompt
   - Add agent instructions, example:
     ```
     You are a friendly receptionist for a home remodeling company.
     Greet customers and ask how you can help them today.
     Be warm, professional, and helpful.
     ```

4. **Add Test Node**
   - Drag "Test" node to canvas
   - Connect Prompt → Test
   - This allows you to test the agent

5. **Save the Agent**
   - Click "Save Agent" button (top right)
   - Give it a name like "Test Reception Agent"
   - Click Save

**Expected Result**: Agent saves successfully and is ready to test

---

### **Test 3: Outbound Call Flow**
**Objective**: Create an agent that makes outbound calls

**Workflow Structure**:
```
[Outbound Call] → [Voice] → [Prompt] → [AI Decision] → [Calendar/Human Handoff]
```

**Steps**:
1. **Add Outbound Call Node**
   - Configure with destination number or contact variable
   - Set initial greeting

2. **Add Voice Node**
   - Select professional voice

3. **Add Prompt Node**
   - Example: "You are calling to schedule a home remodeling consultation"

4. **Add AI Decision Node**
   - Let AI decide if customer is interested or not
   - Create branches for different outcomes

5. **Add Action Nodes**
   - Calendar booking if interested
   - Polite goodbye if not interested

---

### **Test 4: Complete Customer Service Flow**
**Objective**: Multi-branch workflow with knowledge base

**Workflow Structure**:
```
[Inbound] → [Voice] → [Prompt] → [Knowledge Base] → [AI Intent]
    ↓
[Question/Quote/Book] branches → Different actions
```

**Steps**:
1. Set up inbound call with voice
2. Add knowledge base node with company info
3. Use AI Intent to classify customer needs:
   - Quote request
   - Question about services
   - Booking appointment
4. Branch to appropriate actions
5. Test each branch

---

### **Test 5: Voice Call Node (Direct Call)**
**Objective**: Use the Voice Call node for immediate calling

**Steps**:
1. Drag "Voice Call" node
2. Configure:
   - Phone number to call
   - Voice to use
   - Initial message
3. This can trigger an immediate call

---

### **Test 6: Integration Testing**
**Objective**: Test with external services

**Available Integrations**:
- 📧 **Email** - Send notifications
- 📅 **Calendar** - Google Calendar booking
- 💬 **SMS** - Twilio text messages
- 🎥 **MMS** - Send images/media
- 🔗 **Webhook** - Connect to external APIs

**Example Flow**:
```
[Inbound] → [Voice] → [Prompt] → [Calendar] → [SMS Confirmation] → [Email Receipt]
```

---

## 🎨 Available Node Types

### **Communication Nodes**
- 📞 **Inbound Call** - Receive incoming calls
- 📞 **Outbound Call** - Make outgoing calls
- 🎙️ **Voice** - Select AI voice
- 📞 **Voice Call** - Direct call action
- 💬 **SMS** - Send text messages
- 🖼️ **MMS** - Send media messages
- 📧 **Email** - Send emails

### **AI Nodes**
- 💬 **Prompt** - Agent instructions
- 🤖 **AI Decision** - AI-powered routing
- ✨ **AI Generator** - Generate content
- 🔍 **AI Extract** - Extract data from conversation
- 🎯 **AI Intent** - Classify user intent

### **Data Nodes**
- 📝 **Variables** - Dynamic data storage
- 📚 **Knowledge** - Connect docs & URLs
- 💾 **Code** - Custom JavaScript logic

### **Workflow Nodes**
- ⚡ **Trigger** - Start automation
- 🔑 **Keywords** - Keyword detection
- 📅 **Calendar** - Book appointments
- 👤 **Human Handoff** - Transfer to human
- 🔗 **Webhook** - HTTP requests
- 🧪 **Test** - Test your agent

---

## 🔍 Debugging Tips

### **Browser Console** (F12)
Look for these logs:
- `🎤 VOICE CONFIG COMPONENT RENDER` - Voice loading
- `✅ Voices loaded successfully!` - Voices fetched
- `📊 Filtered voices count` - Filter results
- `🔍 DROPDOWN CHANGE EVENT FIRED` - Voice selection

### **Backend Terminal**
Look for these logs:
- `📚 [VOICE LIBRARY] API CALL RECEIVED` - API hit
- `✅ Successfully fetched X voices from ElevenLabs` - Success
- `❌ [VOICE LIBRARY] ERROR OCCURRED` - Errors

### **Common Issues**

**Problem**: Voices not loading
- Check: Browser console for errors
- Check: Backend terminal for API errors
- Check: `.env` file has `ELEVENLABS_API_KEY`

**Problem**: Can't save agent
- Check: All required nodes configured
- Check: Valid connections between nodes
- Check: Backend is running

**Problem**: Test call not working
- Check: Twilio credentials in `.env`
- Check: Phone number is valid
- Check: ElevenLabs agent is deployed

---

## ✅ Testing Checklist

### Basic Functionality
- [ ] Voice node opens configuration modal
- [ ] Voices load in dropdown (should see 100+ voices)
- [ ] Can filter voices by language
- [ ] Can search voices by name
- [ ] Can select a voice
- [ ] Selected voice shows in node
- [ ] Can save voice configuration
- [ ] Can clear selected voice

### Workflow Creation
- [ ] Can drag nodes from sidebar
- [ ] Can connect nodes with edges
- [ ] Can delete nodes
- [ ] Can delete edges
- [ ] Can configure each node
- [ ] Can save complete workflow
- [ ] Can load saved workflow

### Advanced Features
- [ ] AI Copilot responds to questions
- [ ] Can export workflow
- [ ] Can import workflow
- [ ] Test mode works
- [ ] Can deploy agent

---

## 🚀 Quick Test Commands

### Test Voice Library API
```bash
node test-voice-library-endpoint.js
```

### Check Backend Logs
Look at the terminal where you ran `npm run server`

### Check Frontend Logs
Open browser console (F12) while using VoiceFlow Builder

---

## 📞 Example Test Scenarios

### Scenario 1: Simple Receptionist
**Goal**: Answer calls and route to appropriate department

1. Inbound Call → Voice (Professional) → Prompt
2. Prompt: "Hi! You've reached ABC Company. How can I help?"
3. AI Intent → Route to Sales/Support/Billing
4. Human Handoff or Calendar booking

### Scenario 2: Appointment Reminder
**Goal**: Call customers with appointment reminders

1. Outbound Call → Voice (Friendly) → Prompt
2. Prompt: "Hi! This is a reminder about your appointment tomorrow"
3. AI Decision → Confirm or Reschedule
4. Calendar update → SMS confirmation

### Scenario 3: Lead Qualification
**Goal**: Qualify leads and book consultations

1. Inbound Call → Voice → Knowledge Base (Company info)
2. Prompt: Ask qualifying questions
3. AI Extract → Capture: Budget, Timeline, Project type
4. AI Decision → Qualified or Not
5. If qualified → Calendar booking → Email lead info
6. If not → Polite goodbye → SMS follow-up

---

## 🎯 Success Criteria

Your VoiceFlowBuilder is working correctly if:
- ✅ Voices load within 2 seconds
- ✅ Can build complete workflows
- ✅ Workflows save and load correctly
- ✅ Test calls can be initiated
- ✅ No console errors
- ✅ Backend logs show successful API calls
- ✅ Agent behavior matches workflow design

---

## 🆘 Need Help?

Check logs in:
1. **Browser Console** (F12) - Frontend issues
2. **Backend Terminal** - API issues
3. **Network Tab** (F12) - Request/response debugging

Common log locations:
- Frontend: Browser DevTools → Console
- Backend: Terminal running `npm run server`
- Test: Run `node test-voice-library-endpoint.js`
