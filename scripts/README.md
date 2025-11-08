# Setup Scripts

This directory contains automated setup scripts for creating ElevenLabs agents and n8n workflows.

## Quick Start

Run the complete setup with one command:

```bash
cd /Users/homepc/voiceflow-crm
./scripts/setup-all.sh
```

This will:
1. Create 5 ElevenLabs conversational AI agents
2. Create 5 master n8n workflows
3. Guide you through configuration

## Individual Scripts

### 1. Create ElevenLabs Agents

```bash
node scripts/setup-elevenlabs-agents.js
```

Creates 5 AI agents:
- **Lead Generation Agent** - Qualifies leads and captures contact info
- **Appointment Booking Agent** - Books appointments and manages calendar
- **Collections Agent** - Professional debt collection
- **Promotional Campaign Agent** - Promotes offers and campaigns
- **Customer Support Agent** - Provides support and troubleshooting

**Output:**
- Agent IDs to add to your `.env` file
- Instructions for configuring phone numbers

### 2. Create N8N Workflows

```bash
node scripts/setup-n8n-workflows.js
```

Creates 5 master workflows:
- **Save Lead to CRM** - Webhook: `/webhook/save-lead`
- **Send SMS After Call** - Webhook: `/webhook/send-sms`
- **Book Appointment** - Webhook: `/webhook/book-appointment`
- **Slack Notification** - Webhook: `/webhook/slack-notify`
- **Send Follow-up Email** - Webhook: `/webhook/send-email`

**Output:**
- Workflow IDs
- Webhook URLs for each workflow
- Instructions for adding credentials

## Prerequisites

### Environment Variables

Your `.env` file must contain:

```bash
# ElevenLabs
ELEVENLABS_API_KEY=sk_your_api_key

# N8N
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook
N8N_API_KEY=your_n8n_api_key
```

### API Access

- **ElevenLabs**: API key from https://elevenlabs.io/app/settings
- **N8N**: API key from https://your-instance.app.n8n.cloud/settings/api

## After Running Scripts

### 1. Update Environment Variables

After creating ElevenLabs agents, update `.env`:

```bash
ELEVENLABS_LEAD_GEN_AGENT_ID=agent_abc123
ELEVENLABS_BOOKING_AGENT_ID=agent_def456
ELEVENLABS_COLLECTIONS_AGENT_ID=agent_ghi789
ELEVENLABS_PROMO_AGENT_ID=agent_jkl012
ELEVENLABS_SUPPORT_AGENT_ID=agent_mno345
```

### 2. Configure ElevenLabs Webhooks

In ElevenLabs dashboard:
1. Go to each agent's settings
2. Add webhook URL: `https://your-domain.com/api/webhooks/elevenlabs/call-completed`
3. Assign phone numbers to each agent

### 3. Configure N8N Credentials

In n8n cloud dashboard:
1. Go to **Credentials** section
2. Add credentials for:
   - **Twilio** (for SMS workflows)
   - **Google Calendar** (for appointment workflow)
   - **Slack** (for notification workflow)
   - **SendGrid** (for email workflow)
3. Update workflow nodes to use these credentials

### 4. Activate Workflows

1. Go to n8n dashboard
2. Open each workflow
3. Click **Activate** toggle (top right)
4. Verify webhook URLs are accessible

## Testing

### Test ElevenLabs Agent
```bash
# Call one of your agent phone numbers
# Should see webhook received in backend logs
```

### Test N8N Workflow
```bash
# Send test webhook
curl -X POST https://remodely.app.n8n.cloud/webhook/save-lead \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "callData": {
      "caller_name": "John Doe",
      "caller_phone": "+1234567890",
      "email": "john@example.com",
      "agent_type": "lead_gen",
      "duration": 120,
      "qualified": true,
      "transcript": "Test call transcript"
    },
    "config": {}
  }'
```

## Troubleshooting

### ElevenLabs Agent Creation Fails

**Error:** `401 Unauthorized`
- Check your `ELEVENLABS_API_KEY` in `.env`
- Verify key is valid at https://elevenlabs.io/app/settings

**Error:** `429 Rate Limit`
- Wait a few minutes and try again
- Scripts include delays to avoid rate limits

### N8N Workflow Creation Fails

**Error:** `401 Unauthorized`
- Check your `N8N_API_KEY` in `.env`
- Verify key at https://remodely.app.n8n.cloud/settings/api

**Error:** `400 Bad Request`
- Check that `N8N_WEBHOOK_URL` is correct
- Should be: `https://your-instance.app.n8n.cloud/webhook`

**Error:** Workflow created but webhook doesn't respond
- Make sure workflow is **activated** in n8n UI
- Check that webhook path matches (e.g., `/webhook/save-lead`)

## Support

For issues or questions:
1. Check [N8N_SETUP_GUIDE.md](../N8N_SETUP_GUIDE.md) for detailed instructions
2. Review backend logs: `npm run dev` (in project root)
3. Check n8n execution logs in dashboard

## Architecture

These scripts implement a **multi-tenant architecture**:
- ONE master workflow per type in n8n
- Unlimited users can use same workflows
- User-specific data passed via webhook payload
- Credentials managed per-user in n8n or external store

See [N8N_SETUP_GUIDE.md](../N8N_SETUP_GUIDE.md) for architecture details.
