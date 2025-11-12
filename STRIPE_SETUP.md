# Stripe Live Mode Setup Guide

## Current Status
- Your TEST mode is configured correctly with these price IDs:
  - Starter: `price_1SRcSBHDbK8UKkrvlunSAt2f` ($149/mo)
  - Professional: `price_1SRcTAHDbK8UKkrvehtLOtkH` ($299/mo)
  - Enterprise: `price_1SRcU2HDbK8UKkrv7IIMIOQp` ($799/mo)

## To Use LIVE Mode (Production)

### Step 1: Create Products in Stripe Live Mode

1. Switch to Live mode in Stripe Dashboard (toggle in top-left)
2. Go to Products → Add Product
3. Create three products:

#### Product 1: VoiceFlow CRM - Starter
- Name: `VoiceFlow CRM - Starter`
- Description: `Perfect for small businesses getting started with AI-powered voice calling`
- Pricing: Recurring, $149/month
- Copy the price ID (will look like `price_xxxxx`)

#### Product 2: VoiceFlow CRM - Professional
- Name: `VoiceFlow CRM - Professional`
- Description: `For growing teams that need more power and advanced features`
- Pricing: Recurring, $299/month
- Copy the price ID

#### Product 3: VoiceFlow CRM - Enterprise
- Name: `VoiceFlow CRM - Enterprise`
- Description: `For large organizations with custom needs and unlimited scale`
- Pricing: Recurring, $799/month
- Copy the price ID

### Step 2: Update Environment Variables

**Local (.env):**
```bash
# Switch to LIVE keys
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET

# Update with LIVE price IDs from Step 1
STRIPE_STARTER_PRICE_ID=price_YOUR_LIVE_STARTER_ID
STRIPE_PROFESSIONAL_PRICE_ID=price_YOUR_LIVE_PROFESSIONAL_ID
STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_LIVE_ENTERPRISE_ID
```

**Frontend (.env):**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
```

**Render Dashboard:**
- Update all the above environment variables in Render
- Trigger a new deployment

### Step 3: Configure Webhook for Live Mode

1. In Stripe Dashboard (Live mode) → Developers → Webhooks
2. Add endpoint: `https://voiceflow-crm.onrender.com/api/subscription/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Render

## Quick Test Mode Check

If you want to stay in TEST mode, verify:
```bash
# Check your current Stripe key mode
echo "Secret Key: $(grep STRIPE_SECRET_KEY backend/.env | cut -c 1-60)"
echo "Publishable Key: $(grep VITE_STRIPE_PUBLISHABLE_KEY frontend/.env | cut -c 1-80)"
```

Both should start with `_test_` for test mode or `_live_` for live mode.

## Render Configuration

Check your Render environment variables match the mode you want:
```bash
render services list
# Then check the environment variables for voiceflow-crm service
```
