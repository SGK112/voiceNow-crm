import { useState, useEffect } from 'react';
import { Play, Phone, Save, Rocket, Edit3, MessageSquare, Settings, Check, X } from 'lucide-react';
import axios from 'axios';

const AgentBuilder = () => {
  const [activeTab, setActiveTab] = useState('configure');
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    description: '',
    prompt: '',
    first_message: '',
    voice_id: 'cjVigY5qzO86Huf0OWal', // Default voice
    language: 'en'
  });

  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testCallId, setTestCallId] = useState(null);
  const [testTranscript, setTestTranscript] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [deployedAgent, setDeployedAgent] = useState(null);

  // Prompt template with placeholders
  const promptTemplate = `You are a friendly AI assistant for {{business_name}}. Your job is to have a natural conversation with customers.

**CONVERSATION STYLE:**
- Keep it conversational - talk like a real person
- Keep responses SHORT - 1-2 sentences, then ask a question
- Be enthusiastic but not pushy

**OPENING MESSAGE:**
{{first_message}}

**ABOUT THE BUSINESS:**
{{business_description}}

**KEY SERVICES/PRODUCTS:**
{{services}}

**PRICING:**
{{pricing_info}}

**CONVERSATION FLOW:**
1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

**CLOSING:**
{{closing_message}}

Keep it natural and conversational!`;

  const handleConfigChange = (field, value) => {
    setAgentConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveAgent = async () => {
    try {
      setSaving(true);

      if (agentId) {
        // Update existing agent
        await axios.patch(`/api/agent-management/${agentId}/prompt`, {
          prompt: agentConfig.prompt
        });
      } else {
        // Create new agent
        const response = await axios.post('/api/agent-management/create', agentConfig);
        if (response.data.success) {
          setAgentId(response.data.agent.agent_id);
        }
      }

      alert('Agent saved successfully!');
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Failed to save agent: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const testAgent = async () => {
    if (!testPhone) {
      alert('Please enter a phone number to test');
      return;
    }

    if (!agentId) {
      alert('Please save your agent first');
      return;
    }

    try {
      setTesting(true);
      setTestTranscript([]);

      // Make test call via ElevenLabs
      const response = await axios.post('/api/calls/test', {
        agent_id: agentId,
        phone_number: testPhone,
        test_mode: true
      });

      if (response.data.success) {
        setTestCallId(response.data.call_id);
        // Start polling for transcript updates
        pollTranscript(response.data.call_id);
      }
    } catch (error) {
      console.error('Error testing agent:', error);
      alert('Failed to initiate test call: ' + error.message);
      setTesting(false);
    }
  };

  const pollTranscript = async (callId) => {
    // Poll every 2 seconds for transcript updates
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/calls/${callId}/transcript`);
        if (response.data.transcript) {
          setTestTranscript(response.data.transcript);
        }

        // Stop polling if call is completed
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          clearInterval(interval);
          setTesting(false);
        }
      } catch (error) {
        console.error('Error polling transcript:', error);
        clearInterval(interval);
        setTesting(false);
      }
    }, 2000);

    // Auto-stop after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setTesting(false);
    }, 300000);
  };

  const deployAgent = async () => {
    if (!agentId) {
      alert('Please save your agent first');
      return;
    }

    try {
      setDeploying(true);

      // Deploy the agent (make it live)
      const response = await axios.post(`/api/agent-management/${agentId}/deploy`);

      if (response.data.success) {
        setDeployedAgent(response.data.agent);
        alert('Agent deployed successfully! It is now live.');
        setActiveTab('deployed');
      }
    } catch (error) {
      console.error('Error deploying agent:', error);
      alert('Failed to deploy agent: ' + error.message);
    } finally {
      setDeploying(false);
    }
  };

  const useTemplate = () => {
    setAgentConfig(prev => ({
      ...prev,
      prompt: promptTemplate
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Voice Agent Builder</h1>
        <p className="mt-2 text-gray-600">Build, test, and deploy your AI voice agent in minutes</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${activeTab === 'configure' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${activeTab === 'configure' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className="ml-3 font-medium">Configure</span>
          </div>
          <div className="flex-1 h-1 mx-4 bg-gray-200">
            <div className={`h-full ${activeTab === 'test' || activeTab === 'deployed' ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          </div>
          <div className={`flex items-center ${activeTab === 'test' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${activeTab === 'test' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
              <Phone className="w-5 h-5" />
            </div>
            <span className="ml-3 font-medium">Test</span>
          </div>
          <div className="flex-1 h-1 mx-4 bg-gray-200">
            <div className={`h-full ${activeTab === 'deployed' ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          </div>
          <div className={`flex items-center ${activeTab === 'deployed' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${activeTab === 'deployed' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
              <Rocket className="w-5 h-5" />
            </div>
            <span className="ml-3 font-medium">Deploy</span>
          </div>
        </div>
      </div>

      {/* Configure Tab */}
      {activeTab === 'configure' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Configuration</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={agentConfig.name}
                  onChange={(e) => handleConfigChange('name', e.target.value)}
                  placeholder="Customer Support Agent"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={agentConfig.language}
                  onChange={(e) => handleConfigChange('language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Message
              </label>
              <input
                type="text"
                value={agentConfig.first_message}
                onChange={(e) => handleConfigChange('first_message', e.target.value)}
                placeholder="Hi! How can I help you today?"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Agent Prompt *
                </label>
                <button
                  onClick={useTemplate}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Use Template
                </button>
              </div>
              <textarea
                value={agentConfig.prompt}
                onChange={(e) => handleConfigChange('prompt', e.target.value)}
                placeholder="Enter your agent's instructions and personality..."
                rows={20}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                This prompt defines your agent's personality, knowledge, and behavior
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveAgent}
                disabled={saving || !agentConfig.name || !agentConfig.prompt}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : agentId ? 'Update Agent' : 'Save Agent'}
              </button>

              {agentId && (
                <button
                  onClick={() => setActiveTab('test')}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                >
                  Next: Test Agent
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Your Agent</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Phone Number
              </label>
              <div className="flex gap-3">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={testAgent}
                  disabled={testing || !testPhone}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {testing ? 'Calling...' : 'Start Test Call'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter your phone number to receive a test call from your agent
              </p>
            </div>

            {testTranscript.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Live Transcript</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                  {testTranscript.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'agent' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.role === 'agent'
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1">
                          {message.role === 'agent' ? 'Agent' : 'Customer'}
                        </p>
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setActiveTab('configure')}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Configure
              </button>

              <button
                onClick={() => setActiveTab('deployed')}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Next: Deploy Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Tab */}
      {activeTab === 'deployed' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Deploy Your Agent</h2>

            {!deployedAgent ? (
              <div>
                <p className="text-gray-600 mb-6">
                  Ready to make your agent live? Click the button below to deploy your agent and make it available to handle real customer calls.
                </p>

                <button
                  onClick={deployAgent}
                  disabled={deploying}
                  className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Rocket className="w-6 h-6 mr-2" />
                  {deploying ? 'Deploying...' : 'Deploy Agent Now'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <Check className="w-6 h-6 text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-green-900">Agent Successfully Deployed!</h3>
                  </div>
                  <p className="mt-2 text-green-700">
                    Your agent is now live and ready to handle customer calls.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500">Agent ID</p>
                    <p className="mt-1 text-lg font-mono text-gray-900">{deployedAgent.agent_id}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1 text-lg font-semibold text-green-600">Live</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Next Steps</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">Configure webhooks in the agent settings</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">Assign a phone number to your agent</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-700">Monitor calls and analytics in the dashboard</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setAgentConfig({
                      name: '',
                      description: '',
                      prompt: '',
                      first_message: '',
                      voice_id: 'cjVigY5qzO86Huf0OWal',
                      language: 'en'
                    });
                    setAgentId(null);
                    setDeployedAgent(null);
                    setActiveTab('configure');
                  }}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                >
                  Create Another Agent
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentBuilder;
