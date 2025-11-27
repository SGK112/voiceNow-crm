# Voice Chat Pre-Demo Checklist ✓

## Before the Demo

### 1. Browser Setup
- [ ] Use Chrome or Safari (best compatibility)
- [ ] Open http://localhost:5173/marketing.html
- [ ] Open DevTools Console (F12 or Cmd+Option+I)
- [ ] Clear browser cache if needed (Cmd+Shift+R)

### 2. Verify Widget Loads
Watch console for:
```
✓ Starting ElevenLabs widget initialization...
✓ Attempt 1: Widget element found, checking for methods...
✓ ✓ ElevenLabs widget fully loaded and ready!
```

**If you see errors:**
- Refresh the page (Cmd+R)
- Check internet connection
- Verify agent ID in marketing.html line 1791

### 3. Permission Check
- [ ] Grant microphone permissions when prompted
- [ ] Test microphone in System Settings first
- [ ] Close other apps using microphone (Zoom, etc.)

### 4. Quick Functionality Test

#### Test 1: Open Chat Widget
1. Click floating 🎙️ button (bottom-right)
2. Widget slides in smoothly
3. Shows "AI Assistant" header

#### Test 2: Chat Mode (Text)
1. Type: "What is VoiceNow CRM?"
2. AI responds with information
3. Response includes suggestion chips

#### Test 3: Switch to Voice
1. Click "🎙️ Voice" tab
2. Large microphone button appears
3. Status: "Click to start talking"

#### Test 4: Start Voice Conversation
1. Click large microphone button
2. Status: "Connecting..." → "Listening... Speak now!"
3. Button pulses with animation
4. Console: "✓ Conversation started successfully"

#### Test 5: Speak & Listen
1. Say: **"What pricing plans do you offer?"**
2. Wait for status: "Agent speaking..."
3. Hear AI voice response clearly
4. Status returns: "Listening..."

#### Test 6: Follow-up Question
1. Say: **"Tell me about the Professional plan"**
2. AI provides detailed answer
3. Voice quality is clear and natural

#### Test 7: End Conversation
1. Click microphone button again
2. Animation stops
3. Status: "Click to start talking"
4. Console: "✓ Conversation ended successfully"

#### Test 8: Restart & Close
1. Click mic again - starts new conversation
2. Click X to close widget
3. Voice stops if active
4. Returns to chat mode

## Demo Script

### Opening (30 seconds)
"This is Remodely.ai's VoiceNow CRM - a complete platform for AI voice automation. Let me show you our intelligent assistant that combines chat and voice AI."

### Chat Demo (30 seconds)
1. Click chat button
2. Type: "How does VoiceNow CRM work?"
3. Show AI response with suggestions
4. "The chat mode uses advanced AI to answer questions about our platform, pricing, and features."

### Voice Demo (60 seconds)
1. Click Voice tab
2. "Now let me show you the voice AI - this uses ElevenLabs technology for natural conversations."
3. Click microphone
4. Ask: **"What makes VoiceNow CRM different from other solutions?"**
5. Let AI respond (should mention: done-for-you service, visual workflows, pre-built agents)
6. Ask follow-up: **"What's included in your pricing?"**
7. Let AI explain pricing tiers

### Closing (30 seconds)
"As you can see, the voice AI provides natural, conversational responses. This same technology powers the voice agents we build for our clients - handling calls, qualifying leads, and booking appointments 24/7."

## Common Issues & Quick Fixes

### Issue: Widget doesn't load
**Fix**: Refresh page (Cmd+R)

### Issue: No microphone access
**Fix**: Click address bar → Site Settings → Allow Microphone

### Issue: Voice sounds robotic
**Note**: This is actually not an issue - ElevenLabs voices are very natural. If quality is poor, check internet speed.

### Issue: Conversation doesn't start
**Fix**:
1. Check console for errors
2. Verify "✓ widget fully loaded" message appeared
3. Wait 2-3 seconds after page load
4. Try clicking mic again

### Issue: Can't hear AI response
**Fix**:
1. Check speaker volume
2. Check browser isn't muted
3. Check System Sound Output settings

### Issue: AI doesn't understand
**Fix**: Speak clearly, avoid background noise

## Agent Behavior Notes

The AI agent is trained to discuss:
- ✓ VoiceNow CRM features
- ✓ Pricing plans ($149, $299, $799)
- ✓ Done-for-you agent services
- ✓ Visual workflow builder
- ✓ Pre-built vs custom agents
- ✓ Integration capabilities
- ✓ Free trial information
- ✓ How it works / getting started

## Technical Verification

Run these in browser console:

```javascript
// Check if widget exists
document.querySelector('elevenlabs-convai')

// Check if methods available
document.querySelector('elevenlabs-convai').startConversation

// Check widget ready status
widgetReady
```

Should return:
- Element object
- function
- true

## Final Check Before Demo

- [ ] Page loads without errors
- [ ] Console shows "✓ widget fully loaded and ready!"
- [ ] Chat mode works (text responses)
- [ ] Voice mode button appears
- [ ] Microphone permissions granted
- [ ] Can start voice conversation
- [ ] AI voice is clear and responsive
- [ ] Can end and restart conversation
- [ ] No console errors
- [ ] Speaker volume at comfortable level

## Success! 🎉

If all checks pass, the demo is ready to go!

**Duration**: ~2 minutes for full demo
**Best Questions to Ask**:
1. "What is VoiceNow CRM?"
2. "What pricing plans do you offer?"
3. "How does the done-for-you service work?"
4. "Can you integrate with my existing tools?"

**Backup Plan**: If voice fails, fall back to chat mode demo - it's also impressive!
