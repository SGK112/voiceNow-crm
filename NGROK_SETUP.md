# Using ngrok for Slack OAuth (Local Development with HTTPS)

## Why You Need HTTPS

Slack OAuth requires HTTPS redirect URLs. You can't use `http://localhost` in production or for OAuth callbacks.

## Quick Setup with ngrok

### Step 1: Start ngrok for Frontend

Open a new terminal and run:

```bash
ngrok http 5175
```

You'll see output like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:5175
```

**Copy that HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 2: Update Slack App Redirect URL

Go to: https://api.slack.com/apps/A09S49D4UHF/oauth

Add your ngrok URL as a redirect:
```
https://YOUR-NGROK-URL.ngrok.io/auth/integration/callback
```

Example:
```
https://abc123.ngrok.io/auth/integration/callback
```

Click **"Add"** then **"Save URLs"**

### Step 3: Update Backend .env

Update your `backend/.env` file:

```bash
FRONTEND_URL=https://YOUR-NGROK-URL.ngrok.io
```

Example:
```bash
FRONTEND_URL=https://abc123.ngrok.io
```

### Step 4: Restart Backend

```bash
# Kill current server
pkill -f "node backend/server.js"

# Restart
npm run dev
```

### Step 5: Test It!

1. Go to your ngrok URL: `https://abc123.ngrok.io/app/integrations`
2. Click **"Connect Slack"**
3. Authorize the app
4. You'll be redirected back and see "Connected" ✅

---

## Important Notes

### Free ngrok URLs Change

⚠️ **The free ngrok URL changes every time you restart ngrok!**

This means you'll need to:
1. Update the Slack redirect URL
2. Update `FRONTEND_URL` in `.env`
3. Restart the backend

**Every time you restart ngrok.**

### Solution: Get a Static ngrok Domain

Upgrade to ngrok paid plan ($8/month) for a static domain like:
```
https://yourapp.ngrok.io
```

Then you only set it up once!

Or use a real domain (see below).

---

## Alternative: Deploy to Production

### Option 1: Render.com (Easiest)

1. Push code to GitHub
2. Connect Render.com to your repo
3. Deploy (automatic HTTPS)
4. Use your Render URL:
   ```
   https://voiceflow-crm.onrender.com/auth/integration/callback
   ```

### Option 2: Vercel/Netlify

1. Deploy frontend to Vercel
2. Deploy backend to Render/Railway
3. Use production URLs in Slack app

### Option 3: Your Own Domain

If you have a domain (e.g., `remodely.ai`):

1. Point DNS to your server
2. Set up SSL certificate (free with Let's Encrypt)
3. Use your domain:
   ```
   https://app.remodely.ai/auth/integration/callback
   ```

---

## Current Workaround: Use Render for Testing

Since you'll likely deploy to production anyway, you can:

1. Deploy to Render.com (free tier)
2. Get HTTPS URL automatically
3. Use that for Slack OAuth
4. Test OAuth in "production" environment
5. Still develop locally for everything else

This is the easiest way to get HTTPS without paying for ngrok!

---

## Quick Deploy to Render

Create a `render.yaml` file:

```yaml
services:
  - type: web
    name: voiceflow-crm-backend
    runtime: node
    buildCommand: npm install
    startCommand: node backend/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: voiceflow-crm-db
          property: connectionString
```

Then:
1. Push to GitHub
2. Connect to Render
3. Get HTTPS URL
4. Add to Slack app settings

---

## Recommended Approach

For **testing locally**: Use ngrok (accept that URL changes each restart)

For **production/stable testing**: Deploy to Render.com (free, automatic HTTPS)

For **serious development**: Get ngrok paid plan ($8/mo) or deploy to production

---

## Need Help?

Let me know which approach you want to take and I'll help you set it up!

- 🚀 Want to use ngrok? Run: `ngrok http 5175`
- ☁️ Want to deploy to Render? I'll create the config files
- 🌐 Have your own domain? I'll help set up SSL
