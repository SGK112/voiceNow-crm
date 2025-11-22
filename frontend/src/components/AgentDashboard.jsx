import { useState, useEffect } from 'react';
import { Phone, TrendingUp, Clock, Users, BarChart3, Calendar, MessageSquare, Settings, Plus, Play, Pause, Edit, Trash2, Sparkles, PhoneCall, Rocket, TestTube, FileEdit, History, Save, Mic, Volume2, Send, ChevronRight, Copy, RotateCcw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UniversalAIBuilder from './UniversalAIBuilder';
import { toast } from '@/utils/toast';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';

/**
 * AgentDashboard - VoiceFlow CRM Agent Management
 *
 * Unified dashboard for viewing and managing all voice agents
 * Shows usage, analytics, and performance - NO external iframes
 */
const AgentDashboard = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [testCallDialogOpen, setTestCallDialogOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTestCalling, setIsTestCalling] = useState(false);

  // Deployment management state
  const [deploymentDialogOpen, setDeploymentDialogOpen] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('draft');
  const [deploymentChanges, setDeploymentChanges] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [changelog, setChangelog] = useState([]);

  // Studio mode state
  const [viewMode, setViewMode] = useState('studio'); // 'studio' or 'analytics'
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedFirstMessage, setEditedFirstMessage] = useState('');
  const [editedName, setEditedName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testConversation, setTestConversation] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Voice library state
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voicesPage, setVoicesPage] = useState(1);
  const [hasMoreVoices, setHasMoreVoices] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');

  // Agent channel/type state
  const [agentType, setAgentType] = useState('voice'); // 'voice', 'sms', 'email'

  useEffect(() => {
    loadAgents();
    loadVoices(); // Load initial voices
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentDetails(selectedAgent._id);
      // Load agent data into editor
      setEditedName(selectedAgent.name || '');
      setEditedPrompt(selectedAgent.prompt || selectedAgent.configuration?.prompt || '');
      setEditedFirstMessage(selectedAgent.firstMessage || selectedAgent.configuration?.firstMessage || 'Hello! How can I help you today?');
      setAgentType(selectedAgent.type || 'voice'); // Set agent type
      setHasUnsavedChanges(false);
      setTestConversation([]);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/agents');
      setAgents(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedAgent(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentDetails = async (agentId) => {
    try {
      const [perfResponse, callsResponse] = await Promise.all([
        api.get(`/agents/${agentId}/performance`),
        api.get(`/agents/${agentId}/calls`)
      ]);

      setPerformance(perfResponse.data);
      setCalls(callsResponse.data || []);
    } catch (error) {
      console.error('Error loading agent details:', error);
    }
  };

  const toggleAgentStatus = async (agentId, currentStatus) => {
    try {
      await api.patch(`/agents/${agentId}`, {
        enabled: !currentStatus
      });
      loadAgents();
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const deleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await api.delete(`/agents/${agentId}`);
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleTestCall = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsTestCalling(true);
    try {
      const response = await axios.post('/api/agents/test-call', {
        agentId: selectedAgent._id,
        phoneNumber: testPhoneNumber
      });

      toast.success('Test call initiated! Your phone should ring shortly.');
      setTestCallDialogOpen(false);
      setTestPhoneNumber('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate test call');
    } finally {
      setIsTestCalling(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get deployment status badge
  const getDeploymentBadge = (status) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '📝', label: 'Draft' },
      testing: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🧪', label: 'Testing' },
      production: { color: 'bg-green-100 text-green-800 border-green-300', icon: '🚀', label: 'Live' }
    };
    return badges[status] || badges.draft;
  };

  // Deploy agent to new status
  const handleDeploy = async () => {
    if (!selectedAgent) return;

    try {
      await api.post(`/agents/${selectedAgent._id}/deploy`, {
        status: deploymentStatus,
        changes: deploymentChanges
      });

      toast.success(`Agent deployed to ${deploymentStatus}!`);
      setDeploymentDialogOpen(false);
      setDeploymentChanges('');
      loadAgents(); // Reload to see updated status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deploy agent');
    }
  };

  // Load test results for selected agent
  const loadTestResults = async (agentId) => {
    try {
      const response = await api.get(`/agents/${agentId}/test-results`);
      setTestResults(response.data.testResults || []);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  // Load changelog for selected agent
  const loadChangelog = async (agentId) => {
    try {
      const response = await api.get(`/agents/${agentId}/changelog`);
      setChangelog(response.data.changelog || []);
    } catch (error) {
      console.error('Error loading changelog:', error);
    }
  };

  // Save agent changes
  const handleSaveAgent = async () => {
    if (!selectedAgent) return;

    setIsSaving(true);
    try {
      await api.patch(`/agents/${selectedAgent._id}`, {
        name: editedName,
        type: agentType,
        prompt: editedPrompt,
        firstMessage: editedFirstMessage,
        configuration: {
          ...selectedAgent.configuration,
          prompt: editedPrompt,
          firstMessage: editedFirstMessage
        }
      });

      toast.success('Agent saved successfully!');
      setHasUnsavedChanges(false);
      loadAgents(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error(error.response?.data?.message || 'Failed to save agent');
    } finally {
      setIsSaving(false);
    }
  };

  // Test agent with simulated conversation
  const handleTestMessage = async () => {
    if (!testInput.trim() || !selectedAgent) return;

    const userMessage = testInput.trim();
    setTestInput('');
    setIsTesting(true);

    // Add user message to conversation
    setTestConversation(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Simulate agent response based on prompt
      // In a real implementation, this would call ElevenLabs or your AI service
      const response = await api.post('/agents/test-conversation', {
        agentId: selectedAgent._id,
        message: userMessage,
        prompt: editedPrompt,
        firstMessage: editedFirstMessage,
        conversationHistory: testConversation
      });

      // Add agent response to conversation
      setTestConversation(prev => [...prev, {
        role: 'agent',
        content: response.data.response || 'I understand. How can I assist you further?'
      }]);
    } catch (error) {
      console.error('Error testing agent:', error);
      // Fallback response if API fails
      setTestConversation(prev => [...prev, {
        role: 'agent',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsTesting(false);
    }
  };

  // Reset test conversation
  const handleResetTest = () => {
    setTestConversation([]);
    setTestInput('');
  };

  // Load voices from the library
  const loadVoices = async (page = 1) => {
    try {
      setLoadingVoices(true);
      const response = await api.get(`/agents/voices/saved`);

      if (page === 1) {
        setAvailableVoices(response.data.voices || []);
      } else {
        setAvailableVoices(prev => [...prev, ...(response.data.voices || [])]);
      }

      // Check if there are more voices (assuming 8 per page)
      setHasMoreVoices((response.data.voices || []).length === 8);
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Handle voice change
  const handleVoiceChange = async (voiceId) => {
    if (!selectedAgent || !voiceId) return;

    try {
      setSelectedVoiceId(voiceId);
      const selectedVoice = availableVoices.find(v => v.voiceId === voiceId);

      if (selectedVoice) {
        await api.patch(`/agents/${selectedAgent._id}`, {
          voice: {
            voiceId: selectedVoice.voiceId,
            name: selectedVoice.name
          },
          voiceName: selectedVoice.name
        });

        toast.success(`Voice changed to ${selectedVoice.name}`);
        loadAgents(); // Reload to update the agent data
      }
    } catch (error) {
      console.error('Error changing voice:', error);
      toast.error('Failed to change voice');
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agent Studio</h1>
          <p className="text-muted-foreground mt-1">
            Build, test, and manage your AI agents across voice, SMS, and email
          </p>
        </div>
        <div className="flex gap-3">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
            <TabsList>
              <TabsTrigger value="studio" className="gap-2">
                <FileEdit className="w-4 h-4" />
                Studio
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={() => setAiBuilderOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Builder
          </Button>
          <Button
            onClick={() => navigate('/app/agents/create')}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Agent
          </Button>
        </div>
      </div>

      {agents.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-gray-600 dark:text-gray-200" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No agents yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first voice agent to start automating calls
              </p>
              <Button onClick={() => navigate('/app/agents/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'studio' ? (
        /* STUDIO MODE - Interactive Agent Builder */
        <div className="grid grid-cols-12 gap-4">
          {/* Agent Selector Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Agents ({agents.length})
              </h2>
            </div>
            <div className="space-y-2">
              {agents.map((agent) => (
                <Card
                  key={agent._id}
                  className={`cursor-pointer transition-all ${
                    selectedAgent?._id === agent._id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'hover:border-gray-400 hover:shadow-sm'
                  }`}
                  onClick={() => {
                    if (hasUnsavedChanges && selectedAgent?._id !== agent._id) {
                      if (confirm('You have unsaved changes. Do you want to discard them?')) {
                        setSelectedAgent(agent);
                      }
                    } else {
                      setSelectedAgent(agent);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        agent.enabled ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-foreground truncate">
                          {agent.performance?.totalCalls || 0} calls
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Studio Editor */}
          {selectedAgent && (
            <>
              {/* Prompt Editor - Center */}
              <div className="col-span-12 lg:col-span-5 space-y-4">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileEdit className="w-5 h-5 text-blue-600" />
                        <CardTitle>Agent Configuration</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        {hasUnsavedChanges && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            Unsaved changes
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditedName(selectedAgent.name || '');
                            setEditedPrompt(selectedAgent.prompt || selectedAgent.configuration?.prompt || '');
                            setEditedFirstMessage(selectedAgent.firstMessage || selectedAgent.configuration?.firstMessage || '');
                            setHasUnsavedChanges(false);
                          }}
                          disabled={!hasUnsavedChanges}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAgent}
                          disabled={isSaving || !hasUnsavedChanges}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Configure how your agent behaves and responds
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Agent Type/Channel */}
                    <div>
                      <Label htmlFor="agent-type" className="text-sm font-medium">
                        Agent Type
                      </Label>
                      <Select
                        value={agentType}
                        onValueChange={(value) => {
                          setAgentType(value);
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <SelectTrigger id="agent-type" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="voice">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>Voice Agent</span>
                              <span className="text-xs text-gray-500">Phone calls</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              <span>SMS Agent</span>
                              <span className="text-xs text-gray-500">Text messages</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>Email Agent</span>
                              <span className="text-xs text-gray-500">Email automation</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Agent Name */}
                    <div>
                      <Label htmlFor="agent-name" className="text-sm font-medium">
                        Agent Name
                      </Label>
                      <Input
                        id="agent-name"
                        value={editedName}
                        onChange={(e) => {
                          setEditedName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="e.g., Front Desk Agent"
                        className="mt-1"
                      />
                    </div>

                    {/* Voice Selector - Only for Voice Agents */}
                    {agentType === 'voice' && (
                      <div>
                        <Label htmlFor="voice-select" className="text-sm font-medium flex items-center gap-2">
                          <Mic className="w-4 h-4 text-gray-500" />
                          Voice
                        </Label>
                      <Select
                        value={selectedAgent.voice?.voiceId || selectedAgent.voiceId || ''}
                        onValueChange={handleVoiceChange}
                      >
                        <SelectTrigger id="voice-select" className="mt-1">
                          <SelectValue placeholder="Select a voice...">
                            {selectedAgent.voiceName || selectedAgent.voice?.name || 'Select a voice...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {availableVoices.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              No voices available. Add voices from the Voice Library first.
                            </div>
                          ) : (
                            <>
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.voiceId} value={voice.voiceId}>
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-200" />
                                    <span>{voice.name}</span>
                                    {voice.labels && (
                                      <span className="text-xs text-gray-500">
                                        ({voice.labels.accent || voice.labels.gender || 'voice'})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                              {hasMoreVoices && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const nextPage = voicesPage + 1;
                                      setVoicesPage(nextPage);
                                      loadVoices(nextPage);
                                    }}
                                    disabled={loadingVoices}
                                    className="w-full"
                                  >
                                    {loadingVoices ? 'Loading...' : 'Load More Voices'}
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Add more voices from the Voice Library page
                        </p>
                      </div>
                    )}

                    {/* First Message */}
                    <div>
                      <Label htmlFor="first-message" className="text-sm font-medium">
                        First Message
                        <span className="text-xs text-gray-500 ml-2 font-normal">
                          What the agent says when the call starts
                        </span>
                      </Label>
                      <Textarea
                        id="first-message"
                        value={editedFirstMessage}
                        onChange={(e) => {
                          setEditedFirstMessage(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Hello! How can I help you today?"
                        className="mt-1 font-mono text-sm"
                        rows={2}
                      />
                    </div>

                    {/* System Prompt */}
                    <div className="flex-1">
                      <Label htmlFor="system-prompt" className="text-sm font-medium">
                        System Prompt
                        <span className="text-xs text-gray-500 ml-2 font-normal">
                          Define the agent's behavior and personality
                        </span>
                      </Label>
                      <Textarea
                        id="system-prompt"
                        value={editedPrompt}
                        onChange={(e) => {
                          setEditedPrompt(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="You are a friendly and professional assistant. Your job is to..."
                        className="mt-1 font-mono text-sm h-64"
                        rows={12}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Tip: Be specific about the agent's role, tone, and what actions it should take
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Test Console - Right */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <CardTitle>Test Console</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetTest}
                        disabled={testConversation.length === 0}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      Test your agent's responses in real-time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {/* Conversation Display */}
                    <div className="flex-1 bg-secondary rounded-lg p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[400px] space-y-3">
                      {testConversation.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                          <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                          <p className="text-sm">Start a conversation to test your agent</p>
                          <p className="text-xs mt-1">Type a message below to begin</p>
                        </div>
                      ) : (
                        testConversation.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-card border border-border border text-foreground'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isTesting && (
                        <div className="flex justify-start">
                          <div className="bg-card border border-border border rounded-lg px-3 py-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2">
                      <Input
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTestMessage();
                          }
                        }}
                        placeholder="Type a message to test..."
                        disabled={isTesting}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleTestMessage}
                        disabled={!testInput.trim() || isTesting}
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestCallDialogOpen(true)}
                        className="w-full justify-start"
                      >
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Make Live Test Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeploymentStatus(selectedAgent.deployment?.status || 'draft');
                          setDeploymentDialogOpen(true);
                        }}
                        className="w-full justify-start"
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ANALYTICS MODE - Performance Dashboard */
        <div className="grid grid-cols-12 gap-6">
          {/* Agent List Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide px-2">
              Your Agents ({agents.length})
            </h2>
            {agents.map((agent) => (
              <Card
                key={agent._id}
                className={`cursor-pointer transition-all ${
                  selectedAgent?._id === agent._id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:border-gray-400'
                }`}
                onClick={() => setSelectedAgent(agent)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-foreground mt-1">
                        {agent.type === 'custom' ? agent.customType || 'Custom' : agent.type}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          agent.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {agent.enabled ? '🟢 Active' : '⚫ Paused'}
                        </span>
                        {agent.deployment?.status && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                            getDeploymentBadge(agent.deployment.status).color
                          }`}>
                            {getDeploymentBadge(agent.deployment.status).icon} {getDeploymentBadge(agent.deployment.status).label}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {agent.performance?.totalCalls || 0} calls
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAgentStatus(agent._id, agent.enabled);
                        }}
                      >
                        {agent.enabled ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Agent Details */}
          {selectedAgent && (
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Agent Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {selectedAgent.name}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Voice: {selectedAgent.voiceName || 'Default'} • Language: {selectedAgent.configuration?.language || 'en'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {/* Deployment Status Badge */}
                      {selectedAgent.deployment?.status && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                          getDeploymentBadge(selectedAgent.deployment.status).color
                        }`}>
                          <span className="text-sm font-medium">
                            {getDeploymentBadge(selectedAgent.deployment.status).icon} {getDeploymentBadge(selectedAgent.deployment.status).label}
                          </span>
                          <span className="text-xs opacity-75">
                            v{selectedAgent.deployment.version || 1}
                          </span>
                        </div>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setTestCallDialogOpen(true)}
                      >
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Test Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeploymentStatus(selectedAgent.deployment?.status || 'draft');
                          setDeploymentDialogOpen(true);
                        }}
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/agents/${selectedAgent._id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAgent(selectedAgent._id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats */}
              {performance && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {performance.totalCalls}
                            </p>
                            <p className="text-xs text-gray-500">Total Calls</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {performance.successRate}%
                            </p>
                            <p className="text-xs text-gray-500">Success Rate</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {formatDuration(performance.averageDuration)}
                            </p>
                            <p className="text-xs text-gray-500">Avg Duration</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {performance.leadsGenerated || 0}
                            </p>
                            <p className="text-xs text-gray-500">Leads Generated</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Calls Over Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Call Activity (Last 30 Days)</CardTitle>
                      <CardDescription>Daily call volume for this agent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={performance.callsByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="_id" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Recent Calls */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Calls</CardTitle>
                  <CardDescription>Latest calls handled by this agent</CardDescription>
                </CardHeader>
                <CardContent>
                  {calls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No calls yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calls.slice(0, 10).map((call) => (
                        <div
                          key={call._id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${
                              call.status === 'completed' ? 'bg-green-500' :
                              call.status === 'failed' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`} />
                            <div>
                              <p className="font-medium text-foreground">
                                {call.leadName || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {call.phone || 'No phone'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {formatDuration(call.duration || 0)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(call.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Universal AI Builder Modal */}
      <UniversalAIBuilder
        open={aiBuilderOpen}
        onOpenChange={(open) => {
          setAiBuilderOpen(open);
          if (!open) {
            // Reload agents when modal closes
            loadAgents();
          }
        }}
        mode="agent"
      />

      {/* Test Call Dialog */}
      <Dialog open={testCallDialogOpen} onOpenChange={setTestCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Call - {selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              Make a test call with this agent to verify it's working correctly
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="testPhone">Phone Number *</Label>
              <Input
                id="testPhone"
                type="tel"
                placeholder="+1 (480) 555-5887"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter with country code (e.g., +1 for US)
              </p>
            </div>

            {selectedAgent && (
              <div className="bg-accent/50 border rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Agent:</span> {selectedAgent.name}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Voice:</span> {selectedAgent.voiceName || 'Default'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">ElevenLabs ID:</span>{' '}
                  <code className="text-xs bg-background px-1 py-0.5 rounded">
                    {selectedAgent.elevenLabsAgentId?.startsWith('agent_')
                      ? selectedAgent.elevenLabsAgentId.substring(0, 20) + '...'
                      : selectedAgent.elevenLabsAgentId || 'Not configured'}
                  </code>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setTestCallDialogOpen(false);
                  setTestPhoneNumber('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTestCall}
                disabled={isTestCalling || !testPhoneNumber.trim()}
              >
                {isTestCalling ? (
                  <>
                    <Phone className="h-4 w-4 mr-2 animate-pulse" />
                    Calling...
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Make Test Call
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deployment Dialog */}
      <Dialog open={deploymentDialogOpen} onOpenChange={setDeploymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Deploy Agent - {selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              Change the deployment status of this agent. This controls where the agent is active.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Status */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Status:</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${
                getDeploymentBadge(selectedAgent?.deployment?.status || 'draft').color
              }`}>
                <span className="font-medium">
                  {getDeploymentBadge(selectedAgent?.deployment?.status || 'draft').icon} {getDeploymentBadge(selectedAgent?.deployment?.status || 'draft').label}
                </span>
                <span className="text-xs opacity-75">v{selectedAgent?.deployment?.version || 1}</span>
              </div>
            </div>

            {/* New Status */}
            <div>
              <Label htmlFor="deployment-status">Deploy To:</Label>
              <Select value={deploymentStatus} onValueChange={setDeploymentStatus}>
                <SelectTrigger id="deployment-status" className="mt-1">
                  <SelectValue placeholder="Select deployment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      📝 <span>Draft</span>
                      <span className="text-xs text-gray-500">- Work in progress</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="testing">
                    <div className="flex items-center gap-2">
                      🧪 <span>Testing</span>
                      <span className="text-xs text-gray-500">- Ready for testing</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="production">
                    <div className="flex items-center gap-2">
                      🚀 <span>Production</span>
                      <span className="text-xs text-gray-500">- Live and active</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Changelog */}
            <div>
              <Label htmlFor="deployment-changes" className="dark:text-white">Changelog (Optional):</Label>
              <Textarea
                id="deployment-changes"
                placeholder="Describe what changed in this deployment..."
                value={deploymentChanges}
                onChange={(e) => setDeploymentChanges(e.target.value)}
                className="mt-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows={3}
              />
              <p className="text-xs text-foreground mt-1">
                Document changes for tracking and team visibility
              </p>
            </div>

            {/* Warning for production */}
            {deploymentStatus === 'production' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Production Deployment:</strong> This will increment the version number and make the agent live for all users.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeploymentDialogOpen(false);
                setDeploymentChanges('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleDeploy}>
              <Rocket className="w-4 h-4 mr-2" />
              Deploy to {deploymentStatus}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentDashboard;
