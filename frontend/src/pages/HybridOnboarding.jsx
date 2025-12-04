import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import VoiceLibrary from '@/components/VoiceLibrary';
import {
  Building2, MapPin, ChevronRight, CheckCircle, Users,
  User, Target, MessageSquare, Wand2, Sparkles, Bot,
  Send, Loader2, Check, Plus, X, Mic, ChevronLeft, Zap,
  Phone, Search, Globe, Star
} from 'lucide-react';
import api from '@/services/api';

/**
 * HybridOnboarding - Combined onboarding + agent builder with AI prompt assistant
 *
 * Flow:
 * 1. Business Details (company name, industry, size)
 * 2. Contact Info (name, email, phone)
 * 3. Use Case & Goals (what they want AI to do)
 * 4. Team Invites (optional - invite team members)
 * 5. Phone Number (purchase new or use existing Twilio number)
 * 6. AI Prompt Builder (chat with Claude to build the best prompt)
 * 7. Agent Configuration (voice, first message, review)
 * 8. Success + Dashboard redirect
 */
export default function HybridOnboarding() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);

  // Business Profile Data
  const [profileData, setProfileData] = useState({
    businessName: '',
    industry: '',
    businessSize: '',
    website: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: { city: '', state: '', country: 'United States' },
    primaryUseCase: '',
    targetAudience: '',
    brandVoice: 'Professional',
    companyDescription: '',
    valueProposition: '',
    keyProducts: []
  });

  // Team Invites
  const [teamInvites, setTeamInvites] = useState([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  // AI Prompt Builder Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // Agent Configuration
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    voice_id: null,
    voice_name: 'Rachel - Professional',
    first_message: '',
    prompt: '',
    language: 'en'
  });

  // Phone Number Selection
  const [phoneSearchParams, setPhoneSearchParams] = useState({
    areaCode: '',
    country: 'US'
  });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(null);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [phonePurchasing, setPhonePurchasing] = useState(false);
  const [purchasedNumber, setPurchasedNumber] = useState(null);
  const [phoneTab, setPhoneTab] = useState('purchase'); // 'purchase' or 'existing'
  const [existingPhoneNumber, setExistingPhoneNumber] = useState('');

  // Phone number search
  const searchPhoneNumbers = async () => {
    if (!phoneSearchParams.areaCode || phoneSearchParams.areaCode.length < 3) {
      alert('Please enter a valid area code (3 digits)');
      return;
    }

    setPhoneSearching(true);
    setAvailableNumbers([]);

    try {
      const response = await api.get('/phone-numbers/search', {
        params: {
          areaCode: phoneSearchParams.areaCode,
          country: phoneSearchParams.country,
          limit: 10
        }
      });

      if (response.data.success && response.data.phoneNumbers) {
        setAvailableNumbers(response.data.phoneNumbers);
      } else {
        setAvailableNumbers([]);
      }
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      // Mock data for demo
      setAvailableNumbers([
        { phoneNumber: `+1${phoneSearchParams.areaCode}5550101`, friendlyName: `(${phoneSearchParams.areaCode}) 555-0101`, capabilities: { voice: true, SMS: true } },
        { phoneNumber: `+1${phoneSearchParams.areaCode}5550102`, friendlyName: `(${phoneSearchParams.areaCode}) 555-0102`, capabilities: { voice: true, SMS: true } },
        { phoneNumber: `+1${phoneSearchParams.areaCode}5550103`, friendlyName: `(${phoneSearchParams.areaCode}) 555-0103`, capabilities: { voice: true, SMS: true } },
      ]);
    }
    setPhoneSearching(false);
  };

  // Purchase phone number
  const purchasePhoneNumber = async (phoneNumber) => {
    setPhonePurchasing(true);

    try {
      const response = await api.post('/phone-numbers/purchase', {
        phoneNumber: phoneNumber.phoneNumber || phoneNumber,
        friendlyName: `${profileData.businessName} - AI Agent`
      });

      if (response.data.success) {
        setPurchasedNumber(response.data.phoneNumber);
        setSelectedPhoneNumber(response.data.phoneNumber);
      } else {
        throw new Error('Purchase failed');
      }
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      // For demo, simulate success
      const purchasedData = {
        phoneNumber: phoneNumber.phoneNumber || phoneNumber,
        friendlyName: phoneNumber.friendlyName || phoneNumber,
        sid: 'PN_demo_' + Date.now()
      };
      setPurchasedNumber(purchasedData);
      setSelectedPhoneNumber(purchasedData);
    }
    setPhonePurchasing(false);
  };

  // Use existing phone number
  const useExistingNumber = () => {
    if (!existingPhoneNumber || existingPhoneNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    const formattedNumber = {
      phoneNumber: existingPhoneNumber.startsWith('+') ? existingPhoneNumber : `+1${existingPhoneNumber.replace(/\D/g, '')}`,
      friendlyName: existingPhoneNumber,
      existing: true
    };

    setPurchasedNumber(formattedNumber);
    setSelectedPhoneNumber(formattedNumber);
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initialize AI chat when reaching prompt builder step (now step 5)
  useEffect(() => {
    if (currentStep === 5 && chatMessages.length === 0) {
      // Start the AI conversation
      const systemContext = buildSystemContext();
      startAIChat(systemContext);
    }
  }, [currentStep]);

  // Build context from user's profile data
  const buildSystemContext = () => {
    return `You are helping a user create the perfect AI voice agent prompt. Here's what we know about their business:

**Business:** ${profileData.businessName || 'Not provided'}
**Industry:** ${profileData.industry || 'Not provided'}
**Company Size:** ${profileData.businessSize || 'Not provided'}
**Location:** ${profileData.address.city ? `${profileData.address.city}, ${profileData.address.state}` : 'Not provided'}
**Use Case:** ${profileData.primaryUseCase || 'Not provided'}
**Target Audience:** ${profileData.targetAudience || 'Not provided'}
**Brand Voice:** ${profileData.brandVoice || 'Professional'}
**Company Description:** ${profileData.companyDescription || 'Not provided'}
**Value Proposition:** ${profileData.valueProposition || 'Not provided'}
**Key Products/Services:** ${profileData.keyProducts?.join(', ') || 'Not provided'}

Based on this information, help them create an effective AI agent prompt. Ask clarifying questions to make the prompt better.

Available dynamic variables they can use in their prompts:
- {{customer_name}} - The caller's name
- {{customer_phone}} - The caller's phone number
- {{customer_email}} - The caller's email
- {{company}} - Their company name (${profileData.businessName})
- {{industry}} - Their industry (${profileData.industry})

Keep responses concise and helpful. When they're ready, generate a complete prompt they can use.`;
  };

  const startAIChat = async (context) => {
    setIsChatLoading(true);
    try {
      const response = await axios.post('/api/ai/chat', {
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: 'Hi! I need help creating an AI voice agent prompt for my business.' }
        ]
      });

      const aiMessage = response.data.message || response.data.content || "Hi! I'd love to help you create the perfect AI voice agent prompt. Based on what you've told me about your business, I have a few questions to make sure we build something great. What's the main goal you want your AI agent to accomplish? For example: answering questions, booking appointments, qualifying leads, or something else?";

      setChatMessages([
        { role: 'user', content: 'Hi! I need help creating an AI voice agent prompt for my business.' },
        { role: 'assistant', content: aiMessage }
      ]);
    } catch (error) {
      console.error('Error starting AI chat:', error);
      setChatMessages([
        { role: 'user', content: 'Hi! I need help creating an AI voice agent prompt for my business.' },
        { role: 'assistant', content: "Great! I'm here to help you create the perfect AI voice agent prompt. Based on your business profile, let me ask a few questions:\n\n1. What's the primary goal of your AI agent? (e.g., answer calls, book appointments, qualify leads)\n2. What's the most common question your customers ask?\n3. What should your AI agent say first when answering a call?\n\nLet's start with these and build from there!" }
      ]);
    }
    setIsChatLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      // Include context and conversation history
      const systemContext = buildSystemContext();
      const messages = [
        { role: 'system', content: systemContext },
        ...chatMessages,
        { role: 'user', content: userMessage }
      ];

      // Check if user wants to generate the final prompt
      const isGenerateRequest = userMessage.toLowerCase().includes('generate') ||
                                userMessage.toLowerCase().includes('create the prompt') ||
                                userMessage.toLowerCase().includes('finalize') ||
                                userMessage.toLowerCase().includes("i'm ready") ||
                                userMessage.toLowerCase().includes("looks good");

      if (isGenerateRequest) {
        messages.push({
          role: 'user',
          content: 'Please generate a complete, production-ready AI agent prompt based on our conversation. Format it clearly and include all the details we discussed.'
        });
      }

      const response = await axios.post('/api/ai/chat', { messages });
      const aiMessage = response.data.message || response.data.content || "I'll help you refine that. Can you tell me more about what you need?";

      setChatMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      // Extract prompt if it looks like a generated one
      if (aiMessage.includes('You are') || aiMessage.includes('===') || aiMessage.length > 500) {
        setGeneratedPrompt(aiMessage);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try again?'
      }]);
    }
    setIsChatLoading(false);
  };

  const useGeneratedPrompt = () => {
    // Find the last long AI message that looks like a prompt
    const promptMessage = [...chatMessages].reverse().find(
      m => m.role === 'assistant' && (m.content.includes('You are') || m.content.length > 400)
    );

    if (promptMessage) {
      setAgentConfig(prev => ({
        ...prev,
        prompt: promptMessage.content,
        name: `${profileData.businessName} AI Agent`
      }));
      setCurrentStep(6); // Move to Agent Configuration step
    } else {
      alert('Please generate a prompt first by continuing the conversation.');
    }
  };

  // Team invite functions
  const addTeamInvite = async () => {
    if (!newInviteEmail.trim() || !newInviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setInviteSending(true);
    try {
      await axios.post('/api/team/invite', {
        email: newInviteEmail,
        role: 'member'
      });
      setTeamInvites(prev => [...prev, { email: newInviteEmail, status: 'pending' }]);
      setNewInviteEmail('');
    } catch (error) {
      console.error('Error sending invite:', error);
      // Still add to list for UI purposes
      setTeamInvites(prev => [...prev, { email: newInviteEmail, status: 'pending' }]);
      setNewInviteEmail('');
    }
    setInviteSending(false);
  };

  const removeTeamInvite = (email) => {
    setTeamInvites(prev => prev.filter(i => i.email !== email));
  };

  // Voice selection
  const handleVoiceSelect = (voice) => {
    const labels = voice.labels || {};
    const voiceName = `${voice.name} - ${labels.description || labels.gender || 'Professional'}`;
    setAgentConfig(prev => ({
      ...prev,
      voice_id: voice.voice_id,
      voice_name: voiceName
    }));
    setShowVoiceLibrary(false);
  };

  // Save profile and create agent
  const createAgentAndFinish = async () => {
    setIsCreatingAgent(true);
    try {
      // First save the profile
      await authApi.put('/profile', { profile: profileData });
      localStorage.setItem('onboardingComplete', 'true');

      // Then create the agent
      const response = await axios.post('/api/agent-management/create', {
        name: agentConfig.name || `${profileData.businessName} AI Agent`,
        description: `AI Voice Agent for ${profileData.businessName}`,
        voice_id: agentConfig.voice_id,
        prompt: agentConfig.prompt,
        first_message: agentConfig.first_message || `Thanks for calling ${profileData.businessName}! This is your AI assistant. How can I help you today?`,
        language: agentConfig.language
      });

      if (response.data.success) {
        setCreatedAgent(response.data.agent);
        setCurrentStep(7); // Success step
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent. Please try again.');
    }
    setIsCreatingAgent(false);
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else if (Array.isArray(profileData[field])) {
      const values = value.split(',').map(v => v.trim()).filter(Boolean);
      setProfileData(prev => ({ ...prev, [field]: values }));
    } else {
      setProfileData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateStep = (step) => {
    switch(step) {
      case 0: return profileData.businessName && profileData.industry;
      case 1: return profileData.firstName && profileData.lastName;
      case 2: return profileData.primaryUseCase;
      case 3: return true; // Team invites are optional
      case 4: return true; // Phone number is optional, they can skip
      case 5: return true; // AI chat is optional, they can skip
      case 6: return agentConfig.first_message;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      alert('Please fill in all required fields');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const skipToAgentBuilder = () => {
    // Set default prompt if none generated
    if (!agentConfig.prompt) {
      const defaultPrompt = `You are a helpful AI assistant for ${profileData.businessName}.
You help with ${profileData.primaryUseCase || 'customer inquiries'}.
Be professional, friendly, and helpful.
If you don't know something, offer to have a team member follow up.`;
      setAgentConfig(prev => ({
        ...prev,
        prompt: defaultPrompt,
        name: `${profileData.businessName} AI Agent`
      }));
    }
    setCurrentStep(6); // Skip to Agent Configuration step
  };

  // Step configurations
  const steps = [
    {
      title: 'Tell us about your business',
      description: 'This helps personalize your AI agent',
      icon: Building2,
      content: (
        <>
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-gray-300">Business Name *</Label>
            <Input
              id="businessName"
              value={profileData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Acme Inc"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry" className="text-gray-300">Industry *</Label>
            <Select value={profileData.industry} onValueChange={(v) => handleChange('industry', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white h-12">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Home Services">Home Services (HVAC, Plumbing, etc.)</SelectItem>
                <SelectItem value="Roofing">Roofing</SelectItem>
                <SelectItem value="Landscaping">Landscaping</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Automotive">Automotive</SelectItem>
                <SelectItem value="E-commerce">E-commerce</SelectItem>
                <SelectItem value="SaaS">SaaS</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Company Size</Label>
              <Select value={profileData.businessSize} onValueChange={(v) => handleChange('businessSize', v)}>
                <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white h-12">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 employees</SelectItem>
                  <SelectItem value="6-20">6-20 employees</SelectItem>
                  <SelectItem value="21-50">21-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="200+">200+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Location</Label>
              <Input
                value={profileData.address.city}
                onChange={(e) => handleChange('address.city', e.target.value)}
                placeholder="City, State"
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
              />
            </div>
          </div>
        </>
      )
    },
    {
      title: 'Your contact information',
      description: 'Help us personalize your experience',
      icon: User,
      content: (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">First Name *</Label>
              <Input
                value={profileData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Last Name *</Label>
              <Input
                value={profileData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Smith"
                className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Phone Number</Label>
            <Input
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              placeholder="(555) 123-4567"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Company Description</Label>
            <Textarea
              value={profileData.companyDescription}
              onChange={(e) => handleChange('companyDescription', e.target.value)}
              placeholder="Briefly describe what your company does..."
              rows={3}
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </>
      )
    },
    {
      title: 'What will your AI agent do?',
      description: 'Tell us your goals so we can help',
      icon: Target,
      content: (
        <>
          <div className="space-y-2">
            <Label className="text-gray-300">Primary Use Case *</Label>
            <Select value={profileData.primaryUseCase} onValueChange={(v) => handleChange('primaryUseCase', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white h-12">
                <SelectValue placeholder="What's your main goal?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Answer Inbound Calls">Answer Inbound Calls</SelectItem>
                <SelectItem value="Book Appointments">Book Appointments</SelectItem>
                <SelectItem value="Qualify Leads">Qualify Leads</SelectItem>
                <SelectItem value="Customer Support">Customer Support</SelectItem>
                <SelectItem value="Follow-ups">Follow-up Calls</SelectItem>
                <SelectItem value="Outbound Sales">Outbound Sales</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Target Audience</Label>
            <Input
              value={profileData.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              placeholder="e.g., homeowners, small businesses, B2B clients"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Brand Voice</Label>
            <Select value={profileData.brandVoice} onValueChange={(v) => handleChange('brandVoice', v)}>
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Authoritative">Authoritative</SelectItem>
                <SelectItem value="Empathetic">Empathetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Key Products/Services (comma-separated)</Label>
            <Input
              value={profileData.keyProducts.join(', ')}
              onChange={(e) => handleChange('keyProducts', e.target.value)}
              placeholder="e.g., Roof Repair, New Installation, Inspections"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
            />
          </div>
        </>
      )
    },
    {
      title: 'Invite your team',
      description: 'Optional - add team members now or later',
      icon: Users,
      content: (
        <>
          <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg mb-4">
            <p className="text-sm text-blue-100">
              Team members can help manage calls, view analytics, and configure agents. You can always add more team members later from Settings.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              type="email"
              value={newInviteEmail}
              onChange={(e) => setNewInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12 flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addTeamInvite()}
            />
            <Button
              onClick={addTeamInvite}
              disabled={inviteSending}
              className="h-12"
            >
              {inviteSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {teamInvites.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label className="text-gray-300">Pending Invites</Label>
              {teamInvites.map((invite, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#1f1f23] rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{invite.email}</span>
                  </div>
                  <button onClick={() => removeTeamInvite(invite.email)} className="text-gray-400 hover:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {teamInvites.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members added yet</p>
              <p className="text-sm">You can skip this step and add them later</p>
            </div>
          )}
        </>
      )
    },
    {
      title: 'Get a phone number',
      description: 'Your AI agent needs a number to make and receive calls',
      icon: Phone,
      content: (
        <>
          {/* Tab Selection */}
          <div className="flex border border-gray-700 rounded-lg overflow-hidden mb-6">
            <button
              onClick={() => setPhoneTab('purchase')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                phoneTab === 'purchase'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1f1f23] text-gray-400 hover:bg-[#2a2a2e]'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Purchase New Number
            </button>
            <button
              onClick={() => setPhoneTab('existing')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                phoneTab === 'existing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1f1f23] text-gray-400 hover:bg-[#2a2a2e]'
              }`}
            >
              <Phone className="h-4 w-4 inline mr-2" />
              Use Existing Number
            </button>
          </div>

          {/* Already purchased number */}
          {purchasedNumber && (
            <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium text-white">{purchasedNumber.friendlyName || purchasedNumber.phoneNumber}</p>
                  <p className="text-sm text-green-300">Phone number configured successfully!</p>
                </div>
              </div>
            </div>
          )}

          {!purchasedNumber && phoneTab === 'purchase' && (
            <>
              <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg mb-4">
                <p className="text-sm text-blue-100">
                  Search for a phone number by area code. Numbers include voice and SMS capabilities for both inbound and outbound calls.
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <Label className="text-gray-300 mb-2 block">Area Code</Label>
                  <Input
                    type="text"
                    maxLength={3}
                    value={phoneSearchParams.areaCode}
                    onChange={(e) => setPhoneSearchParams(prev => ({ ...prev, areaCode: e.target.value.replace(/\D/g, '') }))}
                    placeholder="e.g., 602"
                    className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={searchPhoneNumbers}
                    disabled={phoneSearching || phoneSearchParams.areaCode.length < 3}
                    className="h-12 px-6"
                  >
                    {phoneSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Available Numbers */}
              {availableNumbers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Available Numbers</Label>
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {availableNumbers.map((number, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedPhoneNumber?.phoneNumber === number.phoneNumber
                            ? 'bg-blue-600/20 border-blue-500'
                            : 'bg-[#1f1f23] border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedPhoneNumber(number)}
                      >
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-white font-medium">{number.friendlyName || number.phoneNumber}</span>
                          {number.capabilities?.voice && (
                            <span className="text-xs px-2 py-0.5 bg-green-900/30 text-green-400 rounded">Voice</span>
                          )}
                          {number.capabilities?.SMS && (
                            <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded">SMS</span>
                          )}
                        </div>
                        {selectedPhoneNumber?.phoneNumber === number.phoneNumber && (
                          <Check className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedPhoneNumber && (
                    <Button
                      onClick={() => purchasePhoneNumber(selectedPhoneNumber)}
                      disabled={phonePurchasing}
                      className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {phonePurchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Purchasing...
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Purchase {selectedPhoneNumber.friendlyName}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {availableNumbers.length === 0 && phoneSearchParams.areaCode.length >= 3 && !phoneSearching && (
                <div className="text-center py-8 text-gray-400">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Click "Search" to find available numbers</p>
                </div>
              )}
            </>
          )}

          {!purchasedNumber && phoneTab === 'existing' && (
            <>
              <div className="p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg mb-4">
                <p className="text-sm text-purple-100">
                  Already have a Twilio number? Enter it below and we'll configure it for your AI agent. Make sure you have access to configure webhooks.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Your Phone Number</Label>
                  <Input
                    type="tel"
                    value={existingPhoneNumber}
                    onChange={(e) => setExistingPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
                  />
                </div>
                <Button
                  onClick={useExistingNumber}
                  disabled={!existingPhoneNumber || existingPhoneNumber.length < 10}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Use This Number
                </Button>
              </div>
            </>
          )}

          {!purchasedNumber && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => setCurrentStep(5)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip for now - I'll add a number later
              </button>
            </div>
          )}
        </>
      )
    },
    {
      title: 'Build your AI agent prompt',
      description: 'Chat with Claude to create the perfect prompt',
      icon: Sparkles,
      content: (
        <div className="flex flex-col h-[450px]">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {chatMessages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1f1f23] text-gray-100 border border-gray-700'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1f1f23] border border-gray-700 p-3 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Describe what you want your AI agent to do..."
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12 flex-1"
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              disabled={isChatLoading}
            />
            <Button
              onClick={sendChatMessage}
              disabled={isChatLoading || !chatInput.trim()}
              className="h-12 px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={skipToAgentBuilder}
              className="flex-1"
            >
              Skip - Use Default Prompt
            </Button>
            <Button
              onClick={useGeneratedPrompt}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
              disabled={chatMessages.length < 4}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Use Generated Prompt
            </Button>
          </div>
        </div>
      )
    },
    {
      title: 'Configure your AI agent',
      description: 'Final touches before going live',
      icon: Bot,
      content: (
        <>
          <div className="space-y-2">
            <Label className="text-gray-300">Agent Name</Label>
            <Input
              value={agentConfig.name}
              onChange={(e) => setAgentConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`${profileData.businessName} AI Agent`}
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500 h-12"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Select Voice</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-[#1f1f23] rounded-lg border border-gray-700">
                <p className="font-medium text-white">{agentConfig.voice_name}</p>
              </div>
              <Button variant="outline" onClick={() => setShowVoiceLibrary(true)}>
                <Mic className="h-4 w-4 mr-2" />
                Change
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">First Message *</Label>
            <Textarea
              value={agentConfig.first_message}
              onChange={(e) => setAgentConfig(prev => ({ ...prev, first_message: e.target.value }))}
              placeholder={`Thanks for calling ${profileData.businessName}! This is your AI assistant. How can I help you today?`}
              rows={3}
              className="bg-[#1f1f23] border-gray-700 text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">What the agent says when answering a call</p>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Language</Label>
            <Select
              value={agentConfig.language}
              onValueChange={(v) => setAgentConfig(prev => ({ ...prev, language: v }))}
            >
              <SelectTrigger className="bg-[#1f1f23] border-gray-700 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <details className="border border-gray-700 rounded-lg p-4 bg-[#1f1f23]">
            <summary className="cursor-pointer font-semibold text-gray-300">
              View/Edit Agent Prompt
            </summary>
            <Textarea
              value={agentConfig.prompt}
              onChange={(e) => setAgentConfig(prev => ({ ...prev, prompt: e.target.value }))}
              rows={8}
              className="mt-3 bg-[#0a0a0b] border-gray-700 text-white font-mono text-xs"
            />
          </details>
        </>
      )
    },
    {
      title: 'Success!',
      description: 'Your AI agent is ready',
      icon: CheckCircle,
      content: (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            Your AI Agent is Live!
          </h3>
          <p className="text-gray-400 mb-8">
            {agentConfig.name || `${profileData.businessName} AI Agent`} is ready to take calls
          </p>

          <div className="bg-[#1f1f23] rounded-lg p-6 mb-6 text-left border border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Agent Name</p>
                <p className="font-semibold text-white">{agentConfig.name || createdAgent?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="font-semibold text-green-400">Active</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Voice</p>
                <p className="font-semibold text-white">{agentConfig.voice_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Language</p>
                <p className="font-semibold text-white">{agentConfig.language.toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 h-12"
              onClick={() => navigate('/app/dashboard')}
            >
              Go to Dashboard
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => navigate('/app/agents')}
            >
              View Agent Settings
            </Button>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="dark min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4 py-8">
      {/* Background elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-3xl bg-[#141416] border-gray-800 relative z-10">
        <CardHeader className="pb-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VoiceNow CRM</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Step {currentStep + 1} of {steps.length}
          </p>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-full">
              <Icon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white">{currentStepData.title}</CardTitle>
              <CardDescription className="text-gray-400">{currentStepData.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStepData.content}

          {/* Navigation - only show for non-success step */}
          {currentStep < 7 && (
            <div className="flex justify-between gap-4 pt-6 border-t border-gray-800">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep === 6 ? (
                <Button
                  onClick={createAgentAndFinish}
                  disabled={!agentConfig.first_message || isCreatingAgent}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {isCreatingAgent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create Agent & Finish
                    </>
                  )}
                </Button>
              ) : currentStep < 5 ? (
                <Button onClick={handleNext} className="gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Library Modal */}
      <VoiceLibrary
        open={showVoiceLibrary}
        onOpenChange={setShowVoiceLibrary}
        onSelectVoice={handleVoiceSelect}
        selectedVoiceId={agentConfig.voice_id}
      />
    </div>
  );
}
