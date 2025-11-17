import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Phone,
  MessageSquare,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Library,
  Zap,
  Search,
  Filter,
  TrendingUp,
  Users,
  Clock,
  Wand2,
  Music
} from 'lucide-react';
import api from '../services/api';
import AIVoiceAgentWizard from '../components/AIVoiceAgentWizard';
import AgentStudio from '../components/AgentStudio';
import VoiceLibraryBrowser from '../components/VoiceLibraryBrowser';

export default function AgentsUnified() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('deployed'); // 'library' or 'deployed'
  const [deployedAgents, setDeployedAgents] = useState([]);
  const [libraryAgents, setLibraryAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'voice', 'chat'
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showAgentStudio, setShowAgentStudio] = useState(false);
  const [selectedAgentForStudio, setSelectedAgentForStudio] = useState(null);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [activeTab]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      if (activeTab === 'deployed') {
        // Fetch user's deployed agents (voice + chat)
        const [voiceResponse, chatResponse] = await Promise.all([
          api.get('/agents'),
          api.get('/ai-agents')
        ]);

        const voiceAgents = (voiceResponse.data || []).map(a => ({ ...a, type: 'voice' }));
        const chatAgents = (chatResponse.data || []).map(a => ({ ...a, type: 'chat' }));

        setDeployedAgents([...voiceAgents, ...chatAgents]);
      } else {
        // Fetch agent library templates
        const response = await api.get('/agent-library/templates');
        console.log('Library agents loaded:', response.data);
        setLibraryAgents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = async (agentId, type, currentState) => {
    try {
      const endpoint = type === 'voice' ? '/agents' : '/ai-agents';
      await api.patch(`${endpoint}/${agentId}`, { enabled: !currentState });
      fetchAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const deleteAgent = async (agentId, type) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const endpoint = type === 'voice' ? '/agents' : '/ai-agents';
      await api.delete(`${endpoint}/${agentId}`);
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const deployFromLibrary = (templateId) => {
    console.log('Deploying agent with template ID:', templateId);
    if (!templateId) {
      alert('Error: No template ID found. Please refresh the page and try again.');
      return;
    }
    navigate(`/app/agent-library/setup/${templateId}`);
  };

  const filteredAgents = (activeTab === 'deployed' ? deployedAgents : libraryAgents).filter(agent => {
    const matchesSearch = agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || agent.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: deployedAgents.length,
    active: deployedAgents.filter(a => a.enabled || a.active).length,
    voice: deployedAgents.filter(a => a.type === 'voice').length,
    chat: deployedAgents.filter(a => a.type === 'chat').length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-600" />
              AI Agents
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Deploy AI agents to automate calls, follow-ups, collections, and more
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIWizard(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <Wand2 className="w-3.5 h-3.5" />
              AI Wizard
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Library className="w-3.5 h-3.5" />
              Browse Library
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {activeTab === 'deployed' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Agents</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                </div>
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Voice Agents</p>
                  <p className="text-xl font-bold text-purple-600">{stats.voice}</p>
                </div>
                <Phone className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Chat Agents</p>
                  <p className="text-xl font-bold text-orange-600">{stats.chat}</p>
                </div>
                <MessageSquare className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('deployed')}
              className={`py-2 px-1 border-b-2 font-medium text-xs transition-colors ${
                activeTab === 'deployed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                My Deployed Agents ({stats.total})
              </div>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`py-2 px-1 border-b-2 font-medium text-xs transition-colors ${
                activeTab === 'library'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Library className="w-3.5 h-3.5" />
                Agent Library
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="voice">Voice Only</option>
            <option value="chat">Chat Only</option>
          </select>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
            {activeTab === 'deployed' ? 'No agents deployed yet' : 'No agents found'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {activeTab === 'deployed'
              ? 'Deploy your first AI agent to automate your workflows'
              : 'Try adjusting your search or filters'
            }
          </p>
          {activeTab === 'deployed' && (
            <button
              onClick={() => setActiveTab('library')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Library className="w-3.5 h-3.5" />
              Browse Agent Library
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map(agent => (
            <div
              key={agent._id || agent.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">
                      {agent.icon || (agent.type === 'voice' ? '📞' : '💬')}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {agent.category || agent.type || 'AI'} Agent
                      </p>
                    </div>
                  </div>

                  {activeTab === 'deployed' && (
                    <button
                      onClick={() => toggleAgent(agent._id, agent.type, agent.enabled || agent.active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (agent.enabled || agent.active) ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          (agent.enabled || agent.active) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                  {agent.description || agent.prompt || 'No description available'}
                </p>

                {/* Stats (for deployed agents) */}
                {activeTab === 'deployed' && (
                  <div className="grid grid-cols-2 gap-2 mb-3 py-2 border-y border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Calls Made</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">
                        {agent.callsMade || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Success Rate</p>
                      <p className="text-base font-semibold text-green-600">
                        {agent.successRate || 0}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Features (for library) */}
                {activeTab === 'library' && agent.features && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Key Features:</p>
                    <ul className="space-y-0.5">
                      {agent.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-green-600 mt-0.5">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {activeTab === 'deployed' ? (
                      <>
                        <button
                          onClick={() => navigate(`/app/agents/${agent._id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Manage
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAgentForStudio(agent);
                            setShowAgentStudio(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-xs"
                          title="Advanced Node Configuration"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Advanced
                        </button>
                        <button
                          onClick={() => deleteAgent(agent._id, agent.type)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => deployFromLibrary(agent.id || agent._id)}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Deploy Agent
                      </button>
                    )}
                  </div>

                  {/* Browse Voices Button */}
                  {activeTab === 'deployed' && (
                    <>
                      {console.log('Agent type check:', {
                        name: agent.name,
                        type: agent.type,
                        isVoice: agent.type === 'voice',
                        activeTab
                      })}
                      {agent.type === 'voice' && (
                        <button
                          onClick={() => setShowVoiceLibrary(true)}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 text-xs font-semibold shadow-sm"
                        >
                          <Music className="w-3.5 h-3.5" />
                          Browse Voices
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Voice Agent Wizard */}
      {showAIWizard && (
        <AIVoiceAgentWizard
          onClose={() => setShowAIWizard(false)}
          onCreate={(newAgent) => {
            fetchAgents(); // Refresh agents list
            setActiveTab('deployed'); // Switch to deployed tab to see the new agent
          }}
        />
      )}

      {/* Agent Studio - Advanced Node Configuration */}
      {showAgentStudio && selectedAgentForStudio && (
        <div className="fixed inset-0 z-50">
          <AgentStudio
            agentId={selectedAgentForStudio._id}
            agentData={selectedAgentForStudio}
            onSave={async (configuration) => {
              try {
                await api.put(`/agents/${selectedAgentForStudio._id}`, {
                  configuration: configuration
                });
                alert('Agent configuration saved successfully!');
                setShowAgentStudio(false);
                setSelectedAgentForStudio(null);
                fetchAgents();
              } catch (error) {
                console.error('Error saving agent configuration:', error);
                alert('Failed to save configuration');
              }
            }}
            onClose={() => {
              setShowAgentStudio(false);
              setSelectedAgentForStudio(null);
            }}
          />
        </div>
      )}

      {/* Voice Library Modal */}
      {showVoiceLibrary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Voice Library</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Browse hundreds of community voices</p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceLibrary(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              <VoiceLibraryBrowser
                embedded={true}
                onVoiceSelect={(voice) => {
                  console.log('Voice selected from library:', voice);
                  // Close modal after selection
                  setShowVoiceLibrary(false);
                  // Show success message
                  alert(`Added "${voice.name}" to your voice library!`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
