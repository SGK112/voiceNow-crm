# MCP Tools Integration Guide

This guide explains how to use Model Context Protocol (MCP) tools with VoiceFlow CRM for seamless integration with external services.

## What are MCP Tools?

MCP (Model Context Protocol) tools are server-side integrations that allow Claude to directly interact with external APIs and services. Instead of writing custom scripts, you can use pre-built MCP servers that provide tool interfaces.

## Available MCP Integrations

### Current Setup (via Direct API)

We've created setup scripts that use direct API calls:
- ✅ **n8n** - Workflow automation (working)
- ⚠️ **ElevenLabs** - AI voice agents (needs correct endpoint)
- ✅ **Stripe** - Payment processing (script ready)

### MCP Tools You Can Add

To use MCP tools, you would need to:
1. Install MCP servers for each service
2. Configure them in your Claude Desktop config
3. Grant Claude access to use these tools

## Setting Up MCP Servers

### 1. n8n MCP Server

If you had an n8n MCP server configured, Claude could:
- Create workflows directly
- Update workflow nodes
- Trigger workflows
- Monitor executions

**How to add:**
```json
// In Claude Desktop config (~/.config/claude/config.json)
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-n8n"],
      "env": {
        "N8N_API_URL": "https://remodely.app.n8n.cloud/api/v1",
        "N8N_API_KEY": "your_api_key"
      }
    }
  }
}
```

### 2. Stripe MCP Server

For Stripe integration:
```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp-server"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_your_key"
      }
    }
  }
}
```

### 3. ElevenLabs (Custom MCP Server)

Currently, there's no official ElevenLabs MCP server, but you could create one:

```javascript
// elevenlabs-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import axios from 'axios';

const server = new Server({
  name: 'elevenlabs',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {}
  }
});

// Define tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'create_conversational_agent',
        description: 'Create a new ElevenLabs conversational AI agent',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            prompt: { type: 'string' },
            voice_id: { type: 'string' }
          }
        }
      }
    ]
  };
});

// Implement tools
server.setRequestHandler('tools/call', async (request) => {
  // Handle ElevenLabs API calls
});
```

## Using Scripts vs MCP Tools

### Current Approach (Scripts)

**Pros:**
- ✅ Works immediately without additional setup
- ✅ Full control over API calls
- ✅ Easy to debug and customize
- ✅ No dependency on MCP server availability

**Cons:**
- ❌ Requires running scripts manually
- ❌ Less interactive (no real-time feedback)
- ❌ Can't be used conversationally with Claude

### MCP Tools Approach

**Pros:**
- ✅ Conversational - ask Claude to create things
- ✅ Real-time feedback and iteration
- ✅ Claude can fix errors automatically
- ✅ More natural workflow

**Cons:**
- ❌ Requires MCP server setup
- ❌ Limited to what MCP servers support
- ❌ May have rate limits or restrictions

## Hybrid Approach (Recommended)

Use both approaches:

1. **Setup Phase** - Use scripts to bulk create resources:
   ```bash
   # One-time setup
   node scripts/setup-n8n-workflows.js
   node scripts/setup-stripe-products.js
   ```

2. **Development Phase** - Use MCP tools for interactive work:
   ```
   User: "Create a new n8n workflow for sending WhatsApp messages"
   Claude: [Uses n8n MCP tool to create workflow interactively]
   ```

3. **Production** - Use your backend APIs programmatically

## Setting Up MCP Tools for This Project

### Step 1: Install MCP Servers

```bash
# Install n8n MCP server globally
npm install -g @modelcontextprotocol/server-n8n

# Install Stripe MCP server
npm install -g @stripe/mcp-server
```

### Step 2: Configure Claude Desktop

Edit `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "mcp-server-n8n",
      "env": {
        "N8N_API_URL": "https://remodely.app.n8n.cloud/api/v1",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    },
    "stripe": {
      "command": "mcp-server-stripe",
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_your_key_here"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP servers.

### Step 4: Verify Tools Are Available

In Claude, you can ask:
```
"What n8n tools do you have access to?"
"What Stripe tools are available?"
```

## Using MCP Tools

Once configured, you can ask Claude to:

### n8n Operations
```
"Create a new n8n workflow that sends a Slack message when a webhook is received"
"Show me all my n8n workflows"
"Activate the workflow with ID abc123"
"Test the save-lead webhook with sample data"
```

### Stripe Operations
```
"Create a new Stripe product called 'Premium Plan' for $49/month"
"List all my Stripe customers"
"Create a checkout session for the Professional plan"
"Show me recent failed payments"
```

## Current Implementation Status

### ✅ Working (Direct API)
- **n8n Workflows** - 5 master workflows created
- **Backend Integration** - Webhook handlers ready
- **Multi-tenant Architecture** - Fully implemented

### 🔄 Ready to Use (Scripts Available)
- **Stripe Products** - Run `node scripts/setup-stripe-products.js`
- **ElevenLabs Agents** - Script needs API endpoint update

### ❌ Not Yet Configured
- **MCP Servers** - Requires manual setup in Claude Desktop
- **ElevenLabs MCP** - No official server exists yet

## Recommendations

### For Quick Setup
Use the provided scripts:
```bash
# Complete setup in one command
./scripts/setup-all.sh
```

### For Interactive Development
If you plan to frequently modify:
1. Set up MCP servers as described above
2. Use conversational commands with Claude
3. Iterate quickly without writing code

### For Production
Your application already has:
- ✅ Backend APIs for all operations
- ✅ Webhook handlers for external events
- ✅ Multi-tenant data isolation
- ✅ Error handling and logging

## Troubleshooting MCP Tools

### "MCP tools not available"
- Check Claude Desktop config file syntax
- Verify MCP server packages are installed
- Restart Claude Desktop completely

### "Authentication failed"
- Verify API keys in MCP config
- Check that keys have proper permissions
- Test API keys with curl/Postman first

### "Tool execution failed"
- Check MCP server logs (if available)
- Verify API endpoints are correct
- Test with direct API calls to isolate issue

## Summary

**Current Status:**
- ✅ Direct API scripts work perfectly
- ✅ n8n workflows successfully created
- ✅ Backend ready for all integrations

**To Use MCP Tools:**
1. Install MCP servers
2. Configure Claude Desktop
3. Restart and verify access

**Recommendation:**
- Use scripts for initial setup (faster, more reliable)
- Add MCP tools later if you need interactive access
- Your backend doesn't need MCP - it uses direct APIs
