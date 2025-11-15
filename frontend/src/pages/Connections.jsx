import { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle,
  XCircle,
  Settings,
  Trash2,
  ExternalLink,
  Key,
  Zap,
  Mail,
  MessageSquare,
  Phone,
  Bot,
  Calendar,
  FileText,
  DollarSign,
  Building,
  Chrome,
  Facebook,
  Instagram,
  MapPin,
  Target,
  CreditCard
} from 'lucide-react';
import api from '../services/api';

// External Account Integrations - Connect YOUR accounts to make the CRM smarter
const EXTERNAL_INTEGRATIONS = [
  // === READY NOW ===
  {
    id: 'google',
    name: 'Google My Business',
    description: 'Pull your reviews, respond to customers, track your reputation',
    icon: Chrome,
    color: 'bg-blue-500',
    category: 'Ready Now',
    type: 'oauth',
    ready: true,
    popular: true,
    benefits: [
      'Auto-pull your customer reviews',
      'Respond to reviews from CRM',
      'Track your reputation score',
      'See all reviews in one place'
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook Business Page',
    description: 'Capture leads from your Facebook page automatically',
    icon: Facebook,
    color: 'bg-blue-600',
    category: 'Ready Now',
    type: 'oauth',
    ready: true,
    popular: true,
    benefits: [
      'Auto-capture Facebook leads',
      'Respond to page messages',
      'Never miss a potential customer',
      'Track which leads came from Facebook'
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    description: 'Capture leads and manage messages from your Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    category: 'Ready Now',
    type: 'oauth',
    ready: true,
    benefits: [
      'Respond to DMs from CRM',
      'Capture profile visitors',
      'Track engagement',
      'Schedule posts'
    ]
  },

  // === COMING SOON ===
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync your invoices and customer payments automatically',
    icon: DollarSign,
    color: 'bg-green-600',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    popular: true,
    benefits: [
      'Auto-create invoices in QuickBooks',
      'See payment history in CRM',
      'Track who owes you money',
      'No double data entry'
    ]
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync your appointments and never double-book',
    icon: Calendar,
    color: 'bg-yellow-500',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    popular: true,
    benefits: [
      'Auto-add appointments to your calendar',
      'See your schedule in CRM',
      'Send calendar invites to customers',
      'Avoid scheduling conflicts'
    ]
  },
  {
    id: 'yelp',
    name: 'Yelp Business',
    description: 'Pull Yelp reviews and respond to customer feedback',
    icon: MapPin,
    color: 'bg-red-500',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Monitor Yelp reviews',
      'Respond from CRM',
      'Track review trends',
      'Improve your rating'
    ]
  },
  {
    id: 'angi',
    name: 'Angi (Angie\'s List)',
    description: 'Sync your Angi leads and reviews',
    icon: Target,
    color: 'bg-orange-500',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Auto-import Angi leads',
      'Track lead source',
      'Monitor reviews',
      'Respond to inquiries'
    ]
  },
  {
    id: 'homeadvisor',
    name: 'HomeAdvisor',
    description: 'Capture HomeAdvisor leads automatically',
    icon: Building,
    color: 'bg-blue-700',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Auto-capture leads',
      'Track ROI per lead',
      'Faster response time',
      'Never miss an opportunity'
    ]
  },
  {
    id: 'thumbtack',
    name: 'Thumbtack',
    description: 'Import Thumbtack quotes and leads',
    icon: Target,
    color: 'bg-green-500',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Auto-import quote requests',
      'Track conversion rate',
      'Manage leads in one place',
      'Respond faster'
    ]
  },
  {
    id: 'microsoft-outlook',
    name: 'Microsoft Outlook',
    description: 'Sync your email and calendar',
    icon: Mail,
    color: 'bg-blue-500',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Two-way email sync',
      'Calendar integration',
      'Track email opens',
      'Log all communications'
    ]
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Connect your Gmail for email tracking',
    icon: Mail,
    color: 'bg-red-400',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Track email conversations',
      'Auto-log emails to leads',
      'Send from CRM',
      'See email history'
    ]
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect 5000+ apps with automated workflows',
    icon: Zap,
    color: 'bg-orange-400',
    category: 'Coming Soon',
    type: 'oauth',
    comingSoon: true,
    benefits: [
      'Connect any app',
      'Custom automations',
      'No coding required',
      'Unlimited possibilities'
    ]
  }
];


export default function IntegrationsNew() {
  const [apiKeyIntegrations, setApiKeyIntegrations] = useState([]);
  const [oauthIntegrations, setOauthIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      // Fetch both API key integrations and OAuth integrations
      const [apiKeyResponse, oauthResponse] = await Promise.all([
        api.get('/user-integrations').catch(() => ({ data: { integrations: [] } })),
        api.get('/connections').catch(() => ({ data: [] }))
      ]);

      setApiKeyIntegrations(apiKeyResponse.data.integrations || []);
      setOauthIntegrations(Array.isArray(oauthResponse.data) ? oauthResponse.data : []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (service) => {
    // Prevent connecting to "Coming Soon" integrations
    if (service.comingSoon) {
      alert(`${service.name} is coming soon! We're working hard to add this integration.`);
      return;
    }

    setSelectedService(service);
    setFormData({});

    // Handle OAuth integrations differently
    if (service.type === 'oauth') {
      try {
        // Get OAuth URL from backend
        const response = await api.get(`/connections/${service.id}/auth`);
        const { authUrl } = response.data;

        // Open OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          authUrl,
          `${service.name} OAuth`,
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth callback
        const checkPopup = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            // Refresh integrations after popup closes
            fetchIntegrations();
          }
        }, 500);
      } catch (error) {
        console.error('Error starting OAuth flow:', error);
        const errorMsg = error.response?.data?.message || error.message;
        alert(`Failed to connect ${service.name}:\n\n${errorMsg}\n\nThis integration may not be set up yet on the backend. Please contact support.`);
      }
    } else {
      // Show modal for API key integrations
      setShowSetupModal(true);
    }
  };

  const handleConnect = async () => {
    if (!selectedService) return;

    // Validate required fields
    const missingFields = selectedService.fields
      .filter(field => !field.name.includes('ptional') && !formData[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      alert(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setSubmitting(true);

    try {
      await api.post(`/user-integrations/${selectedService.id}`, {
        ...formData,
        displayName: formData.displayName || `My ${selectedService.name} Account`
      });

      alert(`✅ ${selectedService.name} connected successfully!`);
      setShowSetupModal(false);
      setFormData({});
      fetchIntegrations();
    } catch (error) {
      console.error('Error connecting integration:', error);
      alert(`Failed to connect ${selectedService.name}: ${error.response?.data?.message || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (serviceConfig, integrationId) => {
    if (!confirm(`Are you sure you want to disconnect ${serviceConfig.name}?`)) return;

    try {
      if (serviceConfig.type === 'oauth') {
        await api.delete(`/connections/${integrationId}`);
      } else {
        await api.delete(`/user-integrations/${serviceConfig.id}`);
      }
      alert('Integration disconnected successfully');
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect integration');
    }
  };

  const handleTest = async (serviceConfig, integrationId) => {
    try {
      if (serviceConfig.type === 'oauth') {
        await api.get(`/connections/${integrationId}/test`);
      } else {
        await api.post(`/user-integrations/${serviceConfig.id}/test`);
      }
      alert(`✅ ${serviceConfig.name} test successful!`);
    } catch (error) {
      console.error('Error testing integration:', error);
      alert(`Test failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const isConnected = (serviceId) => {
    // Check OAuth integrations
    const oauthConnected = oauthIntegrations.some(
      int => int.service === serviceId && int.status === 'connected'
    );
    // Check API key integrations
    const apiKeyConnected = apiKeyIntegrations.some(
      int => int.service === serviceId && int.status === 'connected'
    );
    return oauthConnected || apiKeyConnected;
  };

  const getIntegrationByService = (serviceId) => {
    // Check OAuth integrations first
    const oauthIntegration = oauthIntegrations.find(int => int.service === serviceId);
    if (oauthIntegration) return oauthIntegration;

    // Check API key integrations
    return apiKeyIntegrations.find(int => int.service === serviceId);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Business': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Social Media': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      'Communication': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'AI': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Finance': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Productivity': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
    };
    return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  };

  // Combined integrations count
  const allIntegrations = [...oauthIntegrations, ...apiKeyIntegrations];
  const connectedCount = allIntegrations.filter(i => i.status === 'connected').length;
  const totalUsage = allIntegrations.reduce((sum, i) => sum + (i.usageCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Zap className="w-8 h-8 text-blue-600" />
          Connect Your Business Accounts
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mt-2 font-medium">
          Pull your reviews, leads, invoices, and appointments into one place
        </p>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          The CRM is ready from day 1. Connect your accounts to make it even smarter with YOUR business data.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connected</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {connectedCount}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {EXTERNAL_INTEGRATIONS.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Usage</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {totalUsage}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          🔗 Available Integrations
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Connect your business accounts with one click - no technical setup required!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {EXTERNAL_INTEGRATIONS.map(service => {
            const Icon = service.icon;
            const connected = isConnected(service.id);
            const integration = getIntegrationByService(service.id);

            return (
              <div
                key={service.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-4 md:p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 ${service.color} rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{service.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(service.category)}`}>
                          {service.category}
                        </span>
                      </div>
                    </div>

                    {connected ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4">{service.description}</p>

                  {/* Connection Info */}
                  {connected && integration && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="text-sm">
                        <p className="text-green-700 dark:text-green-300 font-medium mb-1">
                          ✓ {integration.displayName || integration.name || `Connected ${service.name}`}
                        </p>
                        {integration.metadata && Object.keys(integration.metadata).length > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 space-y-1 mt-2">
                            {integration.metadata.email && (
                              <div>Email: {integration.metadata.email}</div>
                            )}
                            {integration.metadata.accountName && (
                              <div>Account: {integration.metadata.accountName}</div>
                            )}
                            {integration.metadata.workspace && (
                              <div>Workspace: {integration.metadata.workspace}</div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          Used {integration.usageCount || 0} times
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {service.comingSoon ? (
                      <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed">
                        <Calendar className="w-4 h-4" />
                        Coming Soon
                      </div>
                    ) : connected ? (
                      <>
                        <button
                          onClick={() => handleTest(service, integration._id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                        >
                          <Zap className="w-4 h-4" />
                          Test
                        </button>
                        <button
                          onClick={() => handleDisconnect(service, integration._id)}
                          className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleSetup(service)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full my-8">
            <div className="p-4 md:p-6 max-h-[85vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 ${selectedService.color} rounded-lg`}>
                  {selectedService.icon && <selectedService.icon className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Connect {selectedService.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedService.description}</p>
                </div>
              </div>

              {/* Benefits */}
              {selectedService.benefits && selectedService.benefits.length > 0 && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-900 dark:text-green-100 font-medium mb-2">
                    What you'll get:
                  </p>
                  <ul className="space-y-2">
                    {selectedService.benefits.map((benefit, idx) => (
                      <li key={idx} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`My ${selectedService.name} Account`}
                    value={formData.displayName || ''}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {selectedService.fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!field.label.includes('Optional')}
                    />
                  </div>
                ))}
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <Key className="w-4 h-4 inline mr-1" />
                  Your credentials are encrypted and stored securely. They're only used to power your workflows.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSetupModal(false);
                    setFormData({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              🚀 Your CRM is Ready - Integrations Make it Smarter
            </h3>
            <p className="text-blue-100 text-sm mb-4">
              The platform works from day 1 with AI voice agents, SMS, email, and calling already set up. Connect your accounts to pull in YOUR business data and supercharge your CRM!
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">✓ Already Included</h4>
                <p className="text-blue-100 text-sm">
                  AI voice agents, SMS/calls, email, workflows - all powered by our infrastructure. Just sign up and start using!
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">✓ Connect YOUR Accounts</h4>
                <p className="text-blue-100 text-sm">
                  Pull reviews from Google, leads from Facebook, invoices from QuickBooks - make the CRM smarter with your data.
                </p>
              </div>
            </div>
            <ul className="text-sm text-blue-100 space-y-1">
              <li>🔐 Your data stays secure with OAuth connections</li>
              <li>⚡ One-click connection - no technical setup</li>
              <li>🎯 Pull YOUR data to make better decisions</li>
              <li>🔄 Two-way sync keeps everything up to date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
