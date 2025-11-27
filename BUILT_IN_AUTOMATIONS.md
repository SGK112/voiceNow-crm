# Built-In Smart Automations

## Overview

Your VoiceNow CRM now has **built-in smart automations** that run automatically after every call. No setup required, no configuration needed - they just work!

These automations analyze call outcomes and automatically create tasks, update lead statuses, and ensure nothing falls through the cracks.

## What Happens Automatically

### 1. Qualified Lead Detected
**When:** Voice agent marks a lead as "qualified"
**Automation:**
- Creates a high-priority follow-up task for 24 hours later
- Updates lead status to "qualified"
- Includes call transcript in task description
- Links task to the lead and call

**Example Task:**
```
Title: Follow up with qualified lead: John Smith
Priority: High
Due: Tomorrow at 2:00 PM
Description: Lead qualified during lead_gen call. Contact: +14802555887
```

### 2. Appointment Booked
**When:** Voice agent books an appointment
**Automation:**
- Creates appointment reminder task 24 hours before appointment
- Updates lead status to "qualified"
- Links to lead and call records

**Example Task:**
```
Title: Appointment Reminder: Sarah Johnson
Priority: High
Due: Dec 15, 2025 at 10:00 AM (1 day before appointment)
Description: Appointment scheduled for Dec 16, 2025 at 10:00 AM
```

### 3. No Answer / Failed Call
**When:** Call status is "no-answer", "failed", or "busy"
**Automation:**
- Creates retry call task for 2 hours later
- Medium priority
- Includes previous call status

**Example Task:**
```
Title: Retry call to +14802555887
Priority: Medium
Due: Today at 4:30 PM (2 hours from now)
Description: Previous call status: no-answer
```

### 4. Interested But Not Qualified
**When:** Lead shows interest but isn't fully qualified
**Automation:**
- Creates nurture task for 3 days later
- Updates lead status to "contacted"
- Medium priority for gentle follow-up

**Example Task:**
```
Title: Nurture interested lead: Mike Davis
Priority: Medium
Due: 3 days from now
Description: Lead showed interest in: kitchen remodeling
```

### 5. Payment Captured
**When:** Voice agent successfully captures payment
**Automation:**
- Creates thank you task for 1 hour later
- Updates lead status to "converted"
- Sets lead value to payment amount
- High priority to send immediate gratitude

**Example Task:**
```
Title: Send thank you to Jessica Brown - Payment received
Priority: High
Due: Today at 3:00 PM
Description: Payment amount: $500
Consider upsell or referral request.
```

### 6. Negative Sentiment Detected
**When:** Call completes with negative sentiment
**Automation:**
- Creates URGENT escalation task for 30 minutes later
- Urgent priority to handle immediately
- Includes full transcript for context

**Example Task:**
```
Title: URGENT: Negative sentiment detected - Tom Wilson
Priority: Urgent
Due: Today at 2:30 PM (30 minutes)
Description: Call completed with negative sentiment.
Review transcript and follow up immediately.
```

## How It Works

1. **Voice agent makes call** → ElevenLabs processes conversation
2. **Call completes** → ElevenLabs sends webhook to your CRM
3. **CRM analyzes outcome** → Checks for qualified leads, appointments, sentiment, etc.
4. **Automations execute** → Creates tasks, updates leads, logs everything
5. **You see tasks in dashboard** → Ready to take action

## Where Are Tasks Created?

All automated tasks appear in your **Tasks** page with:
- Clear title indicating the action needed
- Priority level (Urgent, High, Medium)
- Due date/time
- Full context and call transcript
- Links to related lead and call records

## Task Types Created

- **Follow-up** - For qualified leads and negative sentiment
- **Reminder** - For booked appointments
- **Call** - For retry attempts
- **Email** - For thank you messages after payment

## Benefits

### No Configuration Required
Unlike n8n workflows that need setup, these automations work instantly. Every user gets them out of the box.

### Smart Timing
- Urgent issues: 30 minutes
- Thank you messages: 1 hour
- Retry calls: 2 hours
- Follow-ups: 24 hours
- Nurture: 3 days

### Complete Context
Every task includes:
- Who to contact
- Why they're being contacted
- Call transcript
- Previous call outcome
- Direct links to lead record

### Never Miss Opportunities
- Qualified leads get immediate follow-up
- Failed calls get automatic retry
- Negative sentiment gets escalated
- Payments get thank you messages

## Technical Details

### Code Location
[backend/controllers/webhookController.js](backend/controllers/webhookController.js#L12-L180)

### Database Models Used
- **Task** - Auto-created tasks with `autoCreatedBy: 'voice_agent'`
- **Lead** - Status updates based on call outcome
- **CallLog** - Links tasks back to original call

### Error Handling
Automations run in a try/catch block and never break the webhook. If an automation fails, it logs the error but doesn't prevent the call from being recorded.

### n8n Still Available
Built-in automations run first, then n8n workflows (if configured) run after. You can use both together.

## Future Enhancements

**Phase 2** (user-configurable):
- Custom timing (e.g., "retry in 1 hour instead of 2")
- Custom task priorities
- Email/SMS templates
- Workflow builder UI

**Phase 3** (advanced):
- AI-powered task descriptions
- Multi-step sequences (e.g., "3 retries, then mark as lost")
- Integration with email/SMS sending
- Conditional logic builder

## Testing

To test these automations:

1. Make a call from the CRM (Leads → Call button)
2. Complete the call with different outcomes
3. Check Tasks page to see auto-created tasks

Or use the test script:
```bash
node scripts/test-batch-call.js
```

Then check your Tasks page after the call completes!

## Cost

**Built-in automations are free** - no extra cost beyond your regular call minutes. They're just smart code running on your server.

Compare to n8n:
- n8n Cloud: $20-100/month + complexity
- Built-in: $0/month + zero setup

---

**Questions?** Check the code in [webhookController.js](backend/controllers/webhookController.js) or ask your development team!
