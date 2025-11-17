# Agent Studio V2 - Complete Integration Guide

## Overview

Agent Studio V2 is a completely redesigned visual agent builder with full integration to Voice Library, My Voices, Workflows, CRM, and Knowledge Base. Built with stability and user experience as top priorities.

## What's New in V2

### ✅ Fixed Issues
- **Voice Selection**: Fixed voice dropdown breaking issue
- **Stable Architecture**: Redesigned based on WorkflowStudio reference
- **API Integration**: Proper use of centralized API service
- **Test Calls**: Fixed live outbound test call functionality

### ✅ New Integrations

1. **Voice Library Integration**
   - Access to 336+ ElevenLabs voices
   - Search and filter by name, accent, gender
   - Voice preview with audio playback
   - Tabbed interface: Library vs My Voices

2. **My Voices Integration**
   - Access saved voices directly from Agent Studio
   - Quick selection from personal voice library
   - Seamless switching between library and saved voices

3. **Knowledge Base Integration**
   - Select existing knowledge bases
   - Upload documents directly (PDF, TXT, DOC, DOCX)
   - Real-time upload with progress indication
   - View uploaded documents list

4. **Workflow Integration**
   - Connect agents to n8n workflows
   - Select from available workflows
   - Trigger workflows from agent actions

5. **CRM Integration**
   - Save conversation data to CRM
   - Create/update leads automatically
   - Set lead status during calls
   - Track customer interactions

## Features

### Visual Node-Based Builder

**Available Node Types:**

**Core Nodes:**
- 🎤 **Voice Configuration**: Select voice, model, and settings
- 🧠 **Personality**: Define agent personality and tone
- 📋 **Instructions**: Behavioral rules and guidelines
- 📚 **Knowledge Base**: Add domain knowledge

**Trigger Nodes:**
- 📞 **Inbound Call**: Handle incoming calls
- 📱 **Outbound Call**: Initiate outbound calls
- 🔗 **Webhook**: External API triggers

**Action Nodes:**
- 💾 **Save to CRM**: Store call data in CRM
- 💬 **Send SMS**: Send text messages
- 📧 **Send Email**: Email notifications
- ⚡ **Run Workflow**: Execute n8n workflows

### Voice Configuration

**Voice Selection:**
1. Click "Select Voice" button
2. Choose tab: Voice Library or My Voices
3. Search by name, accent, or description
4. Preview voices before selecting
5. Click voice card to select

**Voice Settings:**
- **Model**: Flash v2 (Best), Turbo v2.5, Multilingual
- **Stability**: Voice consistency (recommended: 50%)
- **Similarity**: Match to original (recommended: 75%)
- **Style**: Exaggeration level (recommended: 0%)

**Voice Library:**
- 336+ professional voices
- Real-time search
- Audio previews
- Metadata (gender, accent, age)

**My Voices:**
- Access saved voices
- Quick selection
- Personal library management

### Knowledge Base Panel

**Features:**
- Select existing knowledge bases
- Upload new documents
- Supported formats: PDF, TXT, DOC, DOCX
- Max file size: 10MB
- View uploaded documents
- Remove documents

**Upload Process:**
1. Click "Upload" button
2. Select file from computer
3. Wait for upload completion
4. Document appears in list

### Workflow Integration

**Connect Workflows:**
1. Select workflow from dropdown
2. Workflow triggers during call
3. Pass call data to workflow
4. Automated actions based on workflow

**Use Cases:**
- Send follow-up emails
- Create tasks in project management
- Update external systems
- Trigger notifications

### CRM Integration

**CRM Actions:**
- **Create Lead**: New lead from call
- **Update Lead**: Modify existing lead
- **Create Task**: Follow-up task

**Lead Status Options:**
- New
- Contacted
- Qualified
- Proposal

**Automatic Data Capture:**
- Caller information
- Call duration
- Conversation summary
- Lead scoring

## Usage Guide

### Creating an Agent

1. **Open Agent Studio**
   - Navigate to Agents page
   - Click "Create Agent" or edit existing
   - Click "Open Studio" button

2. **Add Voice Node**
   - Drag "Voice" node from left palette
   - Drop onto canvas
   - Click node to configure
   - Select voice from library
   - Adjust settings

3. **Add Knowledge Base**
   - Drag "Knowledge" node
   - Select existing KB or upload files
   - Connect to voice node

4. **Configure Triggers**
   - Add "Inbound Call" or "Outbound Call" node
   - Connect to voice node
   - Set up call handling

5. **Add Actions**
   - Drag action nodes (CRM, SMS, Email, Workflow)
   - Configure each action
   - Connect to conversation flow

6. **Save Configuration**
   - Click "Save" button in header
   - Configuration persists to database
   - Agent ready for deployment

### Testing Your Agent

**Test Call Feature:**
1. Go to Agents page
2. Find your agent
3. Click "Test Call" button
4. Enter phone number (include country code)
5. Click "Make Test Call"
6. Phone rings within 5-10 seconds

**Test Call Endpoint:**
```
POST /api/agents/test-call
{
  "agentId": "agent_id_here",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test call initiated successfully",
  "callId": "call_id_from_elevenlabs"
}
```

## Architecture

### Component Structure

```
AgentStudioV2.jsx
├── AgentStudioContent (Main container)
│   ├── ReactFlow (Canvas)
│   ├── Node Palette (Left sidebar)
│   └── Configuration Panel (Right sidebar)
│       ├── VoiceConfigPanel
│       ├── KnowledgeBasePanel
│       ├── WorkflowPanel
│       ├── CRMPanel
│       └── GenericPanel
```

### State Management

```javascript
// UI State
const [showNodePalette, setShowNodePalette] = useState(true);
const [selectedCategory, setSelectedCategory] = useState('All');

// Graph State
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [selectedNode, setSelectedNode] = useState(null);

// Configuration State
const [nodeConfig, setNodeConfig] = useState({});

// Resource State
const [voices, setVoices] = useState([]);
const [savedVoices, setSavedVoices] = useState([]);
const [workflows, setWorkflows] = useState([]);
const [knowledgeBases, setKnowledgeBases] = useState([]);
const [leads, setLeads] = useState([]);
```

### API Integration

**Centralized API Service (api.js):**

```javascript
export const agentApi = {
  getAgents: () => api.get('/agents'),
  createAgent: (data) => api.post('/agents/create', data),
  updateAgent: (id, data) => api.patch(`/agents/${id}`, data),
  deleteAgent: (id) => api.delete(`/agents/${id}`),
  testCall: (data) => api.post('/agents/test-call', data),
  getVoiceLibrary: (params) => api.get('/agents/helpers/voice-library', { params }),
  getSavedVoices: () => api.get('/agents/voices/saved'),
  saveVoice: (data) => api.post('/agents/voices/save', data),
  deleteVoice: (voiceId) => api.delete(`/agents/voices/${voiceId}`),
};
```

### Data Flow

```
User Action → Component State → Node Configuration → API Call → Database
                                      ↓
                                 ReactFlow
                                      ↓
                              Visual Representation
```

## Backend Integration

### Test Call Implementation

**Controller (agentController.js:1111-1216):**
```javascript
export const testCall = async (req, res) => {
  const { agentId, phoneNumber } = req.body;

  // Validate inputs
  // Fetch agent from database
  // Check ElevenLabs ID
  // Format phone number
  // Prepare webhook URL
  // Initiate call via ElevenLabs
  // Log call to database

  return { success: true, callId };
};
```

**Route:**
```javascript
router.post('/test-call', protect, testCall);
```

### Voice Library Endpoint

**Endpoint:**
```
GET /api/agents/helpers/voice-library?limit=100
```

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "EXAVITQu4vr4xnSDxMaL",
      "name": "Sarah",
      "labels": {
        "gender": "female",
        "age": "young",
        "accent": "american"
      },
      "description": "Professional and warm",
      "preview_url": "https://...",
      "category": "premade"
    }
  ],
  "has_more": false
}
```

### Knowledge Base Upload

**Endpoint:**
```
POST /api/knowledge-base/upload
Content-Type: multipart/form-data
```

**Flow:**
1. Upload to Cloudinary
2. Upload to ElevenLabs Knowledge Base API
3. Store metadata in MongoDB
4. Return document IDs

## Troubleshooting

### Voice Selection Not Working

**Problem**: Clicking voice breaks the studio

**Solution**: Use AgentStudioV2.jsx instead of AgentStudio.jsx
- Proper state management
- Fixed voice selection logic
- Stable voice preview

### Test Call Fails

**Problem**: Test call doesn't initiate

**Checks:**
1. ✅ Agent has valid ElevenLabs ID (not starting with "local_")
2. ✅ ELEVENLABS_PHONE_NUMBER_ID environment variable set
3. ✅ Phone number formatted correctly (+1234567890)
4. ✅ ELEVENLABS_API_KEY is valid
5. ✅ Webhook URL is accessible

**Debug Steps:**
```bash
# Check backend logs
tail -f backend/logs/server.log

# Check ElevenLabs API response
# Look for error messages in console
```

### Voice Preview Not Playing

**Problem**: Click play but no audio

**Solutions:**
- Check browser audio permissions
- Verify preview_url exists
- Try different browser
- Check network tab for audio loading

### Upload Fails

**Problem**: Knowledge base upload fails

**Checks:**
- File size under 10MB
- Supported format (PDF, TXT, DOC, DOCX)
- Valid authentication token
- Backend server running

## Best Practices

### Agent Design

1. **Start Simple**: Begin with voice + basic flow
2. **Test Often**: Use test call feature frequently
3. **Iterate**: Add complexity gradually
4. **Document**: Use node descriptions

### Voice Selection

1. **Match Use Case**:
   - Support: Patient, clear voices
   - Sales: Enthusiastic, engaging voices
   - Professional: Mature, authoritative voices

2. **Test Multiple Voices**: Preview 3-5 before deciding
3. **Adjust Settings**: Fine-tune stability and similarity
4. **Save Favorites**: Add good voices to My Voices

### Knowledge Base

1. **Organize Content**: Clear structure with headings
2. **Keep Updated**: Regularly update knowledge
3. **Test Retrieval**: Verify agent can find information
4. **Use Multiple Sources**: Combine text + uploaded docs

### CRM Integration

1. **Map Fields**: Ensure proper data mapping
2. **Set Status Correctly**: Use appropriate lead statuses
3. **Create Tasks**: Set follow-up tasks automatically
4. **Track Everything**: Log all interactions

## Performance Optimization

### Voice Library

- Fetches 100 voices by default
- Client-side filtering (fast)
- Single fetch per session
- Audio previews cached by browser

### Node Rendering

- ReactFlow handles virtualization
- Only renders visible nodes
- Smooth canvas interactions
- Minimal re-renders

### Configuration Saving

- Debounced auto-save (optional)
- Manual save button (primary)
- Optimistic UI updates
- Error handling with rollback

## Security

### Authentication

- JWT token required for all API calls
- Token stored in localStorage
- Auto-redirect on 401
- Secure token refresh

### Data Protection

- User data isolated by userId
- Agent access control
- Encrypted API keys
- Secure file uploads

## Future Enhancements

Planned features:

- [ ] Auto-save configuration
- [ ] Version history
- [ ] Agent templates library
- [ ] A/B testing framework
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Voice cloning integration
- [ ] Collaborative editing
- [ ] Export/import configurations
- [ ] Visual debugging tools

## Migration from V1

### Breaking Changes

1. **Component Name**: `AgentStudio` → `AgentStudioV2`
2. **Props**: Unchanged (backward compatible)
3. **State Structure**: Internal only (no breaking changes)

### Migration Steps

1. Update import:
```javascript
// Old
import AgentStudio from './components/AgentStudio';

// New
import AgentStudioV2 from './components/AgentStudioV2';
```

2. Update component usage:
```javascript
// Old
<AgentStudio agentId={id} agentData={data} onSave={handleSave} onClose={handleClose} />

// New
<AgentStudioV2 agentId={id} agentData={data} onSave={handleSave} onClose={handleClose} />
```

3. Test thoroughly
4. Deploy

## Support

### Common Issues

**Q: Voice library shows "Loading..." forever**
A: Check API endpoint and authentication token

**Q: Test call doesn't work**
A: Verify ElevenLabs configuration and phone number format

**Q: Upload fails silently**
A: Check file size and format restrictions

**Q: Can't connect nodes**
A: Ensure nodes are compatible (check handles)

### Getting Help

1. Check browser console for errors
2. Review backend logs
3. Test API endpoints directly
4. Check environment variables
5. Verify ElevenLabs account status

## Related Documentation

- [Agent Studio Voice Library Guide](./AGENT_STUDIO_VOICE_LIBRARY_GUIDE.md)
- [Knowledge Base Upload Guide](./KNOWLEDGE_BASE_UPLOAD_GUIDE.md)
- [Voice Integration Guide](./VOICE_CALL_INTEGRATION_GUIDE.md)
- [ElevenLabs Voice Library Guide](./ELEVENLABS_VOICE_LIBRARY_GUIDE.md)

---

**Last Updated**: November 17, 2025
**Version**: 2.0.0
**Status**: Production Ready
