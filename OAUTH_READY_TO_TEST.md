# OAuth Integrations - Ready to Test! 🚀

## ✅ Everything is Now Running

- ✅ **Backend**: Running on port 5001
- ✅ **Frontend**: Running on port 5176
- ✅ **ngrok Tunnel**: `https://fa0e37460c1f.ngrok-free.app`
- ✅ **OAuth Endpoints**: Google & Slack configured
- ✅ **Environment**: Updated with new ngrok URL

---

## 🔧 Setup Required (3 Steps)

### Step 1: Google OAuth - Add Test User

**Browser tab opened**: Google OAuth Consent Screen

**Instructions**:
1. Look for the **"Test users"** section
2. Click **"+ ADD USERS"** button
3. Enter email: `help.remodely@gmail.com`
4. Click **"Save"**

**Why**: Your app is in "Testing" mode, so only approved test users can use Google OAuth.

---

### Step 2: Slack OAuth - Add Redirect URL

**Browser tab opened**: Slack App OAuth Settings

**Instructions**:
1. Find **"Redirect URLs"** section
2. Click **"Add New Redirect URL"**
3. Enter: `https://fa0e37460c1f.ngrok-free.app/auth/integration/callback`
4. Click **"Add"**
5. Click **"Save URLs"** at bottom

**Why**: Slack needs to know where to redirect after authorization.

---

### Step 3: Test the Integrations

**Browser tab opened**: Your App

**Instructions**:
1. Login to your app at: `https://fa0e37460c1f.ngrok-free.app`
2. Navigate to **Integrations** page
3. Try **"Connect Google"** button:
   - Should redirect to Google consent screen
   - Authorize the app
   - Should redirect back showing "Connected" ✅
4. Try **"Connect Slack"** button:
   - Should redirect to Slack authorization
   - Select workspace and authorize
   - Should redirect back showing "Connected" ✅

---

## 🐛 Troubleshooting

### If Google OAuth Still Shows "Access Blocked"

**Problem**: Test user not added correctly

**Fix**:
- Go back to Google Console
- Make sure `help.remodely@gmail.com` is in the test users list
- Try again

---

### If Slack Button Does Nothing

**Check**:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Click the Slack button
4. Look for errors (red text)

**Common Issues**:
- **Not logged in**: Login at `https://fa0e37460c1f.ngrok-free.app/login`
- **CORS error**: Backend should be running (check with `curl http://localhost:5001/health`)
- **Network error**: Check backend logs in terminal

---

### If Redirect URL Mismatch

**Problem**: URL in Slack app settings doesn't match exactly

**Fix**:
- Slack redirect URL must be: `https://fa0e37460c1f.ngrok-free.app/auth/integration/callback`
- **Exact match required** - no trailing slashes or differences

---

## 📋 Testing Checklist

After completing setup, verify:

- [ ] Google OAuth works and shows "Connected" status
- [ ] Slack OAuth works and shows "Connected" status
- [ ] Both integrations appear in Integrations page list
- [ ] Can disconnect integrations (red "Disconnect" button)
- [ ] Backend logs show successful OAuth flows

---

## 🎯 What Happens Next

### For Google Integration

Once connected, your app can:
- Send emails via Gmail
- Access Google Calendar for appointments
- Read/write Google Sheets for data sync
- Upload files to Google Drive

### For Slack Integration

Once connected, your app will automatically send notifications for:
- 🔥 Hot leads (score > 70)
- 📞 Completed calls
- 📅 Scheduled appointments
- 💰 Won/lost deals

**Test**: Create a lead with a high score (>70) to trigger a Slack notification!

---

## ⚠️ Important Notes

### ngrok URL Changes

The free ngrok URL changes every time you restart ngrok. If you restart ngrok, you'll need to:

1. Update `FRONTEND_URL` in `backend/.env`
2. Update Slack redirect URL in app settings
3. Restart backend server

**Current ngrok URL**: `https://fa0e37460c1f.ngrok-free.app`

### Alternative: Get Permanent URL

**Option 1**: Paid ngrok ($8/month) for static domain
**Option 2**: Deploy to production (Render/Vercel) for free permanent HTTPS URL

---

## 🔍 Monitoring

### Watch Backend Logs

Keep terminal open to see OAuth flow logs:
```
GET /api/integrations/google/auth 200
GET /api/integrations/google/callback 200
Integration created for user...
```

### Check Frontend Console

Keep browser DevTools open (F12) to see:
- API calls being made
- Any JavaScript errors
- Network requests and responses

---

## 📞 Need Help?

If you encounter issues:

1. **Check browser console** for errors (F12 → Console)
2. **Check backend logs** in terminal
3. **Verify setup**:
   - Google test user added?
   - Slack redirect URL correct?
   - Backend running? (`curl http://localhost:5001/health`)

---

## 🎉 Quick Start

**Right now, do this**:

1. ✅ Add yourself as Google test user (browser tab already open)
2. ✅ Add Slack redirect URL (browser tab already open)
3. ✅ Login and test both buttons (app tab already open)

That's it! OAuth should work perfectly after these 3 steps.

---

**Last Updated**: 2025-11-13
**ngrok URL**: https://fa0e37460c1f.ngrok-free.app
**Backend Status**: ✅ Running on port 5001
