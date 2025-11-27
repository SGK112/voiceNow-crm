# Stripe Setup Guide for VoiceNow CRM

This guide will walk you through setting up Stripe for your VoiceNow CRM subscription billing.

## Prerequisites

- Active Stripe account (sign up at https://stripe.com if you don't have one)
- Access to your Stripe Dashboard
- The Stripe Secret Key you already have: `sk_test_...` (found in your .env file)

## Step 1: Create Subscription Products in Stripe

### 1.1 Navigate to Products

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Click on **Products** in the left sidebar
3. Click the **+ Add product** button in the top right

### 1.2 Create Starter Plan

1. **Product name**: `VoiceNow CRM - Starter`
2. **Description**: `Perfect for small businesses getting started with AI-powered voice calling`
3. **Pricing model**: Select **Standard pricing**
4. **Price**: `$149.00`
5. **Billing period**: Select **Monthly**
6. **Currency**: `USD`
7. **Product tax code**: Leave as default or select appropriate category
8. Click **Save product**

**IMPORTANT**: After saving, you'll see the product page. Look for the **Pricing** section and copy the **Price ID** (starts with `price_`). You'll need this for your environment variables.

Example: `price_1AbCdEfGhIjKlMnOpQrStUvW`

### 1.3 Create Professional Plan

Repeat the process:

1. Click **+ Add product**
2. **Product name**: `VoiceNow CRM - Professional`
3. **Description**: `For growing teams that need more power and advanced features`
4. **Pricing model**: **Standard pricing**
5. **Price**: `$299.00`
6. **Billing period**: **Monthly**
7. **Currency**: `USD`
8. Click **Save product**
9. **Copy the Price ID** from the product page

### 1.4 Create Enterprise Plan

Repeat the process:

1. Click **+ Add product**
2. **Product name**: `VoiceNow CRM - Enterprise`
3. **Description**: `For large organizations with custom needs and unlimited scale`
4. **Pricing model**: **Standard pricing**
5. **Price**: `$799.00`
6. **Billing period**: **Monthly**
7. **Currency**: `USD`
8. Click **Save product**
9. **Copy the Price ID** from the product page

### 1.5 Record Your Price IDs

You should now have three Price IDs that look like:

```
Starter Price ID:      price_1AbCdEfGhIjKlMnOpQrStUvW
Professional Price ID: price_2XyZaBcDeFgHiJkLmNoPqRsT
Enterprise Price ID:   price_3QwErTyUiOpAsDfGhJkLzXcV
```

Keep these handy for the next steps.

## Step 2: Get Your Stripe Secret Key

You mentioned you already have the Secret Key in your .env file. To verify or get a new one:

1. In Stripe Dashboard, click **Developers** in the left sidebar
2. Click **API keys**
3. Under **Secret key**, you'll see your key (hidden by default)
4. Click **Reveal test key** to see it
5. The key starts with `sk_test_` for test mode
6. For production, use the **Live mode** toggle at the top and get the `sk_live_` key

**Important**:
- Use `sk_test_` keys during development/testing
- Switch to `sk_live_` keys only when ready for production
- Never commit these keys to git

## Step 3: Set Up Stripe Webhooks

Webhooks allow Stripe to notify your app about subscription changes, payment success/failure, etc.

### 3.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** > **Webhooks**
2. Click **+ Add endpoint**
3. **Endpoint URL**: Enter your backend URL followed by `/api/subscription/webhook`
   - For local development: `http://localhost:5001/api/subscription/webhook`
   - For production (Render): `https://your-app-name.onrender.com/api/subscription/webhook`
4. **Description**: `VoiceNow CRM Subscription Events`
5. Click **Select events**
6. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
7. Click **Add events**
8. Click **Add endpoint**

### 3.2 Get Webhook Signing Secret

After creating the endpoint:

1. Click on the endpoint you just created
2. Under **Signing secret**, click **Reveal**
3. Copy the secret (starts with `whsec_`)

Example: `whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`

### 3.3 Test Webhook (Optional)

1. On the webhook endpoint page, click **Send test webhook**
2. Select an event like `customer.subscription.created`
3. Click **Send test webhook**
4. Check your backend logs to verify it was received

## Step 4: Update Environment Variables

Now you'll update your `.env` file and Render environment variables with all the values.

### 4.1 Update Local .env File

Edit `/Users/homepc/voiceflow-crm/.env`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_STARTER_PRICE_ID=price_YOUR_STARTER_PRICE_ID_HERE
STRIPE_PROFESSIONAL_PRICE_ID=price_YOUR_PROFESSIONAL_PRICE_ID_HERE
STRIPE_ENTERPRISE_PRICE_ID=price_YOUR_ENTERPRISE_PRICE_ID_HERE
```

Replace the placeholder values with your actual IDs from Steps 1-3.

### 4.2 Update Render Environment Variables

1. Log in to Render Dashboard: https://dashboard.render.com
2. Click on your backend service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable** for each:

**Variable 1:**
- Key: `STRIPE_SECRET_KEY`
- Value: `sk_test_YOUR_ACTUAL_SECRET_KEY_HERE`

**Variable 2:**
- Key: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_YOUR_WEBHOOK_SECRET_HERE`

**Variable 3:**
- Key: `STRIPE_STARTER_PRICE_ID`
- Value: `price_YOUR_STARTER_PRICE_ID_HERE`

**Variable 4:**
- Key: `STRIPE_PROFESSIONAL_PRICE_ID`
- Value: `price_YOUR_PROFESSIONAL_PRICE_ID_HERE`

**Variable 5:**
- Key: `STRIPE_ENTERPRISE_PRICE_ID`
- Value: `price_YOUR_ENTERPRISE_PRICE_ID_HERE`

5. Click **Save Changes**
6. Render will automatically redeploy your app with the new environment variables

## Step 5: Test the Integration

### 5.1 Test Locally

1. Make sure your backend is running: `npm run server`
2. Make sure your frontend is running: `cd frontend && npm run dev`
3. Open the app: http://localhost:5174
4. Log in or create an account
5. Navigate to **Billing & Subscription**
6. Try subscribing to a plan:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/25)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)

### 5.2 Verify in Stripe Dashboard

1. Go to **Customers** in Stripe Dashboard
2. You should see your test customer
3. Click on the customer
4. Verify the subscription was created with the correct plan
5. Go to **Events** to see webhook events being fired

### 5.3 Test Subscription Lifecycle

Test these workflows:

**Upgrade Plan:**
1. Subscribe to Starter
2. Upgrade to Professional
3. Verify proration in Stripe Dashboard

**Downgrade Plan:**
1. Subscribe to Professional
2. Downgrade to Starter
3. Verify downgrade scheduled for next billing cycle

**Cancel Subscription:**
1. Cancel from Billing page
2. Verify cancellation in Stripe Dashboard
3. Check that access continues until period end

**Failed Payment:**
1. In Stripe Dashboard, go to **Payments**
2. Find a test payment
3. Click **⋮** > **Refund** to simulate failure
4. Verify your app handles the `invoice.payment_failed` webhook

## Step 6: Production Checklist

Before going live:

- [ ] Switch from Test mode to Live mode in Stripe
- [ ] Create new products with same pricing in Live mode
- [ ] Get new Live Price IDs
- [ ] Get Live Secret Key (`sk_live_...`)
- [ ] Create webhook endpoint for production URL
- [ ] Get Live Webhook Secret
- [ ] Update Render environment variables with Live keys
- [ ] Test with real card (small amount)
- [ ] Set up Stripe Tax (if required)
- [ ] Configure email receipts in Stripe
- [ ] Set up billing alerts
- [ ] Review Stripe's compliance requirements

## Troubleshooting

### Webhook not receiving events

1. Check Render logs for errors
2. Verify webhook URL is correct (include `/api/subscription/webhook`)
3. Make sure backend is deployed and running
4. Check Stripe webhook logs for delivery attempts
5. Verify STRIPE_WEBHOOK_SECRET matches in both places

### "Invalid price ID" error

1. Double-check Price IDs in .env match Stripe exactly
2. Make sure you're using Price IDs, not Product IDs
3. Verify you're in the correct mode (test vs live)

### Payment not processing

1. Check STRIPE_SECRET_KEY is correct
2. Verify you're using test card numbers in test mode
3. Check browser console for errors
4. Look at Network tab for API responses

### Subscription not updating in database

1. Check backend logs for webhook processing
2. Verify MongoDB connection is working
3. Check User model has all required fields
4. Review stripeService.js webhook handlers

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- VoiceNow CRM Issues: Check backend logs and frontend console

## API Endpoints Reference

Your app uses these Stripe-related endpoints:

```
GET    /api/subscription/plans          - Get available plans
POST   /api/subscription/create         - Create new subscription
POST   /api/subscription/cancel         - Cancel subscription
PATCH  /api/subscription/update         - Update/change plan
GET    /api/subscription/invoices       - Get customer invoices
POST   /api/subscription/webhook        - Stripe webhook events
```

## Pricing Summary

Current pricing structure:

| Plan         | Price/mo | Voice Mins | AI Tokens | SMS    | Emails     | Agents    | Team      |
|-------------|----------|------------|-----------|---------|-----------|-----------|-----------|
| Starter     | $149     | 200        | 5,000     | 500     | 2,500     | 3         | 1 member  |
| Professional| $299     | 500        | 15,000    | 2,000   | 10,000    | 10        | 5 members |
| Enterprise  | $799     | 2,000      | 50,000    | 10,000  | Unlimited | Unlimited | Unlimited |

Overage charges apply when limits exceeded (configure in Stripe if needed).

---

**You're all set!** Once you complete these steps, your Stripe integration will be fully functional.
