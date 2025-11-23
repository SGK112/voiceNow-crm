# Mobile App Testing Guide

## Quick Test (Right Now)

### Option 1: Test on Your Phone (Recommended)

**For Android or iPhone:**

1. **Install Expo Go app** on your phone:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Start the development server**:
   ```bash
   cd /Users/homepc/voiceFlow-crm-1/mobile
   npm start
   ```

3. **Scan the QR code**:
   - A QR code will appear in your terminal
   - Open Expo Go app on your phone
   - Tap "Scan QR Code"
   - Point camera at the QR code
   - App will load on your phone in ~30 seconds

4. **Test features**:
   - You'll see the app running live on your device
   - Hot reload - any code changes appear instantly
   - Can test all features except:
     - Call detection (requires native build)
     - SMS interception (requires native build)
   - Can test:
     - UI/UX
     - API calls
     - CRM integration
     - Navigation

### Option 2: Test in Simulator (If You Have One)

**iOS Simulator (Mac only):**
```bash
cd /Users/homepc/voiceFlow-crm-1/mobile
npm run ios
```

**Android Emulator:**
```bash
cd /Users/homepc/voiceFlow-crm-1/mobile
npm run android
```

## What You'll See

Since we haven't built the UI screens yet, you'll see:
- Default Expo welcome screen
- White screen with "Open up App.tsx to start working"

## To See Something Working

Let me create a simple test screen you can see right now:

```bash
# I'll create this in the next step
```

## Testing Limitations

### With Expo Go (Current Method)
✅ Can Test:
- UI and navigation
- API calls to backend
- CRM functionality
- Most features

❌ Cannot Test:
- Call detection (needs native build)
- SMS interception (needs native build)
- Background services (needs native build)
- Push notifications (limited)

### With Native Build (After EAS Build)
✅ Can Test Everything:
- Full call monitoring
- SMS interception
- Background services
- All native features

## Full Testing Flow

### Step 1: Quick UI Test (Now)
```bash
cd mobile
npm install
npm start
# Scan QR with Expo Go
```

### Step 2: Backend Integration Test
```bash
# In one terminal - start backend
cd /Users/homepc/voiceFlow-crm-1/backend
npm run dev

# In another terminal - start mobile
cd /Users/homepc/voiceFlow-crm-1/mobile
npm start
```

Test:
- Login/registration
- Fetch leads from CRM
- API connectivity

### Step 3: Native Build Test (Full Features)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android (development build)
eas build --profile development --platform android

# Install on physical device
# Download APK from EAS and install
```

### Step 4: Test Real Features

Once installed from EAS build:
1. Grant all permissions
2. Make a test call to your phone and don't answer
3. App should detect missed call
4. Check if AI callback happens
5. Test SMS by sending text to your phone
6. Verify CRM sync

## Quick Demo Build

Want to see it working right now? I can:

1. **Create a simple test UI** (5 minutes)
   - Login screen
   - Dashboard with fake data
   - Show what it will look like

2. **You can test on your phone immediately**
   - Install Expo Go
   - Scan QR code
   - See the UI

Should I create a quick test UI so you can see it on your phone right now?
