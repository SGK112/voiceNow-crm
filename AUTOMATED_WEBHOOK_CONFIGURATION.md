# Automated Webhook Configuration

## Overview

Your VoiceNow CRM now **automatically configures secure webhooks** for every ElevenLabs agent you create. You no longer need to manually configure webhooks in the ElevenLabs dashboard - it's all done programmatically!

## How It Works

### 1. Automatic Configuration During Agent Creation

When you create a new agent through your VoiceNow CRM (via the UI or API), the system automatically:

1. ✅ Generates secure webhook URLs
2. ✅ Adds the `Authorization: Bearer {token}` header
3. ✅ Configures both **Post-Call** and **Tool Invocation** webhooks
4. ✅ Sends the configuration to ElevenLabs API

**You don't need to do anything in the ElevenLabs dashboard!**

### 2. What Gets Configured

Every agent automatically gets:

#### **Post-Call Webhook**
- **URL**: `https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/post-call`
- **Authentication**: `Authorization: Bearer 1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984`
- **Triggers**: After every call ends
- **Actions**:
  - Sends SMS with signup link
  - Sends calendar invite
  - Sends lead notification email
  - Logs call data

#### **Tool Invocation Webhook** (for agents with tools)
- **URL**: `https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/tool-invocation`
- **Authentication**: `Authorization: Bearer 1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984`
- **Triggers**: When agent invokes a tool during a call
- **Tools Available**:
  - `send_sms` - Send SMS during call
  - `send_email` - Send email during call
  - `end_call` - End the call gracefully

## Environment Variables

Your system uses these environment variables (already configured in Render):

```bash
# Webhook Base URL (your production domain)
WEBHOOK_BASE_URL=https://voiceflow-crm-1.onrender.com

# Webhook Security Token (for authentication)
WEBHOOK_SECRET_TOKEN=1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984
```

## Security Features

All webhooks are automatically protected with:

1. ✅ **Bearer Token Authentication** - Only requests with the correct token are accepted
2. ✅ **Rate Limiting** - 200 requests per minute per IP
3. ✅ **Timestamp Validation** - Rejects requests older than 5 minutes (prevents replay attacks)
4. ✅ **HTTPS Only** - All communication is encrypted

## Code Implementation

### File: `/backend/services/elevenLabsService.js`

The `createAgent()` function automatically configures webhooks:

```javascript
async createAgent(config) {
  try {
    // Get webhook URLs with authentication token
    const webhookToken = process.env.WEBHOOK_SECRET_TOKEN;
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://voiceflow-crm-1.onrender.com';

    const agentConfig = {
      name: config.name,
      conversation_config: {
        tts: { voice_id: config.voiceId, model_id: 'eleven_flash_v2' },
        agent: {
          prompt: { prompt: config.script },
          first_message: config.firstMessage || 'Hello, how can I help you today?',
          language: config.language || 'en'
        }
      }
    };

    // Automatically configure secure webhooks
    if (webhookToken) {
      agentConfig.webhook = {
        url: `${baseUrl}/api/elevenlabs-webhook/post-call`,
        headers: { Authorization: `Bearer ${webhookToken}` }
      };

      // Configure client tools webhook (for SMS, email, etc.)
      if (config.tools && config.tools.length > 0) {
        agentConfig.conversation_config.agent.client_tools = config.tools;
        agentConfig.conversation_config.agent.client_tools_webhook_url =
          `${baseUrl}/api/elevenlabs-webhook/tool-invocation`;
        agentConfig.conversation_config.agent.client_tools_webhook_headers = {
          Authorization: `Bearer ${webhookToken}`
        };
      }
    }

    const response = await this.client.post('/convai/agents/create', agentConfig);
    return response.data;
  } catch (error) {
    console.error('ElevenLabs API Error:', error.response?.data || error.message);
    throw new Error('Failed to create agent in ElevenLabs');
  }
}
```

### File: `/backend/middleware/webhookAuth.js`

Webhook security middleware validates all incoming webhook requests:

```javascript
export const verifyWebhookToken = (req, res, next) => {
  const webhookToken = process.env.WEBHOOK_SECRET_TOKEN;

  if (!webhookToken) {
    console.warn('⚠️  WEBHOOK_SECRET_TOKEN not configured - webhook is UNPROTECTED!');
    return next();
  }

  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  let providedToken = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.substring(7);
  } else if (queryToken) {
    providedToken = queryToken;
  }

  if (!providedToken) {
    console.error('❌ Webhook rejected: No token provided');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing webhook token'
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(webhookToken);
  const providedBuffer = Buffer.from(providedToken);

  if (expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    console.error('❌ Webhook rejected: Invalid token');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid webhook token'
    });
  }

  console.log('✅ Webhook token verified');
  next();
};
```

## Testing

### 1. Create a New Agent

Create a new agent through the VoiceNow CRM UI. Check the backend logs:

```
🔐 Configuring secure webhooks for agent...
✅ Secure webhooks configured: {
  postCallWebhook: 'https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/post-call',
  toolWebhook: 'https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/tool-invocation'
}
```

### 2. Make a Test Call

When the call completes, you should see:

```
✅ Webhook token verified
✅ Webhook timestamp verified
📞 Post-Call Webhook Received:
   Call ID: [call_id]
   Conversation ID: [conversation_id]
   Agent ID: [agent_id]
```

### 3. Test with cURL

Test the webhook endpoints manually:

```bash
# Test Post-Call Webhook
curl -X POST https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/post-call \
  -H "Authorization: Bearer 1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "test_123",
    "agent_id": "test_agent",
    "conversation_id": "test_conv"
  }'

# Test Tool Invocation Webhook
curl -X POST https://voiceflow-crm-1.onrender.com/api/elevenlabs-webhook/tool-invocation \
  -H "Authorization: Bearer 1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "send_sms",
    "tool_parameters": {
      "to": "+1234567890",
      "message": "Test message"
    },
    "call_id": "test_123",
    "agent_id": "test_agent"
  }'
```

## Monitoring

### Successful Webhook Logs

```
✅ Webhook token verified
✅ Webhook timestamp verified
📞 Tool Invocation Received:
   Tool: send_sms
   Parameters: { "to": "+1234567890", "message": "Hello!" }
   Call ID: abc123
   Agent ID: agent_xyz
   Result: { "success": true, "message": "SMS sent successfully" }
```

### Failed Webhook Logs

```
❌ Webhook rejected: No token provided
❌ Webhook rejected: Invalid token
❌ Webhook rejected: Timestamp too old (350s)
❌ Webhook rate limit exceeded for 1.2.3.4: 201 requests
```

## Updating Existing Agents

If you update an agent's script or configuration, the system automatically re-applies the secure webhooks. ElevenLabs sometimes clears webhook configurations during updates, so this ensures they stay protected.

The `updateAgent()` function in `elevenLabsService.js` handles this automatically.

## No Manual Configuration Needed!

**Key Point**: You never need to go into the ElevenLabs dashboard to configure webhooks. Everything is handled programmatically through the API.

### What This Means:

1. ✅ **Create agents** via VoiceNow CRM UI → Webhooks auto-configured
2. ✅ **Update agents** via VoiceNow CRM UI → Webhooks maintained
3. ✅ **All agents** get the same secure webhook configuration
4. ✅ **No manual work** in ElevenLabs dashboard required

## Troubleshooting

### Problem: Webhooks not working after agent creation

**Solution**: Check backend logs for:
```
⚠️  WEBHOOK_SECRET_TOKEN not set - webhooks will be unprotected!
```

If you see this, your environment variable is missing. Re-deploy with the correct environment variable.

### Problem: 401 Unauthorized on webhooks

**Solution**: Verify that:
1. `WEBHOOK_SECRET_TOKEN` matches in Render environment
2. Token is exactly: `1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984`
3. No extra spaces or newlines in the token

### Problem: Webhooks work locally but not in production

**Solution**: Ensure Render has both environment variables:
```
WEBHOOK_BASE_URL=https://voiceflow-crm-1.onrender.com
WEBHOOK_SECRET_TOKEN=1953381d572e2906b7c84b2a566e8abf37d0425a24c6b9215480f3c367086984
```

## Security Best Practices

1. ✅ **Never commit** the webhook secret token to git
2. ✅ **Rotate the token** every 90 days
3. ✅ **Monitor logs** for failed authentication attempts
4. ✅ **Use HTTPS only** - never HTTP for webhooks
5. ✅ **Keep environment variables** in Render dashboard, not in code

## Summary

Your VoiceNow CRM now provides **zero-configuration webhook security** for all ElevenLabs agents:

- 🚀 **Automatic**: Webhooks configured during agent creation
- 🔐 **Secure**: Bearer token authentication on all webhooks
- 🛡️ **Protected**: Rate limiting + timestamp validation
- 📊 **Monitored**: Full logging of all webhook activity
- 🔄 **Maintained**: Webhooks re-applied during agent updates

**You don't need to touch the ElevenLabs dashboard for webhook configuration - it's all automated!**
