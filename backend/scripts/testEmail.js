import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST before importing services
dotenv.config({ path: join(__dirname, '../../.env') });

// Now import the service after env vars are loaded
const { default: usageAlertService } = await import('../services/usageAlertService.js');

async function testEmail() {
  console.log('📧 Testing Email Notification...\n');

  // Test email
  const testEmail = process.env.SMTP_FROM_EMAIL || 'helpremodely@gmail.com';

  console.log(`📮 Sending test email to: ${testEmail}`);
  console.log(`📤 From: ${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`);
  console.log(`🔧 SMTP Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}\n`);

  try {
    const result = await usageAlertService.testEmail(testEmail);

    console.log('\n✅ EMAIL TEST SUCCESSFUL!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}`);
    console.log('\n📬 Check your inbox at', testEmail);

  } catch (error) {
    console.error('\n❌ EMAIL TEST FAILED!');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('Invalid login')) {
      console.error('\n   ⚠️  Authentication Error - Check your SMTP credentials:');
      console.error(`   SMTP_USER: ${process.env.SMTP_USER ? '✓ Set' : '✗ Missing'}`);
      console.error(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✓ Set' : '✗ Missing'}`);
      console.error('\n   💡 To generate an app password:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Sign in as helpremodely@gmail.com');
      console.error('   3. Create app password for "VoiceNow CRM"');
      console.error('   4. Add to .env as SMTP_PASSWORD=<16-char-password>');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n   ⚠️  Connection Error - Check SMTP host and port:');
      console.error(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
      console.error(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
    }
  }
}

testEmail();
