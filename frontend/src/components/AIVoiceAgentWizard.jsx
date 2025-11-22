import { useState, useRef } from 'react';
import { X, Wand2, Mic, Phone, Bot, ChevronRight, Sparkles, Check, Search, Filter, Play, Sliders, Upload, MessageSquare, Brain, Book, Zap, Star, Trash2, Copy, RefreshCw, Music } from 'lucide-react';
import api from '../services/api';
import VoiceLibraryBrowser from './VoiceLibraryBrowser';

const AGENT_TEMPLATES = [
  // Sales & Business
  {
    id: 'sales-outbound',
    name: 'Sales Outbound',
    icon: '📞',
    category: 'Sales',
    description: 'Cold calling, lead qualification, appointment setting',
    prompt: 'You are a friendly and professional sales representative making outbound calls to qualify leads and schedule appointments. Ask qualifying questions, handle objections gracefully, and focus on setting up meetings.',
  },
  {
    id: 'sales-followup',
    name: 'Sales Follow-up',
    icon: '🔄',
    category: 'Sales',
    description: 'Follow up with prospects and customers',
    prompt: 'You are following up with a prospect who showed interest. Be persistent but respectful, remind them of the value proposition, and work to move them forward in the sales process.',
  },
  {
    id: 'demo-scheduler',
    name: 'Demo Scheduler',
    icon: '🎯',
    category: 'Sales',
    description: 'Schedule product demos and presentations',
    prompt: 'You are scheduling product demonstrations. Confirm the prospect\'s needs, suggest optimal demo times, and ensure they know what to expect from the demonstration.',
  },

  // Customer Service
  {
    id: 'customer-support',
    name: 'Customer Support',
    icon: '🎧',
    category: 'Support',
    description: 'Handle customer inquiries, resolve issues, provide assistance',
    prompt: 'You are a helpful customer support agent assisting customers with their questions and concerns. Listen carefully, show empathy, and provide clear solutions.',
  },
  {
    id: 'technical-support',
    name: 'Technical Support',
    icon: '🔧',
    category: 'Support',
    description: 'Troubleshoot technical issues',
    prompt: 'You are a technical support specialist. Guide customers through troubleshooting steps, explain technical concepts clearly, and escalate complex issues when needed.',
  },
  {
    id: 'order-status',
    name: 'Order Status',
    icon: '📦',
    category: 'Support',
    description: 'Check order status and delivery updates',
    prompt: 'You help customers check their order status and delivery information. Be patient, verify order details, and provide accurate shipping updates.',
  },

  // Appointments & Scheduling
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    icon: '📅',
    category: 'Appointments',
    description: 'Automated appointment confirmations and reminders',
    prompt: 'You are calling to confirm an upcoming appointment and ensure the customer has all necessary information. Be concise and helpful.',
  },
  {
    id: 'appointment-booking',
    name: 'Appointment Booking',
    icon: '📝',
    category: 'Appointments',
    description: 'Book new appointments and schedule services',
    prompt: 'You help customers book appointments. Ask about their needs, check availability, and confirm all appointment details.',
  },
  {
    id: 'rescheduling',
    name: 'Rescheduling Agent',
    icon: '🔁',
    category: 'Appointments',
    description: 'Handle appointment changes and cancellations',
    prompt: 'You assist with rescheduling or canceling appointments. Be flexible, offer alternative times, and ensure smooth rebooking.',
  },

  // Financial Services
  {
    id: 'collections',
    name: 'Collections',
    icon: '💰',
    category: 'Financial',
    description: 'Payment reminders and collection calls',
    prompt: 'You are a professional collections agent making courteous payment reminder calls. Be firm but respectful, offer payment options, and document all conversations.',
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    icon: '💳',
    category: 'Financial',
    description: 'Friendly payment due date reminders',
    prompt: 'You remind customers about upcoming payment due dates. Be friendly and helpful, offer payment methods, and assist with any questions.',
  },
  {
    id: 'invoice-followup',
    name: 'Invoice Follow-up',
    icon: '📋',
    category: 'Financial',
    description: 'Follow up on unpaid invoices',
    prompt: 'You follow up on outstanding invoices. Verify receipt, address any billing questions, and facilitate prompt payment.',
  },

  // Marketing & Research
  {
    id: 'survey',
    name: 'Survey & Feedback',
    icon: '📊',
    category: 'Marketing',
    description: 'Conduct surveys and gather customer feedback',
    prompt: 'You are conducting a brief survey to gather valuable customer feedback. Be respectful of their time, ask clear questions, and thank them for participation.',
  },
  {
    id: 'lead-nurturing',
    name: 'Lead Nurturing',
    icon: '🌱',
    category: 'Marketing',
    description: 'Nurture leads with valuable information',
    prompt: 'You nurture leads by providing valuable information and building relationships. Share relevant content, answer questions, and gently guide toward conversion.',
  },
  {
    id: 'market-research',
    name: 'Market Research',
    icon: '🔍',
    category: 'Marketing',
    description: 'Conduct market research calls',
    prompt: 'You conduct market research interviews. Ask targeted questions, gather insights, and maintain a professional, neutral tone.',
  },

  // Industry-Specific
  {
    id: 'hvac-scheduling',
    name: 'HVAC Scheduling',
    icon: '❄️',
    category: 'Home Services',
    description: 'Schedule HVAC service appointments',
    prompt: 'You are an HVAC scheduling assistant helping customers book service appointments for heating, cooling, and maintenance needs.',
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: '🏠',
    category: 'Real Estate',
    description: 'Property inquiries, showing scheduling, lead qualification',
    prompt: 'You are a real estate assistant helping potential buyers and sellers with property inquiries, scheduling showings, and qualifying leads.',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    category: 'Healthcare',
    description: 'Appointment scheduling and patient follow-up',
    prompt: 'You are a healthcare scheduling assistant. Handle appointment bookings with sensitivity, verify insurance information, and provide pre-visit instructions.',
  },
  {
    id: 'legal-intake',
    name: 'Legal Intake',
    icon: '⚖️',
    category: 'Legal',
    description: 'Initial client intake and case screening',
    prompt: 'You conduct initial client intake for a law firm. Gather case details professionally, assess urgency, and schedule consultations while maintaining confidentiality.',
  },
  {
    id: 'automotive',
    name: 'Automotive Service',
    icon: '🚗',
    category: 'Automotive',
    description: 'Service appointments and recalls',
    prompt: 'You help customers schedule automotive service appointments and notify them about recalls. Explain service needs and answer maintenance questions.',
  },
  {
    id: 'restaurant-reservations',
    name: 'Restaurant Reservations',
    icon: '🍽️',
    category: 'Hospitality',
    description: 'Take and manage restaurant reservations',
    prompt: 'You handle restaurant reservations. Confirm party size, special requests, and dietary restrictions while providing excellent hospitality.',
  },
  {
    id: 'hotel-concierge',
    name: 'Hotel Concierge',
    icon: '🏨',
    category: 'Hospitality',
    description: 'Guest services and recommendations',
    prompt: 'You are a hotel concierge assisting guests with reservations, recommendations, and special requests. Be knowledgeable and accommodating.',
  },

  // Custom
  {
    id: 'manual',
    name: 'Manual Builder',
    icon: '🛠️',
    category: 'Custom',
    description: 'Build a custom agent from scratch with AI assistance',
    prompt: '',
  },
];

const AGENT_CATEGORIES = ['All', 'Sales', 'Support', 'Appointments', 'Financial', 'Marketing', 'Home Services', 'Real Estate', 'Healthcare', 'Legal', 'Automotive', 'Hospitality', 'Custom'];

// Comprehensive ElevenLabs voice library
const ELEVENLABS_VOICES = [
  // Professional Voices
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Warm & Professional', category: 'Professional', description: 'Perfect for business and customer service' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Confident & Friendly', category: 'Professional', description: 'Great for sales and presentations' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Deep & Authoritative', category: 'Professional', description: 'Ideal for serious business communications' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'Male', accent: 'American', age: 'Middle Aged', tone: 'Crisp & Professional', category: 'Professional', description: 'Corporate and professional tone' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Male', accent: 'American', age: 'Senior', tone: 'Trustworthy & Mature', category: 'Professional', description: 'Experienced and reliable' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Steady & Professional', category: 'Professional', description: 'Balanced professional voice' },

  // Friendly & Warm Voices
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Soft & Gentle', category: 'Friendly', description: 'Caring and approachable' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Upbeat & Cheerful', category: 'Friendly', description: 'Energetic and positive' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'Male', accent: 'American', age: 'Young Adult', tone: 'Young & Energetic', category: 'Friendly', description: 'Youthful and engaging' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Bright & Enthusiastic', category: 'Friendly', description: 'Vibrant and welcoming' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'Female', accent: 'British', age: 'Senior', tone: 'Warm & Grandmotherly', category: 'Friendly', description: 'Comforting and kind' },
  { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', gender: 'Male', accent: 'American', age: 'Middle Aged', tone: 'Friendly & Casual', category: 'Friendly', description: 'Relaxed and personable' },

  // Authoritative & Commanding
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'British', age: 'Adult', tone: 'Authoritative & Deep', category: 'Authoritative', description: 'Commanding presence' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Male', accent: 'Australian', age: 'Adult', tone: 'Strong & Confident', category: 'Authoritative', description: 'Bold and assertive' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', accent: 'British', age: 'Adult', tone: 'Professional & Poised', category: 'Authoritative', description: 'Sophisticated and confident' },
  { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Commanding & Direct', category: 'Authoritative', description: 'Strong leadership voice' },

  // Conversational & Natural
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Natural & Conversational', category: 'Conversational', description: 'Everyday friendly conversation' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', gender: 'Male', accent: 'British', age: 'Young Adult', tone: 'Casual & Relatable', category: 'Conversational', description: 'Down-to-earth and genuine' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male', accent: 'American', age: 'Young Adult', tone: 'Easy-going & Natural', category: 'Conversational', description: 'Approachable conversationalist' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female', accent: 'American', age: 'Adult', tone: 'Warm & Natural', category: 'Conversational', description: 'Authentic and relatable' },

  // Expressive & Dynamic
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', gender: 'Male', accent: 'American', age: 'Young Adult', tone: 'Expressive & Versatile', category: 'Expressive', description: 'Wide emotional range' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Dynamic & Engaging', category: 'Expressive', description: 'Animated and lively' },
  { id: 'z9fAnlkpzviPz146aGWa', name: 'Glinda', gender: 'Female', accent: 'American', age: 'Adult', tone: 'Dramatic & Expressive', category: 'Expressive', description: 'Theatrical and captivating' },
  { id: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy', gender: 'Male', accent: 'Irish', age: 'Young Adult', tone: 'Charismatic & Lively', category: 'Expressive', description: 'Energetic storyteller' },

  // International Accents
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Versatile & Clear', category: 'International', description: 'Neutral and adaptable' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Female', accent: 'American', age: 'Adult', tone: 'Upbeat & International', category: 'International', description: 'Global appeal' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Youthful & Modern', category: 'International', description: 'Contemporary and fresh' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Serena', gender: 'Female', accent: 'American', age: 'Adult', tone: 'Smooth & Sophisticated', category: 'International', description: 'Elegant multilingual' },

  // Specialized
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female', accent: 'American', age: 'Young Adult', tone: 'Professional & Friendly', category: 'Specialized', description: 'Customer service expert' },
  { id: 'flq6f7yk4E4fJM5XTYuZ', name: 'Michael', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Authoritative & Calm', category: 'Specialized', description: 'Financial and legal' },
  { id: 'Zlb1dXrM653N07WRdFW3', name: 'Joseph', gender: 'Male', accent: 'British', age: 'Middle Aged', tone: 'Refined & Articulate', category: 'Specialized', description: 'Educational content' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Trustworthy & Steady', category: 'Specialized', description: 'Healthcare and wellness' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British', age: 'Young Adult', tone: 'Bright & Clear', category: 'Specialized', description: 'Tech and tutorials' },
  { id: 'D38z5RcWu1voky8WS1ja', name: 'Ethan', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Motivational & Inspiring', category: 'Specialized', description: 'Coaching and training' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Sarah', gender: 'Female', accent: 'American', age: 'Adult', tone: 'Empathetic & Caring', category: 'Specialized', description: 'Support and counseling' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Male', accent: 'American', age: 'Adult', tone: 'Enthusiastic & Motivating', category: 'Specialized', description: 'Sales and marketing' },

  // Mature & Distinguished
  { id: 'o7lPjDgzlF8ZloHzVPeK', name: 'James', gender: 'Male', accent: 'Australian', age: 'Senior', tone: 'Distinguished & Wise', category: 'Mature', description: 'Executive and advisory' },
  { id: 'zrHiDhphv9ZnVXBqCLjz', name: 'Clyde', gender: 'Male', accent: 'American', age: 'Senior', tone: 'Grandfatherly & Warm', category: 'Mature', description: 'Experienced mentor' },
  { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole', gender: 'Female', accent: 'American', age: 'Middle Aged', tone: 'Mature & Professional', category: 'Mature', description: 'Executive leadership' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'George', gender: 'Male', accent: 'British', age: 'Senior', tone: 'Wise & Authoritative', category: 'Mature', description: 'Expert advisor' },
];

const VOICE_CATEGORIES = ['All', 'Professional', 'Friendly', 'Authoritative', 'Conversational', 'Expressive', 'International', 'Specialized', 'Mature'];

const VOICE_MODELS = [
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5 (Fastest)', description: 'Ultra-low latency, great for real-time conversations' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2 (Fast)', description: 'Low latency, balanced quality and speed' },
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Best for multiple languages' },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1', description: 'High quality English only' },
];

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', nativeName: 'Türkçe' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', nativeName: 'Suomi' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', nativeName: 'Norsk' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿', nativeName: 'Čeština' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴', nativeName: 'Română' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦', nativeName: 'Українська' },
  { code: 'el', name: 'Greek', flag: '🇬🇷', nativeName: 'Ελληνικά' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷', nativeName: 'Hrvatski' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰', nativeName: 'Slovenčina' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾', nativeName: 'Bahasa Melayu' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
];

export default function AIVoiceAgentWizard({ onClose, onCreate }) {
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  // Voice Source Selection
  const [voiceSource, setVoiceSource] = useState('preset'); // 'preset', 'clone', 'design', 'cloned', 'library'

  // Voice filtering and search
  const [voiceSearch, setVoiceSearch] = useState('');
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Advanced voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 50,
    similarityBoost: 75,
    style: 0,
    useSpeakerBoost: true,
    model: 'eleven_turbo_v2_5'
  });

  // Language Settings
  const [enableLanguageDetection, setEnableLanguageDetection] = useState(true);
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [supportedLanguages, setSupportedLanguages] = useState(['en']);

  // Voice Cloning
  const [cloneName, setCloneName] = useState('');
  const [cloneDescription, setCloneDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [cloneType, setCloneType] = useState('instant'); // 'instant' or 'professional'
  const [cloningInProgress, setCloningInProgress] = useState(false);
  const [clonedVoices, setClonedVoices] = useState([]);

  // Voice Design
  const [designGender, setDesignGender] = useState('female');
  const [designAge, setDesignAge] = useState('young');
  const [designAccent, setDesignAccent] = useState('american');
  const [designDescription, setDesignDescription] = useState('');
  const [generatedVoices, setGeneratedVoices] = useState([]);
  const [generatingVoice, setGeneratingVoice] = useState(false);

  // Knowledge Base & Training
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [trainingExamples, setTrainingExamples] = useState([]);
  const [newExample, setNewExample] = useState({ question: '', response: '' });

  // AI Chat Assistant
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatLoading, setAiChatLoading] = useState(false);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setAgentName(template.name);
    setAgentDescription(template.description);
    setCustomPrompt(template.prompt);

    // If manual builder, show AI chat assistant
    if (template.id === 'manual') {
      setShowAIChat(true);
      setAiChatMessages([{
        role: 'assistant',
        content: "Hi! I'm here to help you build your custom voice agent. What kind of agent do you want to create? Tell me about:\n\n• What should the agent do?\n• Who will it talk to?\n• What's the main goal?\n\nI'll help you create the perfect configuration!"
      }]);
    }
  };

  const filteredTemplates = AGENT_TEMPLATES.filter(template => {
    if (selectedCategory === 'All') return true;
    return template.category === selectedCategory;
  });

  const filteredVoices = ELEVENLABS_VOICES.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                         voice.tone.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                         voice.accent.toLowerCase().includes(voiceSearch.toLowerCase());
    const matchesCategory = selectedVoiceCategory === 'All' || voice.category === selectedVoiceCategory;
    const matchesGender = selectedGender === 'All' || voice.gender === selectedGender;
    return matchesSearch && matchesCategory && matchesGender;
  });

  const handleAIChat = async () => {
    if (!aiChatInput.trim()) return;

    const userMessage = { role: 'user', content: aiChatInput };
    setAiChatMessages([...aiChatMessages, userMessage]);
    setAiChatInput('');
    setAiChatLoading(true);

    try {
      const response = await api.post('/ai/agent-assistant', {
        messages: [...aiChatMessages, userMessage],
        currentConfig: {
          name: agentName,
          description: agentDescription,
          prompt: customPrompt,
          knowledgeBase,
          trainingExamples
        }
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.message
      };

      setAiChatMessages([...aiChatMessages, userMessage, assistantMessage]);

      // Apply suggestions if AI provides them
      if (response.data.suggestions) {
        if (response.data.suggestions.name) setAgentName(response.data.suggestions.name);
        if (response.data.suggestions.description) setAgentDescription(response.data.suggestions.description);
        if (response.data.suggestions.prompt) setCustomPrompt(response.data.suggestions.prompt);
        if (response.data.suggestions.knowledgeBase) setKnowledgeBase(response.data.suggestions.knowledgeBase);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setAiChatMessages([...aiChatMessages, userMessage, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setAiChatLoading(false);
    }
  };

  const addTrainingExample = () => {
    if (newExample.question && newExample.response) {
      setTrainingExamples([...trainingExamples, newExample]);
      setNewExample({ question: '', response: '' });
    }
  };

  const removeTrainingExample = (index) => {
    setTrainingExamples(trainingExamples.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const agentData = {
        name: agentName,
        description: agentDescription,
        prompt: customPrompt,
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        voiceSettings: voiceSettings,
        knowledgeBase: knowledgeBase,
        trainingExamples: trainingExamples,
        languageSettings: {
          enableLanguageDetection,
          primaryLanguage,
          supportedLanguages
        },
        enabled: false,
        type: 'voice',
      };

      const response = await api.post('/agents', agentData);

      if (onCreate) {
        onCreate(response.data);
      }
      onClose();
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewVoice = (voice) => {
    // TODO: Implement voice preview using ElevenLabs API
    alert(`Preview for ${voice.name} - Coming soon!`);
  };

  // Voice Cloning Handlers
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleCloneVoice = async () => {
    if (!cloneName || uploadedFiles.length === 0) {
      alert('Please provide a name and at least one audio file');
      return;
    }

    setCloningInProgress(true);
    try {
      const formData = new FormData();
      formData.append('name', cloneName);
      formData.append('description', cloneDescription);
      formData.append('cloneType', cloneType);

      uploadedFiles.forEach((file, index) => {
        formData.append('files', file);
      });

      const response = await api.post('/elevenlabs/clone-voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newClonedVoice = response.data.voice;
      setClonedVoices([...clonedVoices, newClonedVoice]);
      setSelectedVoice(newClonedVoice);

      // Reset form
      setCloneName('');
      setCloneDescription('');
      setUploadedFiles([]);

      alert(`Voice "${cloneName}" cloned successfully!`);
      setVoiceSource('cloned'); // Switch to cloned voices tab
    } catch (error) {
      console.error('Error cloning voice:', error);
      alert('Failed to clone voice. Please try again.');
    } finally {
      setCloningInProgress(false);
    }
  };

  const handleDeleteClonedVoice = async (voiceId) => {
    if (!confirm('Are you sure you want to delete this cloned voice?')) return;

    try {
      await api.delete(`/elevenlabs/voice/${voiceId}`);
      setClonedVoices(clonedVoices.filter(v => v.id !== voiceId));
      if (selectedVoice?.id === voiceId) {
        setSelectedVoice(ELEVENLABS_VOICES[0]);
      }
      alert('Cloned voice deleted successfully');
    } catch (error) {
      console.error('Error deleting voice:', error);
      alert('Failed to delete voice');
    }
  };

  // Voice Design Handlers
  const handleGenerateVoice = async () => {
    if (!designDescription && designDescription.trim().length < 10) {
      alert('Please provide a detailed description (at least 10 characters)');
      return;
    }

    setGeneratingVoice(true);
    try {
      const response = await api.post('/elevenlabs/generate-voice', {
        description: designDescription,
        gender: designGender,
        age: designAge,
        accent: designAccent
      });

      const generatedVoice = response.data.voice;
      setGeneratedVoices([...generatedVoices, generatedVoice]);
      setSelectedVoice(generatedVoice);

      alert('Voice generated successfully! Preview it below.');
    } catch (error) {
      console.error('Error generating voice:', error);
      alert('Failed to generate voice. Please try again.');
    } finally {
      setGeneratingVoice(false);
    }
  };

  const loadClonedVoices = async () => {
    try {
      const response = await api.get('/elevenlabs/voices');
      setClonedVoices(response.data.voices || []);
    } catch (error) {
      console.error('Error loading cloned voices:', error);
    }
  };

  const toggleLanguage = (langCode) => {
    if (langCode === 'en') return; // English is always required

    if (supportedLanguages.includes(langCode)) {
      setSupportedLanguages(supportedLanguages.filter(code => code !== langCode));
    } else {
      setSupportedLanguages([...supportedLanguages, langCode]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl my-4 md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Wand2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">AI Voice Agent Wizard</h2>
                <p className="text-blue-100 text-sm mt-1">Create intelligent voice agents with advanced customization</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= s ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                } font-bold text-sm`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    step > s ? 'bg-white' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-white/80 mt-2">
            <span>Choose Type</span>
            <span>Configure Voice</span>
            <span>Knowledge & Training</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Step 1: Choose Template */}
          {step === 1 && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Choose Agent Type</h3>
              <p className="text-muted-foreground mb-4">
                Select a pre-built template or use Manual Builder for complete customization
              </p>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                {AGENT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                        : 'border-border hover:border-blue-400'
                    }`}
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold text-foreground text-sm mb-1">
                      {template.name}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    {template.id === 'manual' && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                        <Brain className="w-3 h-3" />
                        <span>AI Assisted</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configure Voice */}
          {step === 2 && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Configure Voice</h3>
              <p className="text-muted-foreground mb-4">
                Choose from preset voices, clone your own, or design a custom voice
              </p>

              {/* Voice Source Tabs */}
              <div className="flex gap-2 mb-6 border-b border-border">
                <button
                  onClick={() => setVoiceSource('preset')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    voiceSource === 'preset'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Preset Voices
                  </div>
                </button>
                <button
                  onClick={() => setVoiceSource('clone')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    voiceSource === 'clone'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Clone Voice
                  </div>
                </button>
                <button
                  onClick={() => setVoiceSource('design')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    voiceSource === 'design'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    Voice Design
                  </div>
                </button>
                <button
                  onClick={() => { setVoiceSource('cloned'); loadClonedVoices(); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    voiceSource === 'cloned'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    My Voices ({clonedVoices.length})
                  </div>
                </button>
                <button
                  onClick={() => setVoiceSource('library')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    voiceSource === 'library'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Voice Library
                  </div>
                </button>
              </div>

              {/* Preset Voices Tab */}
              {voiceSource === 'preset' && (
                <>
                  {/* Voice Search and Filters */}
                  <div className="mb-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-300 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search voices by name, tone, or accent..."
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {VOICE_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedVoiceCategory(category)}
                          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                            selectedVoiceCategory === category
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedGender('All')}
                        className={`px-4 py-1.5 rounded-lg text-xs ${
                          selectedGender === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground'
                        }`}
                      >
                        All Genders
                      </button>
                      <button
                        onClick={() => setSelectedGender('Male')}
                        className={`px-4 py-1.5 rounded-lg text-xs ${
                          selectedGender === 'Male' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground'
                        }`}
                      >
                        Male
                      </button>
                      <button
                        onClick={() => setSelectedGender('Female')}
                        className={`px-4 py-1.5 rounded-lg text-xs ${
                          selectedGender === 'Female' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground'
                        }`}
                      >
                        Female
                      </button>
                    </div>
                  </div>

                  {/* Voice Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-h-96 overflow-y-auto pr-2">
                    {filteredVoices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedVoice?.id === voice.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-border hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">{voice.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-foreground text-sm">{voice.name}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewVoice(voice);
                                }}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                              >
                                <Play className="w-3 h-3 text-blue-600" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {voice.gender} • {voice.accent} • {voice.age}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">{voice.tone}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Voice Cloning Tab */}
              {voiceSource === 'clone' && (
                <div className="space-y-6">
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                      <Copy className="w-5 h-5" />
                      Clone Your Voice
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                      Upload audio samples to create a custom voice clone. For best results, provide clear audio with minimal background noise.
                    </p>
                    <ul className="text-xs text-purple-600 dark:text-purple-400 space-y-1">
                      <li>• Instant Clone: 1-2 minutes of audio, ready in seconds</li>
                      <li>• Professional Clone: 30+ minutes of audio, higher quality</li>
                      <li>• Supported formats: MP3, WAV, M4A, OGG</li>
                    </ul>
                  </div>

                  {/* Clone Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Clone Type
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCloneType('instant')}
                        className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                          cloneType === 'instant'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-border'
                        }`}
                      >
                        <div className="font-semibold text-foreground mb-1">Instant Clone</div>
                        <div className="text-xs text-muted-foreground">1-2 min audio • Fast • Good quality</div>
                      </button>
                      <button
                        onClick={() => setCloneType('professional')}
                        className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                          cloneType === 'professional'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-border'
                        }`}
                      >
                        <div className="font-semibold text-foreground mb-1">Professional Clone</div>
                        <div className="text-xs text-muted-foreground">30+ min audio • Best quality • Premium</div>
                      </button>
                    </div>
                  </div>

                  {/* Voice Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Voice Name *
                    </label>
                    <input
                      type="text"
                      value={cloneName}
                      onChange={(e) => setCloneName(e.target.value)}
                      placeholder="e.g., My Voice, CEO Voice, Brand Voice"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                    />
                  </div>

                  {/* Voice Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={cloneDescription}
                      onChange={(e) => setCloneDescription(e.target.value)}
                      placeholder="Brief description of this voice"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Upload Audio Samples *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-8 border-2 border-dashed border-border rounded-lg hover:border-purple-400 transition-colors flex flex-col items-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                      <span className="text-sm font-medium text-foreground">Click to upload audio files</span>
                      <span className="text-xs text-foreground">MP3, WAV, M4A, OGG</span>
                    </button>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded border border-border">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Mic className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <span className="text-sm text-foreground truncate">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clone Button */}
                  <button
                    onClick={handleCloneVoice}
                    disabled={!cloneName || uploadedFiles.length === 0 || cloningInProgress}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {cloningInProgress ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Cloning Voice...
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Clone Voice
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Voice Design Tab */}
              {voiceSource === 'design' && (
                <div className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                      <Wand2 className="w-5 h-5" />
                      AI Voice Design
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Describe your ideal voice and let AI generate it for you. Customize attributes like age, gender, and accent for the perfect match.
                    </p>
                  </div>

                  {/* Voice Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Voice Description *
                    </label>
                    <textarea
                      value={designDescription}
                      onChange={(e) => setDesignDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe the voice you want... e.g., 'A warm, friendly female voice with a slight British accent, sounding confident but approachable, mid-30s age range'"
                      className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground resize-none"
                    />
                    <p className="text-xs text-foreground mt-2">
                      Be specific about tone, personality, age, and any unique characteristics
                    </p>
                  </div>

                  {/* Voice Attributes */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Gender
                      </label>
                      <select
                        value={designGender}
                        onChange={(e) => setDesignGender(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Age
                      </label>
                      <select
                        value={designAge}
                        onChange={(e) => setDesignAge(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                      >
                        <option value="young">Young (20s)</option>
                        <option value="middle">Middle (30s-40s)</option>
                        <option value="mature">Mature (50s+)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Accent
                      </label>
                      <select
                        value={designAccent}
                        onChange={(e) => setDesignAccent(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                      >
                        <option value="american">American</option>
                        <option value="british">British</option>
                        <option value="australian">Australian</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateVoice}
                    disabled={!designDescription || designDescription.trim().length < 10 || generatingVoice}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {generatingVoice ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating Voice...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Generate Voice
                      </>
                    )}
                  </button>

                  {/* Generated Voices */}
                  {generatedVoices.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-3">Generated Voices</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {generatedVoices.map((voice, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedVoice(voice)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              selectedVoice?.id === voice.id
                                ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                                : 'border-border hover:border-green-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Wand2 className="w-4 h-4 text-green-600" />
                              <span className="font-semibold text-foreground text-sm">{voice.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {voice.gender} • {voice.age} • {voice.accent}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cloned Voices Library Tab */}
              {voiceSource === 'cloned' && (
                <div>
                  {clonedVoices.length === 0 ? (
                    <div className="text-center py-12">
                      <Mic className="w-16 h-16 text-gray-700 dark:text-gray-100 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-foreground mb-2">No Cloned Voices Yet</h4>
                      <p className="text-muted-foreground mb-4">
                        Create your first cloned voice using the "Clone Voice" tab
                      </p>
                      <button
                        onClick={() => setVoiceSource('clone')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Copy className="w-4 h-4" />
                        Clone Voice
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clonedVoices.map((voice) => (
                        <div
                          key={voice.id}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedVoice?.id === voice.id
                              ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold">{voice.name[0]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground">{voice.name}</h4>
                                <p className="text-xs text-muted-foreground">{voice.description || 'Custom cloned voice'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedVoice(voice)}
                              className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                            >
                              Use This Voice
                            </button>
                            <button
                              onClick={() => handlePreviewVoice(voice)}
                              className="px-3 py-2 border border-border rounded-lg hover:bg-secondary/80 text-sm"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClonedVoice(voice.id)}
                              className="px-3 py-2 border border-red-300 dark:border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Voice Library Tab */}
              {voiceSource === 'library' && (
                <div className="bg-card rounded-lg">
                  <VoiceLibraryBrowser
                    embedded={true}
                    onVoiceSelect={(voice) => {
                      setSelectedVoice({
                        id: voice.id,
                        name: voice.name,
                        voiceId: voice.id,
                        gender: voice.gender,
                        accent: voice.accent,
                        age: voice.age,
                        description: voice.description,
                        tone: voice.useCase,
                        category: voice.useCase
                      });
                      setVoiceSource('library');
                    }}
                  />
                </div>
              )}

              {/* Advanced Voice Settings */}
              <div className="border-t border-border pt-4">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground mb-3"
                >
                  <Sliders className="w-4 h-4" />
                  Advanced Voice Settings
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`} />
                </button>

                {showAdvancedSettings && (
                  <div className="space-y-4 bg-secondary p-4 rounded-lg">
                    {/* Model Selection */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Voice Model
                      </label>
                      <select
                        value={voiceSettings.model}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, model: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card border border-border text-foreground text-sm"
                      >
                        {VOICE_MODELS.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} - {model.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stability */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          Stability
                        </label>
                        <span className="text-sm text-muted-foreground">{voiceSettings.stability}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={voiceSettings.stability}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, stability: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-foreground mt-1">
                        Higher = more consistent, Lower = more expressive
                      </p>
                    </div>

                    {/* Similarity Boost */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          Clarity + Similarity
                        </label>
                        <span className="text-sm text-muted-foreground">{voiceSettings.similarityBoost}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={voiceSettings.similarityBoost}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, similarityBoost: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-foreground mt-1">
                        Higher = more similar to original voice
                      </p>
                    </div>

                    {/* Style */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          Style Exaggeration
                        </label>
                        <span className="text-sm text-muted-foreground">{voiceSettings.style}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={voiceSettings.style}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, style: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <p className="text-xs text-foreground mt-1">
                        Higher = more exaggerated emotion and style
                      </p>
                    </div>

                    {/* Speaker Boost */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Speaker Boost
                        </label>
                        <p className="text-xs text-foreground">
                          Enhance voice similarity and reduce background noise
                        </p>
                      </div>
                      <button
                        onClick={() => setVoiceSettings({ ...voiceSettings, useSpeakerBoost: !voiceSettings.useSpeakerBoost })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          voiceSettings.useSpeakerBoost ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            voiceSettings.useSpeakerBoost ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Language Detection */}
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <label className="text-sm font-medium text-foreground">
                            Auto Language Detection
                          </label>
                          <p className="text-xs text-foreground">
                            Automatically detect and respond in caller's language
                          </p>
                        </div>
                        <button
                          onClick={() => setEnableLanguageDetection(!enableLanguageDetection)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            enableLanguageDetection ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              enableLanguageDetection ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Primary Language */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Primary Language
                        </label>
                        <select
                          value={primaryLanguage}
                          onChange={(e) => setPrimaryLanguage(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-card border border-border text-foreground text-sm"
                        >
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name} ({lang.nativeName})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Supported Languages */}
                      {enableLanguageDetection && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Supported Languages ({supportedLanguages.length})
                          </label>
                          <p className="text-xs text-foreground mb-2">
                            Select languages your agent can understand and speak
                          </p>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 border border-border rounded-lg p-3 bg-secondary">
                            {SUPPORTED_LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => toggleLanguage(lang.code)}
                                disabled={lang.code === 'en'}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                                  supportedLanguages.includes(lang.code)
                                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-foreground'
                                    : 'bg-card border border-border border-2 border-border text-muted-foreground hover:border-green-300'
                                } ${lang.code === 'en' ? 'opacity-100 cursor-default' : 'cursor-pointer'}`}
                              >
                                <span className="text-lg">{lang.flag}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{lang.name}</div>
                                  <div className="text-xs opacity-75 truncate">{lang.nativeName}</div>
                                </div>
                                {supportedLanguages.includes(lang.code) && (
                                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-foreground mt-2">
                            💡 Tip: Use Multilingual v2 model for best results with multiple languages
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Name & Description */}
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="My Sales Agent"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder="Brief description of what this agent does"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Knowledge Base & Training */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Knowledge Base & Training</h3>
                <p className="text-muted-foreground mb-6">
                  Provide domain knowledge and training examples to make your agent smarter
                </p>
              </div>

              {/* AI Chat Assistant for Manual Builder */}
              {selectedTemplate?.id === 'manual' && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-foreground">AI Assistant Chat</h4>
                  </div>

                  <div className="bg-card border border-border rounded-lg border border-border p-3 mb-3 max-h-64 overflow-y-auto">
                    {aiChatMessages.map((msg, idx) => (
                      <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-foreground'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {aiChatLoading && (
                      <div className="text-left">
                        <div className="inline-block px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiChatInput}
                      onChange={(e) => setAiChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                      placeholder="Describe what you want your agent to do..."
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground"
                    />
                    <button
                      onClick={handleAIChat}
                      disabled={aiChatLoading || !aiChatInput.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Agent Instructions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Agent Instructions & Behavior
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={6}
                  placeholder="Describe how the agent should behave, what it should say, and how it should handle different scenarios..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground resize-none text-sm"
                />
                <p className="text-xs text-foreground mt-2">
                  💡 Tip: Be specific about tone, goals, objection handling, and escalation procedures
                </p>
              </div>

              {/* Knowledge Base */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Book className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-foreground">
                    Knowledge Base (Optional)
                  </label>
                </div>
                <textarea
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  rows={4}
                  placeholder="Add product information, FAQs, company policies, or any domain knowledge the agent should know about..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground resize-none text-sm"
                />
                <p className="text-xs text-foreground mt-2">
                  Examples: pricing tiers, service offerings, business hours, common customer questions
                </p>
              </div>

              {/* Training Examples */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-medium text-foreground">
                      Training Examples (Optional)
                    </label>
                  </div>
                  <span className="text-xs text-gray-500">{trainingExamples.length} examples</span>
                </div>

                {/* Training Example List */}
                {trainingExamples.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {trainingExamples.map((example, idx) => (
                      <div key={idx} className="bg-secondary border border-border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 text-sm">
                            <p className="text-foreground mb-1">
                              <strong>Q:</strong> {example.question}
                            </p>
                            <p className="text-muted-foreground">
                              <strong>A:</strong> {example.response}
                            </p>
                          </div>
                          <button
                            onClick={() => removeTrainingExample(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Training Example */}
                <div className="border border-border rounded-lg p-3 bg-card">
                  <input
                    type="text"
                    value={newExample.question}
                    onChange={(e) => setNewExample({ ...newExample, question: e.target.value })}
                    placeholder="Example customer question..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card border border-border text-foreground mb-2"
                  />
                  <input
                    type="text"
                    value={newExample.response}
                    onChange={(e) => setNewExample({ ...newExample, response: e.target.value })}
                    placeholder="Ideal agent response..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card border border-border text-foreground mb-2"
                  />
                  <button
                    onClick={addTrainingExample}
                    disabled={!newExample.question || !newExample.response}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Training Example
                  </button>
                </div>
                <p className="text-xs text-foreground mt-2">
                  Training examples help the agent learn your preferred responses to common scenarios
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {step === 4 && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Review Your Agent</h3>
              <p className="text-muted-foreground mb-6">
                Review all configuration before creating your AI voice agent
              </p>

              {/* Summary */}
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Name:</span>
                      <span className="font-medium text-foreground">{agentName || 'Unnamed Agent'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Type:</span>
                      <span className="font-medium text-foreground">{selectedTemplate?.name || 'Custom'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Description:</span>
                      <span className="font-medium text-foreground">{agentDescription || 'No description'}</span>
                    </div>
                  </div>
                </div>

                {/* Voice Configuration */}
                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Voice Configuration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Voice:</span>
                      <span className="font-medium text-foreground">
                        {selectedVoice.name} ({selectedVoice.gender}, {selectedVoice.accent})
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Model:</span>
                      <span className="font-medium text-foreground">
                        {VOICE_MODELS.find(m => m.id === voiceSettings.model)?.name}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Settings:</span>
                      <span className="text-foreground">
                        Stability: {voiceSettings.stability}% • Similarity: {voiceSettings.similarityBoost}% • Style: {voiceSettings.style}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Agent Instructions
                  </h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {customPrompt || 'No specific instructions provided'}
                  </p>
                </div>

                {/* Knowledge & Training */}
                {(knowledgeBase || trainingExamples.length > 0) && (
                  <div className="p-4 bg-secondary rounded-lg border border-border">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Knowledge & Training
                    </h4>
                    <div className="space-y-2 text-sm">
                      {knowledgeBase && (
                        <div>
                          <span className="text-muted-foreground">Knowledge Base:</span>
                          <p className="text-foreground mt-1">{knowledgeBase.substring(0, 200)}{knowledgeBase.length > 200 ? '...' : ''}</p>
                        </div>
                      )}
                      {trainingExamples.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Training Examples:</span>
                          <p className="text-foreground">{trainingExamples.length} example{trainingExamples.length !== 1 ? 's' : ''} provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Language Settings */}
                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    🌍 Language Settings
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[140px]">Auto Detection:</span>
                      <span className={`font-medium ${enableLanguageDetection ? 'text-green-600' : 'text-gray-500'}`}>
                        {enableLanguageDetection ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[140px]">Primary Language:</span>
                      <span className="font-medium text-foreground">
                        {SUPPORTED_LANGUAGES.find(l => l.code === primaryLanguage)?.flag} {SUPPORTED_LANGUAGES.find(l => l.code === primaryLanguage)?.name}
                      </span>
                    </div>
                    {enableLanguageDetection && supportedLanguages.length > 1 && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground min-w-[140px]">Supported Languages:</span>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-1">
                            {supportedLanguages.slice(0, 10).map(code => {
                              const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                              return lang ? (
                                <span key={code} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                  {lang.flag} {lang.name}
                                </span>
                              ) : null;
                            })}
                            {supportedLanguages.length > 10 && (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-700 text-muted-foreground rounded text-xs">
                                +{supportedLanguages.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-secondary border-t border-border flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-foreground hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          <div className="flex gap-3">
            {step < 4 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedTemplate}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleCreate}
                disabled={loading || !agentName || !customPrompt}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Agent
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
