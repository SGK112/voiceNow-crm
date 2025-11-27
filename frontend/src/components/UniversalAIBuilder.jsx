import { useState, useEffect, useRef } from 'react';
import { Sparkles, Bot, User, Send, Loader2, X, Phone, Workflow, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/services/api';
import VoiceLibrary from './VoiceLibrary';

/**
 * UniversalAIBuilder - Popup AI assistant for building agents and workflows
 *
 * Can be triggered from anywhere in the app to help users:
 * - Build voice agents conversationally
 * - Create automation workflows
 * - Configure integrations
 */
const UniversalAIBuilder = ({ open, onOpenChange, mode = 'agent' }) => {
  const [buildMode, setBuildMode] = useState(mode); // 'agent' or 'workflow'
  const [step, setStep] = useState('building'); // 'building', 'voice', 'confirm', 'creating', 'done'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState([]);
  const [config, setConfig] = useState(null); // Agent or workflow config
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceLibraryOpen, setVoiceLibraryOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      // Reset and start conversation
      reset();
      startConversation();
    }
  }, [open, buildMode]);

  const reset = () => {
    setMessages([]);
    setInput('');
    setConversationContext([]);
    setConfig(null);
    setSelectedVoice(null);
    setStep('building');
  };

  const startConversation = async () => {
    let workflowsList = '';

    if (buildMode === 'workflow') {
      // Fetch existing workflows to show the user
      try {
        const workflowsResponse = await api.get('/workflows');
        const existingWorkflows = workflowsResponse.data || [];

        if (existingWorkflows.length > 0) {
          workflowsList = `\n\n📋 **Your Existing Workflows:**\n${existingWorkflows.map((w, i) =>
            `${i + 1}. ${w.name}${w.enabled ? ' ✅' : ' ⏸️'}`
          ).join('\n')}\n\nYou can ask me to update any of these, or create a new one!`;
        }
      } catch (error) {
        console.error('Could not fetch workflows:', error);
      }
    }

    const initialMessage = buildMode === 'agent'
      ? `Hi! I'm your AI assistant. I'll help you build the perfect voice agent in just a few questions.

Tell me what you want your voice agent to do. For example:
- "Call customers about our holiday sale"
- "Follow up with leads who requested quotes"
- "Schedule appointments for my roofing business"
- "Remind clients about upcoming deadlines"`
      : `Hi! I'm your AI assistant. I can help you create new automation workflows or update existing ones.${workflowsList}

Tell me what you want to do. For example:
- "Create a workflow to send SMS when a new lead calls"
- "Update my Surprise Granite workflow to include email notifications"
- "Add a node to my existing workflow that saves leads to CRM"
- "Modify the inbound call workflow to send Slack notifications"
- "Create a new workflow for appointment reminders"`;

    addMessage('assistant', initialMessage);
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Add to conversation context
    const newContext = [...conversationContext, { role: 'user', content: userMessage }];
    setConversationContext(newContext);

    // Get AI response
    await getAIResponse(newContext);
  };

  const getAIResponse = async (context) => {
    setLoading(true);
    try {
      const taskType = buildMode === 'agent' ? 'voice_agent_builder' : 'workflow_builder';

      // Fetch existing workflows to give AI context
      let existingWorkflows = [];
      if (buildMode === 'workflow') {
        try {
          const workflowsResponse = await api.get('/workflows');
          existingWorkflows = workflowsResponse.data || [];
        } catch (error) {
          console.error('Could not fetch existing workflows:', error);
        }
      }

      const response = await api.post('/ai/chat', {
        messages: context,
        task: taskType,
        // Give AI full access to existing workflows
        existingWorkflows: existingWorkflows.map(w => ({
          id: w._id,
          name: w.name,
          description: w.description,
          enabled: w.enabled,
          nodes: w.workflowJson?.nodes || [],
          connections: w.workflowJson?.connections || []
        }))
      });

      if (!response.data || !response.data.message) {
        throw new Error('Invalid response from AI service');
      }

      const aiMessage = response.data.message;
      addMessage('assistant', aiMessage);

      // Update conversation context
      setConversationContext(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      // Check if AI has enough info to generate config
      if (response.data.agent_ready && response.data.agent_config) {
        const agentConfig = response.data.agent_config;

        // Validate config has required fields
        if (!agentConfig.name || !agentConfig.purpose) {
          addMessage('assistant', "I need a bit more information. What should we name this and what's the main purpose?");
          return;
        }

        setConfig(agentConfig);

        if (buildMode === 'agent') {
          if (!agentConfig.main_message) {
            addMessage('assistant', "I need to know what message the agent should deliver. Can you tell me that?");
            return;
          }

          setStep('voice');
          setTimeout(() => {
            addMessage('assistant', `Perfect! I've created your ${buildMode} based on our conversation:

**📞 Name:** ${agentConfig.name}
**🎯 Purpose:** ${agentConfig.purpose}
**💬 Message:** ${agentConfig.main_message}

Now let's choose a voice that matches the tone. Click "Choose Voice" below.`);
          }, 1000);
        } else {
          setStep('confirm');
          setTimeout(() => {
            addMessage('assistant', `Great! I've designed your workflow:

**⚡ Name:** ${agentConfig.name}
**🎯 Purpose:** ${agentConfig.purpose}

Ready to create this workflow?`);
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Error getting AI response:', error);

      let errorMessage = "I'm having trouble processing that. ";

      if (error.response?.status === 503) {
        errorMessage += "AI service is temporarily unavailable. Please try again in a moment.";
      } else if (error.response?.status === 401) {
        errorMessage += "Your session has expired. Please log in again.";
      } else if (error.message === 'Invalid response from AI service') {
        errorMessage += "I received an invalid response. Could you please rephrase?";
      } else {
        errorMessage += "Could you please rephrase that or try again?";
      }

      addMessage('assistant', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSelect = (voice) => {
    if (!voice || !voice.voice_id) {
      addMessage('assistant', '❌ Invalid voice selection. Please try again.');
      return;
    }

    setSelectedVoice(voice);
    setVoiceLibraryOpen(false);
    setStep('confirm');

    addMessage('assistant', `Excellent choice! **${voice.name}** sounds ${voice.labels?.gender || 'great'}.

Here's your complete voice agent:

**📞 Name:** ${config.name}
**🎯 Purpose:** ${config.purpose}
**🗣️ Voice:** ${voice.name}
**💬 Message:** "${config.main_message}"

Ready to create this agent?`);
  };

  const createAgent = async () => {
    // Validation before creation
    if (!config || !config.name || !config.main_message) {
      addMessage('assistant', '❌ Missing required information. Please start over.');
      setStep('building');
      return;
    }

    if (!selectedVoice || !selectedVoice.voice_id) {
      addMessage('assistant', '❌ Please select a voice before creating the agent.');
      setStep('voice');
      return;
    }

    setStep('creating');
    setLoading(true);

    try {
      addMessage('assistant', '🚀 Creating your voice agent...');

      const systemPrompt = `You are ${config.name}, an AI voice agent for VoiceNow CRM.

PURPOSE: ${config.purpose}

MAIN MESSAGE: ${config.main_message}

TONE & PERSONALITY: ${config.tone || 'Professional and friendly'}

CONVERSATION GUIDELINES:
- Greet the person warmly
- Clearly communicate: ${config.main_message}
${config.specific_details ? `- Mention these details: ${config.specific_details}` : ''}
- Answer any questions they have
- End the call professionally

Remember: Be concise, friendly, and stay on message.`;

      const response = await api.post('/agents/create', {
        name: config.name,
        type: 'custom',
        voiceId: selectedVoice.voice_id,
        voiceName: selectedVoice.name,
        script: systemPrompt, // Backend expects script at top level
        firstMessage: config.greeting || `Hello! ${config.main_message}`,
        language: 'en',
        configuration: {
          purpose: config.purpose,
          main_message: config.main_message,
          tone: config.tone || 'professional',
          greeting: config.greeting || `Hello, this is ${config.name} calling.`,
          system_prompt: systemPrompt,
          language: 'en',
          first_message: config.greeting || `Hello! ${config.main_message}`,
        },
        enabled: true
      });

      if (response.data) {
        const agent = response.data.agent || response.data;
        setStep('done');
        addMessage('assistant', `✅ **Success!** Your agent "${config.name}" has been created!

Your agent is now ready to make calls and handle conversations automatically!`);
      } else {
        throw new Error('No data received from server');
      }

    } catch (error) {
      console.error('Error creating agent:', error);

      let errorMessage = '❌ There was an error creating your agent.\n\n';

      if (error.response?.status === 403) {
        errorMessage += '🔒 You need to upgrade your plan to create more agents.';
      } else if (error.response?.status === 401) {
        errorMessage += '🔑 Your session has expired. Please log in again.';
      } else if (error.response?.data?.message) {
        errorMessage += `**Error:** ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `**Error:** ${error.message}`;
      } else {
        errorMessage += 'An unexpected error occurred. Please try again.';
      }

      errorMessage += '\n\nIf the problem persists, please contact support.';

      addMessage('assistant', errorMessage);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    // Validation before creation
    if (!config || !config.name || !config.purpose) {
      addMessage('assistant', '❌ Missing required information. Please start over.');
      setStep('building');
      return;
    }

    setStep('creating');
    setLoading(true);

    try {
      console.log('Workflow config:', config);

      // Check if AI wants to update existing workflow or create new one
      const isUpdate = config.workflowId && config.action === 'update';

      if (isUpdate) {
        addMessage('assistant', `🔄 Updating existing workflow "${config.name}"...`);
      } else {
        addMessage('assistant', '🚀 Creating your workflow...');
      }

      // First, use AI to generate the full workflow structure
      addMessage('assistant', '🤖 AI is designing your workflow nodes...');

      const aiWorkflowResponse = await api.post('/ai/generate-workflow', {
        description: config.purpose,
        workflowType: 'general',
        workflowId: config.workflowId || null,
        action: config.action || 'create',
        existingNodes: config.existingNodes || [],
        existingConnections: config.existingConnections || [],
        context: {
          companyName: 'Your Company',
          industry: 'General'
        }
      });

      console.log('AI workflow response:', aiWorkflowResponse.data);

      const workflowStructure = aiWorkflowResponse.data.workflow;

      // Validate workflow structure
      if (!workflowStructure || !Array.isArray(workflowStructure.nodes)) {
        throw new Error('AI generated invalid workflow structure');
      }

      if (workflowStructure.nodes.length === 0) {
        addMessage('assistant', '⚠️ AI couldn\'t generate workflow steps. Creating basic workflow...');
      }

      let response;

      if (isUpdate) {
        // Update existing workflow
        response = await api.put(`/workflows/${config.workflowId}`, {
          name: config.name,
          description: config.purpose,
          n8nWorkflow: {
            nodes: workflowStructure.nodes || [],
            connections: workflowStructure.connections || []
          },
          enabled: config.enabled !== undefined ? config.enabled : true
        });

        console.log('Workflow update response:', response.data);

        if (response.data) {
          setStep('done');
          const nodeCount = workflowStructure.nodes?.length || 0;
          addMessage('assistant', `✅ **Success!** Workflow "${config.name}" has been updated${nodeCount > 0 ? ` with ${nodeCount} automation step${nodeCount > 1 ? 's' : ''}` : ''}!

Your workflow changes have been saved and are ready to use!`);
        }
      } else {
        // Create new workflow
        response = await api.post('/workflows', {
          name: config.name,
          type: 'custom',
          description: config.purpose,
          workflowJson: {
            nodes: workflowStructure.nodes || [],
            connections: workflowStructure.connections || []
          },
          triggerConditions: config.trigger || workflowStructure.trigger || {},
          enabled: true
        });

        console.log('Workflow creation response:', response.data);

        if (response.data) {
          setStep('done');
          const nodeCount = workflowStructure.nodes?.length || 0;
          addMessage('assistant', `✅ **Success!** Your workflow "${config.name}" has been created${nodeCount > 0 ? ` with ${nodeCount} automation step${nodeCount > 1 ? 's' : ''}` : ''}!

Your workflow is now ready${nodeCount > 0 ? ' to automate your tasks' : '. You can customize it in the Workflow Studio'}!`);
        }
      }

      if (!response.data) {
        throw new Error('No data received from server');
      }

    } catch (error) {
      console.error('Error creating workflow:', error);

      let errorMessage = '❌ There was an error creating your workflow.\n\n';

      if (error.response?.status === 403) {
        errorMessage += '🔒 You need to upgrade your plan to create more workflows.';
      } else if (error.response?.status === 401) {
        errorMessage += '🔑 Your session has expired. Please log in again.';
      } else if (error.response?.status === 503) {
        errorMessage += '🤖 AI service is temporarily unavailable. Please try again.';
      } else if (error.response?.data?.message) {
        errorMessage += `**Error:** ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `**Error:** ${error.message}`;
      } else {
        errorMessage += 'An unexpected error occurred. Please try again.';
      }

      errorMessage += '\n\nIf the problem persists, please contact support.';

      addMessage('assistant', errorMessage);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (buildMode === 'agent') {
      createAgent();
    } else {
      createWorkflow();
    }
  };

  const handleClose = () => {
    // Warn if user is in the middle of creating
    if (step === 'creating' || (step === 'confirm' && config)) {
      const confirmClose = window.confirm(
        'Are you sure you want to close? Your progress will be lost.'
      );
      if (!confirmClose) return;
    }

    reset();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">AI Builder</DialogTitle>
                  <DialogDescription className="text-sm text-foreground">
                    Chat with AI to build in minutes
                  </DialogDescription>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={buildMode === 'agent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBuildMode('agent')}
                  disabled={step !== 'building' || messages.length > 1}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Agent
                </Button>
                <Button
                  variant={buildMode === 'workflow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBuildMode('workflow')}
                  disabled={step !== 'building' || messages.length > 1}
                >
                  <Workflow className="w-4 h-4 mr-2" />
                  Workflow
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-secondary">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-card border border-border text-foreground shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Voice Selection Button */}
            {step === 'voice' && !selectedVoice && (
              <div className="flex justify-center my-4">
                <Button
                  onClick={() => setVoiceLibraryOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Choose Voice
                </Button>
              </div>
            )}

            {/* Create Button */}
            {step === 'confirm' && (
              <div className="flex justify-center gap-3 my-4">
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Create {buildMode === 'agent' ? 'Agent' : 'Workflow'}
                    </>
                  )}
                </Button>
                {buildMode === 'agent' && (
                  <Button
                    onClick={() => setStep('voice')}
                    variant="outline"
                    size="lg"
                  >
                    Change Voice
                  </Button>
                )}
              </div>
            )}

            {/* Done Actions */}
            {step === 'done' && (
              <div className="flex justify-center gap-3 my-4">
                <Button
                  onClick={handleClose}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  Done
                </Button>
                <Button
                  onClick={() => {
                    reset();
                    startConversation();
                  }}
                  variant="outline"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Build Another
                </Button>
              </div>
            )}

            {loading && step === 'building' && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-md">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {(step === 'building') && (
            <div className="border-t border-border p-4 bg-card border border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-foreground mt-2">
                Press Enter to send • Shift + Enter for new line
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Voice Library Modal */}
      <VoiceLibrary
        open={voiceLibraryOpen}
        onOpenChange={setVoiceLibraryOpen}
        onSelectVoice={handleVoiceSelect}
        selectedVoiceId={selectedVoice?.voice_id}
      />
    </>
  );
};

export default UniversalAIBuilder;
