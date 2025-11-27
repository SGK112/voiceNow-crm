# Voice Chat Testing Guide - Marketing Page

## Overview
The voice chat feature on the marketing page has been completely rebuilt with robust error handling, debugging, and user feedback.

## What Was Fixed

### 1. **Widget Initialization Issues**
- **Problem**: Widget was using `display: none !important` which prevented proper initialization
- **Solution**: Changed to position widget off-screen while keeping it functional
- **Code**: Modified CSS to use `position: fixed` with negative offset instead of `display: none`

### 2. **API Integration**
- **Problem**: Code was trying to trigger widget with `.click()` which doesn't work
- **Solution**: Implemented proper ElevenLabs API methods:
  - `widget.startConversation()` - Starts voice conversation
  - `widget.endConversation()` - Ends voice conversation

### 3. **Timing & Loading**
- **Problem**: Widget might not be ready when user clicks
- **Solution**:
  - Added initialization checks every 500ms for up to 10 seconds
  - Multiple initialization attempts (DOMContentLoaded + window.load)
  - Clear console logging for debugging
  - Status messages for user feedback

### 4. **Event Handling**
- **Added**: Comprehensive event listeners:
  - `conversationstart` - When voice starts
  - `conversationend` - When voice ends
  - `error` - Error handling
  - `message` - Real-time status updates

### 5. **Error Handling**
- Validates widget availability before every action
- Graceful degradation with user-friendly messages
- Comprehensive console logging for debugging
- Fallback behaviors

## Testing Instructions

### Step 1: Open the Marketing Page
```bash
# Open in browser (frontend should already be running on port 5173)
open http://localhost:5173/marketing.html
```

### Step 2: Open Browser Console
Press `F12` or `Cmd+Option+I` to open DevTools and monitor console output.

### Expected Console Output:
```
Starting ElevenLabs widget initialization...
Attempt 1: Widget element found, checking for methods...
✓ ElevenLabs widget fully loaded and ready!
```

### Step 3: Open the Chat Widget
1. Click the floating microphone button (🎙️) in the bottom-right corner
2. The chat widget should slide in

### Step 4: Switch to Voice Mode
1. Click the "🎙️ Voice" tab at the top of the widget
2. You should see a large circular microphone button
3. Status should say "Click to start talking"

### Step 5: Start Voice Conversation
1. Click the large microphone button
2. **Expected behavior**:
   - Button should pulse with animation
   - Status changes: "Connecting..." → "Listening... Speak now!"
   - Console logs: "User clicked voice button - attempting to start conversation"
   - Console logs: "✓ Conversation started successfully"

### Step 6: Speak to the Agent
1. Say something like: "What is VoiceNow CRM?"
2. **Expected behavior**:
   - Status updates to "Agent speaking..." when AI responds
   - You should hear the AI voice response
   - Status returns to "Listening..." when ready for you to speak again

### Step 7: End Conversation
1. Click the microphone button again to end
2. **Expected behavior**:
   - Animation stops
   - Status returns to "Click to start talking"
   - Console logs: "✓ Conversation ended successfully"

## Troubleshooting

### Issue: "Voice not ready. Please refresh."
**Cause**: Widget element not found in DOM
**Solution**:
1. Refresh the page
2. Check if script is loading: Look for `https://elevenlabs.io/convai-widget/index.js` in Network tab
3. Check agent ID is correct in HTML

### Issue: "Voice loading... Please try again in a moment."
**Cause**: Widget loaded but methods not available yet
**Solution**: Wait 2-3 seconds and try again

### Issue: "Failed to start voice. Please try again."
**Cause**: Error calling startConversation()
**Solutions**:
1. Check if agent is set to "Public" in ElevenLabs dashboard
2. Verify agent ID: `agent_9701k9xptd0kfr383djx5zk7300x`
3. Check internet connection
4. Check browser console for specific errors

### Issue: No sound/microphone not working
**Cause**: Browser permissions
**Solution**:
1. Grant microphone permissions when prompted
2. Check browser microphone settings
3. Ensure no other app is using the microphone

## Technical Details

### Agent Configuration
- **Agent ID**: `agent_9701k9xptd0kfr383djx5zk7300x`
- **Platform**: ElevenLabs Conversational AI
- **Widget Script**: `https://elevenlabs.io/convai-widget/index.js`
- **Required**: Agent must be set to "Public" in ElevenLabs dashboard

### Files Modified
1. `/frontend/public/marketing.html` - Main marketing page (source)
2. `/frontend/dist/marketing.html` - Built version (synced)

### Key Functions
- `initializeElevenLabs()` - Loads and validates widget
- `setupElevenLabsListeners()` - Attaches event handlers
- `startVoice()` - Initiates voice conversation
- `stopVoice()` - Ends voice conversation

### Widget Methods Used
```javascript
// Start conversation
widget.startConversation()

// End conversation
widget.endConversation()

// Event listeners
widget.addEventListener('conversationstart', callback)
widget.addEventListener('conversationend', callback)
widget.addEventListener('error', callback)
widget.addEventListener('message', callback)
```

## Success Criteria

✅ **Widget loads successfully** (console shows "✓ ElevenLabs widget fully loaded and ready!")
✅ **Voice button is clickable** (no errors when switching to voice mode)
✅ **Conversation starts** (microphone activates, status updates)
✅ **User can speak** (microphone picks up audio)
✅ **AI responds** (voice plays back, status shows "Agent speaking...")
✅ **Conversation can be ended** (button click stops conversation gracefully)
✅ **Can restart** (clicking again after ending starts new conversation)
✅ **Clean close** (closing widget stops any active conversation)

## Demo Flow for Client

1. **Open page** - Show clean, professional landing page
2. **Click chat button** - Demonstrate smooth slide-in animation
3. **Show chat mode** - Type a question, get AI response
4. **Switch to voice** - Click voice tab, show voice interface
5. **Start speaking** - Click mic, ask: "What pricing plans do you offer?"
6. **AI responds** - Let AI explain the pricing in natural voice
7. **Continue conversation** - Ask follow-up: "Tell me more about the Professional plan"
8. **End gracefully** - Click to end, show it returns to ready state

## Notes
- Widget is hidden visually but functionally active (positioned off-screen)
- All debug logging can be removed for production (search for `console.log`)
- Widget works on mobile browsers (tested responsive design)
- Conversation automatically ends after period of inactivity (ElevenLabs default)
