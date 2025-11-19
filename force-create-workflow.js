import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';

dotenv.config();

async function forceCreateWorkflow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define visual workflow schema (matches controller's VisualWorkflow)
    const visualWorkflowSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      description: String,
      nodes: Array,
      edges: Array,
      status: String,
      isTemplate: Boolean,
      category: String,
      icon: String,
      tags: [String],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { strict: false });

    const VisualWorkflow = mongoose.models.VisualWorkflow || mongoose.model('VisualWorkflow', visualWorkflowSchema);

    // Find logged-in user (help.remodely@gmail.com is currently logged in)
    const testUser = await User.findOne({ email: 'help.remodely@gmail.com' });
    if (!testUser) {
      console.log('❌ User not found');
      process.exit(1);
    }
    console.log('✅ Found user:', testUser.email);

    // Delete any existing test workflows
    const deleted = await VisualWorkflow.deleteMany({ name: 'Test Customer Support Agent' });
    console.log('🗑️  Deleted', deleted.deletedCount, 'old workflows');

    // Create new workflow
    const workflow = await VisualWorkflow.create({
      userId: testUser._id,
      name: 'Test Customer Support Agent',
      description: 'A simple test workflow for customer support',
      status: 'draft',
      nodes: [
        { id: 'node-1', type: 'inboundCall', position: { x: 100, y: 100 }, data: { label: 'Inbound Call', twilioNumber: '+1234567890', friendlyName: 'Support Line' } },
        { id: 'node-2', type: 'voice', position: { x: 100, y: 250 }, data: { label: 'AI Voice', voiceId: 'EXAVITQu4vr4xnSDxMaL', voiceName: 'Sarah - Friendly Female' } },
        { id: 'node-3', type: 'prompt', position: { x: 100, y: 400 }, data: { label: 'System Prompt', prompt: 'You are a friendly customer support agent named Alex.', firstMessage: 'Hello! How can I help you?' } },
        { id: 'node-4', type: 'aiIntent', position: { x: 400, y: 250 }, data: { label: 'Detect Intent', intents: [] } },
        { id: 'node-5', type: 'aiDecision', position: { x: 700, y: 250 }, data: { label: 'Route Call', decisionPrompt: 'Route the call', options: [] } },
        { id: 'node-6', type: 'knowledge', position: { x: 400, y: 450 }, data: { label: 'Company Knowledge', documents: [], urls: [] } },
        { id: 'node-7', type: 'calendar', position: { x: 1000, y: 150 }, data: { label: 'Book Callback', calendarType: 'google', duration: 30 } },
        { id: 'node-8', type: 'humanHandoff', position: { x: 1000, y: 350 }, data: { label: 'Transfer to Agent', department: 'Support' } }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'default', animated: true },
        { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'default', animated: true },
        { id: 'edge-3', source: 'node-3', target: 'node-4', type: 'default', animated: true },
        { id: 'edge-4', source: 'node-4', target: 'node-5', type: 'default', animated: true },
        { id: 'edge-5', source: 'node-3', target: 'node-6', type: 'default' },
        { id: 'edge-6', source: 'node-5', target: 'node-7', type: 'default', label: 'Book Appointment' },
        { id: 'edge-7', source: 'node-5', target: 'node-8', type: 'default', label: 'Transfer' }
      ]
    });

    console.log('✅ Workflow created successfully!');
    console.log('📝 Workflow ID:', workflow._id.toString());
    console.log('🔗 Open at: http://localhost:5173/app/voiceflow-builder/' + workflow._id.toString());
    console.log('\n📊 Workflow contains:');
    console.log('   - 8 nodes');
    console.log('   - 7 connections');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

forceCreateWorkflow();
