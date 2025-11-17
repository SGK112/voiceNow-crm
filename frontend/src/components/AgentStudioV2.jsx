import React, { useState, useCallback, useEffect } from 'react';
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
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  X,
  Save,
  Play,
  Settings,
  Mic,
  MessageSquare,
  Brain,
  Zap,
  Phone,
  Mail,
  FileText,
  Database,
  Code,
  ChevronLeft,
  Menu,
  Plus,
  Search,
  Upload,
  Users,
  BookOpen,
  Workflow as WorkflowIcon,
  PhoneCall,
  PhoneMissed
} from 'lucide-react';
import api, { callApi } from '../services/api';

// Custom Node Component
function AgentConfigNode({ data, id, selected }) {
  const deleteNode = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div
      className={`relative px-3 py-2 shadow-lg rounded-lg border-2 bg-white dark:bg-gray-800 group ${
        selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''
      }`}
      style={{ borderColor: data.color, minWidth: '140px', maxWidth: '180px' }}
    >
      <button
        onClick={deleteNode}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        title="Delete node"
      >
        <X className="w-3 h-3" />
      </button>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2">
        <span className="text-xl">{data.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate text-gray-900 dark:text-gray-100">{data.label}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{data.description}</div>
          {data.status && (
            <div className={`mt-1 text-[9px] px-1.5 py-0.5 rounded-full inline-block ${
              data.status === 'active' ? 'bg-green-100 text-green-700' :
              data.status === 'configured' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {data.status}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
        style={{ right: -6 }}
      />
    </div>
  );
}

const nodeTypes = {
  agentConfig: AgentConfigNode
};

// Agent Configuration Node Templates
const agentNodeTemplates = [
  // Core Agent Settings
  { type: 'voice_config', label: 'Voice', icon: '🎤', color: '#8b5cf6', description: 'Voice settings', category: 'Core' },
  { type: 'personality', label: 'Personality', icon: '🧠', color: '#8b5cf6', description: 'Agent personality', category: 'Core' },
  { type: 'instructions', label: 'Instructions', icon: '📋', color: '#8b5cf6', description: 'Behavior rules', category: 'Core' },
  { type: 'knowledge_base', label: 'Knowledge', icon: '📚', color: '#8b5cf6', description: 'Knowledge base', category: 'Core' },

  // Triggers
  { type: 'inbound_call', label: 'Inbound Call', icon: '📞', color: '#10b981', description: 'Incoming call', category: 'Triggers' },
  { type: 'outbound_call', label: 'Outbound Call', icon: '📱', color: '#10b981', description: 'Make call', category: 'Triggers' },
  { type: 'webhook_trigger', label: 'Webhook', icon: '🔗', color: '#10b981', description: 'External trigger', category: 'Triggers' },

  // Actions
  { type: 'save_to_crm', label: 'Save to CRM', icon: '💾', color: '#ec4899', description: 'Save data', category: 'Actions' },
  { type: 'send_sms', label: 'Send SMS', icon: '💬', color: '#ec4899', description: 'Text message', category: 'Actions' },
  { type: 'send_email', label: 'Send Email', icon: '📧', color: '#ec4899', description: 'Email', category: 'Actions' },
  { type: 'run_workflow', label: 'Run Workflow', icon: '⚡', color: '#14b8a6', description: 'n8n workflow', category: 'Actions' },
];

const nodeCategories = ['All', 'Core', 'Triggers', 'Actions'];

function AgentStudioContent({ agentId, agentData, onSave, onClose }) {
  const { screenToFlowPosition } = useReactFlow();

  // UI State
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Node & Edge State
  const [nodes, setNodes, onNodesChange] = useNodesState(agentData?.configNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(agentData?.configEdges || []);
  const [selectedNode, setSelectedNode] = useState(null);

  // Configuration State
  const [nodeConfig, setNodeConfig] = useState({});

  // Voice Library State
  const [voices, setVoices] = useState([]);
  const [savedVoices, setSavedVoices] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [leads, setLeads] = useState([]);

  // Call State
  const [showLiveCallModal, setShowLiveCallModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [liveCallPhone, setLiveCallPhone] = useState('');
  const [liveCallName, setLiveCallName] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      // Fetch voices
      const voicesRes = await api.get('/agents/helpers/voice-library?limit=100');
      setVoices(voicesRes.data.voices || []);

      // Fetch saved voices
      const savedRes = await api.get('/agents/voices/saved');
      setSavedVoices(savedRes.data.voices || []);

      // Fetch workflows
      const workflowsRes = await api.get('/workflows');
      setWorkflows(workflowsRes.data || []);

      // Fetch knowledge bases
      const kbRes = await api.get('/knowledge-base');
      setKnowledgeBases(kbRes.data || []);

      // Fetch leads for CRM integration
      const leadsRes = await api.get('/leads');
      setLeads(leadsRes.data?.leads || []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      style: { strokeWidth: 2.5, stroke: '#8b5cf6' }
    }, eds));
  }, [setEdges]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const onDragStart = (event, nodeTemplate) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeTemplate));
  };

  const onDrop = (event) => {
    event.preventDefault();
    const templateData = JSON.parse(event.dataTransfer.getData('application/reactflow'));

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });

    const newNode = {
      id: `${templateData.type}_${Date.now()}`,
      type: 'agentConfig',
      position,
      data: {
        ...templateData,
        nodeType: templateData.type,
        config: {},
        status: 'pending',
        onDelete: deleteNode
      }
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleSave = () => {
    const agentConfiguration = {
      configNodes: nodes,
      configEdges: edges,
      nodeConfigurations: nodeConfig
    };
    onSave(agentConfiguration);
  };

  const updateNodeConfig = (nodeId, config) => {
    setNodeConfig(prev => ({
      ...prev,
      [nodeId]: config
    }));

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              status: 'configured'
            }
          };
        }
        return node;
      })
    );
  };

  // Live Call Handler
  const handleLiveCall = async () => {
    if (!liveCallPhone) {
      alert('Please enter a phone number');
      return;
    }

    setCalling(true);
    try {
      const response = await callApi.initiateLiveCall({
        agentId: agentId,
        phoneNumber: liveCallPhone,
        leadName: liveCallName,
        leadNotes: 'Called from Agent Studio'
      });

      alert(`Call initiated successfully! Call ID: ${response.data.callId}`);
      setShowLiveCallModal(false);
      setLiveCallPhone('');
      setLiveCallName('');
    } catch (error) {
      console.error('Live call error:', error);
      alert(error.response?.data?.message || 'Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  // Bulk Upload Handler
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please select a CSV file');
      return;
    }

    setCalling(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('agentId', agentId);

      const response = await callApi.uploadBulkCalls(formData);

      alert(`Bulk upload complete!\nTotal: ${response.data.totalRows}\nSuccessful: ${response.data.successfulCalls}\nErrors: ${response.data.errors}`);
      setShowBulkUploadModal(false);
      setBulkFile(null);
    } catch (error) {
      console.error('Bulk upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setCalling(false);
    }
  };

  const filteredTemplates = agentNodeTemplates.filter(template => {
    if (selectedCategory === 'All') return true;
    return template.category === selectedCategory;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Agent Studio
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Build AI agents with visual workflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLiveCallModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <PhoneCall className="w-4 h-4" />
            Live Call
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <div className={`${showNodePalette ? 'w-64' : 'w-12'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden flex flex-col`}>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center"
            >
              {showNodePalette ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {showNodePalette && (
            <>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {nodeCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, template)}
                    className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:shadow-md hover:scale-105 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl group-hover:scale-110 transition-transform">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{template.label}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{template.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[15, 15]}
            deleteKeyCode="Delete"
            fitView
          >
            <Background color="#e5e7eb" gap={15} />
            <Controls />
            <MiniMap
              nodeColor={(node) => node.data.color}
              className="!bg-white dark:!bg-gray-800 !border-2 !border-purple-500"
            />
          </ReactFlow>

          <div className="hidden md:block absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
            💡 Drag nodes • Connect flows • Click to configure
          </div>
        </div>

        {/* Configuration Panel */}
        {selectedNode && (
          <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="text-xl">{selectedNode.data.icon}</span>
                  {selectedNode.data.label}
                </h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{selectedNode.data.description}</p>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {selectedNode.data.nodeType === 'voice_config' && (
                <VoiceConfigPanel
                  config={nodeConfig[selectedNode.id] || {}}
                  onChange={(config) => updateNodeConfig(selectedNode.id, config)}
                  voices={voices}
                  savedVoices={savedVoices}
                />
              )}

              {selectedNode.data.nodeType === 'knowledge_base' && (
                <KnowledgeBasePanel
                  config={nodeConfig[selectedNode.id] || {}}
                  onChange={(config) => updateNodeConfig(selectedNode.id, config)}
                  knowledgeBases={knowledgeBases}
                />
              )}

              {selectedNode.data.nodeType === 'run_workflow' && (
                <WorkflowPanel
                  config={nodeConfig[selectedNode.id] || {}}
                  onChange={(config) => updateNodeConfig(selectedNode.id, config)}
                  workflows={workflows}
                />
              )}

              {selectedNode.data.nodeType === 'save_to_crm' && (
                <CRMPanel
                  config={nodeConfig[selectedNode.id] || {}}
                  onChange={(config) => updateNodeConfig(selectedNode.id, config)}
                  leads={leads}
                />
              )}

              {!['voice_config', 'knowledge_base', 'run_workflow', 'save_to_crm'].includes(selectedNode.data.nodeType) && (
                <GenericPanel
                  nodeType={selectedNode.data.nodeType}
                  config={nodeConfig[selectedNode.id] || {}}
                  onChange={(config) => updateNodeConfig(selectedNode.id, config)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Call Modal */}
      {showLiveCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Live Call</h3>
              <button
                onClick={() => setShowLiveCallModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={liveCallPhone}
                  onChange={(e) => setLiveCallPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Name (Optional)
                </label>
                <input
                  type="text"
                  value={liveCallName}
                  onChange={(e) => setLiveCallName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowLiveCallModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={calling}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLiveCall}
                  disabled={calling || !liveCallPhone}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {calling ? 'Calling...' : 'Initiate Call'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bulk Upload</h3>
              <button
                onClick={() => setShowBulkUploadModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkFile(e.target.files[0])}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {bulkFile ? bulkFile.name : 'Click to upload CSV'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  CSV format: name, phone, email, notes
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={calling}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={calling || !bulkFile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {calling ? 'Uploading...' : 'Start Calls'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Voice Configuration Panel with proper voice selection
function VoiceConfigPanel({ config, onChange, voices, savedVoices }) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'saved'
  const [previewPlaying, setPreviewPlaying] = useState(null);

  const currentVoices = activeTab === 'saved' ? savedVoices : voices;

  const filteredVoices = currentVoices.filter(voice =>
    voice.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.labels?.accent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectVoice = (voice) => {
    onChange({
      ...config,
      voiceId: voice.voiceId || voice.voice_id || voice.id,
      voiceName: voice.name,
      voiceGender: voice.labels?.gender || voice.gender,
      voiceAccent: voice.labels?.accent || voice.accent
    });
    setShowLibrary(false);
  };

  const playPreview = (voice) => {
    const previewUrl = voice.preview_url || voice.previewUrl;
    if (!previewUrl) return;

    setPreviewPlaying(voice.voiceId || voice.voice_id || voice.id);
    const audio = new Audio(previewUrl);
    audio.onended = () => setPreviewPlaying(null);
    audio.onerror = () => setPreviewPlaying(null);
    audio.play().catch(() => setPreviewPlaying(null));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Voice
        </label>
        {config.voiceId ? (
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Mic className="w-4 h-4 text-purple-600" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {config.voiceName}
              </div>
              {config.voiceAccent && (
                <div className="text-xs text-gray-500">
                  {config.voiceGender} • {config.voiceAccent}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowLibrary(true)}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center justify-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Select Voice
          </button>
        )}
      </div>

      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Voice Library</h3>
              <button onClick={() => setShowLibrary(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-4 px-4">
                <button
                  onClick={() => setActiveTab('library')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 ${
                    activeTab === 'library'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Voice Library ({voices.length})
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 ${
                    activeTab === 'saved'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Voices ({savedVoices.length})
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search voices..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.voiceId || voice.voice_id || voice.id}
                    onClick={() => handleSelectVoice(voice)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {voice.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {voice.labels?.gender || voice.gender} • {voice.labels?.accent || voice.accent || 'General'}
                        </div>
                        {voice.description && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {voice.description}
                          </div>
                        )}
                      </div>
                      {(voice.preview_url || voice.previewUrl) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playPreview(voice);
                          }}
                          className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900 rounded"
                        >
                          <Play className="w-3 h-3 text-purple-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Model
        </label>
        <select
          value={config.model || 'eleven_flash_v2'}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="eleven_flash_v2">Flash v2 (Best)</option>
          <option value="eleven_turbo_v2_5">Turbo v2.5</option>
          <option value="eleven_multilingual_v2">Multilingual</option>
        </select>
      </div>
    </div>
  );
}

// Knowledge Base Panel
function KnowledgeBasePanel({ config, onChange, knowledgeBases }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      const response = await api.post('/knowledge-base/upload', formData);

      const newDocs = [...(config.documents || []), {
        id: response.data.id,
        name: response.data.name
      }];

      onChange({ ...config, documents: newDocs });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Knowledge Base
        </label>
        <select
          value={config.knowledgeBaseId || ''}
          onChange={(e) => onChange({ ...config, knowledgeBaseId: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="">None</option>
          {knowledgeBases.map(kb => (
            <option key={kb._id} value={kb._id}>{kb.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload Document
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {config.documents && config.documents.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Documents ({config.documents.length})
          </label>
          <div className="space-y-1">
            {config.documents.map(doc => (
              <div key={doc.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded truncate">
                {doc.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Workflow Panel
function WorkflowPanel({ config, onChange, workflows }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <WorkflowIcon className="w-4 h-4 inline mr-1" />
          Select Workflow
        </label>
        <select
          value={config.workflowId || ''}
          onChange={(e) => onChange({ ...config, workflowId: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="">None</option>
          {workflows.map(wf => (
            <option key={wf._id || wf.id} value={wf._id || wf.id}>{wf.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// CRM Panel
function CRMPanel({ config, onChange, leads }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Save to CRM
        </label>
        <select
          value={config.crmAction || 'create_lead'}
          onChange={(e) => onChange({ ...config, crmAction: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="create_lead">Create Lead</option>
          <option value="update_lead">Update Lead</option>
          <option value="create_task">Create Task</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lead Status
        </label>
        <select
          value={config.leadStatus || 'new'}
          onChange={(e) => onChange({ ...config, leadStatus: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
        </select>
      </div>
    </div>
  );
}

// Generic Panel
function GenericPanel({ nodeType, config, onChange }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          Configure {nodeType.replace(/_/g, ' ')}
        </p>
      </div>
      <textarea
        value={JSON.stringify(config, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch (err) {}
        }}
        rows={6}
        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 font-mono"
      />
    </div>
  );
}

// Wrapper component
export default function AgentStudioV2(props) {
  return (
    <ReactFlowProvider>
      <AgentStudioContent {...props} />
    </ReactFlowProvider>
  );
}
