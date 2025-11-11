import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Phone, BarChart, Mic, MessageSquare, Sparkles } from 'lucide-react';
import AIPromptHelper from '@/components/AIPromptHelper';

const AGENT_TYPES = {
  lead_gen: {
    name: 'Lead Generation',
    color: 'bg-blue-500',
    icon: '🎯',
    description: 'Qualify leads and gather information',
    defaultScript: `You are a friendly lead qualification specialist for {{company_name}}.

Your goal is to qualify leads by understanding their needs and timeline.

CONVERSATION FLOW:
1. Greet them warmly
2. Ask about their specific needs
3. Understand their timeline (urgent, next 3 months, just exploring)
4. Gauge their budget range
5. Determine if they're decision maker
6. Book appointment if qualified

Be conversational, not interrogative. Make it feel natural!`,
    firstMessage: 'Hi! Thanks for your interest in our services. How can I help you today?'
  },
  booking: {
    name: 'Appointment Booking',
    color: 'bg-green-500',
    icon: '📅',
    description: 'Schedule appointments and consultations',
    defaultScript: `You are a helpful appointment booking assistant for {{company_name}}.

Your goal is to book an appointment for the customer.

AVAILABLE TIME SLOTS:
- Weekdays: 9 AM - 5 PM
- Consultations are 30-60 minutes

CONVERSATION FLOW:
1. Confirm their interest in scheduling
2. Ask what days/times work best
3. Offer 2-3 specific time slot options
4. Confirm their contact info
5. Set the appointment
6. Send confirmation and next steps

TONE: Friendly, efficient, accommodating`,
    firstMessage: 'Hi! I\'d be happy to help you schedule an appointment. What days work best for you?'
  },
  collections: {
    name: 'Collections',
    color: 'bg-yellow-500',
    icon: '💰',
    description: 'Professional payment reminders',
    defaultScript: `You are a professional accounts specialist for {{company_name}}.

Your goal is to collect payment professionally and courteously.

CONVERSATION FLOW:
1. Greet professionally
2. Mention outstanding balance
3. Ask if there are any issues preventing payment
4. Offer payment options (credit card, ACH, payment plan)
5. Get commitment on payment date
6. Confirm contact info

TONE: Professional, firm but respectful
NEVER: Threaten, be rude, or aggressive
ALWAYS: Be understanding and solution-oriented`,
    firstMessage: 'Hello, I\'m calling regarding your account. Do you have a moment to discuss?'
  },
  promo: {
    name: 'Promotions',
    color: 'bg-purple-500',
    icon: '🎁',
    description: 'Promote special offers and deals',
    defaultScript: `You are an enthusiastic promotions specialist for {{company_name}}.

Your goal is to inform customers about our exciting promotion.

PROMOTION DETAILS:
- Limited time offer
- Special pricing available
- Exclusive benefits for early adopters

CONVERSATION FLOW:
1. Greet enthusiastically
2. Introduce the promotion
3. Highlight key benefits
4. Create urgency (limited time)
5. Answer questions
6. Close the sale or book follow-up

TONE: Enthusiastic, engaging, helpful`,
    firstMessage: 'Hi! I\'m calling with some exciting news about our latest promotion. Can I tell you more?'
  },
  support: {
    name: 'Support',
    color: 'bg-red-500',
    icon: '🛠️',
    description: 'Customer service and technical support',
    defaultScript: `You are a patient and helpful customer support specialist for {{company_name}}.

Your goal is to resolve customer issues efficiently.

CONVERSATION FLOW:
1. Greet warmly
2. Ask them to describe the issue
3. Listen actively and show empathy
4. Troubleshoot step by step
5. Verify the solution works
6. Ask if there's anything else
7. Thank them for contacting support

TONE: Patient, clear, empathetic
ALWAYS: Be understanding and never blame the customer`,
    firstMessage: 'Hello! Thank you for calling support. How can I help you today?'
  },
  custom: {
    name: 'Custom Agent',
    color: 'bg-gray-500',
    icon: '⚙️',
    description: 'Create your own custom agent',
    defaultScript: `You are a helpful AI assistant for {{company_name}}.

Your goal is to assist customers with their inquiries.

CONVERSATION FLOW:
1. Greet the customer warmly
2. Understand their needs
3. Provide helpful information
4. Answer their questions
5. Thank them for their time

TONE: Professional, friendly, helpful`,
    firstMessage: 'Hello! How can I assist you today?'
  }
};

// ElevenLabs voices
const VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female', description: 'Warm, professional' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female', description: 'Young, energetic' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'Female', description: 'Confident, clear' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'Male', description: 'Friendly, approachable' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male', description: 'Deep, authoritative' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male', description: 'Smooth, articulate' },
];

export default function Agents() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: 'lead_gen',
    name: '',
    script: AGENT_TYPES.lead_gen.defaultScript,
    firstMessage: AGENT_TYPES.lead_gen.firstMessage,
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
    onSuccess: (response) => {
      queryClient.invalidateQueries(['agents']);
      setIsCreateOpen(false);
      setStep(1);
      setFormData({
        type: 'lead_gen',
        name: '',
        script: AGENT_TYPES.lead_gen.defaultScript,
        firstMessage: AGENT_TYPES.lead_gen.firstMessage,
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        voiceName: 'Sarah'
      });
      // Navigate to the agent detail page
      if (response.data?._id) {
        navigate(`/app/agents/${response.data._id}`);
      }
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to create agent. Please try again.');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => agentApi.updateAgent(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
    },
  });

  const handleTypeChange = (type) => {
    const typeConfig = AGENT_TYPES[type];
    setFormData({
      ...formData,
      type,
      script: typeConfig.defaultScript,
      firstMessage: typeConfig.firstMessage,
      name: formData.name || `${typeConfig.name} Agent`
    });
  };

  const handleVoiceChange = (voiceId) => {
    const voice = VOICES.find(v => v.id === voiceId);
    setFormData({
      ...formData,
      voiceId,
      voiceName: voice?.name || 'Sarah'
    });
  };

  const handleCreateAgent = () => {
    if (!formData.name.trim()) {
      alert('Please enter an agent name');
      return;
    }
    if (!formData.script.trim()) {
      alert('Please enter a script for your agent');
      return;
    }

    createMutation.mutate(formData);
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      type: 'lead_gen',
      name: '',
      script: AGENT_TYPES.lead_gen.defaultScript,
      firstMessage: AGENT_TYPES.lead_gen.firstMessage,
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Sarah'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Voice Agents</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your AI voice agents</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Voice Agent</DialogTitle>
              <DialogDescription>
                {step === 1 && 'Choose your agent type and provide details'}
                {step === 2 && 'Customize the agent script and behavior'}
                {step === 3 && 'Select a voice for your agent'}
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Type & Name */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Agent Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(AGENT_TYPES).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => handleTypeChange(key)}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                          formData.type === key
                            ? 'border-primary bg-accent shadow-sm'
                            : 'border-border bg-card hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{value.icon}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{value.name}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{value.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sarah - Lead Qualifier"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Give your agent a memorable name</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={() => setStep(2)} disabled={!formData.name.trim()} className="text-white">
                    Next: Script <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Script */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="script" className="text-base font-semibold">
                    Agent Script *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Define how your agent should behave and what it should say
                  </p>
                  <Textarea
                    id="script"
                    rows={12}
                    value={formData.script}
                    onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables like {`{{company_name}}`}, {`{{lead_name}}`}, {`{{lead_email}}`}
                  </p>
                </div>

                {/* AI Prompt Helper */}
                <AIPromptHelper
                  script={formData.script}
                  agentType={formData.type}
                  onScriptUpdate={(newScript) => setFormData({ ...formData, script: newScript })}
                />

                <div className="space-y-2">
                  <Label htmlFor="firstMessage">First Message *</Label>
                  <Input
                    id="firstMessage"
                    placeholder="What the agent says when the call starts"
                    value={formData.firstMessage}
                    onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">The greeting message when the call starts</p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!formData.script.trim()} className="text-white">
                    Next: Voice <Mic className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Voice Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Select Voice</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose a voice that matches your agent's personality
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => handleVoiceChange(voice.id)}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                          formData.voiceId === voice.id
                            ? 'border-primary bg-accent shadow-sm'
                            : 'border-border bg-card hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">{voice.name[0]}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{voice.name}</h4>
                            <p className="text-xs text-muted-foreground">{voice.gender} • {voice.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm mb-3">Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{AGENT_TYPES[formData.type].name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Voice:</span>
                      <span className="font-medium">{formData.voiceName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button
                    onClick={handleCreateAgent}
                    disabled={createMutation.isPending}
                    className="text-white"
                  >
                    {createMutation.isPending ? 'Creating Agent...' : 'Create Agent'}
                    {!createMutation.isPending && <Sparkles className="h-4 w-4 ml-2" />}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {(agents || []).map((agent) => (
          <Card key={agent._id} className="relative hover:shadow-lg transition-shadow text-center sm:text-left">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${AGENT_TYPES[agent.type]?.color || 'bg-gray-500'}`} />
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </div>
                <Switch
                  checked={agent.enabled}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: agent._id, enabled: checked })}
                />
              </div>
              <CardDescription className="capitalize">
                {AGENT_TYPES[agent.type]?.name || agent.type.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Calls</span>
                  <span className="font-medium">{agent.performance?.totalCalls || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-medium">
                    {agent.performance?.totalCalls > 0
                      ? ((agent.performance.successfulCalls / agent.performance.totalCalls) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Leads Generated</span>
                  <span className="font-medium">{agent.performance?.leadsGenerated || 0}</span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/app/agents/${agent._id}`)}
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {agents?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI voice agent to get started</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
