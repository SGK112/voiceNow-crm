# 🧪 Test Workflow - Customer Support Agent

## ✅ Workflow Created Successfully!

**Workflow ID:** `691e44f15573f92273ff4914`
**Name:** Test Customer Support Agent
**Status:** Ready to test

---

## 🔗 Quick Access

**Direct Link:**
```
http://localhost:5173/app/voiceflow-builder/691e44f15573f92273ff4914
```

**Or navigate:**
1. Login at http://localhost:5173/login
2. Email: help.remodely@gmail.com
3. Go to VoiceFlow Builder
4. Your test workflow should load automatically

---

## 📊 Workflow Structure

This test workflow demonstrates a complete customer support call flow:

### Nodes (8 total):

```
┌─────────────────┐
│ 1. Inbound Call │  Entry point - Receives customer calls
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. AI Voice    │  Selects Sarah - Friendly Female voice
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. System Prompt│  Agent personality: "Friendly support agent named Alex"
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│ 4. AI Intent    │  │ 6. Knowledge │  Company FAQ & Product info
└────────┬────────┘  └──────────────┘
         │
         ▼
┌─────────────────┐
│ 5. AI Decision  │  Routes based on customer need
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
   More Options      ┌──────────────┐  ┌─────────────┐
                     │ 7. Calendar  │  │ 8. Transfer │
                     │Book Callback │  │  to Agent   │
                     └──────────────┘  └─────────────┘
```

### Node Details:

1. **Inbound Call Node** (Green)
   - Receives incoming calls
   - Twilio number: +1234567890
   - Entry point for the workflow

2. **Voice Node** (Blue)
   - AI Voice: Sarah - Friendly Female
   - Voice ID: EXAVITQu4vr4xnSDxMaL
   - Sets the voice for the entire call

3. **Prompt Node** (Purple)
   - System Prompt: "Friendly customer support agent named Alex"
   - First Message: "Hello! Thank you for calling..."
   - Defines agent personality and greeting

4. **AI Intent Node** (Orange)
   - Detects customer intent:
     - Product Inquiry
     - Support Issue
     - Billing Question
   - Uses AI to classify conversation

5. **AI Decision Node** (Yellow)
   - Routes call based on intent
   - Options:
     - Transfer to Sales
     - Transfer to Support
     - Handle with AI
     - Collect Info

6. **Knowledge Base Node** (Orange)
   - Company information
   - URLs: FAQ, Products pages
   - Provides context to AI

7. **Calendar Node** (Blue)
   - Books callback appointments
   - 30-minute duration
   - Google Calendar integration

8. **Human Handoff Node** (Purple)
   - Transfers to live agent
   - Department: Support
   - Transfer number: +1234567891

---

## 🎯 How to Test

### 1. View the Workflow

The workflow should now be open in your browser showing the visual flow diagram with all 8 nodes connected.

### 2. Interact with Nodes

**Click any node** to configure it:
- Voice node → Change voice selection
- Prompt node → Edit agent personality
- AI Intent → Add/modify intents
- Calendar → Configure booking settings

### 3. Test Connections

**Drag between nodes** to create new connections:
- Hover over a node
- Find the connection handles (small circles)
- Drag from one handle to another

### 4. Add More Nodes

**Drag from left sidebar** to add nodes:
- SMS node → Send text messages
- Email node → Send emails
- Webhook node → Call external APIs
- Variable node → Use dynamic data

### 5. Save Changes

**Click "Save" button** (top right) to save modifications

### 6. Test the Agent

**Click "Test" button** to test the workflow:
- Voice call test
- SMS test
- Email test

---

## 📋 What This Workflow Does

### Customer Journey:

1. **Call Arrives** → Inbound Call node receives it
2. **Voice Set** → Sarah's friendly voice is used
3. **Greeting** → "Hello! Thank you for calling. I'm Alex..."
4. **Understand Need** → AI detects if it's about products, support, or billing
5. **Make Decision** → AI decides best action
6. **Take Action** → Either:
   - Book a callback (Calendar)
   - Transfer to human (Human Handoff)
   - Continue with AI
   - Collect more information

### Features Demonstrated:

✅ **Call Handling** - Inbound call reception
✅ **AI Voice** - Natural voice selection
✅ **Personality** - Custom agent personality
✅ **Intent Detection** - AI understands customer needs
✅ **Smart Routing** - AI-powered decision making
✅ **Knowledge Base** - Access to company information
✅ **Appointment Booking** - Calendar integration
✅ **Human Escalation** - Transfer to live agent

---

## 🔧 Customize This Workflow

### Easy Customizations:

1. **Change Agent Name**
   - Click Prompt node
   - Edit: "Your name is Alex" → "Your name is [YourName]"

2. **Change Voice**
   - Click Voice node
   - Select different voice from dropdown

3. **Add Your Phone Number**
   - Click Inbound Call node
   - Replace +1234567890 with your Twilio number

4. **Modify Greeting**
   - Click Prompt node
   - Edit "First Message" field

5. **Add More Intents**
   - Click AI Intent node
   - Click "Add Intent"
   - Enter: name, description

### Advanced Customizations:

1. **Add SMS Follow-up**
   - Drag SMS node onto canvas
   - Connect from AI Decision node
   - Configure message template

2. **Add Email Notification**
   - Drag Email node onto canvas
   - Connect after Human Handoff
   - Set recipient email

3. **Add Variable Storage**
   - Drag Variable node onto canvas
   - Store customer name, phone, etc.
   - Use in other nodes

4. **Add Custom Code**
   - Drag Code node onto canvas
   - Write custom JavaScript logic
   - Process data, call APIs, etc.

---

## ✅ Testing Checklist

Use this to verify the workflow works:

- [ ] Workflow loads in browser
- [ ] All 8 nodes are visible
- [ ] All 7 connections are visible
- [ ] Can click and configure nodes
- [ ] Can save changes
- [ ] Can add new nodes by dragging
- [ ] Can create new connections
- [ ] Can delete nodes/connections
- [ ] Console shows no errors
- [ ] AI Copilot panel works

---

## 🎓 Next Steps

### Learn More:

1. **Experiment** - Try adding/removing nodes
2. **Customize** - Make it your own use case
3. **Test** - Use the Test button to try it
4. **Deploy** - When ready, activate the workflow

### Build Your Own:

1. Click "New Workflow" to start fresh
2. Start with Inbound/Outbound Call node
3. Add Voice and Prompt
4. Add your logic nodes
5. Save and test!

---

## 📚 Node Reference

Quick reference for available nodes:

**Call Nodes:**
- Inbound Call, Outbound Call, Voice Call

**AI Nodes:**
- AI Decision, AI Generator, AI Extract, AI Intent

**Communication:**
- SMS, MMS, Email

**Configuration:**
- Voice, Prompt, Variables, Knowledge

**Triggers:**
- Trigger, Keywords, Human Handoff

**Tools:**
- Calendar, Code, Webhook, Test

---

## 🆘 Troubleshooting

**Workflow doesn't load?**
- Check you're logged in
- Try this direct link: http://localhost:5173/app/voiceflow-builder/691e44f15573f92273ff4914

**Nodes won't drag?**
- Refresh the page
- Check browser console for errors

**Can't save?**
- Check backend is running (lsof -ti:5001)
- Check browser console

**Test button doesn't work?**
- Configure test phone number first
- Make sure Twilio is set up

---

## Summary

✅ **Created:** Test Customer Support Agent workflow
✅ **Nodes:** 8 different node types
✅ **Connections:** 7 edges showing flow
✅ **Features:** Voice AI, Intent Detection, Smart Routing, Calendar, Transfer
✅ **Ready:** Open link and start testing!

**Enjoy testing the VoiceFlow Builder!** 🚀
