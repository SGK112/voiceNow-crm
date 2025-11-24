/**
 * Configure Twilio SMS Webhook for Aria
 *
 * This script automatically configures your Twilio phone number
 * to forward incoming SMS to Aria's AI processing endpoint
 */

import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function configureWebhook() {
  try {
    console.log('🔧 Configuring Twilio SMS webhook for Aria...\n');
    console.log(`Phone Number: ${phoneNumber}`);

    // Prompt for webhook URL
    console.log('\n📝 What is your backend webhook URL?');
    console.log('Examples:');
    console.log('  - Production: https://api.yourcompany.com/api/webhooks/twilio/sms');
    console.log('  - Development (ngrok): https://abc123.ngrok.io/api/webhooks/twilio/sms');
    console.log('  - Local (if publicly accessible): https://your-ip:5001/api/webhooks/twilio/sms');

    // Use the WEBHOOK_URL from .env (ngrok or production URL)
    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/twilio/sms`
      : process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/webhooks/twilio/sms`
      : 'http://192.168.0.151:5001/api/webhooks/twilio/sms';

    console.log(`\n✅ Using webhook URL: ${webhookUrl}`);

    if (!process.env.WEBHOOK_URL && !process.env.BACKEND_URL) {
      console.log('\n⚠️  WARNING: Using local IP - this will NOT work unless publicly accessible!');
      console.log('Set WEBHOOK_URL in .env to your ngrok or production URL.\n');
    }

    // Get all phone numbers
    console.log('🔍 Finding your Twilio phone number...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    });

    if (phoneNumbers.length === 0) {
      console.error(`❌ Phone number ${phoneNumber} not found in your Twilio account`);
      console.log('\n📋 Available phone numbers:');
      const allNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
      allNumbers.forEach(num => {
        console.log(`  - ${num.phoneNumber} (${num.friendlyName})`);
      });
      process.exit(1);
    }

    const phoneNumberSid = phoneNumbers[0].sid;
    console.log(`✅ Found: ${phoneNumbers[0].friendlyName || phoneNumber}`);
    console.log(`   SID: ${phoneNumberSid}\n`);

    // Update the phone number with SMS webhook
    console.log('🚀 Configuring SMS webhook...');
    const updatedNumber = await client
      .incomingPhoneNumbers(phoneNumberSid)
      .update({
        smsUrl: webhookUrl,
        smsMethod: 'POST',
        smsFallbackUrl: webhookUrl.replace('/sms', '/sms-fallback'),
        smsFallbackMethod: 'POST'
      });

    console.log('\n✅ SUCCESS! Twilio SMS webhook configured!\n');
    console.log('Configuration:');
    console.log(`  Phone Number: ${updatedNumber.phoneNumber}`);
    console.log(`  SMS Webhook: ${updatedNumber.smsUrl}`);
    console.log(`  Method: ${updatedNumber.smsMethod}`);
    console.log(`  Fallback: ${updatedNumber.smsFallbackUrl}`);
    console.log('\n🎉 Aria is now ready to receive SMS messages!');
    console.log('\n📱 Test it by texting: "Hello Aria" to', phoneNumber);
    console.log('\n💡 Tips:');
    console.log('  - Watch server logs: tail -f logs/server.log');
    console.log('  - Test CRM query: "How many leads do I have?"');
    console.log('  - Test capabilities: "Search the web for weather in NYC"');
    console.log('  - View Twilio logs: https://console.twilio.com/us1/monitor/logs/sms');

  } catch (error) {
    console.error('\n❌ Error configuring webhook:', error.message);

    if (error.code === 20404) {
      console.error('\n💡 The phone number might not exist in your account.');
      console.error('Double-check TWILIO_PHONE_NUMBER in your .env file.');
    } else if (error.code === 20003) {
      console.error('\n💡 Authentication failed. Check your Twilio credentials.');
      console.error('Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    } else if (error.code === 21608) {
      console.error('\n💡 The webhook URL is not valid or not reachable.');
      console.error('Make sure your backend is publicly accessible.');
      console.error('For local dev, use: npx ngrok http 5001');
    }

    console.error('\n📚 Full error details:', error);
    process.exit(1);
  }
}

// Run the configuration
configureWebhook();
