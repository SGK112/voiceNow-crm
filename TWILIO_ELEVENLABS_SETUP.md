# Twilio + ElevenLabs Phone Integration Setup

## Overview
This document explains how to set up phone call integration for your VoiceNow CRM AI agent using Twilio and ElevenLabs.

## Why This Solution?
- ✅ Works on ALL devices (iPhone, Android, desktop)
- ✅ No browser compatibility issues
- ✅ Professional phone experience
- ✅ Sub-second response times
- ✅ Enterprise-grade reliability
- ✅ Perfect for demos and production

## Prerequisites

1. **Twilio Account** (free tier available)
   - Get a Twilio phone number
   - Note your Account SID and Auth Token

2. **ElevenLabs Account** with existing agent
   - Agent ID: `agent_9701k9xptd0kfr383djx5zk7300x`
   - Agent must be configured and tested

## Setup Steps

### Step 1: Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up or log in
3. Get a phone number:
   - Navigate to Phone Numbers → Buy a Number
   - Choose a number that supports Voice
   - Purchase the number (free with trial credits)
4. Note these credentials:
   - **Twilio Phone Number**: +1-XXX-XXX-XXXX
   - **Account SID**: Found on Twilio Console dashboard
   - **Auth Token**: Found on Twilio Console dashboard

### Step 2: Import Twilio Number to ElevenLabs

1. Log into [ElevenLabs Dashboard](https://elevenlabs.io/)
2. Navigate to: **Agents Platform** → **Phone Numbers** tab
3. Click "Add Phone Number" or "Import Twilio Number"
4. Enter your Twilio credentials:
   - Twilio Phone Number: `+1XXXXXXXXXX`
   - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Auth Token: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. Click "Import" or "Connect"

**ElevenLabs will automatically configure the webhooks for you!**

### Step 3: Assign Agent to Phone Number

1. In ElevenLabs, find your imported phone number
2. Click "Assign Agent" or similar option
3. Select your agent: `agent_9701k9xptd0kfr383djx5zk7300x`
4. Save the configuration

### Step 4: Test the Integration

1. Call your Twilio number from your phone
2. You should hear your AI agent respond
3. Test the conversation flow
4. Verify the agent responds correctly

### Step 5: Update Marketing Page

Once the phone number is working, update the marketing page to show the "Call AI Agent" button with your actual phone number.

## What Gets Configured Automatically

When you import your Twilio number to ElevenLabs:
- ✅ Voice webhooks are automatically configured
- ✅ Incoming calls are routed to your AI agent
- ✅ TwiML is handled by ElevenLabs
- ✅ Real-time voice streaming is set up
- ✅ No manual webhook configuration needed!

## Features Available

### Inbound Calls
- Users call your Twilio number
- AI agent answers and begins conversation
- Natural voice interaction
- Works from any phone

### Outbound Calls (Optional)
- Agent can call users
- Programmatic call initiation
- Great for callbacks and notifications

### Personalization
- Webhook personalization for dynamic behavior
- Pass caller information to agent
- Customize responses based on context

## Cost Estimate

**Twilio Costs** (pay-as-you-go):
- Phone number: ~$1/month
- Incoming calls: ~$0.0085/minute
- Outgoing calls: ~$0.013/minute

**ElevenLabs Costs**:
- Free tier: 15 minutes/month
- Creator: $5/month for 3 hours
- Pro: $22/month for 20 hours

**For Demo**: Free trial credits cover initial testing!

## Marketing Page Integration

The marketing page will show:
- "📞 Talk to AI Agent" button
- Click opens phone dialer on mobile
- Shows number on desktop
- Professional call-to-action

## Troubleshooting

### Phone Number Not Working
- Verify Twilio credentials are correct
- Check that number supports Voice
- Ensure ElevenLabs agent is assigned

### Agent Not Responding
- Test agent in ElevenLabs dashboard first
- Check agent configuration and prompts
- Verify webhook configuration

### Poor Call Quality
- Check your internet connection
- Verify Twilio number region matches your location
- Contact ElevenLabs support if persistent

## Next Steps

1. ✅ Follow setup steps above
2. ✅ Test the phone integration thoroughly
3. ✅ Update marketing page with phone number
4. ✅ Deploy and demo!

## Support

- **Twilio Support**: https://support.twilio.com/
- **ElevenLabs Support**: https://elevenlabs.io/support
- **Integration Docs**: https://elevenlabs.io/docs/agents-platform/phone-numbers/twilio-integration

---

**Status**: Ready to implement
**Time to Complete**: ~30 minutes
**Works on iPhone**: ✅ YES!
