import { useState, useEffect } from 'react';
import { aiAgentApi } from '../services/api';

export default function AIAgents() {
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [availableModels, setAvailableModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'chat',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    systemPrompt: '',
    configuration: {
      temperature: 0.7,
      maxTokens: 1000,
    },
    capabilities: {
      webSearch: false,
      functionCalling: false,
      fileAnalysis: false,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsRes, templatesRes, modelsRes] = await Promise.all([
        aiAgentApi.getAIAgents(),
        aiAgentApi.getAIAgentTemplates(),
        aiAgentApi.getAvailableModels(),
      ]);
      setAgents(agentsRes.data);
      setTemplates(templatesRes.data);
      setAvailableModels(modelsRes.data);
    } catch (error) {
      console.error('Error loading AI agents:', error);
      alert(error.response?.data?.message || 'Failed to load AI agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      await aiAgentApi.createAIAgent(formData);
      setShowCreateModal(false);
      setSelectedTemplate(null);
      loadData();
      alert('AI Agent created successfully!');
    } catch (error) {
      console.error('Error creating agent:', error);
      alert(error.response?.data?.message || 'Failed to create AI agent');
    }
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      provider: template.provider,
      model: template.model,
      systemPrompt: template.systemPrompt,
      configuration: template.configuration,
      capabilities: template.capabilities || {
        webSearch: false,
        functionCalling: false,
        fileAnalysis: false,
      },
    });
    setShowCreateModal(true);
  };

  const handleDeployAgent = async (agentId) => {
    try {
      await aiAgentApi.deployAIAgent(agentId);
      loadData();
      alert('AI Agent deployed successfully!');
    } catch (error) {
      console.error('Error deploying agent:', error);
      alert(error.response?.data?.message || 'Failed to deploy AI agent');
    }
  };

  const handlePauseAgent = async (agentId) => {
    try {
      await aiAgentApi.pauseAIAgent(agentId);
      loadData();
      alert('AI Agent paused successfully!');
    } catch (error) {
      console.error('Error pausing agent:', error);
      alert(error.response?.data?.message || 'Failed to pause AI agent');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this AI agent?')) return;
    try {
      await aiAgentApi.deleteAIAgent(agentId);
      loadData();
      alert('AI Agent deleted successfully!');
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(error.response?.data?.message || 'Failed to delete AI agent');
    }
  };

  const handleTestAgent = (agent) => {
    setSelectedAgent(agent);
    setChatMessages([]);
    setChatInput('');
    setShowChatModal(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await aiAgentApi.chatWithAgent(selectedAgent._id, newMessages);
      setChatMessages([...newMessages, response.data.message]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.message || 'Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      testing: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status] || badges.draft;
  };

  const getProviderIcon = (provider) => {
    const icons = {
      openai: '🤖',
      anthropic: '🧠',
      google: '🔍',
    };
    return icons[provider] || '🤖';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading AI Agents...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Chat Agents</h1>
          <p className="text-gray-600">
            Create and manage multi-provider AI agents for customer support, sales, and more
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create AI Agent
        </button>
      </div>

      {/* Templates Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {templates.map((template) => (
            <div
              key={template.name}
              className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition-all"
              onClick={() => handleUseTemplate(template)}
            >
              <div className="text-3xl mb-2">{template.icon}</div>
              <h3 className="font-semibold mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-2">{getProviderIcon(template.provider)}</span>
                <span>{template.model}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agents List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your AI Agents ({agents.length})</h2>
        {agents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-gray-600 mb-4">No AI agents yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Your First AI Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent._id} className="border rounded-lg p-6 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{agent.type}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                      agent.deployment.status
                    )}`}
                  >
                    {agent.deployment.status}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <span className="mr-2">{getProviderIcon(agent.provider)}</span>
                    <span className="capitalize">{agent.provider}</span>
                    <span className="mx-2">•</span>
                    <span>{agent.model}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{agent.systemPrompt}</p>
                </div>

                {agent.analytics && (
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-lg font-semibold">
                        {agent.analytics.totalConversations || 0}
                      </div>
                      <div className="text-xs text-gray-600">Conversations</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-lg font-semibold">
                        {agent.analytics.totalMessages || 0}
                      </div>
                      <div className="text-xs text-gray-600">Messages</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-lg font-semibold">
                        {agent.analytics.averageResponseTime
                          ? `${agent.analytics.averageResponseTime}ms`
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-600">Avg Time</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestAgent(agent)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Test Chat
                  </button>
                  {agent.deployment.status === 'draft' || agent.deployment.status === 'paused' ? (
                    <button
                      onClick={() => handleDeployAgent(agent._id)}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                    >
                      Deploy
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseAgent(agent._id)}
                      className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAgent(agent._id)}
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedTemplate ? `Create from Template: ${selectedTemplate.name}` : 'Create AI Agent'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Customer Support Bot"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="chat">Chat</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      const models = availableModels[provider] || [];
                      setFormData({
                        ...formData,
                        provider,
                        model: models[0]?.id || '',
                      });
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google AI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {(availableModels[formData.provider] || []).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">System Prompt</label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="6"
                  placeholder="You are a helpful customer support assistant..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Temperature ({formData.configuration.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.configuration.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        configuration: {
                          ...formData.configuration,
                          temperature: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.configuration.maxTokens}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        configuration: {
                          ...formData.configuration,
                          maxTokens: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="100"
                    max="4000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Capabilities</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.webSearch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capabilities: {
                            ...formData.capabilities,
                            webSearch: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Web Search</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.functionCalling}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capabilities: {
                            ...formData.capabilities,
                            functionCalling: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Function Calling</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.capabilities.fileAnalysis}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capabilities: {
                            ...formData.capabilities,
                            fileAnalysis: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">File Analysis</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create AI Agent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Test Modal */}
      {showChatModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Test Chat: {selectedAgent.name}</h2>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border rounded p-4 mb-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-2">💬</div>
                  <p>Start a conversation with your AI agent</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border text-gray-800'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-lg px-4 py-2">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 border rounded px-4 py-2"
                placeholder="Type your message..."
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
