# VoiceFlow CRM - Documentation Index

## Welcome to VoiceFlow CRM Documentation

This is your comprehensive guide to understanding and building upon the VoiceFlow CRM voice agent and workflow system.

## Quick Navigation

### For First-Time Users (5-10 minutes)
Start here for a quick understanding of the system:
1. Read: **[AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)** (12 KB)
   - System architecture
   - Quick API reference
   - Common tasks
   - Troubleshooting

### For Developers (30 minutes)
Pick your use case and follow the guide:
1. Read: **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** (13 KB)
   - 7 detailed use cases
   - File structure with paths
   - Step-by-step instructions
   - Testing checklists

### For Deep Understanding (1-2 hours)
Complete technical reference:
1. Read: **[VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)** (29 KB)
   - Complete schema documentation
   - Architecture deep dives
   - All integration points
   - Security & performance
   - Extending guidelines

## Feature Documentation

### Voice Agents
- **Setup**: See UC1 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Variables**: See [DYNAMIC_VARIABLES.md](DYNAMIC_VARIABLES.md)
- **Advanced**: See Section 1 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

### AI Agents
- **Setup**: See UC5 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Models**: See [AI_AGENTS.md](AI_AGENTS.md)
- **Advanced**: See Section 2 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

### Workflows
- **Getting Started**: See UC4 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Triggers & Actions**: See [WORKFLOW_SYSTEM_PLAN.md](WORKFLOW_SYSTEM_PLAN.md)
- **Advanced**: See Section 4 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

### Dynamic Variables
- **Complete Guide**: [DYNAMIC_VARIABLES.md](DYNAMIC_VARIABLES.md)
- **Implementation**: See UC2 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Technical**: See Section 3 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

## Documentation Files Summary

| File | Size | Purpose | Read Time |
|------|------|---------|-----------|
| [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md) | 12 KB | Quick start & API reference | 5-10 min |
| [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) | 13 KB | Use case guides with steps | 15-20 min |
| [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md) | 29 KB | Complete technical reference | 45-60 min |
| [DYNAMIC_VARIABLES.md](DYNAMIC_VARIABLES.md) | 10 KB | Dynamic variable usage | 5-10 min |
| [WORKFLOW_SYSTEM_PLAN.md](WORKFLOW_SYSTEM_PLAN.md) | 14 KB | Workflow details | 10-15 min |
| [AI_AGENTS.md](AI_AGENTS.md) | 21 KB | AI agent features | 10-15 min |
| [CUSTOM_AGENTS.md](CUSTOM_AGENTS.md) | 10 KB | Custom agent creation | 5-10 min |

## By Role

### Product Manager
1. Read: [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md) - Overview & capabilities
2. Read: Section 11 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md) - Key features
3. Reference: Subscription plans in [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)

### Backend Developer
1. Read: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Pick your use case
2. Read: Relevant sections in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)
3. Reference: Specific model/controller/service files listed in documentation

### Frontend Developer
1. Read: Section 7 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)
2. Reference: API endpoints in [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)
3. Check: File paths in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

### DevOps/Infrastructure
1. Read: Architecture section in [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)
2. Read: Integration points in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)
3. Check: Environment setup in existing docs

### QA/Tester
1. Read: Testing checklists in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
2. Read: [DYNAMIC_VARIABLES.md](DYNAMIC_VARIABLES.md) - Test scenarios
3. Reference: Security checklist in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

## Common Questions Answered

**Q: How do voice agents work?**
A: See UC1 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) and Section 1 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

**Q: How do dynamic variables work?**
A: See UC2 & UC3 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) and [DYNAMIC_VARIABLES.md](DYNAMIC_VARIABLES.md)

**Q: How are workflows triggered?**
A: See UC4 in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) and [WORKFLOW_SYSTEM_PLAN.md](WORKFLOW_SYSTEM_PLAN.md)

**Q: How do I add a new feature?**
A: See "Extending the System" in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

**Q: Where is the code?**
A: File paths are listed throughout [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

**Q: How is user data isolated?**
A: See Section 6 in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md) and security section in [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

## Key Concepts Explained

### Voice Agents
- Conversational AI agents powered by ElevenLabs
- Support 40+ voices and 6 agent types
- Make personalized calls with dynamic variables
- Track performance metrics and call analytics

### AI Agents
- Multi-provider LLM agents (OpenAI, Anthropic, Google)
- Support chat, voice, email, and SMS types
- Include knowledge base and tool integration
- Deploy and test before going live

### Dynamic Variables
- {{lead_name}}, {{lead_email}}, {{company_name}}, etc.
- Automatically populated from lead data
- Custom fields convert to {{snake_case}}
- Used in agent scripts and workflow actions

### Workflows
- Automation triggered by events (call completed, lead created, etc.)
- Sequential action execution (send SMS, email, create tasks, etc.)
- Conditional branching and loops
- Integration with 7+ third-party services

### Subscription Plans
- Trial: 1 agent, 50 minutes/month
- Starter: 1 voice, 3 AI, 500 minutes/month
- Professional: 5 voice, 10 AI, 2000 minutes/month
- Enterprise: Unlimited everything

## System Architecture

```
┌─────────────────────────────────────┐
│  Frontend (React)                   │
│  - Agents, Leads, Workflows, etc.   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Backend (Node.js/Express)          │
│  - Controllers, Services, Routes    │
│  - MongoDB (13 models)              │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌──▼───┐ ┌───▼────┐
│Eleven │ │OpenAI│ │Integr. │
│Labs   │ │/Claude│ │Stripe, │
│       │ │Google│ │Slack,  │
└───────┘ └──────┘ │etc.    │
                    └────────┘
```

## Navigating the Code

### To understand Voice Agent creation
1. Model: `/backend/models/VoiceAgent.js`
2. Controller: `/backend/controllers/agentController.js` (createAgent)
3. Service: `/backend/services/elevenLabsService.js`
4. Routes: `/backend/routes/agents.js`

### To understand Call personalization
1. Controller: `/backend/controllers/callController.js` (lines 122-186)
2. Service: `/backend/services/elevenLabsService.js` (lines 81-148)
3. Model: `/backend/models/Lead.js`

### To understand Workflows
1. Model: `/backend/models/Workflow.js`
2. Service: `/backend/services/workflowEngine.js`
3. Controller: `/backend/controllers/workflowController.js`
4. Routes: `/backend/routes/workflows.js`

## Getting Help

1. **First Check**: The relevant documentation file above
2. **Then Check**: The troubleshooting section in [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)
3. **Code Reference**: Use file paths from [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
4. **Deep Dive**: Full schemas in [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

## Quick Links

- Architecture Overview: See [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)
- API Endpoints: See [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md) or [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)
- Database Models: See [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md) Section 6 & 10
- Frontend Components: See [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md) Section 7
- Security Info: See [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md) Section 12

## Next Steps

1. **Choose Your Path**:
   - Quick overview? → Read [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)
   - Want to build? → Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
   - Need details? → Read [VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md](VOICEFLOW_AGENT_WORKFLOW_OVERVIEW.md)

2. **Pick Your Feature**:
   - Voice agents → UC1
   - Dynamic variables → UC2
   - Workflows → UC4
   - AI agents → UC5

3. **Start Coding**:
   - Follow file paths provided
   - Reference existing implementations
   - Check testing checklists

4. **Share Feedback**:
   - Found outdated info? Update docs
   - New feature? Document it
   - Missing example? Add one

---

**Last Updated**: November 13, 2024

For the most current information, always refer to the specific documentation files linked above.
