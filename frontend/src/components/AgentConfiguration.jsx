import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import axios from 'axios';

const AgentConfiguration = ({ agentId }) => {
  const [agent, setAgent] = useState(null);
  const [webhookUrls, setWebhookUrls] = useState(null);
  const [configUrl, setConfigUrl] = useState(null);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [showIframe, setShowIframe] = useState(false);

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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          How to Configure Webhooks
        </h3>

        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 mb-4">
          <li>Copy the webhook URLs above</li>
          <li>Click "Configure in ElevenLabs Dashboard" below</li>
          <li>In the agent settings, navigate to "Client Tools"</li>
          <li>Add each webhook as a new tool</li>
          <li>Paste the corresponding URL for each webhook</li>
          <li>Test the webhooks by triggering them during a call</li>
        </ol>

        <div className="flex gap-3">
          <button
            onClick={() => setShowIframe(!showIframe)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showIframe ? 'Hide' : 'Show'} Configuration Panel
          </button>

          {configUrl && (
            <a
              href={configUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Open in ElevenLabs
              <ExternalLink className="ml-2 w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* ElevenLabs iframe */}
      {showIframe && configUrl && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              ElevenLabs Agent Configuration
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure advanced settings and webhooks directly in the ElevenLabs dashboard
            </p>
          </div>

          <div className="relative" style={{ height: '800px' }}>
            <iframe
              src={configUrl}
              className="w-full h-full border-0"
              title="ElevenLabs Agent Configuration"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentConfiguration;
