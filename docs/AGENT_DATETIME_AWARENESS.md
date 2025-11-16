# Agent Date/Time Awareness

## Overview

All AI agents in VoiceFlow CRM now have automatic awareness of the current date and time. This ensures they can properly schedule appointments, understand timing references, and provide accurate date-based responses.

## How It Works

### 1. Automatic Injection on Every Call

The `ElevenLabsService.initiateCall()` method automatically injects current date/time context into every outbound call. This means:

- **Always Fresh**: Date/time is calculated at the moment the call is initiated
- **Transparent**: Works automatically without any code changes needed
- **Comprehensive**: Includes date, time, day of week, time of day, and booking calculations

### 2. Date/Time Context Included

Every agent receives this information:

```
**CURRENT DATE & TIME INFORMATION:**
📅 Today's Date: Saturday, November 15, 2025
🕐 Current Time: 9:30 PM MST
📆 Day of Week: Saturday
☀️ Time of Day: night

**IMPORTANT - USE THIS INFORMATION:**
- When scheduling appointments, today is Saturday, November 15, 2025
- For "tomorrow", that means Sunday, November 16, 2025
- For "next week", that's the week starting November 17, 2025
- When someone asks "what's today's date?", say "Saturday, November 15, 2025"
- Always reference the correct day of week (Saturday)
- Adjust your greeting based on time of day (currently night)

**BOOKING APPOINTMENTS:**
When scheduling, calculate dates from TODAY (Saturday, November 15, 2025):
- "Tomorrow" = November 16, 2025
- "Next Monday" = Calculate from Saturday, November 15, 2025
- Always confirm the full date when booking
```

## Usage

### For Developers

No code changes needed! Date/time injection happens automatically in `elevenLabsService.js`:

```javascript
// This happens automatically:
const service = new ElevenLabsService();
await service.initiateCall(
  agentId,
  phoneNumber,
  agentPhoneNumberId,
  callbackUrl
);
// ✅ Date/time context is automatically injected
```

### For Agent Designers

When writing agent prompts, you can reference date/time awareness:

```
"When scheduling appointments, check the current date and day of week.
Offer availability starting tomorrow or next week."
```

The agent will automatically know:
- What day it is today
- What tomorrow's date is
- When "next week" starts
- Appropriate greetings for time of day (morning/afternoon/evening/night)

## Manual Updates (Optional)

While calls are automatically updated, you can also manually update stored agent configurations:

```bash
node backend/scripts/add-datetime-context-to-agents.js
```

This script:
- Updates all configured agents with current date/time context
- Useful for testing agents in the ElevenLabs dashboard
- Can be run daily via cron for agents that receive inbound calls

## Examples

### Appointment Booking

**Customer**: "Can I schedule an appointment for next Monday?"

**Agent** (knowing today is Saturday, Nov 15, 2025):
"Of course! Next Monday would be November 17th. What time works best for you?"

### Time-Sensitive Greetings

**Call at 9 AM**:
"Good morning! Thanks for calling..."

**Call at 9 PM**:
"Good evening! Thanks for calling..."

### Date Verification

**Customer**: "What's today's date?"

**Agent**: "Today is Saturday, November 15, 2025."

## Technical Details

### Implementation

Located in `backend/services/elevenLabsService.js`:

- **Method**: `generateDateTimeContext()`
- **Injection Point**: `initiateCall()` method
- **Strategy**: Prepends date/time context to agent prompt before each call

### Time Zone

Currently uses the server's local time zone. For multi-timezone support:

1. Pass timezone as a parameter to `initiateCall()`
2. Use timezone-aware date formatting
3. Update the context generation to specify timezone

### Storage

- **Inbound Calls**: Agents store date/time context (updated via script)
- **Outbound Calls**: Date/time injected dynamically per call
- **Best Practice**: Run update script daily for inbound-only agents

## Cron Job Setup (Optional)

To keep stored agent configurations current:

```bash
# Add to crontab
0 0 * * * cd /path/to/voiceflow-crm && node backend/scripts/add-datetime-context-to-agents.js
```

This updates all agents daily at midnight.

## Benefits

✅ **No Confusion**: Agents always know the current date
✅ **Accurate Scheduling**: Correct calculation of "tomorrow", "next week", etc.
✅ **Professional**: Time-appropriate greetings
✅ **Automatic**: Zero configuration required
✅ **Always Current**: Date/time calculated per-call

## Troubleshooting

### Agent giving wrong dates

1. Check server system time: `date`
2. Verify timezone settings
3. Run manual update script: `node backend/scripts/add-datetime-context-to-agents.js`

### Date/time not appearing in calls

1. Check logs for date/time injection
2. Verify `personalizedScript` is being passed correctly
3. Ensure agent ID is valid

### Script length warnings

If you see "Script length exceeds maximum" warnings:

1. Date/time context adds ~500 characters
2. Keep agent prompts under 3500 characters
3. Use concise language in prompts

## Future Enhancements

- [ ] Multi-timezone support
- [ ] Calendar integration for availability checking
- [ ] Business hours awareness
- [ ] Holiday detection
- [ ] Appointment slot suggestions based on availability

---

**Last Updated**: November 15, 2025
**Version**: 1.0
