# Hybrid n8n Integration Architecture

## 🎯 Goal
Build workflows in VoiceNow CRM's beautiful UI, but leverage n8n for OAuth connections and execution.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VOICEFLOW CRM                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Workflow Builder (React Flow)                       │  │
│  │  - Drag & drop interface                             │  │
│  │  - Node configuration                                │  │
│  │  - Visual connections                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Workflow Sync Service                               │  │
│  │  - Convert React Flow → n8n JSON                     │  │
│  │  - Detect missing credentials                        │  │
│  │  - Trigger OAuth flows                               │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┬──────────────┘
                   │                           │
                   │ Push workflow             │ OAuth redirect
                   ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  n8n (Hostinger)                            │
│  http://5.183.8.119:5678                                    │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ User Workspace │  │  Credentials   │  │  Executions  │ │
│  │  - Workflows   │  │  - Google      │  │  - History   │ │
│  │  - Triggers    │  │  - Facebook    │  │  - Logs      │ │
│  │  - Settings    │  │  - QuickBooks  │  │  - Webhook   │ │
│  └────────────────┘  └────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ Webhook callbacks
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
│  Google Sheets, Facebook, QuickBooks, Stripe, etc.         │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Implementation Plan

### Phase 1: n8n Workspace Per User

**Goal:** Each CRM user gets their own n8n workspace

```javascript
// backend/services/n8nWorkspaceService.js
class N8nWorkspaceService {
  async provisionUserWorkspace(user) {
    // Create user-specific workspace in n8n
    const workspace = await n8nAPI.post('/workspaces', {
      name: `${user.email}-workspace`,
      owner: user.email
    });

    // Store workspace ID in user record
    await User.findByIdAndUpdate(user._id, {
      n8nWorkspaceId: workspace.id,
      n8nWorkspaceUrl: `http://5.183.8.119:5678/workspace/${workspace.id}`
    });

    return workspace;
  }
}
```

**Problem:** n8n self-hosted doesn't have multi-tenant workspaces by default.

**Solution:** Use n8n's user system + API key per user:
- Each CRM user gets an n8n user account
- Store their n8n API key in your database (encrypted)
- All requests use their specific API key

### Phase 2: Credential OAuth Flow

**When user adds a node that needs OAuth (e.g., Google Sheets):**

```javascript
// frontend/src/components/WorkflowStudio.jsx
const handleNodeAdd = (nodeType) => {
  // Check if node requires credentials
  const credentialType = getRequiredCredential(nodeType);

  if (credentialType) {
    // Check if user has this credential in n8n
    const hasCredential = await api.get(`/n8n/credentials/${credentialType}`);

    if (!hasCredential) {
      // Redirect to n8n OAuth flow
      const oauthUrl = `http://5.183.8.119:5678/credentials/new?type=${credentialType}&callback=${encodeURIComponent(window.location.href)}`;
      window.open(oauthUrl, 'n8n-oauth', 'width=600,height=700');

      // Listen for callback
      window.addEventListener('message', (event) => {
        if (event.data.type === 'credential-connected') {
          // Credential is ready, add node
          addNode(nodeType);
        }
      });
    }
  }
};
```

### Phase 3: Workflow Sync

**Convert your React Flow workflow to n8n format:**

```javascript
// backend/services/workflowConverter.js
class WorkflowConverter {
  convertToN8n(reactFlowWorkflow) {
    return {
      name: reactFlowWorkflow.name,
      nodes: reactFlowWorkflow.nodes.map(node => ({
        id: node.id,
        name: node.data.label,
        type: this.mapNodeType(node.data.type),
        typeVersion: 1,
        position: [node.position.x, node.position.y],
        parameters: this.mapParameters(node.data)
      })),
      connections: this.mapConnections(reactFlowWorkflow.edges),
      settings: {
        saveDataSuccessExecution: 'all',
        saveDataErrorExecution: 'all'
      }
    };
  }

  mapNodeType(customType) {
    const mapping = {
      'save_lead': 'n8n-nodes-base.httpRequest',
      'send_sms': 'n8n-nodes-base.twilio',
      'send_email': 'n8n-nodes-base.emailSend',
      'google_sheets': 'n8n-nodes-base.googleSheets',
      'facebook_post': 'n8n-nodes-base.facebook'
    };
    return mapping[customType] || 'n8n-nodes-base.httpRequest';
  }
}
```

### Phase 4: Execution Flow

```javascript
// When user clicks "Activate Workflow"
const activateWorkflow = async (workflowId) => {
  // 1. Convert to n8n format
  const n8nWorkflow = convertToN8n(localWorkflow);

  // 2. Push to n8n
  const created = await n8nAPI.post('/workflows', n8nWorkflow);

  // 3. Activate in n8n
  await n8nAPI.patch(`/workflows/${created.id}/activate`);

  // 4. Save n8n ID to local database
  await Workflow.updateOne(
    { _id: workflowId },
    { n8nWorkflowId: created.id, n8nActive: true }
  );

  return created;
};
```

## 🔑 Getting n8n API Key

### Option 1: Manual (For Now)
1. Open `http://5.183.8.119:5678`
2. Login: admin / Remodely2025!
3. Settings → API → Create API Key
4. Add to `.env`: `N8N_API_KEY=n8n_api_xxxxx`

### Option 2: Programmatic (Future)
```bash
# Create API key via n8n CLI
curl -X POST http://5.183.8.119:5678/api/v1/users/api-keys \
  -u "admin:Remodely2025!" \
  -H "Content-Type: application/json" \
  -d '{"name": "VoiceNow CRM"}'
```

## 📊 How Many Workflows Can You Host Locally?

**MongoDB Limits:**
- **Practical limit**: 10,000+ workflows per user
- **Document size**: Each workflow ~5-50KB
- **Index performance**: Stays fast up to millions of documents

**n8n Limits:**
- **Self-hosted**: Unlimited (only limited by server resources)
- **Recommended**: 100-500 active workflows per n8n instance
- **Database**: PostgreSQL can handle millions of workflow executions

**Answer:** You can host **unlimited workflows locally**, but sync **active/published ones** to n8n for execution.

## 🎯 Workflow Strategy

### Local Workflows (Draft Mode)
- User builds in your CRM
- Stored in MongoDB
- No execution yet
- Can have 10,000+ drafts

### Synced Workflows (Active Mode)
- Pushed to n8n when user clicks "Activate"
- Executed by n8n
- Credentials managed by n8n
- OAuth handled by n8n

### Hybrid Benefits
✅ Beautiful UI in your CRM
✅ Unlimited draft workflows
✅ n8n handles OAuth for 1000+ apps
✅ Users manage their own credentials
✅ Scalable execution via n8n
✅ You don't configure any OAuth apps

## 🔐 Multi-User n8n Setup

Since self-hosted n8n doesn't have native multi-tenancy:

### Solution A: Single n8n, Multiple Users
```javascript
// Each CRM user gets an n8n user account
POST http://5.183.8.119:5678/rest/users
{
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"  // Limited permissions
}

// Create API key for that user
// Store in your database (encrypted)
```

### Solution B: n8n Instance Per Paid Tier
- Starter users: Share single n8n instance
- Pro users: Dedicated n8n container
- Enterprise: Fully isolated n8n + database

### Solution C: n8n Cloud (Easiest)
- Sign up for n8n Cloud team plan
- Use their API to create workspaces
- Each user gets isolated workspace
- n8n handles all infrastructure

## 💰 Cost Analysis

### Self-Hosted (Current)
- Server: $10-50/month (Hostinger VPS)
- Storage: Included
- Workflows: Unlimited
- Users: Unlimited
- **Total: $10-50/month for ALL users**

### n8n Cloud
- $20/user/month minimum
- 100 users = $2,000/month
- **NOT recommended at your scale**

### Hybrid Approach (Recommended)
- Self-hosted n8n: $50/month (better VPS)
- Your CRM: Existing costs
- **Total: $50/month for unlimited users**

## 🚀 Next Steps

1. **Get n8n API key** (manual for now)
2. **Test workflow push** to n8n
3. **Build credential detection** system
4. **Create OAuth redirect** flow
5. **Test with Google Sheets** integration

Want me to build the credential OAuth flow next?
