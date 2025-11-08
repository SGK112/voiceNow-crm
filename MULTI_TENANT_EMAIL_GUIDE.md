# Multi-Tenant Email Configuration Guide

## Problem

Your current setup uses **one Gmail account** for all emails. This won't work for subscribers because:
- ❌ All emails come from YOUR email address
- ❌ Subscribers can't use their own branding
- ❌ You hit Gmail's 500 emails/day limit quickly
- ❌ Not scalable for multiple users

## Solution: Two Approaches

### **Approach 1: Users Provide Their Own Gmail Credentials** ⭐ Recommended

Each subscriber configures their own Gmail SMTP in their settings.

#### Advantages:
✅ Users send from their own email address
✅ Their own branding
✅ No limits (each user has 500/day)
✅ More professional
✅ Better deliverability

#### Implementation:

**1. Add Email Settings Page (Frontend)**

Create `/frontend/src/pages/EmailSettings.jsx`:

```javascript
import { useState } from 'react';
import { settingsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function EmailSettings() {
  const [config, setConfig] = useState({
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'My Company'
  });
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    await settingsApi.updateEmailConfig(config);
    alert('Email settings saved!');
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await settingsApi.testEmail();
      alert('Test email sent! Check your inbox.');
    } catch (error) {
      alert('Test failed: ' + error.message);
    }
    setTesting(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Email Configuration</h1>

      <Card className="p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Gmail SMTP Settings</h2>

        <div className="space-y-4">
          <div>
            <Label>Gmail Address</Label>
            <Input
              type="email"
              value={config.smtpUser}
              onChange={(e) => setConfig({...config, smtpUser: e.target.value})}
              placeholder="your-email@gmail.com"
            />
          </div>

          <div>
            <Label>Gmail App Password</Label>
            <Input
              type="password"
              value={config.smtpPassword}
              onChange={(e) => setConfig({...config, smtpPassword: e.target.value})}
              placeholder="16-character app password"
            />
            <p className="text-sm text-gray-500 mt-1">
              <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-blue-600">
                Generate App Password →
              </a>
            </p>
          </div>

          <div>
            <Label>From Email</Label>
            <Input
              type="email"
              value={config.fromEmail}
              onChange={(e) => setConfig({...config, fromEmail: e.target.value})}
              placeholder="noreply@yourcompany.com"
            />
          </div>

          <div>
            <Label>From Name</Label>
            <Input
              value={config.fromName}
              onChange={(e) => setConfig({...config, fromName: e.target.value})}
              placeholder="My Company"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave}>Save Settings</Button>
            <Button onClick={handleTest} variant="outline" disabled={testing}>
              {testing ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

**2. Update Settings API (Frontend)**

In `frontend/src/services/api.js`:

```javascript
export const settingsApi = {
  // ... existing methods ...

  updateEmailConfig: (data) => api.patch('/settings/email-config', data),
  testEmail: () => api.post('/settings/test-email'),
};
```

**3. Add Settings Controller (Backend)**

In `backend/controllers/settingsController.js`:

```javascript
import User from '../models/User.js';
import emailService from '../services/emailService.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export const updateEmailConfig = async (req, res) => {
  try {
    const { smtpUser, smtpPassword, fromEmail, fromName } = req.body;

    // Encrypt the password before storing
    const encryptedPassword = encrypt(smtpPassword);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        emailConfig: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser,
          smtpPassword: encryptedPassword,
          fromEmail,
          fromName
        }
      },
      { new: true }
    );

    res.json({
      message: 'Email configuration updated successfully',
      emailConfig: {
        smtpUser: user.emailConfig.smtpUser,
        fromEmail: user.emailConfig.fromEmail,
        fromName: user.emailConfig.fromName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const testEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+emailConfig.smtpPassword');

    if (!user.emailConfig?.smtpUser) {
      return res.status(400).json({ message: 'Email not configured' });
    }

    // Decrypt password
    const decryptedConfig = {
      ...user.emailConfig.toObject(),
      smtpPassword: decrypt(user.emailConfig.smtpPassword)
    };

    await emailService.sendEmail({
      to: user.email,
      subject: 'Test Email from VoiceFlow CRM',
      html: '<h1>Success!</h1><p>Your email configuration is working correctly.</p>',
      emailConfig: decryptedConfig
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

**4. Update Settings Routes (Backend)**

In `backend/routes/settings.js`:

```javascript
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  updateEmailConfig,
  testEmail,
  // ... other imports
} from '../controllers/settingsController.js';

const router = express.Router();

router.patch('/email-config', protect, updateEmailConfig);
router.post('/test-email', protect, testEmail);

// ... other routes

export default router;
```

---

### **Approach 2: Shared Email Service** (Simple but Limited)

Use YOUR Gmail for all users, but allow them to customize the "From Name".

#### Advantages:
✅ Simple to set up
✅ No user configuration needed
✅ Works immediately

#### Disadvantages:
❌ All emails from your address
❌ Hit Gmail limits faster
❌ Less professional for users
❌ Deliverability issues

**Implementation:**

Just add a `fromName` field in user settings and use it when sending:

```javascript
const fromName = user.settings?.emailFromName || user.company || 'VoiceFlow CRM';
```

---

## Recommended Architecture

### For Each Email Type:

**1. System Emails (Use Default SMTP)**
- Welcome emails
- Password resets
- Account notifications
- Billing emails

**2. Customer-Facing Emails (Use User's SMTP)**
- Call follow-ups
- Appointment confirmations
- Lead nurturing
- Marketing emails

### Updated n8n Workflow

Your n8n workflow needs to:

**1. Receive User ID with webhook:**
```json
{
  "userId": "user_123",
  "to": "customer@example.com",
  "subject": "Thanks for your call",
  "callData": { ... }
}
```

**2. Fetch User's Email Config from Database**

Add a "MongoDB" node or "HTTP Request" node to your workflow:
- Call your backend: `GET /api/settings/email-config`
- Use the userId to fetch their SMTP settings

**3. Use Dynamic Email Config in Code Node:**

```javascript
const nodemailer = require('nodemailer');

// Get user's email config from previous node
const emailConfig = $('Get User Config').item.json.emailConfig;
const emailData = $input.item.json;

// Create transporter with user's credentials
const transporter = nodemailer.createTransport({
  host: emailConfig.smtpHost || 'smtp.gmail.com',
  port: emailConfig.smtpPort || 587,
  secure: false,
  auth: {
    user: emailConfig.smtpUser,
    pass: emailConfig.smtpPassword // Already decrypted by backend
  }
});

// Send email from user's address
const info = await transporter.sendMail({
  from: {
    name: emailConfig.fromName || 'VoiceFlow CRM',
    address: emailConfig.fromEmail || emailConfig.smtpUser
  },
  to: emailData.to,
  subject: emailData.subject,
  html: emailData.html
});

return { success: true, messageId: info.messageId };
```

---

## Migration Plan

### Phase 1: Backend Updates ✅
- [x] Update User model with `emailConfig`
- [ ] Add email settings controller
- [ ] Add email config API routes
- [ ] Test with encryption/decryption

### Phase 2: Frontend Settings Page
- [ ] Create EmailSettings.jsx page
- [ ] Add to Settings navigation
- [ ] Add API client methods
- [ ] Test user flow

### Phase 3: Update Email Service
- [ ] Modify emailService.js to accept user config
- [ ] Update all email sending methods
- [ ] Test with different user configs

### Phase 4: Update n8n Workflows
- [ ] Add user config fetch node
- [ ] Update code node to use dynamic config
- [ ] Test workflow with multiple users

---

## Testing Plan

### Test User Configuration:
1. Sign up new user
2. Go to Settings → Email
3. Add Gmail credentials
4. Click "Send Test Email"
5. Verify email received

### Test n8n Workflow:
1. Trigger workflow with userId
2. Verify correct user's credentials used
3. Check email sent from user's address
4. Verify deliverability

---

## Security Considerations

### ✅ DO:
- Encrypt SMTP passwords in database
- Use HTTPS for all API calls
- Validate email config before saving
- Rate limit email sending
- Log all email activity

### ❌ DON'T:
- Store passwords in plain text
- Log passwords in console
- Share credentials between users
- Skip encryption

---

## Gmail App Password Instructions for Users

Add this to your onboarding docs:

**How to Get Your Gmail App Password:**

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already)
3. Go to: https://myaccount.google.com/apppasswords
4. Select:
   - App: **Mail**
   - Device: **Other (VoiceFlow CRM)**
5. Click **Generate**
6. Copy the 16-character password
7. Paste into VoiceFlow Settings → Email Configuration

---

## Summary

**Recommended Solution:** **Approach 1** (User's Own Credentials)

This allows each subscriber to:
- ✅ Send from their own email
- ✅ Use their own branding
- ✅ Scale independently
- ✅ Professional appearance

The User model is already updated. Next steps:
1. Create email settings page
2. Add backend routes
3. Update n8n workflow
4. Test with multiple users

Let me know if you want me to implement any of these pieces!
