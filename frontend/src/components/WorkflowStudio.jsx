import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Play,
  Pause,
  Trash2,
  Plus,
  Zap,
  History,
  TestTube,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Menu,
  X,
  ExternalLink,
  ShoppingBag,
  Workflow as WorkflowIcon,
  Rocket
} from 'lucide-react';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Custom Node Component (compact n8n-style)
function CustomNode({ data, id, selected }) {
  const deleteNode = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div
      className={`relative px-3 py-2 shadow-lg rounded-lg border-2 bg-white dark:bg-gray-800 group ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
      style={{ borderColor: data.color, minWidth: '140px', maxWidth: '180px' }}
    >
      {/* Delete Button - shows on hover */}
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
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2">
        <span className="text-2xl">{data.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate text-gray-900 dark:text-gray-100">{data.label}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{data.description}</div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
        style={{ right: -6 }}
      />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode
};

// Available node templates - organized by category
const nodeTemplates = [
  // === TRIGGERS ===
  { type: 'trigger', label: 'Webhook Trigger', icon: '⚡', color: '#10b981', description: 'Start workflow', category: 'Triggers' },
  { type: 'schedule', label: 'Schedule', icon: '📅', color: '#10b981', description: 'Time-based trigger', category: 'Triggers' },

  // === DATA & CRM ===
  { type: 'save_lead', label: 'Save Lead', icon: '📝', color: '#3b82f6', description: 'Save to CRM', category: 'Data' },
  { type: 'update_contact', label: 'Update Contact', icon: '✏️', color: '#3b82f6', description: 'Update CRM data', category: 'Data' },
  { type: 'create_deal', label: 'Create Deal', icon: '💰', color: '#3b82f6', description: 'New opportunity', category: 'Data' },

  // === COMMUNICATION ===
  { type: 'send_sms', label: 'Send SMS', icon: '💬', color: '#8b5cf6', description: 'Text message', category: 'Communication' },
  { type: 'send_email', label: 'Send Email', icon: '📧', color: '#ec4899', description: 'Email message', category: 'Communication' },
  { type: 'make_call', label: 'Make Call', icon: '📞', color: '#8b5cf6', description: 'Voice call', category: 'Communication' },
  { type: 'multi_channel', label: 'Multi-Channel', icon: '📡', color: '#a855f7', description: 'SMS + Email + Call', category: 'Communication' },

  // === TEAM ROUTING ===
  { type: 'route_to_team', label: 'Route to Team', icon: '👥', color: '#f59e0b', description: 'Assign to team', category: 'Team' },
  { type: 'notify_team', label: 'Notify Team', icon: '🔔', color: '#f59e0b', description: 'Slack/Teams alert', category: 'Team' },
  { type: 'assign_task', label: 'Assign Task', icon: '✅', color: '#f59e0b', description: 'Create task', category: 'Team' },
  { type: 'stakeholder_router', label: 'Stakeholder Router', icon: '🎯', color: '#fb923c', description: 'Route by role', category: 'Team' },

  // === HUMAN CONTACTS ===
  { type: 'human_contact', label: 'Human Contact', icon: '👤', color: '#10b981', description: 'Add person to flow', category: 'Human' },
  { type: 'human_approval', label: 'Human Approval', icon: '✋', color: '#10b981', description: 'Wait for approval', category: 'Human' },
  { type: 'human_escalation', label: 'Escalate to Human', icon: '🆘', color: '#ef4444', description: 'Handoff to person', category: 'Human' },
  { type: 'human_notify', label: 'Notify Human', icon: '📲', color: '#10b981', description: 'Alert specific person', category: 'Human' },

  // === WORKFLOW COMPOSITION ===
  { type: 'sub_workflow', label: 'Sub-Workflow', icon: '🔄', color: '#ef4444', description: 'Run another workflow', category: 'Workflow' },
  { type: 'parallel_split', label: 'Parallel Split', icon: '⚡', color: '#06b6d4', description: 'Run multiple paths', category: 'Workflow' },
  { type: 'merge', label: 'Merge', icon: '🔗', color: '#06b6d4', description: 'Join parallel paths', category: 'Workflow' },
  { type: 'n8n_connect', label: 'n8n Workflow', icon: '🌐', color: '#ef4444', description: 'External n8n', category: 'Workflow' },

  // === LOGIC & CONTROL ===
  { type: 'condition', label: 'If/Then', icon: '🔀', color: '#06b6d4', description: 'Branch logic', category: 'Logic' },
  { type: 'wait', label: 'Wait', icon: '⏱️', color: '#6b7280', description: 'Delay execution', category: 'Logic' },
  { type: 'loop', label: 'Loop', icon: '🔁', color: '#6b7280', description: 'Repeat actions', category: 'Logic' },
  { type: 'custom_code', label: 'Code', icon: '💻', color: '#14b8a6', description: 'Run JavaScript', category: 'Logic' },

  // === MARKETING & PROMOTIONS ===
  { type: 'promo_campaign', label: 'Promo Campaign', icon: '🎁', color: '#ec4899', description: 'Send promotion', category: 'Marketing' },
  { type: 'drip_sequence', label: 'Drip Sequence', icon: '💧', color: '#ec4899', description: 'Nurture sequence', category: 'Marketing' },
  { type: 'segment_filter', label: 'Segment Filter', icon: '🎯', color: '#ec4899', description: 'Filter by criteria', category: 'Marketing' }
];

// AI Workflow Wizard Modal Component
function AIWorkflowWizard({ onClose, onGenerate }) {
  const [description, setDescription] = useState('');
  const [workflowType, setWorkflowType] = useState('general');
  const [loading, setLoading] = useState(false);

  const exampleWorkflows = [
    { title: 'Lead Capture', desc: 'When someone fills out a form, save as lead and send welcome email' },
    { title: 'Team Notification', desc: 'When a new deal is created, notify sales team on Slack' },
    { title: 'Follow-up Sequence', desc: 'After a call ends, wait 1 day then send follow-up SMS' },
    { title: 'Appointment Booking', desc: 'When someone requests a meeting, create calendar event and send confirmation' }
  ];

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert('Please describe what you want your workflow to do');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai/generate-workflow', {
        description,
        workflowType,
        context: {}
      });

      if (response.data.workflow) {
        onGenerate(response.data.workflow);
        onClose();
      }
    } catch (error) {
      console.error('Error generating workflow:', error);
      alert('Failed to generate workflow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Gradient Header with Rocket */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">AI Workflow Wizard</h2>
                  <p className="text-blue-100 text-sm mt-1">Powered by Claude AI</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <p className="text-white/90 text-sm">
              Describe your workflow in plain English and let AI build it for you
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Workflow Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Workflow Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['general', 'sales', 'support', 'marketing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setWorkflowType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    workflowType === type
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Description Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe Your Workflow
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: When someone fills out my contact form, save them as a lead in the CRM, send them a welcome email, and notify my team on Slack..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Be specific about triggers, actions, and conditions
            </p>
          </div>

          {/* Example Workflows */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Or try an example:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {example.desc}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
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

          {/* AI Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Pro Tip:</strong> The more detailed your description, the better the AI can create your workflow.
                Include triggers (when), actions (then), and any conditions (if).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStudioContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();

  // UI State
  const [activeTab, setActiveTab] = useState('editor'); // editor, executions, playground
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNodePalette, setShowNodePalette] = useState(false);

  // Data State
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, executions: 0 });

  // Workflow Builder State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // AI State
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showNodeAI, setShowNodeAI] = useState(false);
  const [nodeAIRequest, setNodeAIRequest] = useState('');
  const [nodeAIResponse, setNodeAIResponse] = useState(null);
  const [nodeAILoading, setNodeAILoading] = useState(false);

  // Load workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, []);

  // Load specific workflow if ID provided
  useEffect(() => {
    if (id && workflows.length > 0) {
      const workflow = workflows.find(w => w._id === id);
      if (workflow) {
        loadWorkflow(workflow);
      }
    }
  }, [id, workflows]);

  const fetchWorkflows = async () => {
    try {
      const response = await api.get('/workflows');
      const workflowData = response.data || [];
      setWorkflows(workflowData);

      const active = workflowData.filter(w => w.enabled).length;
      const totalExecutions = workflowData.reduce((sum, w) => sum + (w.executionCount || 0), 0);

      setStats({
        total: workflowData.length,
        active,
        executions: totalExecutions
      });
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  };

  const loadWorkflow = (workflow) => {
    setCurrentWorkflow(workflow);

    // Load workflow nodes and edges
    if (workflow.workflowJson && workflow.workflowJson.nodes) {
      const loadedNodes = workflow.workflowJson.nodes.map(node => ({
        ...node,
        type: 'custom'
        // onDelete will be added by useEffect
      }));
      setNodes(loadedNodes);
      setEdges(workflow.workflowJson.connections || []);
    } else {
      setNodes([]);
      setEdges([]);
    }

    // Load executions for this workflow
    fetchExecutions(workflow._id);
  };

  const fetchExecutions = async (workflowId) => {
    // Mock executions - replace with actual API call
    setExecutions([
      { id: 1, status: 'success', duration: 1250, timestamp: new Date(), data: {} },
      { id: 2, status: 'success', duration: 980, timestamp: new Date(Date.now() - 3600000), data: {} },
      { id: 3, status: 'error', duration: 450, timestamp: new Date(Date.now() - 7200000), error: 'Connection timeout' }
    ]);
  };

  const createNewWorkflow = async () => {
    try {
      const response = await api.post('/workflows', {
        name: `New Workflow ${workflows.length + 1}`,
        type: 'custom',
        workflowJson: { nodes: [], connections: [] }
      });

      await fetchWorkflows();
      navigate(`/app/workflows/${response.data._id}`);
      loadWorkflow(response.data);
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const saveWorkflow = async () => {
    if (!currentWorkflow) return;

    try {
      await api.put(`/workflows/${currentWorkflow._id}`, {
        n8nWorkflow: {
          nodes: nodes,
          connections: edges
        }
      });

      alert('Workflow saved successfully!');
      fetchWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const deleteWorkflow = async (workflowId) => {
    if (!confirm('Delete this workflow?')) return;

    try {
      await api.delete(`/workflows/${workflowId}`);
      fetchWorkflows();

      if (currentWorkflow?._id === workflowId) {
        setCurrentWorkflow(null);
        setNodes([]);
        setEdges([]);
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const toggleWorkflow = async (workflowId, currentState) => {
    try {
      const endpoint = currentState ? `/workflows/${workflowId}/deactivate` : `/workflows/${workflowId}/activate`;
      await api.post(endpoint);
      fetchWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds));
  }, [setEdges]);

  // Delete node handler
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

    // Use ReactFlow's screenToFlowPosition to properly convert screen coords to flow coords
    // This accounts for zoom and pan transformations
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });

    const newNode = {
      id: `${templateData.type}_${Date.now()}`,
      type: 'custom',
      position,
      data: {
        ...templateData,
        nodeType: templateData.type,
        parameters: {},
        onDelete: deleteNode  // Add delete callback
      }
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const updateNodeParams = (nodeId, newParams) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              parameters: newParams
            }
          };
        }
        return node;
      })
    );
  };

  const handleNodeAIRequest = async () => {
    if (!selectedNode || !nodeAIRequest.trim()) return;

    setNodeAILoading(true);
    try {
      const response = await api.post('/ai/configure-node', {
        nodeType: selectedNode.data.nodeType,
        userRequest: nodeAIRequest,
        currentConfig: selectedNode.data.parameters,
        context: {}
      });

      setNodeAIResponse(response.data.configuration);
    } catch (error) {
      console.error('Error getting AI help:', error);
      alert('Failed to get AI assistance');
    } finally {
      setNodeAILoading(false);
    }
  };

  const applyAISuggestions = () => {
    if (!nodeAIResponse || !selectedNode) return;

    const newParams = {
      ...selectedNode.data.parameters,
      ...nodeAIResponse.parameters
    };

    updateNodeParams(selectedNode.id, newParams);
    setNodeAIResponse(null);
    setNodeAIRequest('');
  };

  const handleAIWorkflowGenerate = async (generatedWorkflow) => {
    try {
      // Create workflow with AI-generated structure
      const response = await api.post('/workflows', {
        name: generatedWorkflow.name || `AI Workflow ${workflows.length + 1}`,
        type: 'custom',
        description: generatedWorkflow.description,
        n8nWorkflow: {
          nodes: generatedWorkflow.nodes || [],
          connections: generatedWorkflow.connections || []
        }
      });

      await fetchWorkflows();
      navigate(`/app/workflows/${response.data._id}`);
      loadWorkflow(response.data);
    } catch (error) {
      console.error('Error creating AI workflow:', error);
      alert('Failed to create workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId, workflowName) => {
    if (!confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/workflows/${workflowId}`);
      setWorkflows(workflows.filter(w => w._id !== workflowId));
      if (currentWorkflow?._id === workflowId) {
        setCurrentWorkflow(null);
        setNodes([]);
        setEdges([]);
        navigate('/app/workflows');
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert('Failed to delete workflow');
    }
  };

  // Render sidebar
  const renderSidebar = () => (
    <div className={`${showSidebar ? 'w-56' : 'w-0'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden flex flex-col`}>
      {/* Sidebar Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Workflows</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={createNewWorkflow}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs"
        >
          <Plus className="w-3 h-3" />
          New Workflow
        </button>
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {workflows.map((workflow) => (
          <div
            key={workflow._id}
            className={`group relative p-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
              currentWorkflow?._id === workflow._id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''
            }`}
          >
            <div
              onClick={() => {
                navigate(`/app/workflows/${workflow._id}`);
                loadWorkflow(workflow);
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate pr-2">{workflow.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${workflow.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                {workflow.executionCount || 0} runs
              </div>
            </div>

            {/* Delete button - shows on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteWorkflow(workflow._id, workflow.name);
              }}
              className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
              title="Delete workflow"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
            </button>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span className="font-semibold text-green-600">{stats.active}</span>
          </div>
          <div className="flex justify-between">
            <span>Executions:</span>
            <span className="font-semibold">{stats.executions}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render editor tab
  const renderEditor = () => {
    // Group nodes by category
    const nodesByCategory = nodeTemplates.reduce((acc, template) => {
      const category = template.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(template);
      return acc;
    }, {});

    return (
      <div className="flex-1 flex relative">
        {/* Node Palette */}
        <div className={`${showNodePalette ? 'w-52' : 'w-12'} bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden`}>
          <div className="p-2 h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded mb-2 sticky top-0 bg-gray-50 dark:bg-gray-800 z-10"
            >
              {showNodePalette ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {showNodePalette && (
              <div className="space-y-3">
                {Object.entries(nodesByCategory).map(([category, templates]) => (
                  <div key={category}>
                    <h3 className="text-[10px] font-bold text-gray-600 dark:text-gray-400 mb-1 px-2 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <div
                          key={template.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, template)}
                          className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded cursor-move hover:shadow-md hover:scale-105 transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg group-hover:scale-110 transition-transform">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{template.label}</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{template.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* React Flow Canvas */}
      <div className="flex-1" style={{ height: '100%', width: '100%' }} onDrop={onDrop} onDragOver={onDragOver}>
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
          multiSelectionKeyCode="Shift"
          selectNodesOnDrag={false}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
            style: { strokeWidth: 2.5, stroke: '#3b82f6' }
          }}
          fitView
        >
          <Background color="#e5e7eb" gap={15} />
          <Controls
            style={{ bottom: 120, left: 10 }}
          />
          <MiniMap
            nodeColor={(node) => node.data.color}
            nodeStrokeColor={(node) => node.data.color}
            nodeStrokeWidth={3}
            nodeBorderRadius={8}
            maskColor="rgb(59, 130, 246, 0.15)"
            className="!bg-white dark:!bg-gray-800 !border-2 !border-blue-500 dark:!border-blue-400 !shadow-2xl !rounded-xl"
            style={{ bottom: 120, right: 10 }}
            zoomable
            pannable
          />
        </ReactFlow>

        {/* Help Text - Hidden on mobile to prevent navigation interference */}
        <div className="hidden md:block absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
          💡 Hover over nodes to delete • Click edges and press Delete • Press Shift to multi-select
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-xl">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{selectedNode.data.label}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedNode.data.description}
            </div>

            {/* Special Configuration for Sub-Workflow Nodes */}
            {selectedNode.data.nodeType === 'sub_workflow' && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Select Workflow to Run
                </label>
                <select
                  value={selectedNode.data.parameters?.workflowId || ''}
                  onChange={(e) => {
                    const newParams = { ...selectedNode.data.parameters, workflowId: e.target.value };
                    updateNodeParams(selectedNode.id, newParams);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Choose a workflow...</option>
                  {workflows.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  This node will execute the selected workflow and pass data through
                </p>
              </div>
            )}

            {/* Special Configuration for Stakeholder Router */}
            {selectedNode.data.nodeType === 'stakeholder_router' && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Route By Stakeholder Role
                </label>
                <select
                  value={selectedNode.data.parameters?.routeBy || ''}
                  onChange={(e) => {
                    const newParams = { ...selectedNode.data.parameters, routeBy: e.target.value };
                    updateNodeParams(selectedNode.id, newParams);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
                >
                  <option value="">Select role...</option>
                  <option value="homeowner">Homeowner</option>
                  <option value="buyer">Buyer</option>
                  <option value="realtor">Realtor</option>
                  <option value="investor">Investor</option>
                  <option value="contractor">Contractor</option>
                  <option value="trade">Trade/Subcontractor</option>
                  <option value="manager">Project Manager</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Routes communication to different teams based on stakeholder role
                </p>
              </div>
            )}

            {/* Special Configuration for Multi-Channel */}
            {selectedNode.data.nodeType === 'multi_channel' && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Communication Channels
                </label>
                <div className="space-y-2">
                  {['SMS', 'Email', 'Voice Call'].map(channel => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(selectedNode.data.parameters?.channels || []).includes(channel)}
                        onChange={(e) => {
                          const currentChannels = selectedNode.data.parameters?.channels || [];
                          const newChannels = e.target.checked
                            ? [...currentChannels, channel]
                            : currentChannels.filter(c => c !== channel);
                          const newParams = { ...selectedNode.data.parameters, channels: newChannels };
                          updateNodeParams(selectedNode.id, newParams);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{channel}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Send message through multiple channels simultaneously
                </p>
              </div>
            )}

            {/* Special Configuration for Human Contact Nodes */}
            {['human_contact', 'human_approval', 'human_escalation', 'human_notify'].includes(selectedNode.data.nodeType) && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">👤</span>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedNode.data.nodeType === 'human_approval' ? 'Approval Contact' :
                     selectedNode.data.nodeType === 'human_escalation' ? 'Escalation Contact' :
                     selectedNode.data.nodeType === 'human_notify' ? 'Notification Contact' :
                     'Human Contact'}
                  </h4>
                </div>

                {/* Contact Type */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Contact Type
                  </label>
                  <select
                    value={selectedNode.data.parameters?.contactType || 'team'}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, contactType: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="team">Team Member</option>
                    <option value="external">External Contact</option>
                    <option value="client">Client</option>
                    <option value="contractor">Contractor</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>

                {/* Contact Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={selectedNode.data.parameters?.contactName || ''}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, contactName: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={selectedNode.data.parameters?.contactEmail || ''}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, contactEmail: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Phone */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={selectedNode.data.parameters?.contactPhone || ''}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, contactPhone: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Action Type */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Action
                  </label>
                  <select
                    value={selectedNode.data.parameters?.actionType || 'notify'}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, actionType: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="notify">Notify</option>
                    <option value="approve">Request Approval</option>
                    <option value="handoff">Handoff Call</option>
                    <option value="escalate">Escalate Issue</option>
                    <option value="assign">Assign Task</option>
                    <option value="review">Request Review</option>
                  </select>
                </div>

                {/* Communication Method */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Communication Method
                  </label>
                  <div className="space-y-1.5">
                    {['Email', 'SMS', 'Phone Call', 'Slack', 'Teams'].map(method => (
                      <label key={method} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(selectedNode.data.parameters?.communicationMethods || []).includes(method)}
                          onChange={(e) => {
                            const currentMethods = selectedNode.data.parameters?.communicationMethods || [];
                            const newMethods = e.target.checked
                              ? [...currentMethods, method]
                              : currentMethods.filter(m => m !== method);
                            const newParams = { ...selectedNode.data.parameters, communicationMethods: newMethods };
                            updateNodeParams(selectedNode.id, newParams);
                          }}
                          className="rounded text-green-600"
                        />
                        <span className="text-xs text-gray-900 dark:text-gray-100">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message Template */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Message Template (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Hi {name}, you have a new task assigned..."
                    value={selectedNode.data.parameters?.messageTemplate || ''}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, messageTemplate: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  />
                </div>

                {/* Priority Level (for approval/escalation) */}
                {['human_approval', 'human_escalation'].includes(selectedNode.data.nodeType) && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={selectedNode.data.parameters?.priority || 'normal'}
                      onChange={(e) => {
                        const newParams = { ...selectedNode.data.parameters, priority: e.target.value };
                        updateNodeParams(selectedNode.id, newParams);
                      }}
                      className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                )}

                <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded">
                  💡 Tip: Use variables like {'{name}'}, {'{email}'}, {'{phone}'} in your message template
                </p>
              </div>
            )}

            {/* Node Parameters */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Parameters
              </label>
              {Object.entries(selectedNode.data.parameters || {}).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{key}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const newParams = { ...selectedNode.data.parameters, [key]: e.target.value };
                      updateNodeParams(selectedNode.id, newParams);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ))}

              <button
                onClick={() => {
                  const newKey = prompt('Parameter name:');
                  if (newKey) {
                    const newParams = { ...selectedNode.data.parameters, [newKey]: '' };
                    updateNodeParams(selectedNode.id, newParams);
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Parameter
              </button>
            </div>

            {/* AI Assistant */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={() => setShowNodeAI(!showNodeAI)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="w-4 h-4" />
                Ask AI to Configure
              </button>

              {showNodeAI && (
                <div className="mt-3 space-y-3">
                  <input
                    value={nodeAIRequest}
                    onChange={(e) => setNodeAIRequest(e.target.value)}
                    placeholder="e.g., Send SMS to customer with their name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    onKeyPress={(e) => e.key === 'Enter' && handleNodeAIRequest()}
                  />

                  <button
                    onClick={handleNodeAIRequest}
                    disabled={nodeAILoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {nodeAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {nodeAILoading ? 'Thinking...' : 'Get AI Help'}
                  </button>

                  {nodeAIResponse && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">{nodeAIResponse.explanation}</p>
                      {nodeAIResponse.tips && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">💡 {nodeAIResponse.tips}</p>
                      )}
                      <button
                        onClick={applyAISuggestions}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Apply AI Suggestions
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  // Render executions tab
  const renderExecutions = () => (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Workflow Executions</h2>

        {executions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <History className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No executions yet</h3>
            <p className="text-gray-600 dark:text-gray-400">This workflow hasn't been run yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {execution.status === 'success' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {execution.status === 'success' ? 'Completed Successfully' : 'Failed'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {execution.timestamp.toLocaleString()}
                        <span>• {execution.duration}ms</span>
                      </div>
                    </div>
                  </div>

                  <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                    View Details
                  </button>
                </div>

                {execution.error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                    {execution.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render playground tab
  const renderPlayground = () => (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Workflow Playground</h2>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Test Your Workflow</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Send test data to your workflow and see the results in real-time
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Payload (JSON)
              </label>
              <textarea
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder={`{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "phone": "+1234567890"\n}`}
              />
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              <Play className="w-5 h-5" />
              Run Test
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Test Results</h4>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              Run a test to see results here...
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <WorkflowIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {currentWorkflow ? currentWorkflow.name : 'Workflows'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIWizard(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
          >
            <Rocket className="w-3.5 h-3.5" />
            AI Wizard
          </button>

          <button
            onClick={() => navigate('/app/marketplace')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Marketplace
          </button>

          {currentWorkflow && (
            <>
              <button
                onClick={() => toggleWorkflow(currentWorkflow._id, currentWorkflow.enabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg ${
                  currentWorkflow.enabled
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {currentWorkflow.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {currentWorkflow.enabled ? 'Active' : 'Inactive'}
              </button>

              <button
                onClick={saveWorkflow}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      {currentWorkflow && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'editor'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1.5" />
            Editor
          </button>

          <button
            onClick={() => setActiveTab('executions')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'executions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1.5" />
            Executions
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'playground'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <TestTube className="w-3.5 h-3.5 inline mr-1.5" />
            Playground
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {renderSidebar()}

        {!currentWorkflow ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <WorkflowIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to Workflow Studio
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create powerful automation workflows with visual drag-and-drop editor, AI assistance, and integrated testing
              </p>
              <button
                onClick={createNewWorkflow}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Create Your First Workflow
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'editor' && renderEditor()}
            {activeTab === 'executions' && renderExecutions()}
            {activeTab === 'playground' && renderPlayground()}
          </>
        )}
      </div>

      {/* AI Workflow Wizard Modal */}
      {showAIWizard && (
        <AIWorkflowWizard
          onClose={() => setShowAIWizard(false)}
          onGenerate={handleAIWorkflowGenerate}
        />
      )}
    </div>
  );
}

// Wrapper component to provide ReactFlow context
export default function WorkflowStudio() {
  return (
    <ReactFlowProvider>
      <WorkflowStudioContent />
    </ReactFlowProvider>
  );
}
