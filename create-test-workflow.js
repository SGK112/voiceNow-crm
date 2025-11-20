import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';

dotenv.config();

// Simple workflow schema (not using full model to avoid dependencies)
const workflowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  nodes: Array,
  edges: Array,
  status: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Workflow = mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);

async function createTestWorkflow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find test user
    const testUser = await User.findOne({ email: 'test@test.com' });

    if (!testUser) {
      console.log('❌ Test user not found. Please login first.');
      process.exit(1);
    }

    console.log('✅ Found test user:', testUser.email);

    // Create a simple customer support workflow
    const testWorkflow = {
      userId: testUser._id,
      name: 'Test Customer Support Agent',
      description: 'A simple test workflow for customer support with voice, prompt, and call handling',
      status: 'draft',
      nodes: [
        // 1. Inbound Call Node (Entry point)
        {
          id: 'node-1',
          type: 'inboundCall',
          position: { x: 100, y: 100 },
          data: {
            label: 'Inbound Call',
            twilioNumber: '+1234567890',
            friendlyName: 'Support Line'
          }
        },
        // 2. Voice Node (Select AI voice)
        {
          id: 'node-2',
          type: 'voice',
          position: { x: 100, y: 250 },
          data: {
            label: 'AI Voice',
            voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
            voiceName: 'Sarah - Friendly Female'
          }
        },
        // 3. Prompt Node (Agent personality)
        {
          id: 'node-3',
          type: 'prompt',
          position: { x: 100, y: 400 },
          data: {
            label: 'System Prompt',
            prompt: 'You are a friendly and helpful customer support agent. Your name is Alex. You help customers with their questions about our products and services. Be professional, empathetic, and concise in your responses.',
            firstMessage: 'Hello! Thank you for calling. My name is Alex, and I\'m here to help you today. How can I assist you?'
          }
        },
        // 4. AI Intent Node (Understand customer need)
        {
          id: 'node-4',
          type: 'aiIntent',
          position: { x: 400, y: 250 },
          data: {
            label: 'Detect Intent',
            intents: [
              { name: 'product_inquiry', description: 'Customer asking about products' },
              { name: 'support_issue', description: 'Customer has a problem' },
              { name: 'billing_question', description: 'Customer asking about billing' }
            ]
          }
        },
        // 5. AI Decision Node (Route based on intent)
        {
          id: 'node-5',
          type: 'aiDecision',
          position: { x: 700, y: 250 },
          data: {
            label: 'Route Call',
            decisionPrompt: 'Based on the customer intent, decide the best action',
            options: ['Transfer to Sales', 'Transfer to Support', 'Handle with AI', 'Collect Info']
          }
        },
        // 6. Knowledge Base Node (Company info)
        {
          id: 'node-6',
          type: 'knowledge',
          position: { x: 400, y: 450 },
          data: {
            label: 'Company Knowledge',
            documents: [],
            urls: ['https://example.com/faq', 'https://example.com/products']
          }
        },
        // 7. Calendar Node (Book appointment)
        {
          id: 'node-7',
          type: 'calendar',
          position: { x: 1000, y: 150 },
          data: {
            label: 'Book Callback',
            calendarType: 'google',
            duration: 30
          }
        },
        // 8. Human Handoff Node (Transfer to agent)
        {
          id: 'node-8',
          type: 'humanHandoff',
          position: { x: 1000, y: 350 },
          data: {
            label: 'Transfer to Agent',
            department: 'Support',
            transferNumber: '+1234567891'
          }
        }
      ],
      edges: [
        // Connect Inbound Call → Voice
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'default',
          animated: true
        },
        // Connect Voice → Prompt
        {
          id: 'edge-2',
          source: 'node-2',
          target: 'node-3',
          type: 'default',
          animated: true
        },
        // Connect Prompt → AI Intent
        {
          id: 'edge-3',
          source: 'node-3',
          target: 'node-4',
          type: 'default',
          animated: true
        },
        // Connect AI Intent → AI Decision
        {
          id: 'edge-4',
          source: 'node-4',
          target: 'node-5',
          type: 'default',
          animated: true
        },
        // Connect Prompt → Knowledge Base
        {
          id: 'edge-5',
          source: 'node-3',
          target: 'node-6',
          type: 'default'
        },
        // Connect AI Decision → Calendar
        {
          id: 'edge-6',
          source: 'node-5',
          target: 'node-7',
          type: 'default',
          label: 'Book Appointment'
        },
        // Connect AI Decision → Human Handoff
        {
          id: 'edge-7',
          source: 'node-5',
          target: 'node-8',
          type: 'default',
          label: 'Transfer'
        }
      ]
    };

    // Check if test workflow already exists
    const existing = await Workflow.findOne({
      userId: testUser._id,
      name: 'Test Customer Support Agent'
    });

    if (existing) {
      console.log('✅ Test workflow already exists');
      console.log('📝 Workflow ID:', existing._id);
      console.log('🔗 Open it at: http://localhost:5173/app/voiceflow-builder/' + existing._id);
    } else {
      // Create new workflow
      const workflow = await Workflow.create(testWorkflow);
      console.log('✅ Test workflow created successfully!');
      console.log('📝 Workflow ID:', workflow._id);
      console.log('🔗 Open it at: http://localhost:5173/app/voiceflow-builder/' + workflow._id);
    }

    console.log('\n📋 Workflow Details:');
    console.log('   Name: Test Customer Support Agent');
    console.log('   Nodes: 8 (Inbound Call, Voice, Prompt, AI Intent, AI Decision, Knowledge, Calendar, Human Handoff)');
    console.log('   Edges: 7 connections');
    console.log('\n🧪 How to Test:');
    console.log('   1. Login at: http://localhost:5173/login');
    console.log('   2. Go to VoiceFlow Builder');
    console.log('   3. Look for "Test Customer Support Agent" workflow');
    console.log('   4. Click to edit and test!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test workflow:', error.message);
    process.exit(1);
  }
}

createTestWorkflow();
