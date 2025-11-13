# 🚀 Slack OAuth - Ready to Test!

## ✅ What's Done

- ✅ ngrok tunnel started: `https://26dce3b9417b.ngrok-free.app`
- ✅ FRONTEND_URL updated in `.env`
- ✅ Backend ready with Slack OAuth
- ✅ Frontend has "Connect Slack" button enabled

## 📝 Final Steps (Do These Now)

### Step 1: Add Redirect URL to Slack App

Go to: **https://api.slack.com/apps/A09S49D4UHF/oauth**

Under **"Redirect URLs"**, click **"Add New Redirect URL"** and paste:

```
https://26dce3b9417b.ngrok-free.app/auth/integration/callback
```

Click **"Add"** then **"Save URLs"**

### Step 2: Verify Scopes

On the same page, scroll down to **"Bot Token Scopes"** and make sure you have:

- ✅ `chat:write`
- ✅ `chat:write.public`
- ✅ `channels:read`
- ✅ `groups:read`
- ✅ `users:read`

If any are missing, add them and click **"Save Changes"**

### Step 3: Restart Backend Server

The backend needs to reload the new `FRONTEND_URL`:

```bash
# Press Ctrl+C in the terminal running the server, then:
npm run dev
```

### Step 4: Test Slack OAuth!

1. Open your ngrok URL: **https://26dce3b9417b.ngrok-free.app**
2. Login to your CRM
3. Go to **Integrations** page
4. Click **"Connect Slack"**
5. You'll be redirected to Slack
6. Select your workspace and click **"Allow"**
7. You'll be redirected back to the Integrations page
8. Slack should show as **"Connected"** with a green checkmark! ✅

---

## 🎉 What You'll Get After Connecting

Once Slack is connected, your CRM will automatically send beautiful formatted notifications to Slack for:

### 🔥 Hot Leads (Score > 70)
```
🔥 HOT LEAD

John Smith - ACME Corp
Phone: (555) 123-4567
Email: john@acme.com
Status: New
Score: 85/100

Notes: Interested in full kitchen remodel...

[View Lead]
```

### 📞 Completed Calls
```
📞 Call Completed

Customer: John Smith
Duration: 5m 32s
Agent: Sales Bot
Outcome: Interested
Sentiment: Positive

Summary: Customer wants quote for kitchen...

[Listen to Recording]
```

### 📅 New Appointments
```
📅 New Appointment Scheduled

Kitchen Consultation

Customer: John Smith
Time: Nov 15, 2025 at 2:00 PM
Phone: (555) 123-4567

Details: Initial consultation for kitchen remodel

[View Details]
```

### 💼 Deal Updates
```
🎉 Deal WON

Kitchen Remodel Project
Value: $15,000
Stage: Closed Won
Customer: John Smith
Close Date: Nov 15, 2025

[View Deal]
```

---

## ⚠️ Important Notes

### ngrok URL Changes

**The free ngrok URL changes every time you restart ngrok!**

If you stop ngrok and start it again, you'll get a new URL like:
```
https://xyz789.ngrok-free.app  (different!)
```

Then you'll need to:
1. Update Slack app redirect URL
2. Update `FRONTEND_URL` in `.env`
3. Restart backend

### Keep ngrok Running

Keep the ngrok terminal window open while testing. If you close it, the tunnel stops and the URL won't work.

### For Production

When you deploy to production (Render, Vercel, your domain), you'll:
1. Use your real production URL (e.g., `https://app.remodely.ai`)
2. Add that to Slack app settings
3. Update `FRONTEND_URL` in production environment
4. No need for ngrok anymore!

---

## 🐛 Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The redirect URL doesn't match what's in Slack app settings

**Fix**: Make sure the exact URL `https://26dce3b9417b.ngrok-free.app/auth/integration/callback` is in your Slack app's redirect URLs

### "invalid_client_id" Error

**Problem**: Client ID doesn't match

**Fix**: Double-check that `SLACK_CLIENT_ID` in `.env` matches what's shown in your Slack app settings

### Backend Not Responding

**Problem**: Backend hasn't restarted with new `FRONTEND_URL`

**Fix**: Restart backend server (Ctrl+C then `npm run dev`)

### Slack Says "App Not Installed"

**Problem**: The bot needs to be added to the channel

**Fix**: In Slack, go to the channel and type:
```
/invite @YourBotName
```

---

## 📋 Quick Checklist

Before testing:
- [ ] Added redirect URL to Slack app
- [ ] Verified all required scopes are added
- [ ] Restarted backend server
- [ ] ngrok is still running

Then:
- [ ] Open https://26dce3b9417b.ngrok-free.app
- [ ] Go to Integrations page
- [ ] Click "Connect Slack"
- [ ] Authorize in Slack
- [ ] See "Connected" status
- [ ] Test by creating a hot lead!

---

## 🎯 Your URLs

**Frontend (ngrok)**: https://26dce3b9417b.ngrok-free.app
**Backend (local)**: http://localhost:5001
**Slack App Settings**: https://api.slack.com/apps/A09S49D4UHF

**Redirect URL to add**:
```
https://26dce3b9417b.ngrok-free.app/auth/integration/callback
```

---

Ready to test? Add that redirect URL to your Slack app and you're good to go! 🚀
