# Check Render Deploy Status

Check the VoiceNow CRM deployment status on Render. If there are any failed deploys, analyze the logs and attempt to fix the issue.

## Instructions

1. Use the Render MCP tools to check the latest deploy status for service `srv-d47fel2li9vc738mgcl0`
2. If status is `live` - report success
3. If status is `update_failed` or `build_failed`:
   - Fetch the logs to find the error
   - Analyze the error and fix the code
   - Commit and push the fix
   - Report what was wrong and what you fixed
4. If status is `update_in_progress` - report that deploy is still running

## Service Details
- Service ID: srv-d47fel2li9vc738mgcl0
- Service Name: VoiceNow-CRM
- URL: https://voiceflow-crm.onrender.com
