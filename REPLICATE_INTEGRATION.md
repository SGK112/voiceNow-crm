# 🎨 Replicate AI Integration - Image & Video Generation

## Overview

This integration enables your VoiceNow CRM to generate AI images and videos using Replicate's API, with a groundbreaking feature: **real-time image generation during ElevenLabs voice calls**.

## Features

### 1. AI Image Generation
- **Text-to-Image**: Generate images from text prompts
- **Multiple Models**: FLUX Schnell, FLUX Dev, FLUX Pro, SDXL
- **Styles**: Photorealistic, artistic, sketch, modern
- **Aspect Ratios**: 1:1, 16:9, 9:16, 4:3

### 2. AI Video Generation
- **Text-to-Video**: Create videos from descriptions
- **Image-to-Video**: Animate static images
- **Models**: Runway Gen3, Stable Video Diffusion, AnimateDiff

### 3. Image Enhancement
- **Upscaling**: 4x upscale with Real-ESRGAN
- **Background Removal**: Clean product images
- **Face Enhancement**: Restore and improve faces

### 4. Voice-to-Image (🌟 Revolutionary Feature)
- **Real-time Generation**: Images appear during voice calls
- **ElevenLabs Integration**: Voice agents can trigger image generation
- **WebSocket Streaming**: Instant image delivery to frontend
- **Smart Prompts**: Agent extracts image descriptions from conversation

---

## Setup

### 1. Environment Variables

Already configured in `/backend/.env`:
```env
REPLICATE_API_TOKEN=r8_YOUR_API_TOKEN_HERE
```

### 2. User Credits

Each user has a `mediaCredits` field in their account:
```javascript
{
  balance: 10,        // Free starter credits
  used: 0,
  purchased: 0,
  lastUsageDate: null
}
```

### 3. Pricing

Credits are deducted per generation:
- **FLUX Schnell**: 1 credit (fast, good quality)
- **FLUX Dev**: 2 credits (better quality)
- **FLUX Pro**: 5 credits (best quality)
- **Video Gen3**: 10 credits
- **Upscale**: 2 credits
- **Background Removal**: 1 credit

---

## API Endpoints

### Image Generation

```bash
POST /api/media/generate/image
Authorization: Bearer <token>

{
  "prompt": "Modern kitchen with black granite countertops",
  "model": "flux_schnell",
  "aspectRatio": "16:9",
  "numOutputs": 1
}

Response:
{
  "success": true,
  "images": ["https://replicate.delivery/pbxt/..."],
  "creditsUsed": 1,
  "duration": 3245
}
```

### Video Generation

```bash
POST /api/media/generate/video

{
  "prompt": "Camera panning across a modern kitchen renovation",
  "model": "runway_gen3",
  "duration": 5,
  "aspectRatio": "16:9"
}

Response:
{
  "success": true,
  "video": "https://replicate.delivery/pbxt/...",
  "creditsUsed": 10
}
```

### Image to Video

```bash
POST /api/media/image-to-video

{
  "imageUrl": "https://your-image.jpg",
  "prompt": "smooth camera movement",
  "duration": 3
}
```

### Credits Management

```bash
# Get balance
GET /api/media/credits

# Purchase credits
POST /api/media/credits/purchase
{
  "amount": 200,
  "paymentIntentId": "pi_xxx"
}

# Get pricing
GET /api/media/pricing
```

---

## Voice-to-Image Feature 🎤🖼️

### How It Works

1. **User calls ElevenLabs agent**
2. **Frontend connects to WebSocket** (`/ws/voice-images`)
3. **Agent detects visual request** (e.g., "show me black granite")
4. **Image generates in real-time** via Replicate
5. **Image appears on screen** during the call

### ElevenLabs Agent Configuration

Create an image-enabled agent:

```javascript
POST /api/voice-images/config

{
  "baseConfig": {
    "name": "Granite Showroom Agent",
    "conversational_config": {
      "agent": {
        "prompt": {
          "prompt": "You help customers visualize granite countertops"
        }
      }
    }
  }
}

Response: Returns config with image generation tool added
```

The agent will automatically get:
- `generate_image` tool/function
- Updated prompt with image generation instructions
- Ability to trigger Replicate API

### Frontend Integration

```jsx
import VoiceImageCall from './components/VoiceImageCall';

function CallPage() {
  return (
    <VoiceImageCall
      conversationId={callId}
      agentName="Granite Showroom Agent"
    />
  );
}
```

### WebSocket Protocol

```javascript
// Connect
const ws = new WebSocket('ws://localhost:5001/ws/voice-images');

// Authenticate
ws.send(JSON.stringify({
  type: 'authenticate',
  token: userToken
}));

// Join conversation
ws.send(JSON.stringify({
  type: 'join_conversation',
  conversationId: 'call-123'
}));

// Receive images
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'image_generated') {
    console.log('New image:', data.image.url);
  }
};
```

### Webhook Setup

Configure ElevenLabs to send events to:
```
POST https://your-domain.com/api/voice-images/webhook/:conversationId
```

The webhook will:
1. Detect tool calls for image generation
2. Detect trigger phrases ("let me show you...")
3. Extract image prompts from conversation
4. Generate images via Replicate
5. Stream to connected WebSocket clients

---

## Credit Packages

Recommended pricing for end users:

| Package | Credits | Price | Savings |
|---------|---------|-------|---------|
| Starter | 50 | $9.99 | - |
| Creator | 200 | $29.99 | 25% |
| Professional | 500 | $59.99 | 40% |
| Enterprise | 1500 | $149.99 | 50% |

### Cost Analysis

**Your Cost (Replicate):**
- FLUX Schnell: ~$0.003 per image
- Video Gen3: ~$0.05 per video

**Sell at:**
- 1 credit = $0.20
- Image (1 credit) = $0.20 (profit: $0.197)
- Video (10 credits) = $2.00 (profit: $1.95)

**Profit Margin: 95%+**

---

## Usage Examples

### Example 1: Product Visualization

```javascript
// User on phone: "What would black galaxy granite look like in my kitchen?"

// Agent response triggers:
{
  "tool": "generate_image",
  "arguments": {
    "prompt": "Modern kitchen interior with black galaxy granite countertops, stainless steel appliances, white cabinets, natural lighting",
    "style": "photorealistic",
    "aspectRatio": "16:9"
  }
}

// Image appears in real-time on user's screen
```

### Example 2: Before/After Renovation

```javascript
// Generate "before" image
const before = await fetch('/api/media/generate/image', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    prompt: "Outdated kitchen with old countertops",
    model: "flux_schnell"
  })
});

// Generate "after" image
const after = await fetch('/api/media/generate/image', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "Modern renovated kitchen with granite countertops",
    model: "flux_dev"
  })
});
```

### Example 3: Animated Material Samples

```javascript
// Generate image of granite sample
const image = await generateImage({
  prompt: "Close-up of black galaxy granite texture"
});

// Convert to video (rotating/zooming)
const video = await fetch('/api/media/image-to-video', {
  method: 'POST',
  body: JSON.stringify({
    imageUrl: image.url,
    prompt: "slow zoom into granite texture",
    duration: 4
  })
});
```

---

## Monetization Strategies

### 1. Pay-Per-Use
- Charge 1 credit per image
- Charge 10 credits per video
- Users buy credit packs

### 2. Subscription Add-On
- Professional Plan: +50 credits/month
- Enterprise Plan: +200 credits/month
- Overage: $0.20 per credit

### 3. Free Tier
- New users: 10 free credits
- Monthly refill: 5 credits for active users
- Referrals: +10 credits per referral

---

## Advanced Features

### Custom Models (Coming Soon)

Train your own Replicate models for:
- Company-specific branding
- Consistent style across images
- Custom granite/material catalogs

### Batch Generation

Generate multiple variations:
```javascript
POST /api/media/generate/image
{
  "prompt": "Modern kitchen with granite",
  "numOutputs": 4,  // 4 variations
  "model": "flux_dev"
}
```

### Video Templates

Pre-configured video prompts:
- Property walkthroughs
- Material close-ups
- 360° product views
- Before/after transitions

---

## Monitoring & Analytics

Track usage via:
```javascript
// Backend logs every generation
{
  userId: "abc123",
  type: "image",
  model: "flux_schnell",
  creditsUsed: 1,
  prompt: "...",
  duration: 3245,
  timestamp: "2025-01-22T..."
}
```

Build analytics dashboard showing:
- Total generations per user
- Most popular prompts
- Credit usage trends
- Revenue from media generation

---

## Troubleshooting

### "Insufficient credits" Error

```javascript
// Check user balance
GET /api/media/credits

// Add credits manually (admin)
await mediaService.addCredits(userId, 100, 'admin_grant');
```

### WebSocket Not Connecting

1. Verify WebSocket server is running
2. Check firewall allows WebSocket connections
3. Ensure JWT token is valid
4. Check CORS settings

### Images Not Generating

1. Verify Replicate API token is valid
2. Check user has credits
3. Review prompt (no prohibited content)
4. Check Replicate API status

---

## Production Deployment

### Environment Variables

```env
REPLICATE_API_TOKEN=r8_xxx
NODE_ENV=production
```

### WebSocket Configuration

For production (Render, AWS, etc.):
```javascript
const wsUrl = process.env.NODE_ENV === 'production'
  ? 'wss://your-domain.com/ws/voice-images'
  : 'ws://localhost:5001/ws/voice-images';
```

### Rate Limiting

Already protected by API limiter middleware.

### Scaling

- WebSocket sessions are in-memory
- For multiple servers, use Redis PubSub
- Replicate handles scaling automatically

---

## Cost Optimization

1. **Use Fast Models**: FLUX Schnell for real-time (1 credit)
2. **Cache Results**: Store generated images, reuse for similar prompts
3. **Batch Requests**: Generate multiple at once
4. **Free Tier Limits**: Cap free users at 10 credits/month

---

## Support

- Replicate Docs: https://replicate.com/docs
- ElevenLabs Conversational AI: https://elevenlabs.io/docs/conversational-ai
- WebSocket (ws): https://github.com/websockets/ws

---

## Next Steps

1. ✅ Test image generation API
2. ✅ Test voice-to-image WebSocket
3. ✅ Create pricing packages
4. ✅ Build user credit purchase flow
5. ✅ Train custom Replicate model (optional)
6. ✅ Launch and monetize!

**You're ready to revolutionize how contractors visualize projects with AI! 🚀**
