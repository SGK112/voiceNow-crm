# Visual Workflow Builder - For Contractors

## What Is This?

A **drag-and-drop workflow builder** designed specifically for contractors, plumbers, electricians, HVAC technicians, and facilities managers. Build powerful automation without writing a single line of code.

## Why Did We Build This?

**Problem:** n8n's workflow editor can't be embedded in apps due to security restrictions (X-Frame-Options)

**Solution:** Built our own visual workflow builder that:
- ✅ Runs entirely in your app
- ✅ No technical knowledge required
- ✅ Templates for common contractor tasks
- ✅ Generates n8n-compatible workflows
- ✅ Option to connect your own n8n account (advanced users)

## For Contractors: How to Use

### Getting Started

1. **Navigate to Workflows**
   - Click "Workflows" in sidebar
   - Click green "Visual Builder" button

2. **Start Building**
   - Click "Add Step" to see available actions
   - Drag and drop blocks onto canvas
   - Connect blocks by dragging from one to another
   - Click any block to configure it

### Available Blocks (No Coding Required!)

#### Triggers (When Things Happen)
- **When This Happens** ⚡ - Starts your workflow when something occurs

#### Actions (Things To Do)
- **Save Lead** 👤 - Save customer info to CRM
- **Send Text Message** 📱 - Text customers or team
- **Send Email** 📧 - Email customers or team
- **Notify Team** 💬 - Alert team on Slack

#### Logic (Smart Decisions)
- **Wait** ⏰ - Pause before next step
- **If/Then** 🔀 - Do different things based on conditions

#### Advanced (For Power Users)
- **Custom Logic** 💻 - Write JavaScript code
- **n8n Integration** 🔗 - Connect to your own n8n account

### Quick Start Templates

Click "Templates" button to load pre-built workflows:

**1. Lead Capture & Follow-up**
- Trigger → Save Lead → Send SMS
- Perfect for: New customer inquiries

**2. Appointment Reminder**
- Trigger → Wait → Send SMS
- Perfect for: Reminding customers about appointments

**3. Team Alert**
- Trigger → Notify Team
- Perfect for: Alerting team about new jobs

### Example: Simple Lead Capture

```
1. Click "Add Step"
2. Choose "When This Happens" (Trigger)
3. Click "Add Step" again
4. Choose "Save Lead"
5. Click "Add Step" again
6. Choose "Send Text Message"
7. Connect blocks by dragging arrows
8. Click "Save"
```

Result: When someone fills out your contact form, they're automatically saved to your CRM and get a text message thanking them!

### Using Variables

Want to personalize messages? Use variables:

```
{{$json.name}}    - Customer's name
{{$json.phone}}   - Customer's phone
{{$json.email}}   - Customer's email
{{$json.address}} - Customer's address
```

Example SMS message:
```
Hi {{$json.name}}! Thanks for reaching out. We'll call you at {{$json.phone}} within 24 hours.
```

## For Advanced Users: n8n Integration

### Option 1: Use Our Workflow Builder (Recommended)
- Simple, contractor-friendly interface
- No n8n account needed
- We handle the execution

### Option 2: Connect Your Own n8n
1. Add "n8n Integration" block to your workflow
2. Enter your n8n webhook URL
3. Your workflows run on YOUR n8n instance
4. Full control over execution

### Why Choose n8n Integration?
- You have complex needs beyond our templates
- You want to use n8n's 500+ integrations
- You need custom nodes not in our builder
- You're already using n8n

## Community Marketplace (Coming Soon!)

**Share Your Workflows:**
- Upload workflows you've built
- Help other contractors automate
- Earn reputation and rewards

**Download Community Workflows:**
- Pre-built workflows from other contractors
- Industry-specific templates (HVAC, Plumbing, Electrical)
- One-click install

## Technical Details (For Developers)

### Architecture
```
Visual Builder → n8n JSON → MongoDB → (Optional) n8n Backend
```

### Files
- **Frontend:** `frontend/src/components/WorkflowBuilderNew.jsx`
- **Backend:** `backend/controllers/workflowController.js`
- **Routes:** `frontend/src/App.jsx` (line 88-89)

### API Endpoints
```javascript
POST /api/workflows
PUT /api/workflows/:id
GET /api/workflows
GET /api/workflows/:id
DELETE /api/workflows/:id
```

### Data Format
Workflows stored as n8n-compatible JSON:
```json
{
  "name": "My Workflow",
  "nodes": [...],
  "connections": {...},
  "active": false
}
```

## Benefits for Contractors

### Save Time
- Automate repetitive tasks
- No more manual data entry
- Instant customer follow-ups

### Grow Your Business
- Never miss a lead
- Professional customer communication
- Team stays in sync

### No Technical Skills Required
- Drag and drop interface
- Plain English labels
- Templates for common tasks

## Support

### Getting Help
- Click the "?" icon for tips
- Hover over blocks for descriptions
- Use templates as starting points

### Common Issues

**Q: My workflow isn't working**
A: Check that all blocks are connected and configured (green dot means configured)

**Q: How do I test my workflow?**
A: Save it, then trigger it manually to see if it works

**Q: Can I edit workflows later?**
A: Yes! Just click on any workflow to edit it

**Q: What's the difference between our builder and n8n?**
A: Our builder is simpler and designed for contractors. n8n is more powerful but complex.

## Roadmap

### Phase 1: ✅ Complete
- Visual workflow builder
- 9 core node types
- Templates
- n8n compatibility

### Phase 2: In Progress
- Community marketplace
- More templates
- Mobile app support

### Phase 3: Planned
- AI-powered workflow suggestions
- Voice-activated workflow creation
- Integration with QuickBooks, Stripe, etc.

## Examples for Your Trade

### HVAC Contractors
- Emergency call → Alert on-call tech → Send customer ETA
- Maintenance reminder → Schedule appointment → Send confirmation
- Quote request → Create quote → Follow up in 3 days

### Plumbers
- Service call → Check technician availability → Dispatch
- Job completion → Send invoice → Request review
- Emergency call → Notify team → Update customer

### Electricians
- Inspection scheduled → Reminder 24 hours before → Confirmation
- Project quote → Follow up → Convert to job
- Safety issue → Alert supervisor → Create task

### Facilities Managers
- Maintenance request → Assign to vendor → Track completion
- Monthly report → Generate → Email stakeholders
- Equipment failure → Create work order → Notify team

## Summary

You now have a **powerful, contractor-friendly workflow builder** that:
- Works entirely in your app (no external tools needed)
- Uses simple drag-and-drop interface
- Generates professional automation
- Can connect to n8n for advanced users
- Will support a community marketplace

**No coding. No complexity. Just results.**
