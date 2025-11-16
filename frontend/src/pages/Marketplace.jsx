import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Store,
  Bot,
  Workflow,
  Plug,
  Download,
  Star,
  TrendingUp,
  Zap,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  DollarSign,
  Users,
  FileText,
  BarChart,
  Shield,
  Sparkles,
  CheckCircle,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Marketplace items
const MARKETPLACE_ITEMS = {
  agents: [
    {
      id: 'appointment-booking',
      name: 'Appointment Booking Agent',
      description: 'Intelligent voice agent that books appointments, checks availability, and sends confirmations',
      icon: Calendar,
      tier: 'starter',
      rating: 4.9,
      downloads: 2500,
      features: ['24/7 availability', 'Calendar integration', 'SMS confirmations', 'Timezone handling'],
      integrations: ['Google Calendar', 'Twilio', 'Email']
    },
    {
      id: 'lead-qualification',
      name: 'Lead Qualification Agent',
      description: 'Qualifies inbound leads, asks discovery questions, and routes to sales team',
      icon: Users,
      tier: 'pro',
      rating: 4.8,
      downloads: 1800,
      features: ['Smart qualification', 'Lead scoring', 'CRM integration', 'Auto-routing'],
      integrations: ['CRM', 'Slack', 'Email']
    },
    {
      id: 'customer-support',
      name: 'Customer Support Agent',
      description: 'Handles common support queries, escalates complex issues, provides instant help',
      icon: MessageSquare,
      tier: 'starter',
      rating: 4.7,
      downloads: 3200,
      features: ['Knowledge base', 'Ticket creation', 'Multi-language', 'Escalation'],
      integrations: ['Zendesk', 'Email', 'Slack']
    },
    {
      id: 'sales-outreach',
      name: 'Sales Outreach Agent',
      description: 'Automated sales calls, product demos, and follow-ups with natural conversation',
      icon: Phone,
      tier: 'enterprise',
      rating: 4.9,
      downloads: 1200,
      features: ['Sales scripts', 'Objection handling', 'Demo booking', 'Follow-up automation'],
      integrations: ['CRM', 'Calendar', 'Email']
    },
    {
      id: 'survey-collector',
      name: 'Survey & Feedback Collector',
      description: 'Conducts phone surveys, collects feedback, and analyzes customer sentiment',
      icon: BarChart,
      tier: 'pro',
      rating: 4.6,
      downloads: 980,
      features: ['Custom surveys', 'Sentiment analysis', 'Data export', 'Real-time reporting'],
      integrations: ['Google Sheets', 'Email', 'Analytics']
    },
    {
      id: 'payment-collection',
      name: 'Payment Collection Agent',
      description: 'Friendly payment reminders, payment link sharing, and collection automation',
      icon: DollarSign,
      tier: 'pro',
      rating: 4.7,
      downloads: 1500,
      features: ['Payment reminders', 'Link sharing', 'Stripe integration', 'Receipt sending'],
      integrations: ['Stripe', 'Twilio', 'Email']
    }
  ],
  workflows: [
    {
      id: 'call-to-crm',
      name: 'Call → CRM Auto-Update',
      description: 'Automatically update CRM when calls complete with transcript and next steps',
      icon: Workflow,
      tier: 'starter',
      rating: 4.9,
      downloads: 4100,
      nodes: 8,
      integrations: ['ElevenLabs', 'CRM', 'Email']
    },
    {
      id: 'lead-to-nurture',
      name: 'Lead Nurture Campaign',
      description: 'Automated email and SMS nurture sequence based on lead qualification',
      icon: TrendingUp,
      tier: 'pro',
      rating: 4.8,
      downloads: 2700,
      nodes: 12,
      integrations: ['CRM', 'Email', 'Twilio']
    },
    {
      id: 'booking-confirmation',
      name: 'Booking Confirmation Flow',
      description: 'Send confirmations, reminders, and follow-ups for appointments',
      icon: Calendar,
      tier: 'starter',
      rating: 4.7,
      downloads: 3500,
      nodes: 10,
      integrations: ['Google Calendar', 'Email', 'Twilio']
    },
    {
      id: 'payment-received',
      name: 'Payment → Invoice Flow',
      description: 'Auto-generate and send invoices when Stripe payments are received',
      icon: DollarSign,
      tier: 'pro',
      rating: 4.9,
      downloads: 2100,
      nodes: 7,
      integrations: ['Stripe', 'Email', 'Google Drive']
    },
    {
      id: 'ai-call-analysis',
      name: 'AI Call Analysis & Insights',
      description: 'Analyze call transcripts with AI and generate actionable insights',
      icon: Sparkles,
      tier: 'enterprise',
      rating: 4.8,
      downloads: 890,
      nodes: 15,
      integrations: ['ElevenLabs', 'OpenAI', 'Google Sheets']
    },
    {
      id: 'slack-notifications',
      name: 'Slack Deal Notifications',
      description: 'Real-time Slack notifications for deals, calls, and important events',
      icon: MessageSquare,
      tier: 'starter',
      rating: 4.6,
      downloads: 3800,
      nodes: 6,
      integrations: ['Slack', 'CRM', 'Webhooks']
    }
  ],
  integrations: [
    {
      id: 'stripe-advanced',
      name: 'Stripe Advanced',
      description: 'Premium Stripe integration with subscriptions, invoices, and payment links',
      icon: Shield,
      tier: 'pro',
      rating: 4.9,
      downloads: 5200,
      features: ['Subscriptions', 'Invoices', 'Payment links', 'Webhooks']
    },
    {
      id: 'google-workspace',
      name: 'Google Workspace Suite',
      description: 'Full Google Workspace integration: Gmail, Calendar, Drive, Sheets',
      icon: Mail,
      tier: 'starter',
      rating: 4.8,
      downloads: 6800,
      features: ['Gmail', 'Calendar', 'Drive', 'Sheets', 'OAuth']
    },
    {
      id: 'slack-premium',
      name: 'Slack Premium',
      description: 'Advanced Slack integration with custom workflows and bot commands',
      icon: MessageSquare,
      tier: 'pro',
      rating: 4.7,
      downloads: 4200,
      features: ['Webhooks', 'Bot commands', 'Slash commands', 'Interactive messages']
    },
    {
      id: 'zendesk',
      name: 'Zendesk Support',
      description: 'Connect your voice agents to Zendesk for ticket creation and tracking',
      icon: FileText,
      tier: 'enterprise',
      rating: 4.8,
      downloads: 1900,
      features: ['Ticket creation', 'Auto-routing', 'Status updates', 'SLA tracking']
    }
  ]
};

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Store },
  { id: 'agents', name: 'Voice Agents', icon: Bot },
  { id: 'workflows', name: 'Workflows', icon: Workflow },
  { id: 'integrations', name: 'Integrations', icon: Plug }
];

export default function Marketplace() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getTierColor = (tier) => {
    switch (tier) {
      case 'starter': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'pro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'enterprise': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTierIcon = (tier) => {
    if (tier === 'enterprise') return <Crown className="w-3 h-3" />;
    if (tier === 'pro') return <Sparkles className="w-3 h-3" />;
    return null;
  };

  const getAllItems = () => {
    if (activeCategory === 'all') {
      return [
        ...MARKETPLACE_ITEMS.agents.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.workflows.map(item => ({ ...item, category: 'workflows' })),
        ...MARKETPLACE_ITEMS.integrations.map(item => ({ ...item, category: 'integrations' }))
      ];
    }
    return MARKETPLACE_ITEMS[activeCategory]?.map(item => ({ ...item, category: activeCategory })) || [];
  };

  const filteredItems = getAllItems().filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstall = (item) => {
    if (item.category === 'agents') {
      alert(`Installing ${item.name}...\n\nThis will:\n✅ Create a new voice agent\n✅ Configure default settings\n✅ Add to your agents library`);
      navigate('/app/agents');
    } else if (item.category === 'workflows') {
      alert(`Installing ${item.name}...\n\nThis will:\n✅ Import workflow template\n✅ Set up integrations\n✅ Add to your workflows`);
      navigate('/app/workflows');
    } else {
      alert(`Installing ${item.name}...\n\nThis will:\n✅ Enable integration\n✅ Configure OAuth (if needed)\n✅ Add to Settings`);
      navigate('/app/settings');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            Marketplace
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Templates & Integrations
          </p>
        </div>

        {/* Categories */}
        <div className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">CATEGORIES</p>
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Voice Agents</span>
              <Badge variant="secondary">{MARKETPLACE_ITEMS.agents.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Workflows</span>
              <Badge variant="secondary">{MARKETPLACE_ITEMS.workflows.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Integrations</span>
              <Badge variant="secondary">{MARKETPLACE_ITEMS.integrations.length}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Featured Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {filteredItems.length} Items Available
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Store className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground">Try adjusting your search or browse different categories</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => {
                const CategoryIcon = item.icon;
                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <CategoryIcon className="w-5 h-5 text-primary" />
                        </div>
                        <Badge className={getTierColor(item.tier)}>
                          <span className="flex items-center gap-1">
                            {getTierIcon(item.tier)}
                            {item.tier}
                          </span>
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Features or Integrations */}
                      {item.category === 'agents' && item.features && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.features.slice(0, 3).map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {item.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.features.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {item.category === 'workflows' && item.nodes && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {item.nodes} workflow nodes
                          </p>
                        </div>
                      )}

                      {item.integrations && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Integrations:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.integrations.map((integration, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {integration}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span>{item.downloads.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{item.rating}</span>
                        </div>
                      </div>

                      {/* Install Button */}
                      <Button
                        onClick={() => handleInstall(item)}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Install {item.category === 'agents' ? 'Agent' : item.category === 'workflows' ? 'Workflow' : 'Integration'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
