import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Workflow,
  MessageSquare,
  Mail,
  Calendar,
  CreditCard,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import api from '@/services/api';

export default function IntegrationsTab() {
  const [activeTab, setActiveTab] = useState('elevenlabs');
  const queryClient = useQueryClient();

  // Fetch platform status
  const { data: platformStatus, isLoading, error } = useQuery({
    queryKey: ['platformStatus'],
    queryFn: async () => {
      const response = await api.get('/integrations/platform/status');
      return response.data.integrations;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (provider) => {
      const response = await api.post(`/integrations/platform/${provider}/test`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['platformStatus']);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading integrations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <XCircle className="h-12 w-12 mx-auto mb-4" />
        <p>Failed to load integrations. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Platform Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Manage your Voice Workflow CRM integrations with ElevenLabs, n8n, and more
        </p>
      </div>

      {/* Integration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="elevenlabs">
            <Phone className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">ElevenLabs</span>
          </TabsTrigger>
          <TabsTrigger value="n8n">
            <Workflow className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">n8n</span>
          </TabsTrigger>
          <TabsTrigger value="twilio">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Twilio</span>
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="google">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Google</span>
          </TabsTrigger>
          <TabsTrigger value="stripe">
            <CreditCard className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Stripe</span>
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Database</span>
          </TabsTrigger>
        </TabsList>

        {/* ElevenLabs Tab */}
        <TabsContent value="elevenlabs" className="space-y-4">
          <ElevenLabsPanel
            integration={platformStatus?.elevenlabs}
            onTest={() => testMutation.mutate('elevenlabs')}
            testing={testMutation.isLoading && testMutation.variables === 'elevenlabs'}
          />
        </TabsContent>

        {/* n8n Tab */}
        <TabsContent value="n8n" className="space-y-4">
          <N8nPanel
            integration={platformStatus?.n8n}
            onTest={() => testMutation.mutate('n8n')}
            testing={testMutation.isLoading && testMutation.variables === 'n8n'}
          />
        </TabsContent>

        {/* Twilio Tab */}
        <TabsContent value="twilio" className="space-y-4">
          <TwilioPanel
            integration={platformStatus?.twilio}
            onTest={() => testMutation.mutate('twilio')}
            testing={testMutation.isLoading && testMutation.variables === 'twilio'}
          />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <EmailPanel
            integration={platformStatus?.email}
            onTest={() => testMutation.mutate('email')}
            testing={testMutation.isLoading && testMutation.variables === 'email'}
          />
        </TabsContent>

        {/* Google Tab */}
        <TabsContent value="google" className="space-y-4">
          <GooglePanel integration={platformStatus?.google} />
        </TabsContent>

        {/* Stripe Tab */}
        <TabsContent value="stripe" className="space-y-4">
          <StripePanel integration={platformStatus?.stripe} />
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <DatabasePanel integration={platformStatus?.database} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ElevenLabs Panel Component
const ElevenLabsPanel = ({ integration, onTest, testing }) => {
  const { data: details } = useQuery({
    queryKey: ['integrationDetails', 'elevenlabs'],
    queryFn: async () => {
      const response = await api.get('/integrations/platform/elevenlabs');
      return response.data;
    },
    enabled: integration?.status === 'connected'
  });

  const isConnected = integration?.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>ElevenLabs Voice AI</CardTitle>
              <CardDescription>Ultra-realistic conversational AI for voice calls</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Not Configured
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">API Key:</span>
              <span className="ml-2 font-mono">
                {integration?.apiKey || 'Not configured'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone Number ID:</span>
              <span className="ml-2 font-mono text-xs">
                {integration?.phoneNumberId || 'Not configured'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Demo Agent ID:</span>
              <span className="ml-2 font-mono text-xs">
                {integration?.demoAgentId || 'Not configured'}
              </span>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Capabilities</h4>
          <div className="flex flex-wrap gap-2">
            {integration?.capabilities?.map((cap) => (
              <Badge key={cap} variant="outline">
                {cap.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Agents (if connected) */}
        {isConnected && details?.agents && details.agents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">
              Voice Agents ({details.agents.length} total)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {details.agents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className="p-3 bg-muted rounded border text-sm"
                >
                  <div className="font-medium truncate">{agent.name || agent.agent_id}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {agent.agent_id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onTest}
            disabled={!isConnected || testing}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://elevenlabs.io/app/conversational-ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Dashboard
            </a>
          </Button>
        </div>

        {/* Configuration Help */}
        {!isConnected && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
            <h5 className="font-semibold mb-2">How to Configure</h5>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Get your API key from ElevenLabs dashboard</li>
              <li>Add to .env file: ELEVENLABS_API_KEY=your_key_here</li>
              <li>Add phone number ID: ELEVENLABS_PHONE_NUMBER_ID=your_id</li>
              <li>Restart the server</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// n8n Panel Component
const N8nPanel = ({ integration, onTest, testing }) => {
  const { data: details } = useQuery({
    queryKey: ['integrationDetails', 'n8n'],
    queryFn: async () => {
      const response = await api.get('/integrations/platform/n8n');
      return response.data;
    },
    enabled: integration?.status === 'connected'
  });

  const isConnected = integration?.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Workflow className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>n8n Workflow Automation</CardTitle>
              <CardDescription>Visual workflow builder for powerful automations</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Not Configured
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Configuration</h4>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">API URL:</span>
              <span className="ml-2 font-mono text-xs break-all">
                {integration?.apiUrl || 'Not configured'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Webhook URL:</span>
              <span className="ml-2 font-mono text-xs break-all">
                {integration?.webhookUrl || 'Not configured'}
              </span>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Capabilities</h4>
          <div className="flex flex-wrap gap-2">
            {integration?.capabilities?.map((cap) => (
              <Badge key={cap} variant="outline">
                {cap.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Workflows (if connected) */}
        {isConnected && details?.workflows && details.workflows.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">
              Workflows ({details.usage.activeWorkflows} active / {details.usage.totalWorkflows} total)
            </h4>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {details.workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="p-3 bg-muted rounded border text-sm flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {workflow.id}</div>
                  </div>
                  <Badge variant={workflow.active ? 'success' : 'secondary'}>
                    {workflow.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onTest}
            disabled={!isConnected || testing}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          {integration?.apiUrl && (
            <Button variant="outline" asChild>
              <a
                href={integration.apiUrl.replace('/api/v1', '')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open n8n
              </a>
            </Button>
          )}
        </div>

        {/* Configuration Help */}
        {!isConnected && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-sm">
            <h5 className="font-semibold mb-2">How to Configure</h5>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Set up your n8n instance (cloud or self-hosted)</li>
              <li>Add to .env file: N8N_API_URL=your_n8n_url</li>
              <li>Add API key: N8N_API_KEY=your_api_key</li>
              <li>Add webhook URL: N8N_WEBHOOK_URL=your_webhook_url</li>
              <li>Restart the server</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Twilio Panel
const TwilioPanel = ({ integration, onTest, testing }) => {
  const isConnected = integration?.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Twilio</CardTitle>
              <CardDescription>SMS and voice communication platform</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected ? 'Connected' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Account SID:</span>
              <span className="ml-2 font-mono text-xs">{integration?.accountSid || 'Not configured'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone Number:</span>
              <span className="ml-2">{integration?.phoneNumber || 'Not configured'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={onTest} disabled={!isConnected || testing} variant="outline">
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
          <Button variant="outline" asChild>
            <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Console
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Email Panel
const EmailPanel = ({ integration, onTest, testing }) => {
  const isConnected = integration?.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Email (SMTP)</CardTitle>
              <CardDescription>Send email notifications and campaigns</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected ? 'Connected' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">SMTP Host:</span>
              <span className="ml-2">{integration?.smtpHost || 'Not configured'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">From Email:</span>
              <span className="ml-2">{integration?.fromEmail || 'Not configured'}</span>
            </div>
          </div>
        </div>

        <Button onClick={onTest} disabled={!isConnected || testing} variant="outline">
          {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Test Connection
        </Button>
      </CardContent>
    </Card>
  );
};

// Google Panel
const GooglePanel = ({ integration }) => {
  const isConfigured = integration?.status === 'configured';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle>Google Workspace</CardTitle>
              <CardDescription>Calendar, Sheets, Gmail integration</CardDescription>
            </div>
          </div>
          <Badge variant={isConfigured ? 'success' : 'secondary'}>
            {isConfigured ? 'Configured' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {integration?.capabilities?.map((cap) => (
            <Badge key={cap} variant="outline">
              {cap}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Stripe Panel
const StripePanel = ({ integration }) => {
  const isConnected = integration?.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Stripe</CardTitle>
              <CardDescription>Payment processing and subscriptions</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected ? 'Connected' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {integration?.capabilities?.map((cap) => (
            <Badge key={cap} variant="outline">
              {cap}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Database Panel
const DatabasePanel = ({ integration }) => {
  const isConnected = integration?.status === 'connected';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Database className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <CardTitle>MongoDB Database</CardTitle>
              <CardDescription>Primary data storage</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Database Name:</span>
            <span className="ml-2 font-mono">{integration?.dbName || 'Unknown'}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="ml-2">
              {integration?.connected ? '✅ Healthy' : '❌ Error'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
