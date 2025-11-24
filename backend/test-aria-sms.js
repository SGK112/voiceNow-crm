/**
 * Test Aria SMS Integration
 *
 * This script simulates an incoming SMS to test Aria's AI processing
 * without needing to send an actual text message
 */

import ariaSMSService from './services/ariaSMSService.js';
import AgentSMS from './models/AgentSMS.js';
import Lead from './models/Lead.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceflow-crm');

console.log('🧪 Testing Aria SMS Integration\n');
console.log('=' .repeat(60));

async function testSMS() {
  try {
    // Test message
    const testPhone = '+1234567890';
    const testMessage = 'Hello Aria! How many leads do I have?';

    console.log(`\n📱 Simulating SMS from: ${testPhone}`);
    console.log(`💬 Message: "${testMessage}"\n`);

    // Look for an existing lead (or create a test one)
    let lead = await Lead.findOne({ phone: testPhone });

    if (!lead) {
      console.log('📝 Creating test lead...');
      lead = await Lead.create({
        name: 'Test User',
        phone: testPhone,
        email: 'test@example.com',
        status: 'new',
        source: 'SMS Test'
      });
      console.log(`✅ Created test lead: ${lead.name}\n`);
    } else {
      console.log(`✅ Found existing lead: ${lead.name}\n`);
    }

    // Create SMS record
    const smsRecord = await AgentSMS.create({
      userId: lead.userId,
      leadId: lead._id,
      direction: 'inbound',
      from: testPhone,
      to: process.env.TWILIO_PHONE_NUMBER,
      message: testMessage,
      status: 'received',
      twilioSid: 'TEST_' + Date.now()
    });

    console.log('🤖 Processing with Aria...\n');
    console.log('-'.repeat(60));

    // Process with Aria
    const result = await ariaSMSService.processWithAria({
      from: testPhone,
      to: process.env.TWILIO_PHONE_NUMBER,
      message: testMessage,
      smsRecord,
      lead,
      agent: null
    });

    console.log('-'.repeat(60));
    console.log('\n✅ Test completed successfully!\n');
    console.log('Result:');
    console.log(`  Response: "${result.response}"`);
    console.log(`  Functions used: ${result.functionsUsed}`);
    console.log(`  Success: ${result.success}`);

    console.log('\n💾 Check your database:');
    console.log(`  - AgentSMS collection for message logs`);
    console.log(`  - Look for direction: 'outbound' with metadata.type: 'aria_ai_response'`);

    console.log('\n🎉 Aria SMS integration is working!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('  1. Check that OPENAI_API_KEY is set in .env');
    console.log('  2. Verify Twilio credentials are configured');
    console.log('  3. Ensure MongoDB is connected');
    console.log('  4. Review server logs for detailed errors');
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from database\n');
  }
}

testSMS();
