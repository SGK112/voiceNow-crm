import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Check, RefreshCw, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import VoiceLibrary from './VoiceLibrary';
import { useProfile } from '@/context/ProfileContext';
import { buildAgentSystemPrompt } from '@/utils/promptBuilder';

/**
 * AIConversationalAgentBuilder - Chat with AI to build voice agents
 *
 * Examples:
 * - "Build a friendly AI voice agent to call customers for our current promo"
 * - "Call my carpet vendor to inform them of delivery schedule change"
 * - "Call John to let him know I'll be there at 3pm for the walkthrough"
 */
const AIConversationalAgentBuilder = () => {
  const navigate = useNavigate();
  const profileHelpers = useProfile();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentConfig, setAgentConfig] = useState(null);
  const [step, setStep] = useState('topic'); // topic, building, voice, confirm, creating, done
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [voiceLibraryOpen, setVoiceLibraryOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  const messagesEndRef = useRef(null);

  const topics = [
    {
      id: 'promo',
      title: '📣 Promotional Calls',
      description: 'Call customers about current promotions and offers',
      example: 'Build a friendly AI to call customers about our 20% off roofing special',
      startingPrompt: 'I want to create an agent to call customers about a promotional offer.'
    },
    {
      id: 'vendor',
      title: '🏢 Vendor Notifications',
      description: 'Inform vendors, suppliers, or partners',
      example: 'Call my carpet vendor to inform them of updated delivery schedule',
      startingPrompt: 'I need to notify a vendor or supplier about something.'
    },
    {
      id: 'appointment',
      title: '📅 Appointment & Walkthroughs',
      description: 'Remind customers about appointments or schedule walkthroughs',
      example: 'Call customers to remind them I\'ll be there at 3pm for the walkthrough',
      startingPrompt: 'I want to call someone about an appointment or walkthrough.'
    },
    {
      id: 'personal',
      title: '👤 Personal Assistant Calls',
      description: 'Make specific calls to individuals',
      example: 'Call John to let him know I\'ll be there at 3',
      startingPrompt: 'I need my agent to call someone and give them a specific message.'
    },
    {
      id: 'lead',
      title: '🎯 Lead Qualification',
      description: 'Call and qualify potential leads',
      example: 'Build an agent to call new leads and qualify them for roofing services',
      startingPrompt: 'I want to qualify leads by calling them.'
    },
    {
      id: 'custom',
      title: '✨ Custom Agent',
      description: 'Tell me what you need',
      example: 'I have a specific use case in mind...',
      startingPrompt: 'I want to create a custom voice agent.'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const selectTopic = async (topic) => {
    setSelectedTopic(topic);
    setStep('building');

    // Add user's topic selection
    addMessage('user', topic.startingPrompt);

    // Initialize conversation context for AI
    const initialContext = [
      { role: 'system', content: `You are an expert AI assistant helping users build voice agents for their business. The user wants to create a ${topic.title}. Ask clarifying questions to understand:
1. What specific message or action the agent should communicate
2. Who they're calling (customers, vendors, specific person, etc.)
3. The tone (friendly, professional, urgent, etc.)
4. Any specific details (time, location, promo details, etc.)

Keep responses conversational and friendly. After gathering enough info, generate a complete agent configuration.` },
      { role: 'user', content: topic.startingPrompt }
    ];

    setConversationContext(initialContext);
    await getAIResponse(initialContext);
  };

  const getAIResponse = async (context) => {
    setLoading(true);
    try {
      const response = await api.post('/ai/chat', {
        messages: context,
        task: 'voice_agent_builder'
      });

      const aiMessage = response.data.message;
      addMessage('assistant', aiMessage);

      // Update conversation context
      setConversationContext(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      // Check if AI has enough info to generate agent
      if (response.data.agent_ready && response.data.agent_config) {
        setAgentConfig(response.data.agent_config);
        setStep('voice');

        setTimeout(() => {
          addMessage('assistant', `Perfect! I've created your agent based on our conversation:

**📞 Agent Name:** ${response.data.agent_config.name}
**🎯 Purpose:** ${response.data.agent_config.purpose}
**💬 Main Message:** ${response.data.agent_config.main_message}

Now let's choose a voice that matches the tone. Click "Choose Voice" below.`);
        }, 1000);
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      addMessage('assistant', "I'm having trouble processing that. Could you please rephrase?");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Add to conversation context
    const newContext = [...conversationContext, { role: 'user', content: userMessage }];
    setConversationContext(newContext);

    await getAIResponse(newContext);
  };

  const handleVoiceSelect = (voice) => {
    setSelectedVoice(voice);
    setVoiceLibraryOpen(false);
    setStep('confirm');

    addMessage('assistant', `Excellent choice! **${voice.name}** sounds ${voice.labels?.gender || 'great'} and ${voice.labels?.age || 'professional'}.

Here's your complete voice agent:

**📞 Agent Name:** ${agentConfig.name}
**🎯 Purpose:** ${agentConfig.purpose}
**🗣️ Voice:** ${voice.name}
**💬 Message:** "${agentConfig.main_message}"

Ready to create this agent? It will be available immediately for making calls!`);
  };

  const createAgent = async () => {
    setStep('creating');
    setLoading(true);

    try {
      addMessage('assistant', '🚀 Creating your voice agent...');

      // Build comprehensive system prompt with profile context using utility
      const systemPrompt = buildAgentSystemPrompt({
        agentName: agentConfig.name,
        purpose: agentConfig.purpose,
        mainMessage: agentConfig.main_message,
        tone: agentConfig.tone,
        specificDetails: agentConfig.specific_details,
        conversationType: selectedTopic.title.replace(/[📣🏢📅👤🎯✨]/g, '').trim()
      }, profileHelpers);

      // Create agent in VoiceNow CRM database (not just ElevenLabs)
      const response = await api.post('/agents', {
        name: agentConfig.name,
        type: selectedTopic.id,
        voiceId: selectedVoice.voice_id,
        voiceName: selectedVoice.name,
        configuration: {
          purpose: agentConfig.purpose,
          main_message: agentConfig.main_message,
          tone: agentConfig.tone || 'professional',
          greeting: agentConfig.greeting || `Hello, this is ${agentConfig.name} calling.`,
          system_prompt: systemPrompt,
          language: 'en',
          first_message: agentConfig.greeting || `Hello! ${agentConfig.main_message}`,
        },
        enabled: true
      });

      if (response.data) {
        const agent = response.data.agent || response.data;
        setStep('done');
        addMessage('assistant', `✅ **Success!** Your agent "${agentConfig.name}" has been created!

**Agent ID:** ${agent._id || agent.id}

Your agent is now ready to:
- Make outbound calls
- Handle conversations automatically
- Work with your workflows

What would you like to do next?`);
      }

    } catch (error) {
      console.error('Error creating agent:', error);
      addMessage('assistant', `❌ There was an error creating your agent: ${error.response?.data?.message || error.message}

Please try again or contact support if the issue persists.`);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setMessages([]);
    setAgentConfig(null);
    setSelectedTopic(null);
    setSelectedVoice(null);
    setConversationContext([]);
    setStep('topic');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              AI Voice Agent Builder
            </h1>
            <p className="text-muted-foreground">
              Chat with AI to build the perfect voice agent in minutes
            </p>
          </div>
        </div>
      </div>

      {/* Topic Selection */}
      {step === 'topic' && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              What kind of voice agent do you want to create?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Card
                key={topic.id}
                className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
                onClick={() => selectTopic(topic)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{topic.title.match(/[📣🏢📅👤🎯✨]/)?.[0]}</span>
                    {topic.title.replace(/[📣🏢📅👤🎯✨]/g, '').trim()}
                  </CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground italic">
                    "{topic.example}"
                  </p>
                  <div className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
                    Get Started →
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Chat Interface */}
      {step !== 'topic' && (
        <div className="flex-1 flex flex-col bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Topic Badge */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-sm">
                <span className="mr-2">{selectedTopic?.title.match(/[📣🏢📅👤🎯✨]/)?.[0]}</span>
                {selectedTopic?.title.replace(/[📣🏢📅👤🎯✨]/g, '').trim()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={startOver}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>

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
                  className={`max-w-[70%] rounded-lg p-4 ${
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

            {/* Create Agent Button */}
            {step === 'confirm' && (
              <div className="flex justify-center gap-3 my-4">
                <Button
                  onClick={createAgent}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Agent...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setStep('voice')}
                  variant="outline"
                  size="lg"
                >
                  Change Voice
                </Button>
              </div>
            )}

            {/* Done Actions */}
            {step === 'done' && (
              <div className="flex justify-center gap-3 my-4">
                <Button
                  onClick={() => navigate('/app/agents')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  View My Agents
                </Button>
                <Button
                  onClick={startOver}
                  variant="outline"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Another Agent
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
        </div>
      )}

      {/* Voice Library Modal */}
      <VoiceLibrary
        open={voiceLibraryOpen}
        onOpenChange={setVoiceLibraryOpen}
        onSelectVoice={handleVoiceSelect}
        selectedVoiceId={selectedVoice?.voice_id}
      />
    </div>
  );
};

export default AIConversationalAgentBuilder;
