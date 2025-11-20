import mongoose from 'mongoose';
import callRoutingService from './backend/services/callRoutingService.js';
import VoiceAgent from './backend/models/VoiceAgent.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRouting() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const phoneNumber = '+16028334780';
    const callerNumber = '+14805551234';

    // Check agents
    console.log('📱 Checking agents for', phoneNumber);
    const agents = await VoiceAgent.find({
      phoneNumber: phoneNumber,
      enabled: true
    });

    console.log(`Found ${agents.length} agents:\n`);
    agents.forEach(agent => {
      console.log(`  ${agent.callDirection === 'inbound' ? '📥' : '📤'} ${agent.name}`);
      console.log(`     - Direction: ${agent.callDirection}`);
      console.log(`     - Priority: ${agent.priority}`);
      console.log(`     - Status: ${agent.status}`);
      console.log(`     - Enabled: ${agent.enabled}\n`);
    });

    // Test inbound call routing
    console.log('🔄 Testing INBOUND call routing...');
    console.log(`   From: ${callerNumber}`);
    console.log(`   To: ${phoneNumber}\n`);

    try {
      const selectedAgent = await callRoutingService.routeCall(
        phoneNumber,
        callerNumber,
        { routingStrategy: 'caller' }
      );

      console.log('✅ Routing successful!');
      console.log(`   Selected: ${selectedAgent.name}`);
      console.log(`   Direction: ${selectedAgent.callDirection}`);
      console.log(`   Priority: ${selectedAgent.priority}\n`);
    } catch (error) {
      console.error('❌ Routing failed:', error.message);
    }

    // Test with higher priority (should select inbound agent with priority 10)
    console.log('🔄 Testing with default priority routing...');
    try {
      const selectedAgent2 = await callRoutingService.routeCall(
        phoneNumber,
        callerNumber,
        { routingStrategy: 'default' }
      );

      console.log('✅ Routing successful!');
      console.log(`   Selected: ${selectedAgent2.name}`);
      console.log(`   Direction: ${selectedAgent2.callDirection}`);
      console.log(`   Priority: ${selectedAgent2.priority}`);
      console.log(`   First Message: ${selectedAgent2.firstMessage.substring(0, 80)}...`);
    } catch (error) {
      console.error('❌ Routing failed:', error.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRouting();
