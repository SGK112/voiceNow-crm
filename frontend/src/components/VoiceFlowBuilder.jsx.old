import { useState, useEffect } from 'react';
import {
  Phone, Mic, Save, Play, Settings, Zap, Volume2, Users, FileText,
  ChevronLeft, ChevronRight, Plus, Copy, Trash2, ExternalLink,
  Sparkles, Bot, TestTube, Rocket, Check, X, Menu, Wand2,
  Hash, Headphones, Radio, BarChart3, Globe, Palette,
  MessageSquare, Shield, Database, Code, Upload, Link, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ElevenLabsEmbed from '@/components/ElevenLabsEmbed';
import axios from 'axios';

// Create axios instance with auth
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const VoiceFlowBuilder = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('agents'); // agents | creative | voices | analytics
  const [activeTab, setActiveTab] = useState('configure'); // varies by section
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Modal states
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showLeadUpload, setShowLeadUpload] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Agent configuration state
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    voice_id: 'cjVigY5qzO86Huf0OWal',
    language: 'en',
    prompt: '',
    first_message: '',
    model: 'gemini-2.5-flash'
  });

  // ElevenLabs Platform Sections
  const platformSections = [
    {
      id: 'agents',
      name: 'Conversational AI',
      icon: Bot,
      description: 'Build voice agents',
      color: 'from-blue-600 to-cyan-600',
      tabs: [
        { id: 'configure', name: 'Configure', icon: Settings },
        { id: 'agents-list', name: 'My Agents', icon: Users },
        { id: 'phone-numbers', name: 'Phone Numbers', icon: Hash },
        { id: 'tools', name: 'Client Tools', icon: Code },
        { id: 'test', name: 'Test Call', icon: TestTube }
      ]
    },
    {
      id: 'creative',
      name: 'Creative Studio',
      icon: Palette,
      description: 'Text-to-Speech & Voice Design',
      color: 'from-purple-600 to-pink-600',
      tabs: [
        { id: 'speech', name: 'Speech Synthesis', icon: Volume2 },
        { id: 'voice-library', name: 'Voice Library', icon: Headphones },
        { id: 'voice-design', name: 'Voice Design', icon: Wand2 },
        { id: 'voice-clone', name: 'Voice Cloning', icon: Copy }
      ]
    },
    {
      id: 'voices',
      name: 'Voice Lab',
      icon: Mic,
      description: 'Professional & Custom Voices',
      color: 'from-orange-600 to-red-600',
      tabs: [
        { id: 'professional', name: 'Professional Voices', icon: Headphones },
        { id: 'cloned', name: 'My Voices', icon: Copy },
        { id: 'settings', name: 'Voice Settings', icon: Settings }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Usage',
      icon: BarChart3,
      description: 'Monitor performance',
      color: 'from-green-600 to-teal-600',
      tabs: [
        { id: 'overview', name: 'Overview', icon: BarChart3 },
        { id: 'usage', name: 'Usage', icon: Database },
        { id: 'history', name: 'History', icon: FileText }
      ]
    }
  ];

  // Professional Voice Library
  const voiceLibrary = [
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Middle-aged, articulate', accent: 'American', gender: 'Male', useCase: 'Professional narration' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, authoritative', accent: 'American', gender: 'Male', useCase: 'Corporate, announcements' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, confident', accent: 'American', gender: 'Female', useCase: 'Customer service' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded, professional', accent: 'British', gender: 'Male', useCase: 'Business, education' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, authoritative', accent: 'American', gender: 'Male', useCase: 'News, presentations' },
    { id: 'pqHfZKP75CvOlQylNhV4', name: 'Callum', description: 'Intense, dramatic', accent: 'American', gender: 'Male', useCase: 'Storytelling' },
    { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Charlotte', description: 'Warm, friendly', accent: 'Swedish', gender: 'Female', useCase: 'Support, hospitality' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual, energetic', accent: 'Australian', gender: 'Male', useCase: 'Marketing, ads' },
    { id: 'XB0fDUnXU5powFXDhCwa', name: 'Clyde', description: 'Smooth, professional', accent: 'American', gender: 'Male', useCase: 'Sales, coaching' },
    { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Casual, conversational', accent: 'American', gender: 'Male', useCase: 'Podcasts' },
  ];

  // Agent templates
  const agentTemplates = [
    {
      icon: '📞',
      name: 'Receptionist',
      description: 'Answer calls, schedule appointments',
      prompt: 'You are a professional receptionist. Answer calls politely, gather customer information, and schedule appointments. Always confirm details.',
      color: '#3b82f6'
    },
    {
      icon: '💼',
      name: 'Sales Agent',
      description: 'Qualify leads, pitch services',
      prompt: 'You are a sales professional. Qualify leads by asking about their needs, budget, and timeline. Pitch services naturally and handle objections.',
      color: '#8b5cf6'
    },
    {
      icon: '🎧',
      name: 'Support Agent',
      description: 'Handle support calls, troubleshoot',
      prompt: 'You are a support agent. Listen to customer issues, ask clarifying questions, and provide helpful solutions. Escalate when needed.',
      color: '#10b981'
    },
    {
      icon: '📅',
      name: 'Appointment Setter',
      description: 'Book and confirm appointments',
      prompt: 'You are an appointment scheduler. Book appointments efficiently, confirm dates and times, send confirmations. Handle reschedules professionally.',
      color: '#f59e0b'
    },
    {
      icon: '💰',
      name: 'Collections Agent',
      description: 'Payment reminders & collections',
      prompt: 'You are a collections specialist. Remind customers about payments professionally, offer payment plans, and maintain positive relationships.',
      color: '#ef4444'
    },
    {
      icon: '🏠',
      name: 'Real Estate Agent',
      description: 'Property inquiries & showings',
      prompt: 'You are a real estate agent. Answer property questions, schedule showings, qualify buyers, and provide neighborhood information.',
      color: '#06b6d4'
    }
  ];

  // ElevenLabs page URLs
  const elevenLabsPages = {
    conversationalAI: 'https://elevenlabs.io/app/conversational-ai',
    agentDetail: (agentId) => `https://elevenlabs.io/app/conversational-ai/${agentId}`,
    phoneNumbers: 'https://elevenlabs.io/app/phone-numbers',
    speechSynthesis: 'https://elevenlabs.io/app/speech-synthesis',
    voiceLibrary: 'https://elevenlabs.io/app/voice-library',
    voiceLab: 'https://elevenlabs.io/app/voice-lab',
    voiceDesign: 'https://elevenlabs.io/app/voice-design',
    history: 'https://elevenlabs.io/app/history',
    usage: 'https://elevenlabs.io/app/usage',
    settings: 'https://elevenlabs.io/app/settings'
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await api.get('/agent-management/list');
      if (response.data.success) {
        setAgents(response.data.agents || []);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const createAgent = async () => {
    if (!agentConfig.name || !agentConfig.prompt) {
      alert('Please fill in agent name and prompt');
      return;
    }

    try {
      const response = await api.post('/agent-management/create', agentConfig);
      if (response.data.success) {
        setSelectedAgent(response.data.agent);
        loadAgents();
        alert(`✅ Agent "${agentConfig.name}" created successfully!\n\nAgent ID: ${response.data.agent.agent_id}\n\nReady to make test calls!`);
        setActiveTab('test'); // Auto-switch to test tab
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert(`Failed to create agent: ${error.response?.data?.message || error.message}`);
    }
  };

  // One-click create agent from template
  const createAgentFromTemplate = async (template) => {
    try {
      const config = {
        name: template.name,
        voice_id: 'cjVigY5qzO86Huf0OWal', // Eric voice
        language: 'en',
        prompt: template.prompt,
        first_message: `Hello! I'm your ${template.name.toLowerCase()}. How can I help you today?`,
        model: 'gemini-2.5-flash'
      };

      const response = await api.post('/agent-management/create', config);
      if (response.data.success) {
        setSelectedAgent(response.data.agent);
        setAgentConfig(config);
        loadAgents();
        alert(`✅ ${template.name} created! Agent ID: ${response.data.agent.agent_id}\n\nReady to make test calls!`);
        setActiveTab('test'); // Switch to test tab automatically
      }
    } catch (error) {
      console.error('Error creating agent from template:', error);
      alert(`Failed to create ${template.name}: ${error.response?.data?.message || error.message}`);
    }
  };

  // Quick test call with just phone number
  const quickTestCall = async (phoneNumber) => {
    if (!selectedAgent) {
      alert('Please create or select an agent first');
      return;
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    try {
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;

      const response = await api.post('/calls/test', {
        agent_id: selectedAgent.agent_id,
        phone_number: formattedNumber,
        test_mode: true
      });

      if (response.data.success) {
        alert(`📞 Test call initiated!\n\nCall ID: ${response.data.call_id}\n\nYou should receive a call shortly!`);
      }
    } catch (error) {
      console.error('Error initiating quick test call:', error);
      alert(`Failed to initiate call: ${error.response?.data?.message || error.message}`);
    }
  };

  const deployAgent = async () => {
    if (!selectedAgent) {
      alert('Please select an agent to deploy');
      return;
    }

    try {
      const response = await api.post(`/agent-management/${selectedAgent.agent_id}/deploy`);
      if (response.data.success) {
        alert(`Agent "${selectedAgent.name}" deployed successfully! You can now use it with phone numbers.`);
        // Optionally open the ElevenLabs dashboard to configure phone numbers
        window.open(elevenLabsPages.agentDetail(selectedAgent.agent_id), '_blank');
      }
    } catch (error) {
      console.error('Error deploying agent:', error);
      alert(`Failed to deploy agent: ${error.response?.data?.message || error.message}`);
    }
  };

  const getCurrentSection = () => platformSections.find(s => s.id === activeSection);
  const currentSection = getCurrentSection();

  const renderContent = () => {
    switch (activeSection) {
      case 'agents':
        return renderAgentsContent();
      case 'creative':
        return renderCreativeContent();
      case 'voices':
        return renderVoicesContent();
      case 'analytics':
        return renderAnalyticsContent();
      default:
        return null;
    }
  };

  const renderAgentsContent = () => {
    switch (activeTab) {
      case 'configure':
        return (
          <div className="space-y-6">
            {/* Quick Start Templates */}
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-xl p-6 text-white">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Zap className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Launch Your Agent in Seconds</h3>
                  <p className="text-white/90 text-sm">
                    Choose a template below and we'll create a fully-configured voice agent instantly. Ready to take calls right away!
                  </p>
                </div>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {agentTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => createAgentFromTemplate(template)}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white mb-1 flex items-center justify-between">
                          {template.name}
                          <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-white/80 line-clamp-2">
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Assistant Option */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Need something custom?</h4>
                      <p className="text-sm text-muted-foreground">Use our AI assistant to build a tailored agent</p>
                    </div>
                  </div>
                  <Button onClick={() => setShowAIAssistant(true)} variant="outline">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Assistant
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agent Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={agentConfig.name}
                    onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="e.g., Customer Support Agent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <select
                      value={agentConfig.language}
                      onChange={(e) => setAgentConfig({ ...agentConfig, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">AI Model</label>
                    <select
                      value={agentConfig.model}
                      onChange={(e) => setAgentConfig({ ...agentConfig, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="claude-3-haiku">Claude 3 Haiku</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Voice</label>
                  <select
                    value={agentConfig.voice_id}
                    onChange={(e) => setAgentConfig({ ...agentConfig, voice_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    {voiceLibrary.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} - {voice.description} ({voice.accent})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">First Message</label>
                  <input
                    type="text"
                    value={agentConfig.first_message}
                    onChange={(e) => setAgentConfig({ ...agentConfig, first_message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="e.g., Hello! How can I help you today?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Agent Prompt / Instructions</label>
                  <textarea
                    value={agentConfig.prompt}
                    onChange={(e) => setAgentConfig({ ...agentConfig, prompt: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
                    placeholder="Describe how your AI agent should behave, what it should do, and how it should respond..."
                  />
                </div>

                {/* Create Agent Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={createAgent}
                    disabled={!agentConfig.name || !agentConfig.prompt}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    size="lg"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Create Agent
                  </Button>
                  {(!agentConfig.name || !agentConfig.prompt) && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Fill in agent name and prompt to continue
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'agents-list':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ElevenLabs Conversational AI Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.conversationalAI}
                title="Conversational AI Dashboard"
                description="View and manage all your ElevenLabs voice agents in one place."
                instructions={[
                  "View all your created voice agents",
                  "Monitor agent performance and usage",
                  "Configure agent settings and prompts",
                  "Test agents with the built-in playground"
                ]}
              />
            </CardContent>
          </Card>
        );

      case 'phone-numbers':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phone Numbers Management</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.phoneNumbers}
                title="Phone Numbers Dashboard"
                description="Purchase and manage phone numbers for your voice agents."
                instructions={[
                  "Browse available phone numbers by country/region",
                  "Purchase new numbers for your agents",
                  "Configure call routing and forwarding",
                  "Monitor call activity and usage"
                ]}
              />
            </CardContent>
          </Card>
        );

      case 'tools':
        return selectedAgent ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Tools & Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.agentDetail(selectedAgent.agent_id)}
                title="Agent Configuration"
                description="Configure webhooks, client tools, and advanced settings for your voice agent."
                instructions={[
                  "Navigate to the 'Client Tools' tab",
                  "Add webhook URLs from the Agent Configuration section above",
                  "Configure conversation settings and prompts",
                  "Test the agent with different scenarios"
                ]}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Agent Selected</h3>
                <p className="text-muted-foreground mb-4">Create or select an agent to configure tools</p>
                <Button onClick={() => setActiveTab('configure')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'test':
        return (
          <div className="space-y-6">
            {/* Quick Dial Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Test Call</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 rounded-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">Instant Test Call</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter your number and click call - that's it!
                      </p>
                    </div>
                  </div>

                  {selectedAgent && (
                    <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-sm">
                        <Bot className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Active Agent:</span>
                        <span className="text-muted-foreground">{selectedAgent.name}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const phone = e.target.phone.value;
                    quickTestCall(phone);
                    e.target.phone.value = '';
                  }} className="space-y-3">
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="480-255-5887"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-lg"
                        disabled={!selectedAgent}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        US numbers only. We'll add +1 automatically.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!selectedAgent}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      Call Me Now
                    </Button>
                  </form>

                  {!selectedAgent && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 text-center">
                      Create an agent first to start testing
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Test Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTestModal(true)}
                  disabled={!selectedAgent}
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Test Settings
                </Button>

                {/* Test Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TestTube className="w-10 h-10 mx-auto mb-3 text-blue-600" />
                      <h4 className="font-semibold mb-2">No Billing</h4>
                      <p className="text-xs text-muted-foreground">
                        Test calls are free and won't count toward your quota
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Volume2 className="w-10 h-10 mx-auto mb-3 text-purple-600" />
                      <h4 className="font-semibold mb-2">Real-time Audio</h4>
                      <p className="text-xs text-muted-foreground">
                        Experience the actual voice quality and latency
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-green-600" />
                      <h4 className="font-semibold mb-2">Full Transcript</h4>
                      <p className="text-xs text-muted-foreground">
                        Get complete transcripts of test conversations
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const renderCreativeContent = () => {
    switch (activeTab) {
      case 'speech':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Speech Synthesis Studio</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.speechSynthesis}
                title="Speech Synthesis Studio"
                description="Generate high-quality voice audio from text in real-time."
                instructions={[
                  "Enter or paste your text",
                  "Select voice and adjust settings",
                  "Preview and fine-tune output",
                  "Download or use in your projects"
                ]}
              />
            </CardContent>
          </Card>
        );

      case 'voice-library':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Professional Voice Library</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.voiceLibrary}
                title="Voice Library Dashboard"
                description="Browse and select from thousands of AI voices."
                instructions={[
                  "Browse pre-made voices",
                  "Preview voices before using",
                  "Filter by language/accent/gender",
                  "Add voices to your collection"
                ]}
              />
            </CardContent>
          </Card>
        );

      case 'voice-design':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voice Design Studio</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.voiceDesign}
                title="Voice Design Studio"
                description="Create custom AI voices with advanced controls."
                instructions={[
                  "Design unique voice characteristics",
                  "Adjust pitch/tone/speed settings",
                  "Clone voices from samples",
                  "Save custom voice profiles"
                ]}
              />
            </CardContent>
          </Card>
        );

      case 'voice-clone':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voice Cloning - Voice Lab</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.voiceLab}
                title="Voice Lab"
                description="Clone voices using audio samples for personalized AI voices."
                instructions={[
                  "Upload voice samples (at least 1 minute)",
                  "Train the AI on voice characteristics",
                  "Test cloned voice quality",
                  "Deploy cloned voice to your agents"
                ]}
              />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderVoicesContent = () => {
    switch (activeTab) {
      case 'professional':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceLibrary.map((voice) => (
                <Card key={voice.id} className={`cursor-pointer transition-all ${selectedVoice?.id === voice.id ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setSelectedVoice(voice)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{voice.name}</h3>
                        <p className="text-sm text-muted-foreground">{voice.gender} • {voice.accent}</p>
                      </div>
                      {selectedVoice?.id === voice.id && (
                        <Badge className="bg-blue-600">Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{voice.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{voice.useCase}</span>
                      <Button size="sm" variant="outline">
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'cloned':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">My Cloned Voices</CardTitle>
                <Button size="sm" onClick={() => setActiveTab('voice-clone')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Clone New Voice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Mic className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Custom Voices Yet</h3>
                <p className="text-muted-foreground mb-4">Clone your voice or create a custom voice in the Voice Lab</p>
                <Button onClick={() => { setActiveSection('creative'); setActiveTab('voice-clone'); }}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Go to Voice Lab
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Stability</label>
                <input type="range" min="0" max="100" className="w-full" defaultValue="50" />
                <p className="text-xs text-muted-foreground mt-1">Controls voice consistency and predictability</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Similarity</label>
                <input type="range" min="0" max="100" className="w-full" defaultValue="75" />
                <p className="text-xs text-muted-foreground mt-1">How closely to match the original voice</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Style Exaggeration</label>
                <input type="range" min="0" max="100" className="w-full" defaultValue="0" />
                <p className="text-xs text-muted-foreground mt-1">Amplifies the style of the voice</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Speaker Boost</label>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Enable speaker boost for better clarity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderAnalyticsContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.usage}
                title="Usage & Analytics"
                description="Monitor your ElevenLabs usage and costs."
                instructions={[
                  "View current billing period usage",
                  "Track character/voice generation stats",
                  "Monitor API call volume",
                  "Set usage alerts and limits"
                ]}
              />
            </CardContent>
          </Card>
        );

      case 'usage':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Phone className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Total Calls</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">0m</p>
                      <p className="text-sm text-muted-foreground">Total Minutes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Volume2 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Characters Used</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );

      case 'history':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevenLabsEmbed
                url={elevenLabsPages.history}
                title="Generation History"
                description="Review and manage your voice generation history."
                instructions={[
                  "Browse past voice generations",
                  "Download previous audio files",
                  "Re-generate with same settings",
                  "Manage your audio library"
                ]}
              />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // AI Agent Assistant Modal Component
  const AIAgentAssistant = () => {
    const [description, setDescription] = useState('');
    const [agentType, setAgentType] = useState('general');
    const [loading, setLoading] = useState(false);

    const exampleAgents = [
      { title: 'Appointment Scheduler', desc: 'Answer calls, check availability, book appointments, and send confirmations to customers' },
      { title: 'Lead Qualifier', desc: 'Ask qualifying questions, assess budget and timeline, capture contact info, and route hot leads to sales' },
      { title: 'Customer Support', desc: 'Handle common questions, troubleshoot issues, collect feedback, and escalate complex cases' },
      { title: 'Payment Reminder', desc: 'Call customers about overdue invoices, offer payment plans, process payments, and send receipts' }
    ];

    const handleGenerate = async () => {
      if (!description.trim()) {
        alert('Please describe what you want your agent to do');
        return;
      }

      setLoading(true);
      try {
        // Generate agent configuration based on description
        const generatedConfig = {
          name: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
          voice_id: agentType === 'sales' ? 'pNInz6obpgDQGcFmaJgB' : 'cjVigY5qzO86Huf0OWal',
          language: 'en',
          prompt: `You are a professional ${agentType} agent. ${description}\n\nBe helpful, professional, and focused on delivering value to the customer.`,
          first_message: `Hello! I'm your ${agentType} assistant. How can I help you today?`,
          model: 'gemini-2.5-flash'
        };

        // Actually create the agent via API
        const response = await api.post('/agent-management/create', generatedConfig);

        if (response.data.success) {
          setSelectedAgent(response.data.agent);
          setAgentConfig(generatedConfig);
          loadAgents();
          setShowAIAssistant(false);
          alert(`Agent "${response.data.agent.name}" created successfully! Agent ID: ${response.data.agent.agent_id}`);
        } else {
          throw new Error(response.data.message || 'Failed to create agent');
        }
      } catch (error) {
        console.error('Error generating agent:', error);
        alert(`Failed to create agent: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 rounded-t-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">AI Agent Assistant</h2>
                    <p className="text-blue-100 text-sm mt-1">Powered by Claude AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIAssistant(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <p className="text-white/90 text-sm">
                Describe your perfect voice agent and let AI build it for you
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* Agent Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Agent Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['general', 'sales', 'support', 'service'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setAgentType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      agentType === type
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Describe Your Agent's Purpose
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: I need an agent that answers customer calls, qualifies leads by asking about their project needs and budget, books appointments with my sales team, and sends confirmation emails..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Be specific about what the agent should do, ask, and how it should respond
              </p>
            </div>

            {/* Example Agents */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Or try an example:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {exampleAgents.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDescription(example.desc)}
                    className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {example.title}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {example.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAIAssistant(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Agent
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Test Call Modal Component
  const TestCallModal = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [testMode, setTestMode] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleInitiateCall = async () => {
      if (!phoneNumber.trim()) {
        alert('Please enter a phone number');
        return;
      }

      if (!selectedAgent) {
        alert('Please select an agent first');
        return;
      }

      setLoading(true);
      try {
        const response = await api.post('/calls/test', {
          agent_id: selectedAgent.agent_id,
          phone_number: phoneNumber,
          test_mode: testMode
        });

        if (response.data.success) {
          alert(`Test call initiated! Call ID: ${response.data.call_id}`);
          setShowTestModal(false);
          setPhoneNumber('');
        }
      } catch (error) {
        console.error('Error initiating test call:', error);
        alert('Failed to initiate test call');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Test Call</h2>
                  <p className="text-green-100 text-sm mt-1">Make a test call to your agent</p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Include country code (e.g., +1 for US)
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Test Mode (No billing)
                </span>
              </label>
            </div>

            {selectedAgent && (
              <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Testing Agent:</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedAgent.name}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateCall}
                disabled={loading || !phoneNumber.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Calling...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Start Test Call
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Lead Upload Modal Component
  const LeadUploadModal = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setFile(selectedFile);
      }
    };

    const handleUpload = async () => {
      if (!file) {
        alert('Please select a file');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('leads', file);
        if (selectedAgent) {
          formData.append('agent_id', selectedAgent.agent_id);
        }

        // In production, send to your upload endpoint
        await new Promise(resolve => setTimeout(resolve, 2000));

        alert('Leads uploaded successfully!');
        setShowLeadUpload(false);
        setFile(null);
      } catch (error) {
        console.error('Error uploading leads:', error);
        alert('Failed to upload leads');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Upload Leads</h2>
                  <p className="text-orange-100 text-sm mt-1">Import contacts for agent calls</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeadUpload(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload CSV or Excel File
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="lead-upload"
                />
                <label
                  htmlFor="lead-upload"
                  className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer font-medium transition-colors"
                >
                  Choose File
                </label>
                {file && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                File should include columns: name, phone, email (optional)
              </p>
            </div>

            {selectedAgent && (
              <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assign to Agent:</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedAgent.name}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeadUpload(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Leads
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Webhook Configuration Modal Component
  const WebhookConfigModal = () => {
    const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [webhookEvent, setWebhookEvent] = useState('call_ended');

    const availableWorkflows = [
      { id: 'wf1', name: 'Lead Capture & Email', description: 'Save lead and send welcome email' },
      { id: 'wf2', name: 'Team Notification', description: 'Notify sales team on Slack' },
      { id: 'wf3', name: 'Follow-up SMS', description: 'Send follow-up message after call' },
      { id: 'wf4', name: 'Calendar Booking', description: 'Create calendar event' }
    ];

    const webhookEvents = [
      { value: 'call_started', label: 'Call Started' },
      { value: 'call_ended', label: 'Call Ended' },
      { value: 'lead_captured', label: 'Lead Captured' },
      { value: 'appointment_booked', label: 'Appointment Booked' }
    ];

    const handleConnect = () => {
      if (!selectedWorkflow) {
        alert('Please select a workflow');
        return;
      }

      alert('Webhook connected successfully!');
      setShowWebhookConfig(false);
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Link className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Connect Workflow</h2>
                  <p className="text-blue-100 text-sm mt-1">Add automation to your agent</p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookConfig(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Event
              </label>
              <select
                value={webhookEvent}
                onChange={(e) => setWebhookEvent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {webhookEvents.map(event => (
                  <option key={event.value} value={event.value}>{event.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Workflow
              </label>
              <div className="space-y-2">
                {availableWorkflows.map(workflow => (
                  <button
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedWorkflow === workflow.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Zap className={`w-5 h-5 mt-0.5 ${selectedWorkflow === workflow.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{workflow.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{workflow.description}</p>
                      </div>
                      {selectedWorkflow === workflow.id && (
                        <Check className="w-5 h-5 text-blue-600 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWebhookConfig(false)}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!selectedWorkflow}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Link className="w-4 h-4" />
                Connect Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Modals */}
      {showAIAssistant && <AIAgentAssistant />}
      {showTestModal && <TestCallModal />}
      {showLeadUpload && <LeadUploadModal />}
      {showWebhookConfig && <WebhookConfigModal />}

      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Templates & Agents */}
      <div className={`${leftPanelOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col`}>
        {leftPanelOpen && (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  ElevenLabs
                </h2>
                <Button
                  size="sm"
                  onClick={() => setSelectedAgent(null)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>

              {/* Platform Sections */}
              <div className="space-y-1">
                {platformSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => { setActiveSection(section.id); setActiveTab(section.tabs[0].id); }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? `bg-gradient-to-r ${section.color} text-white shadow-md`
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{section.name}</h4>
                          <p className={`text-xs truncate ${activeSection === section.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agent Templates */}
            {activeSection === 'agents' && (
              <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Quick Start Templates</h3>
                <div className="space-y-2 mb-6">
                  {agentTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setAgentConfig({ ...agentConfig, name: template.name, prompt: template.prompt })}
                      className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{template.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">My Agents</h3>
                <div className="space-y-2">
                  {Array.isArray(agents) && agents.length > 0 ? (
                    agents.map((agent) => (
                      <button
                        key={agent.agent_id}
                        onClick={() => setSelectedAgent(agent)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedAgent?.agent_id === agent.agent_id
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-600'
                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground">Created {new Date(agent.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No agents yet</p>
                      <p className="text-xs mt-1">Create one using a template above</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toggle Left Panel */}
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="w-6 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
      >
        {leftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Center Panel - Studio */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${currentSection?.color} rounded-lg flex items-center justify-center`}>
                {currentSection && <currentSection.icon className="w-4 h-4 text-white" />}
              </div>
              <div>
                <h1 className="text-lg font-bold">{currentSection?.name}</h1>
                <p className="text-xs text-muted-foreground">{currentSection?.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeSection === 'agents' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowAIAssistant(true)}
                    className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    AI Assistant
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowTestModal(true)}
                    variant="outline"
                    disabled={!selectedAgent}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    Test Call
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowLeadUpload(true)}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Upload Leads
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowWebhookConfig(true)}
                    variant="outline"
                    disabled={!selectedAgent}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Workflows
                  </Button>
                  <Button
                    size="sm"
                    onClick={createAgent}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Agent
                  </Button>
                  <Button
                    size="sm"
                    onClick={deployAgent}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={!selectedAgent}
                  >
                    <Rocket className="w-4 h-4 mr-1" />
                    Deploy
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto">
            {currentSection?.tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? `bg-gradient-to-r ${currentSection.color}` : ''}
                >
                  <TabIcon className="w-4 h-4 mr-1" />
                  {tab.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Studio Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default VoiceFlowBuilder;
