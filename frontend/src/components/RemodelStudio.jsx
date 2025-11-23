import { useState, useCallback } from 'react';
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
  Settings,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Custom Node Component for Remodely Studio
function RemodelNode({ data, id, selected }) {
  const deleteNode = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div
      className={`relative px-3 py-2 shadow-lg rounded-lg border-2 bg-card border border-border group ${
        selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''
      }`}
      style={{ borderColor: data.color, minWidth: '160px', maxWidth: '200px' }}
    >
      {/* Delete Button */}
      <button
        onClick={deleteNode}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        title="Delete node"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2">
        {data.icon}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate text-foreground">{data.label}</div>
          <div className="text-[10px] text-muted-foreground truncate">{data.description}</div>
        </div>
      </div>

      {/* Output Handle */}
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
  remodel: RemodelNode
};

// Remodely Studio Node Templates
const nodeTemplates = [
  // === AI GENERATION ===
  {
    type: 'ai_image_gen',
    label: 'AI Image Generator',
    icon: <Wand2 className="w-5 h-5 text-purple-500" />,
    color: '#a855f7',
    description: 'Generate AI images',
    category: 'AI Generation'
  },
  {
    type: 'ai_caption',
    label: 'AI Caption Writer',
    icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
    color: '#3b82f6',
    description: 'Auto-generate captions',
    category: 'AI Generation'
  },
  {
    type: 'ai_hashtag',
    label: 'Hashtag Generator',
    icon: <Sparkles className="w-5 h-5 text-pink-500" />,
    color: '#ec4899',
    description: 'Generate hashtags',
    category: 'AI Generation'
  },
  {
    type: 'ai_enhance',
    label: 'Image Enhancer',
    icon: <Palette className="w-5 h-5 text-orange-500" />,
    color: '#f97316',
    description: 'Enhance image quality',
    category: 'AI Generation'
  },

  // === CONTENT CREATION ===
  {
    type: 'photo_upload',
    label: 'Upload Photo',
    icon: <Upload className="w-5 h-5 text-green-500" />,
    color: '#10b981',
    description: 'Upload existing photo',
    category: 'Content'
  },
  {
    type: 'before_after',
    label: 'Before/After',
    icon: <Image className="w-5 h-5 text-cyan-500" />,
    color: '#06b6d4',
    description: 'Create comparison',
    category: 'Content'
  },
  {
    type: 'camera_capture',
    label: 'Take Photo',
    icon: <Camera className="w-5 h-5 text-indigo-500" />,
    color: '#6366f1',
    description: 'Capture from camera',
    category: 'Content'
  },
  {
    type: 'blog_post',
    label: 'Blog Post',
    icon: <FileText className="w-5 h-5 text-amber-500" />,
    color: '#f59e0b',
    description: 'Generate blog content',
    category: 'Content'
  },

  // === SOCIAL MEDIA ===
  {
    type: 'post_instagram',
    label: 'Post to Instagram',
    icon: <Instagram className="w-5 h-5 text-pink-500" />,
    color: '#e11d48',
    description: 'Share on Instagram',
    category: 'Social Media'
  },
  {
    type: 'post_facebook',
    label: 'Post to Facebook',
    icon: <Facebook className="w-5 h-5 text-blue-600" />,
    color: '#1d4ed8',
    description: 'Share on Facebook',
    category: 'Social Media'
  },
  {
    type: 'post_twitter',
    label: 'Post to Twitter',
    icon: <Twitter className="w-5 h-5 text-sky-500" />,
    color: '#0ea5e9',
    description: 'Tweet content',
    category: 'Social Media'
  },
  {
    type: 'post_linkedin',
    label: 'Post to LinkedIn',
    icon: <Linkedin className="w-5 h-5 text-blue-700" />,
    color: '#1e40af',
    description: 'Share professionally',
    category: 'Social Media'
  },
  {
    type: 'multi_platform',
    label: 'Multi-Platform Post',
    icon: <Share2 className="w-5 h-5 text-purple-600" />,
    color: '#9333ea',
    description: 'Post to all platforms',
    category: 'Social Media'
  },

  // === SCHEDULING ===
  {
    type: 'schedule_post',
    label: 'Schedule Post',
    icon: <Calendar className="w-5 h-5 text-emerald-500" />,
    color: '#059669',
    description: 'Schedule for later',
    category: 'Scheduling'
  },
  {
    type: 'best_time',
    label: 'Best Time Poster',
    icon: <Sparkles className="w-5 h-5 text-yellow-500" />,
    color: '#eab308',
    description: 'Auto-optimize timing',
    category: 'Scheduling'
  },

  // === EXPORT & STORAGE ===
  {
    type: 'save_gallery',
    label: 'Save to Gallery',
    icon: <Download className="w-5 h-5 text-teal-500" />,
    color: '#14b8a6',
    description: 'Save to project gallery',
    category: 'Storage'
  },
  {
    type: 'export_portfolio',
    label: 'Export Portfolio',
    icon: <FileText className="w-5 h-5 text-violet-500" />,
    color: '#7c3aed',
    description: 'Create portfolio PDF',
    category: 'Storage'
  },
];

// Main Component
function RemodelStudioFlow() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'

  // Get unique categories
  const categories = ['All', ...new Set(nodeTemplates.map(node => node.category))];

  // Filter nodes by category
  const filteredNodes = selectedCategory === 'All'
    ? nodeTemplates
    : nodeTemplates.filter(node => node.category === selectedCategory);

  const onConnect = useCallback(
    (params) => setEdges((eds) =>
      addEdge({
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#a855f7', strokeWidth: 2 }
      }, eds)
    ),
    []
  );

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, []);

  const addNode = (template) => {
    const newNode = {
      id: `${template.type}-${Date.now()}`,
      type: 'remodel',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      },
      data: {
        label: template.label,
        icon: template.icon,
        description: template.description,
        color: template.color,
        onDelete: deleteNode
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // TODO: Implement API call to save workflow
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleRun = () => {
    // TODO: Implement workflow execution
    alert('Running workflow... (Coming soon)');
  };

  const handleClear = () => {
    if (confirm('Clear all nodes?')) {
      setNodes([]);
      setEdges([]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="h-8 w-px bg-border" />
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 text-foreground"
            placeholder="Workflow Name"
          />
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-500 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Error saving
            </span>
          )}

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleRun}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Node Palette */}
        {isSidebarOpen && (
          <div className="w-80 border-r border-border bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground mb-3">Remodely Tools</h2>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-purple-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Node List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredNodes.map((template, index) => (
                <button
                  key={`${template.type}-${index}`}
                  onClick={() => addNode(template)}
                  className="w-full p-3 rounded-lg border-2 border-border bg-background hover:border-purple-500 hover:shadow-lg transition-all flex items-center gap-3 group"
                  style={{ borderLeftColor: template.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex-shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-foreground">{template.label}</div>
                    <div className="text-xs text-muted-foreground">{template.description}</div>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted"
          >
            <Background color="#a855f7" gap={16} />
            <Controls className="bg-card border border-border" />
            <MiniMap
              className="bg-card border border-border"
              nodeColor={(node) => node.data.color}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 left-4 p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-muted transition-colors z-10"
          >
            <Settings className="w-5 h-5 text-foreground" />
          </button>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Wand2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Build Your Remodely Workflow</h3>
                <p className="text-muted-foreground max-w-md">
                  Drag tools from the sidebar to create automated content workflows.<br />
                  Generate AI images, write captions, and post to social media.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapped with ReactFlowProvider
export default function RemodelStudio() {
  return (
    <ReactFlowProvider>
      <RemodelStudioFlow />
    </ReactFlowProvider>
  );
}
