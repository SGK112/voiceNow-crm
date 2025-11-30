import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Image,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Calendar,
  Wand2,
  Palette,
  Upload,
  Download,
  Share2,
  Sparkles,
  Camera,
  FileText,
  X,
  Plus,
  Save,
  Play,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Menu,
  CheckCircle,
  XCircle,
  Loader2,
  Rocket
} from 'lucide-react';

/**
 * Studio Node Templates - matching VoiceFlowBuilder pattern
 */
const NODE_TEMPLATES = [
  // AI Tools - Professional blues
  { type: 'ai_image_gen', label: 'AI Image Generator', icon: Wand2, color: '#2563eb', description: 'Generate project images', category: 'AI Tools' },
  { type: 'ai_caption', label: 'AI Caption Writer', icon: MessageSquare, color: '#1d4ed8', description: 'Auto-generate captions', category: 'AI Tools' },
  { type: 'ai_hashtag', label: 'Hashtag Generator', icon: Sparkles, color: '#3b82f6', description: 'Generate hashtags', category: 'AI Tools' },
  { type: 'ai_enhance', label: 'Image Enhancer', icon: Palette, color: '#0284c7', description: 'Enhance image quality', category: 'AI Tools' },
  // Content - Greens
  { type: 'photo_upload', label: 'Upload Photo', icon: Upload, color: '#16a34a', description: 'Upload project photo', category: 'Content' },
  { type: 'before_after', label: 'Before/After', icon: Image, color: '#15803d', description: 'Create comparison', category: 'Content' },
  { type: 'camera_capture', label: 'Take Photo', icon: Camera, color: '#22c55e', description: 'Capture from camera', category: 'Content' },
  { type: 'blog_post', label: 'Blog Post', icon: FileText, color: '#059669', description: 'Generate blog content', category: 'Content' },
  // Social Media - Platform colors
  { type: 'post_instagram', label: 'Instagram', icon: Instagram, color: '#c13584', description: 'Share on Instagram', category: 'Social' },
  { type: 'post_facebook', label: 'Facebook', icon: Facebook, color: '#1877f2', description: 'Share on Facebook', category: 'Social' },
  { type: 'post_twitter', label: 'Twitter/X', icon: Twitter, color: '#1da1f2', description: 'Post to Twitter', category: 'Social' },
  { type: 'post_linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0a66c2', description: 'Share professionally', category: 'Social' },
  { type: 'multi_platform', label: 'All Platforms', icon: Share2, color: '#475569', description: 'Post everywhere', category: 'Social' },
  // Scheduling - Amber/Orange
  { type: 'schedule_post', label: 'Schedule Post', icon: Calendar, color: '#d97706', description: 'Schedule for later', category: 'Schedule' },
  { type: 'best_time', label: 'Best Time', icon: Sparkles, color: '#b45309', description: 'Auto-optimize timing', category: 'Schedule' },
  // Export - Slate/Gray
  { type: 'save_gallery', label: 'Save to Gallery', icon: Download, color: '#475569', description: 'Save to gallery', category: 'Export' },
  { type: 'export_portfolio', label: 'Export PDF', icon: FileText, color: '#334155', description: 'Create portfolio', category: 'Export' },
];

// Get template by type
const getTemplateByType = (type) => NODE_TEMPLATES.find(t => t.type === type);

// Custom Node Component - matching VoiceFlowBuilder style
function StudioNode({ data, selected }) {
  const template = getTemplateByType(data.nodeType) || {};
  const Icon = template.icon || Wand2;
  const color = template.color || '#3b82f6';

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
        selected ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        borderColor: color,
        '--tw-ring-color': color
      }}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3" style={{ backgroundColor: color }} />

      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5" style={{ color }} />
        <div className="font-bold text-foreground text-sm">{data.label}</div>
      </div>

      <div className="text-xs text-muted-foreground">{data.description}</div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" style={{ backgroundColor: color }} />
    </div>
  );
}

const nodeTypes = {
  studio: StudioNode
};

// Main Component
function StudioFlow() {
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  const consoleEndRef = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [saveStatus, setSaveStatus] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Console panel state - matching VoiceFlowBuilder
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [consoleTab, setConsoleTab] = useState('logs');
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedNodeForInspection, setSelectedNodeForInspection] = useState(null);
  const [consoleSplitView, setConsoleSplitView] = useState(false);

  // AI Copilot state - matching VoiceFlowBuilder
  const [copilotMessages, setCopilotMessages] = useState([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotEndRef = useRef(null);

  // Configuration modal state
  const [configModal, setConfigModal] = useState(null);

  // Auto-collapse node palette on mobile, expanded on desktop
  const [showNodePalette, setShowNodePalette] = useState(window.innerWidth >= 768);

  // Add log function
  const addLog = useCallback((type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, { id: Date.now(), type, message, data, timestamp }]);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowNodePalette(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle console resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setConsoleHeight(Math.max(100, Math.min(500, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Auto-scroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Auto-scroll copilot messages
  useEffect(() => {
    if (copilotEndRef.current) {
      copilotEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages]);

  // AI Copilot handler
  const handleCopilotMessage = async () => {
    if (!copilotInput.trim()) return;

    const userMessage = copilotInput.trim();
    setCopilotInput('');

    // Add user message to chat
    setCopilotMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setCopilotLoading(true);

    try {
      // Prepare workflow context for AI
      const workflowContext = {
        workflowName,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          data: n.data,
          position: n.position
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target
        })),
        nodeCount: nodes.length,
        edgeCount: edges.length
      };

      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const suggestions = [];
      if (userMessage.toLowerCase().includes('help')) {
        suggestions.push('Try adding an Upload Photo node to start your workflow');
        suggestions.push('Connect nodes by dragging from one handle to another');
      }
      if (userMessage.toLowerCase().includes('post') || userMessage.toLowerCase().includes('social')) {
        suggestions.push('Add social media nodes like Instagram, Facebook, or LinkedIn');
        suggestions.push('Use the Schedule Post node to post at optimal times');
      }

      setCopilotMessages(prev => [...prev, {
        role: 'assistant',
        content: `I can help you build your marketing workflow. You currently have ${nodes.length} nodes and ${edges.length} connections. ${nodes.length === 0 ? 'Start by dragging nodes from the sidebar to the canvas.' : 'Keep building your workflow by connecting more nodes!'}`,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      }]);

      addLog('info', 'AI Copilot responded');

    } catch (error) {
      console.error('Copilot error:', error);
      setCopilotMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error. I'm here to help with workflow suggestions and best practices!`
      }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Autosave to localStorage every 10 seconds
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (nodes.length > 0 || edges.length > 0) {
        const workflowData = {
          workflowName,
          nodes,
          edges,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('studio_autosave', JSON.stringify(workflowData));
        setLastSaved(new Date());
        addLog('info', 'Autosaved workflow');
      }
    }, 10000);

    return () => clearInterval(autosaveInterval);
  }, [nodes, edges, workflowName, addLog]);

  const onConnect = useCallback(
    (params) => setEdges((eds) =>
      addEdge({
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        animated: true
      }, eds)
    ),
    [setEdges]
  );

  // Drag and drop handlers - matching VoiceFlowBuilder
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
      if (!type || !reactFlowInstance) return;

      const template = getTemplateByType(type);
      if (!template) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: 'studio',
        position,
        data: {
          label: template.label,
          description: template.description,
          nodeType: type,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      addLog('success', `Added ${template.label} node`);
    },
    [reactFlowInstance, setNodes, addLog]
  );

  // Click to add node (for mobile)
  const addNodeByClick = (template) => {
    const newNode = {
      id: `${template.type}-${Date.now()}`,
      type: 'studio',
      position: {
        x: Math.random() * 300 + 100,
        y: Math.random() * 200 + 100
      },
      data: {
        label: template.label,
        description: template.description,
        nodeType: template.type,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    addLog('success', `Added ${template.label} node`);
  };

  // Double-click to open configuration modal
  const onNodeDoubleClick = useCallback((event, node) => {
    setConfigModal(node);
  }, []);

  // Update node data
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
  }, [setNodes]);

  // Delete node
  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleSave = async () => {
    setSaveStatus('saving');
    addLog('info', 'Saving workflow...');
    try {
      // TODO: Implement API call to save workflow
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('saved');
      setLastSaved(new Date());
      addLog('success', 'Workflow saved successfully!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      setSaveStatus('error');
      addLog('error', 'Failed to save workflow', error.message);
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleRun = () => {
    if (nodes.length === 0) {
      addLog('warning', 'Add some tools to your workflow first!');
      alert('Add some tools to your workflow first!');
      return;
    }
    addLog('info', 'Running workflow...');
    alert('Running workflow... (Coming soon)');
  };

  const handleDeploy = async () => {
    if (nodes.length === 0) {
      addLog('warning', 'Add some tools to your workflow first!');
      alert('Add some tools to your workflow first!');
      return;
    }
    setIsDeploying(true);
    addLog('info', 'Deploying workflow...');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      addLog('success', 'Workflow deployed successfully!');
      alert('Workflow deployed successfully!');
    } catch (error) {
      addLog('error', 'Deploy failed', error.message);
      alert('Deploy failed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col bg-background" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top Toolbar - Mobile Responsive - Matching VoiceFlowBuilder */}
      <div className="bg-card/70 backdrop-blur-sm border-b border-border px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="p-1.5 sm:p-2 hover:bg-muted rounded-lg touch-manipulation"
            title="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="px-2 sm:px-3 py-1 bg-muted border border-border rounded-lg font-medium text-sm sm:text-base w-24 sm:w-auto"
            placeholder="Workflow name..."
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden md:block text-sm text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
            {lastSaved && (
              <div className="text-xs text-green-600">
                Autosaved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1 sm:gap-2 touch-manipulation disabled:opacity-50"
            title="Save Workflow"
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handleDeploy}
            disabled={isDeploying || nodes.length === 0}
            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1 sm:gap-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            title="Deploy Workflow"
          >
            {isDeploying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isDeploying ? 'Deploying...' : 'Deploy'}</span>
          </button>
          <button
            onClick={handleRun}
            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 sm:gap-2 touch-manipulation"
            title="Run Workflow"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Area - Matching VoiceFlowBuilder */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full flex flex-col">
          <div
            className="flex relative overflow-hidden"
            style={{
              height: `calc(100vh - 56px - ${consoleExpanded ? 200 : 40}px)`
            }}
          >
            {/* Collapsible Node Palette - Auto-collapsed on mobile */}
            <div className={`${showNodePalette ? 'w-48 sm:w-64' : 'w-10 sm:w-12'} bg-card/70 backdrop-blur-sm border-r border-border transition-all duration-300 overflow-hidden flex-shrink-0`}>
              <div className="p-2 h-full overflow-y-auto">
                <button
                  onClick={() => setShowNodePalette(!showNodePalette)}
                  className="w-full p-2 hover:bg-muted rounded mb-2 sticky top-0 bg-card/80 z-10"
                >
                  {showNodePalette ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {showNodePalette && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground px-2 uppercase tracking-wide">
                      Nodes
                    </h3>
                    {NODE_TEMPLATES.map((template) => {
                      const Icon = template.icon;
                      return (
                        <div
                          key={template.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, template.type)}
                          onClick={() => addNodeByClick(template)}
                          className="p-2 bg-muted border border-border rounded cursor-move hover:shadow-md hover:scale-105 transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 group-hover:scale-110 transition-transform flex-shrink-0" style={{ color: template.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-foreground truncate">{template.label}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{template.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* React Flow Canvas */}
            <div
              ref={reactFlowWrapper}
              className="flex-1"
              style={{ height: '100%', width: '100%' }}
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onNodeClick={(event, node) => {
                  setSelectedNodeForInspection(node);
                  setConsoleTab('inspector');
                  setConsoleExpanded(true);
                }}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#aaa" gap={16} />
                <Controls
                  className="!left-2 !bottom-auto !top-2 md:!left-auto md:!right-2 md:!top-auto md:!bottom-2"
                  showZoom={true}
                  showFitView={true}
                  showInteractive={false}
                />
                {/* Hide MiniMap on mobile, show on tablet and above */}
                <MiniMap
                  nodeColor={(node) => {
                    const template = getTemplateByType(node.data?.nodeType);
                    return template?.color || '#3b82f6';
                  }}
                  className="!bg-card/70 !backdrop-blur-sm !border-2 !border-border !shadow-lg !rounded-lg hidden md:block"
                  style={{
                    bottom: 10,
                    right: 10,
                    width: 120,
                    height: 80
                  }}
                />
              </ReactFlow>

              {/* Empty State */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                      <Image className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Build Your Marketing Workflow</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Drag tools from the sidebar to create automated content workflows.
                      Upload project photos, generate captions, and post to social media.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Console - Sliding Panel with Split View - Matching VoiceFlowBuilder */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-card/70 backdrop-blur-sm border-t border-border flex flex-col z-50"
        style={{
          height: consoleExpanded ? `${Math.min(consoleHeight, typeof window !== 'undefined' && window.innerWidth < 768 ? 200 : consoleHeight)}px` : '40px',
          transition: isResizing ? 'none' : 'height 0.3s ease-in-out'
        }}
      >
        {/* Resize Handle */}
        {consoleExpanded && (
          <div
            onMouseDown={() => setIsResizing(true)}
            onDoubleClick={() => setConsoleHeight(384)}
            className="h-1 w-full bg-muted hover:bg-blue-500 cursor-ns-resize transition-colors relative group"
            title="Drag to resize - Double-click to reset"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-1 bg-border group-hover:bg-blue-500 rounded-full transition-colors"></div>
            </div>
          </div>
        )}

        {/* Console Header - Always Visible */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-muted/70 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer touch-manipulation" onClick={() => setConsoleExpanded(!consoleExpanded)}>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-foreground text-[11px] sm:text-sm whitespace-nowrap">Console</h3>
            </div>

            {/* Tabs - Scrollable on mobile */}
            {consoleExpanded && (
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setConsoleTab('logs')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    consoleTab === 'logs'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Logs ({consoleLogs.length})
                </button>
                <button
                  onClick={() => setConsoleTab('workflow')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    consoleTab === 'workflow'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Workflow JSON
                </button>
                <button
                  onClick={() => setConsoleTab('inspector')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    consoleTab === 'inspector'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Node Inspector
                  {selectedNodeForInspection && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]">
                      {selectedNodeForInspection.data?.label}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setConsoleTab('copilot')}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    consoleTab === 'copilot'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  AI Copilot
                  {copilotMessages.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]">
                      {copilotMessages.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Split View Toggle Button */}
            {consoleExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConsoleSplitView(!consoleSplitView);
                  if (!consoleSplitView && consoleHeight < 300) {
                    setConsoleHeight(500);
                  }
                }}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  consoleSplitView
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-background hover:bg-muted border border-border'
                }`}
                title="Split view: Logs + AI Chat side by side"
              >
                <Menu className="h-3 w-3 rotate-90" />
                AI Copilot
              </button>
            )}
            {consoleTab === 'logs' && consoleExpanded && !consoleSplitView && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConsoleLogs([]);
                }}
                className="px-3 py-1 text-xs bg-background hover:bg-muted border border-border rounded"
              >
                Clear Logs
              </button>
            )}
            {consoleTab === 'workflow' && consoleExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const workflow = { nodes, edges, workflowName };
                  const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${workflowName.replace(/\s+/g, '-')}-workflow.json`;
                  a.click();
                }}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Export JSON
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConsoleExpanded(!consoleExpanded);
              }}
              className="p-1 hover:bg-muted rounded"
              title={consoleExpanded ? 'Minimize Console' : 'Expand Console'}
            >
              {consoleExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Console Content - Only visible when expanded */}
        {consoleExpanded && (
          <div className={`flex-1 overflow-hidden bg-background ${consoleSplitView ? 'flex' : ''}`}>

            {/* SPLIT VIEW MODE: Logs + AI Chat side by side */}
            {consoleSplitView ? (
              <>
                {/* Left Panel: Logs */}
                <div className="w-1/2 border-r border-border overflow-y-auto">
                  <div className="p-3 bg-secondary border-b border-border flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground">Logs ({consoleLogs.length})</h4>
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="p-4 font-mono text-xs">
                    {consoleLogs.length === 0 ? (
                      <div className="text-muted-foreground text-center py-8">
                        No logs yet
                      </div>
                    ) : (
                      consoleLogs.map((log) => (
                        <div
                          key={log.id}
                          className="mb-2 flex gap-2 cursor-move hover:bg-secondary/50 p-1 rounded"
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`);
                          }}
                          title="Drag to AI chat to discuss this log"
                        >
                          <span className="text-muted-foreground">[{log.timestamp}]</span>
                          <span className={
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                            log.type === 'info' ? 'text-blue-400' :
                            'text-foreground'
                          }>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={consoleEndRef} />
                  </div>
                </div>

                {/* Right Panel: AI Chat */}
                <div className="w-1/2 flex flex-col">
                  <div className="p-3 bg-secondary border-b border-border flex-shrink-0">
                    <h4 className="text-xs font-semibold text-foreground">AI Copilot</h4>
                  </div>

                  {/* AI Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {copilotMessages.length === 0 ? (
                      <div className="text-muted-foreground flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg">
                          AI
                        </div>
                        <div className="text-sm max-w-md">
                          <p className="font-semibold text-foreground mb-2 text-center">AI Workflow Copilot</p>
                          <p className="text-center text-xs">Drag logs from the left panel to ask questions!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {copilotMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                                AI
                              </div>
                            )}
                            <div className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-secondary text-foreground'
                            }`}>
                              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border space-y-2">
                                  <div className="text-xs font-semibold text-blue-400">Suggestions:</div>
                                  {msg.suggestions.map((suggestion, sidx) => (
                                    <div key={sidx} className="text-xs bg-background p-2 rounded">
                                      {suggestion}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {msg.role === 'user' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">
                                You
                              </div>
                            )}
                          </div>
                        ))}
                        {copilotLoading && (
                          <div className="flex gap-3 justify-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                              AI
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={copilotEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="border-t border-border p-3 bg-muted/50 flex-shrink-0">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={copilotInput}
                        onChange={(e) => setCopilotInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCopilotMessage();
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const text = e.dataTransfer.getData('text/plain');
                          if (text) {
                            setCopilotInput(prev => prev + (prev ? '\n' : '') + text);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        placeholder="Ask about your workflow..."
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleCopilotMessage}
                        disabled={copilotLoading || !copilotInput.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm"
                      >
                        {copilotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* REGULAR TAB MODE */
              <>
                {/* Logs Tab */}
                {consoleTab === 'logs' && (
                  <div className="p-4 font-mono text-xs overflow-y-auto h-full">
                    {consoleLogs.length === 0 ? (
                      <div className="text-muted-foreground text-center py-8">
                        No logs yet. Actions will be logged here.
                      </div>
                    ) : (
                      consoleLogs.map((log) => (
                        <div key={log.id} className="mb-2 flex gap-2">
                          <span className="text-muted-foreground">[{log.timestamp}]</span>
                          <span className={
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                            log.type === 'info' ? 'text-blue-400' :
                            'text-foreground'
                          }>
                            {log.message}
                          </span>
                          {log.data && (
                            <details className="text-muted-foreground cursor-pointer">
                              <summary className="hover:text-foreground">View Data</summary>
                              <pre className="mt-1 ml-4 text-[10px] text-cyan-400">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={consoleEndRef} />
                  </div>
                )}

                {/* Workflow JSON Tab */}
                {consoleTab === 'workflow' && (
                  <div className="p-4 font-mono text-xs overflow-y-auto h-full">
                    <pre className="text-green-400">
                      {JSON.stringify({ workflowName, nodes, edges }, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Node Inspector Tab */}
                {consoleTab === 'inspector' && (
                  <div className="p-4 overflow-y-auto h-full">
                    {selectedNodeForInspection ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">Selected Node</h4>
                          <div className="bg-muted p-3 rounded-lg space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">ID:</span>
                              <span className="text-xs font-mono">{selectedNodeForInspection.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Type:</span>
                              <span className="text-xs font-mono">{selectedNodeForInspection.data?.nodeType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Label:</span>
                              <span className="text-xs">{selectedNodeForInspection.data?.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Position:</span>
                              <span className="text-xs font-mono">
                                x: {Math.round(selectedNodeForInspection.position?.x)}, y: {Math.round(selectedNodeForInspection.position?.y)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">Node Data</h4>
                          <pre className="bg-muted p-3 rounded-lg text-xs font-mono text-green-400 overflow-x-auto">
                            {JSON.stringify(selectedNodeForInspection.data, null, 2)}
                          </pre>
                        </div>
                        <button
                          onClick={() => {
                            setNodes((nds) => nds.filter((n) => n.id !== selectedNodeForInspection.id));
                            setEdges((eds) => eds.filter((e) => e.source !== selectedNodeForInspection.id && e.target !== selectedNodeForInspection.id));
                            addLog('info', `Deleted node: ${selectedNodeForInspection.data?.label}`);
                            setSelectedNodeForInspection(null);
                          }}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Node
                        </button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-8">
                        Click on a node to inspect its properties
                      </div>
                    )}
                  </div>
                )}

                {/* AI Copilot Tab */}
                {consoleTab === 'copilot' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {copilotMessages.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center py-8 space-y-4">
                          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl">
                            AI
                          </div>
                          <div className="text-sm max-w-md text-center">
                            <p className="font-semibold text-foreground mb-2">AI Workflow Copilot</p>
                            <p className="text-xs">Ask me anything about building your marketing workflow.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {copilotMessages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {msg.role === 'assistant' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                                  AI
                                </div>
                              )}
                              <div className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-muted text-foreground'
                              }`}>
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                                    <div className="text-xs font-semibold text-blue-400">Suggestions:</div>
                                    {msg.suggestions.map((suggestion, sidx) => (
                                      <div key={sidx} className="text-xs bg-background p-2 rounded">
                                        {suggestion}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {msg.role === 'user' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">
                                  You
                                </div>
                              )}
                            </div>
                          ))}
                          {copilotLoading && (
                            <div className="flex gap-3 justify-start">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                                AI
                              </div>
                              <div className="bg-muted rounded-lg p-3">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div ref={copilotEndRef} />
                    </div>

                    <div className="border-t border-border p-3 bg-muted/50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={copilotInput}
                          onChange={(e) => setCopilotInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCopilotMessage();
                            }
                          }}
                          placeholder="Ask about your workflow..."
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleCopilotMessage}
                          disabled={copilotLoading || !copilotInput.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm"
                        >
                          {copilotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {configModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setConfigModal(null)}>
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-3">
                {(() => {
                  const template = getTemplateByType(configModal.data?.nodeType);
                  const Icon = template?.icon || Wand2;
                  return (
                    <>
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${template?.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: template?.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{configModal.data?.label}</h3>
                        <p className="text-xs text-muted-foreground">{configModal.data?.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setConfigModal(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Node-specific configuration based on type */}
              {configModal.data?.nodeType === 'ai_image_gen' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Image Style</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      value={configModal.data?.style || 'realistic'}
                      onChange={(e) => updateNodeData(configModal.id, { style: e.target.value })}
                    >
                      <option value="realistic">Realistic</option>
                      <option value="professional">Professional</option>
                      <option value="artistic">Artistic</option>
                      <option value="before-after">Before/After Style</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Prompt Template</label>
                    <textarea
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                      rows={3}
                      placeholder="Describe the image style you want..."
                      value={configModal.data?.promptTemplate || ''}
                      onChange={(e) => updateNodeData(configModal.id, { promptTemplate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {configModal.data?.nodeType === 'ai_caption' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Caption Tone</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      value={configModal.data?.tone || 'professional'}
                      onChange={(e) => updateNodeData(configModal.id, { tone: e.target.value })}
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="informative">Informative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Include Hashtags</label>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border"
                      checked={configModal.data?.includeHashtags || false}
                      onChange={(e) => updateNodeData(configModal.id, { includeHashtags: e.target.checked })}
                    />
                  </div>
                </div>
              )}

              {(configModal.data?.nodeType === 'post_instagram' ||
                configModal.data?.nodeType === 'post_facebook' ||
                configModal.data?.nodeType === 'post_twitter' ||
                configModal.data?.nodeType === 'post_linkedin') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Account</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      value={configModal.data?.account || ''}
                      onChange={(e) => updateNodeData(configModal.id, { account: e.target.value })}
                    >
                      <option value="">Select account...</option>
                      <option value="main">Main Business Account</option>
                      <option value="secondary">Secondary Account</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Post Type</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      value={configModal.data?.postType || 'image'}
                      onChange={(e) => updateNodeData(configModal.id, { postType: e.target.value })}
                    >
                      <option value="image">Image Post</option>
                      <option value="carousel">Carousel</option>
                      <option value="story">Story</option>
                      <option value="reel">Reel/Video</option>
                    </select>
                  </div>
                </div>
              )}

              {configModal.data?.nodeType === 'schedule_post' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Schedule Type</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      value={configModal.data?.scheduleType || 'immediate'}
                      onChange={(e) => updateNodeData(configModal.id, { scheduleType: e.target.value })}
                    >
                      <option value="immediate">Post Immediately</option>
                      <option value="best_time">Best Time (AI Optimized)</option>
                      <option value="custom">Custom Time</option>
                    </select>
                  </div>
                  {configModal.data?.scheduleType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Date & Time</label>
                      <input
                        type="datetime-local"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        value={configModal.data?.scheduledTime || ''}
                        onChange={(e) => updateNodeData(configModal.id, { scheduledTime: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}

              {configModal.data?.nodeType === 'photo_upload' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Upload Source</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      value={configModal.data?.source || 'manual'}
                      onChange={(e) => updateNodeData(configModal.id, { source: e.target.value })}
                    >
                      <option value="manual">Manual Upload</option>
                      <option value="crm">From CRM Project</option>
                      <option value="gallery">From Gallery</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Generic configuration for other nodes */}
              {!['ai_image_gen', 'ai_caption', 'post_instagram', 'post_facebook', 'post_twitter', 'post_linkedin', 'schedule_post', 'photo_upload'].includes(configModal.data?.nodeType) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Configuration options for this node type coming soon.</p>
                  <p className="text-xs mt-2">Node Type: {configModal.data?.nodeType}</p>
                </div>
              )}

              {/* Node Info */}
              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Node ID:</span>
                    <span className="font-mono">{configModal.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span className="font-mono">
                      x: {Math.round(configModal.position?.x)}, y: {Math.round(configModal.position?.y)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/50">
              <button
                onClick={() => {
                  deleteNode(configModal.id);
                  addLog('info', `Deleted node: ${configModal.data?.label}`);
                  setConfigModal(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => {
                  addLog('success', `Configured ${configModal.data?.label}`);
                  setConfigModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapped with ReactFlowProvider
export default function RemodelStudio() {
  return (
    <ReactFlowProvider>
      <StudioFlow />
    </ReactFlowProvider>
  );
}
