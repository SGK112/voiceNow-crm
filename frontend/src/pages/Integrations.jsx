import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Webhook,
  Mail,
  Calendar,
  DollarSign,
  Database,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Settings,
  Zap,
  Link as LinkIcon
} from 'lucide-react';

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send and receive emails through your Gmail account',
    icon: Mail,
    color: 'red',
    features: ['Send emails', 'Email templates', 'Auto-responses'],
    setupFields: [
      { name: 'email', label: 'Gmail Address', type: 'email', placeholder: 'your@gmail.com' },
      { name: 'appPassword', label: 'App Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx' },
    ]
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Integrate with Microsoft Outlook for email',
    icon: Mail,
    color: 'blue',
    features: ['Send emails', 'Calendar sync', 'Contacts sync'],
    setupFields: [
      { name: 'email', label: 'Outlook Email', type: 'email', placeholder: 'your@outlook.com' },
      { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Azure App Client ID' },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Azure App Secret' },
    ]
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Schedule appointments and sync with Google Calendar',
    icon: Calendar,
    color: 'green',
    features: ['Schedule appointments', 'Calendar sync', 'Reminders'],
    setupFields: [
      { name: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'Google OAuth Client ID' },
      { name: 'clientSecret', label: 'OAuth Secret', type: 'password', placeholder: 'Google OAuth Secret' },
    ]
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices, customers, and payments',
    icon: DollarSign,
    color: 'yellow',
    features: ['Sync invoices', 'Track payments', 'Customer sync'],
    setupFields: [
      { name: 'clientId', label: 'App Client ID', type: 'text', placeholder: 'QuickBooks Client ID' },
      { name: 'clientSecret', label: 'App Secret', type: 'password', placeholder: 'QuickBooks Secret' },
    ]
  },
];

export default function Integrations() {
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [setupData, setSetupData] = useState({});
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] });
  const [copiedWebhook, setCopiedWebhook] = useState(null);

  // Mock data - replace with actual API calls
  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => Promise.resolve([
      { id: 'gmail', status: 'connected', connectedAt: new Date().toISOString() }
    ]),
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => Promise.resolve([]),
  });

  const { data: storage } = useQuery({
    queryKey: ['storage'],
    queryFn: () => Promise.resolve({
      used: 2.4,
      total: 10,
      plan: '10 GB',
      price: 0
    }),
  });

  const connectIntegrationMutation = useMutation({
    mutationFn: async (data) => {
      // API call would go here
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['integrations']);
      setSelectedIntegration(null);
      setSetupData({});
      alert('Integration connected successfully!');
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data) => {
      // API call would go here
      return Promise.resolve({ success: true, webhookId: 'wh_' + Date.now() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setNewWebhook({ name: '', url: '', events: [] });
      alert('Webhook created successfully!');
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id) => {
      // API call would go here
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
    },
  });

  const handleConnectIntegration = () => {
    if (!selectedIntegration) return;
    connectIntegrationMutation.mutate({
      integrationId: selectedIntegration.id,
      ...setupData
    });
  };

  const handleCreateWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      alert('Please enter webhook name and URL');
      return;
    }
    createWebhookMutation.mutate(newWebhook);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(id);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  const isConnected = (integrationId) => {
    return integrations.some(i => i.id === integrationId && i.status === 'connected');
  };

  const getStoragePercentage = () => {
    if (!storage) return 0;
    return (storage.used / storage.total) * 100;
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-1">Connect third-party services and manage webhooks</p>
      </div>

      {/* Third-Party Integrations */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {AVAILABLE_INTEGRATIONS.map((integration) => {
            const Icon = integration.icon;
            const connected = isConnected(integration.id);

            return (
              <Card key={integration.id} className={connected ? 'border-green-200 bg-green-50' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-lg bg-${integration.color}-100 flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 text-${integration.color}-600`} />
                      </div>
                      <div>
                        <CardTitle className="text-gray-900">{integration.name}</CardTitle>
                        <CardDescription>{integration.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={connected ? 'success' : 'secondary'}>
                      {connected ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Features:</p>
                    <ul className="space-y-1">
                      {integration.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!connected && selectedIntegration?.id === integration.id ? (
                    <div className="space-y-3 border-t pt-4">
                      {integration.setupFields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={setupData[field.name] || ''}
                            onChange={(e) => setSetupData({ ...setupData, [field.name]: e.target.value })}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleConnectIntegration}
                          disabled={connectIntegrationMutation.isPending}
                          className="flex-1"
                        >
                          {connectIntegrationMutation.isPending ? 'Connecting...' : 'Connect'}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedIntegration(null);
                            setSetupData({});
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => connected ? null : setSelectedIntegration(integration)}
                      variant={connected ? 'outline' : 'default'}
                      className="w-full"
                      disabled={connected}
                    >
                      {connected ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Connected
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Connect {integration.name}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Custom Webhooks</h2>
            <p className="text-sm text-gray-600">Integrate voice agents with your website or CRM</p>
          </div>
        </div>

        {/* Create New Webhook */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Plus className="h-5 w-5" />
              Create New Webhook
            </CardTitle>
            <CardDescription>
              Receive real-time events when calls are made, completed, or when leads are qualified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook Name
                </label>
                <input
                  type="text"
                  placeholder="My Website Integration"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://yoursite.com/api/webhooks"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events to Subscribe
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['call.started', 'call.completed', 'lead.created', 'lead.qualified', 'deal.won', 'deal.lost'].map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] });
                        } else {
                          setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== event) });
                        }
                      }}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreateWebhook}
              disabled={createWebhookMutation.isPending || !newWebhook.name || !newWebhook.url}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createWebhookMutation.isPending ? 'Creating...' : 'Create Webhook'}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Webhooks */}
        {webhooks.length > 0 ? (
          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Webhook className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                        <Badge variant={webhook.enabled ? 'success' : 'secondary'}>
                          {webhook.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">
                            {webhook.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(webhook.url, webhook.id)}
                          >
                            {copiedWebhook === webhook.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Events:</span>
                          {webhook.events.map((event, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last triggered: {webhook.lastTriggered || 'Never'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No webhooks configured</p>
              <p className="text-sm text-gray-500 mt-1">
                Create a webhook above to start receiving events
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Storage Management */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Storage & Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Database className="h-5 w-5" />
                File Storage
              </CardTitle>
              <CardDescription>
                Store call recordings, transcripts, and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Storage Used</span>
                  <span className="text-sm font-medium text-gray-900">
                    {storage?.used} GB / {storage?.total} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getStoragePercentage() >= 90 ? 'bg-red-600' :
                      getStoragePercentage() >= 75 ? 'bg-orange-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${getStoragePercentage()}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getStoragePercentage().toFixed(1)}% used
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Upgrade Storage:</p>
                <div className="space-y-2">
                  {[
                    { size: '50 GB', price: 10 },
                    { size: '100 GB', price: 18 },
                    { size: '500 GB', price: 80 },
                    { size: '1 TB', price: 150 },
                  ].map((option) => (
                    <button
                      key={option.size}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{option.size}</p>
                        <p className="text-xs text-gray-600">Additional storage</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${option.price}/mo</p>
                        <p className="text-xs text-gray-600">+${option.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Top-ups Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Zap className="h-5 w-5" />
                Usage Top-Ups
              </CardTitle>
              <CardDescription>
                Buy additional minutes, tokens, or messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Voice Minutes:</p>
                <div className="space-y-2">
                  {[
                    { minutes: 500, price: 25 },
                    { minutes: 1000, price: 45 },
                    { minutes: 5000, price: 200 },
                  ].map((option) => (
                    <button
                      key={option.minutes}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{option.minutes} minutes</p>
                        <p className="text-xs text-gray-600">Voice call time</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${option.price}</p>
                        <p className="text-xs text-gray-600">One-time</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">AI Tokens:</p>
                <div className="space-y-2">
                  {[
                    { tokens: 100000, price: 15 },
                    { tokens: 500000, price: 65 },
                    { tokens: 1000000, price: 120 },
                  ].map((option) => (
                    <button
                      key={option.tokens}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{(option.tokens / 1000).toFixed(0)}K tokens</p>
                        <p className="text-xs text-gray-600">AI chat usage</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${option.price}</p>
                        <p className="text-xs text-gray-600">One-time</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Webhook Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <ExternalLink className="h-5 w-5" />
            Webhook Documentation
          </CardTitle>
          <CardDescription>How to use webhooks with your voice agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Webhook Payload Example:</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "event": "call.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "callId": "call_123456",
    "agentId": "agent_789",
    "leadId": "lead_456",
    "duration": 180,
    "status": "completed",
    "transcript": "...",
    "sentiment": "positive",
    "qualified": true
  }
}`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Available Events:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded">call.started</code> - When a call begins</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded">call.completed</code> - When a call ends</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded">lead.created</code> - When a new lead is added</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded">lead.qualified</code> - When a lead is qualified</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded">deal.won</code> - When a deal is won</li>
              <li>• <code className="bg-gray-100 px-2 py-0.5 rounded">deal.lost</code> - When a deal is lost</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
