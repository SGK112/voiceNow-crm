/**
 * Create Surprise Granite Promo Workflow in n8n
 *
 * Directly creates the workflow in n8n using the n8n API
 */

import dotenv from 'dotenv';
import N8nService from '../services/n8nService.js';

dotenv.config();

const n8nService = new N8nService();

const workflow = {
  name: 'Surprise Granite Promo Lead Handler',
  active: true,
  nodes: [
    {
      parameters: {
        jsCode: "const items = $input.all();\n\nconst updatedItems = items.map((item) => {\n  const email = item?.json?.body?.email;\n  const message = item?.json?.body?.message;\n\n  // Simple checks for spam and malicious content\n  const isSpam = email.includes(\"spam\") || message.includes(\"spam\");\n  const isMalicious = email.includes(\"hack\") || message.includes(\"hack\");\n\n  item.json.reviewSpam = isSpam || isMalicious;\n\n  return item;\n});\n\nreturn updatedItems;\n"
      },
      id: "spam_detection",
      name: "Spam Detection",
      type: "n8n-nodes-base.code",
      position: [
        -368,
        304
      ],
      typeVersion: 2
    },
    {
      parameters: {
        rules: {
          values: [
            {
              conditions: {
                options: {
                  version: 1,
                  leftValue: "",
                  caseSensitive: true,
                  typeValidation: "strict"
                },
                combinator: "and",
                conditions: [
                  {
                    id: "3d17431e-2790-4ec9-b901-dcdcb7b5a8bb",
                    operator: {
                      type: "boolean",
                      operation: "equals"
                    },
                    leftValue: "={{ $json.isSpam }}",
                    rightValue: true
                  }
                ]
              },
              renameOutput: true,
              outputKey: "spam"
            },
            {
              conditions: {
                options: {
                  version: 1,
                  leftValue: "",
                  caseSensitive: true,
                  typeValidation: "strict"
                },
                combinator: "and",
                conditions: [
                  {
                    id: "0c0f62cb-6585-4541-bfe0-d632bc6a7067",
                    operator: {
                      type: "boolean",
                      operation: "equals"
                    },
                    leftValue: "={{ $json.isQuarantined }}",
                    rightValue: true
                  }
                ]
              },
              renameOutput: true,
              outputKey: "quarantine"
            },
            {
              conditions: {
                options: {
                  version: 1,
                  leftValue: "",
                  caseSensitive: true,
                  typeValidation: "strict"
                },
                combinator: "and",
                conditions: [
                  {
                    id: "35c36d23-ea47-4808-bbb1-38714ce39212",
                    operator: {
                      type: "boolean",
                      operation: "equals"
                    },
                    leftValue: "={{ $json.isLegit }}",
                    rightValue: true
                  }
                ]
              },
              renameOutput: true,
              outputKey: "legit"
            }
          ]
        },
        options: {}
      },
      id: "route_spam",
      name: "Route by Spam Score",
      type: "n8n-nodes-base.switch",
      position: [
        -96,
        288
      ],
      typeVersion: 3
    },
    {
      parameters: {
        sendTo: "info@surprisegranite.com",
        subject: "🚫 SPAM Blocked",
        emailType: "text",
        message: "=SPAM BLOCKED\n\n🚫 Score: {{ $json.spamScore }}/100\n\nReasons: {{ $json.spamReasons.join(', ') }}\n\nName: {{ $json.full_name }}\nEmail: {{ $json.body.email }}\nPhone: {{ $json.body.phone }}\nOffer: {{ $json.body.offer }}",
        options: {}
      },
      id: "spam_email",
      name: "Log Spam",
      type: "n8n-nodes-base.gmail",
      position: [
        704,
        144
      ],
      webhookId: "a16fdcf8-cf9d-4f40-a9bf-21564b6c2be5",
      typeVersion: 2,
      credentials: {
        gmailOAuth2: {
          id: "F9eDbGERDCnn1XsH",
          name: "info@surprisegranite.com"
        }
      }
    },
    {
      parameters: {
        sendTo: "info@surprisegranite.com",
        subject: "⚠️ REVIEW NEEDED",
        emailType: "text",
        message: "=FLAGGED FOR REVIEW\n\n⚠️ Score: {{ $json.spamScore }}/100\n\nReasons: {{ $json.spamReasons.join(', ') }}\n\nName: {{ $json.full_name }}\nEmail: {{ $json.body.email }}\nPhone: {{ $json.body.phone }}\nOffer: {{ $json.body.offer }}",
        options: {}
      },
      id: "quarantine_email",
      name: "Review Needed",
      type: "n8n-nodes-base.gmail",
      position: [
        704,
        304
      ],
      webhookId: "0a071c5f-9091-4344-b90d-b354308e461f",
      typeVersion: 2,
      credentials: {
        gmailOAuth2: {
          id: "F9eDbGERDCnn1XsH",
          name: "info@surprisegranite.com"
        }
      }
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ { success: true, message: $json.offer_type ? 'Thank you! We are calling you now to discuss your ' + $json.offer_type + '. Please answer your phone!' : 'Thank you for your interest. We will review your submission.' } }}",
        options: {}
      },
      id: "respond_final",
      name: "Respond to Webhook",
      type: "n8n-nodes-base.respondToWebhook",
      position: [
        1856,
        304
      ],
      typeVersion: 1
    },
    {
      parameters: {
        jsCode: "const body = $json.body;\nlet phone = body.phone || '';\nphone = phone.replace(/\\D/g, '');\nif (phone.startsWith('1') && phone.length === 11) {\n  phone = phone.substring(1);\n}\nphone = '+1' + phone;\n\nconst firstName = body.first_name || body.full_name?.split(' ')[0] || 'there';\nconst offer = body.promo_type || body.offer || 'Special Offer';\nconst address = body.address || body.service_address || '';\nconst projectType = body.project_type || '';\n\nreturn [{\n  json: {\n    ...body,\n    phone,\n    lead_name: firstName,\n    offer_type: offer,\n    address: address,\n    project_type: projectType,\n    full_name: body.full_name || $json.full_name\n  }\n}];"
      },
      id: "prepare_call",
      name: "Prepare Call Data",
      type: "n8n-nodes-base.code",
      position: [
        112,
        336
      ],
      typeVersion: 2
    },
    {
      parameters: {
        jsCode: `const agentId = 'agent_9301k802kktwfbhrbe9bam7f1spe';
const phoneNumberId = 'phnum_1801k7xb68cefjv89rv10f90qykv';
const apiKey = '${process.env.ELEVENLABS_API_KEY}';

const promptData = $('Generate Custom Prompt').first().json;
const toNumber = promptData.phone;
const customerName = promptData.customer_name;
const promoType = promptData.promo_type;
const customerEmail = promptData.customer_email;
const customerAddress = promptData.customer_address;
const projectType = promptData.project_type;

console.log('=== CALL WITH DYNAMIC VARIABLES ===');
console.log('Agent ID:', agentId);
console.log('Customer:', customerName);
console.log('Promo:', promoType);
console.log('Address:', customerAddress);
console.log('Project:', projectType);

const requestBody = {
  agent_id: agentId,
  agent_phone_number_id: phoneNumberId,
  to_number: toNumber,
  conversation_initiation_client_data: {
    dynamic_variables: {
      customer_name: customerName,
      promo_type: promoType,
      customer_address: customerAddress,
      project_type: projectType
    }
  }
};

console.log('Request:', JSON.stringify(requestBody, null, 2));

try {
  const callResponse = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: requestBody,
    json: true
  });

  console.log('✅ Call initiated!', callResponse);

  return {
    json: {
      success: true,
      conversation_id: callResponse.conversation_id,
      call_sid: callResponse.callSid,
      call_direction: 'outbound',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: toNumber,
      promo_type: promoType,
      project_type: projectType,
      phone: toNumber
    }
  };
} catch (error) {
  console.error('❌ Call failed:', error.message, error.response?.data);
  return {
    json: {
      success: false,
      error: error.message,
      details: error.response?.data,
      call_direction: 'outbound',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: toNumber,
      promo_type: promoType,
      project_type: projectType,
      phone: toNumber
    }
  };
}`
      },
      id: "call_lead",
      name: "Call Lead via ElevenLabs",
      type: "n8n-nodes-base.code",
      position: [
        1424,
        480
      ],
      typeVersion: 2
    },
    {
      parameters: {
        resource: "message",
        subject: "🎉 Your Exclusive Offer - Click to Get Your Call!",
        includeHtml: true,
        htmlMessage: "={{ '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); padding: 32px 24px 24px 24px;\"><h2 style=\"color: #ffb300; margin-bottom: 12px;\">Hi ' + $('Specials Form Webhook').item.json.body.full_name + '!</h2><p style=\"font-size: 18px; color: #222; margin-bottom: 18px;\">Thank you for your interest in our <strong>' + $('Specials Form Webhook').item.json.body.promo_type + '</strong>!</p><div style=\"background: #f9f9f9; border-radius: 10px; padding: 28px 20px; text-align: center; margin-bottom: 28px;\"><p style=\"font-size: 17px; color: #333; margin-bottom: 10px;\">A member of our team will be calling you shortly to discuss your project and answer any questions you may have.</p><p style=\"font-size: 15px; color: #666; margin-top: 18px;\">If you prefer, you can also call us directly at <span style=\"font-weight: bold; color: #ffb300;\">(602) 833-3189</span>.</p></div><hr style=\"border: 0; border-top: 1px solid #eee; margin: 30px 0;\"><p style=\"font-size: 13px; color: #999; margin-bottom: 0;\">Best regards,<br><span style=\"color: #222; font-weight: bold;\">Surprise Granite & Cabinetry</span><br>15321 W Bell Rd, Surprise, AZ 85374</p></div>' }}",
        message: "=",
        toList: [
          "={{ $('Specials Form Webhook').item.json.body.email }}"
        ],
        additionalFields: {}
      },
      id: "ed2cf181-df14-4a46-91b0-39b01c1951db",
      name: "Send Confirmation Email",
      type: "n8n-nodes-base.gmail",
      position: [
        928,
        480
      ],
      typeVersion: 1,
      credentials: {
        gmailOAuth2: {
          id: "F9eDbGERDCnn1XsH",
          name: "info@surprisegranite.com"
        }
      }
    },
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: "timestamp",
              name: "timestamp",
              type: "string",
              value: "={{ $now.toISO() }}"
            },
            {
              id: "call_direction",
              name: "call_direction",
              type: "string",
              value: "={{ $json.call_direction }}"
            },
            {
              id: "customer_name",
              name: "customer_name",
              type: "string",
              value: "={{ $json.customer_name }}"
            },
            {
              id: "customer_phone",
              name: "customer_phone",
              type: "string",
              value: "={{ $json.customer_phone }}"
            },
            {
              id: "customer_email",
              name: "customer_email",
              type: "string",
              value: "={{ $json.customer_email }}"
            },
            {
              id: "promo_type",
              name: "promo_type",
              type: "string",
              value: "={{ $json.promo_type }}"
            },
            {
              id: "conversation_id",
              name: "conversation_id",
              type: "string",
              value: "={{ $json.conversation_id || '' }}"
            },
            {
              id: "call_sid",
              name: "call_sid",
              type: "string",
              value: "={{ $json.call_sid || '' }}"
            },
            {
              id: "call_status",
              name: "call_status",
              type: "string",
              value: "={{ $json.success ? 'success' : 'failed' }}"
            },
            {
              id: "error",
              name: "error",
              type: "string",
              value: "={{ $json.error || '' }}"
            }
          ]
        },
        options: {}
      },
      id: "dfe63c4e-023d-43fd-a887-cc55feec2ac5",
      name: "Edit Fields",
      type: "n8n-nodes-base.set",
      position: [
        512,
        336
      ],
      typeVersion: 3.4
    },
    {
      parameters: {
        operation: "appendOrUpdate",
        documentId: {
          __rl: true,
          mode: "list",
          value: "1AjBfvCloSKZg1WdHPvfWWCtD5p1xgUC-QEJFVuoNxaQ",
          cachedResultUrl: "https://docs.google.com/spreadsheets/d/1AjBfvCloSKZg1WdHPvfWWCtD5p1xgUC-QEJFVuoNxaQ/edit?usp=drivesdk",
          cachedResultName: "SG call log sheet - 2025"
        },
        sheetName: {
          __rl: true,
          mode: "list",
          value: 1513279466,
          cachedResultUrl: "https://docs.google.com/spreadsheets/d/1AjBfvCloSKZg1WdHPvfWWCtD5p1xgUC-QEJFVuoNxaQ/edit#gid=1513279466",
          cachedResultName: "Sheet2"
        },
        columns: {
          value: {},
          schema: [
            {
              id: "timestamp",
              type: "string",
              display: true,
              required: false,
              displayName: "timestamp",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "call_direction",
              type: "string",
              display: true,
              required: false,
              displayName: "call_direction",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "customer_name",
              type: "string",
              display: true,
              required: false,
              displayName: "customer_name",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "customer_phone",
              type: "string",
              display: true,
              required: false,
              displayName: "customer_phone",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "customer_email",
              type: "string",
              display: true,
              required: false,
              displayName: "customer_email",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "promo_type",
              type: "string",
              display: true,
              required: false,
              displayName: "promo_type",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "conversation_id",
              type: "string",
              display: true,
              required: false,
              displayName: "conversation_id",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "call_sid",
              type: "string",
              display: true,
              required: false,
              displayName: "call_sid",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "call_status",
              type: "string",
              display: true,
              required: false,
              displayName: "call_status",
              defaultMatch: false,
              canBeUsedToMatch: true
            },
            {
              id: "error",
              type: "string",
              display: true,
              required: false,
              displayName: "error",
              defaultMatch: false,
              canBeUsedToMatch: true
            }
          ],
          mappingMode: "autoMapInputData",
          matchingColumns: [],
          attemptToConvertTypes: false,
          convertFieldsToString: false
        },
        options: {}
      },
      id: "d68c247d-6515-4600-982c-f3023b0191a9",
      name: "Append or update row in sheet",
      type: "n8n-nodes-base.googleSheets",
      position: [
        704,
        480
      ],
      typeVersion: 4.7,
      credentials: {
        googleSheetsOAuth2Api: {
          id: "wylib8vL5BqmONUq",
          name: "info@Google Sheets account 4"
        }
      }
    },
    {
      parameters: {
        jsCode: "const firstName = $json.first_name || ($json.full_name || $json.lead_name || 'there').split(' ')[0];\nconst customerEmail = $json.email || '';\nconst customerAddress = $json.address || $json.service_address || 'your location';\nconst promoType = $json.offer_type || $json.promo_type || 'our special offer';\nconst projectType = $json.project_type || 'project';\nconst phone = $json.phone;\n\n// Warm, natural conversation starter - build rapport first\nconst customFirstMessage = `Hey ${firstName}! This is Alex from Surprise Granite. How's your day going? I'm calling because you just reached out about one of our offers. Do you have a minute to chat about your project?`;\n\nreturn [{\n  json: {\n    phone: phone,\n    first_name: firstName,\n    full_name: $json.full_name,\n    lead_name: firstName,\n    email: customerEmail,\n    address: customerAddress,\n    offer_type: promoType,\n    promo_type: promoType,\n    project_type: projectType,\n    custom_first_message: customFirstMessage,\n    customer_name: firstName,\n    customer_email: customerEmail,\n    customer_address: customerAddress\n  }\n}];"
      },
      id: "generate_prompt",
      name: "Generate Custom Prompt",
      type: "n8n-nodes-base.code",
      position: [
        320,
        336
      ],
      typeVersion: 2
    },
    {
      parameters: {
        amount: 30
      },
      id: "wait_2min",
      name: "Wait 30 Seconds Before Call",
      type: "n8n-nodes-base.wait",
      position: [
        1168,
        480
      ],
      typeVersion: 1.1,
      webhookId: "bf6b5882-61d6-49ea-bb78-f8a110e2a4ab"
    },
    {
      parameters: {
        httpMethod: "POST",
        path: "surprise-granite-promo",
        responseMode: "responseNode",
        options: {}
      },
      id: "webhook-1",
      name: "Specials Form Webhook",
      type: "n8n-nodes-base.webhook",
      position: [
        -608,
        304
      ],
      webhookId: "4fde339b-9718-4b22-a404-db0ebfd708c7",
      typeVersion: 2,
      onError: "continueRegularOutput"
    }
  ],
  connections: {
    "Spam Detection": {
      main: [
        [
          {
            node: "Route by Spam Score",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Route by Spam Score": {
      main: [
        [
          {
            node: "Log Spam",
            type: "main",
            index: 0
          }
        ],
        [
          {
            node: "Review Needed",
            type: "main",
            index: 0
          }
        ],
        [
          {
            node: "Prepare Call Data",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Log Spam": {
      main: [
        [
          {
            node: "Respond to Webhook",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Review Needed": {
      main: [
        [
          {
            node: "Respond to Webhook",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Prepare Call Data": {
      main: [
        [
          {
            node: "Generate Custom Prompt",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Call Lead via ElevenLabs": {
      main: [
        [
          {
            node: "Respond to Webhook",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Send Confirmation Email": {
      main: [
        [
          {
            node: "Wait 30 Seconds Before Call",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Edit Fields": {
      main: [
        [
          {
            node: "Append or update row in sheet",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Append or update row in sheet": {
      main: [
        [
          {
            node: "Send Confirmation Email",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Generate Custom Prompt": {
      main: [
        [
          {
            node: "Edit Fields",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Wait 30 Seconds Before Call": {
      main: [
        [
          {
            node: "Call Lead via ElevenLabs",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Specials Form Webhook": {
      main: [
        [
          {
            node: "Spam Detection",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  },
  pinData: {},
  settings: {
    executionOrder: 'v1'
  },
  staticData: null,
  tags: [],
  triggerCount: 0,
  updatedAt: new Date().toISOString(),
  versionId: ''
};

console.log('🚀 Creating Surprise Granite Promo Workflow in n8n...\n');

try {
  const result = await n8nService.createWorkflow(workflow);

  console.log('✅ Workflow created successfully!');
  console.log('\n📋 Workflow Details:');
  console.log('   ID:', result.id);
  console.log('   Name:', result.name);
  console.log('   Active:', result.active);
  console.log('   Nodes:', workflow.nodes.length);

  console.log('\n🔗 Webhook URL:');
  console.log('   POST http://5.183.8.119:5678/webhook/surprise-granite-promo');

  console.log('\n📝 Workflow Flow:');
  console.log('   1. ✅ Webhook receives promo form submission');
  console.log('   2. 🛡️ Spam detection analyzes submission');
  console.log('   3. 🔀 Routes based on spam score');
  console.log('   4. 📞 Prepares call data');
  console.log('   5. ✨ Generates custom prompt');
  console.log('   6. 📊 Logs to Google Sheets');
  console.log('   7. 📧 Sends confirmation email');
  console.log('   8. ⏱️  Waits 30 seconds');
  console.log('   9. 📞 Calls lead via ElevenLabs');
  console.log('   10. ✅ Responds to webhook');

  console.log('\n🔑 Required Credentials:');
  console.log('   - Gmail OAuth (for confirmation emails)');
  console.log('   - Google Sheets OAuth (for logging)');
  console.log('   - ElevenLabs API Key (already configured)');

  console.log('\n🧪 Test the workflow:');
  console.log('   curl -X POST http://5.183.8.119:5678/webhook/surprise-granite-promo \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"full_name":"John Doe","email":"john@example.com","phone":"4805551234","promo_type":"Kitchen Remodel","project_type":"Granite Countertops"}\'');

} catch (error) {
  console.error('❌ Error creating workflow:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
}
