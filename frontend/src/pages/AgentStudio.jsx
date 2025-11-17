import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Save, Trash2, Edit, Play, Pause, Volume2, Search, Sparkles, User, MoreVertical, PhoneCall, MessageSquare, Mail, Wand2 } from 'lucide-react';
import axios from 'axios';
import VoiceLibraryBrowser from '../components/VoiceLibraryBrowser';

// Configure axios with auth
const API_URL = import.meta.env.MODE === 'production'
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AgentStudio = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
  const [voices, setVoices] = useState([]);
  const [myAgents, setMyAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Voice library state
  const [searchVoice, setSearchVoice] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);

  // Edit state
  const [editingAgent, setEditingAgent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  // Test dialogs state
  const [showTestCallDialog, setShowTestCallDialog] = useState(false);
  const [showTestSmsDialog, setShowTestSmsDialog] = useState(false);
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [testAgent, setTestAgent] = useState(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testSmsMessage, setTestSmsMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('');
  const [testEmailMessage, setTestEmailMessage] = useState('');

  // Agent creation state
  const [agentForm, setAgentForm] = useState({
    name: '',
    voiceId: '',
    prompt: '',
    firstMessage: '',
    language: 'en',
    temperature: 0.7,
    maxTokens: 500
  });

  // Dynamic variables help
  const dynamicVariablesHelp = [
    { var: '{{customer_name}}', desc: 'Customer\'s first name' },
    { var: '{{customer_phone}}', desc: 'Customer\'s phone number' },
    { var: '{{customer_email}}', desc: 'Customer\'s email address' },
    { var: '{{company_name}}', desc: 'Your company name' },
    { var: '{{agent_name}}', desc: 'AI agent\'s name' },
  ];

  // Load voices on mount
  useEffect(() => {
    fetchVoices();
    fetchMyAgents();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
      }
    };
  }, [audioPlayer]);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/elevenlabs/voices');
      setVoices(response.data.voices || []);
    } catch (err) {
      setError('Failed to load voice library');
      console.error('Error fetching voices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAgents = async () => {
    try {
      const response = await api.get('/elevenlabs/agents');
      setMyAgents(response.data.agents || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const playVoicePreview = async (voice) => {
    if (playingVoice === voice.voice_id) {
      // Stop playing
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing audio
    if (audioPlayer) {
      audioPlayer.pause();
    }

    // Play preview if available
    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url);
      audio.onended = () => setPlayingVoice(null);
      audio.onerror = () => {
        setError('Failed to play voice preview');
        setPlayingVoice(null);
      };

      setAudioPlayer(audio);
      setPlayingVoice(voice.voice_id);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play voice preview');
        setPlayingVoice(null);
      });
    }
  };

  const selectVoice = (voice) => {
    setSelectedVoice(voice);
    setAgentForm(prev => ({ ...prev, voiceId: voice.voice_id }));
    setSuccess(`Selected voice: ${voice.name}`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const createAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎙️ Creating agent with form data:', agentForm);

      // Validate form
      if (!agentForm.name) {
        setError('Please enter an agent name');
        setLoading(false);
        return;
      }

      if (!agentForm.voiceId) {
        setError('Please select a voice from the library');
        setLoading(false);
        return;
      }

      if (!agentForm.prompt) {
        setError('Please enter agent instructions/prompt');
        setLoading(false);
        return;
      }

      console.log('✅ Form validation passed, sending request...');

      const response = await api.post('/elevenlabs/agents/create', agentForm);

      console.log('✅ Agent created successfully:', response.data);

      setSuccess('Agent created successfully!');
      setAgentForm({
        name: '',
        voiceId: '',
        prompt: '',
        firstMessage: '',
        language: 'en',
        temperature: 0.7,
        maxTokens: 500
      });
      setSelectedVoice(null);

      // Refresh agents list
      fetchMyAgents();

      // Switch to manage tab
      setTimeout(() => {
        setActiveTab('manage');
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('❌ Error creating agent:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create agent. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const startEditAgent = (agent) => {
    setEditingAgent({
      ...agent,
      voiceId: agent.voiceId,
      prompt: agent.script,
      firstMessage: agent.firstMessage,
      temperature: agent.metadata?.temperature || 0.7,
      maxTokens: agent.metadata?.maxTokens || 500
    });
    setSelectedVoice(Array.isArray(voices) ? voices.find(v => v.voice_id === agent.voiceId) || null : null);
    setShowEditModal(true);
  };

  const updateAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!editingAgent.name || !editingAgent.voiceId || !editingAgent.prompt) {
        setError('Please fill in all required fields');
        return;
      }

      await api.patch(`/elevenlabs/agents/${editingAgent._id}/update`, {
        name: editingAgent.name,
        voiceId: editingAgent.voiceId,
        prompt: editingAgent.prompt,
        firstMessage: editingAgent.firstMessage,
        language: editingAgent.language,
        temperature: editingAgent.temperature,
        maxTokens: editingAgent.maxTokens
      });

      setSuccess('Agent updated successfully!');
      setShowEditModal(false);
      setEditingAgent(null);
      setSelectedVoice(null);

      // Refresh agents list
      fetchMyAgents();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update agent');
      console.error('Error updating agent:', err);
    } finally {
      setLoading(false);
    }
  };

  // Test handlers
  const handleTestCall = (agent) => {
    setTestAgent(agent);
    setTestPhoneNumber('');
    setShowTestCallDialog(true);
  };

  const handleTestSms = (agent) => {
    setTestAgent(agent);
    setTestSmsMessage(`Test SMS from ${agent.name}: ${agent.script.substring(0, 100)}...`);
    setShowTestSmsDialog(true);
  };

  const handleTestEmail = (agent) => {
    setTestAgent(agent);
    setTestEmailSubject(`Test Email from ${agent.name}`);
    setTestEmailMessage(`<h2>Test Email from ${agent.name}</h2>\n<p>This is a test email.</p>\n<p><strong>Script:</strong> ${agent.script.substring(0, 200)}...</p>`);
    setShowTestEmailDialog(true);
  };

  const sendTestCall = async () => {
    try {
      setLoading(true);
      await api.post('/agents/test-call', {
        agentId: testAgent._id,
        phoneNumber: testPhoneNumber
      });
      setSuccess('Test call initiated!');
      setShowTestCallDialog(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate test call');
    } finally {
      setLoading(false);
    }
  };

  const sendTestSms = async () => {
    try {
      setLoading(true);
      await api.post('/agents/test-sms', {
        agentId: testAgent._id,
        phoneNumber: testPhoneNumber,
        testMessage: testSmsMessage
      });
      setSuccess('Test SMS sent!');
      setShowTestSmsDialog(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send test SMS');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      setLoading(true);
      await api.post('/agents/test-email', {
        agentId: testAgent._id,
        email: testEmail,
        testSubject: testEmailSubject,
        testMessage: testEmailMessage
      });
      setSuccess('Test email sent!');
      setShowTestEmailDialog(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await api.delete(`/elevenlabs/agents/${agentId}`);
      setSuccess('Agent deleted successfully');
      fetchMyAgents();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete agent');
      console.error('Error deleting agent:', err);
    }
  };

  const filteredVoices = Array.isArray(voices) ? voices.filter(voice =>
    voice.name?.toLowerCase().includes(searchVoice.toLowerCase()) ||
    voice.labels?.gender?.toLowerCase().includes(searchVoice.toLowerCase()) ||
    voice.labels?.accent?.toLowerCase().includes(searchVoice.toLowerCase())
  ) : [];

  const insertVariable = (variable) => {
    const textarea = document.getElementById('agent-prompt');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = agentForm.prompt;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setAgentForm(prev => ({ ...prev, prompt: newText }));

      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-600" />
              Agent Studio
            </h1>
            <p className="text-muted-foreground mt-2">
              Create powerful AI voice agents with custom voices and dynamic personalization
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/app/agent-studio/visual')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Sparkles className="w-5 h-5" />
              Visual Builder
            </button>
            <button
              onClick={() => navigate('/app/agent-studio/new')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Wand2 className="w-5 h-5" />
              Use Guided Wizard
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'create'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Agent
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'manage'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Agents ({myAgents.length})
          </button>
        </div>

        {/* Create Agent Tab */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voice Library - Enhanced with full browser */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                  Voice Library
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse and select from thousands of AI voices
                </p>
              </div>
              <div className="p-6">
                <VoiceLibraryBrowser
                  embedded={true}
                  voices={voices}
                  onVoiceSelect={(voice) => {
                    setSelectedVoice(voice);
                    setAgentForm(prev => ({ ...prev, voiceId: voice.voice_id }));
                  }}
                />
              </div>
            </div>

            {/* Agent Configuration */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-600" />
                Agent Configuration
              </h2>

              <div className="space-y-4">
                {/* Agent Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sarah - Lead Qualification"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Selected Voice */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Selected Voice *
                  </label>
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg">
                    {selectedVoice ? (
                      <>
                        <User className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">{selectedVoice.name}</span>
                        <span className="text-sm text-gray-500">
                          ({selectedVoice.labels?.gender}, {selectedVoice.labels?.accent})
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Select a voice from the library</span>
                    )}
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Agent Language *
                  </label>
                  <select
                    value={agentForm.language}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="de">🇩🇪 German</option>
                    <option value="it">🇮🇹 Italian</option>
                    <option value="pt">🇧🇷 Portuguese</option>
                    <option value="pl">🇵🇱 Polish</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="ja">🇯🇵 Japanese</option>
                    <option value="zh">🇨🇳 Chinese</option>
                    <option value="ko">🇰🇷 Korean</option>
                    <option value="nl">🇳🇱 Dutch</option>
                    <option value="tr">🇹🇷 Turkish</option>
                    <option value="sv">🇸🇪 Swedish</option>
                    <option value="id">🇮🇩 Indonesian</option>
                    <option value="fil">🇵🇭 Filipino</option>
                    <option value="uk">🇺🇦 Ukrainian</option>
                    <option value="el">🇬🇷 Greek</option>
                    <option value="cs">🇨🇿 Czech</option>
                    <option value="ro">🇷🇴 Romanian</option>
                    <option value="da">🇩🇰 Danish</option>
                    <option value="bg">🇧🇬 Bulgarian</option>
                    <option value="ms">🇲🇾 Malay</option>
                    <option value="sk">🇸🇰 Slovak</option>
                    <option value="ar">🇸🇦 Arabic</option>
                    <option value="ta">🇮🇳 Tamil</option>
                    <option value="fi">🇫🇮 Finnish</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    ElevenLabs supports 29 languages with automatic language detection
                  </p>
                </div>

                {/* Dynamic Variables Help */}
                <div className="bg-blue-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">Dynamic Variables</h3>
                  <p className="text-sm text-purple-700 mb-2">
                    Use these variables in your prompt to personalize each call:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {dynamicVariablesHelp.map((item) => (
                      <button
                        key={item.var}
                        onClick={() => insertVariable(item.var)}
                        className="text-left text-xs bg-card dark:bg-muted px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        title={item.desc}
                      >
                        <code className="text-blue-600 font-mono">{item.var}</code>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agent Prompt */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Agent Prompt (System Instructions) *
                  </label>
                  <textarea
                    id="agent-prompt"
                    rows={8}
                    placeholder="You are a helpful AI assistant for {{company_name}}. Your name is {{agent_name}}. You're calling {{customer_name}} to discuss their interest in our services..."
                    value={agentForm.prompt}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This template will be personalized with lead data when making calls
                  </p>
                </div>

                {/* First Message */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    First Message (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Hi {{customer_name}}, this is {{agent_name}} calling from {{company_name}}..."
                    value={agentForm.firstMessage}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, firstMessage: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Advanced Settings */}
                <details className="border border-border rounded-lg">
                  <summary className="px-4 py-2 cursor-pointer font-medium text-foreground hover:bg-gray-50">
                    Advanced Settings
                  </summary>
                  <div className="p-4 space-y-4 border-t border-border">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Language
                      </label>
                      <select
                        value={agentForm.language}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Temperature ({agentForm.temperature})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={agentForm.temperature}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Lower = more focused, Higher = more creative
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="2000"
                        value={agentForm.maxTokens}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </details>

                {/* Create Button */}
                <button
                  onClick={createAgent}
                  disabled={loading || !agentForm.name || !agentForm.voiceId || !agentForm.prompt}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating Agent...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Create Agent Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Agents Tab */}
        {activeTab === 'manage' && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">My Agent Templates</h2>

            {myAgents.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No agents yet</h3>
                <p className="text-muted-foreground mb-4">Create your first agent template to get started</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Agent
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAgents.map((agent) => (
                  <div
                    key={agent._id}
                    className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{agent.name}</h3>
                        <p className="text-sm text-gray-500">
                          Voice: {Array.isArray(voices) ? voices.find(v => v.voice_id === agent.voiceId)?.name || 'Unknown' : 'Unknown'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        agent.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {agent.script}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditAgent(agent)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === agent._id ? null : agent._id);
                          }}
                          className="px-3 py-2 bg-gray-100 text-blue-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {menuOpen === agent._id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-card dark:bg-popover rounded-lg shadow-lg border border-border py-1 z-20">
                              <button
                                onClick={() => {
                                  handleTestCall(agent);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-gray-100 flex items-center gap-2"
                              >
                                <PhoneCall className="w-4 h-4" />
                                Test Call
                              </button>
                              <button
                                onClick={() => {
                                  handleTestSms(agent);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-gray-100 flex items-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Test SMS
                              </button>
                              <button
                                onClick={() => {
                                  handleTestEmail(agent);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                Test Email
                              </button>
                              <div className="border-t border-border my-1" />
                              <button
                                onClick={() => {
                                  deleteAgent(agent._id);
                                  setMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Agent Modal */}
        {showEditModal && editingAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Edit Agent</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingAgent(null);
                      setSelectedVoice(null);
                    }}
                    className="text-gray-400 hover:text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Voice Selection */}
                  <div>
                    <h3 className="font-semibold mb-3">Change Voice</h3>
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {Array.isArray(voices) && voices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          onClick={() => {
                            setSelectedVoice(voice);
                            setEditingAgent(prev => ({ ...prev, voiceId: voice.voice_id }));
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            editingAgent.voiceId === voice.voice_id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-border hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{voice.name}</div>
                              <div className="flex gap-1 mt-1">
                                {voice.labels?.gender && (
                                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                    {voice.labels.gender}
                                  </span>
                                )}
                                {voice.labels?.accent && (
                                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                    {voice.labels.accent}
                                  </span>
                                )}
                              </div>
                            </div>
                            {voice.preview_url && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playVoicePreview(voice);
                                }}
                                className="p-2 rounded-full hover:bg-blue-100"
                              >
                                {playingVoice === voice.voice_id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agent Configuration */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Agent Name</label>
                      <input
                        type="text"
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">System Prompt</label>
                      <textarea
                        rows={6}
                        value={editingAgent.prompt}
                        onChange={(e) => setEditingAgent(prev => ({ ...prev, prompt: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">First Message</label>
                      <input
                        type="text"
                        value={editingAgent.firstMessage}
                        onChange={(e) => setEditingAgent(prev => ({ ...prev, firstMessage: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingAgent(null);
                          setSelectedVoice(null);
                        }}
                        className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateAgent}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        {loading ? 'Updating...' : 'Update Agent'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Call Dialog */}
        {showTestCallDialog && testAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Test Call - {testAgent.name}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+1 (480) 555-5887"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter with country code (e.g., +1 for US)</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowTestCallDialog(false);
                      setTestAgent(null);
                      setTestPhoneNumber('');
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendTestCall}
                    disabled={loading || !testPhoneNumber.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    {loading ? 'Calling...' : 'Make Test Call'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test SMS Dialog */}
        {showTestSmsDialog && testAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Test SMS - {testAgent.name}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+1 (480) 555-5887"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">SMS Message *</label>
                  <textarea
                    rows={4}
                    placeholder="Your test message..."
                    value={testSmsMessage}
                    onChange={(e) => setTestSmsMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">{testSmsMessage.length} characters</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowTestSmsDialog(false);
                      setTestAgent(null);
                      setTestPhoneNumber('');
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendTestSms}
                    disabled={loading || !testPhoneNumber.trim() || !testSmsMessage.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {loading ? 'Sending...' : 'Send Test SMS'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Email Dialog */}
        {showTestEmailDialog && testAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-card rounded-xl p-6 max-w-2xl w-full mx-4 my-8">
              <h3 className="text-lg font-semibold mb-4">Test Email - {testAgent.name}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <input
                    type="text"
                    placeholder="Email subject line"
                    value={testEmailSubject}
                    onChange={(e) => setTestEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email Message (HTML) *</label>
                  <textarea
                    rows={8}
                    placeholder="<p>Your HTML email content...</p>"
                    value={testEmailMessage}
                    onChange={(e) => setTestEmailMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can use HTML formatting</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowTestEmailDialog(false);
                      setTestAgent(null);
                      setTestEmail('');
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendTestEmail}
                    disabled={loading || !testEmail.trim() || !testEmailSubject.trim() || !testEmailMessage.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {loading ? 'Sending...' : 'Send Test Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentStudio;
