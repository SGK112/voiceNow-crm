# Slack OAuth - Final Setup Steps

## ✅ What's Already Done

- [x] Slack credentials added to `.env`
- [x] OAuth endpoints created
- [x] Integration controller ready
- [x] Frontend button enabled
- [x] Service for sending formatted messages

## 🚀 What You Need to Do

### 1. Add Redirect URL to Your Slack App

Go to: https://api.slack.com/apps/A09S49D4UHF/oauth

Under **"Redirect URLs"**, add:

```
http://localhost:5173/auth/integration/callback
```

Click **"Add"** then **"Save URLs"**

### 2. Add Required Scopes

Go to: https://api.slack.com/apps/A09S49D4UHF/oauth

Scroll down to **"Bot Token Scopes"** and make sure you have:

- ✅ `chat:write` - Send messages as the bot
- ✅ `chat:write.public` - Send messages to channels the bot isn't in
- ✅ `channels:read` - View public channels
- ✅ `groups:read` - View private channels
- ✅ `users:read` - View user information

Click **"Save Changes"** if you added any new scopes.

### 3. Restart Your Server

The backend needs to reload the new `.env` variables:

```bash
# Kill the current server
pkill -f "node backend/server.js"

# Or just press Ctrl+C in the terminal running the server

# Then restart
npm run dev
```

### 4. Test It!

1. Go to: http://localhost:5175/app/integrations
2. Click **"Connect Slack"**
3. You'll be redirected to Slack
4. Select your workspace and click **"Allow"**
5. You'll be redirected back to the Integrations page
6. Slack should now show as **"Connected"** with a green checkmark ✅

### 5. Send a Test Notification

Once connected, the system will automatically send Slack notifications when:

- A hot lead is created (score > 70)
- A call is completed
- An appointment is scheduled
- A deal is won or lost

You can also test manually by creating a lead with a high score!

---

## Troubleshooting

### "invalid_client_id" Error

**Problem**: The Client ID in `.env` doesn't match the Slack app

**Fix**: Double-check that `SLACK_CLIENT_ID` in your `.env` matches what's shown at https://api.slack.com/apps/A09S49D4UHF/general

### "redirect_uri_mismatch" Error

**Problem**: The redirect URL isn't registered in your Slack app

**Fix**: Make sure you added `http://localhost:5173/auth/integration/callback` to the Redirect URLs in your Slack app settings

### Connection Looks Successful But Notifications Don't Send

**Problem**: The bot isn't in the channel

**Fix**: In your Slack workspace, go to the channel where you want notifications and type:
```
/invite @VoiceNow CRM
```
(Replace "VoiceNow CRM" with whatever you named your bot)

---

## What Happens When a User Connects

1. User clicks **"Connect Slack"**
2. Backend generates OAuth URL with your Client ID
3. User is redirected to Slack to authorize
4. Slack redirects back with authorization code
5. Backend exchanges code for access token
6. Token is **encrypted** and saved to MongoDB
7. User sees "Connected" status
8. Bot can now send messages to their workspace!

---

## For Production

When you deploy to production, you'll need to:

1. Add your production domain to Slack redirect URLs:
   ```
   https://yourdomain.com/auth/integration/callback
   ```

2. Update `FRONTEND_URL` in production `.env`:
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

3. Make sure your Slack app is set to **"Distributed"** if you want other companies to use it

---

## Your Slack App Details

**App ID**: A09S49D4UHF
**Client ID**: 9864194828387.9888319164593
**Client Secret**: (Saved in `.env`)
**Manage App**: https://api.slack.com/apps/A09S49D4UHF

---

## Next Steps

After Slack is working, you can add more integrations using the same OAuth pattern:

- **HubSpot**: CRM sync
- **Microsoft Teams**: Enterprise messaging
- **Salesforce**: Enterprise CRM
- **Shopify**: E-commerce notifications

All of them follow the same pattern - just need their Client ID and Secret!
