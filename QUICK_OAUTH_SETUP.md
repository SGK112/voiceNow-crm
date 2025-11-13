# OAuth Setup - 3 Simple Steps ⚡

## Step 1: Google Test User
➜ **Go to**: https://console.cloud.google.com/apis/credentials/consent
➜ **Add test user**: `help.remodely@gmail.com`

## Step 2: Slack Redirect URL
➜ **Go to**: https://api.slack.com/apps/A09S49D4UHF/oauth
➜ **Add redirect**: `https://fa0e37460c1f.ngrok-free.app/auth/integration/callback`

## Step 3: Test It!
➜ **Go to**: https://fa0e37460c1f.ngrok-free.app
➜ **Login** → **Integrations** → **Click both buttons**

---

## ✅ Current Status

| Component | Status | URL/Port |
|-----------|--------|----------|
| Backend | ✅ Running | http://localhost:5001 |
| Frontend | ✅ Running | http://localhost:5176 |
| ngrok | ✅ Running | https://fa0e37460c1f.ngrok-free.app |
| Google OAuth | ⏳ Needs test user | |
| Slack OAuth | ⏳ Needs redirect URL | |

---

## 🚨 Quick Fixes

**Button does nothing?**
→ Check browser console (F12)

**"Access Blocked"?**
→ Add test user in Google Console

**"redirect_uri_mismatch"?**
→ Check Slack redirect URL is exact match

**"Not authorized"?**
→ Login again, token may have expired

---

## 📱 Test Slack Notifications

After connecting Slack:
1. Go to **Leads** page
2. Create a new lead
3. Set score > 70 (makes it a "hot" lead)
4. Check Slack for notification! 🔥

---

**Need more details?** → See [OAUTH_READY_TO_TEST.md](./OAUTH_READY_TO_TEST.md)
