# n8n Gmail SMTP Configuration Guide

## Overview

This guide will help you configure n8n workflows to send emails using **Gmail SMTP with App Password** instead of SendGrid.

---

## Step 1: Configure Gmail SMTP Credential in n8n

### 1.1 Get Your Gmail App Password

If you haven't already created a Gmail App Password, follow these steps:

1. Go to: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (must be enabled)
3. Scroll to **App passwords**
4. Click **Select app** → **Mail**
5. Click **Select device** → **Other** → Enter "n8n VoiceFlow"
6. Click **Generate**
7. **Copy the 16-character password** (format: `abcd efgh ijkl mnop`)

### 1.2 Add SMTP Credential to n8n

1. Go to: https://remodely.app.n8n.cloud/credentials
2. Click **"Add Credential"**
3. Search for **"SMTP"** (not Gmail OAuth!)
4. Select **"SMTP"**
5. Fill in the form:

```
Credential Name: gmail_smtp
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
User: your-email@gmail.com
Password: [paste your 16-char app password, remove spaces]
```

6. Click **"Test"** to verify connection
7. You should see: ✅ "Connection successful!"
8. Click **"Save"**

---

## Step 2: Update Email Workflow to Use SMTP

### 2.1 Open the Email Workflow

1. Go to: https://remodely.app.n8n.cloud/workflows
2. Find **"Master: Send Follow-up Email"** workflow
3. Click to open it

### 2.2 Replace SendGrid Node with Email (SMTP) Node

**Option A: Edit Existing Node**

1. Click on the **"Send an email"** node (SendGrid node)
2. In the left panel, look for **node type dropdown** at the top
3. Change from **"SendGrid"** to **"Send Email"** or **"Email Send (SMTP)"**
4. Configure the SMTP node:

```
Credential to connect with: gmail_smtp

From Email: your-email@gmail.com
To Email: ={{ $json.to }}
Subject: ={{ $json.subject }}

Email Format: HTML
Message (HTML): ={{ $json.html }}
```

5. Click **"Execute Node"** to test
6. Click **"Save"** (bottom right)

**Option B: Add New SMTP Node**

If you prefer to add a new node:

1. Click the **+** button to add a new node
2. Search for **"Send Email"** or **"Email Send (SMTP)"**
3. Connect it after the "Format Email" node
4. Configure as shown above
5. Delete the old SendGrid node
6. Click **"Save"**

### 2.3 Update Workflow Settings

1. Make sure the workflow is **Active** (toggle at top)
2. Test the webhook URL:

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@gmail.com",
    "subject": "Test Email from n8n",
    "html": "<h1>Hello!</h1><p>This is a test email from n8n using Gmail SMTP.</p>"
  }'
```

3. Check your email inbox (including spam folder)

---

## Step 3: Update Other Email-Sending Workflows

If you have other workflows that send emails, update them too:

### Workflows That May Send Emails:
- **Send Follow-up Email** - Use Gmail SMTP ✅
- **Book Appointment** - May send confirmations
- **Send SMS After Call** - Uses Twilio (no change needed)
- **Slack Notification** - Uses Slack (no change needed)

For each workflow:
1. Open the workflow
2. Find any SendGrid nodes
3. Replace with Email (SMTP) nodes
4. Use `gmail_smtp` credential
5. Save and test

---

## Step 4: Configure Email Templates

### Call Summary Email Template

The "Format Email" node should create HTML like this:

```javascript
// In the "Format Email" Code node:
const callData = $input.item.json.callData;
const subject = $input.item.json.config?.emailSubject || 'Thank You for Your Call!';

const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📞 Thank You for Your Call!</h1>
    </div>
    <div class="content">
      <h2>Hi ${callData.caller_name},</h2>
      <p>Thank you for taking the time to speak with us. Here's a summary of our conversation:</p>

      <div class="info-box">
        <strong>Call Date:</strong> ${new Date().toLocaleDateString()}<br>
        <strong>Duration:</strong> ${Math.floor(callData.duration / 60)} minutes<br>
        <strong>Agent Type:</strong> ${callData.agent_type}
      </div>

      <p>Our team will review your inquiry and get back to you within 24 hours.</p>
      <p>If you have any questions, please don't hesitate to reach out!</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VoiceFlow CRM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

return {
  to: callData.email,
  subject: subject,
  html: html
};
```

---

## Step 5: Test the Complete Flow

### Test from Backend Application

Your backend can now trigger the n8n email workflow:

```javascript
// In backend/services/n8nService.js or wherever you call n8n
const sendEmailViaWorkflow = async ({ to, subject, html }) => {
  try {
    const response = await axios.post(
      'https://remodely.app.n8n.cloud/webhook/send-email',
      {
        to,
        subject,
        html
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Email workflow triggered successfully');
    return response.data;
  } catch (error) {
    console.error('Failed to trigger email workflow:', error.message);
    throw error;
  }
};

// Example: Send call summary via n8n
await sendEmailViaWorkflow({
  to: 'customer@example.com',
  subject: 'Thanks for your call!',
  html: emailService.generateCallSummaryHTML(callData)
});
```

### Test Directly with curl

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@gmail.com",
    "subject": "Test: Call Summary",
    "html": "<h1>Call Summary</h1><p>Thank you for your call today!</p><p><strong>Duration:</strong> 5 minutes</p>"
  }'
```

---

## Comparison: Backend Email Service vs n8n Workflow

### Backend Email Service (emailService.js)
**Pros:**
- ✅ Direct control from application code
- ✅ No external dependencies
- ✅ Faster (no HTTP roundtrip)
- ✅ Built-in templates
- ✅ Type safety

**Use for:**
- Welcome emails on signup
- Password reset emails
- Transactional emails
- Time-sensitive notifications

### n8n Email Workflow
**Pros:**
- ✅ No-code/low-code configuration
- ✅ Visual workflow builder
- ✅ Easy to modify without code deployment
- ✅ Can chain with other automations
- ✅ Built-in error handling and retries

**Use for:**
- Complex multi-step workflows
- Emails triggered by external events
- Integration with other services (Slack, Calendar, etc.)
- Non-technical team members can modify

### Recommended Approach

**Use Both!**

1. **Backend Email Service** for core application emails:
   - User signups → Welcome email
   - Password resets
   - Account notifications

2. **n8n Workflows** for business process emails:
   - After call follow-ups
   - Appointment reminders
   - Lead nurturing sequences
   - Team notifications

---

## Troubleshooting

### "Authentication failed" Error

**Solution:**
1. Verify 2-Step Verification is enabled
2. Generate a new App Password
3. Remove all spaces from the password (should be 16 characters)
4. Use the exact email address that generated the app password

### "Connection timeout" Error

**Solution:**
1. Try using port `465` with `SSL/TLS` instead of port `587` with `STARTTLS`
2. Update SMTP credential:
   ```
   Port: 465
   Security: SSL/TLS
   ```

### Email Goes to Spam

**Solution:**
1. Warm up your sending address (send gradually increasing volumes)
2. Add SPF record to your domain DNS
3. Use a verified "From" address
4. Avoid spam trigger words in subject/body

### "SMTP not secure enough" Error

**Solution:**
- Gmail requires TLS 1.2+
- Make sure n8n is up to date
- Use `STARTTLS` on port 587 or `SSL/TLS` on port 465

---

## Gmail Sending Limits

Be aware of Gmail's sending limits:

**Free Gmail Account:**
- 500 emails per day
- 500 recipients per email
- 10,000 emails per month

**Google Workspace Account:**
- 2,000 emails per day
- 10,000 recipients per day

If you exceed these limits, consider:
1. Using a professional email service (SendGrid, Mailgun, AWS SES)
2. Implementing email queuing
3. Spreading emails over multiple days

---

## Monitoring

### Check n8n Execution Logs

1. Go to: https://remodely.app.n8n.cloud/executions
2. Find your "Send Follow-up Email" workflow
3. Click on any execution to see:
   - Input data
   - Node execution details
   - Success/failure status
   - Error messages

### Check Gmail Sent Folder

1. Log into Gmail
2. Go to **Sent** folder
3. Verify emails are being sent successfully

### Backend Logs

Monitor your backend logs for email-related messages:
```bash
npm run server

# Look for:
✅ Email service initialized with Gmail SMTP
✉️  Email sent: <message-id>
```

---

## Summary

✅ **Steps Completed:**
1. Create Gmail App Password
2. Add SMTP credential to n8n (`gmail_smtp`)
3. Replace SendGrid node with Email (SMTP) node
4. Configure email templates
5. Test the workflow

✅ **Result:**
- n8n workflows now send emails via Gmail SMTP
- Matches backend email service configuration
- No SendGrid dependency
- Free and reliable

---

## Quick Reference

**Gmail:**
- App Passwords: https://myaccount.google.com/apppasswords
- Sent Mail: https://mail.google.com/mail/u/0/#sent

**n8n:**
- Credentials: https://remodely.app.n8n.cloud/credentials
- Workflows: https://remodely.app.n8n.cloud/workflows
- Executions: https://remodely.app.n8n.cloud/executions

**Email Workflow:**
- Webhook URL: https://remodely.app.n8n.cloud/webhook/send-email
- Method: POST
- Content-Type: application/json

**SMTP Settings:**
```
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
User: your-email@gmail.com
Password: [16-char app password]
```

---

**Now your n8n workflows use Gmail SMTP, matching your backend configuration!** 🎉
