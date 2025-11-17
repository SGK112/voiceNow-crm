# Agent Studio Voice Library Integration Guide

## Overview

The Agent Studio now features full integration with the ElevenLabs Voice Library, giving you access to 336+ high-quality voices for your AI agents. You can browse, search, preview, and select voices directly within the Agent Studio interface.

## Features

✅ **336+ Premium Voices**: Access to ElevenLabs' entire voice library
✅ **Real-time Search**: Filter voices by name, accent, gender, age, and description
✅ **Voice Preview**: Listen to voice samples before selecting
✅ **Visual Voice Selection**: Beautiful modal interface with voice details
✅ **Voice Metadata**: See gender, accent, age, and descriptions for each voice
✅ **Seamless Integration**: Voice configuration embedded in Agent Studio workflow
✅ **Advanced Settings**: Fine-tune stability, similarity, and style settings

## How to Use

### 1. Open Agent Studio

Navigate to your agent configuration:
- Go to **Agents** page
- Click on an agent or create a new one
- Click **Open Agent Studio** or **Configure Agent**

### 2. Add Voice Configuration Node

In the Agent Studio canvas:
1. Locate **Voice Configuration** in the left sidebar under "Core" category
2. Drag the Voice Configuration node onto the canvas
3. Click the node to open configuration panel on the right

### 3. Select a Voice

#### First-Time Selection:
1. Click the **"Select Voice from Library"** button
2. A modal will open showing the voice library

#### Changing an Existing Voice:
1. Click the **"Change"** button next to the current voice
2. The voice library modal will open

### 4. Browse and Search Voices

**Search Options:**
- Type in the search box to filter voices
- Search by:
  - Voice name (e.g., "Sarah", "Alex")
  - Accent (e.g., "American", "British", "Australian")
  - Description keywords (e.g., "professional", "warm", "energetic")
  - Gender (e.g., "male", "female", "neutral")

**Voice Information Displayed:**
- **Name**: Voice identifier
- **Gender**: Male, Female, or Neutral
- **Accent**: Geographic accent (American, British, etc.)
- **Age**: Young, Middle-aged, Old
- **Description**: Detailed voice characteristics

### 5. Preview Voices

Before selecting a voice:
1. Look for the **Play button** (▶️) on the right side of each voice card
2. Click to play a preview audio sample
3. The button will show a pause icon (⏸) while playing
4. Listen to multiple voices to find the perfect match

### 6. Select Your Voice

1. Click anywhere on the voice card to select it
2. The modal will close automatically
3. Your selected voice will appear in the configuration panel with:
   - Voice name
   - Gender and accent information
   - Option to change the voice

### 7. Configure Voice Settings

After selecting a voice, fine-tune these settings:

#### Voice Model
Choose the AI model for voice generation:
- **Turbo v2.5 (Fastest)**: Lowest latency, great for real-time conversations
- **Flash v2 (Recommended)**: Best balance of quality and speed
- **Turbo v2**: High quality with fast processing
- **Multilingual v2**: For non-English languages

#### Stability (0-100%)
Controls voice consistency:
- **Lower (0-40%)**: More expressive and varied
- **Medium (40-60%)**: Balanced natural speech
- **Higher (60-100%)**: More consistent and stable

**Recommended**: 50% for conversational agents

#### Similarity (0-100%)
How closely to match the original voice:
- **Lower (0-50%)**: More creative interpretation
- **Medium (50-75%)**: Good balance
- **Higher (75-100%)**: Very close to original

**Recommended**: 75% for professional applications

#### Style (0-100%)
Style exaggeration level:
- **0%**: Neutral, natural delivery
- **50%**: Moderate style enhancement
- **100%**: Maximum style expression

**Recommended**: 0-20% for most business use cases

## Voice Library API

The voice library integration uses the following endpoint:

```http
GET /api/agents/helpers/voice-library
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Voices per page (default: 100)

**Response Format:**
```json
{
  "voices": [
    {
      "voice_id": "EXAVITQu4vr4xnSDxMaL",
      "name": "Sarah",
      "labels": {
        "gender": "female",
        "age": "young",
        "accent": "american"
      },
      "description": "Young adult woman with confident and warm tone",
      "preview_url": "https://...",
      "category": "premade"
    }
  ],
  "has_more": false,
  "page": 1
}
```

## Voice Selection Best Practices

### For Different Use Cases

**Customer Service / Support:**
- Gender: Any
- Age: Young to Middle-aged
- Accent: Match your customer base
- Tone: Professional, patient, clear
- **Recommended**: Sarah, Alex, River

**Sales / Marketing:**
- Gender: Varies by audience
- Age: Young to Middle-aged
- Accent: American (most universal)
- Tone: Enthusiastic, engaging, confident
- **Recommended**: Lisa, Laura, Harry

**Appointment Booking:**
- Gender: Any
- Age: Young to Middle-aged
- Accent: Clear, neutral
- Tone: Friendly, helpful, organized
- **Recommended**: Mike, Emily, River

**Collections / Payment Reminders:**
- Gender: Male preferred
- Age: Middle-aged
- Accent: Professional
- Tone: Firm but respectful
- **Recommended**: James, George, Callum

**General Information / IVR:**
- Gender: Neutral or Female
- Age: Middle-aged
- Accent: Clear, universal
- Tone: Professional, clear
- **Recommended**: River, Sarah, Clyde

### Voice Settings by Use Case

| Use Case | Stability | Similarity | Style | Model |
|----------|-----------|------------|-------|-------|
| **Professional/Business** | 60-70% | 75-85% | 0-10% | Flash v2 |
| **Conversational/Casual** | 40-50% | 70-80% | 10-20% | Turbo v2.5 |
| **Character/Creative** | 30-40% | 60-70% | 30-50% | Turbo v2 |
| **Multilingual** | 50-60% | 75-85% | 0-10% | Multilingual v2 |

## Technical Implementation

### Frontend Component Structure

The VoiceConfigPanel includes:
- Voice selection button/display
- Modal for voice library browsing
- Search functionality
- Voice preview player
- Voice settings sliders

### State Management

```javascript
const [voices, setVoices] = useState([]);
const [loading, setLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
const [selectedVoice, setSelectedVoice] = useState(null);
const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
const [previewPlaying, setPreviewPlaying] = useState(null);
```

### Voice Configuration Object

```javascript
{
  voiceId: "EXAVITQu4vr4xnSDxMaL",
  voiceName: "Sarah",
  voiceGender: "female",
  voiceAccent: "american",
  model: "eleven_flash_v2",
  stability: 50,
  similarity: 75,
  style: 0
}
```

## Troubleshooting

### Voices Not Loading

**Problem**: Voice library modal shows "Loading voices..." indefinitely

**Solutions:**
- Check your internet connection
- Verify JWT token is valid (check localStorage)
- Check browser console for API errors
- Ensure backend is running and accessible

### Preview Audio Not Playing

**Problem**: Click play button but no audio plays

**Solutions:**
- Check browser audio permissions
- Verify `preview_url` exists for the voice
- Try a different browser
- Check browser console for audio errors
- Some voices may not have preview samples

### Voice Not Saving

**Problem**: Selected voice doesn't persist after closing modal

**Solutions:**
- Check that you clicked the voice card (not just the preview button)
- Verify the configuration is being saved to the node
- Check browser console for JavaScript errors

### Search Not Working

**Problem**: Search doesn't filter voices

**Solutions:**
- Ensure voices are loaded first
- Check that search term is being entered correctly
- Try searching by different fields (name, accent, etc.)
- Clear search and try again

## Advanced Usage

### Programmatic Voice Selection

You can programmatically set a voice in the configuration:

```javascript
onChange({
  ...config,
  voiceId: "EXAVITQu4vr4xnSDxMaL",
  voiceName: "Sarah",
  voiceGender: "female",
  voiceAccent: "american",
  model: "eleven_flash_v2",
  stability: 50,
  similarity: 75,
  style: 0
});
```

### Custom Voice Filtering

Extend the filtering logic:

```javascript
const filteredVoices = voices.filter(voice => {
  // Custom filters
  const matchesGender = selectedGender ? voice.labels?.gender === selectedGender : true;
  const matchesAccent = selectedAccent ? voice.labels?.accent === selectedAccent : true;
  const matchesSearch = voice.name.toLowerCase().includes(searchTerm.toLowerCase());

  return matchesGender && matchesAccent && matchesSearch;
});
```

### Batch Voice Testing

To test multiple voices quickly:
1. Open the voice library
2. Use search to narrow down candidates
3. Preview each voice systematically
4. Take notes on voice IDs that work well
5. Compare settings for optimal configuration

## Integration with Agent Workflow

### Voice Node Connection

The Voice Configuration node should be connected to:
- **Upstream**: Trigger nodes (Inbound Call, Outbound Call)
- **Downstream**: Greeting, Conversation Flow nodes

### Example Workflow

```
[Inbound Call] → [Voice Configuration] → [Greeting] → [Questions] → [Actions]
```

### Multiple Voice Configurations

You can use multiple voice configuration nodes for:
- Different conversation stages
- Different emotional tones
- A/B testing voices
- Escalation paths (different voice for transfers)

## Performance Optimization

### Voice Library Loading

- Voices are fetched once per session
- Results are cached in component state
- Default limit: 50 voices for fast loading
- Increase limit to 100 for full library access

### Preview Audio

- Audio previews use HTML5 Audio API
- Only one preview can play at a time
- Audio stops automatically when complete
- Minimal memory footprint

## Future Enhancements

Planned features:

- [ ] Voice favorites/saved voices
- [ ] Voice comparison side-by-side
- [ ] Advanced filtering (multiple criteria)
- [ ] Voice recommendations based on use case
- [ ] Custom voice upload integration
- [ ] Voice cloning integration
- [ ] A/B testing framework for voices
- [ ] Voice analytics (which voices perform best)

## Related Documentation

- [Agent Studio Guide](./AGENT_STUDIO_GUIDE.md)
- [Knowledge Base Upload Guide](./KNOWLEDGE_BASE_UPLOAD_GUIDE.md)
- [ElevenLabs Voice Library Guide](./ELEVENLABS_VOICE_LIBRARY_GUIDE.md)
- [Voice Integration Guide](./VOICE_CALL_INTEGRATION_GUIDE.md)

## Support

For issues or questions:
- Check browser console for errors
- Verify API endpoint is accessible
- Review ElevenLabs API documentation
- Test with a known working voice ID first

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
**Voice Library**: 336+ voices from ElevenLabs
