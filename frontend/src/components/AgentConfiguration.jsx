import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import axios from 'axios';

const AgentConfiguration = ({ agentId }) => {
  const [agent, setAgent] = useState(null);
  const [webhookUrls, setWebhookUrls] = useState(null);
  const [configUrl, setConfigUrl] = useState(null);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (agentId) {
      loadAgentConfig();
    }
  }, [agentId]);

  const loadAgentConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/agent-management/${agentId}`);

      if (response.data.success) {
        setAgent(response.data.agent);
        setWebhookUrls(response.data.webhook_urls);
        setConfigUrl(response.data.config_url);
      }
    } catch (error) {
      console.error('Error loading agent config:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const openElevenLabsConfig = () => {
    if (!configUrl) return;

    // Open ElevenLabs in a new window with optimal dimensions
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      configUrl,
      'elevenlabs-config',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    setIsConfiguring(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No agent configuration found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Info Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{agent.name}</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Agent ID</p>
            <p className="mt-1 text-sm text-gray-900 font-mono">{agent.agent_id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Language</p>
            <p className="mt-1 text-sm text-gray-900">{agent.conversation_config?.agent?.language || 'en'}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-500 mb-2">Current Prompt</p>
          <div className="bg-gray-50 rounded-md p-4 max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {agent.conversation_config?.agent?.prompt?.prompt || 'No prompt configured'}
            </pre>
          </div>
        </div>
      </div>

      {/* Webhook URLs Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pre-configured Webhook URLs
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Copy these URLs to configure your agent's webhooks in the ElevenLabs dashboard:
        </p>

        <div className="space-y-3">
          {webhookUrls && Object.entries(webhookUrls).map(([key, url]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
                <div className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                  <code className="text-xs text-gray-800 flex-1 overflow-x-auto">
                    {url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(url, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configure Your Agent in ElevenLabs
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Follow these steps to connect your webhooks and activate your voice agent:
            </p>

            <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <p className="text-sm text-gray-700">Copy the webhook URLs from above (click the copy icon)</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <p className="text-sm text-gray-700">Click "Open ElevenLabs Dashboard" below (opens in new window)</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <p className="text-sm text-gray-700">In ElevenLabs, navigate to your agent settings → <strong>"Client Tools"</strong> tab</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <p className="text-sm text-gray-700">Add each webhook as a new tool and paste the corresponding URL</p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">5</div>
                <p className="text-sm text-gray-700">Save your changes and test the agent by making a test call</p>
              </div>
            </div>

            <div className="flex gap-3">
              {configUrl && (
                <button
                  onClick={openElevenLabsConfig}
                  className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transition-all"
                >
                  Open ElevenLabs Dashboard
                  <ExternalLink className="ml-2 w-4 h-4" />
                </button>
              )}

              {isConfiguring && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">Window opened - configure your agent</span>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> ElevenLabs blocks iframe embedding for security. We open their dashboard in a new window for the best experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConfiguration;
