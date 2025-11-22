import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Save, Play, Trash2, Settings, Upload, Globe } from 'lucide-react';
import api from '../services/api';

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
      url: `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/leads`,
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
      url: `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/sms/send`,
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
      url: `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/email/send`,
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

// Custom node component with contractor-friendly styling
function CustomNode({ data }) {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg border-2 bg-card border border-border min-w-[220px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderColor: data.color }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-3xl">{data.icon}</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-foreground">{data.label}</div>
          <div className="text-xs text-foreground">{data.description}</div>
        </div>
        {data.configured && (
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Configured"></div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export default function WorkflowBuilderNew({ workflowId, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [saving, setSaving] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

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
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2 }
    }, eds)),
    [setEdges]
  );

  const addNode = (nodeType) => {
    const position = {
      x: 100 + nodes.length * 50,
      y: 100 + Math.floor(nodes.length / 3) * 150
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
                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                style: { stroke: '#3b82f6', strokeWidth: 2 }
              });
            }
          });
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  };

  const saveWorkflow = async () => {
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
        enabled: false
      };

      if (workflowId) {
        await api.put(`/workflows/${workflowId}`, workflowData);
        alert('Workflow updated successfully!');
      } else {
        await api.post('/workflows', workflowData);
        alert('Workflow saved successfully!');
      }

      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow: ' + (error.response?.data?.message || error.message));
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
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          style: { stroke: '#3b82f6', strokeWidth: 2 }
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
      <div className="bg-card border border-border border-b border-border p-4 flex items-center justify-between flex-wrap gap-3">
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
            onClick={saveWorkflow}
            disabled={saving || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
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
          className="bg-secondary"
        >
          <Controls className="bg-card border border-border border border-border" />
          <MiniMap className="bg-card border border-border border border-border" />
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
              <div className="bg-card border border-border rounded-lg shadow-xl p-4 w-80 max-h-[80vh] overflow-y-auto border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Add a Step</h3>
                  <button
                    onClick={() => setShowNodePalette(false)}
                    className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white"
                  >
                    ✕
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
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                          style={{ borderLeftColor: nodeType.color, borderLeftWidth: '3px' }}
                        >
                          <span className="text-2xl">{nodeType.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-foreground">{nodeType.name}</div>
                            <div className="text-xs text-foreground">{nodeType.description}</div>
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
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-card border border-border border-l border-border p-4 overflow-y-auto shadow-xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Step Settings</h3>
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
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Dynamic parameter fields */}
              {Object.entries(selectedNode.data.parameters || {}).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1 capitalize">
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
                      <span className="text-sm text-muted-foreground">Enabled</span>
                    </label>
                  ) : key.includes('Code') || key.includes('Body') || key.includes('text') || key.includes('message') ? (
                    <textarea
                      value={value}
                      onChange={(e) => {
                        const newParams = { ...selectedNode.data.parameters, [key]: e.target.value };
                        updateNodeParams(selectedNode.id, newParams);
                      }}
                      rows={6}
                      className="w-full px-3 py-2 border border-border dark:bg-gray-700 dark:text-white rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-border dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter ${key}...`}
                    />
                  )}
                </div>
              ))}

              {/* Help text for contractors */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Use {'{{'} and {'}}'} to insert data from previous steps.
                  Example: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{'{{$json.name}}'}</code>
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
              <p className="text-muted-foreground mb-6">
                Click "Add Step" to start building your automated workflow.
                No coding required!
              </p>
              <button
                onClick={() => setShowNodePalette(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium pointer-events-auto"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
