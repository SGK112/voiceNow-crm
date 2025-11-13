# Fix OAuth Issues - Quick Guide

## ✅ Backend is Now Running

Backend server started successfully on port 5001!

---

## Issue 1: Google OAuth "Access Blocked"

### Problem
Google shows: "Voiceflow CRM has not completed the Google verification process"

### Solution: Add Test Users

The Google OAuth consent screen just opened in your browser. Follow these steps:

1. **Find "Test users" section** (scroll down if needed)
2. Click **"+ ADD USERS"**
3. Add your email: `help.remodely@gmail.com`
4. Click **"Save"**

That's it! Now you can use Google OAuth while your app is in "Testing" mode.

### Alternative: Publish the App

If you want anyone to use it:
1. Click **"PUBLISH APP"** button
2. Google will review your app (takes a few days)
3. Once approved, anyone can connect

But for now, just add yourself as a test user!

---

## Issue 2: Slack Button Not Working

The Slack button should be working now that the backend is restarted. Let's test:

### Step 1: Add Redirect URL (if not done)

Go to: https://api.slack.com/apps/A09S49D4UHF/oauth

Add this redirect URL:
```
https://fa0e37460c1f.ngrok-free.app/auth/integration/callback
```

### Step 2: Test Slack Integration

1. Go to: https://fa0e37460c1f.ngrok-free.app
2. Login
3. Go to **Integrations** page
4. Click **"Connect Slack"**
5. Should redirect to Slack authorization

### If Button Still Does Nothing:

Check browser console for errors:
1. Right-click → "Inspect"
2. Go to "Console" tab
3. Click the Slack button
4. Look for any error messages
5. Share the error with me

---

## Quick Test Script

Run this to test if the OAuth endpoints are working:

```bash
# Test Google OAuth endpoint
curl http://localhost:5001/api/integrations/google/auth \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Slack OAuth endpoint
curl http://localhost:5001/api/integrations/slack/auth \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Both should return an `authUrl` in the response.

---

## Current URLs

**Frontend (ngrok)**: https://fa0e37460c1f.ngrok-free.app
**Backend**: http://localhost:5001 ✅ RUNNING
**Health Check**: http://localhost:5001/health ✅

---

## What's Working Now

- ✅ Backend server running on port 5001
- ✅ Frontend accessible via ngrok (HTTPS)
- ✅ OAuth endpoints created and ready
- ✅ Integration page with buttons enabled
- ⏳ Google: Needs test user added
- ⏳ Slack: Needs redirect URL added

---

## Next Steps

1. **Google OAuth**: Add `help.remodely@gmail.com` as test user in the Google Console page that just opened
2. **Slack OAuth**: Add redirect URL at https://api.slack.com/apps/A09S49D4UHF/oauth
3. **Test**: Try both buttons again!

---

## If Still Having Issues

### Check Browser Console

When you click either button:
1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to Console tab
3. Click the button
4. Look for errors (red text)
5. Also check Network tab to see if API call is made

### Common Issues:

**Button does nothing**:
- Check: Is backend running? (✅ Yes, it is!)
- Check: Are you logged in?
- Check: Browser console for JavaScript errors

**"Network Error"**:
- Backend might not be running (but it is now!)
- CORS issue (but should be configured)

**"401 Unauthorized"**:
- Not logged in or token expired
- Try logging out and back in

**"redirect_uri_mismatch"**:
- Redirect URL not added to Slack/Google app settings
- Wrong ngrok URL (must be exact match)

---

## Pro Tip: Keep These Open

While testing, keep these tabs open:
1. Your ngrok URL: https://fa0e37460c1f.ngrok-free.app
2. Browser console (F12)
3. Terminal running backend (to see logs)

Then try the buttons and watch for any errors!
