import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Mail,
  MessageSquare,
  Clock,
  Zap,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  Save,
  Play,
  Pause,
  Search,
  Plus,
  Settings,
  ArrowRight
} from 'lucide-react';

// Custom Node Components
const LeadNode = ({ data }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-blue-500 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-4 w-4 text-blue-600" />
        <div className="font-semibold text-sm">{data.label}</div>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>{data.email}</div>
        <div>{data.phone}</div>
        <Badge variant="outline" className="mt-1 capitalize">
          {data.status}
        </Badge>
      </div>
    </div>
  );
};

const StageNode = ({ data }) => {
  const stageColors = {
    new: 'border-gray-500 bg-gray-50',
    contacted: 'border-blue-500 bg-blue-50',
    qualified: 'border-purple-500 bg-purple-50',
    proposal_sent: 'border-yellow-500 bg-yellow-50',
    negotiation: 'border-orange-500 bg-orange-50',
    converted: 'border-green-500 bg-green-50'
  };

  return (
    <div className={`px-6 py-4 shadow-lg rounded-lg border-2 ${stageColors[data.stage] || 'border-gray-500 bg-gray-50'} min-w-[180px]`}>
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5" />
        <div className="font-bold">{data.label}</div>
      </div>
      <div className="text-xs text-gray-600">
        {data.count || 0} leads
      </div>
    </div>
  );
};

const DripCampaignNode = ({ data }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-indigo-500 min-w-[200px]">
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
        <div className="text-xs text-gray-500 mt-1">
          Duration: {data.duration || '7 days'}
        </div>
      </div>
    </div>
  );
};

const NotificationNode = ({ data }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-yellow-500 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <div className="font-semibold text-sm">Notify Human</div>
      </div>
      <div className="text-xs text-gray-600">
        <div>{data.message || 'Lead requires attention'}</div>
        <Badge variant="outline" className="mt-2">
          {data.notifyType || 'Email + SMS'}
        </Badge>
      </div>
    </div>
  );
};

const AICallNode = ({ data }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-purple-500 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <Phone className="h-4 w-4 text-purple-600" />
        <div className="font-semibold text-sm">AI Voice Call</div>
      </div>
      <div className="text-xs text-gray-600">
        <div>{data.agentName || 'AI Agent'}</div>
        <div className="text-xs text-gray-500 mt-1">
          {data.callPurpose || 'Follow-up call'}
        </div>
      </div>
    </div>
  );
};

const DelayNode = ({ data }) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-gray-400 min-w-[160px]">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-gray-600" />
        <div className="font-semibold text-sm">Wait</div>
      </div>
      <div className="text-xs text-gray-600">
        {data.duration || '1 day'}
      </div>
    </div>
  );
};

const nodeTypes = {
  lead: LeadNode,
  stage: StageNode,
  drip: DripCampaignNode,
  notification: NotificationNode,
  aiCall: AICallNode,
  delay: DelayNode
};

export default function CRMWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const queryClient = useQueryClient();

  // Fetch leads for dragging
  const { data: leadsData } = useQuery({
    queryKey: ['leads-for-workflow'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data;
    }
  });

  const leads = leadsData?.leads || [];

  // Fetch agents for AI call nodes
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-workflow'],
    queryFn: async () => {
      const res = await api.get('/agents');
      return res.data;
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
            markerEnd: { type: MarkerType.ArrowClosed }
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow-data') || '{}');

      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event, nodeType, data) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
  };

  const saveWorkflow = () => {
    // Save workflow logic
    console.log('Saving workflow:', { nodes, edges });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Leads & Automation Nodes */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold mb-2">CRM Workflow Builder</h2>
          <p className="text-xs text-muted-foreground">
            Drag leads and automation nodes to create workflows
          </p>
        </div>

        {/* Search Leads */}
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

        {/* Scrollable Content */}
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
              {/* Stage Node */}
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

              {/* Drip Campaign Node */}
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

              {/* AI Call Node */}
              <div
                draggable
                onDragStart={(e) => onDragStart(e, 'aiCall', {
                  agentName: 'AI Agent',
                  callPurpose: 'Follow-up call'
                })}
                className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg cursor-move hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium text-sm">AI Voice Call</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Automated AI call</p>
              </div>

              {/* Notification Node */}
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

              {/* Delay Node */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative h-full w-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50 dark:bg-gray-950"
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />

          <Panel position="top-right" className="bg-card border border-border rounded-lg shadow-lg p-4 space-x-2">
            <Button size="sm" onClick={saveWorkflow}>
              <Save className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
            <Button size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Panel>

          {nodes.length === 0 && (
            <Panel position="top-center" className="bg-card border border-border rounded-lg shadow-lg p-6">
              <div className="text-center">
                <ArrowRight className="h-8 w-8 mx-auto mb-2 text-muted-foreground transform -rotate-45" />
                <p className="text-sm font-medium">Drag leads and automation nodes here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect them to create automated workflows
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
