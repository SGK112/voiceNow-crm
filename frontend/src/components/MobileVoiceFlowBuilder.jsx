import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Save, Rocket, Check, Mic, MessageSquare, Phone, Loader2,
  Zap, Info, CheckCircle, Webhook, PhoneCall, ChevronRight
} from 'lucide-react';
import api from '../services/api';

/**
 * Mobile-Friendly VoiceFlow Builder
 * Simplified step-by-step interface for mobile devices
 */
export default function MobileVoiceFlowBuilder() {
  const navigate = useNavigate();
  const { id: workflowId } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);

  const [workflowData, setWorkflowData] = useState({
    name: 'Untitled Workflow',
    voiceId: null,
    voiceName: '',
    prompt: '',
    firstMessage: 'Hello! How can I help you today?',
    twilioNumber: '',
    knowledgeUrls: []
  });

  // Load existing workflow if editing
  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    try {
      const response = await api.get(`/workflows/${workflowId}`);
      if (response.data) {
        const workflow = response.data;

        // Extract data from nodes
        const voiceNode = workflow.nodes?.find(n => n.type === 'voice');
        const promptNode = workflow.nodes?.find(n => n.type === 'prompt');
        const inboundNode = workflow.nodes?.find(n => n.type === 'inboundCall');
        const knowledgeNode = workflow.nodes?.find(n => n.type === 'knowledge');

        setWorkflowData({
          name: workflow.name || 'Untitled Workflow',
          voiceId: voiceNode?.data?.voiceId || null,
          voiceName: voiceNode?.data?.voiceName || '',
          prompt: promptNode?.data?.prompt || '',
          firstMessage: promptNode?.data?.firstMessage || 'Hello! How can I help you today?',
          twilioNumber: inboundNode?.data?.twilioNumber || '',
          knowledgeUrls: knowledgeNode?.data?.urls || []
        });
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      alert('Failed to load workflow');
    }
  };

  const handleSave = async () => {
    if (!workflowData.voiceId) {
      alert('Please select a voice');
      return;
    }
    if (!workflowData.prompt || workflowData.prompt.trim().length < 10) {
      alert('Please enter agent instructions (minimum 10 characters)');
      return;
    }

    try {
      setSaving(true);

      // Build nodes from workflow data
      const nodes = [
        {
          id: 'inbound-1',
          type: 'inboundCall',
          position: { x: 50, y: 100 },
          data: { twilioNumber: workflowData.twilioNumber }
        },
        {
          id: 'voice-1',
          type: 'voice',
          position: { x: 300, y: 100 },
          data: {
            voiceId: workflowData.voiceId,
            voiceName: workflowData.voiceName
          }
        },
        {
          id: 'prompt-1',
          type: 'prompt',
          position: { x: 550, y: 100 },
          data: {
            prompt: workflowData.prompt,
            firstMessage: workflowData.firstMessage
          }
        }
      ];

      const edges = [
        { id: 'e1', source: 'inbound-1', target: 'voice-1', type: 'smoothstep' },
        { id: 'e2', source: 'voice-1', target: 'prompt-1', type: 'smoothstep' }
      ];

      // Add knowledge node if URLs exist
      if (workflowData.knowledgeUrls.length > 0) {
        nodes.push({
          id: 'knowledge-1',
          type: 'knowledge',
          position: { x: 800, y: 100 },
          data: { urls: workflowData.knowledgeUrls }
        });
        edges.push({ id: 'e3', source: 'prompt-1', target: 'knowledge-1', type: 'smoothstep' });
      }

      const payload = {
        name: workflowData.name,
        nodes,
        edges
      };

      let savedWorkflowId = workflowId;

      if (workflowId) {
        // Update existing
        await api.put(`/workflows/${workflowId}`, payload);
      } else {
        // Create new
        const response = await api.post('/workflows', payload);
        savedWorkflowId = response.data._id || response.data.id;
        navigate(`/app/voiceflow-builder/${savedWorkflowId}`, { replace: true });
      }

      alert('Workflow saved!');
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Failed to save: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!workflowId) {
      alert('Please save the workflow first');
      return;
    }

    if (!workflowData.voiceId || !workflowData.prompt) {
      alert('Please configure voice and instructions before deploying');
      return;
    }

    try {
      setDeploying(true);
      const response = await api.post(`/voiceflow/deploy/${workflowId}`);
      setDeployResult(response.data);
      setCurrentStep(steps.length); // Go to success screen
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`Deployment failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const steps = [
    {
      id: 'name',
      title: 'Workflow Name',
      icon: MessageSquare,
      description: 'Give your workflow a name'
    },
    {
      id: 'voice',
      title: 'Select Voice',
      icon: Mic,
      description: 'Choose the voice for your agent'
    },
    {
      id: 'instructions',
      title: 'Agent Instructions',
      icon: MessageSquare,
      description: 'Tell the agent how to behave'
    },
    {
      id: 'greeting',
      title: 'First Message',
      icon: Phone,
      description: 'What should the agent say first?'
    },
    {
      id: 'review',
      title: 'Review & Deploy',
      icon: Rocket,
      description: 'Save and deploy your workflow'
    }
  ];

  const CurrentStepIcon = steps[currentStep]?.icon || MessageSquare;

  // Success screen after deployment
  if (deployResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Deployed!</h1>
                <p className="text-purple-100 text-sm">Workflow is live</p>
              </div>
            </div>
            <button onClick={() => navigate('/app/agents')} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {/* Success Banner */}
          <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-foreground">Agent Deployed</h3>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Name:</span> {deployResult.agent.name}
              </p>
              {deployResult.agent.phoneNumber && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Phone:</span> {deployResult.agent.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-foreground flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              What Happens Next
            </h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Calls use your configured voice and prompt</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Transcripts saved automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Leads auto-created in CRM</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <a
            href={deployResult.frontendUrl}
            className="block w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
          >
            <PhoneCall className="h-5 w-5" />
            View Agent
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/app/agents')} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">VoiceFlow Builder</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 flex items-center gap-1">
              <div
                className={`h-2 flex-1 rounded-full ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-muted'
                }`}
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-lg mx-auto">
          {/* Step Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CurrentStepIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{steps[currentStep].title}</h2>
                <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Workflow Name</label>
                <input
                  type="text"
                  value={workflowData.name}
                  onChange={(e) => setWorkflowData({ ...workflowData, name: e.target.value })}
                  placeholder="e.g., Customer Support Agent"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground text-lg"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a voice from your library or the default voices
              </p>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  💡 Voice selection requires the desktop version. For now, we'll use a default voice. You can change it later.
                </p>
              </div>
              {workflowData.voiceId ? (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Voice: {workflowData.voiceName || 'Selected'}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    // Set default voice for mobile
                    setWorkflowData({
                      ...workflowData,
                      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice ID
                      voiceName: 'Rachel - Default Female'
                    });
                  }}
                  className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Use Default Voice (Rachel)
                </button>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Agent Instructions
                </label>
                <textarea
                  value={workflowData.prompt}
                  onChange={(e) => setWorkflowData({ ...workflowData, prompt: e.target.value })}
                  rows={10}
                  placeholder="You are Alex, a helpful customer service agent..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 10 characters
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  First Message
                </label>
                <textarea
                  value={workflowData.firstMessage}
                  onChange={(e) => setWorkflowData({ ...workflowData, firstMessage: e.target.value })}
                  rows={3}
                  placeholder="Hello! How can I help you today?"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is what the agent says when the call starts
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-foreground">Ready to Deploy?</h3>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Name: {workflowData.name}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Voice: {workflowData.voiceName || 'Default'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Instructions: {workflowData.prompt.length} characters</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !workflowData.voiceId || !workflowData.prompt}
                className="w-full p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Workflow
                  </>
                )}
              </button>

              {workflowId && (
                <button
                  onClick={handleDeploy}
                  disabled={deploying || !workflowData.voiceId || !workflowData.prompt}
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
                >
                  {deploying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5" />
                      Deploy to ElevenLabs
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-3">
        {currentStep > 0 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium"
          >
            Back
          </button>
        )}
        {currentStep < steps.length - 1 && (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
