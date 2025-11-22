import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2, Phone, Eye, Copy, PhoneCall } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/utils/toast';
import AIPromptHelper from '@/components/AIPromptHelper';
import AgentStudioV2 from '@/components/AgentStudioV2';

const AGENT_TYPES = {
  lead_gen: { name: 'Lead Generation', color: '#3b82f6', icon: '🎯' },
  booking: { name: 'Appointment Booking', color: '#10b981', icon: '📅' },
  collections: { name: 'Collections', color: '#f59e0b', icon: '💰' },
  promo: { name: 'Promotions', color: '#8b5cf6', icon: '🎁' },
  support: { name: 'Support', color: '#ef4444', icon: '🛠️' },
  custom: { name: 'Custom Agent', color: '#64748b', icon: '⚙️' }
};

const VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'Female' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'Male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male' },
];

export default function Agents() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTestCallOpen, setIsTestCallOpen] = useState(false);
  const [testCallAgent, setTestCallAgent] = useState(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [step, setStep] = useState(1);
  const [studioAgent, setStudioAgent] = useState(null);
  const [formData, setFormData] = useState({
    type: 'lead_gen',
    name: '',
    script: '',
    firstMessage: '',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    voiceName: 'Sarah'
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await agentApi.getAgents();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => agentApi.createAgent(data),
    onSuccess: async (response) => {
      await queryClient.refetchQueries(['agents']);
      setIsCreateOpen(false);
      resetForm();
      if (response.data?._id) {
        navigate(`/app/agents/${response.data._id}`);
      }
      toast.success('Agent created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create agent');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => agentApi.updateAgent(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
      toast.success('Agent updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => agentApi.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
      toast.success('Agent deleted');
    },
    onError: () => {
      toast.error('Failed to delete agent');
    }
  });

  const testCallMutation = useMutation({
    mutationFn: async ({ agentId, phoneNumber }) => {
      const response = await agentApi.testCall({
        agentId,
        phoneNumber
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Test call initiated! Your phone should ring shortly.');
      setIsTestCallOpen(false);
      setTestPhoneNumber('');
      setTestCallAgent(null);
    },
    onError: (error) => {
      console.error('Test call error:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate test call');
    }
  });

  const handleTestCall = (agent) => {
    setTestCallAgent(agent);
    setIsTestCallOpen(true);
  };

  const initiateTestCall = () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    testCallMutation.mutate({
      agentId: testCallAgent._id,
      phoneNumber: testPhoneNumber
    });
  };

  const handleTypeChange = (type) => {
    setFormData({ ...formData, type, name: formData.name || `${AGENT_TYPES[type].name} Agent` });
  };

  const handleVoiceChange = (voiceId) => {
    const voice = VOICES.find(v => v.id === voiceId);
    setFormData({ ...formData, voiceId, voiceName: voice?.name || 'Sarah' });
  };

  const handleCreateAgent = () => {
    if (!formData.name.trim() || !formData.script.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      type: 'lead_gen',
      name: '',
      script: '',
      firstMessage: '',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Sarah'
    });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Voice Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? 'Loading...' : `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'}`}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Voice Agent</DialogTitle>
              <DialogDescription>
                {step === 1 && 'Choose agent type and name'}
                {step === 2 && 'Configure agent script and behavior'}
                {step === 3 && 'Select voice'}
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Type & Name */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Agent Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(AGENT_TYPES).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => handleTypeChange(key)}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          formData.type === key
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{value.icon}</span>
                          <span className="text-sm font-medium">{value.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sarah - Lead Qualifier"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={() => setStep(2)} disabled={!formData.name.trim()}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Script */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="script">Agent Script *</Label>
                  <Textarea
                    id="script"
                    rows={10}
                    value={formData.script}
                    onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                    className="font-mono text-sm mt-2"
                    placeholder="Define how your agent should behave..."
                  />
                </div>

                <AIPromptHelper
                  script={formData.script}
                  agentType={formData.type}
                  onScriptUpdate={(newScript) => setFormData({ ...formData, script: newScript })}
                />

                <div>
                  <Label htmlFor="firstMessage">First Message *</Label>
                  <Input
                    id="firstMessage"
                    placeholder="What the agent says when the call starts"
                    value={formData.firstMessage}
                    onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!formData.script.trim()}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Voice */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Select Voice</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => handleVoiceChange(voice.id)}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          formData.voiceId === voice.id
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                            {voice.name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{voice.name}</div>
                            <div className="text-xs text-muted-foreground">{voice.gender}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={handleCreateAgent} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Agent'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents List */}
      {agents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
          <p className="text-muted-foreground mb-4">Create your first AI voice agent to get started</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Agent
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="divide-y">
            {agents.map((agent) => {
              const typeConfig = AGENT_TYPES[agent.type] || AGENT_TYPES.custom;
              const successRate = agent.performance?.totalCalls > 0
                ? ((agent.performance.successfulCalls / agent.performance.totalCalls) * 100)
                : 0;

              return (
                <div
                  key={agent._id}
                  className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/app/agents/${agent._id}`)}
                >
                  {/* Icon */}
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: `${typeConfig.color}20` }}
                  >
                    {typeConfig.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{agent.name}</h3>
                      {agent.enabled && (
                        <Badge variant="success" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="capitalize">{typeConfig.name}</span>
                      <span>•</span>
                      <span>{agent.performance?.totalCalls || 0} calls</span>
                      <span>•</span>
                      <span>{successRate.toFixed(0)}% success</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={agent.enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: agent._id, enabled: checked })}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTestCall(agent)}>
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Test Call
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setStudioAgent(agent)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Agent Studio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/app/agents/${agent._id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/app/agents/${agent._id}`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(agent._id);
                          toast.success('Agent ID copied');
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(agent._id, agent.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test Call Dialog */}
      <Dialog open={isTestCallOpen} onOpenChange={setIsTestCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Call - {testCallAgent?.name}</DialogTitle>
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

            {testCallAgent && (
              <div className="bg-accent/50 border rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Agent:</span> {testCallAgent.name}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Voice:</span> {testCallAgent.voiceName || 'Default'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">ElevenLabs ID:</span>{' '}
                  <code className="text-xs bg-background px-1 py-0.5 rounded">
                    {testCallAgent.elevenLabsAgentId?.startsWith('agent_')
                      ? testCallAgent.elevenLabsAgentId.substring(0, 20) + '...'
                      : testCallAgent.elevenLabsAgentId || 'Not configured'}
                  </code>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsTestCallOpen(false);
                  setTestPhoneNumber('');
                  setTestCallAgent(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={initiateTestCall}
                disabled={testCallMutation.isPending || !testPhoneNumber.trim()}
              >
                {testCallMutation.isPending ? (
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

      {/* Agent Studio V2 Modal */}
      {studioAgent && (
        <AgentStudioV2
          agentId={studioAgent._id}
          agentData={studioAgent}
          onSave={async (config) => {
            try {
              await agentApi.updateAgent(studioAgent._id, config);
              toast.success('Agent configuration saved!');
              queryClient.invalidateQueries(['agents']);
              setStudioAgent(null);
            } catch (error) {
              toast.error('Failed to save agent configuration');
              console.error(error);
            }
          }}
          onClose={() => setStudioAgent(null)}
        />
      )}
    </div>
  );
}
