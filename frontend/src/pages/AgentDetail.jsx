import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi, callApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Phone,
  Settings,
  Mic,
  Save,
  Play,
  Volume2,
  Edit,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  PhoneCall,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';

// Mock ElevenLabs voices data - in production, this would come from ElevenLabs API
const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female', accent: 'American', age: 'Young Adult' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'Female', accent: 'American', age: 'Young Adult' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female', accent: 'American', age: 'Young Adult' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male', accent: 'American', age: 'Young Adult' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'Female', accent: 'American', age: 'Middle Aged' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'Male', accent: 'American', age: 'Young Adult' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'Male', accent: 'American', age: 'Middle Aged' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male', accent: 'American', age: 'Middle Aged' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'Male', accent: 'American', age: 'Young Adult' },
];

const DYNAMIC_VARIABLES = [
  { var: '{{lead_name}}', description: 'Lead\'s full name' },
  { var: '{{first_name}}', description: 'Lead\'s first name' },
  { var: '{{company}}', description: 'Company name' },
  { var: '{{email}}', description: 'Email address' },
  { var: '{{phone}}', description: 'Phone number' },
  { var: '{{current_date}}', description: 'Current date' },
  { var: '{{current_time}}', description: 'Current time' },
];

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [editedAgent, setEditedAgent] = useState(null);
  const [expandedCallId, setExpandedCallId] = useState(null);

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentApi.getAgentById(id).then(res => res.data),
    enabled: !!id
  });

  // Handle agent data when it loads
  useEffect(() => {
    if (agent) {
      const agentWithDefaults = {
        ...agent,
        configuration: agent.configuration || {
          temperature: 0.8,
          maxDuration: 300,
          language: 'en'
        }
      };
      setEditedAgent(agentWithDefaults);
      const voice = ELEVENLABS_VOICES.find(v => v.id === agent.voiceId);
      setSelectedVoice(voice || ELEVENLABS_VOICES[0]);
    }
  }, [agent]);

  const { data: calls } = useQuery({
    queryKey: ['agent-calls', id],
    queryFn: () => agentApi.getAgentCalls(id).then(res => res.data),
  });

  const { data: performance } = useQuery({
    queryKey: ['agent-performance', id],
    queryFn: () => agentApi.getAgentPerformance(id).then(res => res.data),
  });

  const updateAgentMutation = useMutation({
    mutationFn: (data) => agentApi.updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agent', id]);
      setIsEditing(false);
      alert('Agent updated successfully!');
    },
    onError: (error) => {
      alert('Error: ' + (error.response?.data?.message || 'Failed to update agent'));
    },
  });

  const testCallMutation = useMutation({
    mutationFn: (phoneNumber) => callApi.initiateCall({ agentId: id, phoneNumber }),
    onSuccess: () => {
      alert('Test call initiated! Check your phone.');
      setTestPhoneNumber('');
    },
    onError: (error) => {
      alert('Error: ' + (error.response?.data?.message || 'Failed to initiate test call'));
    },
  });

  const handleSave = () => {
    updateAgentMutation.mutate({
      ...editedAgent,
      voiceId: selectedVoice?.id,
      voiceName: selectedVoice?.name,
    });
  };

  const handleTestCall = () => {
    if (!testPhoneNumber) {
      alert('Please enter a phone number');
      return;
    }
    testCallMutation.mutate(testPhoneNumber);
  };

  const handleVoicePreview = async () => {
    try {
      // Use ElevenLabs Text-to-Speech API to generate a preview
      const previewText = "Hello! This is a preview of my voice. I'm excited to help you with your calls.";
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: previewText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        // Clean up the object URL after playing
        audio.onended = () => URL.revokeObjectURL(audioUrl);
      } else {
        alert(`Voice: ${selectedVoice.name}\n${selectedVoice.gender} • ${selectedVoice.accent} • ${selectedVoice.age}\n\nNote: Audio preview requires ElevenLabs API key`);
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      alert(`Voice: ${selectedVoice.name}\n${selectedVoice.gender} • ${selectedVoice.accent} • ${selectedVoice.age}`);
    }
  };

  const handleDownloadAudio = async (call) => {
    if (!call.recordingUrl) {
      alert('No recording available for this call');
      return;
    }

    try {
      const response = await fetch(call.recordingUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-${call._id}-${formatDateTime(call.createdAt).replace(/[/:]/g, '-')}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download recording');
      console.error('Download error:', error);
    }
  };

  const toggleCallExpansion = (callId) => {
    setExpandedCallId(expandedCallId === callId ? null : callId);
  };

  const parseTranscript = (transcript) => {
    if (!transcript) return [];

    // Try to parse JSON format first (ElevenLabs format)
    try {
      const parsed = JSON.parse(transcript);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, try to parse text format
    }

    // Parse text format: "Speaker: message"
    const lines = transcript.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const match = line.match(/^(Agent|User|Customer):\s*(.+)$/i);
      if (match) {
        return { role: match[1].toLowerCase(), message: match[2] };
      }
      return { role: 'unknown', message: line };
    });
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('script-textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editedAgent.script || '';
      const newText = text.substring(0, start) + variable + text.substring(end);
      setEditedAgent({ ...editedAgent, script: newText });

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  if (isLoading || !agent || !editedAgent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading agent details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{agent.name}</h1>
          <p className="text-muted-foreground capitalize">{agent.type.replace('_', ' ')} Agent</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.enabled ? 'success' : 'secondary'} className="text-sm px-3 py-1">
            {agent.enabled ? 'Active' : 'Inactive'}
          </Badge>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Agent
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={updateAgentMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateAgentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={() => { setIsEditing(false); setEditedAgent(agent); }} variant="outline">
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <PhoneCall className="h-4 w-4 text-blue-600" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{performance?.totalCalls || agent.performance?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {performance?.successRate || agent.performance?.conversionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Successful outcomes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-orange-600" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatDuration(performance?.averageDuration || agent.performance?.averageDuration || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-purple-600" />
              Leads Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{agent.performance?.leadsGenerated || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">From calls</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5" />
                Agent Settings
              </CardTitle>
              <CardDescription>Configure the basic settings for your voice agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={editedAgent.name}
                    onChange={(e) => setEditedAgent({ ...editedAgent, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full border border-input rounded px-3 py-2 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Agent Type</label>
                  <select
                    value={editedAgent.type}
                    onChange={(e) => setEditedAgent({ ...editedAgent, type: e.target.value })}
                    disabled={!isEditing}
                    className="w-full border border-input rounded px-3 py-2 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                  >
                    <option value="lead_gen">Lead Generation</option>
                    <option value="booking">Booking</option>
                    <option value="collections">Collections</option>
                    <option value="promo">Promotional</option>
                    <option value="support">Support</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">First Message</label>
                <input
                  type="text"
                  value={editedAgent.firstMessage}
                  onChange={(e) => setEditedAgent({ ...editedAgent, firstMessage: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Hello! How can I help you today?"
                  className="w-full border border-input rounded px-3 py-2 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editedAgent.enabled === true}
                      onChange={() => setEditedAgent({ ...editedAgent, enabled: true })}
                      disabled={!isEditing}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-foreground">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editedAgent.enabled === false}
                      onChange={() => setEditedAgent({ ...editedAgent, enabled: false })}
                      disabled={!isEditing}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-foreground">Inactive</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Mic className="h-5 w-5" />
                    Voice Selection
                  </CardTitle>
                  <CardDescription>Choose the voice for your agent from ElevenLabs library</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVoiceLibrary(!showVoiceLibrary)}
                  disabled={!isEditing}
                >
                  {showVoiceLibrary ? 'Hide' : 'Browse'} Voice Library
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedVoice && (
                <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg border border-border">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                      <Volume2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{selectedVoice.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedVoice.gender} • {selectedVoice.accent} • {selectedVoice.age}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleVoicePreview}>
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              )}

              {showVoiceLibrary && (
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border border-border rounded-lg bg-background">
                  {ELEVENLABS_VOICES.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => isEditing && setSelectedVoice(voice)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedVoice?.id === voice.id
                          ? 'border-primary bg-accent'
                          : 'border-border hover:border-primary/50 hover:bg-accent/30'
                      } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">{voice.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-foreground text-sm">{voice.name}</h5>
                          <p className="text-xs text-muted-foreground truncate">
                            {voice.gender} • {voice.accent}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompt Engineering */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MessageSquare className="h-5 w-5" />
                System Prompt & Script
              </CardTitle>
              <CardDescription>
                Define how your agent should behave and what it should say
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Agent Script / Instructions
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {(editedAgent.script || '').length} characters
                  </span>
                </div>
                <textarea
                  id="script-textarea"
                  value={editedAgent.script || ''}
                  onChange={(e) => setEditedAgent({ ...editedAgent, script: e.target.value })}
                  disabled={!isEditing}
                  rows={10}
                  placeholder="Enter the script or instructions for your voice agent..."
                  className="w-full border border-input rounded px-3 py-2 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted font-mono text-sm"
                />
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Dynamic Variables
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DYNAMIC_VARIABLES.map((item) => (
                      <button
                        key={item.var}
                        onClick={() => insertVariable(item.var)}
                        className="text-left p-2 border border-border rounded hover:bg-accent hover:border-primary/50 transition-colors"
                      >
                        <code className="text-xs font-mono text-blue-600">{item.var}</code>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions & Settings */}
        <div className="space-y-6">
          {/* Test Call Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Phone className="h-5 w-5" />
                Test Call
              </CardTitle>
              <CardDescription>Make a test call to verify your agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full border border-input rounded px-3 py-2 text-white dark:text-white placeholder:text-muted-foreground disabled:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
                />
              </div>
              <Button
                onClick={handleTestCall}
                disabled={testCallMutation.isPending || !testPhoneNumber}
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
                {testCallMutation.isPending ? 'Initiating...' : 'Make Test Call'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This will place a real call to the number above using your current agent configuration.
              </p>
            </CardContent>
          </Card>

          {/* Advanced Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Temperature (Creativity)
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={editedAgent.configuration?.temperature || 0.8}
                  onChange={(e) => setEditedAgent({
                    ...editedAgent,
                    configuration: { ...editedAgent.configuration, temperature: parseFloat(e.target.value) }
                  })}
                  disabled={!isEditing}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Precise (0)</span>
                  <span className="font-medium text-foreground">
                    {editedAgent.configuration?.temperature || 0.8}
                  </span>
                  <span>Creative (2)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Max Duration (seconds)
                </label>
                <input
                  type="number"
                  value={editedAgent.configuration?.maxDuration || 300}
                  onChange={(e) => setEditedAgent({
                    ...editedAgent,
                    configuration: { ...editedAgent.configuration, maxDuration: parseInt(e.target.value) }
                  })}
                  disabled={!isEditing}
                  min="30"
                  max="600"
                  className="w-full border border-input rounded px-3 py-2 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Language
                </label>
                <select
                  value={editedAgent.configuration?.language || 'en'}
                  onChange={(e) => setEditedAgent({
                    ...editedAgent,
                    configuration: { ...editedAgent.configuration, language: e.target.value }
                  })}
                  disabled={!isEditing}
                  className="w-full border border-input rounded px-3 py-2 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Calls with Conversation View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5" />
            Recent Calls & Conversations
          </CardTitle>
          <CardDescription>View recent calls, transcripts, and download recordings</CardDescription>
        </CardHeader>
        <CardContent>
          {calls && calls.length > 0 ? (
            <div className="space-y-3">
              {calls.slice(0, 10).map((call) => {
                const isExpanded = expandedCallId === call._id;
                const transcript = parseTranscript(call.transcript);
                const hasTranscript = transcript.length > 0;
                const hasRecording = !!call.recordingUrl;

                return (
                  <div key={call._id} className="border rounded-lg overflow-hidden">
                    {/* Call Header */}
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{call.callerName || call.phoneNumber || call.callerPhone || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(call.createdAt)} • {formatDuration(call.duration)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasRecording && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadAudio(call);
                              }}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">Audio</span>
                            </Button>
                          )}
                          <Badge variant={call.status === 'completed' ? 'success' : call.status === 'failed' ? 'destructive' : 'secondary'}>
                            {call.status}
                          </Badge>
                          {hasTranscript && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCallExpansion(call._id)}
                              className="ml-2"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  View Transcript
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Conversation View */}
                    {isExpanded && hasTranscript && (
                      <div className="border-t bg-muted/50 p-4">
                        <div className="bg-card rounded-lg p-4 max-h-96 overflow-y-auto border border-border">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            <h4 className="font-semibold text-foreground">Call Transcript</h4>
                          </div>
                          <div className="space-y-3">
                            {transcript.map((item, idx) => {
                              const isAgent = item.role === 'agent' || item.role === 'assistant';
                              const isUser = item.role === 'user' || item.role === 'customer';

                              return (
                                <div key={idx} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                                  <div className={`max-w-[80%] ${isAgent ? '' : 'flex flex-col items-end'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-muted-foreground uppercase">
                                        {isAgent ? agent.name || 'Agent' : 'Customer'}
                                      </span>
                                    </div>
                                    <div className={`rounded-lg px-4 py-2 ${
                                      isAgent
                                        ? 'bg-primary/20 text-foreground'
                                        : 'bg-muted text-foreground'
                                    }`}>
                                      <p className="text-sm">{item.message || item.text || item.content}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Call Metadata */}
                        {(call.sentiment || call.leadsCapured) && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            {call.sentiment && (
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Sentiment</p>
                                <Badge variant={
                                  call.sentiment === 'positive' ? 'success' :
                                  call.sentiment === 'negative' ? 'destructive' :
                                  'secondary'
                                }>
                                  {call.sentiment}
                                </Badge>
                              </div>
                            )}
                            {call.leadsCapured?.qualified && (
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Lead Status</p>
                                <Badge variant="success">Qualified</Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Transcript Message */}
                    {isExpanded && !hasTranscript && (
                      <div className="border-t bg-muted/50 p-4 text-center">
                        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No transcript available for this call</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No calls yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make a test call to see it appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
