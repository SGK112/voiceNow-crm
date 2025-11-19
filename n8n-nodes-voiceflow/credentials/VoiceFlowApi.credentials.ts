import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class VoiceFlowApi implements ICredentialType {
  name = 'voiceFlowApi';
  displayName = 'VoiceFlow CRM API';
  documentationUrl = 'https://remodely.ai/docs/api';
  properties: INodeProperties[] = [
    {
      displayName: 'API URL',
      name: 'apiUrl',
      type: 'string',
      default: 'https://remodely.ai',
      description: 'The URL of your VoiceFlow CRM instance',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Your VoiceFlow CRM API key (found in Settings > API Keys)',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.apiUrl}}',
      url: '/api/auth/me',
    },
  };
}
