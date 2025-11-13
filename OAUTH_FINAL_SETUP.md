# 🚀 OAuth Integrations - Ready to Test!

## ✅ All Systems Running

| Component | Status | Details |
|-----------|--------|---------|
| Backend | ✅ Running | Port 5001 |
| Frontend | ✅ Running | Port 5173 |
| ngrok | ✅ Active | https://700838bc9740.ngrok-free.app |
| Vite Config | ✅ Updated | Allows ngrok hosts |

---

## 📋 3-Step Setup Required

### Step 1: Google OAuth - Add Test User

**Go to**: https://console.cloud.google.com/apis/credentials/consent

**Instructions**:
1. Scroll down to find **"Test users"** section
2. Click **"+ ADD USERS"** button
3. Enter: `help.remodely@gmail.com`
4. Click **"Save"**

**Why needed**: App is in "Testing" mode, only approved emails can use OAuth.

---

### Step 2: Slack OAuth - Add Redirect URL

**Go to**: https://api.slack.com/apps/A09S49D4UHF/oauth

**Instructions**:
1. Find **"Redirect URLs"** section (scroll down if needed)
2. Click **"Add New Redirect URL"**
3. Enter this exact URL:
   ```
   https://700838bc9740.ngrok-free.app/auth/integration/callback
   ```
4. Click **"Add"**
5. Click **"Save URLs"** at the bottom

**Why needed**: Slack must know where to redirect after authorization.

---

### Step 3: Test Both OAuth Flows

**Go to**: https://700838bc9740.ngrok-free.app

**Instructions**:
1. **Login** (create account if needed)
2. Navigate to **Integrations** page (sidebar menu)
3. Test **Google OAuth**:
   - Click "Connect Google" button
   - Should redirect to Google consent screen
   - Click "Allow"
   - Should redirect back showing "Connected" ✅
4. Test **Slack OAuth**:
   - Click "Connect Slack" button
   - Should redirect to Slack authorization
   - Select workspace and click "Allow"
   - Should redirect back showing "Connected" ✅

---

## 🔍 Troubleshooting

### Frontend Shows Blank Page
**Problem**: Vite blocking ngrok host
**Status**: ✅ FIXED - Vite config updated to allow `.ngrok-free.app` domains

### Google OAuth "Access Blocked" Error
**Problem**: Email not in test users list
**Fix**: Add `help.remodely@gmail.com` to test users in Google Console

### Slack "redirect_uri_mismatch" Error
**Problem**: Redirect URL doesn't match exactly
**Fix**: Ensure URL is: `https://700838bc9740.ngrok-free.app/auth/integration/callback`

### Button Does Nothing
**Debug**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click the OAuth button
4. Look for red error messages
5. Check Network tab for API calls

---

## 🎯 After Connecting

### Google Integration Features
Once connected, the app can:
- 📧 Send emails via Gmail API
- 📅 Sync with Google Calendar
- 📊 Read/write Google Sheets
- 📁 Upload files to Google Drive

### Slack Integration Features
Once connected, the app sends notifications for:
- 🔥 Hot leads (score > 70)
- 📞 Call completions
- 📅 Appointment bookings
- 💰 Deal updates (won/lost)

**Test Slack**: Create a lead with score > 70 to trigger notification!

---

## ⚠️ Important: ngrok URL Changes

**The free ngrok URL changes every restart!**

Current URL: `https://700838bc9740.ngrok-free.app`

If you restart ngrok, you must:
1. Update `FRONTEND_URL` in [backend/.env](backend/.env:5)
2. Update Slack redirect URL at https://api.slack.com/apps/A09S49D4UHF/oauth
3. Restart backend server

**Solution**: Deploy to production (Render/Vercel) for permanent HTTPS URL.

---

## 📊 Quick Status Check

```bash
# Check backend health
curl http://localhost:5001/health

# Check frontend running
lsof -i :5173

# Check ngrok URL
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])"
```

---

## 🎉 Next Steps

1. ✅ Complete Step 1: Add Google test user
2. ✅ Complete Step 2: Add Slack redirect URL
3. ✅ Complete Step 3: Test both OAuth buttons
4. 🎊 Start using integrations!

---

**App URL**: https://700838bc9740.ngrok-free.app
**Documentation**: See [QUICK_OAUTH_SETUP.md](QUICK_OAUTH_SETUP.md) for quick reference
**Last Updated**: 2025-11-13 07:46 UTC
