/**
 * Update Workflow Spam Detection to be MUCH more lenient
 *
 * Only blocks truly obvious spam, not legitimate customers
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

const visualWorkflowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  description: String,
  nodes: Array,
  edges: Array,
  status: String,
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const VisualWorkflow = mongoose.models.VisualWorkflow || mongoose.model('VisualWorkflow', visualWorkflowSchema);

// Find the workflow
const workflow = await VisualWorkflow.findOne({ name: 'Surprise Granite Promo Lead Handler' });

if (!workflow) {
  console.error('❌ Workflow not found!');
  process.exit(1);
}

console.log('📋 Found workflow:', workflow._id);

// Update the spam detection node with MUCH more lenient rules
const spamDetectionNode = workflow.nodes.find(n => n.id === 'spam_detection');

if (spamDetectionNode) {
  spamDetectionNode.data.parameters.code = `
// VERY LENIENT spam detection - only block obvious bots/spam
const email = input.email || '';
const message = input.message || '';
const phone = input.phone || '';
const name = input.full_name || input.first_name || '';

let spamScore = 0;
const spamReasons = [];

// ONLY block truly obvious spam patterns
const obviousSpamKeywords = ['viagra', 'cialis', 'casino', 'lottery', 'winner', 'click here now', 'act now', 'limited time', 'buy now', 'free money', 'nigerian prince'];
const hasObviousSpam = obviousSpamKeywords.some(keyword =>
  email.toLowerCase().includes(keyword) ||
  message.toLowerCase().includes(keyword) ||
  name.toLowerCase().includes(keyword)
);

if (hasObviousSpam) {
  spamScore += 100;
  spamReasons.push('Obvious spam keywords detected');
}

// Block only if email is COMPLETELY invalid (no @ at all, or obvious fake)
const isFakeEmail = email.includes('test@test') ||
                     email.includes('fake@fake') ||
                     email.includes('spam@spam') ||
                     (!email.includes('@') && email.length > 0);

if (isFakeEmail) {
  spamScore += 100;
  spamReasons.push('Obviously fake email');
}

// Block if name is clearly bot-generated (like "asdfasdf" or all numbers)
const isBotName = /^[a-z]{10,}$/.test(name.toLowerCase()) || // "asdfghjkl"
                   /^\\d+$/.test(name) || // all numbers
                   name.toLowerCase().includes('test test');

if (isBotName) {
  spamScore += 100;
  spamReasons.push('Bot-generated name');
}

// Block if multiple submissions from same email in short time (would need database check)
// For now, we'll skip this

// Everything else is LEGIT - we want to call customers!
output = {
  ...input,
  isSpam: spamScore >= 100,
  isQuarantined: false, // Don't quarantine anything - either spam or legit
  isLegit: spamScore < 100,
  spamScore,
  spamReasons: spamReasons.length > 0 ? spamReasons : ['Clean submission']
};
  `.trim();

  console.log('✅ Updated spam detection code');
}

// Update the routing conditions to match new logic
const routeNode = workflow.nodes.find(n => n.id === 'route_spam');
if (routeNode) {
  routeNode.data.parameters.conditions = [
    { field: 'isSpam', operator: 'equals', value: true, label: 'Spam' },
    { field: 'isLegit', operator: 'equals', value: true, label: 'Legit' }
  ];
  console.log('✅ Updated routing conditions (removed quarantine)');
}

workflow.updatedAt = new Date();
await workflow.save();

console.log('\n✅ Workflow updated successfully!');
console.log('\n📊 New Spam Detection Rules:');
console.log('   ❌ BLOCKS (Score 100):');
console.log('      - Obvious spam keywords (viagra, casino, lottery, etc.)');
console.log('      - Fake emails (test@test, fake@fake, etc.)');
console.log('      - Bot names (asdfghjkl, all numbers, etc.)');
console.log('\n   ✅ ALLOWS (Score 0):');
console.log('      - Everything else!');
console.log('      - Missing phone numbers');
console.log('      - Unusual email formats (as long as has @)');
console.log('      - Short names');
console.log('      - Any real customer submission');

console.log('\n🎯 Result: MUCH more lenient - lets real customers through!');

await mongoose.disconnect();
console.log('\n✅ Done!');
