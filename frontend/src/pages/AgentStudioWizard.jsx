import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, Info, HelpCircle,
  Mic, Settings, BookOpen, TestTube, Play, Pause, Upload,
  Globe, FileText, AlertCircle, CheckCircle, Loader,
  Phone, MessageSquare, Mail, X
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { elevenLabsApi, agentApi, knowledgeBaseApi } from '../services/api';
import VoiceLibraryBrowser from '../components/VoiceLibraryBrowser';

/**
 * 🎙️ AGENT STUDIO WIZARD
 *
 * Multi-stage workflow for creating AI voice agents with ElevenLabs
 *
 * STAGES:
 * 1. Voice Selection - Choose from 5,000+ AI voices across 29 languages
 * 2. Agent Configuration - Set name, language, prompt, and behavior
 * 3. Knowledge Base - Upload documents, add URLs, connect data sources
 * 4. Test & Deploy - Test your agent and deploy to production
 *
 * FEATURES:
 * - Multi-language support (29 languages with auto-detection)
 * - Knowledge base integration (PDFs, docs, websites, Google Sheets)
 * - Real-time testing (call, SMS, email)
 * - Inline documentation and tooltips
 */

const STAGES = [
  {
    id: 1,
    name: 'Voice Selection',
    icon: Mic,
    description: 'Choose the perfect voice for your agent',
    helpText: 'Select from over 5,000 AI voices. You can filter by language, gender, accent, and age. Preview voices before selecting.'
  },
  {
    id: 2,
    name: 'Configuration',
    icon: Settings,
    description: 'Configure your agent\'s behavior and personality',
    helpText: 'Set your agent\'s name, language, system prompt (instructions), and initial greeting. The system prompt defines how your agent behaves.'
  },
  {
    id: 3,
    name: 'Knowledge Base',
    icon: BookOpen,
    description: 'Add knowledge and data sources',
    helpText: 'Upload documents like price lists, PDFs, or FAQs. Add website URLs to scrape. Import Google Sheets. This gives your agent context to answer questions.'
  },
  {
    id: 4,
    name: 'Test & Deploy',
    icon: TestTube,
    description: 'Test and activate your agent',
    helpText: 'Test your agent with a live call, SMS, or email before deploying to production. Review all settings and make final adjustments.'
  }
];

export default function AgentStudioWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStage, setCurrentStage] = useState(1);
  const [showHelp, setShowHelp] = useState(true); // Show help by default

  // Stage 1: Voice Selection
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Stage 2: Agent Configuration
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    language: 'en',
    prompt: '',
    firstMessage: 'Hello! How can I help you today?',
    temperature: 0.7,
    maxTokens: 500
  });

  // Stage 3: Knowledge Base
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Stage 4: Test & Deploy
  const [testType, setTestType] = useState(null); // 'call', 'sms', 'email'
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testMessage, setTestMessage] = useState('');

  // Fetch voices
  const { data: voicesData } = useQuery({
    queryKey: ['elevenlabs-voices'],
    queryFn: elevenLabsApi.getVoices
  });

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: elevenLabsApi.createAgent,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['agents']);
      // Move to test stage
      setCurrentStage(4);
    }
  });

  // Upload knowledge base mutation
  const uploadKBMutation = useMutation({
    mutationFn: knowledgeBaseApi.uploadDocument,
    onSuccess: (data) => {
      setKnowledgeBases([...knowledgeBases, data.knowledgeBase]);
      setUploadingFile(false);
    }
  });

  // Add URL to knowledge base
  const addUrlMutation = useMutation({
    mutationFn: (url) => knowledgeBaseApi.create({
      name: `Website: ${url}`,
      type: 'url',
      content: url,
      category: 'website'
    }),
    onSuccess: (data) => {
      setKnowledgeBases([...knowledgeBases, data]);
      setAddingUrl(false);
      setUrlInput('');
    }
  });

  // Test mutations
  const testCallMutation = useMutation({
    mutationFn: agentApi.testCall
  });

  const testSmsMutation = useMutation({
    mutationFn: agentApi.testSms
  });

  const testEmailMutation = useMutation({
    mutationFn: agentApi.testEmail
  });

  const canProceedToNextStage = () => {
    switch (currentStage) {
      case 1:
        return selectedVoice !== null;
      case 2:
        return agentConfig.name && agentConfig.prompt;
      case 3:
        return true; // Optional stage
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStage === 2) {
      // Create agent when moving from config to KB
      await createAgentMutation.mutateAsync({
        name: agentConfig.name,
        voiceId: selectedVoice.voice_id,
        prompt: agentConfig.prompt,
        firstMessage: agentConfig.firstMessage,
        language: agentConfig.language,
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens
      });
    }

    if (currentStage < STAGES.length) {
      setCurrentStage(currentStage + 1);
    }
  };

  const handleBack = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('category', 'agent-knowledge');

    try {
      await uploadKBMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadingFile(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput) return;
    setAddingUrl(true);
    try {
      await addUrlMutation.mutateAsync(urlInput);
    } catch (error) {
      console.error('Add URL failed:', error);
      setAddingUrl(false);
    }
  };

  const handleTest = async () => {
    const agentId = createAgentMutation.data?.agent?.id;
    if (!agentId) return;

    try {
      if (testType === 'call') {
        await testCallMutation.mutateAsync({ agentId, phoneNumber: testPhone });
      } else if (testType === 'sms') {
        await testSmsMutation.mutateAsync({ agentId, phoneNumber: testPhone, testMessage });
      } else if (testType === 'email') {
        await testEmailMutation.mutateAsync({ agentId, email: testEmail, testMessage });
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const handleDeploy = () => {
    // Navigate to agent detail page
    const agentId = createAgentMutation.data?.agent?.id;
    if (agentId) {
      navigate(`/app/agents/${agentId}`);
    }
  };

  const currentStageInfo = STAGES[currentStage - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                🎙️ Agent Studio
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-sm font-normal text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <HelpCircle className="h-4 w-4" />
                  {showHelp ? 'Hide' : 'Show'} Help
                </button>
              </h1>
              <p className="text-muted-foreground mt-1">Create AI voice agents in 4 simple steps</p>
            </div>
            <button
              onClick={() => navigate('/app/agent-studio')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = currentStage === stage.id;
                const isCompleted = currentStage > stage.id;

                return (
                  <div key={stage.id} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                      {/* Circle */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white dark:bg-green-600'
                            : isActive
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:bg-blue-500 dark:ring-blue-900'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                      </div>

                      {/* Label */}
                      <div className="mt-2 text-center">
                        <div
                          className={`text-sm font-medium ${
                            isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          }`}
                        >
                          {stage.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 max-w-[120px]">
                          {stage.description}
                        </div>
                      </div>
                    </div>

                    {/* Connector Line */}
                    {index < STAGES.length - 1 && (
                      <div
                        className={`absolute top-6 left-[60%] w-full h-0.5 -z-10 ${
                          currentStage > stage.id ? 'bg-green-500 dark:bg-green-600' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">{currentStageInfo.name} Help</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">{currentStageInfo.helpText}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-xl shadow-lg p-8">
          {/* Stage 1: Voice Selection */}
          {currentStage === 1 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">Choose Your Agent's Voice</h2>
                <p className="text-muted-foreground mt-2">
                  Select from over 5,000 AI voices across 29 languages. Filter by language, gender, accent, and age.
                  Preview each voice before making your selection.
                </p>
              </div>

              {selectedVoice && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-900">{selectedVoice.name}</div>
                      <div className="text-sm text-green-700">
                        {selectedVoice.labels?.gender} • {selectedVoice.labels?.accent}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVoice(null)}
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Change Voice
                  </button>
                </div>
              )}

              <VoiceLibraryBrowser
                embedded={true}
                onVoiceSelect={(voice) => setSelectedVoice(voice)}
                voices={voicesData?.voices || []}
              />
            </div>
          )}

          {/* Stage 2: Agent Configuration */}
          {currentStage === 2 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">Configure Your Agent</h2>
                <p className="text-muted-foreground mt-2">
                  Define your agent's personality, behavior, and language capabilities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agent Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Agent Name *
                    <span className="text-gray-500 font-normal ml-2">
                      (e.g., "Customer Support Agent", "Sales Assistant")
                    </span>
                  </label>
                  <input
                    type="text"
                    value={agentConfig.name}
                    onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
                    placeholder="Enter agent name"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Primary Language */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Primary Language *
                    <span className="text-gray-500 font-normal ml-2">
                      (Auto-detects all 29 languages)
                    </span>
                  </label>
                  <select
                    value={agentConfig.language}
                    onChange={(e) => setAgentConfig({ ...agentConfig, language: e.target.value })}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="de">🇩🇪 German</option>
                    <option value="it">🇮🇹 Italian</option>
                    <option value="pt">🇵🇹 Portuguese</option>
                    <option value="pl">🇵🇱 Polish</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="ja">🇯🇵 Japanese</option>
                    <option value="zh">🇨🇳 Chinese</option>
                    <option value="ko">🇰🇷 Korean</option>
                    <option value="nl">🇳🇱 Dutch</option>
                    <option value="tr">🇹🇷 Turkish</option>
                    <option value="sv">🇸🇪 Swedish</option>
                    <option value="id">🇮🇩 Indonesian</option>
                    <option value="fil">🇵🇭 Filipino</option>
                    <option value="uk">🇺🇦 Ukrainian</option>
                    <option value="el">🇬🇷 Greek</option>
                    <option value="cs">🇨🇿 Czech</option>
                    <option value="ro">🇷🇴 Romanian</option>
                    <option value="da">🇩🇰 Danish</option>
                    <option value="bg">🇧🇬 Bulgarian</option>
                    <option value="ms">🇲🇾 Malay</option>
                    <option value="sk">🇸🇰 Slovak</option>
                    <option value="ar">🇸🇦 Arabic</option>
                    <option value="ta">🇮🇳 Tamil</option>
                    <option value="fi">🇫🇮 Finnish</option>
                    <option value="ru">🇷🇺 Russian</option>
                    <option value="no">🇳🇴 Norwegian</option>
                  </select>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  System Prompt (Instructions) *
                  <span className="text-gray-500 font-normal ml-2">
                    (Tell your agent how to behave and what to do)
                  </span>
                </label>
                <textarea
                  value={agentConfig.prompt}
                  onChange={(e) => setAgentConfig({ ...agentConfig, prompt: e.target.value })}
                  rows={8}
                  placeholder="Example: You are a friendly customer support agent for Acme Corp. Your role is to help customers with product questions, order status, and returns. Always be polite, helpful, and professional. If you don't know something, offer to connect them with a specialist."
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>Pro Tip:</strong> Be specific about your agent's role, tone, and capabilities.
                      Include instructions for handling common scenarios and edge cases.
                    </div>
                  </div>
                </div>
              </div>

              {/* First Message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Message (Greeting)
                  <span className="text-gray-500 font-normal ml-2">
                    (What your agent says first)
                  </span>
                </label>
                <input
                  type="text"
                  value={agentConfig.firstMessage}
                  onChange={(e) => setAgentConfig({ ...agentConfig, firstMessage: e.target.value })}
                  placeholder="Hello! How can I help you today?"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Advanced Settings */}
              <details className="border border-border rounded-lg p-4">
                <summary className="font-semibold text-foreground cursor-pointer">
                  Advanced Settings (Optional)
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Temperature: {agentConfig.temperature}
                      <span className="text-gray-500 font-normal ml-2">
                        (0 = focused, 1 = creative)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={agentConfig.temperature}
                      onChange={(e) => setAgentConfig({ ...agentConfig, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Tokens: {agentConfig.maxTokens}
                      <span className="text-gray-500 font-normal ml-2">
                        (Response length limit)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={agentConfig.maxTokens}
                      onChange={(e) => setAgentConfig({ ...agentConfig, maxTokens: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Stage 3: Knowledge Base */}
          {currentStage === 3 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">Add Knowledge & Data Sources</h2>
                <p className="text-muted-foreground mt-2">
                  Upload documents, add website URLs, or connect data sources to give your agent context.
                  This is optional but highly recommended for better responses.
                </p>
              </div>

              {/* Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Upload Documents */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-blue-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground text-center mb-2">Upload Documents</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    PDFs, Word docs, spreadsheets, price lists
                  </p>
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <div className="px-4 py-2 bg-blue-600 text-white rounded-lg text-center cursor-pointer hover:bg-blue-700">
                      {uploadingFile ? 'Uploading...' : 'Choose File'}
                    </div>
                  </label>
                </div>

                {/* Add Website URL */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-blue-400 transition-colors">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground text-center mb-2">Add Website</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Scrape content from any public website
                  </p>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-2"
                  />
                  <button
                    onClick={handleAddUrl}
                    disabled={!urlInput || addingUrl}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingUrl ? 'Adding...' : 'Add URL'}
                  </button>
                </div>

                {/* Import Google Sheets */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-blue-400 transition-colors">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground text-center mb-2">Google Sheets</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Import data from Google Sheets
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700">
                    Connect Sheets
                  </button>
                </div>
              </div>

              {/* Uploaded Knowledge Bases */}
              {knowledgeBases.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    Added Knowledge Bases ({knowledgeBases.length})
                  </h3>
                  <div className="space-y-2">
                    {knowledgeBases.map((kb, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted dark:bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium text-foreground">{kb.name}</div>
                            <div className="text-sm text-gray-500">{kb.type}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setKnowledgeBases(knowledgeBases.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>How it works:</strong> Your agent will use this knowledge to answer questions.
                    For example, if you upload a price list, your agent can quote prices. If you add your
                    company website, it can answer questions about your products and services.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 4: Test & Deploy */}
          {currentStage === 4 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">Test & Deploy Your Agent</h2>
                <p className="text-muted-foreground mt-2">
                  Test your agent with a live call, SMS, or email before deploying to production.
                </p>
              </div>

              {/* Agent Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-4">Agent Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium text-foreground">{agentConfig.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Voice</div>
                    <div className="font-medium text-foreground">{selectedVoice?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Language</div>
                    <div className="font-medium text-foreground">{agentConfig.language.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Knowledge Bases</div>
                    <div className="font-medium text-foreground">{knowledgeBases.length} added</div>
                  </div>
                </div>
              </div>

              {/* Test Options */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Test Your Agent</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setTestType('call')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      testType === 'call'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <Phone className="h-8 w-8 text-blue-600 mb-2" />
                    <div className="font-semibold text-foreground">Test Call</div>
                    <div className="text-sm text-muted-foreground">Receive a live test call</div>
                  </button>

                  <button
                    onClick={() => setTestType('sms')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      testType === 'sms'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <MessageSquare className="h-8 w-8 text-blue-600 mb-2" />
                    <div className="font-semibold text-foreground">Test SMS</div>
                    <div className="text-sm text-muted-foreground">Send a test text message</div>
                  </button>

                  <button
                    onClick={() => setTestType('email')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      testType === 'email'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <Mail className="h-8 w-8 text-blue-600 mb-2" />
                    <div className="font-semibold text-foreground">Test Email</div>
                    <div className="text-sm text-muted-foreground">Send a test email</div>
                  </button>
                </div>

                {/* Test Form */}
                {testType && (
                  <div className="mt-6 p-6 bg-muted dark:bg-muted rounded-lg">
                    {testType === 'call' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Your Phone Number
                          </label>
                          <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className="w-full px-4 py-2 border border-border rounded-lg"
                          />
                        </div>
                        <button
                          onClick={handleTest}
                          disabled={!testPhone || testCallMutation.isPending}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {testCallMutation.isPending ? (
                            <>
                              <Loader className="h-5 w-5 animate-spin" />
                              Calling...
                            </>
                          ) : (
                            <>
                              <Phone className="h-5 w-5" />
                              Call Me Now
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {testType === 'sms' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Your Phone Number
                          </label>
                          <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className="w-full px-4 py-2 border border-border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Test Message
                          </label>
                          <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Hello, this is a test message"
                            rows={3}
                            className="w-full px-4 py-2 border border-border rounded-lg"
                          />
                        </div>
                        <button
                          onClick={handleTest}
                          disabled={!testPhone || testSmsMutation.isPending}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {testSmsMutation.isPending ? (
                            <>
                              <Loader className="h-5 w-5 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-5 w-5" />
                              Send Test SMS
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {testType === 'email' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Your Email
                          </label>
                          <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-2 border border-border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Test Message
                          </label>
                          <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Hello, this is a test email"
                            rows={3}
                            className="w-full px-4 py-2 border border-border rounded-lg"
                          />
                        </div>
                        <button
                          onClick={handleTest}
                          disabled={!testEmail || testEmailMutation.isPending}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {testEmailMutation.isPending ? (
                            <>
                              <Loader className="h-5 w-5 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="h-5 w-5" />
                              Send Test Email
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t">
            <button
              onClick={handleBack}
              disabled={currentStage === 1}
              className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>

            <div className="text-sm text-muted-foreground">
              Step {currentStage} of {STAGES.length}
            </div>

            {currentStage < STAGES.length ? (
              <button
                onClick={handleNext}
                disabled={!canProceedToNextStage() || createAgentMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createAgentMutation.isPending ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Creating Agent...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold"
              >
                <Check className="h-5 w-5" />
                Deploy Agent
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
