# VoiceFlow AI Mobile App - Complete Guide

## Overview

The VoiceFlow AI mobile app replaces traditional voicemail with an intelligent AI assistant that:
- Automatically calls back when you miss a call
- Handles conversations with AI voice agent
- Auto-replies to SMS messages with AI
- Qualifies leads and books appointments
- Syncs everything to your CRM dashboard

## How It Works

### Voicemail AI (Missed Calls)
1. **Missed Call Detection**: App monitors incoming calls in background
2. **Auto-Callback**: When you miss a call, app immediately calls them back using VoIP
3. **AI Conversation**: ElevenLabs AI agent speaks with the caller
4. **Lead Capture**: Collects name, phone, email, project details
5. **Appointment Booking**: Books consultation in your calendar
6. **Notification**: You get instant notification with transcript and lead info
7. **CRM Sync**: Lead automatically created in web dashboard

### SMS AI (Text Messages)
1. **Message Intercept**: App becomes default SMS handler
2. **AI Analysis**: OpenAI/Claude analyzes incoming message intent
3. **Smart Reply**: Generates contextual, professional response
4. **Review Option**: You can review before sending (or enable auto-send)
5. **Lead Qualification**: AI asks qualifying questions via SMS
6. **CRM Integration**: Conversation synced to lead record

## Technology Stack

### Frontend (Mobile App)
- **Expo** (React Native framework)
- **TypeScript** for type safety
- **AsyncStorage** for local data
- **Expo Notifications** for push notifications
- **Expo Contacts** for accessing phone contacts

### Voice Integration
- **Twilio Client SDK** for VoIP calls
- **ElevenLabs API** for AI voice conversations
- **Twilio Voice API** for call routing

### SMS Integration
- **Expo SMS** for SMS handling
- **OpenAI API** for message analysis and generation
- **Twilio SMS API** for message sending

### Backend Integration
- Connects to existing Node.js backend at `http://localhost:5001`
- Uses JWT authentication
- Real-time sync with MongoDB CRM

## Features

### 1. Smart Call Handling
- Background call monitoring
- Missed call detection
- Auto-callback with AI
- Real-time transcription
- Lead qualification
- Appointment scheduling
- Contact sync

### 2. Intelligent SMS
- AI-powered auto-replies
- Context-aware responses
- Lead qualification via text
- Review before send option
- Message history
- Thread management

### 3. CRM Integration
- Auto-create leads from calls/texts
- Sync to web dashboard
- Contact history
- Follow-up reminders
- Activity tracking

### 4. User Controls
- Enable/disable AI per contact
- Custom AI personality
- Business hours settings
- Auto-reply templates
- Notification preferences

### 5. Dashboard
- Recent calls/messages
- Lead pipeline
- Appointment calendar
- Analytics & insights
- AI performance metrics

## App Structure

```
mobile/
├── App.tsx                    # Main app entry
├── app.json                   # Expo configuration
├── package.json              # Dependencies
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── CallsScreen.tsx
│   │   ├── MessagesScreen.tsx
│   │   ├── LeadsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── OnboardingScreen.tsx
│   ├── components/
│   │   ├── CallItem.tsx
│   │   ├── MessageThread.tsx
│   │   ├── LeadCard.tsx
│   │   └── AIToggle.tsx
│   ├── services/
│   │   ├── CallService.ts      # Call detection & VoIP
│   │   ├── SMSService.ts       # SMS handling
│   │   ├── AIService.ts        # AI processing
│   │   ├── CRMService.ts       # Backend sync
│   │   └── NotificationService.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── hooks/
│   │   ├── useCallMonitor.ts
│   │   ├── useSMSHandler.ts
│   │   └── useAI.ts
│   └── utils/
│       ├── api.ts
│       ├── storage.ts
│       └── constants.ts
└── assets/
    ├── icons/
    └── splash.png
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- Physical device for testing (recommended)

### Development Setup

1. **Install dependencies**:
```bash
cd mobile
npm install
```

2. **Install Expo CLI globally**:
```bash
npm install -g expo-cli
```

3. **Install required packages**:
```bash
npx expo install expo-notifications expo-contacts expo-sms expo-device expo-constants
npm install @twilio/voice-react-native-sdk axios
npm install @react-navigation/native @react-navigation/bottom-tabs
```

4. **Configure environment**:
Create `mobile/.env`:
```
API_URL=http://localhost:5001
ELEVENLABS_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_ACCESS_TOKEN_URL=http://localhost:5001/api/twilio/voice-token
```

5. **Start development server**:
```bash
npm start
```

### Testing on Device

**iOS (Requires Mac)**:
```bash
npm run ios
```

**Android**:
```bash
npm run android
```

**Web (Limited features)**:
```bash
npm run web
```

## App Store Submission

### Google Play Store (Android)

**Requirements**:
- Google Play Developer account ($25 one-time)
- Signed APK/AAB file
- App icons (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (4-8 images)
- App description
- Privacy policy URL

**Build Process**:
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

**Steps**:
1. Sign up at https://play.google.com/console
2. Pay $25 registration fee
3. Create app listing
4. Upload APK/AAB
5. Complete store listing (description, screenshots, etc.)
6. Submit for review (1-3 days)
7. App goes live

### Apple App Store (iOS)

**Requirements**:
- Apple Developer account ($99/year)
- Mac computer with Xcode
- App icons (1024x1024 PNG)
- Screenshots (multiple sizes)
- App description
- Privacy policy URL

**Build Process**:
```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**Steps**:
1. Enroll at https://developer.apple.com ($99/year)
2. Create App ID in Apple Developer portal
3. Generate certificates and provisioning profiles
4. Build app with EAS
5. Upload to App Store Connect
6. Complete app listing
7. Submit for review (1-7 days)
8. App goes live

## Permissions Required

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### iOS (Info.plist)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to make AI-powered calls</string>
<key>NSContactsUsageDescription</key>
<string>We need access to identify callers</string>
<key>NSPhoneCallHistoryUsageDescription</key>
<string>We need to detect missed calls</string>
```

## Backend API Endpoints

The mobile app uses these backend endpoints:

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get user profile

### Calls
- `POST /api/mobile/call-missed` - Report missed call
- `POST /api/mobile/start-ai-call` - Initiate AI callback
- `GET /api/mobile/call-history` - Get call history
- `GET /api/mobile/call/:id` - Get call details

### SMS
- `POST /api/mobile/sms-received` - Process incoming SMS
- `POST /api/mobile/sms-reply` - Send AI-generated reply
- `GET /api/mobile/sms-threads` - Get message threads
- `GET /api/mobile/sms-thread/:phoneNumber` - Get thread messages

### Leads
- `GET /api/leads` - List all leads
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get lead details
- `PUT /api/leads/:id` - Update lead

### Settings
- `GET /api/mobile/settings` - Get user settings
- `PUT /api/mobile/settings` - Update settings

## Configuration

### AI Settings (Customizable)
```typescript
{
  voiceAgentEnabled: true,
  smsAgentEnabled: true,
  aiPersonality: 'professional', // professional, friendly, casual
  businessName: 'Your Business',
  businessType: 'contractor',
  businessHours: {
    start: '9:00 AM',
    end: '5:00 PM',
    timezone: 'America/New_York'
  },
  autoReplyEnabled: false, // Require review before sending
  qualificationQuestions: [
    'What type of project are you interested in?',
    'What is your timeline?',
    'What is your budget range?'
  ]
}
```

## User Flow

### First Time Setup
1. Download app from App Store / Play Store
2. Create account or login
3. Grant phone, SMS, and microphone permissions
4. Configure AI assistant (business name, type, personality)
5. Set business hours and preferences
6. Enable AI features
7. Done! App runs in background

### Daily Usage
1. User misses a call
2. App detects missed call
3. App calls caller back via VoIP
4. AI agent greets caller
5. AI collects information and books appointment
6. User gets notification with transcript
7. Lead created in CRM automatically
8. User follows up from dashboard

## Pricing & Monetization

Users need an active subscription to use the mobile app:

- **Starter**: $49/month - 100 AI calls/SMS per month
- **Professional**: $149/month - 500 AI calls/SMS per month
- **Enterprise**: $299/month - Unlimited AI calls/SMS

Mobile app features tied to web subscription.

## Testing Guide

### Local Testing
1. Start backend server: `npm run dev` (in backend folder)
2. Start mobile app: `npm start` (in mobile folder)
3. Open Expo Go app on phone
4. Scan QR code
5. Test features

### Call Testing
1. Have someone call your phone
2. Don't answer (let it go to voicemail)
3. App should detect missed call
4. App calls them back automatically
5. AI agent handles conversation
6. Check notification and dashboard

### SMS Testing
1. Send SMS to your phone
2. App intercepts message
3. AI generates reply
4. Review and send (or auto-send if enabled)
5. Check CRM sync

## Troubleshooting

### Call Detection Not Working
- Check phone permissions
- Ensure app has background access
- Restart app
- Check Twilio configuration

### SMS Not Intercepting
- Make app default SMS handler
- Check SMS permissions
- Restart device
- Verify Android/iOS version compatibility

### VoIP Calls Failing
- Check Twilio access token
- Verify internet connection
- Check firewall/network settings
- Test Twilio credentials

### AI Not Responding
- Verify ElevenLabs API key
- Check backend connection
- Review API quotas
- Check error logs

## Development Roadmap

### Phase 1 (Current)
- [x] Call detection
- [x] SMS handling
- [x] AI integration
- [x] CRM sync
- [x] Basic dashboard

### Phase 2 (Next)
- [ ] Voice customization
- [ ] Advanced lead qualification
- [ ] Calendar integration
- [ ] Team features
- [ ] Analytics dashboard

### Phase 3 (Future)
- [ ] Multi-language support
- [ ] Video calls
- [ ] Email integration
- [ ] WhatsApp integration
- [ ] Advanced automations

## Security & Privacy

- End-to-end encryption for voice calls
- Secure storage of credentials
- GDPR compliant data handling
- User consent for AI processing
- Data retention controls
- Privacy policy: https://voiceflow-crm.com/privacy

## Support

- Email: support@voiceflow-crm.com
- Documentation: https://docs.voiceflow-crm.com
- Discord: https://discord.gg/voiceflow

## License

Proprietary - All rights reserved
