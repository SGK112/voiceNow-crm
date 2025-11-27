# Agent Templates

This directory contains saved agent configurations that can be restored for testing and development.

## Available Templates

### `demo-agent-template.json` ✅ WORKING
**VoiceNow CRM Demo Agent - Real-Time SMS**

**Purpose:** Sales demo agent that demonstrates real-time SMS capability during phone calls.

**How it works:**
1. Agent calls customer from demo form
2. Agent asks: "What's the best number to text you at?"
3. Customer provides phone number
4. Agent triggers `send_signup_link` tool
5. Webhook fires → SMS sent immediately
6. Agent confirms: "Done! Check your phone!"

**Wow Factor:** Demonstrates AI can actually DO things in real-time, not just talk about them.

**Status:** Working and tested ✅

**Last Tested:** 2025-11-15

---

## How to Use Templates

### Backup Current Agent
Save your current agent configuration as a template:

```bash
# Backup with custom name and description
node scripts/backup-agent-to-template.js <agent_id> <template_name> "<description>"

# Example
node scripts/backup-agent-to-template.js agent_9701k9xptd0kfr383djx5zk7300x "my-working-agent" "Working SMS agent config"
```

### Restore from Template
Apply a template to an agent:

```bash
# Restore to default agent
node scripts/restore-from-template.js

# Restore to specific agent
node scripts/restore-from-template.js agent_abc123xyz

# Restore specific template to specific agent
node scripts/restore-from-template.js agent_abc123xyz demo-agent-template
```

### List Available Templates
```bash
ls scripts/templates/*.json
```

---

## Template Structure

```json
{
  "name": "Template Name",
  "description": "What this agent does",
  "agent_id": "original_agent_id",
  "configuration": {
    "conversation_config": {
      // Full ElevenLabs agent configuration
    }
  },
  "backend_configuration": {
    "webhook_url": "your_webhook_url",
    "auto_sms_on_call_start": false,
    "sms_via_webhook_only": true,
    "notes": "Backend setup notes"
  },
  "testing_instructions": {
    "how_to_test": [
      "Step by step testing instructions"
    ],
    "expected_behavior": "What should happen",
    "wow_factor": "What makes this impressive"
  },
  "created": "2025-11-15",
  "last_tested": "2025-11-15",
  "status": "WORKING ✅"
}
```

---

## Best Practices

### When to Create a Template
- ✅ Agent is working perfectly and tested
- ✅ Before making major changes to an agent
- ✅ When you want to clone agent behavior
- ✅ Before experimenting with new features

### Naming Conventions
- Use descriptive names: `demo-agent-template`, `production-sales-agent`, etc.
- Include status: `working`, `experimental`, `deprecated`
- Date for backups: `agent-backup-2025-11-15`

### Template Maintenance
- Test templates before relying on them
- Update `last_tested` date when verified
- Document any backend changes needed
- Update status if template breaks

---

## Quick Reference

```bash
# Backup current demo agent
node scripts/backup-agent-to-template.js agent_9701k9xptd0kfr383djx5zk7300x demo-agent-backup

# Restore demo agent template
node scripts/restore-from-template.js

# Check agent config
node scripts/check-agent-config.js
```

---

## Troubleshooting

### Template won't restore
- Check ElevenLabs API key in `.env`
- Verify agent ID exists
- Check template JSON is valid

### Agent behavior different after restore
- Check backend webhook configuration
- Verify `.env` variables match template expectations
- Test with fresh phone call

### Need to rollback
- Keep multiple template versions
- Name with dates: `agent-working-2025-11-15`
- Always test after restore
