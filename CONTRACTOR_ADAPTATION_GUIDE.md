# VoiceNow CRM - Contractor Adaptation Guide

## Problem Statement

VoiceNow CRM is optimized for **SaaS/software sales** where deals are simple:
- Single transaction per customer
- One-time or subscription sales
- Simple lead → proposal → close cycle

**Contractors need a different model:**
- Multiple jobs per customer
- Project-based work with distinct phases
- Estimates → scheduling → execution → completion → invoicing
- Photo documentation and before/after tracking

---

## Current Architecture vs. Contractor Needs

### Current (SaaS Model)
```
Lead (prospect) 
  ↓ (Manual conversion)
Deal (single opportunity)
  ↓ (move through stages)
Won (customer acquired)
```

### Needed (Contractor Model)
```
Lead (prospect)
  ↓
Customer (could have multiple jobs)
  ├── Job 1 (estimate → scheduled → in-progress → completed)
  ├── Job 2 (estimate → scheduled → in-progress → completed)
  └── Job 3 (estimate → scheduled → in-progress → completed)
```

---

## 5-Stage Contractor Adaptation Plan

### Stage 1: Minimal Changes (Week 1)
**Adapt existing Deal model to work as Job**

1. **Rename conceptually** (in your head/docs, not code)
   - "Deal" = "Job"
   - "stage: proposal" = "Estimate sent"
   - "stage: negotiation" = "Estimate approved"
   - "stage: won" = "Job completed"

2. **Add contractor-specific fields to Deal**
   ```javascript
   // Patch Deal model
   {
     jobType: String,           // "Roofing", "Plumbing", "HVAC"
     location: String,          // Address
     estimateAmount: Number,    // Quote value
     squareFootage: Number,     // Area covered
     startDate: Date,           // Job scheduled start
     endDate: Date,             // Job scheduled end
     actualStartDate: Date,     // When work began
     actualEndDate: Date,       // When work finished
     crewAssigned: [ObjectId],  // Team members
     materialsNeeded: [{name, quantity, cost}],
     before_photos: [String],   // Photo URLs
     after_photos: [String],    // Photo URLs
     workOrderNumber: String,   // Internal ID
   }
   ```

3. **Extend Lead model**
   ```javascript
   // Patch Lead model
   {
     propertyType: String,      // "Residential", "Commercial"
     address: String,           // Property address
     squareFootage: Number,     // Property size
     issues: [String],          // "Roof leak", "Plumbing issue"
     inspectionNotes: String,   // Details from call
     photos: [String],          // Initial photos
   }
   ```

4. **Update Deal stages for contractors**
   ```javascript
   // In Deal.js, change stage enum to:
   enum: [
     'estimate_pending',    // Waiting to send estimate
     'estimate_sent',       // Estimate delivered to customer
     'estimate_approved',   // Customer approved
     'scheduled',           // Job scheduled
     'in_progress',         // Work started
     'completed',           // Job done
     'invoiced',           // Invoice sent
     'paid',               // Payment received
     'lost'                // Customer rejected
   ]
   ```

**Time Investment:** ~2 hours code changes + testing

**Result:** Basic contractor workflow using existing schema

---

### Stage 2: Job Management (Week 2)
**Create new Job model for multi-job tracking**

1. **Create Job model** (new file: `backend/models/Job.js`)
   ```javascript
   const jobSchema = new Schema({
     // Identification
     userId: ObjectId,           // Owner
     customerId: ObjectId,       // Link to customer/lead
     jobNumber: String,          // Unique ID (JOB-001, etc.)
     title: String,              // Job title
     
     // Job Details
     jobType: String,            // "Roofing", "Plumbing"
     location: String,           // Address
     description: String,        // Work scope
     
     // Schedule
     estimatedStartDate: Date,
     estimatedEndDate: Date,
     actualStartDate: Date,
     actualEndDate: Date,
     durationDays: Number,       // How many days booked
     
     // Crew & Resources
     crewLead: ObjectId,         // Primary crew member
     teamMembers: [ObjectId],    // Secondary crew
     equipmentNeeded: [String],
     materialsNeeded: [{name, quantity, cost, purchased: Boolean}],
     
     // Financials
     estimateAmount: Number,
     estimateApprovedAt: Date,
     actualCost: Number,         // What it actually cost us
     invoiceAmount: Number,      // What we charge customer
     invoiceNumber: String,
     paidAt: Date,
     
     // Status Flow
     status: enum[
       'estimate_pending',
       'estimate_sent',
       'estimate_approved',
       'scheduled',
       'in_progress',
       'on_hold',
       'completed',
       'invoiced',
       'paid'
     ],
     
     // Documentation
     photos: [{
       type: enum['before', 'during', 'after'],
       url: String,
       description: String,
       uploadedAt: Date,
       uploadedBy: ObjectId
     }],
     notes: [{content, author, date}],
     
     // Related Records
     callLogs: [ObjectId],       // Calls about this job
     tasks: [ObjectId],          // Related tasks
     
     // Completion
     completionNotes: String,
     completedAt: Date,
     approvedBy: ObjectId,       // Customer/admin approval
     
     timestamps
   });
   ```

2. **Create JobPhase sub-model** (if very detailed)
   - phase: "Demolition", "Foundation", "Framing", "Finishing"
   - startDate, endDate
   - crewAssigned
   - percentComplete

3. **Update Lead model** to have `customerJobs: [ObjectId]`

4. **Create API routes**
   ```javascript
   // backend/routes/jobs.js
   GET    /api/jobs              - List all jobs
   GET    /api/jobs/:id          - Get job details
   POST   /api/jobs              - Create new job
   PATCH  /api/jobs/:id          - Update job
   PATCH  /api/jobs/:id/status   - Move to new status
   POST   /api/jobs/:id/photos   - Upload photos
   POST   /api/jobs/:id/estimate - Send estimate
   POST   /api/jobs/:id/invoice  - Generate invoice
   DELETE /api/jobs/:id          - Delete job
   ```

5. **Create JobController** (`backend/controllers/jobController.js`)
   - CRUD operations
   - Status transitions
   - Photo management
   - Invoice generation

**Time Investment:** ~4-5 hours + testing

**Result:** Dedicated job management for contractors

---

### Stage 3: Scheduling & Resource Allocation (Week 3)
**Calendar view and crew scheduling**

1. **Create Schedule model** (`backend/models/Schedule.js`)
   ```javascript
   {
     userId: ObjectId,
     crewMemberId: ObjectId,    // Which crew member
     jobId: ObjectId,           // Which job
     date: Date,
     startTime: String,         // "08:00"
     endTime: String,           // "17:00"
     taskType: String,          // "Demolition", "Roofing", etc.
     notes: String,
     status: enum['scheduled', 'in_progress', 'completed', 'cancelled']
   }
   ```

2. **Calendar View Component** (React)
   - Month/week/day views
   - Drag-and-drop job assignment
   - Color coding by job type or crew
   - Show availability/conflicts

3. **Crew Member Model Extension**
   ```javascript
   // Add to User or create TeamMember model
   {
     userId: ObjectId,
     company: ObjectId,
     role: enum['crew_lead', 'crew_member', 'supervisor', 'admin'],
     specialty: String,         // "Roofing specialist"
     availability: {
       monday: {start, end, available: bool},
       // ... rest of week
     },
     certification: [String],   // "Roofing Certification", etc.
   }
   ```

4. **Scheduling API**
   ```javascript
   GET    /api/schedule?date=2024-12-15  - Get day's schedule
   POST   /api/schedule                   - Create schedule entry
   PATCH  /api/schedule/:id               - Update entry
   GET    /api/schedule/calendar          - Full month view
   ```

**Time Investment:** ~6-8 hours + calendar library

**Result:** Visual scheduling and crew management

---

### Stage 4: Customer Portal (Week 4)
**Customers can view job status and provide photos**

1. **Portal Pages**
   - Dashboard: All their jobs status
   - Job Detail: Photos, timeline, current status
   - Approve Completion: Button to sign off on work
   - Messaging: Chat with crew/company

2. **Authentication**
   ```javascript
   // Separate from admin login
   POST /api/portal/login
   Body: {email, jobNumber}  // Simple access
   
   // Or token-based:
   /job/abc123?token=xyz789
   ```

3. **Portal Data Model**
   ```javascript
   JobAccess {
     jobId: ObjectId,
     customerEmail: String,
     accessToken: String,
     permissions: [
       'view_job_status',
       'upload_photos',
       'approve_completion',
       'view_estimate'
     ],
     createdAt: Date
   }
   ```

4. **Portal Components** (React)
   - Job status timeline
   - Before/after photo gallery
   - Real-time status updates (via Socket.io or polling)
   - Payment link/invoice viewing
   - Messaging interface

5. **Portal Routes**
   ```javascript
   GET    /api/portal/job/:id      - Get job (portal view, limited fields)
   POST   /api/portal/job/:id/photos - Upload photos
   POST   /api/portal/job/:id/approve - Approve completion
   GET    /api/portal/messages     - Chat messages
   POST   /api/portal/messages     - Send message
   ```

**Time Investment:** ~8-10 hours + UI

**Result:** Customers can track jobs in real-time

---

### Stage 5: Invoicing & Payments (Week 5)
**Generate invoices from completed jobs**

1. **Invoice Model** (might already exist, extend it)
   ```javascript
   {
     userId: ObjectId,
     jobId: ObjectId,
     invoiceNumber: String,      // INV-001, INV-002
     customerId: ObjectId,
     
     lineItems: [{
       description: String,      // "Roofing labor"
       quantity: Number,
       unitPrice: Number,
       total: Number
     }],
     
     subtotal: Number,
     tax: Number,
     total: Number,
     
     issueDate: Date,
     dueDate: Date,
     paidDate: Date,
     
     status: enum['draft', 'sent', 'viewed', 'paid', 'overdue'],
     
     notes: String,
     terms: String,             // Payment terms
     
     // Integration
     stripePaymentId: String,   // If using Stripe
     invoicePdfUrl: String,
   }
   ```

2. **Invoice Generation**
   - Auto-generate when job marked 'completed'
   - Calculate from job estimate + actual costs
   - Add service items (labor, materials, equipment)

3. **Invoice API**
   ```javascript
   GET    /api/invoices           - List all
   GET    /api/invoices/:id       - Get invoice details
   POST   /api/jobs/:id/invoice   - Generate from job
   PATCH  /api/invoices/:id       - Update invoice
   POST   /api/invoices/:id/send  - Email to customer
   POST   /api/invoices/:id/pay   - Process payment
   GET    /api/invoices/:id/pdf   - Download PDF
   ```

4. **Payment Integration**
   - Stripe links in invoice
   - Payment confirmation emails
   - Auto-mark invoice as 'paid'

5. **Invoice Template**
   - Company branding
   - Customer info
   - Job details
   - Line items
   - Payment terms
   - Notes

**Time Investment:** ~6-8 hours + PDF generation

**Result:** Customers can pay directly from portal

---

## Implementation Priority

### Tier 1: Essential (Do First)
- [ ] Extend Deal model with contractor fields
- [ ] Rename/rebrand Deal as "Job" in UI
- [ ] Update stage names to contractor phases

**Timeline:** 1 week  
**Value:** Can use CRM as basic job tracker  
**Effort:** 2-3 days

---

### Tier 2: Important (Do Next)
- [ ] Create dedicated Job model
- [ ] Calendar/scheduling view
- [ ] Photo upload to jobs
- [ ] Customer portal (basic)

**Timeline:** 2-3 weeks  
**Value:** Full job management + customer visibility  
**Effort:** 2-3 weeks

---

### Tier 3: Nice-to-Have (Do Later)
- [ ] Crew scheduling
- [ ] Material tracking
- [ ] Invoicing/payments
- [ ] Advanced analytics

**Timeline:** 1 month  
**Value:** Complete business management  
**Effort:** 3-4 weeks

---

## Code Changes Summary

### Files to Create
```
backend/models/
  ├── Job.js              (New)
  ├── Schedule.js         (New, optional)
  ├── JobAccess.js        (New, for portal auth)
  └── Invoice.js          (Extend if exists)

backend/controllers/
  ├── jobController.js    (New)
  ├── scheduleController.js (New, optional)
  └── invoiceController.js (New)

backend/routes/
  ├── jobs.js             (New)
  ├── schedule.js         (New, optional)
  ├── invoices.js         (New)
  └── portal.js           (New, for customer portal)

frontend/src/pages/
  ├── Jobs.jsx            (New)
  ├── JobDetail.jsx       (New)
  ├── Schedule.jsx        (New, optional)
  └── Portal.jsx          (New, for customers)

frontend/src/components/
  ├── JobCard.jsx         (New)
  ├── PhotoGallery.jsx    (New)
  ├── InvoicePreview.jsx  (New)
  └── ScheduleCalendar.jsx (New, optional)
```

### Files to Modify
```
backend/models/
  ├── Lead.js             (Add contractor fields)
  ├── Deal.js             (Add contractor fields, extend schema)
  └── User.js             (Add team member info)

backend/routes/
  ├── deals.js            (Extend for Job-specific operations)

frontend/src/pages/
  ├── Deals.jsx           (Or rename to Jobs.jsx)
  ├── Dashboard.jsx       (Show job summaries)
```

---

## Quick Start: Minimal Viable Contractor CRM

**What you need to do RIGHT NOW (1 day):**

1. **Extend Deal model**
   ```javascript
   // In Deal.js, add these fields:
   jobType: String,           // "Roofing", "Plumbing"
   location: String,
   startDate: Date,
   endDate: Date,
   crewMembers: [String],
   before_photos: [String],
   after_photos: [String],
   ```

2. **Update stage enum**
   ```javascript
   enum: [
     'estimate_pending',
     'estimate_sent',
     'estimate_approved',
     'scheduled',
     'in_progress',
     'completed',
     'invoiced',
     'paid',
     'lost'
   ]
   ```

3. **Extend Lead model**
   ```javascript
   // In Lead.js, add:
   propertyType: String,
   address: String,
   issues: [String],
   ```

4. **Update UI labels** (in frontend)
   - "Deal" → "Job"
   - "Proposal" → "Estimate"
   - "Negotiation" → "Scheduled"
   - "Won" → "Completed"

**Result:** Basic contractor workflow in 1 day using existing infrastructure

---

## Alternative: Integration Instead of Adaptation

Instead of modifying VoiceFlow for contractors, you could **integrate** it with contractor-specific software:

**Option A: Use HubSpot's Service Hub**
- Keep VoiceFlow for lead gen + voice calls
- Use HubSpot for job management
- API integration between them

**Option B: Use Jobber or ServiceTitan**
- Keep VoiceFlow for lead gen
- Use Jobber for jobs, scheduling, invoicing
- Webhook: When VoiceFlow converts lead → Create customer in Jobber

**Option C: Build Contractor Features**
- Implement Tiers 1-3 above
- Takes 4-6 weeks but fully integrated

---

## Success Metrics

After contractor adaptation, you should be able to:

- [ ] Create leads from voice calls
- [ ] Link leads to customer accounts
- [ ] Create multiple jobs per customer
- [ ] Track job progress through stages
- [ ] Assign crew to jobs
- [ ] Upload before/after photos
- [ ] Share job status with customers
- [ ] Generate invoices from completed jobs
- [ ] Track payments

---

## Common Pitfalls to Avoid

1. **Modeling jobs as "deals"**
   - Problem: Can't have multiple deals per customer easily
   - Solution: Create separate Job model

2. **Not planning for photos**
   - Problem: Contractor work needs documentation
   - Solution: Add photo storage from day 1

3. **Missing customer communication**
   - Problem: Customers expect status updates
   - Solution: Build portal or integrate SMS/email

4. **Ignoring scheduling**
   - Problem: Contractors must coordinate crew + schedule
   - Solution: Add calendar view early

5. **Forgetting invoicing**
   - Problem: No way to generate bills
   - Solution: Plan invoice system from start

---

## Conclusion

**VoiceNow CRM can be adapted for contractors** by:

1. Extending existing Deal/Lead models (Week 1)
2. Creating dedicated Job model (Week 2)
3. Adding scheduling + calendar (Week 3)
4. Building customer portal (Week 4)
5. Implementing invoicing (Week 5)

**Total effort:** 4-6 weeks for full contractor-optimized CRM

**Alternative:** Use VoiceFlow for lead gen + voice calls, integrate with Jobber/ServiceTitan for job management.

---

**Questions?** See `CRM_WORKFLOW_ANALYSIS.md` for detailed architecture info.
