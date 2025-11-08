# Gmail SMTP Setup for n8n - Works Immediately!

## Using Gmail Instead of SendGrid

Gmail SMTP works right away - no approval needed! You can use your existing `help.remodely@gmail.com` account.

## Step 1: Get Gmail App Password

You mentioned you already have an app password. If you need a new one:

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with `help.remodely@gmail.com`
3. Click **"Create"** or **"Generate"**
4. Name it: `voiceflow-crm-n8n`
5. Click **"Create"**
6. **Copy the 16-character password** (looks like: `xxxx xxxx xxxx xxxx`)
7. Remove the spaces - final format: `xxxxxxxxxxxxxxxx`

**Important:** This is different from your regular Gmail password!

## Step 2: Add Gmail SMTP Credential to n8n

1. Go to: https://remodely.app.n8n.cloud/credentials

2. Click **"Add Credential"**

3. Search for **"SMTP"** (NOT Gmail - use generic SMTP)

4. Select **"SMTP"**

5. Fill in the form:

```
Credential Name: gmail_smtp
User: help.remodely@gmail.com
Password: [paste your app password - no spaces]
Host: smtp.gmail.com
Port: 587
Security: TLS

SSL: No
Ignore SSL Issues: No
```

6. Click **"Test"** to verify it works

7. Click **"Save"**

## Step 3: Update Email Workflow to Use Gmail

Now we need to change the workflow from SendGrid to Gmail SMTP.

### Manual Method (Quick):

1. Go to: https://remodely.app.n8n.cloud/workflow/5BqXWOZbZ2H22tuw

2. Click on the **"Send an email"** node (currently SendGrid)

3. **Delete this node** (select it and press Delete)

4. Add a new **"Send Email"** node:
   - Click the **"+"** button
   - Search for **"Send Email"**
   - Select **"Send Email"** (the generic one)

5. Configure the new node:
   ```
   Credential: gmail_smtp
   From Email: help.remodely@gmail.com
   From Name: VoiceFlow CRM
   To Email: ={{ $json.to }}
   Subject: ={{ $json.subject }}
   Email Type: HTML
   HTML: ={{ $json.html }}
   ```

6. Connect it to the **"Format Email"** node

7. Click **"Save"** workflow

### Or Use Script (Automated):

I can create a script to update the workflow automatically. Would you like me to do that?

## Step 4: Test Gmail Email

Once configured, test it:

```bash
curl -X POST https://remodely.app.n8n.cloud/webhook/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "callData": {
      "caller_name": "John Doe",
      "email": "YOUR-EMAIL@example.com",
      "duration": 180,
      "agent_type": "lead_gen"
    },
    "config": {
      "emailSubject": "Thanks for your call with VoiceFlow!"
    }
  }'
```

**Replace `YOUR-EMAIL@example.com` with your actual email**

You should receive the email within seconds!

## Gmail SMTP Limits

**Free Gmail Account:**
- **Limit:** 500 emails per day
- **Rate:** ~2 emails per second
- **Perfect for:** Small to medium businesses

If you need more, you can:
- Use Google Workspace ($6/user/month) - 2,000 emails/day
- Add multiple Gmail accounts and rotate

## Troubleshooting

### "Invalid credentials" error

**Solution:**
- Make sure you're using the **App Password**, not your Gmail password
- Remove spaces from the app password
- Generate a new app password if needed

### "Authentication failed" error

**Solution:**
- Verify 2-Step Verification is enabled on your Google account
- Go to https://myaccount.google.com/security
- Enable 2-Step Verification first
- Then create app password

### Email goes to spam

**Solution:**
- Use a professional "From Name" (not "noreply")
- Add SPF/DKIM records to your domain (if using custom domain)
- Or keep using help.remodely@gmail.com (already trusted)

### "Daily sending limit exceeded"

**Solution:**
- You've sent 500 emails today
- Wait until tomorrow or upgrade to Google Workspace
- Or add another Gmail account

## Advantages of Gmail SMTP

✅ **Works immediately** - no approval needed
✅ **Free** - 500 emails/day
✅ **Reliable** - Gmail's infrastructure
✅ **Trusted** - high deliverability rates
✅ **Simple** - easy to set up

## When to Switch to SendGrid

Consider switching to SendGrid later when:
- You need more than 500 emails/day
- You want detailed analytics (opens, clicks)
- You need email templates
- You want better API features

But for now, Gmail SMTP is perfect!

## Quick Reference

**Gmail SMTP Settings:**
```
Host: smtp.gmail.com
Port: 587
Security: TLS
User: help.remodely@gmail.com
Password: [App Password]
```

**App Password URL:**
https://myaccount.google.com/apppasswords

**n8n Credentials:**
https://remodely.app.n8n.cloud/credentials

**Email Workflow:**
https://remodely.app.n8n.cloud/workflow/5BqXWOZbZ2H22tuw

## Next Steps

1. ✅ Get Gmail app password
2. ⏳ Add SMTP credential to n8n
3. ⏳ Update email workflow to use Gmail SMTP
4. ⏳ Test by sending yourself an email
5. ✅ Start sending automated follow-up emails!

Once this is set up, your email workflow will work perfectly with Gmail!
