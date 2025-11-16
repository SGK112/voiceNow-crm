/**
 * Create Surprise Granite Promo Workflow
 *
 * This workflow handles promo form submissions with:
 * - Spam detection
 * - Email confirmation
 * - Google Sheets logging
 * - Automated ElevenLabs calling after 30 second delay
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Workflow from '../models/Workflow.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

const workflow = new Workflow({
  name: 'Surprise Granite Promo Lead Handler',
  description: 'Handles promo form submissions with spam detection, email confirmation, Google Sheets logging, and automated calling',
  user: '674237705b23b09208b435b4', // Replace with actual user ID
  trigger: {
    type: 'webhook',
    config: {
      path: 'surprise-granite-promo',
      method: 'POST'
    }
  },
  nodes: [
    // 1. Webhook Trigger
    {
      id: 'webhook_trigger',
      type: 'webhook',
      label: 'Specials Form Webhook',
      icon: '🎯',
      color: '#4CAF50',
      position: { x: 100, y: 300 },
      data: {
        path: 'surprise-granite-promo',
        method: 'POST',
        responseMode: 'responseNode'
      }
    },

    // 2. Spam Detection
    {
      id: 'spam_detection',
      type: 'code',
      label: 'Spam Detection',
      icon: '🛡️',
      color: '#FF9800',
      position: { x: 300, y: 300 },
      data: {
        code: `
const email = $input.body?.email || '';
const message = $input.body?.message || '';
const phone = $input.body?.phone || '';

// Spam detection logic
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

return {
  ...($input.body || {}),
  reviewSpam: spamScore >= 100,
  isSpam: spamScore >= 100,
  isQuarantined: spamScore >= 40 && spamScore < 100,
  isLegit: spamScore < 40,
  spamScore,
  spamReasons,
  full_name: $input.body?.full_name || $input.body?.name || ''
};
        `.trim()
      }
    },

    // 3. Route by Spam Score
    {
      id: 'route_spam',
      type: 'conditional',
      label: 'Route by Spam Score',
      icon: '🔀',
      color: '#2196F3',
      position: { x: 500, y: 300 },
      data: {
        conditions: [
          {
            label: 'Spam',
            field: 'isSpam',
            operator: 'equals',
            value: true
          },
          {
            label: 'Quarantine',
            field: 'isQuarantined',
            operator: 'equals',
            value: true
          },
          {
            label: 'Legit',
            field: 'isLegit',
            operator: 'equals',
            value: true
          }
        ]
      }
    },

    // 4a. Log Spam (Branch 1)
    {
      id: 'log_spam',
      type: 'email',
      label: 'Log Spam',
      icon: '📧',
      color: '#F44336',
      position: { x: 700, y: 150 },
      data: {
        to: 'info@surprisegranite.com',
        subject: '🚫 SPAM Blocked',
        body: `
SPAM BLOCKED

🚫 Score: {{spamScore}}/100

Reasons: {{spamReasons}}

Name: {{full_name}}
Email: {{email}}
Phone: {{phone}}
Offer: {{offer}}
        `.trim()
      }
    },

    // 4b. Review Needed (Branch 2)
    {
      id: 'review_needed',
      type: 'email',
      label: 'Review Needed',
      icon: '⚠️',
      color: '#FF9800',
      position: { x: 700, y: 300 },
      data: {
        to: 'info@surprisegranite.com',
        subject: '⚠️ REVIEW NEEDED',
        body: `
FLAGGED FOR REVIEW

⚠️ Score: {{spamScore}}/100

Reasons: {{spamReasons}}

Name: {{full_name}}
Email: {{email}}
Phone: {{phone}}
Offer: {{offer}}
        `.trim()
      }
    },

    // 4c. Prepare Call Data (Branch 3 - Legit)
    {
      id: 'prepare_call',
      type: 'code',
      label: 'Prepare Call Data',
      icon: '📞',
      color: '#4CAF50',
      position: { x: 700, y: 450 },
      data: {
        code: `
let phone = $input.phone || '';
phone = phone.replace(/\\D/g, '');
if (phone.startsWith('1') && phone.length === 11) {
  phone = phone.substring(1);
}
phone = '+1' + phone;

const firstName = $input.first_name || $input.full_name?.split(' ')[0] || 'there';
const offer = $input.promo_type || $input.offer || 'Special Offer';
const address = $input.address || $input.service_address || '';
const projectType = $input.project_type || '';

return {
  ...$input,
  phone,
  lead_name: firstName,
  offer_type: offer,
  address,
  project_type: projectType,
  full_name: $input.full_name
};
        `.trim()
      }
    },

    // 5. Generate Custom Prompt
    {
      id: 'generate_prompt',
      type: 'code',
      label: 'Generate Custom Prompt',
      icon: '✨',
      color: '#9C27B0',
      position: { x: 900, y: 450 },
      data: {
        code: `
const firstName = $input.first_name || ($input.full_name || $input.lead_name || 'there').split(' ')[0];
const customerEmail = $input.email || '';
const customerAddress = $input.address || $input.service_address || 'your location';
const promoType = $input.offer_type || $input.promo_type || 'our special offer';
const projectType = $input.project_type || 'project';
const phone = $input.phone;

// Warm, natural conversation starter
const customFirstMessage = \`Hey \${firstName}! This is Alex from Surprise Granite. How's your day going? I'm calling because you just reached out about one of our offers. Do you have a minute to chat about your project?\`;

return {
  phone,
  first_name: firstName,
  full_name: $input.full_name,
  lead_name: firstName,
  email: customerEmail,
  address: customerAddress,
  offer_type: promoType,
  promo_type: promoType,
  project_type: projectType,
  custom_first_message: customFirstMessage,
  customer_name: firstName,
  customer_email: customerEmail,
  customer_address: customerAddress
};
        `.trim()
      }
    },

    // 6. Edit Fields for Google Sheets
    {
      id: 'edit_fields',
      type: 'data_transform',
      label: 'Format for Logging',
      icon: '🔧',
      color: '#607D8B',
      position: { x: 1100, y: 450 },
      data: {
        fields: {
          timestamp: '{{$now}}',
          call_direction: 'outbound',
          customer_name: '{{customer_name}}',
          customer_phone: '{{phone}}',
          customer_email: '{{customer_email}}',
          promo_type: '{{promo_type}}',
          project_type: '{{project_type}}',
          address: '{{address}}',
          call_status: 'pending'
        }
      }
    },

    // 7. Log to Google Sheets
    {
      id: 'log_to_sheets',
      type: 'google_sheets',
      label: 'Log to Google Sheets',
      icon: '📊',
      color: '#34A853',
      position: { x: 1300, y: 450 },
      data: {
        action: 'append',
        spreadsheetId: '1AjBfvCloSKZg1WdHPvfWWCtD5p1xgUC-QEJFVuoNxaQ',
        sheetName: 'Sheet2',
        requiresOAuth: true
      }
    },

    // 8. Send Confirmation Email
    {
      id: 'send_confirmation',
      type: 'email',
      label: 'Send Confirmation Email',
      icon: '📧',
      color: '#4CAF50',
      position: { x: 1500, y: 450 },
      data: {
        to: '{{customer_email}}',
        subject: '🎉 Your Exclusive Offer - Click to Get Your Call!',
        htmlBody: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); padding: 32px 24px 24px 24px;">
  <h2 style="color: #ffb300; margin-bottom: 12px;">Hi {{customer_name}}!</h2>
  <p style="font-size: 18px; color: #222; margin-bottom: 18px;">
    Thank you for your interest in our <strong>{{promo_type}}</strong>!
  </p>
  <div style="background: #f9f9f9; border-radius: 10px; padding: 28px 20px; text-align: center; margin-bottom: 28px;">
    <p style="font-size: 17px; color: #333; margin-bottom: 10px;">
      A member of our team will be calling you shortly to discuss your project and answer any questions you may have.
    </p>
    <p style="font-size: 15px; color: #666; margin-top: 18px;">
      If you prefer, you can also call us directly at <span style="font-weight: bold; color: #ffb300;">(602) 833-3189</span>.
    </p>
  </div>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 13px; color: #999; margin-bottom: 0;">
    Best regards,<br>
    <span style="color: #222; font-weight: bold;">Surprise Granite & Cabinetry</span><br>
    15321 W Bell Rd, Surprise, AZ 85374
  </p>
</div>
        `.trim()
      }
    },

    // 9. Wait 30 Seconds
    {
      id: 'wait_30sec',
      type: 'delay',
      label: 'Wait 30 Seconds Before Call',
      icon: '⏱️',
      color: '#FF9800',
      position: { x: 1700, y: 450 },
      data: {
        duration: 30,
        unit: 'seconds'
      }
    },

    // 10. Call via ElevenLabs
    {
      id: 'call_elevenlabs',
      type: 'elevenlabs_call',
      label: 'Call Lead via ElevenLabs',
      icon: '📞',
      color: '#6366F1',
      position: { x: 1900, y: 450 },
      data: {
        agentId: 'agent_9301k802kktwfbhrbe9bam7f1spe',
        phoneNumberId: 'phnum_1801k7xb68cefjv89rv10f90qykv',
        toNumber: '{{phone}}',
        dynamicVariables: {
          customer_name: '{{customer_name}}',
          promo_type: '{{promo_type}}',
          customer_address: '{{customer_address}}',
          project_type: '{{project_type}}'
        },
        firstMessage: '{{custom_first_message}}'
      }
    },

    // 11. Respond to Webhook
    {
      id: 'respond_webhook',
      type: 'webhook_response',
      label: 'Respond to Webhook',
      icon: '✅',
      color: '#4CAF50',
      position: { x: 2100, y: 450 },
      data: {
        statusCode: 200,
        body: {
          success: true,
          message: 'Thank you! We are calling you now to discuss your {{offer_type}}. Please answer your phone!'
        }
      }
    }
  ],
  edges: [
    { source: 'webhook_trigger', target: 'spam_detection' },
    { source: 'spam_detection', target: 'route_spam' },
    { source: 'route_spam', target: 'log_spam', condition: 'spam' },
    { source: 'route_spam', target: 'review_needed', condition: 'quarantine' },
    { source: 'route_spam', target: 'prepare_call', condition: 'legit' },
    { source: 'log_spam', target: 'respond_webhook' },
    { source: 'review_needed', target: 'respond_webhook' },
    { source: 'prepare_call', target: 'generate_prompt' },
    { source: 'generate_prompt', target: 'edit_fields' },
    { source: 'edit_fields', target: 'log_to_sheets' },
    { source: 'log_to_sheets', target: 'send_confirmation' },
    { source: 'send_confirmation', target: 'wait_30sec' },
    { source: 'wait_30sec', target: 'call_elevenlabs' },
    { source: 'call_elevenlabs', target: 'respond_webhook' }
  ],
  status: 'active',
  version: 1
});

await workflow.save();

console.log('✅ Workflow created successfully!');
console.log('\n📋 Workflow Details:');
console.log('   Name:', workflow.name);
console.log('   ID:', workflow._id);
console.log('   Webhook Path: /api/webhook/surprise-granite-promo');
console.log('   Nodes:', workflow.nodes.length);
console.log('   Edges:', workflow.edges.length);

console.log('\n🔗 Workflow Flow:');
console.log('   1. Webhook receives promo form submission');
console.log('   2. Spam detection analyzes the submission');
console.log('   3. Routes based on spam score:');
console.log('      - Spam (100+): Log and block');
console.log('      - Quarantine (40-99): Alert for review');
console.log('      - Legit (<40): Process normally');
console.log('   4. Prepare call data and generate custom prompt');
console.log('   5. Log to Google Sheets');
console.log('   6. Send confirmation email');
console.log('   7. Wait 30 seconds');
console.log('   8. Call lead via ElevenLabs');
console.log('   9. Respond to webhook');

console.log('\n📝 Required Integrations:');
console.log('   - Gmail (for emails)');
console.log('   - Google Sheets (for logging)');
console.log('   - ElevenLabs (for calling)');

await mongoose.disconnect();
console.log('\n✅ Done!');
