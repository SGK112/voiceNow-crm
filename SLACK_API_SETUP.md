# Slack API Setup Guide

## How to Get Your Slack API Credentials

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter:
   - **App Name**: `VoiceFlow Notifications` (or whatever you want)
   - **Pick a workspace**: Select your Slack workspace
5. Click **"Create App"**

---

### Step 2: Set Up Bot Permissions

1. In your app settings, click **"OAuth & Permissions"** in the left sidebar
2. Scroll down to **"Scopes"** section
3. Under **"Bot Token Scopes"**, click **"Add an OAuth Scope"**
4. Add these scopes:
   ```
   chat:write          - Send messages
   chat:write.public   - Send messages to public channels
   channels:read       - View channels
   users:read          - View users
   ```

---

### Step 3: Install App to Workspace

1. Scroll to top of **"OAuth & Permissions"** page
2. Click **"Install to Workspace"**
3. Review permissions
4. Click **"Allow"**
5. **Copy the "Bot User OAuth Token"** - starts with `xoxb-`
   - This is your `SLACK_BOT_TOKEN`

---

### Step 4: Get Incoming Webhook URL (Alternative Method)

If you just want simple notifications, webhooks are easier:

1. In your app settings, click **"Incoming Webhooks"** in left sidebar
2. Toggle **"Activate Incoming Webhooks"** to **ON**
3. Scroll down and click **"Add New Webhook to Workspace"**
4. Select the channel where you want notifications (e.g., `#crm-alerts`)
5. Click **"Allow"**
6. **Copy the Webhook URL** - looks like:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
   - This is your `SLACK_WEBHOOK_URL`

---

## Add to .env File

### Option 1: Using Bot Token (More Flexible)
```bash
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C1234567890  # Get from Slack channel details
```

**How to get Channel ID**:
1. Open Slack in browser
2. Go to the channel you want to send to
3. Look at URL: `https://app.slack.com/client/T.../C1234567890`
4. The `C1234567890` part is your Channel ID

### Option 2: Using Webhook (Simpler)
```bash
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

---

## Testing Your Slack Integration

### Test with Webhook (Easiest)
```bash
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🎉 VoiceFlow CRM is connected to Slack!"
  }'
```

### Test with Bot Token
```bash
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "YOUR_CHANNEL_ID",
    "text": "🎉 VoiceFlow CRM is connected to Slack!"
  }'
```

---

## Usage in Your CRM

### Send Notification via Workflow

Your users can create workflows that send Slack alerts:

**Example Workflow**:
```javascript
{
  "trigger": {
    "type": "lead_qualified"
  },
  "actions": [
    {
      "type": "send_slack",
      "config": {
        "channel": "#sales-alerts",
        "message": "🔥 Hot Lead Alert!\n\nName: {{lead_name}}\nEmail: {{lead_email}}\nScore: {{qualification_score}}/100\n\nView in CRM: {{crm_link}}"
      }
    }
  ]
}
```

### Automatic Notifications

Set up automatic Slack alerts for:
- 🔥 **Hot leads** (qualification score > 80)
- 😞 **Negative call sentiment** detected
- 💰 **Payment received**
- ❌ **Workflow failures**
- 📞 **No-show calls** (customer didn't answer)
- ⭐ **Positive feedback** from customers

---

## Slack Notification Examples

### 1. New Qualified Lead
```
🎯 New Qualified Lead!

Name: John Smith
Email: john@example.com
Phone: (555) 123-4567
Source: Website Form
Score: 85/100

Last Call Summary:
- Interested in premium package
- Budget: $500/month
- Timeline: Next 2 weeks

[View in CRM] [Assign to Rep]
```

### 2. Negative Sentiment Alert
```
⚠️ Negative Call Detected

Customer: Jane Doe
Sentiment: Negative 😞
Call Duration: 3m 42s

Key Issues Mentioned:
- Frustrated with pricing
- Wants to cancel service

Agent: Mike (Sales)
Priority: HIGH

[Listen to Recording] [Create Task]
```

### 3. Payment Received
```
💰 Payment Received!

Customer: Acme Corp
Amount: $299.00
Plan: Professional (Monthly)

Next billing date: Feb 15, 2025

Total MRR: $12,450 (+$299)

[View Invoice]
```

---

## Best Practices

### 1. Don't Spam Your Team
- Only send important notifications
- Use different channels for different alert types:
  - `#sales-hot-leads` - High-priority leads only
  - `#crm-payments` - Payment events
  - `#crm-alerts` - System alerts
  - `#customer-feedback` - Negative sentiment

### 2. Format Messages Well
- Use emojis for quick visual scanning (🔥 hot, ⚠️ warning, ✅ success)
- Include action buttons when possible
- Keep it concise but informative

### 3. Rate Limiting
- Don't send more than 1 message per second
- Bundle similar alerts (e.g., "3 new leads" instead of 3 separate messages)

### 4. Privacy
- Don't send sensitive customer data (credit cards, SSNs)
- Be careful with PII in shared channels
- Consider using private channels for sensitive alerts

---

## Advanced: Rich Message Formatting

Slack supports Block Kit for beautiful, interactive messages:

```javascript
{
  "channel": "#sales-alerts",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🔥 Hot Lead Alert"
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Name:*\nJohn Smith" },
        { "type": "mrkdwn", "text": "*Score:*\n85/100" },
        { "type": "mrkdwn", "text": "*Email:*\njohn@example.com" },
        { "type": "mrkdwn", "text": "*Source:*\nWebsite" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View in CRM" },
          "url": "https://your-crm.com/leads/123",
          "style": "primary"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Assign to Me" },
          "action_id": "assign_lead"
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### "channel_not_found" Error
- Make sure bot is invited to the channel
- In Slack, type: `/invite @VoiceFlow Notifications` in the channel

### "invalid_auth" Error
- Check your token starts with `xoxb-`
- Regenerate token if needed (in OAuth & Permissions page)

### Messages Not Appearing
- Verify webhook URL is correct
- Check Slack app is installed to workspace
- Look in #general if channel-specific posting fails

---

## Implementation in Code

We'll add this to your workflow engine:

```javascript
// backend/services/slackService.js
export async function sendSlackNotification(message, channel) {
  if (process.env.SLACK_WEBHOOK_URL) {
    // Simple webhook method
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } else if (process.env.SLACK_BOT_TOKEN) {
    // Bot token method (more flexible)
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel || process.env.SLACK_CHANNEL_ID,
        text: message
      })
    });
  }
}
```

---

## Summary

✅ **Quick Start (Webhook)**: Get webhook URL, add to `.env`, done!
🚀 **Advanced (Bot Token)**: More features, can post to any channel
📊 **Use Cases**: Lead alerts, payment notifications, workflow monitoring
🎨 **Formatting**: Use Block Kit for rich, interactive messages

**Next**: Add `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` to your `.env` file!
