# Dynamic Variables for Personalized Voice Calls

## Overview

Your voice agents now receive **lead data automatically** during calls, enabling personalized conversations. The agent knows the lead's name, email, status, and any custom fields you've added.

## How It Works

When you initiate a call from a lead record, the CRM automatically sends this data to the ElevenLabs agent:

```javascript
{
  lead_name: "John Smith",
  lead_email: "john@example.com",
  lead_phone: "+14802555887",
  lead_status: "new",
  lead_source: "lead_gen",
  qualified: "yes",
  qualification_score: "85",
  estimated_value: "$5000",
  company_name: "Your Company Name",
  agent_type: "booking"
}
```

The agent can reference these variables during the conversation!

## Available Variables

### Standard Lead Variables (Always Available)

| Variable | Example | Description |
|----------|---------|-------------|
| `{{lead_name}}` | "John Smith" | Lead's full name |
| `{{lead_email}}` | "john@example.com" | Lead's email address |
| `{{lead_phone}}` | "+14802555887" | Lead's phone number |
| `{{lead_status}}` | "qualified" | Current lead status (new, contacted, qualified, converted, lost) |
| `{{lead_source}}` | "lead_gen" | Where the lead came from |
| `{{company_name}}` | "Acme Inc" | Your company name |
| `{{agent_type}}` | "booking" | Type of agent making the call |

### Conditional Variables (If Available)

| Variable | Example | When Available |
|----------|---------|----------------|
| `{{qualified}}` | "yes" | When lead is marked as qualified |
| `{{qualification_score}}` | "85" | If qualification score exists |
| `{{estimated_value}}` | "$5000" | If lead value is set |
| `{{assigned_to}}` | "Sarah Johnson" | If lead is assigned to someone |

### Custom Field Variables

Any custom fields you add to leads are automatically passed as variables:

**Example:** If you have a custom field "Property Type" with value "Kitchen Remodel", it becomes:
- Variable: `{{property_type}}`
- Value: "Kitchen Remodel"

Custom field names are converted to lowercase with spaces replaced by underscores.

## How to Use in Agent Prompts

### In ElevenLabs Dashboard

1. Go to https://elevenlabs.io/app/conversational-ai
2. Click on your agent (e.g., "VoiceFlow CRM - Lead Generation Agent")
3. Edit the **Agent Prompt** or **First Message**
4. Reference variables using `{{variable_name}}`

### Example 1: Personalized Greeting

**First Message:**
```
Hi {{lead_name}}! This is Sarah from {{company_name}}.
How are you doing today?
```

**When the call connects:**
> "Hi John Smith! This is Sarah from Acme Inc. How are you doing today?"

### Example 2: Reference Previous Interest

**Agent Prompt:**
```
You are a friendly booking agent for {{company_name}}.

The person you're calling is {{lead_name}}, and they previously expressed
interest in our services (source: {{lead_source}}).

Your goal is to schedule an appointment. If they mention their email
({{lead_email}}), confirm it's correct.

Be warm, professional, and helpful.
```

### Example 3: Qualified Lead Follow-Up

**Agent Prompt:**
```
You're calling {{lead_name}}, who is a QUALIFIED lead (qualification score: {{qualification_score}}).

They've already shown strong interest. Your job is to:
1. Thank them for their interest
2. Ask if they're ready to move forward
3. Book an appointment or answer any final questions

Estimated project value: {{estimated_value}}

Be confident but not pushy. They're already warm!
```

### Example 4: Appointment Booking with Context

**Agent Prompt:**
```
You're Sarah from {{company_name}}, calling to help {{lead_name}} schedule
their consultation.

Lead status: {{lead_status}}
Contact info: {{lead_phone}}, {{lead_email}}

Ask about:
- Preferred appointment date/time
- Any specific requirements or questions
- Confirm their contact details

If they mention a budget, acknowledge it and explain how we can work within it.
```

### Example 5: Using Custom Fields

**If lead has custom field "Property Type: Kitchen Remodel":**

**Agent Prompt:**
```
You're calling {{lead_name}} about their {{property_type}} project.

Start with: "Hi {{lead_name}}! I'm calling about the {{property_type}} you
inquired about. Do you have a few minutes to discuss your vision?"

Ask about:
- Timeline for the {{property_type}}
- Budget range
- Specific features they want
- Schedule a free estimate

Be enthusiastic about helping with their {{property_type}}!
```

**Call starts:**
> "Hi John Smith! I'm calling about the Kitchen Remodel you inquired about..."

## Testing Dynamic Variables

### 1. Create or Edit a Lead

In your CRM:
- Go to **Leads**
- Create new lead or edit existing one
- Fill in: Name, Email, Phone, Status
- Add custom fields if desired (e.g., "Property Type", "Budget Range")
- Save

### 2. Configure Your Agent Prompt

In ElevenLabs:
- Edit your agent's prompt
- Add `{{lead_name}}` and other variables
- Save changes

### 3. Make a Test Call

In your CRM:
- Go to **Leads**
- Click the **Call** button next to the lead
- Select your agent
- Initiate call

The agent will greet them by name and reference their data!

## Example Full Agent Configuration

### VoiceFlow CRM - Booking Agent

**First Message:**
```
Hi {{lead_name}}! This is Mike from {{company_name}}.
How are you today?
```

**System Prompt:**
```
You are Mike, a friendly appointment booking agent for {{company_name}}.

LEAD INFORMATION:
- Name: {{lead_name}}
- Email: {{lead_email}}
- Phone: {{lead_phone}}
- Status: {{lead_status}}
- Source: {{lead_source}}

YOUR GOAL:
Schedule an appointment for {{lead_name}}. They've already expressed interest.

CONVERSATION FLOW:
1. Greet them warmly by name
2. Reference that they inquired about our services
3. Ask what days/times work best for them
4. Offer 2-3 specific time slots
5. Confirm their contact info ({{lead_email}}, {{lead_phone}})
6. Send confirmation and end call positively

TONE: Friendly, helpful, professional
PACE: Conversational, not rushed
HANDLING OBJECTIONS: Acknowledge concerns, offer flexibility

Remember: This is {{lead_name}}, treat them as a valued potential customer!
```

## Advanced: Custom Fields Strategy

### For Real Estate

Custom fields:
- `property_type` → "Single Family Home"
- `price_range` → "$300k - $400k"
- `bedrooms` → "3-4"
- `location` → "Downtown Phoenix"

**Agent prompt:**
```
You're calling {{lead_name}} about {{property_type}} properties
in {{location}}, priced around {{price_range}}, with {{bedrooms}} bedrooms.
```

### For Services

Custom fields:
- `service_type` → "Kitchen Remodel"
- `timeline` → "Next 3 months"
- `budget` → "$25k - $35k"

**Agent prompt:**
```
You're helping {{lead_name}} with their {{service_type}}.
Timeline: {{timeline}}. Budget: {{budget}}.

Focus on how we can deliver quality {{service_type}} within
their budget and timeline.
```

## Debugging

### Check What Variables Are Being Sent

When you make a call, check the server logs:

```bash
# The backend logs the dynamic variables being sent
Console: "Initiating call with dynamic variables: {lead_name: 'John Smith', ...}"
```

### Common Issues

**Issue:** Agent doesn't use the name
- **Fix:** Make sure agent prompt includes `{{lead_name}}`
- **Check:** ElevenLabs dashboard → Edit agent → Verify prompt syntax

**Issue:** Variable shows as "undefined"
- **Fix:** That field is empty in the lead record
- **Check:** Go to Leads → Edit → Fill in missing fields

**Issue:** Custom field not working
- **Fix:** Custom field names become lowercase with underscores
- **Example:** "Property Type" → `{{property_type}}`

## Best Practices

### 1. Always Use Lead Name
```
✅ "Hi {{lead_name}}! This is Sarah..."
❌ "Hi there! This is Sarah..."
```

### 2. Reference Their Context
```
✅ "I'm calling about the {{service_type}} you inquired about..."
❌ "I'm calling about our services..."
```

### 3. Confirm Their Info
```
✅ "Just to confirm, I have your email as {{lead_email}}, is that correct?"
```

### 4. Handle Missing Data Gracefully
```
Agent prompt: "If {{estimated_value}} is provided, mention it.
Otherwise, ask about their budget."
```

### 5. Keep It Natural
```
✅ "Hi {{lead_name}}, how's your day going?"
❌ "LEAD_NAME: {{lead_name}}, STATUS: {{lead_status}}, CALLING ABOUT: {{lead_source}}"
```

## What Gets Sent Automatically

**When calling a lead:**
- ✅ All lead fields
- ✅ All custom fields
- ✅ Company name
- ✅ Agent type

**When calling without a lead (just phone number):**
- ❌ No lead data (variables will be empty)
- ✅ Company name
- ✅ Agent type
- ⚠️ Best practice: Always call from a lead record!

## Next Steps

1. **Update your agent prompts** in ElevenLabs to use `{{lead_name}}` and other variables
2. **Test with a call** to yourself using a lead record with complete data
3. **Add custom fields** to your leads for even more personalization
4. **Refine prompts** based on how conversations go

---

**Pro Tip:** The more complete your lead data, the better your agent can personalize the conversation. Encourage your team to fill out all lead fields before making calls!
