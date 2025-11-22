import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Save, Play, Trash2, Settings, Upload, Globe, Sparkles, X, Loader2, ChevronRight, CheckCircle } from 'lucide-react';
import api from '../services/api';

// API URL for node default parameters
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Simplified node types for contractors - easy to understand
const NODE_TYPES = [
  {
    id: 'trigger',
    name: 'When This Happens',
    type: 'n8n-nodes-base.webhook',
    icon: '⚡',
    color: '#3b82f6',
    category: 'Trigger',
    description: 'Start your workflow when something happens',
    defaultParams: {
      httpMethod: 'POST',
      path: 'trigger',
      responseMode: 'onReceived'
    }
  },
  {
    id: 'save_lead',
    name: 'Save Lead',
    type: 'n8n-nodes-base.httpRequest',
    icon: '👤',
    color: '#10b981',
    category: 'Action',
    description: 'Save customer info to your CRM',
    defaultParams: {
      method: 'POST',
      url: API_URL + '/api/leads',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '{"name": "{{$json.name}}", "phone": "{{$json.phone}}", "email": "{{$json.email}}"}'
    }
  },
  {
    id: 'send_sms',
    name: 'Send Text Message',
    type: 'n8n-nodes-base.httpRequest',
    icon: '📱',
    color: '#f59e0b',
    category: 'Action',
    description: 'Send SMS to customer or team',
    defaultParams: {
      method: 'POST',
      url: API_URL + '/api/sms/send',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '{"to": "{{$json.phone}}", "message": "Thanks for contacting us!"}'
    }
  },
  {
    id: 'send_email',
    name: 'Send Email',
    type: 'n8n-nodes-base.httpRequest',
    icon: '📧',
    color: '#8b5cf6',
    category: 'Action',
    description: 'Send email to customer or team',
    defaultParams: {
      method: 'POST',
      url: API_URL + '/api/email/send',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '{"to": "{{$json.email}}", "subject": "Thanks for reaching out", "body": "We\'ll be in touch soon!"}'
    }
  },
  {
    id: 'notify_team',
    name: 'Notify Team',
    type: 'n8n-nodes-base.slack',
    icon: '💬',
    color: '#e01e5a',
    category: 'Action',
    description: 'Alert your team on Slack',
    defaultParams: {
      resource: 'message',
      operation: 'post',
      channel: '#leads',
      text: 'New lead: {{$json.name}} - {{$json.phone}}'
    }
  },
  {
    id: 'wait',
    name: 'Wait',
    type: 'n8n-nodes-base.wait',
    icon: '⏰',
    color: '#06b6d4',
    category: 'Logic',
    description: 'Wait before next step',
    defaultParams: {
      amount: 1,
      unit: 'hours'
    }
  },
  {
    id: 'condition',
    name: 'If/Then',
    type: 'n8n-nodes-base.if',
    icon: '🔀',
    color: '#ec4899',
    category: 'Logic',
    description: 'Do different things based on conditions',
    defaultParams: {
      conditions: {
        string: [{
          value1: '={{$json.qualified}}',
          operation: 'equals',
          value2: 'true'
        }]
      }
    }
  },
  {
    id: 'custom_code',
    name: 'Custom Logic',
    type: 'n8n-nodes-base.code',
    icon: '💻',
    color: '#64748b',
    category: 'Advanced',
    description: 'Write custom JavaScript code',
    defaultParams: {
      jsCode: '// Process your data here\nreturn $input.all();'
    }
  },
  {
    id: 'n8n_connect',
    name: 'n8n Integration',
    type: 'n8n-nodes-base.httpRequest',
    icon: '🔗',
    color: '#ea3e3e',
    category: 'Advanced',
    description: 'Connect to your own n8n account',
    defaultParams: {
      method: 'POST',
      url: 'YOUR_N8N_WEBHOOK_URL',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '{{$json}}'
    }
  }
];

// Enhanced Custom node component with n8n-style connection handles
function CustomNode({ data }) {
  return (
    <div
      className="relative px-3 py-2 shadow-lg rounded-lg border-2 bg-card border border-border cursor-pointer hover:shadow-2xl transition-all duration-200"
      style={{
        borderColor: data.color,
        minWidth: '140px',
        maxWidth: '180px'
      }}
    >
      {/* n8n-style input handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2">
        <span className="text-2xl">{data.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{data.label}</div>
          <div className="text-[10px] text-foreground truncate">{data.description}</div>
        </div>
        {data.configured && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" title="Configured"></div>
        )}
      </div>

      {/* n8n-style output handle (right side) */}
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
  custom: CustomNode,
};

// AI Workflow Wizard Modal Component
function AIWorkflowWizard({ onClose, onGenerate }) {
  const [description, setDescription] = useState('');
  const [workflowType, setWorkflowType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please describe what you want your workflow to do');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/ai/generate-workflow', {
        description,
        workflowType,
        context: {}
      });

      onGenerate(response.data.workflow);
      onClose();
    } catch (err) {
      console.error('AI workflow generation error:', err);
      setError(err.response?.data?.message || 'Failed to generate workflow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    'When someone calls, save their info and send them a thank you SMS',
    'Capture leads from website, notify team on Slack, and schedule follow-up',
    'After a call ends, save lead to CRM and email them a quote',
    'When appointment is booked, send confirmation SMS and add to calendar'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Workflow Wizard</h2>
                <p className="text-blue-100 text-sm">Powered by Claude AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Describe your workflow in plain English
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border-2 border-border dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              placeholder="Example: When someone fills out my contact form, save them as a lead, send them a welcome email, and notify my team on Slack..."
            />
            <p className="text-xs text-foreground mt-2">
              Be specific about what should happen and when. Claude will design the workflow for you!
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Workflow Type
            </label>
            <select
              value={workflowType}
              onChange={(e) => setWorkflowType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-border dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="general">General Automation</option>
              <option value="voice_agent">Voice Agent Workflow</option>
              <option value="team_workflow">Team Collaboration</option>
              <option value="project_management">Project Management</option>
              <option value="lead_nurture">Lead Nurturing</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Example prompts:</p>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setDescription(example)}
                  className="w-full text-left px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span>{example}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-medium transition-all shadow-lg hover:shadow-xl text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilderEnhanced({ workflowId, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [saving, setSaving] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(false); // Auto-collapsed on load
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showNodeAI, setShowNodeAI] = useState(false);
  const [nodeAIRequest, setNodeAIRequest] = useState('');
  const [nodeAILoading, setNodeAILoading] = useState(false);
  const [nodeAIResponse, setNodeAIResponse] = useState(null);

  // Load existing workflow if editing
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id) => {
    try {
      const response = await api.get(`/workflows/${id}`);
      const workflow = response.data;

      setWorkflowName(workflow.name);

      // Convert n8n JSON to React Flow format
      if (workflow.workflowJson || workflow.n8nWorkflow) {
        const n8nData = workflow.workflowJson || workflow.n8nWorkflow;
        const flowNodes = convertN8nToFlow(n8nData);
        setNodes(flowNodes.nodes);
        setEdges(flowNodes.edges);
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
      alert('Failed to load workflow: ' + error.message);
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
      style: { stroke: '#3b82f6', strokeWidth: 2.5 }
    }, eds)),
    [setEdges]
  );

  const addNode = (nodeType) => {
    const position = {
      x: 150 + nodes.length * 40,
      y: 100 + Math.floor(nodes.length / 4) * 120
    };

    const newNode = {
      id: `${nodeType.id}-${Date.now()}`,
      type: 'custom',
      position,
      data: {
        label: nodeType.name,
        icon: nodeType.icon,
        color: nodeType.color,
        description: nodeType.description,
        nodeType: nodeType.id,
        n8nType: nodeType.type,
        parameters: { ...nodeType.defaultParams },
        configured: false
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setShowNodePalette(false); // Auto-close palette after adding
  };

  const deleteNode = (nodeId) => {
    if (!confirm('Delete this step?')) return;
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  };

  const updateNodeParams = (nodeId, params) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              parameters: params,
              configured: true
            }
          };
        }
        return node;
      })
    );
  };

  // Convert React Flow to n8n JSON
  const convertFlowToN8n = () => {
    const n8nNodes = nodes.map((node) => ({
      parameters: node.data.parameters,
      id: node.id,
      name: node.data.label,
      type: node.data.n8nType,
      typeVersion: 2,
      position: [node.position.x, node.position.y]
    }));

    const connections = {};
    edges.forEach((edge) => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        const sourceName = sourceNode.data.label;
        if (!connections[sourceName]) {
          connections[sourceName] = { main: [] };
        }

        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode) {
          connections[sourceName].main.push([{
            node: targetNode.data.label,
            type: 'main',
            index: 0
          }]);
        }
      }
    });

    return {
      name: workflowName,
      nodes: n8nNodes,
      connections,
      active: false
    };
  };

  // Convert n8n JSON to React Flow
  const convertN8nToFlow = (n8nWorkflow) => {
    const flowNodes = n8nWorkflow.nodes.map((n8nNode) => {
      const nodeType = NODE_TYPES.find(nt => nt.type === n8nNode.type) || NODE_TYPES[0];

      return {
        id: n8nNode.id,
        type: 'custom',
        position: { x: n8nNode.position[0], y: n8nNode.position[1] },
        data: {
          label: n8nNode.name,
          icon: nodeType.icon,
          color: nodeType.color,
          description: nodeType.description,
          nodeType: nodeType.id,
          n8nType: n8nNode.type,
          parameters: n8nNode.parameters,
          configured: true
        }
      };
    });

    const flowEdges = [];
    Object.entries(n8nWorkflow.connections || {}).forEach(([sourceName, conn]) => {
      const sourceNode = flowNodes.find(n => n.data.label === sourceName);
      if (sourceNode && conn.main) {
        conn.main.forEach((connections) => {
          connections.forEach((connection) => {
            const targetNode = flowNodes.find(n => n.data.label === connection.node);
            if (targetNode) {
              flowEdges.push({
                id: `${sourceNode.id}-${targetNode.id}`,
                source: sourceNode.id,
                target: targetNode.id,
                type: 'smoothstep',
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
                style: { stroke: '#3b82f6', strokeWidth: 2.5 }
              });
            }
          });
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  };

  // Handle AI-generated workflow
  const handleNodeAIRequest = async () => {
    if (!nodeAIRequest.trim() || !selectedNode) return;

    setNodeAILoading(true);
    setNodeAIResponse(null);

    try {
      const response = await api.post('/ai/configure-node', {
        nodeType: selectedNode.data.nodeType,
        userRequest: nodeAIRequest,
        currentConfig: selectedNode.data.parameters,
        context: {}
      });

      setNodeAIResponse(response.data.configuration);
    } catch (error) {
      console.error('AI node configuration error:', error);
      setNodeAIResponse({
        explanation: 'Sorry, I encountered an error. Please try again.',
        parameters: {},
        tips: ''
      });
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
    setShowNodeAI(false);
  };

  const handleAIGeneratedWorkflow = (aiWorkflow) => {
    setWorkflowName(aiWorkflow.name);

    const newNodes = aiWorkflow.nodes.map((aiNode) => {
      const nodeType = NODE_TYPES.find(nt => nt.id === aiNode.type) || NODE_TYPES[0];

      return {
        id: aiNode.id || `${aiNode.type}-${Date.now()}-${Math.random()}`,
        type: 'custom',
        position: aiNode.position || { x: 100, y: 100 },
        data: {
          label: aiNode.label || nodeType.name,
          icon: nodeType.icon,
          color: nodeType.color,
          description: nodeType.description,
          nodeType: nodeType.id,
          n8nType: nodeType.type,
          parameters: aiNode.parameters || nodeType.defaultParams,
          configured: Object.keys(aiNode.parameters || {}).length > 0
        }
      };
    });

    const newEdges = aiWorkflow.connections.map((conn, index) => ({
      id: `edge-${index}`,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
      style: { stroke: '#3b82f6', strokeWidth: 2.5 }
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const saveWorkflow = async (shouldActivate = false) => {
    if (nodes.length === 0) {
      alert('Please add at least one step to your workflow');
      return;
    }

    setSaving(true);
    try {
      const n8nWorkflow = convertFlowToN8n();

      const workflowData = {
        name: workflowName,
        type: 'custom',
        description: `Custom workflow with ${nodes.length} steps`,
        n8nWorkflow,
        enabled: shouldActivate
      };

      let savedWorkflow;
      if (workflowId) {
        const response = await api.put(`/workflows/${workflowId}`, workflowData);
        savedWorkflow = response.data;
        alert(`✅ Workflow updated successfully!${shouldActivate ? '\n🚀 Workflow is now active!' : ''}`);
      } else {
        const response = await api.post('/workflows', workflowData);
        savedWorkflow = response.data;

        if (shouldActivate) {
          // Activate the workflow immediately
          await api.post(`/workflows/${savedWorkflow._id}/activate`);
          alert('✅ Workflow created and activated successfully!\n🚀 Your workflow is now running!');
        } else {
          const activate = confirm('✅ Workflow created successfully!\n\nWould you like to activate it now?');
          if (activate) {
            await api.post(`/workflows/${savedWorkflow._id}/activate`);
            alert('🚀 Workflow activated! It is now running.');
          }
        }
      }

      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving workflow:', error);
      const errorMsg = error.response?.data?.message || error.message;
      if (error.response?.status === 403) {
        alert('❌ Permission denied. Please make sure you are logged in.\n\nError: ' + errorMsg);
      } else if (error.response?.status === 401) {
        alert('❌ Your session has expired. Please log in again.');
        window.location.href = '/login';
      } else {
        alert('❌ Failed to save workflow:\n' + errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = (templateName) => {
    // Simple templates for contractors
    const templates = {
      'lead_capture': {
        name: 'Lead Capture & Follow-up',
        nodes: [
          { type: NODE_TYPES[0], pos: [250, 100] }, // Trigger
          { type: NODE_TYPES[1], pos: [450, 100] }, // Save Lead
          { type: NODE_TYPES[2], pos: [650, 100] }  // Send SMS
        ]
      },
      'appointment_reminder': {
        name: 'Appointment Reminder',
        nodes: [
          { type: NODE_TYPES[0], pos: [250, 100] }, // Trigger
          { type: NODE_TYPES[5], pos: [450, 100] }, // Wait
          { type: NODE_TYPES[2], pos: [650, 100] }  // Send SMS
        ]
      },
      'team_notification': {
        name: 'Team Notification',
        nodes: [
          { type: NODE_TYPES[0], pos: [250, 100] }, // Trigger
          { type: NODE_TYPES[4], pos: [450, 100] }  // Notify Team
        ]
      }
    };

    const template = templates[templateName];
    if (!template) return;

    setWorkflowName(template.name);
    const newNodes = [];
    const newEdges = [];

    template.nodes.forEach((nodeTemplate, index) => {
      const node = {
        id: `${nodeTemplate.type.id}-${Date.now()}-${index}`,
        type: 'custom',
        position: { x: nodeTemplate.pos[0], y: nodeTemplate.pos[1] },
        data: {
          label: nodeTemplate.type.name,
          icon: nodeTemplate.type.icon,
          color: nodeTemplate.type.color,
          description: nodeTemplate.type.description,
          nodeType: nodeTemplate.type.id,
          n8nType: nodeTemplate.type.type,
          parameters: { ...nodeTemplate.type.defaultParams },
          configured: false
        }
      };
      newNodes.push(node);

      // Connect nodes in sequence
      if (index > 0) {
        newEdges.push({
          id: `edge-${index}`,
          source: newNodes[index - 1].id,
          target: node.id,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
          style: { stroke: '#3b82f6', strokeWidth: 2.5 }
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setShowTemplates(false);
  };

  return (
    <div className="h-full flex flex-col bg-secondary">
      {/* Toolbar */}
      <div className="bg-card border border-border border-b border-border p-3 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-900 dark:text-white px-2 py-1"
            placeholder="Workflow Name"
          />
          <span className="text-sm text-foreground hidden sm:inline">
            {nodes.length} steps
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAIWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Wizard</span>
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button
            onClick={() => setShowNodePalette(!showNodePalette)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Step</span>
          </button>
          <button
            onClick={() => saveWorkflow(false)}
            disabled={saving || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => saveWorkflow(true)}
            disabled={saving || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save & Activate'}</span>
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(event, node) => setSelectedNode(node)}
          fitView
          snapToGrid={true}
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
            style: { strokeWidth: 2.5 }
          }}
          className="bg-secondary"
        >
          <Controls className="bg-card border border-border border border-border rounded-lg shadow-lg" />
          <MiniMap className="bg-card border border-border border border-border rounded-lg shadow-lg"
            nodeColor={(node) => node.data.color}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background variant="dots" gap={16} size={1} className="bg-secondary" />

          {/* Templates Panel */}
          {showTemplates && (
            <Panel position="top-center">
              <div className="bg-card border border-border rounded-lg shadow-xl p-4 border border-border">
                <h3 className="font-semibold mb-3 text-foreground">Quick Start Templates</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => loadTemplate('lead_capture')}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-sm"
                  >
                    Lead Capture
                  </button>
                  <button
                    onClick={() => loadTemplate('appointment_reminder')}
                    className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-sm"
                  >
                    Appointment Reminder
                  </button>
                  <button
                    onClick={() => loadTemplate('team_notification')}
                    className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm"
                  >
                    Team Alert
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* Node Palette */}
          {showNodePalette && (
            <Panel position="top-left">
              <div className="bg-card border border-border rounded-lg shadow-xl p-4 w-72 max-h-[80vh] overflow-y-auto border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground text-sm">Add a Step</h3>
                  <button
                    onClick={() => setShowNodePalette(false)}
                    className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {['Trigger', 'Action', 'Logic', 'Advanced'].map((category) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase mb-2">{category}</h4>
                    <div className="space-y-2">
                      {NODE_TYPES.filter(nt => nt.category === category).map((nodeType) => (
                        <button
                          key={nodeType.id}
                          onClick={() => addNode(nodeType)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                          style={{ borderLeftColor: nodeType.color, borderLeftWidth: '3px' }}
                        >
                          <span className="text-xl">{nodeType.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-foreground">{nodeType.name}</div>
                            <div className="text-[10px] text-foreground truncate">{nodeType.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-card border border-border border-l border-border p-4 overflow-y-auto shadow-xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-sm">Step Settings</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Delete step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-2 text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Step Name
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, label: e.target.value } }
                          : node
                      )
                    );
                  }}
                  className="w-full px-3 py-2 border border-border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Dynamic parameter fields */}
              {Object.entries(selectedNode.data.parameters || {}).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {typeof value === 'boolean' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => {
                          const newParams = { ...selectedNode.data.parameters, [key]: e.target.checked };
                          updateNodeParams(selectedNode.id, newParams);
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-muted-foreground">Enabled</span>
                    </label>
                  ) : key.includes('Code') || key.includes('Body') || key.includes('text') || key.includes('message') || key.includes('Json') ? (
                    <textarea
                      value={value}
                      onChange={(e) => {
                        const newParams = { ...selectedNode.data.parameters, [key]: e.target.value };
                        updateNodeParams(selectedNode.id, newParams);
                      }}
                      rows={6}
                      className="w-full px-3 py-2 border border-border dark:bg-gray-700 dark:text-white rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter text..."
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const newParams = { ...selectedNode.data.parameters, [key]: e.target.value };
                        updateNodeParams(selectedNode.id, newParams);
                      }}
                      className="w-full px-3 py-2 border border-border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={`Enter ${key}...`}
                    />
                  )}
                </div>
              ))}

              {/* AI Assistant */}
              <div className="mt-6 border-t border-border pt-4">
                <button
                  onClick={() => setShowNodeAI(!showNodeAI)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Ask AI to Configure
                  </span>
                  {showNodeAI ? <ChevronRight className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {showNodeAI && (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nodeAIRequest}
                        onChange={(e) => setNodeAIRequest(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleNodeAIRequest()}
                        placeholder="e.g., Send SMS to customer with their name"
                        className="flex-1 px-3 py-2 text-xs border border-border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleNodeAIRequest}
                        disabled={nodeAILoading || !nodeAIRequest.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs flex items-center gap-1"
                      >
                        {nodeAILoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {nodeAIResponse && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                        <p className="text-xs text-blue-900 dark:text-blue-200 font-medium">
                          {nodeAIResponse.explanation}
                        </p>
                        {nodeAIResponse.tips && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                            💡 {nodeAIResponse.tips}
                          </p>
                        )}
                        {Object.keys(nodeAIResponse.parameters || {}).length > 0 && (
                          <button
                            onClick={applyAISuggestions}
                            className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Apply AI Suggestions
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Help text for contractors */}
              <div className="mt-3 p-3 bg-secondary/50 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> Use {'{{'} and {'}}'} to insert data from previous steps.
                  Example: <code className="bg-secondary px-1 rounded text-[10px]">{'{{$json.name}}'}</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {nodes.length === 0 && !showNodePalette && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-md p-8">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Build Your First Workflow
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Use the AI Wizard to generate workflows from plain English, or add steps manually.
                No coding required!
              </p>
              <div className="flex gap-3 justify-center pointer-events-auto">
                <button
                  onClick={() => setShowAIWizard(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Try AI Wizard
                </button>
                <button
                  onClick={() => setShowNodePalette(true)}
                  className="px-6 py-3 bg-card border border-border border-2 border-border text-foreground rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Add Manually
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Workflow Wizard Modal */}
      {showAIWizard && (
        <AIWorkflowWizard
          onClose={() => setShowAIWizard(false)}
          onGenerate={handleAIGeneratedWorkflow}
        />
      )}
    </div>
  );
}
