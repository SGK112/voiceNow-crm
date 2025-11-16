import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdvancedTutorial from '@/components/AdvancedTutorial';
import {
  Users, Mail, MessageSquare, Clock, Zap, User, Phone, CheckCircle, AlertCircle,
  Save, Play, Pause, Search, Plus, Settings, ArrowRight, Bot, Sparkles, Rocket,
  X, Volume2, Mic, ChevronLeft, ChevronRight, Loader2, Target, FileText, Code,
  FolderOpen, FilePlus
} from 'lucide-react';

// ============================================
// CUSTOM NODE COMPONENTS
// ============================================

const LeadNode = ({ data, id, selected }) => (
  <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-blue-500 min-w-[200px] group ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
    {data.onDelete && (
      <button
        onClick={() => data.onDelete(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
      >
        <X className="w-3 h-3" />
      </button>
    )}
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />
    <div className="flex items-center gap-2 mb-2">
      <User className="h-4 w-4 text-blue-600" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      <div>{data.email}</div>
      <div>{data.phone}</div>
      <Badge variant="outline" className="mt-1 capitalize">{data.status}</Badge>
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
  </div>
);

const StageNode = ({ data, id, selected }) => {
  const stageColors = {
    new: 'border-gray-500 bg-gray-50',
    contacted: 'border-blue-500 bg-blue-50',
    qualified: 'border-purple-500 bg-purple-50',
    proposal_sent: 'border-yellow-500 bg-yellow-50',
    negotiation: 'border-orange-500 bg-orange-50',
    converted: 'border-green-500 bg-green-50'
  };

  return (
    <div className={`relative px-6 py-4 shadow-lg rounded-lg border-2 ${stageColors[data.stage] || 'border-gray-500 bg-gray-50'} min-w-[180px] group ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
      {data.onDelete && (
        <button
          onClick={() => data.onDelete(id)}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5" />
        <div className="font-bold">{data.label}</div>
      </div>
      <div className="text-xs text-gray-600">{data.count || 0} leads</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
};

const AIAgentNode = ({ data, id, selected }) => (
  <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-purple-500 min-w-[200px] group ${selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''}`}>
    {data.onDelete && (
      <button
        onClick={() => data.onDelete(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
      >
        <X className="w-3 h-3" />
      </button>
    )}
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-500" />
    <div className="flex items-center gap-2 mb-2">
      <Bot className="h-4 w-4 text-purple-600" />
      <div className="font-semibold text-sm">AI Voice Agent</div>
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      <div className="font-medium">{data.agentName || 'Voice Agent'}</div>
      <div className="text-xs text-gray-500">{data.purpose || 'Follow-up call'}</div>
      {data.voice && (
        <Badge variant="secondary" className="mt-1">
          <Volume2 className="w-3 h-3 mr-1" />
          {data.voice}
        </Badge>
      )}
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />
  </div>
);

const DripCampaignNode = ({ data, id, selected }) => (
  <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-indigo-500 min-w-[200px] group ${selected ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
    {data.onDelete && (
      <button
        onClick={() => data.onDelete(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
      >
        <X className="w-3 h-3" />
      </button>
    )}
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-indigo-500" />
    <div className="flex items-center gap-2 mb-2">
      <Mail className="h-4 w-4 text-indigo-600" />
      <div className="font-semibold text-sm">Drip Campaign</div>
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      <div>{data.name || 'Email & SMS Sequence'}</div>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary">{data.emailCount || 3} emails</Badge>
        <Badge variant="secondary">{data.smsCount || 2} SMS</Badge>
      </div>
      <div className="text-xs text-gray-500 mt-1">Duration: {data.duration || '7 days'}</div>
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-indigo-500" />
  </div>
);

const NotificationNode = ({ data, id, selected }) => (
  <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-yellow-500 min-w-[180px] group ${selected ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
    {data.onDelete && (
      <button
        onClick={() => data.onDelete(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
      >
        <X className="w-3 h-3" />
      </button>
    )}
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-yellow-500" />
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <div className="font-semibold text-sm">Notify Human</div>
    </div>
    <div className="text-xs text-gray-600">
      <div>{data.message || 'Lead requires attention'}</div>
      <Badge variant="outline" className="mt-2">{data.notifyType || 'Email + SMS'}</Badge>
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-yellow-500" />
  </div>
);

const DelayNode = ({ data, id, selected }) => (
  <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-gray-400 min-w-[160px] group ${selected ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}>
    {data.onDelete && (
      <button
        onClick={() => data.onDelete(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
      >
        <X className="w-3 h-3" />
      </button>
    )}
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-500" />
    <div className="flex items-center gap-2 mb-2">
      <Clock className="h-4 w-4 text-gray-600" />
      <div className="font-semibold text-sm">Wait</div>
    </div>
    <div className="text-xs text-gray-600">{data.duration || '1 day'}</div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-gray-500" />
  </div>
);

const WorkflowTriggerNode = ({ data, id, selected }) => (
  <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-green-500 min-w-[180px] group ${selected ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}>
    {data.onDelete && (
      <button
        onClick={() => data.onDelete(id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
      >
        <X className="w-3 h-3" />
      </button>
    )}
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-green-500" />
    <div className="flex items-center gap-2 mb-2">
      <Zap className="h-4 w-4 text-green-600" />
      <div className="font-semibold text-sm">Workflow Trigger</div>
    </div>
    <div className="text-xs text-gray-600">
      <div>{data.triggerType || 'n8n Workflow'}</div>
      {data.workflowName && (
        <Badge variant="secondary" className="mt-1">{data.workflowName}</Badge>
      )}
    </div>
  </div>
);

const nodeTypes = {
  lead: LeadNode,
  stage: StageNode,
  aiAgent: AIAgentNode,
  drip: DripCampaignNode,
  notification: NotificationNode,
  delay: DelayNode,
  workflowTrigger: WorkflowTriggerNode
};

// ============================================
// AI ASSISTANT MODAL
// ============================================

const AIWorkflowAssistant = ({ onClose, onGenerate }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const exampleWorkflows = [
    { title: 'Lead Nurture', desc: 'When new lead is added, call them with AI agent, then send drip email campaign over 5 days' },
    { title: 'Qualified Lead Router', desc: 'After AI call, if lead is qualified, notify sales team and create deal, otherwise add to nurture campaign' },
    { title: 'Appointment Follow-up', desc: 'After appointment is booked, send confirmation SMS, call 1 day before as reminder, then follow up after meeting' }
  ];

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert('Please describe your CRM workflow');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai/generate-crm-workflow', {
        description,
        context: { type: 'crm-automation' }
      });

      if (response.data.workflow) {
        onGenerate(response.data.workflow);
        onClose();
      }
    } catch (error) {
      console.error('Error generating workflow:', error);
      alert('Failed to generate workflow. Creating basic template...');
      // Fallback to basic template
      onGenerate({
        nodes: [],
        edges: [],
        name: 'AI Generated Workflow'
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">AI CRM Workflow Builder</h2>
                  <p className="text-blue-100 text-sm mt-1">Powered by Claude AI</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <p className="text-white/90 text-sm">
              Describe your CRM automation and let AI build the workflow for you
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe Your CRM Workflow
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: When a lead fills out our form, I want to call them with an AI agent. If they're qualified, notify my sales team and add them to a 5-day email sequence..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Or try an example:
            </p>
            <div className="grid grid-cols-1 gap-3">
              {exampleWorkflows.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(example.desc)}
                  className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {example.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {example.desc}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Workflow...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Generate Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

function CRMWorkflowBuilderHybridContent() {
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef(null);
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState('My CRM Workflow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Fetch leads
  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-workflow'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data;
    }
  });

  const leads = leadsData?.leads || [];

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-workflow'],
    queryFn: async () => {
      const res = await api.get('/agents');
      return res.data;
    }
  });

  // Fetch saved workflows
  const { data: savedWorkflows = [] } = useQuery({
    queryKey: ['crm-workflows'],
    queryFn: async () => {
      const res = await api.get('/crm-workflows');
      return res.data.workflows || [];
    }
  });

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed }
          },
          eds
        )
      ),
    [setEdges]
  );

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow-data') || '{}');

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          ...data,
          onDelete: deleteNode
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, deleteNode]
  );

  const onDragStart = (event, nodeType, data) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    setSaving(true);
    try {
      // Clean node data before saving (remove onDelete functions)
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onDelete: undefined
        }
      }));

      if (currentWorkflowId) {
        // Update existing workflow
        await api.patch(`/crm-workflows/${currentWorkflowId}`, {
          name: workflowName,
          nodes: cleanNodes,
          edges
        });
        alert('Workflow updated successfully!');
      } else {
        // Create new workflow
        const response = await api.post('/crm-workflows', {
          name: workflowName,
          nodes: cleanNodes,
          edges
        });
        setCurrentWorkflowId(response.data.workflow._id);
        alert('Workflow saved successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['crm-workflows'] });
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert(`Failed to save workflow: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const loadWorkflow = async (workflowId) => {
    try {
      const response = await api.get(`/crm-workflows/${workflowId}`);
      const workflow = response.data.workflow;

      // Restore node data with onDelete function
      const restoredNodes = workflow.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onDelete: deleteNode
        }
      }));

      setNodes(restoredNodes);
      setEdges(workflow.edges);
      setWorkflowName(workflow.name);
      setCurrentWorkflowId(workflow._id);
      alert(`Loaded workflow: ${workflow.name}`);
    } catch (error) {
      console.error('Error loading workflow:', error);
      alert('Failed to load workflow');
    }
  };

  const createNewWorkflow = () => {
    if (nodes.length > 0 || edges.length > 0) {
      if (!confirm('Create new workflow? Current progress will be lost.')) {
        return;
      }
    }
    setNodes([]);
    setEdges([]);
    setWorkflowName('My CRM Workflow');
    setCurrentWorkflowId(null);
  };

  const handleAIGenerate = (generatedWorkflow) => {
    if (generatedWorkflow.nodes) {
      setNodes(generatedWorkflow.nodes.map(node => ({
        ...node,
        data: { ...node.data, onDelete: deleteNode }
      })));
    }
    if (generatedWorkflow.edges) {
      setEdges(generatedWorkflow.edges);
    }
  };

  // Comprehensive Tutorial Steps
  const tutorialSteps = [
    {
      title: 'Welcome to the CRM Workflow Builder',
      category: 'Introduction',
      duration: '30 sec',
      icon: Rocket,
      description: 'This is your visual automation platform. You can drag leads, add AI voice calling, create drip email campaigns, and build complete sales workflows - all without code. Every element connects visually so you can see exactly how your automation flows.',
      bullets: [
        'Build workflows by dragging elements from the left sidebar',
        'Connect elements together to create automation sequences',
        'Save workflows and reuse them across your business',
        'Let AI assist you when you need help'
      ],
      tip: 'You can pause this tutorial at any time and replay it from the help button (bottom right).',
      target: null
    },
    {
      title: 'The Sidebar: Your Toolkit',
      category: 'Interface',
      duration: '45 sec',
      icon: Users,
      target: '.w-80.border-r', // Left sidebar
      description: 'The left sidebar contains everything you need to build workflows. At the top, you\'ll find all your CRM leads. Below that are automation nodes like AI agents, drip campaigns, and notifications. At the bottom, you\'ll see all your saved workflows.',
      action: 'Look at the sidebar on the left - see the search box, leads list, automation nodes, and saved workflows.',
      bullets: [
        'Search for specific leads using the search box',
        'Scroll through your leads list',
        'Browse automation nodes (AI agents, drip campaigns, etc.)',
        'Access previously saved workflows at the bottom'
      ],
      tip: 'You can collapse the sidebar using the arrow button to get more canvas space.'
    },
    {
      title: 'Dragging Your First Lead',
      category: 'Getting Started',
      duration: '1 min',
      icon: User,
      target: '.p-3.bg-blue-50', // Lead card
      description: 'Leads are the starting point of any workflow. Click and hold any lead card, then drag it onto the canvas (the gray area on the right). When you release, the lead appears as a blue node showing their name, email, phone, and status.',
      action: 'Try it now: Click and drag any lead from the sidebar onto the canvas.',
      bullets: [
        'Each lead shows their contact information',
        'The status badge indicates where they are in your pipeline',
        'Leads can be connected to multiple automation steps',
        'You can delete nodes by hovering and clicking the X button'
      ],
      warning: 'Make sure to drag leads onto the gray canvas area, not into empty space.',
      tip: 'Leads update in real-time from your CRM, so new leads appear automatically.'
    },
    {
      title: 'Adding AI Voice Agents',
      category: 'Automation',
      duration: '1 min',
      icon: Bot,
      target: '.p-3.bg-purple-50', // AI Agent node in sidebar
      description: 'AI Voice Agents make automated phone calls to your leads. When you drag an AI Voice Agent onto the canvas, you\'re creating a step that will call leads using natural AI conversation. The agent can qualify leads, book appointments, or handle support - all automatically.',
      action: 'Drag the "AI Voice Agent" node onto the canvas next to your lead.',
      bullets: [
        'AI agents use ElevenLabs for realistic voice',
        'Configure what the agent says and asks',
        'Agents can qualify leads based on responses',
        'Call results sync back to your CRM automatically'
      ],
      tip: 'Click the AI Assistant button to let AI suggest what your agent should say based on your business goals.'
    },
    {
      title: 'Connecting Elements Together',
      category: 'Workflow Building',
      duration: '1 min 30 sec',
      icon: Zap,
      target: null,
      description: 'To create a workflow, connect nodes together. Each node has small circles (handles) on the left and right sides. Click and drag from the right handle of one node to the left handle of another node. An animated arrow appears showing the flow direction.',
      action: 'Connect your lead node to the AI agent node by dragging from one handle to another.',
      bullets: [
        'Arrows show the automation flow direction',
        'Multiple nodes can connect to one node (branching)',
        'One node can connect to multiple nodes (parallel actions)',
        'Delete connections by selecting the arrow and pressing Delete'
      ],
      warning: 'Connections only work from right handles (source) to left handles (target).',
      tip: 'Hold Shift while connecting to create straight lines instead of curved ones.'
    },
    {
      title: 'Adding Drip Campaigns',
      category: 'Marketing Automation',
      duration: '1 min',
      icon: Mail,
      target: '.p-3.bg-indigo-50', // Drip campaign node
      description: 'Drip Campaigns send automated email and SMS sequences over time. Drag a Drip Campaign node onto the canvas and connect it after your AI call. The campaign will automatically send follow-up messages to nurture leads through your sales process.',
      action: 'Drag a "Drip Campaign" node and connect it after the AI agent.',
      bullets: [
        'Campaigns can include both emails and SMS',
        'Set the duration (e.g., 7 days, 14 days)',
        'Customize message count and timing',
        'Track open rates and engagement'
      ],
      tip: 'Combine drip campaigns with delay nodes to space out communications naturally.'
    },
    {
      title: 'Using Delay & Timing',
      category: 'Workflow Control',
      duration: '45 sec',
      icon: Clock,
      target: '.p-3.bg-gray-50:has(.lucide-clock)', // Delay node
      description: 'Delay nodes add wait times between actions. If you want to wait 2 days after an AI call before sending an email, add a delay node in between. This prevents overwhelming leads and makes your automation feel more human.',
      action: 'Add a Delay node between two automation steps.',
      bullets: [
        'Set delays in minutes, hours, or days',
        'Use delays to space out communications',
        'Create natural follow-up timings',
        'Combine with conditional logic for smart timing'
      ],
      tip: 'Industry best practice: Wait at least 24 hours between cold outreach attempts.'
    },
    {
      title: 'Human Notifications',
      category: 'Team Collaboration',
      duration: '45 sec',
      icon: AlertCircle,
      target: '.p-3.bg-yellow-50', // Notification node
      description: 'Not everything should be automated. Notification nodes alert your team when human intervention is needed - like when a lead is qualified and ready for a sales call, or when a high-value opportunity needs personal attention.',
      action: 'Add a "Notify Human" node to alert your team.',
      bullets: [
        'Send notifications via email and SMS',
        'Customize the alert message',
        'Route to specific team members',
        'Track response times'
      ],
      tip: 'Use notifications after qualification steps to hand off hot leads to your sales team immediately.'
    },
    {
      title: 'Naming & Saving Workflows',
      category: 'Workflow Management',
      duration: '1 min',
      icon: Save,
      target: 'input[placeholder="Workflow name..."]', // Workflow name input
      description: 'Every workflow needs a clear name. Click the name input at the top right and enter a descriptive name like "New Lead Welcome Sequence" or "Cold Lead Re-engagement". Then click the Save button. Your workflow is now saved to the database and appears in the Saved Workflows section.',
      action: 'Name your workflow and click the "Save" button to store it.',
      bullets: [
        'Use descriptive names that explain the workflow purpose',
        'Saved workflows appear in the sidebar',
        'Click any saved workflow to load and edit it',
        'The "Update" button appears when editing existing workflows'
      ],
      warning: 'Always save your work! Workflows are not auto-saved.',
      tip: 'Use naming conventions like "[Purpose] - [Target]" (e.g., "Follow-up - Qualified Leads").'
    },
    {
      title: 'Loading Saved Workflows',
      category: 'Workflow Management',
      duration: '45 sec',
      icon: FolderOpen,
      target: '.border-t.border-border:has(.lucide-folder-open)', // Saved workflows section
      description: 'All your saved workflows appear at the bottom of the left sidebar. Each shows the workflow name, number of nodes/connections, and last update date. Click any workflow to load it onto the canvas. A green "Active" badge means the workflow is currently running.',
      action: 'Scroll to the "Saved Workflows" section and see your saved workflows.',
      bullets: [
        'Click to load any workflow',
        'See node and connection counts',
        'Active workflows show a green badge',
        'Sort by name or date modified'
      ],
      tip: 'Create template workflows that you can duplicate and customize for different campaigns.'
    },
    {
      title: 'The AI Assistant: Your Workflow Co-Pilot',
      category: 'AI Features',
      duration: '1 min 30 sec',
      icon: Sparkles,
      target: 'button:has(.lucide-sparkles)', // AI Assistant button
      description: 'Not sure how to build a workflow? Click the "AI Assistant" button and describe what you want in plain English. For example: "When a new lead comes in, call them with an AI agent, then send a 3-email drip campaign over 5 days." The AI will automatically build the workflow for you.',
      action: 'Click the "AI Assistant" button to try it.',
      bullets: [
        'Describe workflows in natural language',
        'AI suggests optimal node configurations',
        'Get example workflows for common scenarios',
        'AI learns from your business context'
      ],
      tip: 'Be specific about timing and actions. Instead of "follow up with leads," say "wait 2 days, then send an email, then call them."',
      warning: 'Review AI-generated workflows before activating them to ensure they match your needs.'
    },
    {
      title: 'Testing Your Workflows',
      category: 'Quality Assurance',
      duration: '1 min',
      icon: Play,
      target: null,
      description: 'Before activating a workflow for all leads, test it! Click the Test button to run a simulation with sample data. You\'ll see exactly how the workflow executes, timing between steps, and what messages get sent. Fix any issues before going live.',
      bullets: [
        'Test mode doesn\'t actually contact leads',
        'See the exact flow and timing',
        'Verify all connections work correctly',
        'Check message content and formatting'
      ],
      tip: 'Always test workflows after making changes, even small ones.'
    },
    {
      title: 'Workflow Canvas Controls',
      category: 'Advanced Features',
      duration: '1 min',
      icon: Settings,
      description: 'The canvas has powerful controls for managing your workflows. Use the minimap (bottom right) to navigate large workflows. The zoom controls let you zoom in for details or zoom out to see the big picture. Click "Fit View" to automatically size the canvas to show all nodes.',
      bullets: [
        'Minimap: Navigate large workflows quickly',
        'Zoom: +/- buttons or mouse wheel',
        'Fit View: Auto-size to show all nodes',
        'Grid: Snap nodes to grid for clean layouts'
      ],
      tip: 'Use Ctrl+Scroll (Cmd+Scroll on Mac) to zoom in and out quickly.'
    },
    {
      title: 'Best Practices for CRM Automation',
      category: 'Pro Tips',
      duration: '2 min',
      icon: Target,
      description: 'To build effective workflows, follow these proven strategies: Start simple (one lead → one action), test extensively, monitor performance, and iterate based on results. Don\'t automate everything - use human notifications for high-value interactions. Space out communications to avoid overwhelming leads.',
      bullets: [
        'Start with simple workflows and add complexity gradually',
        'Test every workflow before activating',
        'Monitor performance metrics (conversion rates, response times)',
        'Use delays to create natural communication rhythms',
        'Keep human oversight for important decisions',
        'Document your workflows with clear names and descriptions'
      ],
      tip: 'The best workflows combine automation efficiency with human touch at critical moments.',
      warning: 'Over-automation can feel impersonal. Balance automated outreach with personal interactions.'
    },
    {
      title: 'You\'re Ready to Build!',
      category: 'Completion',
      duration: '30 sec',
      icon: Rocket,
      description: 'Congratulations! You now know how to build powerful CRM automation workflows. Start by creating a simple workflow for new leads, then expand as you see results. Remember: the help button (?) is always available if you need to replay this tutorial or get assistance.',
      bullets: [
        'Build your first workflow for new lead onboarding',
        'Test it thoroughly before activating',
        'Monitor results and optimize over time',
        'Use the AI assistant when you need ideas',
        'Access this tutorial anytime from the help button'
      ],
      tip: 'Join our community to share workflows and learn from other users!'
    }
  ];

  return (
    <AdvancedTutorial
      tutorialKey="crm-workflow-builder-hybrid"
      title="CRM Workflow Builder Tutorial"
      steps={tutorialSteps}
    >
      {showAIAssistant && (
        <AIWorkflowAssistant
          onClose={() => setShowAIAssistant(false)}
          onGenerate={handleAIGenerate}
        />
      )}

      <div className="flex h-screen bg-background">
        {/* Left Sidebar */}
        <div className={`${showLeftPanel ? 'w-80' : 'w-0'} border-r border-border bg-card flex flex-col transition-all duration-300 overflow-hidden`}>
          {showLeftPanel && (
            <>
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">CRM Workflow Builder</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLeftPanel(false)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Drag leads and automation nodes to create AI-powered workflows
                </p>
                <Button
                  onClick={() => setShowAIAssistant(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              </div>

              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Leads Section */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Leads
                  </h3>
                  <div className="space-y-2">
                    {filteredLeads.slice(0, 20).map((lead) => (
                      <div
                        key={lead._id}
                        draggable
                        onDragStart={(e) => onDragStart(e, 'lead', {
                          label: lead.name,
                          email: lead.email,
                          phone: lead.phone,
                          status: lead.status,
                          leadId: lead._id
                        })}
                        className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium text-sm">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                        <Badge variant="outline" className="mt-1 capitalize text-xs">
                          {lead.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Automation Nodes Section */}
                <div className="p-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Automation Nodes
                  </h3>
                  <div className="space-y-2">
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'aiAgent', {
                        agentName: 'AI Sales Agent',
                        purpose: 'Qualify leads',
                        voice: 'Eric'
                      })}
                      className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <span className="font-medium text-sm">AI Voice Agent</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Automated AI calling</p>
                    </div>

                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'stage', {
                        label: 'New Stage',
                        stage: 'new',
                        count: 0
                      })}
                      className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-sm">Stage Container</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Group leads by stage</p>
                    </div>

                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'drip', {
                        name: 'Email & SMS Campaign',
                        emailCount: 3,
                        smsCount: 2,
                        duration: '7 days'
                      })}
                      className="p-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium text-sm">Drip Campaign</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Automated email/SMS sequence</p>
                    </div>

                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'notification', {
                        message: 'Lead requires attention',
                        notifyType: 'Email + SMS'
                      })}
                      className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium text-sm">Notify Human</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Alert team member</p>
                    </div>

                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'delay', {
                        duration: '1 day'
                      })}
                      className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium text-sm">Wait/Delay</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Add time delay</p>
                    </div>

                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'workflowTrigger', {
                        triggerType: 'n8n Workflow',
                        workflowName: 'Custom Automation'
                      })}
                      className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium text-sm">n8n Workflow</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Trigger external automation</p>
                    </div>
                  </div>
                </div>

                {/* Saved Workflows Section */}
                <div className="p-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Saved Workflows
                    </h3>
                    <Badge variant="secondary">{savedWorkflows.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {savedWorkflows.length > 0 ? (
                      savedWorkflows.map((workflow) => (
                        <div
                          key={workflow._id}
                          onClick={() => loadWorkflow(workflow._id)}
                          className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                            currentWorkflowId === workflow._id
                              ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{workflow.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {workflow.nodes?.length || 0} nodes • {workflow.edges?.length || 0} connections
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(workflow.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                            {workflow.enabled && (
                              <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        No saved workflows yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {!showLeftPanel && (
          <button
            onClick={() => setShowLeftPanel(true)}
            className="w-8 border-r border-border hover:bg-muted transition-colors flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Main Canvas */}
        <div className="flex-1 relative h-full w-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={(instance) => {}}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50 dark:bg-gray-950"
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
              style: { strokeWidth: 2, stroke: '#3b82f6' }
            }}
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'lead') return '#3b82f6';
                if (node.type === 'aiAgent') return '#9333ea';
                if (node.type === 'drip') return '#6366f1';
                if (node.type === 'notification') return '#eab308';
                if (node.type === 'workflowTrigger') return '#22c55e';
                return '#6b7280';
              }}
            />

            <Panel position="top-right" className="bg-card border border-border rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Workflow name..."
                  className="w-48 h-8 text-sm"
                />
                <Button size="sm" onClick={createNewWorkflow} variant="outline">
                  <FilePlus className="h-4 w-4 mr-1" />
                  New
                </Button>
                <Button size="sm" onClick={saveWorkflow} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      {currentWorkflowId ? 'Update' : 'Save'}
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAIAssistant(true)}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI
                </Button>
              </div>
            </Panel>

            {nodes.length === 0 && (
              <Panel position="top-center" className="bg-card border border-border rounded-lg shadow-lg p-6">
                <div className="text-center">
                  <Rocket className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Start Building Your CRM Workflow</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Drag leads and automation nodes from the sidebar
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowAIAssistant(true)}
                    className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Use AI Assistant
                  </Button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </AdvancedTutorial>
  );
}

export default function CRMWorkflowBuilderHybrid() {
  return (
    <ReactFlowProvider>
      <CRMWorkflowBuilderHybridContent />
    </ReactFlowProvider>
  );
}
