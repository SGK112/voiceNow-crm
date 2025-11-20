# 🔐 Google OAuth Login - Configuration Required

## Current Error

```
Access blocked: Authorization Error
Error 400: invalid_request

This app doesn't comply with Google's OAuth 2.0 policy
```

## Why This Happens

Your Google OAuth app is in "Testing" mode and needs configuration.

---

## ✅ QUICK FIX: Use Email/Password Login Instead

**YOU CAN LOGIN RIGHT NOW** with email/password while we fix Google OAuth:

### Test Account Credentials:
```
Email: test@test.com
Password: test123
```

### How to Login:
1. Go to: http://localhost:5173/login
2. Enter the email and password above
3. Click "Sign In"
4. You'll be redirected to the dashboard

**This works immediately - no configuration needed!**

---

## 🔧 Fix Google OAuth (Optional)

If you want to use Google OAuth, follow these steps:

### Step 1: Add Test Users to Google Console

1. **Open Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials/consent

2. **Find "Test users" section** (scroll down)

3. **Click "+ ADD USERS"**

4. **Add your email:**
   ```
   joshb@surprisegranite.com
   ```

5. **Click "SAVE"**

### Step 2: Add Authorized Redirect URIs

1. **Go to Credentials page:**
   https://console.cloud.google.com/apis/credentials

2. **Click on your OAuth 2.0 Client ID:**
   `710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik`

3. **Under "Authorized redirect URIs", add these URLs:**

   For Local Development:
   ```
   http://localhost:5173/auth/google/callback
   ```

   For Production (if deployed):
   ```
   https://your-domain.com/auth/google/callback
   ```

4. **Click "SAVE"**

5. **Wait 5-10 minutes** for Google to propagate changes

### Step 3: Test Google Login

1. **Clear browser cache** or use Incognito mode
2. Go to: http://localhost:5173/login
3. Click "Continue with Google"
4. Select your Google account
5. Should work now!

---

## 📋 Verification Checklist

After configuring Google OAuth:

- [ ] Added `joshb@surprisegranite.com` as test user in Google Console
- [ ] Added `http://localhost:5173/auth/google/callback` to Authorized redirect URIs
- [ ] Waited 5-10 minutes for changes to propagate
- [ ] Cleared browser cache or used Incognito mode
- [ ] Tested Google login - it works!

---

## 🎯 Current Configuration

**Google OAuth Client ID:**
```
710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik.apps.googleusercontent.com
```

**Google Cloud Console:**
https://console.cloud.google.com

**Required Redirect URIs:**
- Local: `http://localhost:5173/auth/google/callback`
- Production: `https://voiceflow-crm.onrender.com/auth/google/callback`

---

## 🚀 Alternative: Publish the App

If you want **anyone** to use Google login (not just test users):

1. In Google Cloud Console, click **"PUBLISH APP"**
2. Submit for Google verification
3. Wait for approval (takes a few days to weeks)
4. Once approved, anyone can login with Google

**But this is NOT necessary for development!** Just add yourself as a test user.

---

## 💡 Recommended Approach

**For Development:**
1. Use email/password login (works now with test@test.com)
2. OR add yourself as a test user in Google Console
3. Keep app in "Testing" mode

**For Production:**
1. Submit app for Google verification
2. OR continue using test users (limit: 100 users)
3. Enable both email/password and Google OAuth

---

## 🛠️ Create Your Own Account

Want to use your own email instead of test@test.com?

1. Go to: http://localhost:5173/signup
2. Enter your email and password
3. Create account
4. Login with your credentials

---

## 📞 Need Help?

If Google OAuth still doesn't work after following these steps:

1. **Check browser console** (F12) for errors
2. **Verify redirect URI** matches EXACTLY (no trailing slash)
3. **Wait longer** - Google can take up to 10 minutes to propagate
4. **Try Incognito mode** - Fresh session without cache

---

## Summary

**Working Now:** ✅ Email/Password Login (test@test.com / test123)

**Needs Setup:** ⏳ Google OAuth (add test user + redirect URI)

**Best for Development:** Use email/password, skip Google OAuth complexity!
