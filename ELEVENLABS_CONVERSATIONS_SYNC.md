# ElevenLabs Conversations Sync Feature

## Overview

Added functionality to sync conversations from ElevenLabs API directly into the VoiceNow CRM UI. Users can now fetch all their ElevenLabs conversations with a single click and view them in the Calls page.

## What Was Added

### 1. Backend - ElevenLabs Service (`backend/services/elevenLabsService.js`)

Added 3 new API methods:

#### `getConversations(options)`
Fetches all conversations from ElevenLabs API with pagination.

**Parameters**:
- `agentId` (optional) - Filter by specific agent
- `page` (optional) - Page number
- `pageSize` (optional) - Results per page (default: 100)

**Returns**: List of conversations from ElevenLabs

**Example**:
```javascript
const conversations = await elevenLabsService.getConversations({
  agentId: 'agent_123',
  pageSize: 100
});
```

#### `getConversationById(conversationId)`
Fetches details for a specific conversation.

**Parameters**:
- `conversationId` - The conversation ID from ElevenLabs

**Returns**: Full conversation details including transcript

#### `getConversationAudio(conversationId)`
Gets the audio recording URL for a conversation.

**Parameters**:
- `conversationId` - The conversation ID from ElevenLabs

**Returns**: Audio URL

---

### 2. Backend - Call Controller (`backend/controllers/callController.js`)

Added 2 new controller methods:

#### `syncConversations(req, res)`
Fetches conversations from ElevenLabs and syncs them to the CallLog database.

**Workflow**:
1. Fetches conversations from ElevenLabs API (up to 100 at a time)
2. For each conversation:
   - Finds matching VoiceAgent by `elevenLabsAgentId`
   - Checks if call already exists in CallLog
   - Updates existing call OR creates new CallLog entry
3. Returns summary of synced calls

**Response**:
```json
{
  "success": true,
  "synced": 15,
  "total": 15,
  "calls": [...]
}
```

**Features**:
- ✅ Prevents duplicates (checks by `elevenLabsCallId`)
- ✅ Updates existing calls with latest status/transcript
- ✅ Skips conversations for unknown agents
- ✅ Handles errors gracefully (continues processing)

#### `getConversationDetails(req, res)`
Fetches detailed information for a specific conversation from ElevenLabs.

**Route**: `GET /api/calls/conversations/:conversationId`

---

### 3. Backend - Routes (`backend/routes/calls.js`)

Added 2 new endpoints:

```javascript
POST   /api/calls/sync                           // Sync all conversations
GET    /api/calls/conversations/:conversationId  // Get specific conversation
```

---

### 4. Frontend - API Service (`frontend/src/services/api.js`)

Added 2 new API methods to `callApi`:

```javascript
callApi.syncConversations(params)          // Triggers sync
callApi.getConversationDetails(convId)     // Gets conversation details
```

---

### 5. Frontend - Calls Page (`frontend/src/pages/Calls.jsx`)

Added sync functionality with UI button:

**New UI Elements**:
- "Sync from ElevenLabs" button with refresh icon
- Button shows spinning animation during sync
- Toast notifications for success/error

**New Hooks**:
- `useMutation` for sync operation
- `useQueryClient` for cache invalidation

**User Experience**:
1. User clicks "Sync from ElevenLabs" button
2. Button shows spinning refresh icon
3. Backend fetches conversations from ElevenLabs
4. CallLog database is updated
5. Calls list automatically refreshes
6. Success toast: "Synced X conversations from ElevenLabs"

---

## How It Works

### Data Flow:

```
User clicks "Sync" button
    ↓
Frontend: syncMutation.mutate()
    ↓
API: POST /api/calls/sync
    ↓
Controller: syncConversations()
    ↓
Service: elevenLabsService.getConversations()
    ↓
ElevenLabs API: GET /v1/convai/conversations
    ↓
Returns: List of conversations
    ↓
For each conversation:
    - Find VoiceAgent by elevenLabsAgentId
    - Check if CallLog exists (by elevenLabsCallId)
    - Update OR Create CallLog entry
    ↓
Response: { synced: 15, total: 15 }
    ↓
Frontend: Invalidate calls cache
    ↓
Calls list refreshes with new data
    ↓
Toast: "Synced 15 conversations"
```

### CallLog Data Mapping:

From ElevenLabs → To CallLog:

| ElevenLabs Field | CallLog Field | Notes |
|------------------|---------------|-------|
| `conversation_id` | `elevenLabsCallId` | Unique identifier |
| `agent_id` | `agentId` | Mapped via VoiceAgent lookup |
| `metadata.phone_number` | `phoneNumber` | Customer phone number |
| `call_type` | `direction` | 'inbound' or 'outbound' |
| `status` | `status` | 'completed', 'failed', etc. |
| `call_duration_seconds` | `duration` | In seconds |
| `start_time_unix_secs` | `startTime` | Converted to Date |
| `end_time_unix_secs` | `endTime` | Converted to Date |
| `transcript` | `transcript` | Full conversation text |
| `recording_url` | `recordingUrl` | Audio recording link |
| `cost_in_credits` | `cost` | ElevenLabs credits used |

---

## Usage

### From UI:

1. Navigate to **Calls** page (`/calls`)
2. Click **"Sync from ElevenLabs"** button (top right)
3. Wait for sync to complete (shows spinning icon)
4. See success message: "Synced X conversations"
5. Calls table refreshes with latest data

### From API:

**Sync All Conversations**:
```bash
curl -X POST http://localhost:5001/api/calls/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Sync Specific Agent's Conversations**:
```bash
curl -X POST "http://localhost:5001/api/calls/sync?agentId=agent_123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Conversation Details**:
```bash
curl http://localhost:5001/api/calls/conversations/conv_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Configuration

No additional configuration needed! The feature uses existing environment variables:

- `ELEVENLABS_API_KEY` - Already configured
- ElevenLabs API endpoints - Built into service

---

## Error Handling

### Agent Not Found:
```
⚠️ No agent found for agent_xyz, skipping conversation conv_123
```
**Cause**: Conversation's `agent_id` doesn't match any VoiceAgent in database
**Result**: Conversation is skipped, sync continues

### Database Error:
```
❌ Failed to sync conversation conv_123: MongoError...
```
**Cause**: Database write failed
**Result**: Error logged, sync continues with next conversation

### API Error:
```
❌ Sync conversations error: Failed to fetch conversations from ElevenLabs
```
**Cause**: ElevenLabs API down or auth failed
**Result**: Returns 500 error to frontend, shows error toast

---

## Limitations

1. **Pagination**: Currently fetches up to 100 conversations per sync
   - Future: Add pagination support for large volumes

2. **Agent Matching**: Requires VoiceAgent to exist in database with `elevenLabsAgentId`
   - Conversations from unknown agents are skipped

3. **Partial Transcripts**: If ElevenLabs hasn't finished processing, transcript may be incomplete
   - Re-sync will update with latest data

4. **No Auto-Sync**: Manual button click required
   - Future: Add scheduled background sync (cron job)

---

## Future Enhancements

### Phase 2:

1. **Auto-Sync on Webhook**
   - When post-call webhook fires, auto-create CallLog
   - No manual sync needed for new calls

2. **Scheduled Background Sync**
   - Cron job runs every hour
   - Syncs new conversations automatically
   - Example: `0 * * * *` (every hour)

3. **Pagination Support**
   - Fetch all conversations, not just first 100
   - Add "Load More" button in UI

4. **Conversation Filters**
   - Sync only from specific date range
   - Sync only specific agents
   - Sync only certain statuses

5. **Audio Playback in UI**
   - Add audio player to Calls table
   - Play recording directly in browser
   - Use `getConversationAudio()` method

6. **Real-Time Updates**
   - WebSocket connection to ElevenLabs
   - Live updates as conversations happen
   - No sync button needed

7. **Detailed Conversation View**
   - Click on call to see full details
   - Show turn-by-turn transcript
   - Display sentiment analysis
   - Show AI extraction results (from Phase 1)

---

## Testing

### Manual Test:

1. **Make a test call** through ElevenLabs agent
2. **Navigate to Calls page**
3. **Click "Sync from ElevenLabs"**
4. **Verify**:
   - Success toast appears
   - New call appears in table
   - Call details are accurate (phone, duration, status)

### Backend Test:

```bash
# Test sync endpoint
curl -X POST http://localhost:5001/api/calls/sync \
  -H "Authorization: Bearer $(cat ~/.voiceflow_token)"

# Test conversation details
curl http://localhost:5001/api/calls/conversations/conv_abc123 \
  -H "Authorization: Bearer $(cat ~/.voiceflow_token)"
```

Expected response:
```json
{
  "success": true,
  "synced": 5,
  "total": 5,
  "calls": [...]
}
```

---

## Files Modified/Created

### Modified:
1. `/backend/services/elevenLabsService.js` - Added 3 conversation methods
2. `/backend/controllers/callController.js` - Added 2 controller methods
3. `/backend/routes/calls.js` - Added 2 new routes
4. `/frontend/src/services/api.js` - Added 2 API methods
5. `/frontend/src/pages/Calls.jsx` - Added sync button + mutation

### Created:
1. `/ELEVENLABS_CONVERSATIONS_SYNC.md` - This documentation

---

## Success Criteria

✅ User can click button to sync conversations
✅ Conversations from ElevenLabs API are fetched
✅ CallLog database is updated with conversation data
✅ Duplicates are prevented (no duplicate CallLogs)
✅ Existing calls are updated with latest info
✅ UI shows success/error feedback
✅ Calls list refreshes automatically after sync
✅ Unknown agents are skipped gracefully

---

## Summary

The ElevenLabs Conversations Sync feature provides a seamless way to import call data from ElevenLabs into VoiceNow CRM. Users can sync with a single click, and the system intelligently handles duplicates, updates, and errors.

**Key Benefits**:
- ✅ No manual data entry required
- ✅ Always have latest call data
- ✅ Prevents duplicate records
- ✅ Works with existing agents
- ✅ Simple one-click operation
- ✅ Clear success/error feedback

**Next Steps**:
1. Test sync functionality with live ElevenLabs account
2. Verify CallLog data accuracy
3. Consider auto-sync on webhook (Phase 2)
4. Add pagination for large volumes (Phase 2)

---

**Implementation Date**: 2025-11-22
**Status**: ✅ COMPLETE
**Ready for Testing**: YES
