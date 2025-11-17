#!/usr/bin/env node

/**
 * Test Agent Creation and Call Flow
 * This script tests the complete flow:
 * 1. Create an agent in the database
 * 2. Initiate a test call
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import VoiceAgent from './backend/models/VoiceAgent.js';
import User from './backend/models/User.js';
import TwilioService from './backend/services/twilioService.js';

dotenv.config();

const TEST_PHONE_NUMBER = process.argv[2] || '+1YOUR_NUMBER_HERE';

async function testAgentFlow() {
  try {
    console.log('\n🧪 VOICEFLOW CRM - AGENT & CALL TEST\n');
    console.log('='.repeat(60));

    // Connect to MongoDB
    console.log('\n1️⃣  Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ Connected to MongoDB');

    // Find an existing user (use the first one)
    console.log('\n2️⃣  Finding user...');
    let user = await User.findOne({});

    if (!user) {
      console.log('   ❌ No users found in database');
      console.log('   Please create a user by signing up in the UI first');
      process.exit(1);
    }

    console.log('   ✅ Using user:', user.email);

    // Create a test agent
    console.log('\n3️⃣  Creating test agent...');
    const testAgent = await VoiceAgent.create({
      userId: user._id,
      name: 'Test Lead Qualifier',
      type: 'custom',
      elevenLabsAgentId: `local_${Date.now()}_test`,
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
      voiceName: 'Sarah',
      script: `You are a friendly lead qualification agent for a test company.

Your goal is to qualify leads and gather information.

Be professional, friendly, and concise.`,
      firstMessage: 'Hi! This is a test call from VoiceFlow CRM. Can you hear me?',
      enabled: true,
      configuration: {
        temperature: 0.8,
        maxDuration: 300,
        language: 'en',
        purpose: 'Test lead qualification',
        main_message: 'Testing VoiceFlow CRM calling functionality'
      },
      availability: {
        enabled: true,
        timezone: 'America/New_York',
        hours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      }
    });

    console.log('   ✅ Agent created successfully!');
    console.log('   📋 Agent ID:', testAgent._id);
    console.log('   📱 Agent Name:', testAgent.name);
    console.log('   🎙️  Voice:', testAgent.voiceName);

    // Test Twilio connection
    console.log('\n4️⃣  Testing Twilio connection...');
    const twilioService = new TwilioService();

    if (!twilioService.client) {
      console.log('   ❌ Twilio not configured');
      console.log('   Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
      process.exit(1);
    }
    console.log('   ✅ Twilio connected');

    // Initiate test call
    if (TEST_PHONE_NUMBER === '+1YOUR_NUMBER_HERE') {
      console.log('\n⚠️  No phone number provided!');
      console.log('   Usage: node test-agent-flow.js +1234567890');
      console.log('\n✅ Agent created successfully! Use the UI to test calling.');
    } else {
      console.log('\n5️⃣  Initiating test call...');
      console.log('   📞 Calling:', TEST_PHONE_NUMBER);
      console.log('   📱 From:', process.env.TWILIO_PHONE_NUMBER);
      console.log('   🤖 Agent:', testAgent.name);

      const baseUrl = process.env.WEBHOOK_URL || process.env.API_URL || 'http://localhost:5000';
      const twimlUrl = `${baseUrl}/api/webhooks/twilio/agent-call?agentId=${testAgent._id}`;
      const statusCallback = `${baseUrl}/api/webhooks/twilio/call-status`;

      console.log('   🌐 Webhook URL:', baseUrl);

      const call = await twilioService.makeCall(
        process.env.TWILIO_PHONE_NUMBER,
        TEST_PHONE_NUMBER,
        twimlUrl,
        statusCallback
      );

      console.log('   ✅ Call initiated!');
      console.log('   📞 Call SID:', call.sid);
      console.log('   📊 Status:', call.status);
      console.log('\n   🎧 Answer your phone to hear the test message!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE!\n');
    console.log('Agent Details:');
    console.log('  - ID:', testAgent._id);
    console.log('  - Name:', testAgent.name);
    console.log('  - Voice:', testAgent.voiceName);
    console.log('\nYou can now:');
    console.log('  1. View this agent in the UI at http://localhost:5173');
    console.log('  2. Make calls using the "Test Call" feature');
    console.log('  3. See call logs in the dashboard\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB\n');
    process.exit(0);
  }
}

testAgentFlow();
