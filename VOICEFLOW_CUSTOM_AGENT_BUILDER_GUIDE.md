# VoiceFlow Custom Voice Agent Builder Guide

## Overview

Your VoiceFlow CRM has an **AI Voice Agent Wizard** that allows you to build custom voice agents with any of your **39 available ElevenLabs voices**.

## Available Voices

You have access to **39 voices** in your ElevenLabs library:

### Female Voices (9 total)
1. **Sarah** - Young, American, general use
2. **Laura** - Young, American, general use
3. **Alice** - Middle-aged, British, general use
4. **Matilda** - Middle-aged, American, general use
5. **Jessica** - Young, American, general use
6. **Lily** - Middle-aged, British-like voice
7. **Hope** - Young, American, conversational bestie
8. **Jessa** - Young, American, authentic and friendly
9. **Kerrigan** - Middle-aged, American, conversational

### Male Voices (26 total)
1. **Clyde** - Middle-aged, American
2. **Roger** - Middle-aged, American
3. **Charlie** - Young, Australian
4. **George** - Middle-aged, British
5. **Callum** - Middle-aged
6. **Harry** - Young, American
7. **Liam** - Young, American
8. **Will** - Young, American
9. **Eric** - Middle-aged, American (perfect for agentic use cases)
10. **Chris** - Middle-aged, American
11. **Brian** - Middle-aged, American
12. **Daniel** - Middle-aged, British
13. **Bill** - Old, American
14. **David Esposito** - Middle-aged, American
15. **Andrei** - Middle-aged, Russian accent
16. **Alexandr Vlasov** - Middle-aged, Russian, professional
17. **Artem Lebedev** - Middle-aged, Russian, podcast pro
18. **Mr. Magoo** - Middle-aged, Italian
19. **Joshua** - Young, American, calm explainer
20. **Prince Nuri the Second** - Young, Moscow accent
21. **Paul Letuchka** - Middle-aged
22. **Nikolay** - Middle-aged, Russian
23. **BRIAN** - Young, Latin American, narration/podcast
24. **James** - Middle-aged, American
25. **Ryan Kurk** - Young, American
26. **Георгий Г** - Middle-aged, perfect for audiobooks

### Neutral Voices (1 total)
1. **River** - Middle-aged, American, relaxed narrator

### Custom Cloned Voices (3 total)
1. **Charles B** - Custom clone
2. **Josh B** - Custom clone
3. **Untitled voice** - Custom clone

## How to Build a Custom Voice Agent

### Method 1: Using the UI (Recommended)

1. **Access the Agent Builder:**
   ```
   http://localhost:3000/app/agents
   ```

2. **Click "Create New Agent"** or use the **AI Voice Agent Wizard**

3. **Select a Voice:**
   - Browse through **all 39 voices**
   - Filter by:
     - **Gender**: Female, Male, Neutral
     - **Category**: Professional, Friendly, Conversational, etc.
     - **Search**: Type voice name or description

4. **Configure Your Agent:**
   - **Name**: Give your agent a name (e.g., "Sales Assistant")
   - **Type**: Select template or custom
   - **Script/Prompt**: Write what the agent should say
   - **First Message**: Agent's greeting
   - **Language**: English (or other supported languages)

5. **Save and Test:**
   - Click "Create Agent"
   - Use "Test Call" to call yourself
   - Verify the voice and conversation flow

### Method 2: API Direct (Advanced)

```bash
# 1. Get all available voices
curl -X GET http://localhost:5000/api/agents/helpers/voices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Create agent with specific voice
curl -X POST http://localhost:5000/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Custom Sales Agent",
    "type": "custom",
    "voiceId": "EXAVITQu4vr4xnSDxMaL",
    "voiceName": "Sarah",
    "script": "You are a friendly sales assistant...",
    "firstMessage": "Hi! This is Sarah calling from VoiceFlow CRM...",
    "configuration": {
      "language": "en",
      "temperature": 0.8
    }
  }'
```

## Voice Selection Guide

### For Sales & Outbound Calling

**Best Female Voices:**
- **Sarah** (`EXAVITQu4vr4xnSDxMaL`) - Professional, warm
- **Jessica** (`cgSgspJ2msm6clMCkdW9`) - Young, playful, trendy
- **Matilda** (`XrExE9yKIg1WjnnlVkGX`) - Professional woman, many use cases

**Best Male Voices:**
- **Eric** (`cjVigY5qzO86Huf0OWal`) - Smooth tenor, perfect for agentic use
- **George** (`JBFqnCBsd6RMkjVDRZzb`) - British, warm resonance
- **Brian** (`nPczCjzI2devNBz1zQrb`) - Resonant, comforting, great for ads

### For Customer Support

**Best Female Voices:**
- **Hope** (`uYXf8XasLslADfZ2MB4u`) - Conversational bestie, natural
- **Jessa** (`yj30vwTGJxSHezdAGsv9`) - Authentic, friendly, grounded
- **Alice** (`Xb7hH8MSUJpSbSDYk0k2`) - British, clear and engaging

**Best Male Voices:**
- **Chris** (`iP95p4xoKVk53GoZ742B`) - Natural, down-to-earth
- **Will** (`bIHbv24MWmeRgasZH58o`) - Conversational, laid back
- **Roger** (`CwhRBWXzGAHq8TQ4Fs17`) - Easy going, casual conversations

### For Professional/Corporate

**Best Female Voices:**
- **Laura** (`FGY2WhTYpPnrIDTdsKH5`) - Sunny enthusiasm
- **Lily** (`pFZP5JQG7iQjIQuC4Bku`) - Velvety British, warmth and clarity

**Best Male Voices:**
- **Daniel** (`onwK4e9ZLuTAKqWW03F9`) - British, professional broadcast
- **David Esposito** (`iEw1wkYocsNy7I7pteSN`) - Captivating American, relatable
- **James** (`ePn9OncKq8KyJvrTRqTi`) - Easy going, upbeat, relaxed

### For International/Multilingual

**Best Voices:**
- **Andrei** (`pvY1pikBdoI4SB62vEVo`) - Russian, calm and friendly
- **Alexandr Vlasov** (`txnCCHHGKmYIwrn7HfHQ`) - Russian, professional voiceover
- **BRIAN** (`XgQWNZcJ8SRkxXwwhPTo`) - Latin American Spanish
- **Mr. Magoo** (`13Cuh3NuYvWOVQtLbRN8`) - Italian, warm and fascinating

## Agent Templates Available

The wizard includes pre-built templates for:

### Sales & Business
- **Sales Outbound** - Cold calling, lead qualification
- **Sales Follow-up** - Prospect follow-up
- **Demo Scheduler** - Schedule product demos

### Customer Service
- **Customer Support** - Handle inquiries
- **Technical Support** - Troubleshoot issues
- **Order Status** - Delivery updates

### Appointments
- **Appointment Reminder** - Confirmations
- **Appointment Booking** - Schedule services
- **Rescheduling Agent** - Handle changes

### Financial
- **Collections** - Payment reminders
- **Payment Reminder** - Due date reminders
- **Invoice Follow-up** - Unpaid invoices

### Marketing
- **Event Promotion** - Promote events
- **Product Launch** - New product announcements
- **Feedback Survey** - Collect feedback

## Technical Configuration

### Voice Models (TTS Engines)

For **English agents**, use:
- ✅ `eleven_flash_v2` - Fast, recommended
- ✅ `eleven_turbo_v2` - Also supported

For **non-English** or multilingual:
- ✅ `eleven_turbo_v2_5` - Multi-language support
- ✅ `eleven_multilingual_v2` - Best for multiple languages

❌ **DO NOT USE** `eleven_flash_v2_5` for English - it's not supported

### Supported Languages

The system supports **30+ languages**:
- English, Spanish, French, German, Italian
- Portuguese, Polish, Dutch, Chinese, Japanese
- Korean, Hindi, Arabic, Russian, Turkish
- And many more!

## Current UI Components

### AIVoiceAgentWizard (`/frontend/src/components/AIVoiceAgentWizard.jsx`)

**Features:**
- ✅ Step-by-step wizard interface
- ✅ Template selection
- ✅ Voice selection with preview
- ✅ Custom prompt configuration
- ✅ Advanced settings (voice settings, language, etc.)
- ⚠️ Currently uses hardcoded voice list (56 voices)
- ⚠️ Needs update to fetch your actual 39 voices

**Current Hardcoded Voices:** 56 (outdated)
**Your Actual Voices:** 39 (need to fetch dynamically)

### How to Update the Wizard

The wizard needs to be updated to fetch **your actual 39 voices** from the API instead of using the hardcoded list.

**Current Code (Lines 208-264):**
```javascript
const ELEVENLABS_VOICES = [
  // 56 hardcoded voices (many may not exist in your account)
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', ... },
  ...
];
```

**Should Be Updated To:**
```javascript
const [availableVoices, setAvailableVoices] = useState([]);

useEffect(() => {
  // Fetch actual voices from your ElevenLabs account
  const fetchVoices = async () => {
    try {
      const response = await api.get('/agents/helpers/voices');
      const voices = response.data.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender || 'Unknown',
        accent: v.labels?.accent || 'Unknown',
        age: v.labels?.age || 'Unknown',
        description: v.description || ''
      }));
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    }
  };

  fetchVoices();
}, []);
```

## Testing Your Custom Agent

### 1. Create Agent via UI

1. Go to http://localhost:3000/app/agents
2. Click "Create New Agent" or use AI Builder
3. Select template or start from scratch
4. Choose voice from the 39 available
5. Configure script and settings
6. Save agent

### 2. Test Call

1. Find your agent in dashboard
2. Click "Test Call"
3. Enter your phone: `480-255-5887`
4. Click "Initiate Call"
5. **Answer and verify:**
   - Agent speaks with selected voice
   - Conversation follows your script
   - Voice quality is good

### 3. Verify in Database

```bash
# Check agent was created correctly
mongo voiceflow-crm
db.voiceagents.find({ name: "Your Agent Name" }).pretty()
```

Should show:
- `elevenLabsAgentId`: Starts with `agent_`
- `voiceId`: The voice ID you selected
- `voiceName`: The voice name
- `script`: Your custom script

## Troubleshooting

### Voice not working

**Issue:** Agent calls but no voice output

**Solution:** Already fixed in `elevenLabsService.js:149-155`

Verify the fix is applied:
```bash
grep -A 3 "If no personalizedScript is provided" backend/services/elevenLabsService.js
```

### Voice not available

**Issue:** Selected voice doesn't exist

**Cause:** Using hardcoded voice ID that's not in your account

**Solution:**
1. Run `node list-all-voices.js` to see your actual voices
2. Use a voice_id from that list
3. Update wizard to fetch real voices dynamically

### Agent not created in ElevenLabs

**Issue:** "Agent not properly created in ElevenLabs"

**Solution:**
1. Check `ELEVENLABS_API_KEY` is set
2. Verify voice ID is valid
3. Ensure agent creation doesn't error
4. Check backend logs for errors

## Summary

### What You Have

✅ **39 voices** available in your ElevenLabs account
✅ **AI Voice Agent Wizard** UI for building agents
✅ **Voice selection** with filtering and search
✅ **Template library** for common use cases
✅ **Custom script** configuration
✅ **Test calling** functionality
✅ **Voice fix** applied (no more silent calls)

### What Needs Updating

⚠️ **AIVoiceAgentWizard** - Update to fetch real 39 voices from API instead of hardcoded 56
⚠️ **Voice categories** - Dynamically generate based on actual voice metadata
⚠️ **Voice previews** - Add audio samples for each voice

### Recommended Next Steps

1. **Update the wizard** to fetch your actual 39 voices
2. **Test agent creation** with each voice category
3. **Create voice library** page showing all available voices
4. **Add voice preview** audio samples

---

**Created:** 2025-11-16
**Last Updated:** 2025-11-16
**Status:** Ready to Use (with manual voice selection)
**Voices Available:** 39 from ElevenLabs
