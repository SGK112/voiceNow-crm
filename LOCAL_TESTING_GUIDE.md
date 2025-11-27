# Local Testing Guide - VoiceNow CRM

## Current Setup

### Servers Running
- **Backend**: http://localhost:5001/api
- **Frontend**: http://localhost:5173

### Google OAuth Configuration

**Redirect URIs that need to be in Google Console:**
```
http://localhost:5173/auth/google/callback
https://voiceflow-crm.onrender.com/auth/google/callback
```

**Integration OAuth (different from login):**
```
http://localhost:5173/auth/integration/callback
https://voiceflow-crm.onrender.com/auth/integration/callback
```

## Testing Steps

### 1. Test Stripe Integration (Billing Page)

1. Navigate to: http://localhost:5173/login
2. Login with test credentials
3. Go to: http://localhost:5173/app/billing
4. Open Browser Console (F12)
5. Look for:
   - ✅ "Stripe Key Present: true"
   - ✅ "Stripe Key Length: 107" (or similar)
   - ❌ No "IntegrationError: Missing value for Stripe()"

### 2. Test Google OAuth Login

1. Go to: http://localhost:5173/login
2. Click "Continue with Google" button
3. Should redirect to Google login
4. After selecting account, should redirect back to: http://localhost:5173/auth/google/callback
5. Should process and redirect to: http://localhost:5173/app/dashboard

**Common Issues:**
- **redirect_uri_mismatch**: The redirect URI in Google Console doesn't match what's being sent
- **Check console logs for**: Authorization code exchange errors

### 3. Test AI Agents Chat

1. Navigate to: http://localhost:5173/app/ai-agents
2. Create a test agent or use existing
3. Click "Test Chat"
4. Send a message
5. Should receive response in correct format

**Expected Console Output:**
```json
{
  "message": {
    "role": "assistant",
    "content": "The AI response text"
  },
  "usage": { "inputTokens": 100, "outputTokens": 50 },
  "model": "gpt-3.5-turbo",
  "provider": "openai"
}
```

## Debugging Commands

```bash
# Check what's running on ports
lsof -i:5001,5173

# View backend logs
# (already running in terminal)

# View frontend logs
# (already running in terminal)

# Test backend API directly
curl http://localhost:5001/api/health

# Test auth endpoint
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Google Console Setup

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik`
3. Click on it to edit
4. Under "Authorized redirect URIs", ensure these are added:
   - `http://localhost:5173/auth/google/callback` (for local testing)
   - `https://voiceflow-crm.onrender.com/auth/google/callback` (for production)
   - `http://localhost:5173/auth/integration/callback` (for local integrations)
   - `https://voiceflow-crm.onrender.com/auth/integration/callback` (for production integrations)

