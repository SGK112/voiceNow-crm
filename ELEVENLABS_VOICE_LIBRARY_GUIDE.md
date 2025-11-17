# ElevenLabs Voice Library Integration Guide

## 🎉 Amazing Discovery!

You have access to **thousands of voices** through the ElevenLabs Voice Library!

## Two Types of Voices Available

### 1. **Your Account Voices** (39 voices)
These are in your account already - ready to use immediately:
- **GET** `/v1/voices`
- **39 voices** total (9 female, 26 male, 1 neutral, 3 custom)
- No need to add - use directly

### 2. **Voice Library** (Thousands of voices!)
Community-shared voices you can browse and add:
- **GET** `/v1/shared-voices`
- **Thousands of voices** from the community
- Need to add to your account before using
- **POST** `/v1/voices/add/{public_owner_id}/{voice_id}` to add

## How the Voice Library Works

### Browse Shared Voices

**Endpoint:** `GET https://api.elevenlabs.io/v1/shared-voices`

**Response Structure:**
```json
{
  "voices": [
    {
      "voice_id": "gJx1vCzNCD1EQHT212Ls",
      "name": "Ava – Natural AI Voice",
      "public_owner_id": "300b35287e8acc21dd12bd610b831e19b47dc75e8b8c15c2bca80cdcb776ef2d",
      "gender": "female",
      "age": "young",
      "accent": "american",
      "use_case": "conversational",
      "category": "professional",
      "description": "Clear, helpful voice for AI agents, support flows...",
      "preview_url": "https://storage.googleapis.com/.../preview.mp3",
      "free_users_allowed": true,
      "cloned_by_count": 1,
      "verified_languages": [...]
    }
  ]
}
```

### Key Fields Explained

- **`voice_id`** - Unique voice identifier
- **`public_owner_id`** - Creator's ID (needed to add voice)
- **`name`** - Voice name and description
- **`gender`** - female, male, neutral
- **`age`** - young, middle_aged, old
- **`accent`** - american, british, indian, etc.
- **`use_case`** - conversational, narrative_story, informative_educational, social_media
- **`category`** - professional, generated, cloned
- **`preview_url`** - Listen to voice sample
- **`free_users_allowed`** - Can free users use this voice?
- **`verified_languages`** - Languages and models supported

### Add a Voice to Your Account

**Endpoint:** `POST /v1/voices/add/{public_owner_id}/{voice_id}`

**Example:**
```bash
curl -X POST \
  "https://api.elevenlabs.io/v1/voices/add/300b35287e8acc21dd12bd610b831e19b47dc75e8b8c15c2bca80cdcb776ef2d/gJx1vCzNCD1EQHT212Ls" \
  -H "xi-api-key: $ELEVENLABS_API_KEY"
```

**After adding:**
- Voice appears in `GET /v1/voices` (your account voices)
- Can now use it in your agents
- Counts toward your voice limit (check your plan)

## Example Voices from Library

### Professional AI Voices

**Ava – Natural AI Voice**
- ID: `gJx1vCzNCD1EQHT212Ls`
- Gender: Female, Young, American
- Use: AI agents, support flows, conversational
- Free: Yes

**Mike**
- ID: `MBGkxB3I4zPEcY1VatoS`
- Gender: Male, Middle-aged, American
- Use: Friendly conversational
- Free: Yes

**Devan**
- ID: `mC104ON19u9NruNfYC3j`
- Gender: Female, American
- Use: Warm narrative, nature/history storytelling
- Free: Yes

### Specialized Voices

**Toren — Soft Calm Sleep Voice**
- ID: `srsYBZV6KyIoJBKv1bpe`
- Gender: Male, Canadian
- Use: ASMR, sleep stories, meditation
- Free: Yes

**Mihir V - Social Media Influencer**
- ID: `fZpEbMnaJhQJwDY7lFcw`
- Gender: Male, Young, Indian accent
- Use: Reels, viral content, meme commentary
- Free: Yes

### International Voices

**César Barona**
- ID: `BALkepjFtWPcKCNjSuK0`
- Language: Spanish (Mexican)
- Gender: Male, Middle-aged
- Use: Informative, educational
- Free: Yes

**Helmut - News & Anchorman**
- ID: `Cqbq4nsuUe1we6J45miU`
- Language: German
- Gender: Male, Middle-aged
- Use: News, e-learning, corporate
- Free: Yes

**Rahmi – Turkish Narrator**
- ID: `updh8ok1r8v9dw9VcZ6U`
- Language: Turkish
- Gender: Male, Middle-aged
- Use: Relaxed narration
- Free: Yes

**Karolina G - Narrative & Resonant**
- ID: `Wuv1s5YTNCjL9mFJTqo4`
- Language: Spanish (Latin American)
- Gender: Female, Middle-aged
- Use: Meditation, calm, well-being
- Free: Yes

## How to Integrate into VoiceFlow

### Option 1: Add to Backend API

**Create new endpoint:** `GET /api/agents/helpers/voice-library`

```javascript
// backend/controllers/agentController.js

export const getVoiceLibrary = async (req, res) => {
  try {
    const elevenLabsService = getElevenLabsService();

    // Fetch shared voices
    const response = await axios.get('https://api.elevenlabs.io/v1/shared-voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    });

    const voices = response.data.voices;

    // Filter and format
    const formattedVoices = voices.map(v => ({
      id: v.voice_id,
      publicOwnerId: v.public_owner_id,
      name: v.name,
      gender: v.gender,
      age: v.age,
      accent: v.accent,
      useCase: v.use_case,
      category: v.category,
      language: v.language,
      description: v.description,
      previewUrl: v.preview_url,
      freeUsersAllowed: v.free_users_allowed,
      isAdded: v.is_added_by_user
    }));

    res.json({
      total: formattedVoices.length,
      voices: formattedVoices
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addVoiceFromLibrary = async (req, res) => {
  try {
    const { publicOwnerId, voiceId } = req.body;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/voices/add/${publicOwnerId}/${voiceId}`,
      {},
      {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
      }
    );

    res.json({
      success: true,
      message: 'Voice added to your account',
      voice: response.data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

**Add routes:**
```javascript
// backend/routes/agents.js

router.get('/helpers/voice-library', protect, getVoiceLibrary);
router.post('/helpers/voice-library/add', protect, addVoiceFromLibrary);
```

### Option 2: Create Voice Browser UI

**Component:** `frontend/src/components/VoiceLibraryBrowser.jsx`

```javascript
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function VoiceLibraryBrowser() {
  const [voices, setVoices] = useState([]);
  const [filter, setFilter] = useState({
    gender: 'all',
    language: 'all',
    useCase: 'all'
  });

  useEffect(() => {
    fetchVoiceLibrary();
  }, []);

  const fetchVoiceLibrary = async () => {
    const response = await api.get('/agents/helpers/voice-library');
    setVoices(response.data.voices);
  };

  const addVoice = async (voice) => {
    await api.post('/agents/helpers/voice-library/add', {
      publicOwnerId: voice.publicOwnerId,
      voiceId: voice.id
    });
    alert(`${voice.name} added to your account!`);
    fetchVoiceLibrary(); // Refresh to show is_added = true
  };

  const filteredVoices = voices.filter(v => {
    if (filter.gender !== 'all' && v.gender !== filter.gender) return false;
    if (filter.language !== 'all' && v.language !== filter.language) return false;
    if (filter.useCase !== 'all' && v.useCase !== filter.useCase) return false;
    return true;
  });

  return (
    <div className="voice-library-browser">
      <h2>ElevenLabs Voice Library</h2>
      <p>Browse thousands of community voices</p>

      {/* Filters */}
      <div className="filters">
        <select onChange={(e) => setFilter({...filter, gender: e.target.value})}>
          <option value="all">All Genders</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="neutral">Neutral</option>
        </select>

        <select onChange={(e) => setFilter({...filter, useCase: e.target.value})}>
          <option value="all">All Use Cases</option>
          <option value="conversational">Conversational</option>
          <option value="narrative_story">Narrative/Story</option>
          <option value="informative_educational">Educational</option>
          <option value="social_media">Social Media</option>
        </select>
      </div>

      {/* Voice Grid */}
      <div className="voice-grid">
        {filteredVoices.map(voice => (
          <div key={voice.id} className="voice-card">
            <h3>{voice.name}</h3>
            <p>{voice.description}</p>
            <div className="voice-meta">
              <span>{voice.gender}</span>
              <span>{voice.age}</span>
              <span>{voice.accent}</span>
            </div>

            {/* Audio Preview */}
            {voice.previewUrl && (
              <audio controls src={voice.previewUrl} />
            )}

            {/* Add Button */}
            {voice.isAdded ? (
              <button disabled>✓ Added</button>
            ) : (
              <button onClick={() => addVoice(voice)}>
                + Add to Account
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Voice Library Filtering

You can filter voices by:
- **Gender:** female, male, neutral
- **Age:** young, middle_aged, old
- **Accent:** american, british, indian, canadian, mexican, etc.
- **Language:** en, es, de, tr, and 20+ more
- **Use Case:** conversational, narrative, educational, social_media
- **Category:** professional, generated, cloned
- **Free Users:** Only show voices available on free plan

## Usage Limits

**Important:** Each ElevenLabs plan has a voice limit:
- **Free Plan:** Limited voices
- **Starter:** More voices
- **Creator/Pro:** Many voices
- **Business:** Unlimited voices

Check your plan before adding many voices!

## Best Workflow

### For VoiceFlow Custom Agent Builder:

1. **Browse Voice Library**
   - Show all available voices
   - Filter by use case, gender, accent
   - Preview audio samples

2. **Add Voice**
   - Click "Add to Account"
   - Voice becomes available in agent builder

3. **Create Agent**
   - Select added voice from dropdown
   - Configure agent script
   - Test and deploy

### Quick Add Popular Voices

Create presets for common use cases:

**Sales (Professional Female):**
- Add: Ava – Natural AI Voice
- Use for: Customer support, AI agents

**Sales (Professional Male):**
- Add: Mike
- Use for: Friendly conversational

**Meditation/Calm:**
- Add: Toren — Soft Calm Sleep Voice
- Use for: Wellness, meditation scripts

**Social Media:**
- Add: Mihir V - Influencer Voice
- Use for: Reels, viral content

## Summary

### What You Have Access To:

1. **39 Account Voices** ✅
   - Already in your account
   - Use immediately

2. **Thousands of Library Voices** ✅
   - Browse via `/v1/shared-voices`
   - Add with one API call
   - Use after adding

### Integration Steps:

1. ✅ **Backend endpoint** - Fetch voice library
2. ✅ **Add voice endpoint** - Add to account
3. ⚠️ **UI component** - Browse and add voices
4. ⚠️ **Agent builder** - Use library voices

### Next Actions:

1. Create voice library browser UI
2. Add "Browse Voice Library" button to agent builder
3. Allow users to preview and add voices
4. Update agent creation to use any added voice

---

**Documentation Created:** 2025-11-16
**Voice Library API:** `/v1/shared-voices`
**Total Available:** Thousands of voices
**Status:** Ready to integrate!
