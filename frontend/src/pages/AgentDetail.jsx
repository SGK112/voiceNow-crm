import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi } from '@/services/api';
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
  Zap
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

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentApi.getAgentById(id).then(res => res.data),
    onSuccess: (data) => {
      const agentWithDefaults = {
        ...data,
        configuration: data.configuration || {
          temperature: 0.8,
          maxDuration: 300,
          language: 'en'
        }
      };
      setEditedAgent(agentWithDefaults);
      const voice = ELEVENLABS_VOICES.find(v => v.id === data.voiceId);
      setSelectedVoice(voice || ELEVENLABS_VOICES[0]);
    }
  });

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
    mutationFn: (phoneNumber) => agentApi.initiateCall({ agentId: id, phoneNumber }),
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
          <p className="text-gray-600">Loading agent details...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
          <p className="text-gray-600 capitalize">{agent.type.replace('_', ' ')} Agent</p>
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
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
              <PhoneCall className="h-4 w-4 text-blue-600" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{performance?.totalCalls || agent.performance?.totalCalls || 0}</div>
            <p className="text-xs text-gray-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {performance?.successRate || agent.performance?.conversionRate || 0}%
            </div>
            <p className="text-xs text-gray-600 mt-1">Successful outcomes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
              <Clock className="h-4 w-4 text-orange-600" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatDuration(performance?.averageDuration || agent.performance?.averageDuration || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Per call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
              <Users className="h-4 w-4 text-purple-600" />
              Leads Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{agent.performance?.leadsGenerated || 0}</div>
            <p className="text-xs text-gray-600 mt-1">From calls</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Settings className="h-5 w-5" />
                Agent Settings
              </CardTitle>
              <CardDescription>Configure the basic settings for your voice agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={editedAgent.name}
                    onChange={(e) => setEditedAgent({ ...editedAgent, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Type</label>
                  <select
                    value={editedAgent.type}
                    onChange={(e) => setEditedAgent({ ...editedAgent, type: e.target.value })}
                    disabled={!isEditing}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">First Message</label>
                <input
                  type="text"
                  value={editedAgent.firstMessage}
                  onChange={(e) => setEditedAgent({ ...editedAgent, firstMessage: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Hello! How can I help you today?"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editedAgent.enabled === true}
                      onChange={() => setEditedAgent({ ...editedAgent, enabled: true })}
                      disabled={!isEditing}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-900">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editedAgent.enabled === false}
                      onChange={() => setEditedAgent({ ...editedAgent, enabled: false })}
                      disabled={!isEditing}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-900">Inactive</span>
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
                  <CardTitle className="flex items-center gap-2 text-gray-900">
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
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <Volume2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{selectedVoice.name}</h4>
                    <p className="text-sm text-gray-600">
                      {selectedVoice.gender} • {selectedVoice.accent} • {selectedVoice.age}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              )}

              {showVoiceLibrary && (
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                  {ELEVENLABS_VOICES.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => isEditing && setSelectedVoice(voice)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedVoice?.id === voice.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">{voice.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 text-sm">{voice.name}</h5>
                          <p className="text-xs text-gray-600 truncate">
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
              <CardTitle className="flex items-center gap-2 text-gray-900">
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
                  <label className="block text-sm font-medium text-gray-700">
                    Agent Script / Instructions
                  </label>
                  <span className="text-xs text-gray-500">
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                />
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dynamic Variables
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DYNAMIC_VARIABLES.map((item) => (
                      <button
                        key={item.var}
                        onClick={() => insertVariable(item.var)}
                        className="text-left p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <code className="text-xs font-mono text-blue-600">{item.var}</code>
                        <p className="text-xs text-gray-600 mt-1">{item.description}</p>
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
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Phone className="h-5 w-5" />
                Test Call
              </CardTitle>
              <CardDescription>Make a test call to verify your agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <p className="text-xs text-gray-500">
                This will place a real call to the number above using your current agent configuration.
              </p>
            </CardContent>
          </Card>

          {/* Advanced Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Zap className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Precise (0)</span>
                  <span className="font-medium text-gray-900">
                    {editedAgent.configuration?.temperature || 0.8}
                  </span>
                  <span>Creative (2)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={editedAgent.configuration?.language || 'en'}
                  onChange={(e) => setEditedAgent({
                    ...editedAgent,
                    configuration: { ...editedAgent.configuration, language: e.target.value }
                  })}
                  disabled={!isEditing}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <TrendingUp className="h-5 w-5" />
            Recent Calls
          </CardTitle>
          <CardDescription>View recent calls made by this agent</CardDescription>
        </CardHeader>
        <CardContent>
          {calls && calls.length > 0 ? (
            <div className="space-y-3">
              {calls.slice(0, 10).map((call) => (
                <div key={call._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{call.callerName || call.callerPhone || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(call.createdAt)} • {formatDuration(call.duration)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={call.status === 'completed' ? 'success' : call.status === 'failed' ? 'destructive' : 'secondary'}>
                    {call.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No calls yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Make a test call to see it appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
