import { useState, useEffect } from 'react';
import { Sparkles, Zap, Wand2, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceLibrary from './VoiceLibrary';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * AgentBuilder - Standard Tier Self-Service Agent Creation
 *
 * Allows users to create voice agents using templates or from scratch
 * Everything stays in-house, no ElevenLabs redirects
 */
const AgentBuilder = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('choose'); // choose, template, customize, creating, success
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice_id: null,
    voice_name: 'Rachel - Professional',
    prompt: '',
    first_message: '',
    language: 'en'
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await axios.get('/api/agents/helpers/templates');
      if (response.data.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: `${template.name}`,
      description: template.description,
      voice_id: template.default_voice_id || null,
      voice_name: template.default_voice_name || 'Rachel - Professional',
      prompt: template.prompt,
      first_message: template.first_message,
      language: template.language || 'en'
    });
    setStep('customize');
  };

  const buildFromScratch = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      voice_id: null,
      voice_name: 'Rachel - Professional',
      prompt: '',
      first_message: '',
      language: 'en'
    });
    setStep('customize');
  };

  const handleVoiceSelect = (voice) => {
    const labels = voice.labels || {};
    const voiceName = `${voice.name} - ${labels.description || labels.gender || 'Professional'}`;

    setFormData({
      ...formData,
      voice_id: voice.voice_id,
      voice_name: voiceName
    });
  };

  const createAgent = async () => {
    try {
      setLoading(true);
      setStep('creating');

      const response = await axios.post('/api/agent-management/create', {
        name: formData.name,
        description: formData.description,
        voice_id: formData.voice_id,
        prompt: formData.prompt,
        first_message: formData.first_message,
        language: formData.language
      });

      if (response.data.success) {
        setCreatedAgent(response.data.agent);
        setStep('success');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent. Please try again.');
      setStep('customize');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Choose path
  if (step === 'choose') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Voice Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose how you'd like to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Use Template */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
            onClick={() => setStep('template')}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Use a Template</CardTitle>
              <CardDescription>
                Get started in 5 minutes with proven agent templates for your industry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Pre-built conversation flows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Industry-specific prompts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Easy to customize</span>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                Browse Templates
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Build from Scratch */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-500"
            onClick={buildFromScratch}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Build from Scratch</CardTitle>
              <CardDescription>
                Full control to customize everything exactly how you want
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Complete customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Your own conversation flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Perfect for unique use cases</span>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                Start Building
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Premium Option */}
        <Card className="mt-6 border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Need a Premium Custom Agent?</CardTitle>
                <CardDescription>
                  We'll build a custom agent tailored exactly to your business
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={() => navigate('/premium-agent-request')}
            >
              Request Premium Agent Build
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Template selection
  if (step === 'template') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setStep('choose')}>
            ← Back
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Choose an Agent Template
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a pre-built template and customize it for your business
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-500"
              onClick={() => selectTemplate(template)}
            >
              <CardHeader>
                <div className="text-3xl mb-3">{template.icon || '🤖'}</div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
                  {template.features?.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-600 shrink-0" />
                      <span className="line-clamp-1">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  Use This Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Step 3: Customize agent
  if (step === 'customize') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setStep(selectedTemplate ? 'template' : 'choose')}>
            ← Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedTemplate ? `Customize ${selectedTemplate.name}` : 'Build Your Agent'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your voice agent settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Agent Name */}
          <div>
            <Label htmlFor="name" className="text-base font-semibold">
              Agent Name *
            </Label>
            <p className="text-sm text-gray-500 mb-2">
              What should your agent introduce itself as?
            </p>
            <Input
              id="name"
              placeholder="e.g., Maria - Rodriguez Brothers Roofing"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-base"
            />
          </div>

          {/* Voice Selection */}
          <div>
            <Label className="text-base font-semibold">
              Select Voice *
            </Label>
            <p className="text-sm text-gray-500 mb-2">
              Choose the voice your agent will use
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <p className="font-medium text-sm">{formData.voice_name}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowVoiceLibrary(true)}
              >
                Change Voice
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Customers respond best to friendly, professional voices
            </p>
          </div>

          {/* First Message */}
          <div>
            <Label htmlFor="first_message" className="text-base font-semibold">
              First Message *
            </Label>
            <p className="text-sm text-gray-500 mb-2">
              What will the agent say when answering a call?
            </p>
            <Textarea
              id="first_message"
              placeholder="Thanks for calling! This is Maria. How can I help you today?"
              value={formData.first_message}
              onChange={(e) => setFormData({ ...formData, first_message: e.target.value })}
              rows={3}
              className="text-base"
            />
          </div>

          {/* Language */}
          <div>
            <Label htmlFor="language" className="text-base font-semibold">
              Language
            </Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced: Prompt (collapsible) */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-semibold text-base">
              Advanced Settings (Optional)
            </summary>
            <div className="mt-4">
              <Label htmlFor="prompt" className="text-sm font-semibold">
                Agent Prompt
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Instructions that define how your agent behaves
              </p>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={8}
                className="font-mono text-xs"
                placeholder="You are a helpful assistant that..."
              />
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep(selectedTemplate ? 'template' : 'choose')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={createAgent}
              disabled={!formData.name || !formData.first_message || loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Agent
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Voice Library Modal */}
        <VoiceLibrary
          open={showVoiceLibrary}
          onOpenChange={setShowVoiceLibrary}
          onSelectVoice={handleVoiceSelect}
          selectedVoiceId={formData.voice_id}
        />
      </div>
    );
  }

  // Step 4: Creating
  if (step === 'creating') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Creating Your Voice Agent...
              </h2>
              <div className="space-y-2 mt-6 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Creating agent in ElevenLabs</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Configuring voice settings</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Setting up conversation flow...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: Success
  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-2 border-green-500">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Success!
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Your Voice Agent is Ready to Work!
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Agent Name</p>
                    <p className="font-semibold">{createdAgent?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-green-600">🟢 Active</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Voice</p>
                    <p className="font-semibold">{formData.voice_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Language</p>
                    <p className="font-semibold">{formData.language.toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
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
                    setStep('choose');
                    setFormData({
                      name: '',
                      description: '',
                      voice_id: null,
                      voice_name: 'Rachel - Professional',
                      prompt: '',
                      first_message: '',
                      language: 'en'
                    });
                    setCreatedAgent(null);
                  }}
                >
                  Create Another Agent
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default AgentBuilder;
