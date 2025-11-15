# Render Environment Variables Setup

## Critical Missing Environment Variables

The following environment variables MUST be added to the Render service for the application to work correctly in production:

### Frontend Build-Time Variables (Add to Render Environment)

These are needed during the build process and must be set on the Render service:

```bash
# Stripe Publishable Key (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Rr3YyHDbK8UKkrvX9hmCAT31iVXdrOuHZeckLaSIbwNEvQfnQPsjVKj8g5E3zQa2WJqcAqMOr6oTX81KyUr5rjd00CCUwTd4h

# Google OAuth Client ID (Frontend)
VITE_GOOGLE_CLIENT_ID=710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik.apps.googleusercontent.com

# API URL (Frontend) - should point to /api for same-origin requests in production
VITE_API_URL=/api

# ElevenLabs API Key (Frontend) - for agent detail page
VITE_ELEVENLABS_API_KEY=[your_elevenlabs_api_key]
```

## How to Add to Render

1. Go to https://dashboard.render.com
2. Select the `voiceflow-crm-api` service
3. Go to "Environment" tab
4. Add each variable listed above
5. Click "Save Changes"
6. Render will automatically trigger a new deployment with these variables

## Current Errors Being Fixed

1. **Stripe Error**: `IntegrationError: Missing value for Stripe(): apiKey should be a string`
   - Caused by missing `VITE_STRIPE_PUBLISHABLE_KEY`

2. **AI Agent Error**: `Error sending message: Error: Invalid response format from AI agent`
   - Caused by backend returning wrong response format (will be fixed separately)

## Verification

After adding these variables and redeploying:

1. Check browser console at https://voiceflow-crm.onrender.com
2. The Stripe error should be resolved
3. Navigate to /app/billing and verify Stripe loads without errors
