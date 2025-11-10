# Render Setup - Simple Checklist

## Current Situation
- **Backend (working)**: `voiceflow-crm` at https://voiceflow-crm.onrender.com
- **Frontend (needs fixes)**: `voiceflow-crm-app`

## Fix Frontend - Add These 3 Environment Variables

Go to: Render Dashboard → `voiceflow-crm-app` → Environment tab

### 1. Fix API URL
```
VITE_API_URL=https://voiceflow-crm.onrender.com
```
(Currently set to wrong URL)

### 2. Add Google OAuth
```
VITE_GOOGLE_CLIENT_ID=710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik.apps.googleusercontent.com
```

### 3. Add Stripe Key
Get from: https://dashboard.stripe.com/test/apikeys
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## After Adding Variables
1. Click "Save Changes"
2. Wait for redeploy (3-5 minutes)
3. Test at: https://voiceflow-crm-app.onrender.com/login
4. You should see "Continue with Google" button

## If Google Button Still Missing
Open browser console (F12) on login page and check:
```javascript
console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID)
```
Should show: `710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik.apps.googleusercontent.com`

If it shows `undefined`, the environment variable wasn't saved correctly.
