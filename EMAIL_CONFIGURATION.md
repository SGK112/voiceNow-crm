# Email Configuration - Complete Guide

## Overview

VoiceFlow CRM has **two email systems** that both use **Gmail SMTP**:

1. **Backend Email Service** (Node.js/nodemailer) - For application emails
2. **n8n Email Workflows** (SMTP node) - For automated workflow emails

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│              VoiceFlow CRM Application              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐        ┌─────────────────┐   │
│  │ Backend Service │        │  n8n Workflows  │   │
│  │  (emailService) │        │   (SMTP Node)   │   │
│  └────────┬────────┘        └────────┬────────┘   │
│           │                          │             │
└───────────┼──────────────────────────┼─────────────┘
            │                          │
            └──────────┬───────────────┘
                       │
                  ┌────▼────┐
                  │  Gmail  │
                  │  SMTP   │
                  └─────────┘
```

---

## Quick Setup Checklist

### ☐ Step 1: Get Gmail App Password
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password

### ☐ Step 2: Configure Backend (.env)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # 16-char app password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=VoiceFlow CRM
```

### ☐ Step 3: Configure n8n SMTP Credential
1. Go to: https://remodely.app.n8n.cloud/credentials
2. Add **SMTP** credential named `gmail_smtp`
3. Use same settings as backend

### ☐ Step 4: Update n8n Workflows
1. Replace SendGrid nodes with Email (SMTP) nodes
2. Use `gmail_smtp` credential
3. Test workflows

---

## Backend Email Service

### Location
`/Users/homepc/voiceflow-crm/backend/services/emailService.js`

### Features
- ✅ Welcome emails
- ✅ Call summaries
- ✅ Appointment confirmations
- ✅ Payment reminders
- ✅ HTML email templates
- ✅ Automatic initialization on server start

### Usage in Code

```javascript
import emailService from './services/emailService.js';

// Send welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);

// Send call summary
await emailService.sendCallSummary({
  to: 'customer@example.com',
  leadName: 'Jane Smith',
  callDuration: '5 min 30 sec',
  callDate: new Date().toLocaleDateString(),
  transcript: 'Discussion about services...',
  nextSteps: 'Follow up next week'
});

// Send appointment confirmation
await emailService.sendAppointmentConfirmation({
  to: 'customer@example.com',
  leadName: 'Bob Johnson',
  appointmentDate: 'December 15, 2025',
  appointmentTime: '2:00 PM',
  meetingLink: 'https://meet.google.com/abc-defg-hij'
});

// Send custom email
await emailService.sendEmail({
  to: 'recipient@example.com',
  subject: 'Custom Subject',
  text: 'Plain text version',
  html: '<h1>HTML version</h1>'
});
```

### Email Templates

All templates include:
- Professional HTML design
- Responsive layout
- Brand colors (purple gradient)
- Structured content
- Clear call-to-action buttons

---

## n8n Email Workflows

### Location
https://remodely.app.n8n.cloud/workflows

### Workflows Using Email

1. **Master: Send Follow-up Email**
   - Webhook: `/webhook/send-email`
   - Sends follow-up after calls
   - Uses SMTP node with `gmail_smtp` credential

2. **Book Appointment** (if configured)
   - May send appointment confirmations
   - Update to use SMTP node

### How to Update from SendGrid to Gmail SMTP

See detailed instructions in: `N8N_GMAIL_SETUP.md`

**Quick version:**
1. Open workflow in n8n
2. Click SendGrid node
3. Delete it
4. Add "Send Email" (SMTP) node
5. Select `gmail_smtp` credential
6. Configure:
   ```
   From: your-email@gmail.com
   To: ={{ $json.to }}
   Subject: ={{ $json.subject }}
   Message (HTML): ={{ $json.html }}
   ```
7. Save workflow

### Triggering from Backend

```javascript
// backend/services/n8nService.js
const triggerEmailWorkflow = async ({ to, subject, html }) => {
  await fetch('https://remodely.app.n8n.cloud/webhook/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html })
  });
};
```

---

## When to Use Each System

### Use Backend Email Service When:
✅ Sending transactional emails (signup, password reset)
✅ Need immediate delivery
✅ Want type safety and direct control
✅ Integrating tightly with application logic
✅ Need custom template logic

### Use n8n Workflows When:
✅ Building complex multi-step automations
✅ Non-developers need to modify email templates
✅ Chaining with other actions (Slack, Calendar, CRM)
✅ Need visual workflow representation
✅ Want built-in retry logic and error handling

---

## Testing

### Test Backend Email Service

```bash
# Start backend
cd /Users/homepc/voiceflow-crm
npm run server

# In another terminal, use Node.js REPL
node

# Test welcome email
const emailService = (await import('./backend/services/emailService.js')).default;
await emailService.sendWelcomeEmail('your-email@gmail.com', 'Test User');

# Check your Gmail inbox
```

### Test n8n Workflow

```bash
# Test via webhook
curl -X POST https://remodely.app.n8n.cloud/webhook/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@gmail.com",
    "subject": "Test from n8n",
    "html": "<h1>Hello!</h1><p>This is a test email.</p>"
  }'

# Check your Gmail inbox
```

---

## Monitoring & Debugging

### Backend Logs

```bash
npm run server

# Look for these messages:
✅ Email service initialized with Gmail SMTP
✉️  Email sent: <message-id>
❌ Email send failed: <error>
```

### n8n Execution Logs

1. Go to: https://remodely.app.n8n.cloud/executions
2. Find your workflow execution
3. Click to view details:
   - Input data
   - Each node's output
   - Error messages (if any)

### Gmail Sent Folder

- Check: https://mail.google.com/mail/u/0/#sent
- Verify emails are actually being sent
- Look for bounce-backs or errors

---

## Common Issues

### Issue: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:**
1. Verify 2-Step Verification is enabled
2. Generate a **new** App Password
3. Copy it exactly (no spaces): `abcdefghijklmnop`
4. Update both `.env` and n8n credential

### Issue: Emails go to spam

**Solution:**
1. Send fewer emails initially (warm up the account)
2. Use meaningful subject lines (avoid spam triggers)
3. Include unsubscribe link
4. Add SPF/DKIM records to your domain

### Issue: "Connection timeout"

**Solution:**
Try different port/security combinations:

**Option 1 (Current):**
```
Port: 587
Security: STARTTLS
```

**Option 2 (Alternative):**
```
Port: 465
Security: SSL/TLS
```

### Issue: Hit Gmail sending limit

**Gmail Limits:**
- Free account: 500 emails/day
- Workspace: 2,000 emails/day

**Solutions:**
1. Implement email queuing
2. Upgrade to Google Workspace
3. Use dedicated email service (SendGrid, AWS SES, Mailgun)

---

## Migration Path (If Needed)

If you outgrow Gmail SMTP, here's how to migrate:

### Option 1: SendGrid

**Backend:**
```javascript
// Replace emailService.js transporter with:
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
```

**n8n:**
- Add SendGrid credential
- Replace SMTP nodes with SendGrid nodes

### Option 2: AWS SES

**Backend:**
```javascript
// Use nodemailer with SES transport
import nodemailer from 'nodemailer';
import aws from '@aws-sdk/client-ses';
```

**n8n:**
- Use SMTP with SES credentials
- Host: `email-smtp.us-east-1.amazonaws.com`

---

## Email Templates Reference

### Welcome Email
- **Template:** Beautiful gradient header, feature list, CTA button
- **Trigger:** User signup
- **Sent by:** Backend email service

### Call Summary
- **Template:** Professional layout, call details, next steps
- **Trigger:** After voice call completes
- **Sent by:** Backend OR n8n workflow

### Appointment Confirmation
- **Template:** Green checkmark theme, date/time prominence, meeting link
- **Trigger:** Appointment booked
- **Sent by:** Backend OR n8n workflow

### Payment Reminder
- **Template:** Orange/warning theme, amount due, invoice link
- **Trigger:** Payment due date approaching
- **Sent by:** Backend OR n8n workflow

---

## Configuration Files

### Backend Environment (.env)
```env
# Email (Gmail SMTP with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=VoiceFlow CRM
```

### n8n SMTP Credential
```json
{
  "name": "gmail_smtp",
  "type": "smtp",
  "data": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "your-email@gmail.com",
    "password": "your-app-password-here"
  }
}
```

---

## Security Best Practices

1. **Never commit credentials to Git**
   - ✅ Use .env files (already in .gitignore)
   - ✅ Use environment variables in production

2. **Use App Passwords, not account password**
   - ✅ Already configured
   - ✅ Can revoke without changing account password

3. **Enable 2FA on Gmail account**
   - ✅ Required for App Passwords

4. **Rotate passwords periodically**
   - Regenerate App Password every 90 days
   - Update .env and n8n credential

5. **Monitor for suspicious activity**
   - Check Gmail security: https://myaccount.google.com/security
   - Review recent logins

---

## Summary

✅ **Backend Email Service:** Ready to use with Gmail SMTP
✅ **Environment configured:** All variables in .env.example
✅ **Email templates:** 4 professional templates created
✅ **n8n integration:** Guide created for updating workflows

**Next Steps:**
1. Follow `N8N_GMAIL_SETUP.md` to update n8n workflows
2. Test both backend and n8n email sending
3. Monitor Gmail sending limits
4. Consider migration to dedicated service if volume increases

---

## Support Resources

- **Gmail App Passwords:** https://support.google.com/accounts/answer/185833
- **n8n SMTP Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailsend/
- **Nodemailer Docs:** https://nodemailer.com/
- **Testing Guide:** See `TESTING_GUIDE.md`

**All email systems now use Gmail SMTP!** 📧
