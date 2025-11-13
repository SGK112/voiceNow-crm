# Slack OAuth Setup Guide

## What You Get With Slack OAuth

✅ **1-Click Integration**: Users connect Slack to your CRM with a single button
✅ **Automatic Notifications**: Send messages to Slack channels when events happen:
- New hot leads
- Completed calls
- Scheduled appointments
- Deal updates (won/lost)

✅ **Secure**: Tokens are encrypted and stored safely
✅ **No Manual Setup**: Users don't need to create webhook URLs or copy/paste anything

---

## Setup Instructions

### 1. Create a Slack App

Go to https://api.slack.com/apps and click **"Create New App"**

Choose **"From scratch"** and enter:
- **App Name**: `VoiceFlow CRM` (or your company name)
- **Workspace**: Select your development workspace

### 2. Configure OAuth & Permissions

In your app's sidebar, go to **"OAuth & Permissions"**

#### Add Bot Token Scopes:

Scroll down to **"Scopes"** → **"Bot Token Scopes"** and add:

- `chat:write` - Send messages to channels
- `chat:write.public` - Send messages to public channels without joining
- `channels:read` - View public channels
- `groups:read` - View private channels
- `users:read` - View users in workspace

#### Add Redirect URLs:

Scroll up to **"Redirect URLs"** and add:

```
Development:
http://localhost:5173/auth/integration/callback

Production (replace with your domain):
https://yourdomain.com/auth/integration/callback
```

Click **"Save URLs"**

### 3. Get Your Credentials

In the sidebar, go to **"Basic Information"**

Scroll down to **"App Credentials"** and copy:

- **Client ID**: Something like `12345678.123456789012`
- **Client Secret**: Click "Show" to reveal, then copy

### 4. Add to Environment Variables

Open your `backend/.env` file and add:

```bash
# Slack OAuth
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
```

### 5. Install the App to Your Workspace (Optional)

If you want to test it in your own workspace:

1. Go to **"Install App"** in the sidebar
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**

This installs the bot in your workspace for testing.

---

## How Users Will Connect Slack

### User Flow:

1. User goes to **Integrations** page in your CRM
2. Clicks **"Connect Slack"** button
3. Redirected to Slack OAuth consent screen
4. Selects their workspace and clicks **"Allow"**
5. Redirected back to CRM - Integration shows as **"Connected"** ✅
6. Done! Notifications will now be sent to their Slack

### What Gets Sent:

**New Hot Lead:**
```
🔥 HOT LEAD

John Smith - ACME Corp
Phone: (555) 123-4567
Email: john@acme.com
Status: New
Score: 85/100

[View Lead] button
```

**Completed Call:**
```
📞 Call Completed

Customer: John Smith
Duration: 5m 32s
Agent: Sales Bot
Outcome: Interested
Sentiment: Positive

Summary: Customer interested in kitchen remodel...

[Listen to Recording] button
```

**New Appointment:**
```
📅 New Appointment Scheduled

Kitchen Consultation
Customer: John Smith
Time: Nov 15, 2025 at 2:00 PM
Phone: (555) 123-4567

[View Details] button
```

**Deal Update:**
```
🎉 Deal WON

Kitchen Remodel Project
Value: $15,000
Stage: Closed Won
Customer: John Smith
Close Date: Nov 15, 2025

[View Deal] button
```

---

## Testing the Integration

### Option 1: Using the Webhook (Quick Test)

If you just want to test without OAuth setup:

1. Go to your Slack workspace
2. Create an Incoming Webhook: https://api.slack.com/messaging/webhooks
3. Copy the webhook URL
4. Test it:

```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from VoiceFlow CRM!"}'
```

### Option 2: Using OAuth (Recommended)

1. Complete the setup steps above
2. Restart your backend server: `npm run dev`
3. Go to http://localhost:5175/app/integrations
4. Click **"Connect Slack"**
5. Authorize the app
6. Check that it shows as "Connected"

---

## Sending Notifications from Code

### Automatically (Recommended):

The system will automatically send notifications when events happen. To enable notifications for a user:

```javascript
// When a hot lead is created
import { sendNotification } from '../controllers/slackController.js';

await sendNotification(userId, 'hotLeads', {
  _id: lead._id,
  name: lead.name,
  email: lead.email,
  phone: lead.phone,
  company: lead.company,
  score: lead.score,
  notes: lead.notes
});
```

### Manually:

```javascript
import slackService from '../services/slackService.js';

// Using OAuth integration
await slackService.sendOAuthMessage(userId, '#general', {
  text: 'Hello from VoiceFlow CRM!',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*This is a test message* from your CRM'
      }
    }
  ]
});
```

---

## Notification Settings

Users can control which notifications they receive by going to:
**Settings → Integrations → Slack → Notification Preferences**

They can toggle:
- ✅ New leads
- ✅ Hot leads
- ✅ Completed calls
- ✅ Appointments
- ✅ Deal updates

---

## Troubleshooting

### "Slack OAuth not configured" error

**Cause**: Missing environment variables

**Fix**: Make sure `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are in your `backend/.env` file and restart the server.

### Tokens not working after connecting

**Cause**: Insufficient scopes

**Fix**: Go back to your Slack app settings → OAuth & Permissions → Add the missing scopes, then have the user reconnect.

### Messages not sending

**Cause**: Bot not added to the channel

**Fix**: In Slack, type `/invite @VoiceFlow CRM` (or your bot name) in the channel where you want notifications.

---

## Production Checklist

Before going live:

- [ ] Add production redirect URL to Slack app settings
- [ ] Update `FRONTEND_URL` in production `.env`
- [ ] Test OAuth flow in production environment
- [ ] Verify notifications are being sent
- [ ] Add app icon and description in Slack app settings
- [ ] Submit app for Slack App Directory (optional, for public distribution)

---

## For Other Companies to Integrate with YOU

If you want OTHER companies to connect THEIR apps to YOUR CRM using OAuth:

### 1. Create OAuth Provider Endpoints

You'll need to create:
- `/oauth/authorize` - Authorization screen
- `/oauth/token` - Token exchange endpoint
- `/oauth/revoke` - Token revocation

### 2. Register Their Apps

Create a "Developer Portal" where companies can:
- Register their application
- Get a Client ID and Client Secret
- Set redirect URLs
- Choose scopes (what data they can access)

### 3. Provide API Documentation

Document your API endpoints so they know what they can do:
- `GET /api/leads` - Fetch leads
- `POST /api/leads` - Create leads
- `GET /api/calls` - Fetch call logs
- etc.

This is more complex - let me know if you want to set this up and I'll create the full OAuth provider system!

---

## Summary

**For Slack**:
1. Create Slack app at https://api.slack.com/apps
2. Add scopes: `chat:write`, `channels:read`, `groups:read`, `users:read`
3. Add redirect URL: `http://localhost:5173/auth/integration/callback`
4. Copy Client ID and Secret to `.env`
5. Restart server
6. Users click "Connect Slack" - done! ✅

**Current Status**:
- ✅ OAuth system ready
- ✅ Slack service with formatted messages
- ✅ Integration controller with Slack OAuth
- ✅ Frontend button ready
- ⏳ Just need to add your credentials to `.env`

The webhook URL you provided returned "no_team" which usually means it's expired or revoked. You can create a fresh one or use OAuth instead (recommended).
