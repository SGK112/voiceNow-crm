/**
 * Add Surprise Granite Promo Workflow to Template Library
 *
 * Makes it available as a template for all users
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

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
  previewImage: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const VisualWorkflow = mongoose.models.VisualWorkflow || mongoose.model('VisualWorkflow', visualWorkflowSchema);

// Find the original workflow
const originalWorkflow = await VisualWorkflow.findOne({ name: 'Surprise Granite Promo Lead Handler' });

if (!originalWorkflow) {
  console.error('❌ Original workflow not found!');
  process.exit(1);
}

console.log('📋 Found original workflow:', originalWorkflow._id);

// Create a template version
const templateWorkflow = {
  name: 'Promo Lead Handler with Auto-Calling',
  description: 'Automatically handle promo form submissions with spam protection, email confirmation, Google Sheets logging, and instant ElevenLabs calling. Perfect for contractors, remodelers, and service businesses.',
  nodes: originalWorkflow.nodes,
  edges: originalWorkflow.edges,
  status: 'template',
  isTemplate: true,
  category: 'lead_generation',
  icon: '🎯',
  tags: ['lead generation', 'promo', 'auto-calling', 'elevenlabs', 'spam protection', 'email', 'google sheets'],
  userId: null, // Template workflows don't belong to a specific user
  createdAt: new Date(),
  updatedAt: new Date()
};

const template = await VisualWorkflow.create(templateWorkflow);

console.log('\n✅ Template created successfully!');
console.log('   Template ID:', template._id);
console.log('   Name:', template.name);
console.log('   Category:', template.category);
console.log('   Tags:', template.tags.join(', '));

console.log('\n📊 Template Features:');
console.log('   ✅ Webhook trigger for promo forms');
console.log('   ✅ Smart spam detection (very lenient)');
console.log('   ✅ Email alerts for spam');
console.log('   ✅ Google Sheets logging');
console.log('   ✅ Beautiful confirmation email');
console.log('   ✅ 30-second delay before calling');
console.log('   ✅ ElevenLabs auto-calling with dynamic variables');
console.log('   ✅ Webhook response');

console.log('\n🎯 Use Cases:');
console.log('   - Promo/Special Offer forms');
console.log('   - Quote request forms');
console.log('   - "Call Me Now" buttons');
console.log('   - Lead magnets');
console.log('   - Free estimate requests');

console.log('\n📚 Template is now available in the workflow library!');
console.log('   Users can clone it and customize for their business');

await mongoose.disconnect();
console.log('\n✅ Done!');
