import {
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from 'n8n-workflow';
import axios from 'axios';

export class VoiceFlowInboundCall implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'VoiceFlow Inbound Call',
    name: 'voiceFlowInboundCall',
    icon: 'file:voiceflow.svg',
    group: ['trigger'],
    version: 1,
    description: 'Triggers when a call is received on your Twilio number',
    defaults: {
      name: 'Inbound Call',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'voiceFlowApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Phone Number',
        name: 'phoneNumber',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getPhoneNumbers',
        },
        default: '',
        required: true,
        description: 'Select the Twilio phone number that will trigger this workflow',
      },
      {
        displayName: 'Auto-Configure Webhook',
        name: 'autoConfigureWebhook',
        type: 'boolean',
        default: true,
        description: 'Whether to automatically configure the Twilio webhook when workflow is activated',
      },
      {
        displayName: 'Call Data to Extract',
        name: 'dataToExtract',
        type: 'multiOptions',
        options: [
          {
            name: 'Customer Name',
            value: 'customerName',
          },
          {
            name: 'Phone Number',
            value: 'phoneNumber',
          },
          {
            name: 'Email',
            value: 'email',
          },
          {
            name: 'Address',
            value: 'address',
          },
          {
            name: 'Project Type',
            value: 'projectType',
          },
          {
            name: 'Budget',
            value: 'budget',
          },
          {
            name: 'Timeline',
            value: 'timeline',
          },
          {
            name: 'Call Duration',
            value: 'callDuration',
          },
          {
            name: 'Transcript',
            value: 'transcript',
          },
          {
            name: 'Recording URL',
            value: 'recordingUrl',
          },
        ],
        default: ['customerName', 'phoneNumber', 'email', 'projectType', 'budget'],
        description: 'What data to extract from the call and pass to the next nodes',
      },
    ],
  };

  methods = {
    loadOptions: {
      async getPhoneNumbers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('voiceFlowApi');
        const apiUrl = credentials.apiUrl as string;
        const apiKey = credentials.apiKey as string;

        try {
          const response = await axios.get(`${apiUrl}/api/phone-numbers/my-numbers`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          const phoneNumbers = response.data.phoneNumbers || response.data.numbers || [];

          return phoneNumbers.map((number: any) => ({
            name: `${number.phoneNumber} ${number.friendlyName ? `(${number.friendlyName})` : ''}`,
            value: number.phoneNumber,
            description: number.assignedAgent?.name
              ? `Currently assigned to: ${number.assignedAgent.name}`
              : 'Not assigned to any agent',
          }));
        } catch (error) {
          console.error('Error fetching phone numbers:', error);
          return [
            {
              name: 'Error loading phone numbers',
              value: '',
              description: 'Please check your VoiceFlow API credentials',
            },
          ];
        }
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = this.getBodyData();
    const phoneNumber = this.getNodeParameter('phoneNumber') as string;
    const dataToExtract = this.getNodeParameter('dataToExtract', []) as string[];

    // Parse the call data from ElevenLabs webhook
    const callData = body as any;

    // Extract only the requested data fields
    const extractedData: any = {
      triggerPhoneNumber: phoneNumber,
      callId: callData.call_id || callData.id,
      timestamp: new Date().toISOString(),
    };

    // Map ElevenLabs analysis data to output fields
    const analysis = callData.analysis || {};

    if (dataToExtract.includes('customerName')) {
      extractedData.customerName = analysis.customerName || callData.customer_name || '';
    }
    if (dataToExtract.includes('phoneNumber')) {
      extractedData.phoneNumber = analysis.phoneNumber || callData.phone || callData.from || '';
    }
    if (dataToExtract.includes('email')) {
      extractedData.email = analysis.email || callData.email || '';
    }
    if (dataToExtract.includes('address')) {
      extractedData.address = analysis.address || callData.address || '';
    }
    if (dataToExtract.includes('projectType')) {
      extractedData.projectType = analysis.projectType || callData.project_type || '';
    }
    if (dataToExtract.includes('budget')) {
      extractedData.budget = analysis.budget || callData.budget || 0;
    }
    if (dataToExtract.includes('timeline')) {
      extractedData.timeline = analysis.timeline || callData.timeline || '';
    }
    if (dataToExtract.includes('callDuration')) {
      extractedData.callDuration = callData.end_timestamp && callData.start_timestamp
        ? callData.end_timestamp - callData.start_timestamp
        : callData.duration || 0;
    }
    if (dataToExtract.includes('transcript')) {
      extractedData.transcript = callData.transcript || '';
    }
    if (dataToExtract.includes('recordingUrl')) {
      extractedData.recordingUrl = callData.recording_url || callData.recordingUrl || '';
    }

    // Return the extracted data to the workflow
    return {
      workflowData: [[{ json: extractedData }]],
    };
  }
}
