import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import emailService from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function testEmailService() {
  console.log('\n🧪 Testing Email Service...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com (default)'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '587 (default)'}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ NOT SET'}`);
  console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   SMTP_FROM_NAME: ${process.env.SMTP_FROM_NAME || 'VoiceNow CRM (default)'}`);
  console.log('');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP credentials not configured in .env file');
    console.log('\nPlease add to your .env file:');
    console.log('SMTP_USER=help.remodely@gmail.com');
    console.log('SMTP_PASSWORD=your-gmail-app-password');
    console.log('\nTo get a Gmail App Password:');
    console.log('1. Go to https://myaccount.google.com/apppasswords');
    console.log('2. Create a new app password for "VoiceNow CRM"');
    console.log('3. Copy the 16-character password to your .env file\n');
    process.exit(1);
  }

  // Test 1: Verify connection
  console.log('🔌 Test 1: Verifying SMTP connection...');
  try {
    const verified = await emailService.verifyConnection();
    if (verified) {
      console.log('✅ SMTP connection verified!\n');
    } else {
      console.error('❌ SMTP connection failed\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('- Make sure you\'re using a Gmail App Password (not your regular password)');
    console.log('- Check that 2FA is enabled on your Gmail account');
    console.log('- Verify the email address is correct\n');
    process.exit(1);
  }

  // Test 2: Send a simple test email
  console.log('📧 Test 2: Sending test email to help.remodely@gmail.com...');
  try {
    const result = await emailService.sendEmail({
      to: 'help.remodely@gmail.com',
      subject: '🧪 VoiceNow CRM Email Test',
      html: `
        <h2>Email Service Test</h2>
        <p>This is a test email from VoiceNow CRM.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>✅ Email service is working!</h3>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> ${process.env.SMTP_USER}</p>
        </div>
        <p>You can now receive:</p>
        <ul>
          <li>Post-call notifications</li>
          <li>Lead alerts</li>
          <li>Appointment confirmations</li>
          <li>Customer follow-ups</li>
        </ul>
      `,
      text: `
        Email Service Test

        This is a test email from VoiceNow CRM.

        ✅ Email service is working!

        Sent at: ${new Date().toLocaleString()}
        From: ${process.env.SMTP_USER}

        You can now receive:
        - Post-call notifications
        - Lead alerts
        - Appointment confirmations
        - Customer follow-ups
      `
    });

    console.log(`✅ Test email sent successfully!`);
    console.log(`   Message ID: ${result.messageId}\n`);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    process.exit(1);
  }

  // Test 3: Send a mock post-call notification
  console.log('📞 Test 3: Sending mock post-call notification...');
  try {
    const result = await emailService.sendEmail({
      to: 'help.remodely@gmail.com',
      subject: 'New Call Completed - Test Customer',
      html: `
        <h2>📞 Call Summary</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> Test Customer</p>
          <p><strong>Email:</strong> test@example.com</p>
          <p><strong>Phone:</strong> +1 (555) 123-4567</p>
          <p><strong>Business Type:</strong> Test Business</p>
        </div>

        <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Details</h3>
          <p><strong>Call ID:</strong> test-call-123</p>
          <p><strong>Duration:</strong> 3 minutes</p>
          <p><strong>Outcome:</strong> Completed</p>
          <p><strong>Interested:</strong> ✅ YES</p>
          <p><strong>Notes:</strong> This is a test notification</p>
        </div>

        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Transcript</h3>
          <p style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">Agent: Hey! This is the AI from Remodely calling...
Customer: Hi there!
Agent: What kind of business are you in?
Customer: I'm a contractor.
Agent: Cool! Would that be helpful for you?
Customer: Yes, definitely interested!</p>
        </div>

        <p><strong>Action Required:</strong> Follow up with this hot lead!</p>
      `
    });

    console.log(`✅ Mock post-call notification sent!`);
    console.log(`   Message ID: ${result.messageId}\n`);
  } catch (error) {
    console.error('❌ Failed to send post-call notification:', error.message);
    process.exit(1);
  }

  console.log('🎉 All email tests passed!\n');
  console.log('✅ Email service is fully configured and working');
  console.log('✅ Check help.remodely@gmail.com for the test emails\n');

  process.exit(0);
}

testEmailService();
