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
  Crown,
  Wrench,
  Home,
  Droplet,
  Flame,
  Trees,
  Waves,
  Bug,
  Package,
  BookOpen,
  ShoppingBag,
  Headphones
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Marketplace items organized by category
const MARKETPLACE_ITEMS = {
  // General Business Agents
  general: [
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

  // Specialty Trade Agents - HVAC
  hvac: [
    {
      id: 'hvac-emergency',
      name: 'HVAC Emergency Dispatch',
      description: '24/7 emergency HVAC dispatcher for heating/cooling failures',
      icon: Flame,
      tier: 'pro',
      rating: 4.9,
      downloads: 890,
      features: ['24/7 emergency response', 'Urgency prioritization', 'Tech dispatch', 'Emergency rate quotes'],
      integrations: ['Google Calendar', 'SMS', 'Dispatch System']
    }
  ],

  // Specialty Trade Agents - Plumbing
  plumbing: [
    {
      id: 'plumbing-emergency',
      name: 'Plumbing Emergency Agent',
      description: 'Handles emergency plumbing calls, pipe bursts, leaks, and clogs',
      icon: Droplet,
      tier: 'pro',
      rating: 4.8,
      downloads: 1120,
      features: ['Emergency leak detection', 'Shutoff valve guidance', '24/7 dispatch', 'Water damage prevention'],
      integrations: ['Google Calendar', 'SMS', 'Emergency Dispatch']
    }
  ],

  // Specialty Trade Agents - Home Services
  homeServices: [
    {
      id: 'roofing-storm',
      name: 'Storm Damage Roofing',
      description: 'Handles storm damage calls, insurance claims, roof inspections',
      icon: Home,
      tier: 'pro',
      rating: 4.7,
      downloads: 650,
      features: ['Emergency tarping', 'Insurance assistance', 'Free inspections', 'Drone scheduling'],
      integrations: ['Google Calendar', 'SMS', 'Insurance APIs']
    },
    {
      id: 'landscaping-design',
      name: 'Landscaping Design Consultant',
      description: 'Qualifying leads for landscape design and outdoor living projects',
      icon: Trees,
      tier: 'starter',
      rating: 4.6,
      downloads: 540,
      features: ['Design booking', 'Style preferences', 'Budget discussion', 'Property walkthrough'],
      integrations: ['Google Calendar', 'Email', 'Portfolio Gallery']
    },
    {
      id: 'pool-service',
      name: 'Pool Service & Repair',
      description: 'Weekly pool service scheduling and green pool rescue',
      icon: Waves,
      tier: 'starter',
      rating: 4.5,
      downloads: 480,
      features: ['Weekly scheduling', 'Green pool assessment', 'Equipment repair', 'Chemical delivery'],
      integrations: ['Google Calendar', 'Route Optimization', 'SMS']
    },
    {
      id: 'pest-control',
      name: 'Pest Control Scheduling',
      description: 'Books pest control service, identifies pest types, quotes treatments',
      icon: Bug,
      tier: 'starter',
      rating: 4.7,
      downloads: 720,
      features: ['Pest identification', 'Emergency response', 'Quarterly plans', 'Commercial contracts'],
      integrations: ['Google Calendar', 'SMS', 'CRM']
    },
    {
      id: 'handyman-dispatch',
      name: 'Handyman Dispatch',
      description: 'Multi-service handyman booking for repairs and small projects',
      icon: Wrench,
      tier: 'starter',
      rating: 4.6,
      downloads: 890,
      features: ['Multi-task visits', 'Hourly estimates', 'Senior discounts', 'Parts coordination'],
      integrations: ['Google Calendar', 'SMS', 'Inventory System']
    }
  ],

  // RAG Agents (AI with Knowledge Base)
  rag: [
    {
      id: 'ai-social-media-writer',
      name: 'AI Social Media Post Writer',
      description: 'Generate engaging social media posts for all platforms with AI',
      icon: Sparkles,
      tier: 'pro',
      rating: 4.9,
      downloads: 1850,
      badge: 'AI Powered',
      features: ['Multi-platform support', 'Custom tone & style', 'Hashtag generation', 'Best time suggestions', 'Image analysis'],
      integrations: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn']
    },
    {
      id: 'knowledge-base-support',
      name: 'Knowledge Base Support',
      description: 'AI agent with access to your company docs, manuals, and SOPs',
      icon: BookOpen,
      tier: 'enterprise',
      rating: 5.0,
      downloads: 320,
      badge: 'AI Powered',
      features: ['Uploads your docs', 'Answers from KB', 'Product manuals', 'Warranty policies', 'Auto-updates'],
      integrations: ['Document Store', 'Vector DB', 'OpenAI']
    },
    {
      id: 'product-catalog-expert',
      name: 'Product Catalog Expert',
      description: 'Answers questions about your entire product catalog with real-time data',
      icon: ShoppingBag,
      tier: 'enterprise',
      rating: 4.9,
      downloads: 210,
      badge: 'AI Powered',
      features: ['All product specs', 'Real-time pricing', 'Compatibility checks', 'Recommendations'],
      integrations: ['Inventory API', 'Pricing Engine', 'OpenAI']
    },
    {
      id: 'policy-compliance-agent',
      name: 'Policy & Compliance',
      description: 'Ensures all customer interactions follow company policies and regulations',
      icon: Shield,
      tier: 'enterprise',
      rating: 5.0,
      downloads: 150,
      badge: 'Compliance',
      features: ['Policy enforcement', 'Compliance checks', 'Legal guardrails', 'Audit logging'],
      integrations: ['Document Store', 'Compliance Engine', 'Audit Log']
    }
  ],

  // Customer Service Agents
  customerService: [
    {
      id: 'customer-support-247',
      name: '24/7 Customer Support',
      description: 'Always-on customer service for questions, complaints, and requests',
      icon: Headphones,
      tier: 'pro',
      rating: 4.8,
      downloads: 1840,
      features: ['24/7 availability', 'Escalation handling', 'Order status', 'Ticket creation'],
      integrations: ['CRM', 'Help Desk', 'Email', 'Slack']
    },
    {
      id: 'order-status-tracker',
      name: 'Order Status & Tracking',
      description: 'Provides real-time order updates and delivery tracking',
      icon: Package,
      tier: 'pro',
      rating: 4.7,
      downloads: 1320,
      features: ['Real-time lookup', 'Delivery estimates', 'Tracking numbers', 'Proactive updates'],
      integrations: ['Shipping APIs', 'Order System', 'SMS']
    },
    {
      id: 'returns-exchanges',
      name: 'Returns & Exchanges',
      description: 'Processes returns, exchanges, and refunds per your policies',
      icon: CheckCircle,
      tier: 'pro',
      rating: 4.6,
      downloads: 980,
      features: ['Return labels', 'Exchange processing', 'Refund issuance', 'Fraud prevention'],
      integrations: ['Shipping', 'Payment Gateway', 'CRM']
    },
    {
      id: 'warranty-claims',
      name: 'Warranty Claims',
      description: 'Handles warranty claims, replacements, and service requests',
      icon: Shield,
      tier: 'pro',
      rating: 4.7,
      downloads: 760,
      features: ['Coverage verification', 'Troubleshooting', 'Service scheduling', 'Parts ordering'],
      integrations: ['Warranty DB', 'Service System', 'Inventory']
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
    }
  ]
};

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Store },
  { id: 'general', name: 'General Business', icon: Bot },
  { id: 'hvac', name: 'HVAC', icon: Flame },
  { id: 'plumbing', name: 'Plumbing', icon: Droplet },
  { id: 'homeServices', name: 'Home Services', icon: Home },
  { id: 'rag', name: 'AI Powered (RAG)', icon: Sparkles },
  { id: 'customerService', name: 'Customer Service', icon: Headphones },
  { id: 'workflows', name: 'Workflows', icon: Workflow },
  { id: 'integrations', name: 'Integrations', icon: Plug }
];

export default function Marketplace() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getTierColor = (tier) => {
    switch (tier) {
      case 'starter': return 'bg-secondary text-gray-700 dark:bg-black text-foreground';
      case 'pro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'enterprise': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-secondary text-gray-700 dark:bg-black text-foreground';
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
        ...MARKETPLACE_ITEMS.general.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.hvac.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.plumbing.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.homeServices.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.rag.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.customerService.map(item => ({ ...item, category: 'agents' })),
        ...MARKETPLACE_ITEMS.workflows.map(item => ({ ...item, category: 'workflows' })),
        ...MARKETPLACE_ITEMS.integrations.map(item => ({ ...item, category: 'integrations' }))
      ];
    }

    if (activeCategory === 'workflows') {
      return MARKETPLACE_ITEMS.workflows.map(item => ({ ...item, category: 'workflows' }));
    }

    if (activeCategory === 'integrations') {
      return MARKETPLACE_ITEMS.integrations.map(item => ({ ...item, category: 'integrations' }));
    }

    return MARKETPLACE_ITEMS[activeCategory]?.map(item => ({ ...item, category: 'agents' })) || [];
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
      navigate('/app/voiceflow-builder');
    } else {
      alert(`Installing ${item.name}...\n\nThis will:\n✅ Enable integration\n✅ Configure OAuth (if needed)\n✅ Add to Settings`);
      navigate('/app/settings');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background dark:bg-black">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card dark:bg-black flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border border-border">
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Marketplace
          </h2>
          <p className="text-xs text-gray-800 text-foreground mt-1">
            Templates & Integrations
          </p>
        </div>

        {/* Categories */}
        <div className="p-4 space-y-1 overflow-auto flex-1">
          <p className="text-xs font-medium text-gray-800 text-foreground mb-2">CATEGORIES</p>
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground dark:bg-blue-600 text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:bg-secondary/80 dark:hover:text-white'
              }`}
            >
              <category.icon className="w-4 h-4" />
              <span className="text-left flex-1">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-border border-border mt-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-foreground">
              <span className="text-gray-800 text-foreground">Total Agents</span>
              <Badge variant="secondary" className="dark:bg-black text-foreground">
                {Object.keys(MARKETPLACE_ITEMS).filter(k => k !== 'workflows' && k !== 'integrations').reduce((sum, key) => sum + MARKETPLACE_ITEMS[key].length, 0)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-foreground">
              <span className="text-gray-800 text-foreground">Workflows</span>
              <Badge variant="secondary" className="dark:bg-black text-foreground">{MARKETPLACE_ITEMS.workflows.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-foreground">
              <span className="text-gray-800 text-foreground">Integrations</span>
              <Badge variant="secondary" className="dark:bg-black text-foreground">{MARKETPLACE_ITEMS.integrations.length}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-border border-border bg-card dark:bg-black p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 text-foreground" />
              <Input
                type="text"
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 dark:bg-black border-border text-foreground"
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
        <div className="flex-1 overflow-auto p-6 bg-background dark:bg-black">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Store className="w-16 h-16 text-muted-foreground text-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No items found</h3>
              <p className="text-gray-800 text-foreground">Try adjusting your search or browse different categories</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => {
                const CategoryIcon = item.icon;
                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow dark:bg-black border-border">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 bg-primary/10 dark:bg-blue-900/30 rounded-lg">
                          <CategoryIcon className="w-5 h-5 text-primary dark:text-blue-400" />
                        </div>
                        <div className="flex gap-2">
                          {item.badge && (
                            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                              {item.badge}
                            </Badge>
                          )}
                          <Badge className={getTierColor(item.tier)}>
                            <span className="flex items-center gap-1">
                              {getTierIcon(item.tier)}
                              {item.tier}
                            </span>
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg text-foreground">{item.name}</CardTitle>
                      <CardDescription className="dark:text-white text-muted-foreground">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Features or Integrations */}
                      {item.category === 'agents' && item.features && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-800 text-foreground mb-2">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.features.slice(0, 3).map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-border text-foreground">
                                {feature}
                              </Badge>
                            ))}
                            {item.features.length > 3 && (
                              <Badge variant="outline" className="text-xs border-border text-foreground">
                                +{item.features.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {item.category === 'workflows' && item.nodes && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-800 text-foreground mb-2">
                            {item.nodes} workflow nodes
                          </p>
                        </div>
                      )}

                      {item.integrations && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-800 text-foreground mb-2">Integrations:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.integrations.map((integration, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs dark:bg-black text-foreground">
                                {integration}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-800 text-foreground">
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
                        className="w-full dark:bg-blue-600 dark:hover:bg-blue-700"
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
