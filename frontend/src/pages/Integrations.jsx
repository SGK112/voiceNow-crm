import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Mail,
  Calendar,
  DollarSign,
  MessageSquare,
  Check,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import OAuthConnectButton from '@/components/OAuthConnectButton';

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'google',
    name: 'Google',
    tagline: 'Gmail, Calendar, and Sheets',
    description: 'Connect your Google account to send emails, schedule appointments, and sync data with Google Sheets',
    icon: Mail,
    color: 'blue',
    benefits: [
      'Automatic follow-up emails after calls',
      'Sync appointments with Google Calendar',
      'Import and export data with Google Sheets'
    ],
    setupTime: '2 minutes',
    difficulty: 'Easy',
    popular: true
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Team notifications',
    description: 'Get notified in Slack when important events happen in your CRM',
    icon: MessageSquare,
    color: 'purple',
    benefits: [
      'Instant notifications for hot leads',
      'Team collaboration on deals',
      'Real-time updates on agent performance'
    ],
    setupTime: '3 minutes',
    difficulty: 'Easy',
    popular: true,
    comingSoon: false
  }
];

export default function IntegrationsUpdated() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations');
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (integrationId) => {
    return integrations.some(i => i.service === integrationId && i.status === 'connected');
  };

  const handleDisconnect = async (integrationId) => {
    const integration = integrations.find(i => i.service === integrationId);
    if (!integration) return;

    try {
      await api.delete(`/integrations/${integration._id}`);
      toast.success(`Disconnected from ${integration.name}`);
      fetchIntegrations();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'Hard': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950/30';
    }
  };

  const getColorGradient = (color) => {
    switch (color) {
      case 'blue': return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'green': return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'yellow': return 'bg-gradient-to-br from-yellow-500 to-yellow-600';
      case 'purple': return 'bg-gradient-to-br from-purple-500 to-purple-600';
      default: return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Connect Your Apps</h1>
        <p className="text-lg text-muted-foreground">
          Connect the tools you already use to make your AI agents even more powerful
        </p>
      </div>

      {/* Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const connected = isConnected(integration.id);

          return (
            <Card key={integration.id} className={`relative ${connected ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' : ''}`}>
              {connected && (
                <div className="absolute -top-3 -right-3">
                  <div className="bg-green-600 rounded-full p-2">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`h-16 w-16 rounded-xl ${getColorGradient(integration.color)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">{integration.name}</CardTitle>
                      {connected && <Badge className="bg-green-600">Connected</Badge>}
                      {integration.comingSoon && <Badge variant="secondary">Coming Soon</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-primary mb-2">{integration.tagline}</p>
                    <CardDescription className="text-base">{integration.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Setup Info */}
                <div className="flex items-center gap-4 pb-3 border-b">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(integration.difficulty)}`}>
                    {integration.difficulty} Setup
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ⏱️ {integration.setupTime}
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <p className="text-sm font-semibold mb-3">What this does for you:</p>
                  <ul className="space-y-2">
                    {integration.benefits.map((benefit, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                {integration.comingSoon ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-base"
                    disabled
                  >
                    Coming Soon
                  </Button>
                ) : connected ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      disabled
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Connected
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <OAuthConnectButton
                    service={integration.id}
                    variant="default"
                    size="lg"
                    className="w-full text-base"
                    onSuccess={fetchIntegrations}
                  >
                    Connect {integration.name}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </OAuthConnectButton>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Why Connect Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Why Connect These Apps?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connecting your apps allows your AI agents to work seamlessly with the tools you already use.
            Save time, automate workflows, and never miss a lead or appointment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
