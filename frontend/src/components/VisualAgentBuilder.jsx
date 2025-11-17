import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Mic, MessageSquare, Code, Database, TestTube, Play, Save,
  Plus, Trash2, Settings, X, Check, Info, Pause, Filter,
  Upload, FileText, Globe, Music, Sparkles, Phone, Mail, Wand2
} from 'lucide-react';
import VoiceLibraryBrowser from './VoiceLibraryBrowser';

/**
 * 🎨 VISUAL AGENT BUILDER with React Flow
 *
 * Drag-and-drop visual builder for creating AI voice agents
 * Uses React Flow for proper node dragging and connections
 */

// Available Variables from CRM
const AVAILABLE_VARIABLES = [
  { id: 'customer_name', label: 'Customer Name', category: 'Customer', example: 'John Smith' },
  { id: 'customer_email', label: 'Email', category: 'Customer', example: 'john@example.com' },
  { id: 'customer_phone', label: 'Phone', category: 'Customer', example: '+1 (555) 123-4567' },
  { id: 'company_name', label: 'Company Name', category: 'Company', example: 'Acme Corp' },
  { id: 'agent_name', label: 'Agent Name', category: 'Agent', example: 'Sarah' },
  { id: 'appointment_date', label: 'Appointment Date', category: 'Appointment', example: 'Nov 18, 2024' },
  { id: 'appointment_time', label: 'Appointment Time', category: 'Appointment', example: '2:00 PM' },
  { id: 'appointment_type', label: 'Appointment Type', category: 'Appointment', example: 'Consultation' },
  { id: 'current_date', label: 'Current Date', category: 'Time', example: 'Nov 17, 2024' },
  { id: 'current_time', label: 'Current Time', category: 'Time', example: '3:45 PM' },
  { id: 'project_type', label: 'Project Type', category: 'Project', example: 'Kitchen Remodel' },
  { id: 'project_budget', label: 'Budget', category: 'Project', example: '$45,000' },
];

// Configure axios
const API_URL = import.meta.env.MODE === 'production'
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001/api');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Custom Node Components for each type
function VoiceNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card min-w-[200px] ${
      selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#3b82f6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />

      <div className="flex items-center gap-2 mb-2">
        <Mic className="h-5 w-5 text-blue-600" />
        <div className="font-bold text-foreground">Voice</div>
      </div>

      {data.voiceName ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Check className="h-3 w-3 text-green-600" />
          {data.voiceName}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not configured</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
}

function PromptNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card min-w-[200px] ${
      selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#a855f7' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-500" />

      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-5 w-5 text-purple-600" />
        <div className="font-bold text-foreground">System Prompt</div>
      </div>

      {data.prompt ? (
        <div className="text-xs text-muted-foreground line-clamp-2">{data.prompt}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not configured</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
}

function VariableNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card min-w-[200px] ${
      selected ? 'ring-2 ring-green-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#22c55e' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-green-500" />

      <div className="flex items-center gap-2 mb-2">
        <Code className="h-5 w-5 text-green-600" />
        <div className="font-bold text-foreground">Variables</div>
      </div>

      {data.variables?.length > 0 ? (
        <div className="text-xs text-muted-foreground">{data.variables.length} variables</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">No variables</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-green-500" />
    </div>
  );
}

function KnowledgeNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card min-w-[200px] ${
      selected ? 'ring-2 ring-orange-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#f97316' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-orange-500" />

      <div className="flex items-center gap-2 mb-2">
        <Database className="h-5 w-5 text-orange-600" />
        <div className="font-bold text-foreground">Knowledge Base</div>
      </div>

      {(data.documents?.length > 0 || data.urls?.length > 0) ? (
        <div className="text-xs text-muted-foreground">
          {data.documents?.length || 0} docs, {data.urls?.length || 0} URLs
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">No knowledge</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-orange-500" />
    </div>
  );
}

function TestNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card min-w-[200px] ${
      selected ? 'ring-2 ring-red-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#ef4444' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-red-500" />

      <div className="flex items-center gap-2 mb-2">
        <TestTube className="h-5 w-5 text-red-600" />
        <div className="font-bold text-foreground">Test</div>
      </div>

      {data.testType ? (
        <div className="text-xs text-muted-foreground capitalize">{data.testType}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not configured</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-red-500" />
    </div>
  );
}

const nodeTypes = {
  voice: VoiceNode,
  prompt: PromptNode,
  variable: VariableNode,
  knowledge: KnowledgeNode,
  test: TestNode,
};

// Node Templates for dragging
const NODE_TEMPLATES = [
  { type: 'voice', label: 'Voice', icon: Mic, color: '#3b82f6', description: 'Select AI voice' },
  { type: 'prompt', label: 'Prompt', icon: MessageSquare, color: '#a855f7', description: 'Agent instructions' },
  { type: 'variable', label: 'Variables', icon: Code, color: '#22c55e', description: 'Dynamic data' },
  { type: 'knowledge', label: 'Knowledge', icon: Database, color: '#f97316', description: 'Docs & URLs' },
  { type: 'test', label: 'Test', icon: TestTube, color: '#ef4444', description: 'Test your agent' },
];

function VisualAgentBuilderContent() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [voices, setVoices] = useState([]);
  const [configModal, setConfigModal] = useState(null);
  const [agentName, setAgentName] = useState('Untitled Agent');
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Fetch voices from voice library (paginated)
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        console.log('🎤 Fetching voices from voice library...');
        // Use the working voice library endpoint with pagination
        const response = await api.get('/agents/helpers/voice-library?page=1&limit=100');
        console.log('✅ Voice library response received');
        console.log('📊 Response data:', response.data);

        // Voice library returns { voices: [...], pagination: {...} }
        if (response.data?.voices && Array.isArray(response.data.voices)) {
          console.log(`✅ Successfully loaded ${response.data.voices.length} voices from library`);
          setVoices(response.data.voices);
        } else if (Array.isArray(response.data)) {
          // Fallback: direct array
          console.log(`✅ Successfully loaded ${response.data.length} voices (direct array)`);
          setVoices(response.data);
        } else {
          console.error('❌ Unexpected voices response format');
          console.error('Response structure:', JSON.stringify(response.data, null, 2));
          setVoices([]);
        }
      } catch (error) {
        console.error('❌ Error fetching voices:', error);
        console.error('Error details:', error.response?.data);
        setVoices([]);
      }
    };
    fetchVoices();
  }, []);

  // Handle edge connections
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  // Drag from sidebar
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          voiceId: null,
          voiceName: null,
          prompt: '',
          firstMessage: '',
          variables: [],
          documents: [],
          urls: [],
          testType: null,
          testData: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Double-click to configure
  const onNodeDoubleClick = useCallback((event, node) => {
    setConfigModal(node);
  }, []);

  // Delete node
  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // Update node data
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
  }, [setNodes]);

  // Save configuration
  const handleSave = () => {
    const config = {
      name: agentName,
      nodes,
      edges,
      createdAt: new Date().toISOString(),
    };
    console.log('💾 Saving agent configuration:', config);
    alert('Agent configuration saved! (Check console for details)');
  };

  // Test agent
  const handleTest = () => {
    const hasVoice = nodes.some(n => n.type === 'voice' && n.data.voiceId);
    const hasPrompt = nodes.some(n => n.type === 'prompt' && n.data.prompt);

    if (!hasVoice) {
      alert('Please add and configure a Voice node');
      return;
    }
    if (!hasPrompt) {
      alert('Please add and configure a Prompt node');
      return;
    }

    const testNode = nodes.find(n => n.type === 'test');
    if (testNode) {
      setConfigModal(testNode);
    } else {
      alert('Add a Test node to test your agent');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground mb-2">Visual Builder</h2>
          <p className="text-xs text-muted-foreground">Drag nodes onto canvas</p>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto">
          {NODE_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.type}
                draggable
                onDragStart={(e) => onDragStart(e, template.type)}
                className="p-3 bg-muted border-2 border-border rounded-lg cursor-move hover:bg-accent hover:border-blue-400 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" style={{ color: template.color }} />
                  <div className="font-medium text-sm text-foreground">{template.label}</div>
                </div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={handleTest}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" />
            Test Agent
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/agent-studio')}
              className="p-2 hover:bg-muted rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="px-3 py-1 bg-muted border border-border rounded-lg font-medium"
              placeholder="Agent name..."
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
          </div>
        </div>

        {/* React Flow Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* Configuration Modal */}
      {configModal && (
        <ConfigurationModal
          node={configModal}
          voices={voices}
          onClose={() => setConfigModal(null)}
          onSave={(data) => {
            updateNodeData(configModal.id, data);
            setConfigModal(null);
          }}
          onDelete={() => {
            deleteNode(configModal.id);
            setConfigModal(null);
          }}
        />
      )}
    </div>
  );
}

// Configuration Modal
function ConfigurationModal({ node, voices, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({ ...node.data });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Configure {node.type} Node</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {node.type === 'voice' && <VoiceConfig formData={formData} setFormData={setFormData} voices={voices} />}
          {node.type === 'prompt' && <PromptConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'variable' && <VariableConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'knowledge' && <KnowledgeConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'test' && <TestConfig formData={formData} setFormData={setFormData} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Config Components with pagination
function VoiceConfig({ formData, setFormData, voices = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('all'); // Default to all to show voices immediately

  // Debug: Log formData changes
  console.log('🔍 VoiceConfig formData:', formData);

  // Safety check for voices array
  const voicesArray = Array.isArray(voices) ? voices : [];

  // Debug logging
  useEffect(() => {
    console.log('🔍 VoiceConfig received voices:', voices);
    console.log('📊 VoiceConfig voicesArray length:', voicesArray.length);
    if (voicesArray.length > 0) {
      console.log('📊 Sample voice structure:', voicesArray[0]);
      console.log('📊 Voice ID field check:', {
        'has id': !!voicesArray[0].id,
        'has voice_id': !!voicesArray[0].voice_id,
        'id value': voicesArray[0].id,
        'voice_id value': voicesArray[0].voice_id
      });
    }
  }, [voices, voicesArray.length]);

  // Get unique languages from voices
  const languages = [...new Set(voicesArray.map(v => v.labels?.language).filter(Boolean))].sort();

  // Filter voices by language, accent, and search term
  const filteredVoices = voicesArray.filter(voice => {
    const matchesSearch = searchTerm === '' || voice.name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Handle language filtering with accent specificity
    // Note: Voice library doesn't have labels object, use top-level fields
    let matchesLanguage = false;
    if (selectedLanguage === 'all') {
      matchesLanguage = true;
    } else if (selectedLanguage === 'en-us') {
      // US English - check description/name for American/English indicators
      const desc = (voice.description || '').toLowerCase();
      const name = (voice.name || '').toLowerCase();
      const combined = desc + ' ' + name;

      // Match US/American English or generic English without British
      matchesLanguage = (
        combined.includes('american') ||
        combined.includes('united states') ||
        combined.includes('us ') ||
        (combined.includes('english') && !combined.includes('british') && !combined.includes('uk'))
      );
    } else if (selectedLanguage === 'en-gb') {
      // UK English - check for British indicators
      const desc = (voice.description || '').toLowerCase();
      const name = (voice.name || '').toLowerCase();
      const combined = desc + ' ' + name;

      matchesLanguage = (
        combined.includes('british') ||
        combined.includes('united kingdom') ||
        combined.includes('uk ')
      );
    } else {
      // Other languages - check description/name for language mention
      const desc = (voice.description || '').toLowerCase();
      const name = (voice.name || '').toLowerCase();
      const combined = desc + ' ' + name;

      // Language code mapping for search
      const langNames = {
        'es': ['spanish', 'español'],
        'fr': ['french', 'français'],
        'de': ['german', 'deutsch'],
        'it': ['italian', 'italiano'],
        'pt': ['portuguese', 'português'],
        'pl': ['polish', 'polski'],
        'ja': ['japanese', '日本語'],
        'zh': ['chinese', '中文'],
        'ko': ['korean', '한국어'],
        'nl': ['dutch', 'nederlands'],
        'tr': ['turkish', 'türkçe'],
        'sv': ['swedish', 'svenska'],
        'hi': ['hindi', 'हिन्दी'],
        'ar': ['arabic', 'عربي'],
        'ru': ['russian', 'русский']
      };

      const searchTerms = langNames[selectedLanguage] || [selectedLanguage];
      matchesLanguage = searchTerms.some(term => combined.includes(term));
    }

    return matchesSearch && matchesLanguage;
  });

  // Debug filtered results and show sample English voices
  useEffect(() => {
    console.log('🔍 Filtered voices count:', filteredVoices.length);
    console.log('🔍 Selected language:', selectedLanguage);
    console.log('🔍 Search term:', searchTerm);

    // When filtering by en-us or en-gb, show first 10 voices to debug their actual structure
    if (selectedLanguage === 'en-us' || selectedLanguage === 'en-gb') {
      console.log('📊 First 10 voices - full label structure:');
      voicesArray.slice(0, 10).forEach(voice => {
        console.log(`   - ${voice.name}:`, voice.labels);
      });

      // Try to find ANY voice that might be English
      const possibleEnglish = voicesArray.filter(v => {
        const lang = v.labels?.language || v.language || '';
        const accent = v.labels?.accent || v.accent || '';
        const desc = v.description || '';
        return lang.toLowerCase().includes('en') ||
               accent.toLowerCase().includes('american') ||
               accent.toLowerCase().includes('british');
      }).slice(0, 5);

      console.log('📊 Possible English voices found:', possibleEnglish.length);
      possibleEnglish.forEach(v => {
        console.log(`   - ${v.name}: Full object:`, v);
      });
    }
  }, [filteredVoices.length, selectedLanguage, searchTerm, voicesArray]);

  // Ensure the selected voice is always in the displayed list
  let displayedVoices = filteredVoices.slice(0, displayCount);

  // If a voice is selected and it's not in the displayed list, add it at the beginning
  if (formData.voiceId) {
    const selectedVoiceInList = displayedVoices.find(v => v.id === formData.voiceId);
    if (!selectedVoiceInList) {
      const selectedVoice = voicesArray.find(v => v.id === formData.voiceId);
      if (selectedVoice) {
        displayedVoices = [selectedVoice, ...displayedVoices];
      }
    }
  }

  const hasMore = displayCount < filteredVoices.length;

  // Play voice preview
  const playVoicePreview = (voice) => {
    console.log('🎵 playVoicePreview called with voice:', voice);

    if (playingVoice === voice.id) {
      console.log('⏸️ Pausing currently playing voice');
      audioPlayer?.pause();
      setPlayingVoice(null);
      return;
    }

    if (audioPlayer) {
      audioPlayer.pause();
    }

    // Try multiple possible field names for preview URL
    const previewUrl = voice.preview_url || voice.previewUrl || voice.sample_url || voice.sampleUrl || voice.samples?.[0] || voice.audio_url || voice.audioUrl;

    console.log('🔍 Looking for preview URL in voice object');
    console.log('   preview_url:', voice.preview_url);
    console.log('   previewUrl:', voice.previewUrl);
    console.log('   sample_url:', voice.sample_url);
    console.log('   sampleUrl:', voice.sampleUrl);
    console.log('   samples:', voice.samples);
    console.log('   Final previewUrl:', previewUrl);

    if (previewUrl) {
      console.log('▶️ Playing audio from:', previewUrl);
      const audio = new Audio(previewUrl);
      audio.play()
        .then(() => console.log('✅ Audio playing successfully'))
        .catch(err => console.error('❌ Error playing audio:', err));
      audio.onended = () => {
        console.log('🔚 Audio ended');
        setPlayingVoice(null);
      };
      setAudioPlayer(audio);
      setPlayingVoice(voice.id);
    } else {
      console.error('❌ No preview URL found for this voice');
      console.log('Full voice object:', voice);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-border pb-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Music className="h-5 w-5 text-blue-600" />
          Voice Library
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose from thousands of AI voices in 29 languages
        </p>
      </div>

      {/* Loading State */}
      {voicesArray.length === 0 && (
        <div className="text-center py-8">
          <Music className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading voices...</p>
        </div>
      )}

      {voicesArray.length > 0 && (
        <>
          {/* Selected Voice Banner */}
          {formData.voiceId && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    {formData.voiceName}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    Voice selected
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFormData({ ...formData, voiceId: null, voiceName: null })}
                className="text-red-600 hover:text-red-700"
                title="Change voice"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filter Voices</span>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                Language & Accent
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  setDisplayCount(20); // Reset on language change
                }}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              >
                <option value="all">🌍 All Languages</option>
                <option value="en-us">🇺🇸 English (US)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Showing all voices by default. Select English (US) to filter American voices.
              </p>
            </div>

            {/* Results Count */}
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Showing {displayedVoices.length} of {filteredVoices.length} voices</span>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Voice Selection Dropdown */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground flex items-center justify-between">
            <span>Select Voice from Library</span>
            <span className="text-xs text-muted-foreground font-normal">
              {displayedVoices.length} of {filteredVoices.length} voices
            </span>
          </label>
          <div className="relative">
            <select
              value={formData.voiceId || ''}
              onChange={(e) => {
                const selectedVoiceId = e.target.value;
                console.log('========================================');
                console.log('🔍 DROPDOWN CHANGE EVENT FIRED');
                console.log('Selected voice ID:', selectedVoiceId);
                console.log('Current formData before update:', formData);
                console.log('Total voices in array:', voicesArray.length);

                if (selectedVoiceId) {
                  const selectedVoice = voicesArray.find(v => v.id === selectedVoiceId);
                  console.log('✅ Voice found in array:', selectedVoice);

                  if (selectedVoice) {
                    const newFormData = {
                      ...formData,
                      voiceId: selectedVoice.id,
                      voiceName: selectedVoice.name
                    };
                    console.log('📝 Setting new formData:', newFormData);
                    setFormData(newFormData);
                    console.log('✅ setFormData called successfully');
                  } else {
                    console.error('❌ Voice not found in array!');
                  }
                } else {
                  console.log('⚠️ No voice ID selected (empty value)');
                }
                console.log('========================================');
              }}
              className={`w-full px-3 py-2.5 pr-10 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground appearance-none cursor-pointer hover:border-blue-300 transition-colors ${
                formData.voiceId ? 'border-green-500' : 'border-border'
              }`}
              style={{ minHeight: '42px' }}
            >
              <option value="" disabled>
                🎙️ Choose your voice...
              </option>

              {/* Display voices with flag, name, and description */}
              {displayedVoices.map((voice) => {
                // Detect language from description/name since labels object doesn't exist
                const detectLanguageFlag = (voice) => {
                  const desc = (voice.description || '').toLowerCase();
                  const name = (voice.name || '').toLowerCase();
                  const combined = desc + ' ' + name;

                  // Check for language keywords
                  if (combined.includes('american') || combined.includes('united states') || combined.includes('us ')) return '🇺🇸';
                  if (combined.includes('british') || combined.includes('uk ')) return '🇬🇧';
                  if (combined.includes('english')) return '🇺🇸'; // Default English to US
                  if (combined.includes('spanish') || combined.includes('español')) return '🇪🇸';
                  if (combined.includes('french') || combined.includes('français')) return '🇫🇷';
                  if (combined.includes('german') || combined.includes('deutsch')) return '🇩🇪';
                  if (combined.includes('italian') || combined.includes('italiano')) return '🇮🇹';
                  if (combined.includes('portuguese') || combined.includes('português')) return '🇵🇹';
                  if (combined.includes('polish') || combined.includes('polski')) return '🇵🇱';
                  if (combined.includes('japanese') || combined.includes('日本語')) return '🇯🇵';
                  if (combined.includes('chinese') || combined.includes('中文')) return '🇨🇳';
                  if (combined.includes('korean') || combined.includes('한국어')) return '🇰🇷';
                  if (combined.includes('dutch') || combined.includes('nederlands')) return '🇳🇱';
                  if (combined.includes('turkish') || combined.includes('türkçe')) return '🇹🇷';
                  if (combined.includes('swedish') || combined.includes('svenska')) return '🇸🇪';
                  if (combined.includes('hindi') || combined.includes('हिन्दी')) return '🇮🇳';
                  if (combined.includes('arabic') || combined.includes('عربي')) return '🇸🇦';
                  if (combined.includes('russian') || combined.includes('русский')) return '🇷🇺';
                  if (combined.includes('vietnamese')) return '🇻🇳';

                  return '🌍'; // Default globe for unknown
                };

                // Build description from available fields
                const description = [
                  voice.accent,
                  voice.gender,
                  voice.age
                ].filter(Boolean).join(', ');

                const flag = detectLanguageFlag(voice);

                // Debug: Log the voice object structure
                if (Math.random() < 0.05) { // Log 5% of voices to see structure
                  console.log('🔍 Voice object structure:', {
                    id: voice.id,
                    voice_id: voice.voice_id,
                    name: voice.name
                  });
                }

                return (
                  <option
                    key={voice.id || voice.voice_id}
                    value={voice.id || voice.voice_id}
                  >
                    {flag} {voice.name}{description ? ` - ${description}` : ''}
                  </option>
                );
              })}

            </select>

            {/* Custom dropdown arrow */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <button
              type="button"
              onClick={() => {
                console.log('📥 Loading more voices via button...');
                setDisplayCount(prev => prev + 20);
              }}
              className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Load {Math.min(20, filteredVoices.length - displayCount)} more voices ({filteredVoices.length - displayCount} remaining)
            </button>
          )}

          {/* Selection Status - ALWAYS VISIBLE */}
          <div className="mt-3">
            {formData.voiceId ? (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-500 dark:border-green-600 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-white font-bold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Selected Voice
                    </p>
                    <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-0.5">
                      {formData.voiceName}
                    </p>
                  </div>
                  {/* Play/Pause Button */}
                  {(() => {
                    const voice = voicesArray.find(v => v.id === formData.voiceId);
                    if (voice) {
                      console.log('🔍 Selected voice for preview:', voice);
                      console.log('🔍 Voice object keys:', Object.keys(voice));
                      console.log('🔍 Checking preview fields:', {
                        preview_url: voice.preview_url,
                        previewUrl: voice.previewUrl,
                        sample_url: voice.sample_url,
                        sampleUrl: voice.sampleUrl,
                        samples: voice.samples,
                        audio_url: voice.audio_url,
                        audioUrl: voice.audioUrl
                      });
                    }

                    // Check for different possible preview field names
                    const previewUrl = voice?.preview_url || voice?.previewUrl || voice?.sample_url || voice?.sampleUrl || voice?.samples?.[0] || voice?.audio_url || voice?.audioUrl;

                    return previewUrl ? (
                      <button
                        onClick={() => {
                          console.log('▶️ Play button clicked for voice:', voice?.name);
                          if (voice) playVoicePreview(voice);
                        }}
                        className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                      >
                        {playingVoice === formData.voiceId ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        )}
                      </button>
                    ) : (
                      <div className="text-xs text-gray-500">No preview</div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Ready to save and continue
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  💡 No voice selected yet. Choose a voice from the dropdown above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Voice Preview Section */}
        {formData.voiceId && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-full">
                  <Music className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground">Preview Voice Sample</span>
              </div>
              {voicesArray.find(v => v.id === formData.voiceId)?.preview_url && (
                <button
                  onClick={() => {
                    const voice = voicesArray.find(v => v.id === formData.voiceId);
                    if (voice) playVoicePreview(voice);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-medium rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {playingVoice === formData.voiceId ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Play Sample
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden load more button (functionality moved to dropdown) */}
      {false && hasMore && (
        <button
          onClick={() => setDisplayCount(prev => prev + 20)}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Load More Voices ({filteredVoices.length - displayCount} remaining)
        </button>
      )}

      {/* No Results */}
      {filteredVoices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No voices found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

function PromptConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">System Prompt *</label>
        <textarea
          value={formData.prompt || ''}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          rows={10}
          placeholder="You are a helpful assistant..."
          className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">First Message</label>
        <input
          type="text"
          value={formData.firstMessage || ''}
          onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
          placeholder="Hi! How can I help you?"
          className="w-full px-4 py-3 border border-border rounded-lg"
        />
      </div>
    </div>
  );
}

function VariableConfig({ formData, setFormData }) {
  const toggleVariable = (varId) => {
    const variables = formData.variables || [];
    if (variables.includes(varId)) {
      setFormData({ ...formData, variables: variables.filter(v => v !== varId) });
    } else {
      setFormData({ ...formData, variables: [...variables, varId] });
    }
  };

  const categories = [...new Set(AVAILABLE_VARIABLES.map(v => v.category))];

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <div key={category}>
          <h3 className="font-medium mb-2">{category}</h3>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_VARIABLES.filter(v => v.category === category).map(variable => {
              const isSelected = (formData.variables || []).includes(variable.id);
              return (
                <button
                  key={variable.id}
                  onClick={() => toggleVariable(variable.id)}
                  className={`p-3 border-2 rounded-lg text-left ${
                    isSelected ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'
                  }`}
                >
                  <div className="font-medium text-sm">{variable.label}</div>
                  <code className="text-xs text-green-600">{'{{' + variable.id + '}}'}</code>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function KnowledgeConfig({ formData, setFormData }) {
  const [urlInput, setUrlInput] = useState('');

  const addUrl = () => {
    if (urlInput) {
      setFormData({ ...formData, urls: [...(formData.urls || []), urlInput] });
      setUrlInput('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Upload Documents</label>
        <input type="file" className="w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Add URLs</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-4 py-2 border border-border rounded-lg"
          />
          <button onClick={addUrl} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Add
          </button>
        </div>
        {formData.urls?.map((url, i) => (
          <div key={i} className="mt-2 p-2 bg-muted rounded flex justify-between">
            <span className="text-sm truncate">{url}</span>
            <button
              onClick={() => setFormData({ ...formData, urls: formData.urls.filter((_, idx) => idx !== i) })}
              className="text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Test Type</label>
        <div className="grid grid-cols-3 gap-3">
          {['call', 'sms', 'email'].map(type => (
            <button
              key={type}
              onClick={() => setFormData({ ...formData, testType: type })}
              className={`p-4 border-2 rounded-lg ${
                formData.testType === type ? 'border-blue-500 bg-blue-50' : 'border-border'
              }`}
            >
              {type === 'call' && <Phone className="h-6 w-6 mx-auto mb-2" />}
              {type === 'sms' && <MessageSquare className="h-6 w-6 mx-auto mb-2" />}
              {type === 'email' && <Mail className="h-6 w-6 mx-auto mb-2" />}
              <div className="capitalize">{type}</div>
            </button>
          ))}
        </div>
      </div>

      {formData.testType === 'call' && (
        <input
          type="tel"
          value={formData.testData?.phone || ''}
          onChange={(e) => setFormData({ ...formData, testData: { phone: e.target.value } })}
          placeholder="+1 (555) 123-4567"
          className="w-full px-4 py-3 border border-border rounded-lg"
        />
      )}
    </div>
  );
}

// Main export with Provider
export default function VisualAgentBuilder() {
  return (
    <ReactFlowProvider>
      <VisualAgentBuilderContent />
    </ReactFlowProvider>
  );
}
