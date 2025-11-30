# AI Copilot - Voice-Driven Code Changes

Poll for pending copilot commands from the mobile app and execute them. Users can say "Copilot, [command]" in the app to trigger code changes.

## Instructions

1. Check for pending copilot revisions in MongoDB
2. For each pending revision:
   - Read the command/request
   - Analyze which files need to be changed
   - Make the code changes
   - Save the before/after to the revision record
   - Mark as applied or failed
3. Report what was done

## API Endpoints

- GET pending revisions: Query MongoDB `CopilotRevision` collection for `status: 'pending'`
- After changes: Update the revision with changes array and mark `status: 'applied'`

## Database

Collection: `copilotrevisions`
Fields:
- `command` - The user's voice command
- `status` - pending, processing, applied, failed, reverted
- `changes` - Array of { filePath, oldContent, newContent }
- `summary` - AI-generated summary of changes

## How to Check for Commands

```javascript
// In mongosh or via API:
db.copilotrevisions.find({ status: 'pending' }).sort({ createdAt: 1 })
```

## Example Commands Users Might Say

- "Copilot, make the header purple"
- "Copilot, add a dark mode toggle"
- "Copilot, make the buttons rounder"
- "Copilot, increase the font size on the home screen"
- "Copilot, add a logout button to settings"

## After Making Changes

1. Update the revision in MongoDB:
```javascript
db.copilotrevisions.updateOne(
  { _id: ObjectId("...") },
  {
    $set: {
      status: 'applied',
      changes: [...],
      summary: 'Made the header purple by changing...',
      processingCompletedAt: new Date()
    }
  }
)
```

2. The mobile app's Fast Refresh will pick up the changes automatically
3. User sees confirmation in the app
