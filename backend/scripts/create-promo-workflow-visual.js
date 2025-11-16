/**
 * Create Surprise Granite Promo Workflow in VoiceFlow CRM Visual Builder
 *
 * This creates the workflow in MongoDB for the visual workflow builder
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Define a simple schema for visual workflows (different from the action-based one)
const visualWorkflowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  description: String,
  nodes: Array,
  edges: Array,
  status: { type: String, default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const VisualWorkflow = mongoose.models.VisualWorkflow || mongoose.model('VisualWorkflow', visualWorkflowSchema);

const workflow = {
  userId: '674237705b23b09208b435b4', // You'll need to update this to your actual user ID
  name: 'Surprise Granite Promo Lead Handler',
  description: 'Handles promo form submissions with spam detection, email confirmation, Google Sheets logging, and automated ElevenLabs calling',
  status: 'active',
  nodes: [
    // 1. Webhook Trigger
    {
      id: 'webhook_trigger',
      type: 'webhook',
      position: { x: 100, y: 300 },
      data: {
        nodeType: 'webhook',
        label: 'Promo Form Webhook',
        icon: '🎯',
        color: '#4CAF50',
        description: 'Receives promo form submissions',
        parameters: {
          path: 'surprise-granite-promo',
          method: 'POST'
        }
      }
    },

    // 2. Spam Detection
    {
      id: 'spam_detection',
      type: 'custom',
      position: { x: 350, y: 300 },
      data: {
        nodeType: 'code',
        label: 'Spam Detection',
        icon: '🛡️',
        color: '#FF9800',
        description: 'Analyzes submission for spam',
        parameters: {
          code: `
const email = input.email || '';
const message = input.message || '';
const phone = input.phone || '';

// Spam detection
const isSpam = email.includes('spam') || message.includes('spam');
const isMalicious = email.includes('hack') || message.includes('hack');
const hasInvalidEmail = !email.includes('@') || email.includes('test@');
const hasInvalidPhone = phone.length < 10;

const spamScore = (isSpam ? 100 : 0) + (isMalicious ? 100 : 0) +
                  (hasInvalidEmail ? 40 : 0) + (hasInvalidPhone ? 20 : 0);

const spamReasons = [];
if (isSpam) spamReasons.push('Contains spam keywords');
if (isMalicious) spamReasons.push('Malicious content detected');
if (hasInvalidEmail) spamReasons.push('Invalid email');
if (hasInvalidPhone) spamReasons.push('Invalid phone');

output = {
  ...input,
  isSpam: spamScore >= 100,
  isQuarantined: spamScore >= 40 && spamScore < 100,
  isLegit: spamScore < 40,
  spamScore,
  spamReasons
};
          `.trim()
        }
      }
    },

    // 3. Route by Spam Score
    {
      id: 'route_spam',
      type: 'custom',
      position: { x: 600, y: 300 },
      data: {
        nodeType: 'conditional',
        label: 'Route by Spam',
        icon: '🔀',
        color: '#2196F3',
        description: 'Routes based on spam score',
        parameters: {
          conditions: [
            { field: 'isSpam', operator: 'equals', value: true, label: 'Spam' },
            { field: 'isQuarantined', operator: 'equals', value: true, label: 'Quarantine' },
            { field: 'isLegit', operator: 'equals', value: true, label: 'Legit' }
          ]
        }
      }
    },

    // 4. Log Spam Branch
    {
      id: 'log_spam',
      type: 'custom',
      position: { x: 850, y: 150 },
      data: {
        nodeType: 'email',
        label: 'Log Spam',
        icon: '📧',
        color: '#F44336',
        description: 'Sends spam alert email',
        parameters: {
          to: 'info@surprisegranite.com',
          subject: '🚫 SPAM Blocked',
          body: 'SPAM BLOCKED\n\nScore: {{spamScore}}/100\nReasons: {{spamReasons}}\n\nName: {{full_name}}\nEmail: {{email}}\nPhone: {{phone}}'
        }
      }
    },

    // 5. Review Needed Branch
    {
      id: 'review_needed',
      type: 'custom',
      position: { x: 850, y: 300 },
      data: {
        nodeType: 'email',
        label: 'Review Needed',
        icon: '⚠️',
        color: '#FF9800',
        description: 'Sends review alert',
        parameters: {
          to: 'info@surprisegranite.com',
          subject: '⚠️ REVIEW NEEDED',
          body: 'FLAGGED FOR REVIEW\n\nScore: {{spamScore}}/100\nReasons: {{spamReasons}}\n\nName: {{full_name}}\nEmail: {{email}}\nPhone: {{phone}}'
        }
      }
    },

    // 6. Prepare Call Data (Legit Branch)
    {
      id: 'prepare_call',
      type: 'custom',
      position: { x: 850, y: 450 },
      data: {
        nodeType: 'code',
        label: 'Prepare Call Data',
        icon: '📞',
        color: '#4CAF50',
        description: 'Formats phone and data',
        parameters: {
          code: `
let phone = input.phone || '';
phone = phone.replace(/\\D/g, '');
if (phone.startsWith('1') && phone.length === 11) {
  phone = phone.substring(1);
}
phone = '+1' + phone;

const firstName = input.first_name || input.full_name?.split(' ')[0] || 'there';
const offer = input.promo_type || input.offer || 'Special Offer';

output = {
  ...input,
  phone,
  lead_name: firstName,
  offer_type: offer,
  address: input.address || '',
  project_type: input.project_type || ''
};
          `.trim()
        }
      }
    },

    // 7. Generate Custom Prompt
    {
      id: 'generate_prompt',
      type: 'custom',
      position: { x: 1100, y: 450 },
      data: {
        nodeType: 'code',
        label: 'Generate Prompt',
        icon: '✨',
        color: '#9C27B0',
        description: 'Creates personalized greeting',
        parameters: {
          code: `
const firstName = input.lead_name || 'there';
const customFirstMessage = \`Hey \${firstName}! This is Alex from Surprise Granite. How's your day going? I'm calling because you just reached out about one of our offers. Do you have a minute to chat about your project?\`;

output = {
  ...input,
  customer_name: firstName,
  customer_email: input.email || '',
  customer_address: input.address || 'your location',
  custom_first_message: customFirstMessage
};
          `.trim()
        }
      }
    },

    // 8. Log to Google Sheets
    {
      id: 'log_sheets',
      type: 'custom',
      position: { x: 1350, y: 450 },
      data: {
        nodeType: 'google_sheets',
        label: 'Log to Sheets',
        icon: '📊',
        color: '#34A853',
        description: 'Logs lead to Google Sheets',
        parameters: {
          action: 'append',
          spreadsheetId: '1AjBfvCloSKZg1WdHPvfWWCtD5p1xgUC-QEJFVuoNxaQ',
          sheetName: 'Sheet2',
          values: {
            timestamp: '{{now}}',
            call_direction: 'outbound',
            customer_name: '{{customer_name}}',
            customer_phone: '{{phone}}',
            customer_email: '{{customer_email}}',
            promo_type: '{{offer_type}}',
            project_type: '{{project_type}}'
          }
        }
      }
    },

    // 9. Send Confirmation Email
    {
      id: 'send_confirmation',
      type: 'custom',
      position: { x: 1600, y: 450 },
      data: {
        nodeType: 'email',
        label: 'Confirmation Email',
        icon: '📧',
        color: '#4CAF50',
        description: 'Sends confirmation to customer',
        parameters: {
          to: '{{customer_email}}',
          subject: '🎉 Your Exclusive Offer - We\'re Calling You!',
          htmlBody: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px;">
  <h2 style="color: #ffb300;">Hi {{customer_name}}!</h2>
  <p style="font-size: 18px; color: #222;">Thank you for your interest in our <strong>{{offer_type}}</strong>!</p>
  <div style="background: #f9f9f9; border-radius: 10px; padding: 28px 20px; text-align: center; margin: 28px 0;">
    <p style="font-size: 17px; color: #333;">A member of our team will be calling you shortly to discuss your project!</p>
    <p style="font-size: 15px; color: #666; margin-top: 18px;">
      Or call us directly at <span style="font-weight: bold; color: #ffb300;">(602) 833-3189</span>
    </p>
  </div>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 13px; color: #999;">
    Best regards,<br>
    <strong>Surprise Granite & Cabinetry</strong><br>
    15321 W Bell Rd, Surprise, AZ 85374
  </p>
</div>
          `.trim()
        }
      }
    },

    // 10. Wait 30 Seconds
    {
      id: 'wait_30sec',
      type: 'custom',
      position: { x: 1850, y: 450 },
      data: {
        nodeType: 'delay',
        label: 'Wait 30 Seconds',
        icon: '⏱️',
        color: '#FF9800',
        description: 'Delays before calling',
        parameters: {
          duration: 30,
          unit: 'seconds'
        }
      }
    },

    // 11. Call via ElevenLabs
    {
      id: 'call_elevenlabs',
      type: 'custom',
      position: { x: 2100, y: 450 },
      data: {
        nodeType: 'elevenlabs_call',
        label: 'Call Lead',
        icon: '📞',
        color: '#6366F1',
        description: 'Makes outbound call',
        parameters: {
          agentId: 'agent_9301k802kktwfbhrbe9bam7f1spe',
          phoneNumberId: 'phnum_1801k7xb68cefjv89rv10f90qykv',
          toNumber: '{{phone}}',
          dynamicVariables: {
            customer_name: '{{customer_name}}',
            promo_type: '{{offer_type}}',
            customer_address: '{{customer_address}}',
            project_type: '{{project_type}}'
          },
          firstMessage: '{{custom_first_message}}'
        }
      }
    },

    // 12. Respond to Webhook (final)
    {
      id: 'respond_webhook',
      type: 'custom',
      position: { x: 2350, y: 300 },
      data: {
        nodeType: 'webhook_response',
        label: 'Respond',
        icon: '✅',
        color: '#4CAF50',
        description: 'Sends response back',
        parameters: {
          statusCode: 200,
          body: {
            success: true,
            message: 'Thank you! We are calling you now to discuss your {{offer_type}}. Please answer your phone!'
          }
        }
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'webhook_trigger', target: 'spam_detection' },
    { id: 'e2', source: 'spam_detection', target: 'route_spam' },
    { id: 'e3', source: 'route_spam', target: 'log_spam', sourceHandle: 'spam' },
    { id: 'e4', source: 'route_spam', target: 'review_needed', sourceHandle: 'quarantine' },
    { id: 'e5', source: 'route_spam', target: 'prepare_call', sourceHandle: 'legit' },
    { id: 'e6', source: 'log_spam', target: 'respond_webhook' },
    { id: 'e7', source: 'review_needed', target: 'respond_webhook' },
    { id: 'e8', source: 'prepare_call', target: 'generate_prompt' },
    { id: 'e9', source: 'generate_prompt', target: 'log_sheets' },
    { id: 'e10', source: 'log_sheets', target: 'send_confirmation' },
    { id: 'e11', source: 'send_confirmation', target: 'wait_30sec' },
    { id: 'e12', source: 'wait_30sec', target: 'call_elevenlabs' },
    { id: 'e13', source: 'call_elevenlabs', target: 'respond_webhook' }
  ]
};

const result = await VisualWorkflow.create(workflow);

console.log('✅ Workflow created successfully!');
console.log('\n📋 Workflow Details:');
console.log('   ID:', result._id);
console.log('   Name:', result.name);
console.log('   Nodes:', result.nodes.length);
console.log('   Edges:', result.edges.length);

console.log('\n📊 Workflow Nodes:');
result.nodes.forEach((node, i) => {
  console.log(`   ${i + 1}. ${node.data.label} (${node.data.nodeType})`);
});

console.log('\n🔗 View in CRM:');
console.log(`   http://localhost:5173/app/workflows/${result._id}`);

console.log('\n✨ This workflow includes:');
console.log('   ✅ Spam detection with scoring');
console.log('   ✅ Conditional routing (spam/quarantine/legit)');
console.log('   ✅ Email notifications');
console.log('   ✅ Google Sheets logging');
console.log('   ✅ Customer confirmation email');
console.log('   ✅ 30-second delay before call');
console.log('   ✅ ElevenLabs automated calling');
console.log('   ✅ Webhook response');

await mongoose.disconnect();
console.log('\n✅ Done!');
