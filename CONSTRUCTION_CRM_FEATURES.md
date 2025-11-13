# Construction CRM Features - Implementation Summary

This document outlines all the construction-specific features added to the VoiceFlow CRM system.

## Overview

The CRM has been enhanced with specialized voice agents and workflows designed specifically for construction businesses. All features support dynamic variables using `{{variable_name}}` syntax to personalize conversations with real data from your CRM.

---

## 1. Construction Voice Agents

### Location: [backend/models/VoiceAgent.js](backend/models/VoiceAgent.js)

### New Agent Types Added:

#### Trade-Specific Agents:
- **Plumber** (`plumber`) - Emergency and scheduled plumbing services
- **Carpenter** (`carpenter`) - Custom carpentry and woodworking projects
- **Electrician** (`electrician`) - Electrical installation and repairs
- **Drywall Tech** (`drywall_tech`) - Drywall installation and finishing
- **Handyman** (`handyman`) - General repair and maintenance services
- **Estimator** (`estimator`) - Project estimation and bidding
- **Fabricator** (`fabricator`) - Metal fabrication and welding
- **General Contractor** (`general_contractor`) - Overall project management
- **HVAC Tech** (`hvac_tech`) - Heating and cooling systems
- **Roofer** (`roofer`) - Roofing installation and repair
- **Painter** (`painter`) - Interior and exterior painting
- **Flooring Specialist** (`flooring_specialist`) - Flooring installation

#### Business Operations Agents:
- **Supplier Rep Caller** (`supplier_rep`) - Calls suppliers for pricing/availability
- **Order Placement** (`order_placement`) - Places orders with suppliers
- **Inventory Check** (`inventory_check`) - Verifies stock availability
- **Quote Request** (`quote_request`) - Requests quotes from subcontractors

---

## 2. Voice Agent Templates

### Location: [backend/controllers/agentController.js](backend/controllers/agentController.js:239-808)

### Construction Templates (12 new templates):

1. **Plumber Dispatch Agent** 🔧
   - Emergency vs routine assessment
   - Safety checks and water shutoff guidance
   - Schedule technician dispatch
   - Variables: `{{lead_name}}`, `{{address}}`, `{{property_type}}`

2. **Carpentry Estimator Agent** 🪚
   - Project type identification
   - Material and timeline discussions
   - Schedule on-site estimates
   - Variables: `{{project_type}}`, `{{budget_range}}`, `{{timeline}}`

3. **Electrician Service Agent** ⚡
   - Safety-first approach
   - Licensed/insured emphasis
   - Emergency vs scheduled service
   - Variables: `{{lead_name}}`, `{{address}}`, `{{property_type}}`

4. **Drywall Specialist Agent** 🧱
   - Installation vs repair identification
   - Texture and finish options
   - Square footage estimation
   - Variables: `{{project_type}}`, `{{address}}`

5. **Handyman Service Agent** 🔨
   - Multi-task "honey-do list" approach
   - Hourly vs flat-rate pricing
   - Versatile service positioning
   - Variables: `{{lead_name}}`, `{{address}}`

6. **Construction Estimator Agent** 📐
   - Comprehensive project details gathering
   - Budget and timeline qualification
   - Site visit scheduling
   - Variables: `{{project_type}}`, `{{budget_range}}`, `{{timeline}}`

7. **Metal Fabricator Agent** ⚙️
   - Custom metalwork specifications
   - Material and finish requirements
   - CAD design capabilities
   - Variables: `{{company}}`, `{{project_type}}`

8. **Supplier Rep Caller** 📞
   - Pricing and availability checks
   - Account number identification
   - Quote reference tracking
   - Variables: `{{company_name}}`, `{{account_number}}`, `{{order_items}}`

9. **Order Placement Agent** 🛒
   - Accurate order placement
   - PO number tracking
   - Delivery confirmation
   - Variables: `{{account_number}}`, `{{po_number}}`, `{{delivery_address}}`

10. **Inventory Check Agent** 📦
    - Quick stock verification
    - Lead time assessment
    - Alternative options inquiry
    - Variables: `{{inventory_items}}`, `{{account_number}}`

11. **Quote Request Agent** 💼
    - Subcontractor quote requests
    - Scope of work documentation
    - Timeline and availability check
    - Variables: `{{project_name}}`, `{{scope_of_work}}`, `{{quote_deadline}}`

---

## 3. Dynamic Variable System

### Location: [frontend/src/components/DynamicVariablePicker.jsx](frontend/src/components/DynamicVariablePicker.jsx)

### Variable Categories:

#### Lead Information (9 variables)
- `{{lead_name}}` - Lead full name
- `{{lead_email}}` - Lead email address
- `{{lead_phone}}` - Lead phone number
- `{{lead_source}}` - How lead was generated
- `{{lead_status}}` - Current lead status
- `{{qualified}}` - Is lead qualified (true/false)
- `{{qualification_score}}` - Lead score (0-100)
- `{{estimated_value}}` - Deal value estimate
- `{{assigned_to}}` - Team member assigned

#### Company Information (4 variables)
- `{{company_name}}` - Your company name
- `{{company}}` - Lead's company name
- `{{company_phone}}` - Your phone number
- `{{company_email}}` - Your email address

#### Project/Job Information (6 variables)
- `{{project_name}}` - Project title
- `{{project_type}}` - Type of project
- `{{project_address}}` - Job site address
- `{{project_timeline}}` - Project timeline
- `{{budget_range}}` - Project budget
- `{{timeline}}` - Start to finish time

#### Address Information (3 variables)
- `{{address}}` - Full street address
- `{{property_type}}` - Property type
- `{{delivery_address}}` - Delivery location

#### Business Operations (12 variables)
- `{{account_number}}` - Supplier account #
- `{{contact_name}}` - Contact person
- `{{agent_name}}` - Agent/Rep name
- `{{order_items}}` - Items to order
- `{{order_details}}` - Full order info
- `{{po_number}}` - Purchase order #
- `{{payment_terms}}` - Payment terms
- `{{requested_delivery_date}}` - When needed
- `{{quote_email}}` - Email for quotes
- `{{quote_deadline}}` - Quote due date
- `{{scope_of_work}}` - Work description
- `{{inventory_items}}` - Items to check

### Features:
- Searchable variable picker
- Visual categories with icons
- Copy to clipboard functionality
- Example values shown for each variable
- Automatic variable extraction and display

---

## 4. Enhanced Workflow Builder

### Location: [frontend/src/components/WorkflowBuilder.jsx](frontend/src/components/WorkflowBuilder.jsx)

### Features:
- **Visual Flow Builder** - Drag-and-drop style interface
- **Trigger Types** (8 options):
  - Call Completed
  - Lead Created
  - Lead Qualified
  - Appointment Booked
  - Deal Won
  - Deal Lost
  - Schedule (cron)
  - Manual Trigger

- **Action Types** (10+ options):
  - Send SMS
  - Send Email
  - Create Lead
  - Update Lead
  - Create Task
  - Schedule Call
  - Webhook (API call)
  - Slack Notification
  - Delay/Wait
  - Conditional Branching

- **Integrated Variable Picker** - Click to insert variables into any field
- **Visual Variable Display** - See which variables are used in each action
- **Action Ordering** - Move actions up/down in sequence
- **Color-Coded Actions** - Visual identification by type

---

## 5. Construction Workflow Templates

### Location: [backend/services/n8nService.js](backend/services/n8nService.js:108-460)

### New Workflow Templates (6 templates):

#### 1. Emergency Plumbing Dispatch
**Type:** `plumbing_emergency_dispatch`

**Flow:**
1. Emergency Call Trigger (webhook)
2. Check Emergency Level (conditional)
3. Send SMS to Customer (30-60 min ETA)
4. Notify Team Slack (#dispatch channel)
5. Create Priority Task (high priority)

**Use Case:** Immediate response for burst pipes, sewage backup, or gas line issues

---

#### 2. Construction Estimate Workflow
**Type:** `project_estimate_workflow`

**Flow:**
1. Estimate Request Received (webhook)
2. Create Lead in CRM (with custom fields)
3. Send Confirmation Email
4. Schedule Follow-up Task (due tomorrow)

**Use Case:** Automate estimate request processing and follow-up

---

#### 3. Supplier Order Confirmation
**Type:** `supplier_order_confirmation`

**Flow:**
1. Order Placed (webhook)
2. Save Order to Database (MongoDB)
3. Send Email Confirmation (with PO#)
4. Notify Project Manager (Slack #orders)

**Use Case:** Track orders and keep team informed of material orders

---

#### 4. Job Completion & Payment
**Type:** `job_completion_workflow`

**Flow:**
1. Job Marked Complete (webhook)
2. Update Project Status (API call)
3. Send Thank You SMS (with payment link)
4. Send Invoice (billing API)
5. Wait 24 Hours (delay)
6. Send Feedback Survey (review request)

**Use Case:** Handle job completion, payment collection, and reviews

---

#### 5. Quote Follow-Up Sequence
**Type:** `quote_follow_up`

**Flow:**
1. Quote Sent (webhook)
2. Wait 3 Days (delay)
3. Send Follow-Up Email
4. Wait 4 More Days (delay)
5. Final Follow-Up Call (schedule voice agent)

**Use Case:** Automated quote follow-up to increase conversion rates

---

#### 6. Material Delivery Tracking
**Type:** `material_delivery_tracking`

**Flow:**
1. Delivery Scheduled (webhook)
2. Day Before Reminder (scheduled trigger)
3. Send Reminder to Team (Slack #job-sites)
4. Send SMS to Foreman (mobile notification)

**Use Case:** Ensure team is ready for material deliveries

---

## 6. How Dynamic Variables Work

### Implementation: [backend/controllers/callController.js](backend/controllers/callController.js:122-186)

### Variable Replacement Process:

1. **Agent Script Loading** - System loads agent script with `{{variables}}`
2. **Lead Data Fetch** - Retrieves lead data from database
3. **Variable Extraction** - Finds all `{{variable_name}}` patterns
4. **Data Mapping** - Maps variables to actual lead data:
   - Standard fields: `name`, `email`, `phone`, etc.
   - Custom fields: Automatically converted to `snake_case`
   - Computed fields: `qualified`, `qualification_score`, etc.
5. **Safe Replacement** - Replaces variables with actual data (handles null/undefined)
6. **Call Initiation** - Sends personalized script to ElevenLabs API

### Example:
```javascript
// Original script:
"Hi {{lead_name}}, calling from {{company_name}} about your {{project_type}}."

// After variable replacement:
"Hi John Smith, calling from ACME Construction about your Kitchen Renovation."
```

---

## 7. Usage Examples

### Creating a Plumber Agent:

1. Go to **Agents** page
2. Click **Create Agent**
3. Select **Plumber Dispatch Agent** template
4. Customize the script with your company details
5. Add variables like `{{lead_name}}`, `{{address}}`, `{{lead_phone}}`
6. Select a professional voice
7. Set availability hours
8. Click **Create**

### Creating an Estimate Workflow:

1. Go to **Workflows** page
2. Click **Create Workflow**
3. Select **Construction Estimate Workflow**
4. Review the automated flow
5. Customize email templates and notifications
6. Enable the workflow
7. Test with a sample lead

### Using Variables in Scripts:

```
You are a plumber for {{company_name}}.

CUSTOMER INFORMATION:
- Name: {{lead_name}}
- Phone: {{lead_phone}}
- Address: {{address}}
- Property Type: {{property_type}}

When the customer answers, say:
"Hi {{lead_name}}, this is calling from {{company_name}}.
I understand you need plumbing assistance at {{address}}.
What's going on?"
```

---

## 8. Benefits for Construction Businesses

### Efficiency Gains:
- **Automated Dispatch** - Emergency calls handled immediately
- **Lead Qualification** - AI agents pre-qualify leads 24/7
- **Follow-ups** - Never miss a quote or estimate follow-up
- **Order Management** - Streamline supplier communications
- **Payment Collection** - Automated invoicing and payment reminders

### Personalization:
- Every call uses real customer data
- Project-specific information in every conversation
- Budget and timeline awareness
- Location-aware service dispatch

### Scalability:
- Handle 100+ calls simultaneously
- 24/7 availability without additional staff
- Multi-trade support in one CRM
- Unlimited custom variables for your business

### ROI Improvements:
- Faster response times = more jobs won
- Higher quote-to-conversion rates
- Reduced administrative overhead
- Better customer satisfaction
- Improved cash flow (automated payment collection)

---

## 9. File Locations Reference

### Backend Files:
- [backend/models/VoiceAgent.js](backend/models/VoiceAgent.js:14-44) - Agent types
- [backend/controllers/agentController.js](backend/controllers/agentController.js:239-808) - Agent templates
- [backend/services/n8nService.js](backend/services/n8nService.js:108-460) - Workflow templates
- [backend/controllers/callController.js](backend/controllers/callController.js:122-186) - Variable replacement logic

### Frontend Files:
- [frontend/src/components/DynamicVariablePicker.jsx](frontend/src/components/DynamicVariablePicker.jsx) - Variable picker component
- [frontend/src/components/WorkflowBuilder.jsx](frontend/src/components/WorkflowBuilder.jsx) - Visual workflow builder
- [frontend/src/pages/Workflows.jsx](frontend/src/pages/Workflows.jsx) - Workflows page

---

## 10. Next Steps

### To Start Using:

1. **Create Your First Construction Agent:**
   - Navigate to Agents → Create Agent
   - Choose a construction template (e.g., Plumber Dispatch)
   - Customize the script for your business
   - Test with a sample lead

2. **Set Up Workflows:**
   - Navigate to Workflows → Create Workflow
   - Select a construction workflow template
   - Configure integrations (Slack, email, etc.)
   - Enable the workflow

3. **Add Custom Variables:**
   - Add custom fields to leads
   - Use `{{field_name}}` in scripts (snake_case)
   - Variables automatically become available

4. **Train Your Agents:**
   - Review call transcripts
   - Refine scripts based on performance
   - Adjust qualification criteria
   - Optimize follow-up timing

---

## 11. Support

For questions or issues:
- Check documentation in the `/docs` folder
- Review [DOCUMENTATION_START_HERE.md](DOCUMENTATION_START_HERE.md)
- Check [AGENT_WORKFLOW_QUICK_REFERENCE.md](AGENT_WORKFLOW_QUICK_REFERENCE.md)

---

**Last Updated:** 2025-01-13
**Version:** 1.0.0
**Status:** Production Ready ✅
