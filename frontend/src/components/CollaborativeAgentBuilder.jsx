import { useState, useEffect } from 'react';
import {
  Bot, Brain, MessageSquare, Workflow, Phone,
  Check, ChevronRight, Upload, Plus, X, Loader2,
  BookOpen, Zap, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import VoiceLibrary from './VoiceLibrary';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';

/**
 * CollaborativeAgentBuilder - Build agents WITH the user
 *
 * Step-by-step collaborative process:
 * 1. Define - What should your agent do?
 * 2. Train - Give it knowledge and personality
 * 3. Connect - Assign to workflows
 * 4. Test - Try it out live
 * 5. Deploy - Make it live
 */
const CollaborativeAgentBuilder = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);

  // Agent configuration
  const [config, setConfig] = useState({
    // Step 1: Define
    name: '',
    purpose: '',
    template: null,

    // Step 2: Train
    voice_id: null,
    voice_name: 'Rachel - Professional',
    personality: {
      tone: [],
      speaking_pace: 'moderate',
      formality: 'professional'
    },
    knowledge: {
      company_info: '',
      services: '',
      pricing: '',
      faqs: [{ question: '', answer: '' }],
      documents: []
    },
    conversation_flow: {
      greeting: '',
      questions_to_ask: [],
      closing: ''
    },

    // Step 3: Connect
    workflows: [],
    integrations: {
      crm: false,
      calendar: false,
      sms: false,
      email: false
    },
    actions: {
      on_call_start: [],
      on_lead_qualified: [],
      on_appointment_booked: [],
      on_call_end: []
    },

    // Step 4: Test
    test_phone: '',
    test_completed: false
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await api.get('/workflows');
      setWorkflows(response.data?.workflows || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const toggleArrayItem = (path, item) => {
    const current = path.split('.').reduce((obj, key) => obj[key], config);
    const newArray = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateConfig(path, newArray);
  };

  const addFAQ = () => {
    updateConfig('knowledge.faqs', [...config.knowledge.faqs, { question: '', answer: '' }]);
  };

  const updateFAQ = (index, field, value) => {
    const newFaqs = [...config.knowledge.faqs];
    newFaqs[index][field] = value;
    updateConfig('knowledge.faqs', newFaqs);
  };

  const removeFAQ = (index) => {
    updateConfig('knowledge.faqs', config.knowledge.faqs.filter((_, i) => i !== index));
  };

  const handleVoiceSelect = (voice) => {
    const labels = voice.labels || {};
    updateConfig('voice_id', voice.voice_id);
    updateConfig('voice_name', `${voice.name} - ${labels.description || 'Professional'}`);
  };

  const createAgent = async () => {
    try {
      setLoading(true);

      // Build the comprehensive agent configuration
      const agentData = {
        name: config.name,
        description: config.purpose,
        voice_id: config.voice_id,

        // Build the system prompt from all the training data
        prompt: buildSystemPrompt(),

        first_message: config.conversation_flow.greeting,
        language: 'en',

        // Attach workflows
        workflows: config.workflows,

        // Attach integrations
        integrations: config.integrations,

        // Attach actions
        actions: config.actions,

        // Knowledge base
        knowledge: config.knowledge
      };

      const response = await api.post('/agent-management/create', agentData);

      if (response.data.success) {
        setCreatedAgent(response.data.agent);
        setCurrentStep(5); // Move to deploy step
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buildSystemPrompt = () => {
    // Collaborative prompt building from all user inputs
    return `You are ${config.name}, an AI voice agent for VoiceFlow CRM.

PURPOSE:
${config.purpose}

PERSONALITY:
- Tone: ${config.personality.tone.join(', ') || 'Professional'}
- Speaking Pace: ${config.personality.speaking_pace}
- Formality: ${config.personality.formality}

COMPANY INFORMATION:
${config.knowledge.company_info}

SERVICES WE OFFER:
${config.knowledge.services}

PRICING:
${config.knowledge.pricing}

FREQUENTLY ASKED QUESTIONS:
${config.knowledge.faqs.map((faq, i) => `
Q${i + 1}: ${faq.question}
A: ${faq.answer}
`).join('\n')}

CONVERSATION FLOW:
1. Opening: ${config.conversation_flow.greeting}
2. Ask these questions:
${config.conversation_flow.questions_to_ask.map((q, i) => `   ${i + 1}. ${q}`).join('\n')}
3. Closing: ${config.conversation_flow.closing}

IMPORTANT GUIDELINES:
- Keep responses conversational and natural
- Listen actively and respond to customer needs
- Be helpful and solution-oriented
- Collect information needed for follow-up
- End calls professionally

Remember: You represent VoiceFlow CRM and our customer's business. Be excellent!`;
  };

  const testAgent = async () => {
    if (!config.test_phone) {
      alert('Please enter a phone number to test');
      return;
    }

    try {
      setLoading(true);
      // Initiate test call
      const response = await api.post('/calls/test', {
        agent_id: createdAgent.agent_id,
        phone_number: config.test_phone
      });

      if (response.data.success) {
        updateConfig('test_completed', true);
        alert('Test call initiated! Your phone will ring shortly.');
      }
    } catch (error) {
      console.error('Error testing agent:', error);
      alert('Failed to initiate test call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, name: 'Define', icon: Bot, description: 'What should your agent do?' },
    { number: 2, name: 'Train', icon: Brain, description: 'Give it knowledge & personality' },
    { number: 3, name: 'Connect', icon: Workflow, description: 'Assign to workflows' },
    { number: 4, name: 'Test', icon: Phone, description: 'Try it out live' },
    { number: 5, name: 'Deploy', icon: Zap, description: 'Make it live' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.number
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <p className="text-xs font-medium mt-2">{step.name}</p>
                <p className="text-xs text-gray-500 mt-1 text-center">{step.description}</p>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 ${currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Define */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              Define Your Agent
            </CardTitle>
            <CardDescription>Let's start by understanding what your agent should do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">What should we call your agent? *</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="e.g., Sarah - Lead Qualifier"
                className="text-base mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">This is how your agent will introduce itself to callers</p>
            </div>

            <div>
              <Label htmlFor="purpose">What's the main purpose of this agent? *</Label>
              <Textarea
                id="purpose"
                value={config.purpose}
                onChange={(e) => updateConfig('purpose', e.target.value)}
                placeholder="Describe what you want this agent to do...&#10;&#10;Example: Answer calls when we're on job sites, qualify roofing leads, collect contact info, detect urgency for leaks, and schedule free estimates within 24-48 hours."
                rows={6}
                className="text-base mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Be specific - this helps us build the perfect agent for you</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/agents')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!config.name || !config.purpose}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Next: Train Your Agent
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Train */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6" />
              Train Your Agent
            </CardTitle>
            <CardDescription>Give your agent knowledge and personality</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="voice" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="voice">Voice & Tone</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>

              {/* Voice & Tone */}
              <TabsContent value="voice" className="space-y-6 mt-6">
                <div>
                  <Label>Select Your Agent's Voice *</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                      <p className="font-medium text-sm">{config.voice_name}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowVoiceLibrary(true)}
                    >
                      Change Voice
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Choose a voice that matches your brand</p>
                </div>

                <div>
                  <Label>Personality Traits</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['Professional', 'Friendly', 'Empathetic', 'Confident', 'Warm', 'Energetic'].map(trait => (
                      <div key={trait} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tone-${trait}`}
                          checked={config.personality.tone.includes(trait.toLowerCase())}
                          onCheckedChange={() => toggleArrayItem('personality.tone', trait.toLowerCase())}
                        />
                        <label htmlFor={`tone-${trait}`} className="text-sm cursor-pointer">
                          {trait}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Speaking Pace</Label>
                  <div className="flex gap-3 mt-2">
                    {['Fast', 'Moderate', 'Slow'].map(pace => (
                      <Button
                        key={pace}
                        variant={config.personality.speaking_pace === pace.toLowerCase() ? 'default' : 'outline'}
                        onClick={() => updateConfig('personality.speaking_pace', pace.toLowerCase())}
                        className="flex-1"
                      >
                        {pace}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Knowledge Base */}
              <TabsContent value="knowledge" className="space-y-6 mt-6">
                <div>
                  <Label htmlFor="company_info">Tell us about your company</Label>
                  <Textarea
                    id="company_info"
                    value={config.knowledge.company_info}
                    onChange={(e) => updateConfig('knowledge.company_info', e.target.value)}
                    placeholder="We are Rodriguez Brothers Roofing, a family-owned business serving Phoenix for over 15 years. We specialize in residential and commercial roofing..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="services">What services do you offer?</Label>
                  <Textarea
                    id="services"
                    value={config.knowledge.services}
                    onChange={(e) => updateConfig('knowledge.services', e.target.value)}
                    placeholder="- Roof repairs and leak detection&#10;- Complete roof replacement&#10;- New construction roofing&#10;- Emergency services&#10;- Free estimates"
                    rows={5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="pricing">Pricing information (optional)</Label>
                  <Textarea
                    id="pricing"
                    value={config.knowledge.pricing}
                    onChange={(e) => updateConfig('knowledge.pricing', e.target.value)}
                    placeholder="- Free estimates&#10;- Typical roof replacement: $8,000-$25,000&#10;- Repairs starting at $500&#10;- Emergency service: $200 minimum"
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Upload Documents (optional)</Label>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price lists, service guides, company info, etc.</p>
                </div>
              </TabsContent>

              {/* Conversation Flow */}
              <TabsContent value="conversation" className="space-y-6 mt-6">
                <div>
                  <Label htmlFor="greeting">Opening Greeting *</Label>
                  <Textarea
                    id="greeting"
                    value={config.conversation_flow.greeting}
                    onChange={(e) => updateConfig('conversation_flow.greeting', e.target.value)}
                    placeholder="Thank you for calling Rodriguez Brothers Roofing! This is Sarah. I understand you're calling about a roofing project. How can I help you today?"
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>What questions should your agent ask?</Label>
                  <div className="space-y-2 mt-2">
                    {['Type of project', 'Property location', 'Timeline/urgency', 'Best contact method'].map((q, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Checkbox
                          checked={config.conversation_flow.questions_to_ask.includes(q)}
                          onCheckedChange={() => toggleArrayItem('conversation_flow.questions_to_ask', q)}
                        />
                        <label className="text-sm">{q}</label>
                      </div>
                    ))}
                  </div>
                  <Input
                    placeholder="Add custom question..."
                    className="mt-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        toggleArrayItem('conversation_flow.questions_to_ask', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="closing">Closing Statement</Label>
                  <Textarea
                    id="closing"
                    value={config.conversation_flow.closing}
                    onChange={(e) => updateConfig('conversation_flow.closing', e.target.value)}
                    placeholder="Perfect! I've noted all your information. We'll have someone contact you within 24 hours to schedule your free estimate. Is there anything else I can help with?"
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              {/* FAQs */}
              <TabsContent value="faqs" className="space-y-4 mt-6">
                <p className="text-sm text-gray-600">Teach your agent how to answer common questions</p>

                {config.knowledge.faqs.map((faq, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Label className="text-sm">FAQ {index + 1}</Label>
                      {config.knowledge.faqs.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFAQ(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Question (e.g., Do you offer free estimates?)"
                      value={faq.question}
                      onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                    />
                    <Textarea
                      placeholder="Answer your agent should give..."
                      value={faq.answer}
                      onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}

                <Button variant="outline" onClick={addFAQ} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!config.conversation_flow.greeting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Next: Connect to Workflows
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Connect */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="w-6 h-6" />
              Connect to Workflows
            </CardTitle>
            <CardDescription>Assign your agent to workflows and set up automations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Assign to Workflows</Label>
              <p className="text-sm text-gray-500 mb-3">Select which n8n workflows this agent should trigger</p>

              {workflows.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">No workflows yet</p>
                  <Button variant="outline" onClick={() => navigate('/workflows')}>
                    Create Your First Workflow
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows.map(workflow => (
                    <div key={workflow.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={config.workflows.includes(workflow.id)}
                        onCheckedChange={() => toggleArrayItem('workflows', workflow.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{workflow.name}</p>
                        <p className="text-xs text-gray-500">{workflow.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Integrations</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { key: 'crm', label: 'Save to CRM', icon: '📊' },
                  { key: 'calendar', label: 'Add to Calendar', icon: '📅' },
                  { key: 'sms', label: 'Send SMS Updates', icon: '💬' },
                  { key: 'email', label: 'Email Notifications', icon: '📧' }
                ].map(integration => (
                  <div key={integration.key} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Checkbox
                      checked={config.integrations[integration.key]}
                      onCheckedChange={(checked) => updateConfig(`integrations.${integration.key}`, checked)}
                    />
                    <label className="text-sm cursor-pointer flex items-center gap-2">
                      <span>{integration.icon}</span>
                      {integration.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  createAgent();
                  setCurrentStep(4);
                }}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Agent...
                  </>
                ) : (
                  <>
                    Next: Test Your Agent
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Test */}
      {currentStep === 4 && createdAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-6 h-6" />
              Test Your Agent
            </CardTitle>
            <CardDescription>Try it out with a live test call</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Your agent is ready for testing!
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Enter your phone number below and we'll call you immediately so you can test how your agent sounds and responds.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="test_phone">Your Phone Number</Label>
              <div className="flex gap-3 mt-2">
                <Input
                  id="test_phone"
                  type="tel"
                  value={config.test_phone}
                  onChange={(e) => updateConfig('test_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="flex-1"
                />
                <Button
                  onClick={testAgent}
                  disabled={!config.test_phone || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2" />
                      Call Me Now
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">You'll receive a call from your agent in ~10 seconds</p>
            </div>

            {config.test_completed && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Test call initiated!
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your phone should ring shortly. Try having a natural conversation to test your agent's responses.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(5)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {config.test_completed ? 'Deploy Agent' : 'Skip Test & Deploy'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Deploy */}
      {currentStep === 5 && createdAgent && (
        <Card className="border-2 border-green-500">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Your Agent is Live!
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                {config.name} is ready to handle calls
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
                <h3 className="font-semibold mb-4">What happens next:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm">Agent is active and ready to receive calls</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm">Connected workflows will trigger automatically</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm">You'll see calls and analytics in your dashboard</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm">You can edit, train, or pause the agent anytime</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <Button
                  className="w-full"
                  onClick={() => navigate('/agents')}
                >
                  View Agent Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCurrentStep(1);
                    setCreatedAgent(null);
                    setConfig({
                      name: '',
                      purpose: '',
                      template: null,
                      voice_id: null,
                      voice_name: 'Rachel - Professional',
                      personality: { tone: [], speaking_pace: 'moderate', formality: 'professional' },
                      knowledge: { company_info: '', services: '', pricing: '', faqs: [{ question: '', answer: '' }], documents: [] },
                      conversation_flow: { greeting: '', questions_to_ask: [], closing: '' },
                      workflows: [],
                      integrations: { crm: false, calendar: false, sms: false, email: false },
                      actions: { on_call_start: [], on_lead_qualified: [], on_appointment_booked: [], on_call_end: [] },
                      test_phone: '',
                      test_completed: false
                    });
                  }}
                >
                  Create Another Agent
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Library Modal - Accessible from any step */}
      <VoiceLibrary
        open={showVoiceLibrary}
        onOpenChange={setShowVoiceLibrary}
        onSelectVoice={handleVoiceSelect}
        selectedVoiceId={config.voice_id}
      />
    </div>
  );
};

export default CollaborativeAgentBuilder;
