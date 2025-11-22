import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
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
  Upload, FileText, Globe, Music, Sparkles, Phone, Mail, Wand2,
  ChevronDown, ChevronUp, ChevronLeft, Menu, Webhook, Zap,
  CheckCircle, AlertCircle, Loader2, PhoneCall, Send, Image, Key,
  Brain, GitBranch, FileSearch, Target, Users, PhoneForwarded, Calendar,
  PhoneIncoming, PhoneOutgoing
} from 'lucide-react';
import VoiceLibraryBrowser from './VoiceLibraryBrowser';
import { ZoomSlider } from './ui/zoom-slider';

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
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#3b82f6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />

      <div className="flex items-center gap-2 mb-2">
        <Mic className="h-5 w-5 text-blue-600" />
        <div className="font-bold text-foreground">Voice</div>
      </div>

      {data.voiceName ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
          <span className="truncate">{data.voiceName}</span>
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
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#a855f7' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-500" />

      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-5 w-5 text-purple-600" />
        <div className="font-bold text-foreground">System Prompt</div>
      </div>

      {data.prompt ? (
        <div className="text-xs text-muted-foreground line-clamp-3 break-words">{data.prompt}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not configured</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
}

function VariableNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
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
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
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
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
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

function TriggerNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#eab308' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-yellow-500" />

      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-yellow-600" />
        <div className="font-bold text-foreground">Trigger</div>
      </div>

      {data.triggerType ? (
        <div className="text-xs text-muted-foreground capitalize">{data.triggerType}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not configured</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-yellow-500" />
    </div>
  );
}

function InboundCallNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[220px] ${
      selected ? 'ring-2 ring-green-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#10b981' }}>
      <div className="flex items-center gap-2 mb-2">
        <PhoneIncoming className="h-5 w-5 text-green-600" />
        <div className="font-bold text-foreground">Inbound Call</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {data.twilioNumber ? (
          <div>
            <div className="font-semibold text-green-600">📞 {data.twilioNumber}</div>
            {data.friendlyName && (
              <div className="text-[10px] opacity-70 truncate mt-0.5">{data.friendlyName}</div>
            )}
          </div>
        ) : (
          <div className="italic text-orange-400">⚠️ Configure Twilio number</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-green-500" />
    </div>
  );
}

function OutboundCallNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[220px] ${
      selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#3b82f6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <PhoneOutgoing className="h-5 w-5 text-blue-600" />
        <div className="font-bold text-foreground">Outbound Call</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {data.twilioNumber ? (
          <div>
            <div className="font-semibold text-blue-600">📞 From: {data.twilioNumber}</div>
            {data.toNumber && (
              <div className="text-[10px] mt-0.5">To: {data.toNumber}</div>
            )}
            {data.friendlyName && (
              <div className="text-[10px] opacity-70 truncate">{data.friendlyName}</div>
            )}
          </div>
        ) : (
          <div className="italic text-orange-400">⚠️ Configure Twilio number</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
}

function KeywordTriggerNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#8b5cf6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-500" />

      <div className="flex items-center gap-2 mb-2">
        <Key className="h-5 w-5 text-purple-600" />
        <div className="font-bold text-foreground">Keywords</div>
      </div>

      {data.keywords && data.keywords.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          {data.keywords.slice(0, 3).join(', ')}
          {data.keywords.length > 3 && ` +${data.keywords.length - 3}`}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Add keywords</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
}

function VoiceCallNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-green-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#10b981' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-green-500" />

      <div className="flex items-center gap-2 mb-2">
        <PhoneCall className="h-5 w-5 text-green-600" />
        <div className="font-bold text-foreground">Voice Call</div>
      </div>

      {data.agentId ? (
        <div className="text-xs text-muted-foreground truncate">
          Agent: {data.agentName || data.agentId}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Select agent</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-green-500" />
    </div>
  );
}

function SMSNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-cyan-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#06b6d4' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-cyan-500" />

      <div className="flex items-center gap-2 mb-2">
        <Send className="h-5 w-5 text-cyan-600" />
        <div className="font-bold text-foreground">SMS</div>
      </div>

      {data.message ? (
        <div className="text-xs text-muted-foreground line-clamp-2">{data.message}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Configure message</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-cyan-500" />
    </div>
  );
}

function MMSNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-sky-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#0ea5e9' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-sky-500" />

      <div className="flex items-center gap-2 mb-2">
        <Image className="h-5 w-5 text-sky-600" />
        <div className="font-bold text-foreground">MMS</div>
      </div>

      {data.mediaUrl ? (
        <div className="text-xs text-muted-foreground">
          <div className="truncate">{data.message || 'Message with media'}</div>
          <div className="text-[10px] text-sky-600 mt-1">📎 Media attached</div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Add media</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-sky-500" />
    </div>
  );
}

function EmailNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-pink-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#ec4899' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-pink-500" />

      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-5 w-5 text-pink-600" />
        <div className="font-bold text-foreground">Email</div>
      </div>

      {data.subject ? (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium truncate">{data.subject}</div>
          <div className="text-[10px] opacity-70 mt-1">{data.to || 'Configure recipient'}</div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Configure email</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-pink-500" />
    </div>
  );
}

function AIDecisionNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-amber-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#f59e0b' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-amber-500" />

      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-5 w-5 text-amber-600" />
        <div className="font-bold text-foreground">AI Decision</div>
      </div>

      {data.question ? (
        <div className="text-xs text-muted-foreground line-clamp-2">{data.question}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Configure decision</div>
      )}

      <div className="mt-2 flex gap-1">
        <Handle type="source" position={Position.Right} id="yes" className="!relative !transform-none !top-0 !left-0 w-2 h-2 !bg-green-500" />
        <Handle type="source" position={Position.Right} id="no" className="!relative !transform-none !top-0 !left-0 w-2 h-2 !bg-red-500" />
      </div>
    </div>
  );
}

function AIGeneratorNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#8b5cf6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-500" />

      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <div className="font-bold text-foreground">AI Generator</div>
      </div>

      {data.provider ? (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium">{data.provider.toUpperCase()}</div>
          <div className="text-[10px] opacity-70">{data.model || 'Default model'}</div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Select AI provider</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
}

function AIExtractorNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-teal-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#14b8a6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-teal-500" />

      <div className="flex items-center gap-2 mb-2">
        <FileSearch className="h-5 w-5 text-teal-600" />
        <div className="font-bold text-foreground">AI Extract</div>
      </div>

      {data.fields && data.fields.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          Extracting: {data.fields.slice(0, 2).join(', ')}
          {data.fields.length > 2 && ` +${data.fields.length - 2}`}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Define fields</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-teal-500" />
    </div>
  );
}

function AIIntentNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-orange-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#f97316' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-orange-500" />

      <div className="flex items-center gap-2 mb-2">
        <Target className="h-5 w-5 text-orange-600" />
        <div className="font-bold text-foreground">AI Intent</div>
      </div>

      {data.intents && data.intents.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          {data.intents.slice(0, 2).join(', ')}
          {data.intents.length > 2 && ` +${data.intents.length - 2}`}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Define intents</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-orange-500" />
    </div>
  );
}

function HumanHandoffNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-violet-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#7c3aed' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-violet-500" />

      <div className="flex items-center gap-2 mb-2">
        <PhoneForwarded className="h-5 w-5 text-violet-600" />
        <div className="font-bold text-foreground">Human Handoff</div>
      </div>

      {data.contacts && data.contacts.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium">{data.contacts[0].name}</div>
          <div className="text-[10px] opacity-70">{data.transferType || 'Transfer'}</div>
          {data.contacts.length > 1 && (
            <div className="text-[10px] text-violet-600 mt-1">+{data.contacts.length - 1} more</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Add contacts</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-violet-500" />
    </div>
  );
}

function CalendarNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#3b82f6' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-500" />

      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <div className="font-bold text-foreground">Calendar</div>
      </div>

      {data.calendarType ? (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium">{data.calendarType}</div>
          {data.calendarName && (
            <div className="text-[10px] opacity-70 truncate">{data.calendarName}</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Configure calendar</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
}

function CodeNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-green-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#10b981' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-green-500" />

      <div className="flex items-center gap-2 mb-2">
        <Code className="h-5 w-5 text-green-600" />
        <div className="font-bold text-foreground">Code</div>
      </div>

      {data.language ? (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium">{data.language.toUpperCase()}</div>
          {data.functionName && (
            <div className="text-[10px] opacity-70 truncate">{data.functionName}</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Add custom code</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-green-500" />
    </div>
  );
}

function WebhookNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-card w-[200px] ${
      selected ? 'ring-2 ring-slate-500 ring-offset-2' : ''
    }`} style={{ borderColor: '#64748b' }}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-slate-500" />

      <div className="flex items-center gap-2 mb-2">
        <Webhook className="h-5 w-5 text-slate-600" />
        <div className="font-bold text-foreground">Webhook</div>
      </div>

      {data.webhookUrl ? (
        <div className="text-xs text-muted-foreground truncate">{data.webhookUrl}</div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not configured</div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-slate-500" />
    </div>
  );
}

const nodeTypes = {
  voice: VoiceNode,
  prompt: PromptNode,
  variable: VariableNode,
  knowledge: KnowledgeNode,
  test: TestNode,
  trigger: TriggerNode,
  inboundCall: InboundCallNode,
  outboundCall: OutboundCallNode,
  keywordTrigger: KeywordTriggerNode,
  aiDecision: AIDecisionNode,
  aiGenerator: AIGeneratorNode,
  aiExtractor: AIExtractorNode,
  aiIntent: AIIntentNode,
  humanHandoff: HumanHandoffNode,
  calendar: CalendarNode,
  code: CodeNode,
  voiceCall: VoiceCallNode,
  sms: SMSNode,
  mms: MMSNode,
  email: EmailNode,
  webhook: WebhookNode,
};

// Node Templates for dragging
const NODE_TEMPLATES = [
  { type: 'inboundCall', label: 'Inbound Call', icon: PhoneIncoming, color: '#10b981', description: 'Receive calls' },
  { type: 'outboundCall', label: 'Outbound Call', icon: PhoneOutgoing, color: '#3b82f6', description: 'Make calls' },
  { type: 'voice', label: 'Voice', icon: Mic, color: '#3b82f6', description: 'Select AI voice' },
  { type: 'prompt', label: 'Prompt', icon: MessageSquare, color: '#a855f7', description: 'Agent instructions' },
  { type: 'aiDecision', label: 'AI Decision', icon: GitBranch, color: '#f59e0b', description: 'AI-powered routing' },
  { type: 'aiGenerator', label: 'AI Generator', icon: Sparkles, color: '#8b5cf6', description: 'Generate content' },
  { type: 'aiExtractor', label: 'AI Extract', icon: FileSearch, color: '#14b8a6', description: 'Extract data' },
  { type: 'aiIntent', label: 'AI Intent', icon: Target, color: '#f97316', description: 'Classify intent' },
  { type: 'variable', label: 'Variables', icon: Code, color: '#22c55e', description: 'Dynamic data' },
  { type: 'knowledge', label: 'Knowledge', icon: Database, color: '#f97316', description: 'Docs & URLs' },
  { type: 'trigger', label: 'Trigger', icon: Zap, color: '#eab308', description: 'Start automation' },
  { type: 'keywordTrigger', label: 'Keywords', icon: Key, color: '#8b5cf6', description: 'Keyword detection' },
  { type: 'humanHandoff', label: 'Human Handoff', icon: PhoneForwarded, color: '#7c3aed', description: 'Transfer to human' },
  { type: 'calendar', label: 'Calendar', icon: Calendar, color: '#3b82f6', description: 'Book appointments' },
  { type: 'code', label: 'Code', icon: Code, color: '#10b981', description: 'Custom logic' },
  { type: 'voiceCall', label: 'Voice Call', icon: PhoneCall, color: '#10b981', description: 'AI voice call' },
  { type: 'sms', label: 'SMS', icon: Send, color: '#06b6d4', description: 'Send text message' },
  { type: 'mms', label: 'MMS', icon: Image, color: '#0ea5e9', description: 'Send media message' },
  { type: 'email', label: 'Email', icon: Mail, color: '#ec4899', description: 'Send email' },
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: '#64748b', description: 'HTTP endpoint' },
  { type: 'test', label: 'Test', icon: TestTube, color: '#ef4444', description: 'Test your agent' },
];

function VisualAgentBuilderContent() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [voices, setVoices] = useState([]);
  const [configModal, setConfigModal] = useState(null);
  const [agentName, setAgentName] = useState('Untitled Agent');
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [showExecutions, setShowExecutions] = useState(false);
  const [executions, setExecutions] = useState([]);

  // Console/Debug state
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [consoleExpanded, setConsoleExpanded] = useState(true); // true = expanded, false = minimized
  const [consoleHeight, setConsoleHeight] = useState(384); // Default 384px (h-96)
  const [isResizing, setIsResizing] = useState(false);
  const [consoleTab, setConsoleTab] = useState('logs'); // 'logs', 'workflow', 'inspector'
  const [selectedNodeForInspection, setSelectedNodeForInspection] = useState(null);
  const [consoleSplitView, setConsoleSplitView] = useState(true); // Split screen for logs + AI - default to true
  const consoleEndRef = useRef(null);
  const chatEndRef = useRef(null);

  // AI Copilot state
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Add log to console
  const addLog = useCallback((type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = { type, message, data, timestamp, id: Date.now() };
    setConsoleLogs(prev => [...prev, log]);
  }, []);

  // Handle console resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newHeight = window.innerHeight - e.clientY;
      // Constrain height between 40px (collapsed) and 80vh
      const minHeight = 40;
      const maxHeight = window.innerHeight * 0.8;
      const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

      setConsoleHeight(constrainedHeight);

      // Auto-expand if dragging up from collapsed state
      if (constrainedHeight > 100 && !consoleExpanded) {
        setConsoleExpanded(true);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, consoleExpanded]);

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages, copilotLoading]);

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

  // Load AI Copilot conversation history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('voiceflow_copilot_history');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setCopilotMessages(history);
        console.log('💬 Loaded copilot conversation history');
      } catch (error) {
        console.error('Failed to load copilot history:', error);
      }
    }
  }, []);

  // Save AI Copilot conversation history when it changes
  useEffect(() => {
    if (copilotMessages.length > 0) {
      localStorage.setItem('voiceflow_copilot_history', JSON.stringify(copilotMessages));
      console.log('💬 Saved copilot conversation history');
    }
  }, [copilotMessages]);

  // Autosave to localStorage every 10 seconds
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (nodes.length > 0 || edges.length > 0) {
        const workflowData = {
          agentName,
          nodes,
          edges,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('voiceflow_autosave', JSON.stringify(workflowData));
        setLastSaved(new Date());
        console.log('💾 Autosaved workflow');
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(autosaveInterval);
  }, [nodes, edges, agentName]);

  // Load autosaved workflow on mount
  useEffect(() => {
    const autosaved = localStorage.getItem('voiceflow_autosave');
    if (autosaved) {
      try {
        const data = JSON.parse(autosaved);
        console.log('📂 Found autosaved workflow from:', data.timestamp);
        // Don't auto-restore, let user decide
      } catch (error) {
        console.error('Failed to parse autosaved data:', error);
      }
    }
  }, []);

  // Restore from autosave
  const restoreAutosave = () => {
    const autosaved = localStorage.getItem('voiceflow_autosave');
    if (autosaved) {
      try {
        const data = JSON.parse(autosaved);
        setAgentName(data.agentName);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        addLog('success', `✅ Restored workflow from ${new Date(data.timestamp).toLocaleString()}`);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to restore autosave:', error);
        addLog('error', 'Failed to restore autosave');
      }
    }
  };

  // Mark as unsaved when workflow changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges]);

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

  // Save configuration and create agent
  const handleSave = async () => {
    try {
      addLog('info', '💾 Starting agent creation process...');
      addLog('info', `Agent Name: "${agentName}"`);
      addLog('info', `Total nodes: ${nodes.length}, connections: ${edges.length}`);

      // Validate required nodes
      const voiceNode = nodes.find(n => n.type === 'voice');
      const promptNode = nodes.find(n => n.type === 'prompt');

      if (!voiceNode || !voiceNode.data.voiceId) {
        addLog('error', 'Voice node is missing or not configured!');
        alert('Please add and configure a Voice node before saving');
        return;
      }

      if (!promptNode || !promptNode.data.prompt) {
        addLog('error', 'Prompt node is missing or not configured!');
        alert('Please add and configure a Prompt node before saving');
        return;
      }

      addLog('success', `Voice selected: ${voiceNode.data.voiceName || voiceNode.data.voiceId}`);
      addLog('success', 'System prompt configured');

      // Prepare agent data
      const agentData = {
        name: agentName,
        voiceId: voiceNode.data.voiceId,
        prompt: promptNode.data.prompt,
        firstMessage: promptNode.data.firstMessage || 'Hello! How can I help you today?',
        language: voiceNode.data.language || 'en',
        temperature: promptNode.data.temperature || 0.7,
        maxTokens: promptNode.data.maxTokens || 500
      };

      addLog('info', 'Sending request to ElevenLabs API...', agentData);

      // Call backend to create agent
      const response = await api.post('/elevenlabs/agents/create', agentData);

      addLog('success', '🎉 Agent created successfully!', {
        agentId: response.data.agent.id,
        elevenLabsId: response.data.agent.elevenLabsAgentId
      });

      addLog('info', 'Agent is now ready to use!');

      alert(`✅ Agent "${agentName}" created successfully!\n\nAgent ID: ${response.data.agent.id}`);

      // Navigate to agent detail page
      setTimeout(() => {
        navigate(`/app/agents/${response.data.agent.id}`);
      }, 1500);

    } catch (error) {
      addLog('error', `Failed to create agent: ${error.message}`, {
        error: error.response?.data || error.toString()
      });
      alert(`Failed to create agent: ${error.response?.data?.message || error.message}`);
    }
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
        agentName,
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
        edgeCount: edges.length,
        // Include recent console logs for debugging
        recentLogs: consoleLogs.slice(-10).map(log => ({
          type: log.type,
          message: log.message,
          timestamp: log.timestamp
        }))
      };

      // Call AI service
      const response = await api.post('/ai/workflow-copilot', {
        message: userMessage,
        workflow: workflowContext,
        conversationHistory: copilotMessages.slice(-6) // Last 3 exchanges
      });

      const aiResponse = response.data;

      // Add AI response to chat
      setCopilotMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.message,
        suggestions: aiResponse.suggestions,
        changes: aiResponse.changes
      }]);

      // If AI suggests changes, apply them
      if (aiResponse.changes) {
        const tempIdMap = new Map(); // Map temp IDs to actual node IDs

        // First pass: Add all new nodes with smart positioning
        if (aiResponse.changes.nodes) {
          const nodesToAdd = aiResponse.changes.nodes.filter(c => c.action === 'add');

          nodesToAdd.forEach((change, index) => {
            // Calculate smart position based on existing nodes
            let xPos = 250;
            let yPos = 250;

            if (nodes.length === 0) {
              // First node - centered
              xPos = 400;
              yPos = 200;
            } else {
              // Position to the right of the rightmost node
              const rightmostNode = nodes.reduce((max, n) =>
                n.position.x > max.position.x ? n : max, nodes[0]);
              xPos = rightmostNode.position.x + 300;
              yPos = rightmostNode.position.y + (index * 150);
            }

            const actualNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            tempIdMap.set(change.tempId, actualNodeId);

            const newNode = {
              id: actualNodeId,
              type: change.type,
              position: { x: xPos, y: yPos },
              data: change.data || {}
            };

            setNodes(nds => [...nds, newNode]);
            addLog('success', `AI added ${change.type} node`);
          });

          // Second pass: Update existing nodes
          aiResponse.changes.nodes.forEach(change => {
            if (change.action === 'update') {
              setNodes(nds =>
                nds.map(n => n.id === change.nodeId ? { ...n, data: { ...n.data, ...change.data } } : n)
              );
              addLog('success', `AI updated node`);
            } else if (change.action === 'delete') {
              setNodes(nds => nds.filter(n => n.id !== change.nodeId));
              setEdges(eds => eds.filter(e => e.source !== change.nodeId && e.target !== change.nodeId));
              addLog('success', `AI removed node`);
            }
          });
        }

        // Third pass: Add edges (after all nodes are created)
        if (aiResponse.changes.edges) {
          setTimeout(() => {
            aiResponse.changes.edges.forEach(change => {
              if (change.action === 'add') {
                // Map temp IDs to actual IDs
                const sourceId = tempIdMap.get(change.source) || change.source;
                const targetId = tempIdMap.get(change.target) || change.target;

                setEdges(eds => addEdge({
                  id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  source: sourceId,
                  target: targetId,
                  animated: true,
                  type: 'smoothstep'
                }, eds));
                addLog('success', `AI connected nodes`);
              }
            });
          }, 100); // Small delay to ensure nodes are rendered
        }
      }

    } catch (error) {
      console.error('Copilot error:', error);
      setCopilotMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error: ${error.response?.data?.error || error.message}. I'm here to help with workflow suggestions, node configurations, and best practices!`
      }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Auto-collapse node palette on mobile, expanded on desktop
  const [showNodePalette, setShowNodePalette] = useState(window.innerWidth >= 768);

  return (
    <div className="flex flex-col bg-background" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top Toolbar - Mobile Responsive */}
      <div className="bg-card border-b border-border px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => navigate('/app/agent-studio')}
            className="p-1.5 sm:p-2 hover:bg-muted rounded-lg touch-manipulation"
            title="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="px-2 sm:px-3 py-1 bg-muted border border-border rounded-lg font-medium text-sm sm:text-base w-24 sm:w-auto"
            placeholder="Agent name..."
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          {localStorage.getItem('voiceflow_autosave') && (
            <button
              onClick={restoreAutosave}
              className="px-2 sm:px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm touch-manipulation"
              title="Restore your last autosaved workflow"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Restore Autosave</span>
            </button>
          )}
          <div className="hidden md:block text-sm text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
            {lastSaved && (
              <div className="text-xs text-green-600">
                ✓ Autosaved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1 sm:gap-2 touch-manipulation"
            title="Save Agent"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handleTest}
            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 sm:gap-2 touch-manipulation"
            title="Test Agent"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Test Agent</span>
          </button>
          <button
            onClick={() => setShowExecutions(!showExecutions)}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 touch-manipulation hidden md:flex ${
              showExecutions
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            title="View Executions"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">Executions</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Area with Split View - Mobile Responsive */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Builder Side - Full width on mobile, 2/3 on desktop when executions shown */}
        <div className={`${showExecutions ? 'w-full md:w-2/3' : 'w-full'} flex flex-col transition-all duration-300`}>
          <div
        className="flex relative overflow-hidden"
        style={{
          height: `calc(100vh - 60px - ${consoleExpanded ? consoleHeight : 40}px)`
        }}
      >
        {/* Collapsible Node Palette - Auto-collapsed on mobile */}
        <div className={`${showNodePalette ? 'w-48 sm:w-64' : 'w-10 sm:w-12'} bg-card border-r border-border transition-all duration-300 overflow-hidden`}>
          <div className="p-2 h-full overflow-y-auto">
            <button
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="w-full p-2 hover:bg-muted rounded mb-2 sticky top-0 bg-card z-10"
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
                      className="p-2 bg-muted border border-border rounded cursor-move hover:shadow-md hover:scale-105 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" style={{ color: template.color }} />
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
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeClick={(event, node) => {
              setSelectedNodeForInspection(node);
              setConsoleTab('inspector');
            }}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#aaa" gap={16} />
            <ZoomSlider position="top-left" orientation="horizontal" />
            <Controls
              style={{
                bottom: 100,
                left: 10
              }}
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'voice') return '#3b82f6';
                if (node.type === 'prompt') return '#a855f7';
                if (node.type === 'variable') return '#22c55e';
                if (node.type === 'knowledge') return '#f97316';
                if (node.type === 'trigger') return '#eab308';
                if (node.type === 'webhook') return '#06b6d4';
                if (node.type === 'test') return '#ef4444';
                return '#888';
              }}
              className="!bg-card !border-2 !border-border !shadow-lg !rounded-lg"
              style={{
                bottom: 100,
                right: 10
              }}
            />
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
          addLog={addLog}
        />
      )}

      {/* Debug Console - Sliding Panel with Tabs - Mobile Responsive */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex flex-col z-50"
        style={{
          height: consoleExpanded ? `${Math.min(consoleHeight, window.innerWidth < 768 ? 250 : consoleHeight)}px` : '40px',
          transition: isResizing ? 'none' : 'height 0.3s ease-in-out'
        }}
      >
        {/* Resize Handle */}
        {consoleExpanded && (
          <div
            onMouseDown={() => setIsResizing(true)}
            onDoubleClick={() => setConsoleHeight(384)}
            className="h-1 w-full bg-muted hover:bg-purple-500 cursor-ns-resize transition-colors relative group"
            title="Drag to resize • Double-click to reset size"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-1 bg-border group-hover:bg-purple-500 rounded-full transition-colors"></div>
            </div>
          </div>
        )}
        {/* Console Header - Always Visible - Mobile Responsive */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-muted border-b border-border">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 cursor-pointer touch-manipulation" onClick={() => setConsoleExpanded(!consoleExpanded)}>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Console</h3>
            </div>

            {/* Tabs - Scrollable on mobile */}
            {consoleExpanded && (
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setConsoleTab('logs')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    consoleTab === 'logs'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📋 Logs ({consoleLogs.length})
                </button>
                <button
                  onClick={() => setConsoleTab('workflow')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    consoleTab === 'workflow'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📄 Workflow JSON
                </button>
                <button
                  onClick={() => setConsoleTab('inspector')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    consoleTab === 'inspector'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🔍 Node Inspector
                  {selectedNodeForInspection && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]">
                      {selectedNodeForInspection.type}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setConsoleTab('copilot')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    consoleTab === 'copilot'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🤖 AI Copilot
                  {copilotMessages.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white rounded text-[10px]">
                      {copilotMessages.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {consoleExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConsoleSplitView(!consoleSplitView);
                  if (!consoleSplitView) {
                    // Auto-expand console when enabling split view
                    if (consoleHeight < 300) {
                      setConsoleHeight(500);
                    }
                  }
                }}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  consoleSplitView
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-background hover:bg-muted border border-border'
                }`}
                title="Split view: Logs + AI Chat side by side"
              >
                <Menu className="h-3 w-3 rotate-90" />
                Split View
              </button>
            )}
            {consoleTab === 'logs' && (
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
            {consoleTab === 'workflow' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const workflow = { nodes, edges, agentName };
                  const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${agentName.replace(/\s+/g, '-')}-workflow.json`;
                  a.click();
                }}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                💾 Export JSON
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
          <div className={`flex-1 overflow-hidden bg-gray-950 ${consoleSplitView ? 'flex' : ''}`}>
            {/* Split View Mode: Logs + AI Chat side by side */}
            {consoleSplitView ? (
              <>
                {/* Left Panel: Logs */}
                <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                  <div className="p-3 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-100">📋 Logs ({consoleLogs.length})</h4>
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="text-xs text-gray-600 dark:text-gray-200 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="p-4 font-mono text-xs">
                    {consoleLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">
                        📋 No logs yet
                      </div>
                    ) : (
                      consoleLogs.map((log) => (
                        <div
                          key={log.id}
                          className="mb-2 flex gap-2 cursor-move hover:bg-gray-800 p-1 rounded"
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`);
                          }}
                          title="Drag to AI chat to discuss this log"
                        >
                          <span className="text-gray-500">[{log.timestamp}]</span>
                          <span className={
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                            log.type === 'info' ? 'text-blue-400' :
                            'text-gray-700 dark:text-gray-100'
                          }>
                            {log.type === 'success' && '✅ '}
                            {log.type === 'error' && '❌ '}
                            {log.type === 'warning' && '⚠️ '}
                            {log.type === 'info' && 'ℹ️ '}
                            {log.message}
                          </span>
                          {log.data && (
                            <details className="text-gray-600 dark:text-gray-200 cursor-pointer">
                              <summary className="hover:text-gray-700 dark:text-gray-100">View Data</summary>
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
                </div>

                {/* Right Panel: AI Chat (copilot content) */}
                <div className="w-1/2 flex flex-col">
                  <div className="p-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-100">🤖 AI Copilot</h4>
                  </div>

                  {/* AI Chat Messages - scrollable area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {copilotMessages.length === 0 ? (
                      <div className="text-gray-500 flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="text-4xl">🤖</div>
                        <div className="text-sm max-w-md">
                          <p className="font-semibold text-white mb-2 text-center">AI Workflow Copilot</p>
                          <p className="text-center text-xs">Drag logs from the left panel to ask questions!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {copilotMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                🤖
                              </div>
                            )}
                            <div className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-100'
                            }`}>
                              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                                  <div className="text-xs font-semibold text-purple-400">Suggestions:</div>
                                  {msg.suggestions.map((suggestion, sidx) => (
                                    <div key={sidx} className="text-xs bg-gray-900 p-2 rounded">
                                      💡 {suggestion}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {msg.changes && (
                                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                                  <div className="text-xs font-semibold text-green-400">✅ Changes Applied:</div>
                                  {msg.changes.nodes && msg.changes.nodes.length > 0 && (
                                    <div className="text-xs space-y-1">
                                      {msg.changes.nodes.map((change, cidx) => (
                                        <div key={cidx} className="bg-gray-900 p-2 rounded flex items-center gap-2">
                                          {change.action === 'add' && <span className="text-green-400">➕ Added {change.type} node</span>}
                                          {change.action === 'update' && <span className="text-blue-400">✏️ Updated node</span>}
                                          {change.action === 'delete' && <span className="text-red-400">🗑️ Removed node</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {msg.changes.edges && msg.changes.edges.length > 0 && (
                                    <div className="text-xs bg-gray-900 p-2 rounded">
                                      🔗 Connected {msg.changes.edges.length} node{msg.changes.edges.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {msg.role === 'user' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                👤
                              </div>
                            )}
                          </div>
                        ))}
                        {copilotLoading && (
                          <div className="flex gap-3 justify-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                              🤖
                            </div>
                            <div className="bg-gray-800 text-gray-100 rounded-lg p-3">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>

                  {/* AI Chat Input */}
                  <div
                    className="border-t border-gray-700 p-3 flex-shrink-0"
                    onDrop={(e) => {
                      e.preventDefault();
                      const text = e.dataTransfer.getData('text/plain');
                      if (text) {
                        setCopilotInput(prev => prev ? `${prev}\n\n${text}` : text);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                      <div className="flex gap-2">
                        <textarea
                          value={copilotInput}
                          onChange={(e) => setCopilotInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !copilotLoading) {
                              e.preventDefault();
                              handleCopilotMessage();
                            }
                          }}
                          placeholder="Ask AI or drop logs here..."
                          disabled={copilotLoading}
                          rows={3}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                        <div className="flex flex-col gap-2">
                          {copilotMessages.length > 0 && (
                            <button
                              onClick={() => {
                                setCopilotMessages([]);
                                localStorage.removeItem('voiceflow_copilot_history');
                                addLog('info', 'Cleared AI Copilot conversation history');
                              }}
                              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"
                              title="Clear conversation history"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={handleCopilotMessage}
                            disabled={copilotLoading || !copilotInput.trim()}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center gap-2"
                          >
                            {copilotLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    <div className="mt-2 text-xs text-gray-500">
                      💡 Drag logs to input • Shift+Enter for new line
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Single Tab View (original) */
              <div className="flex-1 overflow-y-auto">
                {/* Logs Tab */}
                {consoleTab === 'logs' && (
              <div className="p-4 font-mono text-xs">
                {consoleLogs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    📋 No logs yet. Test your nodes and execution logs will appear here.
                  </div>
                ) : (
                  consoleLogs.map((log) => (
                    <div key={log.id} className="mb-2 flex gap-2">
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className={
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'info' ? 'text-blue-400' :
                        'text-gray-700 dark:text-gray-100'
                      }>
                        {log.type === 'success' && '✅ '}
                        {log.type === 'error' && '❌ '}
                        {log.type === 'warning' && '⚠️ '}
                        {log.type === 'info' && 'ℹ️ '}
                        {log.message}
                      </span>
                      {log.data && (
                        <details className="text-gray-600 dark:text-gray-200 cursor-pointer">
                          <summary className="hover:text-gray-700 dark:text-gray-100">View Data</summary>
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
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200">
                  <FileText className="h-4 w-4" />
                  <span>Complete workflow schema - nodes and connections</span>
                </div>
                <pre className="text-xs text-cyan-300 overflow-x-auto">
                  {JSON.stringify({
                    agentName,
                    nodes: nodes.map(n => ({
                      id: n.id,
                      type: n.type,
                      position: n.position,
                      data: n.data
                    })),
                    edges: edges.map(e => ({
                      id: e.id,
                      source: e.source,
                      target: e.target,
                      sourceHandle: e.sourceHandle,
                      targetHandle: e.targetHandle
                    }))
                  }, null, 2)}
                </pre>
              </div>
            )}

            {/* Node Inspector Tab */}
            {consoleTab === 'inspector' && (
              <div className="p-4">
                {selectedNodeForInspection ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                      <Brain className="h-5 w-5 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">
                        {selectedNodeForInspection.type.toUpperCase()} Node
                      </h3>
                      <span className="text-xs text-gray-500">ID: {selectedNodeForInspection.id}</span>
                    </div>

                    {/* Node Configuration */}
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-200 mb-2 flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        Configuration
                      </div>
                      <pre className="text-xs text-green-300 bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedNodeForInspection.data || {}, null, 2)}
                      </pre>
                    </div>

                    {/* Position */}
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-200 mb-2">Position</div>
                      <pre className="text-xs text-yellow-300 bg-gray-900 p-3 rounded border border-gray-700">
                        {JSON.stringify(selectedNodeForInspection.position, null, 2)}
                      </pre>
                    </div>

                    {/* Connections */}
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-200 mb-2 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Connections
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-xs text-purple-300 mb-2">
                          Incoming: {edges.filter(e => e.target === selectedNodeForInspection.id).length}
                        </div>
                        <div className="text-xs text-cyan-300">
                          Outgoing: {edges.filter(e => e.source === selectedNodeForInspection.id).length}
                        </div>
                      </div>
                    </div>

                    {/* Full Node Schema */}
                    <details className="mt-4">
                      <summary className="text-xs text-gray-600 dark:text-gray-100 cursor-pointer hover:text-gray-700 dark:hover:text-white">
                        View Complete Node Schema
                      </summary>
                      <pre className="mt-2 text-[10px] text-gray-600 dark:text-gray-200 bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedNodeForInspection, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    🔍 Click on any node in the workflow to inspect its configuration and connections
                  </div>
                )}
              </div>
            )}

            {/* AI Copilot Tab */}
            {consoleTab === 'copilot' && (
              <div className="flex flex-col h-full">
                {/* Copilot Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {copilotMessages.length === 0 ? (
                    <div className="text-gray-500 flex flex-col items-center justify-center py-8 space-y-4">
                      <div className="text-4xl">🤖</div>
                      <div className="text-sm max-w-md">
                        <p className="font-semibold text-white mb-2 text-center">AI Workflow Copilot</p>
                        <p className="text-center">I can build, modify, debug, and test your workflow!</p>
                        <p className="mt-4 text-xs text-gray-600 dark:text-gray-200 text-center">Try these commands:</p>
                        <ul className="mt-2 text-xs space-y-1 pl-0">
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400">•</span>
                            <span>"Build a complete customer service agent"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400">•</span>
                            <span>"Add appointment scheduling"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400">•</span>
                            <span>"What's missing from this workflow?"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400">•</span>
                            <span>"Add a test node so I can call my agent"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400">•</span>
                            <span>"What do these error logs mean?"</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400">•</span>
                            <span>"How do I test this workflow?"</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    copilotMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                            🤖
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-100'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                          {msg.suggestions && msg.suggestions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                              <div className="text-xs font-semibold text-purple-400">Suggestions:</div>
                              {msg.suggestions.map((suggestion, sidx) => (
                                <div key={sidx} className="text-xs bg-gray-900 p-2 rounded">
                                  💡 {suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.changes && (
                            <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                              <div className="text-xs font-semibold text-green-400">✅ Changes Applied:</div>
                              {msg.changes.nodes && msg.changes.nodes.length > 0 && (
                                <div className="text-xs space-y-1">
                                  {msg.changes.nodes.map((change, cidx) => (
                                    <div key={cidx} className="bg-gray-900 p-2 rounded flex items-center gap-2">
                                      {change.action === 'add' && <span className="text-green-400">➕ Added {change.type} node</span>}
                                      {change.action === 'update' && <span className="text-blue-400">✏️ Updated node</span>}
                                      {change.action === 'delete' && <span className="text-red-400">🗑️ Removed node</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {msg.changes.edges && msg.changes.edges.length > 0 && (
                                <div className="text-xs bg-gray-900 p-2 rounded">
                                  🔗 Connected {msg.changes.edges.length} node{msg.changes.edges.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            👤
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {copilotLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                        🤖
                      </div>
                      <div className="bg-gray-800 text-gray-100 rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Copilot Input */}
                <div className="border-t border-gray-700 p-3 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !copilotLoading && handleCopilotMessage()}
                      placeholder="Ask AI about your workflow..."
                      disabled={copilotLoading}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {copilotMessages.length > 0 && (
                      <button
                        onClick={() => {
                          setCopilotMessages([]);
                          localStorage.removeItem('voiceflow_copilot_history');
                          addLog('info', 'Cleared AI Copilot conversation history');
                        }}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"
                        title="Clear conversation history"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={handleCopilotMessage}
                      disabled={copilotLoading || !copilotInput.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center gap-2"
                    >
                      {copilotLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Ask
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                    <span>💡 Tip: I can see your current workflow ({nodes.length} nodes, {edges.length} connections) and suggest improvements</span>
                    {copilotMessages.length > 0 && (
                      <span className="text-purple-400">💬 {copilotMessages.length} messages saved</span>
                    )}
                  </div>
                </div>
              </div>
            )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

        {/* Executions Side - Hidden on mobile, shown on desktop */}
        {showExecutions && (
          <div className="hidden md:flex w-full md:w-1/3 border-l border-border bg-card flex-col overflow-hidden">
            {/* Executions Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold text-foreground">Workflow Executions</h2>
              </div>
              <button
                onClick={() => setShowExecutions(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Executions Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {executions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No executions yet</p>
                  <p className="text-xs mt-2">Test your workflow to see execution results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution, idx) => (
                    <div key={idx} className="bg-muted rounded-lg p-3 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {execution.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : execution.status === 'failed' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          )}
                          <span className="text-sm font-medium">
                            {execution.type === 'call' ? '📞 Voice Call' :
                             execution.type === 'sms' ? '💬 SMS' :
                             execution.type === 'test' ? '🧪 Test' : '⚡ Execution'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(execution.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        {execution.phoneNumber && (
                          <div className="text-muted-foreground">
                            📱 {execution.phoneNumber}
                          </div>
                        )}
                        {execution.duration && (
                          <div className="text-muted-foreground">
                            ⏱️ Duration: {execution.duration}s
                          </div>
                        )}
                        {execution.message && (
                          <div className={`mt-2 p-2 rounded ${
                            execution.status === 'success' ? 'bg-green-50 text-green-800' :
                            execution.status === 'failed' ? 'bg-red-50 text-red-800' :
                            'bg-blue-50 text-blue-800'
                          }`}>
                            {execution.message}
                          </div>
                        )}
                        {execution.callId && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            ID: {execution.callId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Configuration Modal
function ConfigurationModal({ node, voices, onClose, onSave, onDelete, addLog }) {
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
          {node.type === 'inboundCall' && <InboundCallConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'outboundCall' && <OutboundCallConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'voice' && <VoiceConfig formData={formData} setFormData={setFormData} voices={voices} />}
          {node.type === 'prompt' && <PromptConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'variable' && <VariableConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'knowledge' && <KnowledgeConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'trigger' && <TriggerConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'keywordTrigger' && <KeywordTriggerConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'aiDecision' && <AIDecisionConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'aiGenerator' && <AIGeneratorConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'aiExtractor' && <AIExtractorConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'aiIntent' && <AIIntentConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'humanHandoff' && <HumanHandoffConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'calendar' && <CalendarConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'code' && <CodeConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'voiceCall' && <VoiceCallConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'sms' && <SMSConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'mms' && <MMSConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'email' && <EmailConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'webhook' && <WebhookConfig formData={formData} setFormData={setFormData} />}
          {node.type === 'test' && <TestConfig formData={formData} setFormData={setFormData} addLog={addLog} />}
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
            <div className="p-3 bg-green-500/10 border-2 border-green-500 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-medium text-foreground">
                    {formData.voiceName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Voice selected
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFormData({ ...formData, voiceId: null, voiceName: null })}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
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
              <div className="p-4 bg-green-500/10 border-2 border-green-500 rounded-lg shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-white font-bold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                      Selected Voice
                    </p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
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
              <div className="p-4 bg-secondary border-2 border-dashed border-border rounded-lg">
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
  const [showWizard, setShowWizard] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const promptExamples = [
    {
      name: "Surprise Granite - Front Desk",
      prompt: `You are the friendly front desk receptionist for Surprise Granite, a premier countertop fabrication and installation company based in Surprise, Arizona.

**COMPANY INFORMATION:**
📍 Business: Surprise Granite
🏗️ Services:
- Custom countertop fabrication and installation
- Kitchen remodeling and renovation
- Bathroom remodeling and renovation
- Commercial countertop projects
- Residential countertop projects

💎 Materials We Work With:
- Granite, Marble, Quartz, Quartzite, Porcelain, Solid Surface, and more

**KNOWLEDGE BASE:**
🌐 Website: www.surprisegranite.com
📋 Vendor List: www.surprisegranite.com/company/vendors-list

**YOUR ROLE:**
1. **Greet warmly** - Make customers feel welcome
2. **Qualify needs** - Kitchen? Bathroom? Commercial? Materials? Timeline?
3. **Provide information** - Services, materials, process, warranties
4. **Schedule consultations** - Offer FREE in-home consultations
5. **Handle transfers** - Connect to sales, project manager, or owner when needed

**CONSULTATION SCHEDULING:**
Offer FREE in-home consultations where we:
- Measure the space
- Show material samples
- Discuss design options
- Provide detailed quote

Ask for: Name, Phone, Email, Address, Project type, Preferred date/time

**COMMON Q&A:**
Q: "What materials do you offer?"
A: "We work with all premium materials - granite, marble, quartz, quartzite, porcelain, solid surface. See our full vendor list at www.surprisegranite.com/company/vendors-list. I'd love to schedule a free consultation to show you samples!"

Q: "How much does it cost?"
A: "Pricing varies by material, square footage, and complexity. Our free in-home consultation gives you an accurate quote. Would you like to schedule that?"

Q: "How long does installation take?"
A: "Most residential projects take 7-10 days from template to installation."

**TONE:** Friendly, professional, patient, enthusiastic about helping with their project`,
      firstMessage: "Thank you for calling Surprise Granite! This is your AI assistant. How can I help you with your countertop project today?",
      agentId: "agent_9301k802kktwfbhrbe9bam7f1spe"
    },
    {
      name: "David - Remodely.ai Assistant",
      prompt: "You are David, Remodely.ai's AI voice assistant. You help customers learn about Remodely.ai's Voice Workflow CRM platform.\n\nYour personality:\n- Friendly, professional, and knowledgeable\n- Enthusiastic about AI and automation\n- Patient and helpful with technical questions\n- Conversational but efficient\n\nKey features to discuss:\n- 24/7 AI voice agents (powered by ElevenLabs)\n- Visual workflow automation builder\n- Full CRM with lead & deal management\n- Multi-channel communication (voice, SMS, email)\n- Integrations with Google, Slack, Stripe, n8n, and more\n- No coding required\n\nPricing plans:\n- Starter: $99/mo (1 agent, 500 calls/month, basic CRM)\n- Professional: $299/mo (5 agents, unlimited calls, advanced workflows)\n- Enterprise: Custom (unlimited everything, dedicated support)\n\nYour goals:\n- Answer questions about features and pricing\n- Qualify leads by understanding their needs\n- Offer to schedule demos or provide more information\n- Guide users to signup at remodely.ai/signup\n- Be helpful and showcase the platform's capabilities",
      firstMessage: "Hey there! I'm David, your AI assistant from Remodely.ai. I'm here to help you discover how our Voice Workflow CRM can transform your business with 24/7 AI agents. What would you like to know?",
      agentId: "agent_8101ka4wyweke1s9np3je7npewrr"
    },
    {
      name: "Customer Support Agent",
      prompt: "You are a friendly and helpful customer support agent. Your goal is to assist customers with their questions and resolve any issues they may have. Always be polite, patient, and professional. If you don't know the answer, offer to connect them with a specialist.",
      firstMessage: "Hello! Thank you for contacting us. How can I help you today?"
    },
    {
      name: "Sales Assistant",
      prompt: "You are an enthusiastic sales assistant helping customers find the perfect products. Ask questions to understand their needs, provide personalized recommendations, and highlight key benefits. Be persuasive but not pushy.",
      firstMessage: "Hi there! I'm excited to help you find exactly what you're looking for. What brings you in today?"
    },
    {
      name: "Appointment Scheduler",
      prompt: "You are a professional appointment scheduler. Your job is to help customers book appointments efficiently. Collect their name, preferred date/time, and reason for visit. Confirm all details before finalizing.",
      firstMessage: "Good day! I can help you schedule an appointment. May I have your name to get started?"
    },
    {
      name: "Lead Qualifier",
      prompt: "You are a lead qualification specialist. Ask qualifying questions to understand the prospect's needs, budget, timeline, and decision-making authority. Be conversational and build rapport while gathering information.",
      firstMessage: "Hello! Thanks for your interest. I'd love to learn more about your needs. What challenges are you looking to solve?"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Help Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Wand2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
              Create Your Agent's Personality
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
              The system prompt defines how your agent behaves, speaks, and responds. Be specific about tone, style, and goals.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWizard(!showWizard)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Wizard
              </button>
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="px-3 py-1.5 bg-card border border-border border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs rounded-md flex items-center gap-1.5 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                {showExamples ? 'Hide' : 'Show'} Examples
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Wizard */}
      {showWizard && (
        <div className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-purple-900 dark:text-purple-100">AI Prompt Wizard</h4>
          </div>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Answer a few questions and I'll generate the perfect prompt for you!
          </p>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
                What's your agent's main purpose?
              </label>
              <select className="w-full px-3 py-2 bg-card border border-purple-300 dark:border-purple-700 rounded-md text-sm">
                <option>Customer Support</option>
                <option>Sales & Lead Generation</option>
                <option>Appointment Booking</option>
                <option>Information & FAQs</option>
                <option>Order Taking</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
                What tone should your agent use?
              </label>
              <select className="w-full px-3 py-2 bg-card border border-purple-300 dark:border-purple-700 rounded-md text-sm">
                <option>Friendly & Casual</option>
                <option>Professional & Formal</option>
                <option>Enthusiastic & Energetic</option>
                <option>Calm & Empathetic</option>
              </select>
            </div>
            <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md font-medium text-sm flex items-center justify-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generate Prompt with AI
            </button>
          </div>
        </div>
      )}

      {/* Example Prompts */}
      {showExamples && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Example Prompts
          </h4>
          <div className="space-y-2">
            {promptExamples.map((example, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors cursor-pointer" onClick={() => {
                const updatedFormData = {
                  ...formData,
                  prompt: example.prompt,
                  firstMessage: example.firstMessage
                };
                // If example has an agentId, set it in testData
                if (example.agentId) {
                  updatedFormData.testData = {
                    ...formData.testData,
                    elevenLabsAgentId: example.agentId
                  };
                }
                setFormData(updatedFormData);
                setShowExamples(false);
              }}>
                <div className="font-medium text-sm text-foreground mb-1">
                  {example.name}
                  {example.agentId && (
                    <span className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      ElevenLabs Agent
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{example.prompt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-2">
          System Prompt *
          <span className="text-xs text-muted-foreground font-normal">(This defines your agent's behavior)</span>
        </label>
        <textarea
          value={formData.prompt || ''}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          rows={10}
          placeholder="Example: You are a helpful customer service agent for ABC Company. You help customers with product questions, order status, and returns. Always be polite, patient, and professional. If you can't answer something, offer to transfer to a human agent."
          className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 bg-background text-foreground font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          💡 <strong>Tips:</strong> Be specific about goals, tone, and boundaries. Include what your agent should and shouldn't do.
        </p>
      </div>

      {/* First Message */}
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-2">
          First Message
          <span className="text-xs text-muted-foreground font-normal">(Optional - How your agent greets customers)</span>
        </label>
        <input
          type="text"
          value={formData.firstMessage || ''}
          onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
          placeholder="Example: Hi! Thanks for calling ABC Company. I'm here to help with any questions you have. How can I assist you today?"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-2">
          💡 <strong>Tips:</strong> Keep it friendly and clear. Mention your company name and what you can help with.
        </p>
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
      {/* Help Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
              Give Your Agent Knowledge
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Upload documents, add website URLs, or paste text that your agent should know about. This helps your agent answer specific questions about your products, services, or policies.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Documents */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Documents
          <span className="text-xs text-muted-foreground font-normal">(PDFs, DOCs, TXT files)</span>
        </label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">Click to upload files</p>
            <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX, TXT (max 10MB each)</p>
          </label>
        </div>
        <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-md p-3">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Examples:</strong> Product catalogs, FAQ documents, policy manuals, pricing sheets, technical specifications
          </p>
        </div>
      </div>

      {/* Add URLs */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Add Website URLs
          <span className="text-xs text-muted-foreground font-normal">(Your agent will learn from these pages)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://yourwebsite.com/about"
            className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground"
            onKeyPress={(e) => e.key === 'Enter' && addUrl()}
          />
          <button
            onClick={addUrl}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-md p-3">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Examples:</strong> https://company.com/faq, https://company.com/products, https://company.com/pricing
          </p>
        </div>

        {/* URL List */}
        {formData.urls && formData.urls.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-foreground">Added URLs ({formData.urls.length})</p>
            {formData.urls.map((url, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{url}</span>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, urls: formData.urls.filter((_, idx) => idx !== i) })}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950 rounded text-red-600 dark:text-red-400 transition-colors flex-shrink-0"
                  title="Remove URL"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(!formData.urls || formData.urls.length === 0) && (
          <div className="mt-3 p-4 border-2 border-dashed border-border rounded-lg text-center">
            <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No URLs added yet</p>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Pro Tips
        </h4>
        <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
          <li>• Add your most frequently asked questions and answers</li>
          <li>• Include product specifications and pricing information</li>
          <li>• Upload company policies and guidelines</li>
          <li>• Add contact information and business hours</li>
          <li>• The more information you provide, the better your agent can help customers!</li>
        </ul>
      </div>
    </div>
  );
}

function InboundCallConfig({ formData, setFormData }) {
  const [myNumbers, setMyNumbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user's Twilio numbers
    const fetchNumbers = async () => {
      try {
        console.log('🔄 Fetching phone numbers from API...');
        const response = await api.get('/phone-numbers/my-numbers');
        console.log('📞 Phone numbers response:', response.data);

        const numbers = response.data?.phoneNumbers || response.data?.numbers || [];
        console.log('📊 Parsed numbers:', numbers);

        setMyNumbers(numbers);
      } catch (error) {
        console.error('❌ Failed to fetch phone numbers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNumbers();
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <PhoneIncoming className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <div className="font-semibold text-green-900">Inbound Call Configuration</div>
            <div className="text-sm text-green-700 mt-1">
              Configure which Twilio number will receive incoming calls for this agent.
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Select Twilio Number *</label>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading your phone numbers...</div>
        ) : myNumbers.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-800">
              You don't have any phone numbers yet. <a href="/app/phone-marketplace" className="text-blue-600 hover:underline">Purchase a number</a> to get started.
            </div>
          </div>
        ) : (
          <select
            value={formData.twilioNumber || ''}
            onChange={(e) => {
              const selected = myNumbers.find(n => n.phoneNumber === e.target.value);
              setFormData({
                ...formData,
                twilioNumber: e.target.value,
                friendlyName: selected?.friendlyName || '',
                phoneNumberSid: selected?.sid || ''
              });
            }}
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="">Choose a phone number...</option>
            {myNumbers.map((number) => (
              <option key={number.sid} value={number.phoneNumber}>
                {number.phoneNumber} {number.friendlyName && `- ${number.friendlyName}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {formData.twilioNumber && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            ✅ Calls to <strong>{formData.twilioNumber}</strong> will be handled by this agent workflow.
          </div>
        </div>
      )}
    </div>
  );
}

function OutboundCallConfig({ formData, setFormData }) {
  const [myNumbers, setMyNumbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user's Twilio numbers
    const fetchNumbers = async () => {
      try {
        console.log('🔄 Fetching phone numbers from API...');
        const response = await api.get('/phone-numbers/my-numbers');
        console.log('📞 Phone numbers response:', response.data);

        const numbers = response.data?.phoneNumbers || response.data?.numbers || [];
        console.log('📊 Parsed numbers:', numbers);

        setMyNumbers(numbers);
      } catch (error) {
        console.error('❌ Failed to fetch phone numbers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNumbers();
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <PhoneOutgoing className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900">Outbound Call Configuration</div>
            <div className="text-sm text-blue-700 mt-1">
              Configure which Twilio number to use when making outbound calls.
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">From Number (Twilio) *</label>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading your phone numbers...</div>
        ) : myNumbers.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-800">
              You don't have any phone numbers yet. <a href="/app/phone-marketplace" className="text-blue-600 hover:underline">Purchase a number</a> to get started.
            </div>
          </div>
        ) : (
          <select
            value={formData.twilioNumber || ''}
            onChange={(e) => {
              const selected = myNumbers.find(n => n.phoneNumber === e.target.value);
              setFormData({
                ...formData,
                twilioNumber: e.target.value,
                friendlyName: selected?.friendlyName || '',
                phoneNumberSid: selected?.sid || ''
              });
            }}
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="">Choose a phone number...</option>
            {myNumbers.map((number) => (
              <option key={number.sid} value={number.phoneNumber}>
                {number.phoneNumber} {number.friendlyName && `- ${number.friendlyName}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">To Number (Customer)</label>
        <input
          type="tel"
          value={formData.toNumber || ''}
          onChange={(e) => setFormData({ ...formData, toNumber: e.target.value })}
          placeholder="+1234567890"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <div className="text-xs text-muted-foreground mt-1">
          Use variables like {'{lead.phone}'} for dynamic numbers, or enter a specific number for testing.
        </div>
      </div>

      {formData.twilioNumber && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            ✅ Calls will be made from <strong>{formData.twilioNumber}</strong>
            {formData.toNumber && <> to <strong>{formData.toNumber}</strong></>}.
          </div>
        </div>
      )}
    </div>
  );
}

function TriggerConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Trigger Type *</label>
        <select
          value={formData.triggerType || ''}
          onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="">Select trigger type...</option>
          <option value="inbound-call">Inbound Call</option>
          <option value="outbound-call">Outbound Call</option>
          <option value="sms-received">SMS Received</option>
          <option value="email-received">Email Received</option>
          <option value="schedule">Scheduled</option>
          <option value="manual">Manual</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Trigger Conditions</label>
        <textarea
          value={formData.triggerConditions || ''}
          onChange={(e) => setFormData({ ...formData, triggerConditions: e.target.value })}
          rows={4}
          placeholder="e.g., When customer says 'hello'"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>
    </div>
  );
}

function WebhookConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Webhook URL *</label>
        <input
          type="url"
          value={formData.webhookUrl || ''}
          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
          placeholder="https://your-domain.com/webhook"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">HTTP Method</label>
        <select
          value={formData.webhookMethod || 'POST'}
          onChange={(e) => setFormData({ ...formData, webhookMethod: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Headers (JSON)</label>
        <textarea
          value={formData.webhookHeaders || ''}
          onChange={(e) => setFormData({ ...formData, webhookHeaders: e.target.value })}
          rows={4}
          placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
        />
      </div>
    </div>
  );
}

function KeywordTriggerConfig({ formData, setFormData }) {
  const [newKeyword, setNewKeyword] = useState('');
  const keywords = formData.keywords || [];

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
      setFormData({
        ...formData,
        keywords: [...keywords, newKeyword.trim().toLowerCase()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setFormData({
      ...formData,
      keywords: keywords.filter(k => k !== keyword)
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <p className="text-sm text-purple-900 dark:text-purple-100">
          🔑 Add keywords that will trigger this workflow path. Keywords are case-insensitive.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Add Keywords</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="e.g., pricing, demo, signup"
            className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          />
          <button
            onClick={addKeyword}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Add
          </button>
        </div>
      </div>

      {keywords.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Keywords ({keywords.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, idx) => (
              <div
                key={idx}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full flex items-center gap-2"
              >
                <span>{keyword}</span>
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="hover:text-purple-900 dark:hover:text-purple-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceCallConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-sm text-green-900 dark:text-green-100">
          📞 Configure AI voice call settings. The agent will use the prompt defined in the Prompt node.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">ElevenLabs Agent ID *</label>
        <input
          type="text"
          value={formData.agentId || ''}
          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
          placeholder="agent_..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">Get your Agent ID from ElevenLabs Conversational AI dashboard</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Agent Name (Optional)</label>
        <input
          type="text"
          value={formData.agentName || ''}
          onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
          placeholder="e.g., David, Sarah, etc."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">To Phone Number (Variable)</label>
        <input
          type="text"
          value={formData.toPhone || ''}
          onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
          placeholder="{{customer_phone}} or +1234567890"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Use variables like {{customer_phone}} or enter a static number</p>
      </div>
    </div>
  );
}

function SMSConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
        <p className="text-sm text-cyan-900 dark:text-cyan-100">
          💬 Configure SMS message. Use variables like {{customer_name}} for personalization.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">To Phone Number *</label>
        <input
          type="text"
          value={formData.toPhone || ''}
          onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
          placeholder="{{customer_phone}} or +1234567890"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Use variables or enter a static phone number</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Message *</label>
        <textarea
          value={formData.message || ''}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={5}
          placeholder="Hi {{customer_name}}! Thanks for reaching out..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.message?.length || 0} characters {formData.message?.length > 160 && '(Multiple SMS will be sent)'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">From Number (Optional)</label>
        <input
          type="text"
          value={formData.fromPhone || ''}
          onChange={(e) => setFormData({ ...formData, fromPhone: e.target.value })}
          placeholder="Leave empty to use default"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Leave empty to use configured Twilio number</p>
      </div>
    </div>
  );
}

function MMSConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
        <p className="text-sm text-sky-900 dark:text-sky-100">
          🖼️ Send MMS with media attachments (images, videos, PDFs, etc.)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">To Phone Number *</label>
        <input
          type="text"
          value={formData.toPhone || ''}
          onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
          placeholder="{{customer_phone}} or +1234567890"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Message</label>
        <textarea
          value={formData.message || ''}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
          placeholder="Optional message to accompany the media..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Media URL *</label>
        <input
          type="url"
          value={formData.mediaUrl || ''}
          onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Public URL to image, video, or PDF file</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">From Number (Optional)</label>
        <input
          type="text"
          value={formData.fromPhone || ''}
          onChange={(e) => setFormData({ ...formData, fromPhone: e.target.value })}
          placeholder="Leave empty to use default"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>
    </div>
  );
}

function EmailConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
        <p className="text-sm text-pink-900 dark:text-pink-100">
          ✉️ Send automated follow-up emails. Use variables for personalization.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">To Email Address *</label>
        <input
          type="text"
          value={formData.to || ''}
          onChange={(e) => setFormData({ ...formData, to: e.target.value })}
          placeholder="{{customer_email}} or email@example.com"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Use variables like {{customer_email}} or static email</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Subject *</label>
        <input
          type="text"
          value={formData.subject || ''}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Thanks for your call, {{customer_name}}!"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Email Body (HTML) *</label>
        <textarea
          value={formData.body || ''}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          rows={10}
          placeholder="<h1>Hi {{customer_name}}!</h1><p>Thanks for speaking with us...</p>"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">HTML supported. Use variables for personalization.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">CC (Optional)</label>
        <input
          type="text"
          value={formData.cc || ''}
          onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
          placeholder="cc@example.com"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">BCC (Optional)</label>
        <input
          type="text"
          value={formData.bcc || ''}
          onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
          placeholder="bcc@example.com"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>
    </div>
  );
}

function AIDecisionConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          🤖 AI-powered decision routing - like n8n's AI Chat Router! Route conversations based on AI analysis.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">AI Provider *</label>
        <select
          value={formData.provider || 'openai'}
          onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google AI (Gemini)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">API Key *</label>
        <input
          type="password"
          value={formData.apiKey || ''}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">Your API key is encrypted and stored securely</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Model</label>
        <input
          type="text"
          value={formData.model || ''}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          placeholder={
            formData.provider === 'openai' ? 'gpt-4o or gpt-3.5-turbo' :
            formData.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
            'gemini-pro'
          }
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Decision Question *</label>
        <textarea
          value={formData.question || ''}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          rows={3}
          placeholder="Is this customer inquiry urgent? Does the message express frustration or dissatisfaction?"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">AI will analyze the conversation and answer Yes/No</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Input Source</label>
        <input
          type="text"
          value={formData.inputVariable || '{{conversation_history}}'}
          onChange={(e) => setFormData({ ...formData, inputVariable: e.target.value })}
          placeholder="{{conversation_history}} or {{last_message}}"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Variable containing the text to analyze</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-green-600 dark:text-green-400">Yes Path Label</label>
          <input
            type="text"
            value={formData.yesLabel || 'Yes'}
            onChange={(e) => setFormData({ ...formData, yesLabel: e.target.value })}
            className="w-full px-4 py-3 border border-green-300 rounded-lg bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-red-600 dark:text-red-400">No Path Label</label>
          <input
            type="text"
            value={formData.noLabel || 'No'}
            onChange={(e) => setFormData({ ...formData, noLabel: e.target.value })}
            className="w-full px-4 py-3 border border-red-300 rounded-lg bg-background text-foreground"
          />
        </div>
      </div>
    </div>
  );
}

function AIGeneratorConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <p className="text-sm text-purple-900 dark:text-purple-100">
          ✨ Generate dynamic, personalized content using AI. Perfect for creating custom messages, emails, or responses.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">AI Provider *</label>
        <select
          value={formData.provider || 'openai'}
          onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google AI (Gemini)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">API Key *</label>
        <input
          type="password"
          value={formData.apiKey || ''}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Model</label>
        <input
          type="text"
          value={formData.model || ''}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          placeholder={
            formData.provider === 'openai' ? 'gpt-4o or gpt-4o-mini' :
            formData.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
            'gemini-pro'
          }
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Generation Instructions *</label>
        <textarea
          value={formData.instructions || ''}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          rows={6}
          placeholder="Write a friendly follow-up email thanking the customer for their call. Include their name and mention the main topic discussed. Keep it under 150 words and end with an invitation to reach out with any questions."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Describe what content you want the AI to generate</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Context / Input Variables</label>
        <textarea
          value={formData.context || ''}
          onChange={(e) => setFormData({ ...formData, context: e.target.value })}
          rows={4}
          placeholder="Customer Name: {{customer_name}}&#10;Topic Discussed: {{call_topic}}&#10;Sentiment: {{sentiment}}"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Provide context variables for personalization</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Save Output To Variable</label>
        <input
          type="text"
          value={formData.outputVariable || 'generated_message'}
          onChange={(e) => setFormData({ ...formData, outputVariable: e.target.value })}
          placeholder="generated_message"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">Variable name to store the generated content</p>
      </div>
    </div>
  );
}

function AIExtractorConfig({ formData, setFormData }) {
  const [newField, setNewField] = useState('');
  const fields = formData.fields || [];

  const addField = () => {
    if (newField.trim() && !fields.includes(newField.trim())) {
      setFormData({
        ...formData,
        fields: [...fields, newField.trim()]
      });
      setNewField('');
    }
  };

  const removeField = (field) => {
    setFormData({
      ...formData,
      fields: fields.filter(f => f !== field)
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <p className="text-sm text-teal-900 dark:text-teal-100">
          📊 Extract structured data from unstructured text using AI. Perfect for pulling names, emails, phone numbers, dates, etc.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">AI Provider *</label>
        <select
          value={formData.provider || 'openai'}
          onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google AI (Gemini)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">API Key *</label>
        <input
          type="password"
          value={formData.apiKey || ''}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Fields to Extract</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addField()}
            placeholder="e.g., customer_name, email, phone_number"
            className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          />
          <button
            onClick={addField}
            className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Add
          </button>
        </div>

        {fields.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className="px-3 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full flex items-center gap-2"
              >
                <span>{field}</span>
                <button
                  onClick={() => removeField(field)}
                  className="hover:text-teal-900 dark:hover:text-teal-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Input Source *</label>
        <input
          type="text"
          value={formData.inputVariable || '{{conversation_history}}'}
          onChange={(e) => setFormData({ ...formData, inputVariable: e.target.value })}
          placeholder="{{conversation_history}} or {{message_text}}"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Variable containing the text to extract from</p>
      </div>
    </div>
  );
}

function AIIntentConfig({ formData, setFormData }) {
  const [newIntent, setNewIntent] = useState('');
  const intents = formData.intents || [];

  const addIntent = () => {
    if (newIntent.trim() && !intents.includes(newIntent.trim())) {
      setFormData({
        ...formData,
        intents: [...intents, newIntent.trim()]
      });
      setNewIntent('');
    }
  };

  const removeIntent = (intent) => {
    setFormData({
      ...formData,
      intents: intents.filter(i => i !== intent)
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <p className="text-sm text-orange-900 dark:text-orange-100">
          🎯 Classify user intent using AI. Route to different paths based on what the user wants (support, sales, demo, etc.)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">AI Provider *</label>
        <select
          value={formData.provider || 'openai'}
          onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google AI (Gemini)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">API Key *</label>
        <input
          type="password"
          value={formData.apiKey || ''}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Define Intents</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newIntent}
            onChange={(e) => setNewIntent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addIntent()}
            placeholder="e.g., pricing, support, demo, complaint"
            className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          />
          <button
            onClick={addIntent}
            className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            Add
          </button>
        </div>

        {intents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {intents.map((intent, idx) => (
              <div
                key={idx}
                className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full flex items-center gap-2"
              >
                <span>{intent}</span>
                <button
                  onClick={() => removeIntent(intent)}
                  className="hover:text-orange-900 dark:hover:text-orange-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">Create an output path for each intent</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Input Source *</label>
        <input
          type="text"
          value={formData.inputVariable || '{{last_message}}'}
          onChange={(e) => setFormData({ ...formData, inputVariable: e.target.value })}
          placeholder="{{last_message}} or {{conversation_history}}"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">Variable containing the text to classify</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Save Classification To</label>
        <input
          type="text"
          value={formData.outputVariable || 'detected_intent'}
          onChange={(e) => setFormData({ ...formData, outputVariable: e.target.value })}
          placeholder="detected_intent"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
      </div>
    </div>
  );
}

function HumanHandoffConfig({ formData, setFormData }) {
  const [newContact, setNewContact] = useState({ name: '', phone: '', role: '' });
  const contacts = formData.contacts || [];

  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      alert('Please enter both name and phone number');
      return;
    }

    setFormData({
      ...formData,
      contacts: [...contacts, { ...newContact }]
    });
    setNewContact({ name: '', phone: '', role: '' });
  };

  const removeContact = (index) => {
    setFormData({
      ...formData,
      contacts: contacts.filter((_, idx) => idx !== index)
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
        <p className="text-sm text-violet-900 dark:text-violet-100">
          📞 Transfer calls to human agents. Configure contact list and transfer type.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Transfer Type *</label>
        <select
          value={formData.transferType || 'transfer'}
          onChange={(e) => setFormData({ ...formData, transferType: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="transfer">Direct Transfer (disconnect AI)</option>
          <option value="conference">Conference Call (3-way)</option>
          <option value="warm">Warm Transfer (introduce first)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {formData.transferType === 'transfer' && 'AI hangs up, customer connected to human'}
          {formData.transferType === 'conference' && 'AI, customer, and human all on the line'}
          {formData.transferType === 'warm' && 'AI introduces customer to human, then hangs up'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Add Contact</label>
        <div className="space-y-2 mb-3">
          <input
            type="text"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            placeholder="Contact Name (e.g., Sales Team)"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          />
          <input
            type="tel"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            placeholder="Phone Number (e.g., +1234567890)"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          />
          <input
            type="text"
            value={newContact.role}
            onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
            placeholder="Role/Department (optional)"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
          />
          <button
            onClick={addContact}
            className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
          >
            + Add Contact
          </button>
        </div>

        {contacts.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Contact List ({contacts.length})</label>
            {contacts.map((contact, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">{contact.phone}</div>
                  {contact.role && (
                    <div className="text-xs text-violet-600 dark:text-violet-400">{contact.role}</div>
                  )}
                </div>
                <button
                  onClick={() => removeContact(idx)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Transfer Message (optional)</label>
        <textarea
          value={formData.transferMessage || ''}
          onChange={(e) => setFormData({ ...formData, transferMessage: e.target.value })}
          placeholder="Let me connect you with our team..."
          rows={3}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          What the AI says before transferring (for warm transfers)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Fallback Action</label>
        <select
          value={formData.fallbackAction || 'voicemail'}
          onChange={(e) => setFormData({ ...formData, fallbackAction: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="voicemail">Take voicemail</option>
          <option value="callback">Schedule callback</option>
          <option value="continue">Continue with AI</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          What happens if no human answers
        </p>
      </div>
    </div>
  );
}

function CalendarConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          📅 Schedule appointments and manage bookings. Connect to Google Calendar, Calendly, or custom calendar.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Calendar Provider *</label>
        <select
          value={formData.calendarType || 'google'}
          onChange={(e) => setFormData({ ...formData, calendarType: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="google">Google Calendar</option>
          <option value="calendly">Calendly</option>
          <option value="microsoft">Microsoft Outlook</option>
          <option value="custom">Custom API</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Calendar Name/ID</label>
        <input
          type="text"
          value={formData.calendarName || ''}
          onChange={(e) => setFormData({ ...formData, calendarName: e.target.value })}
          placeholder="e.g., primary, team@company.com"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          For Google: "primary" or email. For Calendly: your username
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">API Key / Credentials</label>
        <input
          type="password"
          value={formData.calendarApiKey || ''}
          onChange={(e) => setFormData({ ...formData, calendarApiKey: e.target.value })}
          placeholder="Your calendar API key"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Default Duration (minutes)</label>
        <input
          type="number"
          value={formData.defaultDuration || 30}
          onChange={(e) => setFormData({ ...formData, defaultDuration: parseInt(e.target.value) })}
          min="15"
          step="15"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Business Hours</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Start Time</label>
            <input
              type="time"
              value={formData.startTime || '09:00'}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End Time</label>
            <input
              type="time"
              value={formData.endTime || '17:00'}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Timezone</label>
        <select
          value={formData.timezone || 'America/Phoenix'}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="America/Phoenix">Arizona (MST)</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/New_York">Eastern Time</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Confirmation Message</label>
        <textarea
          value={formData.confirmationMessage || ''}
          onChange={(e) => setFormData({ ...formData, confirmationMessage: e.target.value })}
          placeholder="Great! I've scheduled your appointment for {date} at {time}. You'll receive a confirmation email shortly."
          rows={3}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        />
      </div>
    </div>
  );
}

function CodeConfig({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-sm text-green-900 dark:text-green-100">
          💻 Execute custom code for advanced logic, data processing, API calls, and integrations.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Programming Language *</label>
        <select
          value={formData.language || 'javascript'}
          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="typescript">TypeScript</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Function Name</label>
        <input
          type="text"
          value={formData.functionName || ''}
          onChange={(e) => setFormData({ ...formData, functionName: e.target.value })}
          placeholder="e.g., processLead, calculatePrice"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Code *</label>
        <textarea
          value={formData.code || ''}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder={`// JavaScript example:\nfunction processLead(input) {\n  const { customerName, phone, email } = input;\n  \n  // Your custom logic here\n  const result = {\n    leadScore: calculateScore(input),\n    priority: determinePriority(input)\n  };\n  \n  return result;\n}`}
          rows={12}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Input Variables</label>
        <input
          type="text"
          value={formData.inputVars || ''}
          onChange={(e) => setFormData({ ...formData, inputVars: e.target.value })}
          placeholder="customerName, phone, email"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Comma-separated list of variables to pass to your function
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">Output Variable</label>
        <input
          type="text"
          value={formData.outputVar || 'result'}
          onChange={(e) => setFormData({ ...formData, outputVar: e.target.value })}
          placeholder="result"
          className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground font-mono"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Variable name to store the function output
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          ⚠️ Code runs in a sandboxed environment. Available libraries: lodash, moment, axios
        </p>
      </div>
    </div>
  );
}

function TestConfig({ formData, setFormData, addLog }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);

    addLog('info', `Starting ${formData.testType?.toUpperCase()} test...`, {
      type: formData.testType,
      data: formData.testData
    });

    try {
      // Validate required fields
      if (formData.testType === 'email' && !formData.testData?.email) {
        throw new Error('Email address is required');
      }
      if (['call', 'sms', 'mms'].includes(formData.testType) && !formData.testData?.phone) {
        throw new Error('Phone number is required');
      }

      addLog('info', 'Preparing test request...');

      // Make actual API call based on test type
      let response;
      const apiUrl = '/api/call-initiation/live-call';

      if (formData.testType === 'call') {
        addLog('info', 'Initiating ElevenLabs voice call test...', {
          endpoint: apiUrl,
          phone: formData.testData.phone,
          agentId: formData.testData?.elevenLabsAgentId || process.env.ELEVENLABS_DEMO_AGENT_ID
        });

        // Get the prompt and first message from the workflow
        const promptNode = nodes.find(n => n.type === 'prompt');
        const customPrompt = promptNode?.data?.prompt;
        const customFirstMessage = promptNode?.data?.firstMessage;

        response = await axios.post(apiUrl, {
          phoneNumber: formData.testData.phone,
          agentId: formData.testData?.elevenLabsAgentId || 'agent_9701k9xptd0kfr383djx5zk7300x',
          callType: 'outbound',
          customPrompt: customPrompt,
          customFirstMessage: customFirstMessage
        });

        addLog('success', 'ElevenLabs voice call initiated successfully!', {
          callId: response.data?.callId
        });
        setTestResult({
          success: true,
          message: `✅ Voice call initiated to ${formData.testData.phone}\nAgent: ${formData.testData?.elevenLabsAgentId || 'Default Demo Agent'}\n\nYou should receive a call from David (602-833-4780) shortly!`
        });
      }
      else if (formData.testType === 'sms') {
        addLog('info', 'Sending SMS test...', {
          endpoint: '/api/sms-to-call/send-sms-from-agent',
          phone: formData.testData.phone
        });

        // Use existing SMS endpoint
        response = await axios.post('/api/sms-to-call/send-sms-from-agent', {
          to: formData.testData.phone,
          message: formData.testData.message || '🤖 This is a test message from your AI agent! Text "call me" if you want to receive a voice call demo.',
          agentId: formData.agentId || 'test-agent'
        });

        addLog('success', 'SMS sent successfully!', {
          messageSid: response.data?.messageSid,
          status: response.data?.status,
          from: response.data?.from,
          to: response.data?.to
        });

        const details = [];
        if (response.data?.messageSid) details.push(`SID: ${response.data.messageSid}`);
        if (response.data?.status) details.push(`Status: ${response.data.status}`);
        if (response.data?.from) details.push(`From: ${response.data.from}`);
        if (response.data?.errorCode) details.push(`⚠️ Error Code: ${response.data.errorCode}`);
        if (response.data?.errorMessage) details.push(`⚠️ Error: ${response.data.errorMessage}`);

        setTestResult({
          success: true,
          message: `✅ SMS sent to ${formData.testData.phone}\n${details.join(' | ')}\n\nCheck your phone for the message!`
        });
      }
      else if (formData.testType === 'mms') {
        addLog('info', 'Sending MMS test...', {
          endpoint: '/api/sms-to-call/send-mms-from-agent',
          phone: formData.testData.phone
        });

        // Use existing MMS endpoint
        response = await axios.post('/api/sms-to-call/send-mms-from-agent', {
          to: formData.testData.phone,
          message: formData.testData.message || '📱 Check out this media from your AI agent!',
          mediaUrl: formData.testData.mediaUrl || 'https://demo.twilio.com/owl.png',
          agentId: formData.agentId || 'test-agent'
        });

        addLog('success', 'MMS sent successfully!', { messageSid: response.data?.messageSid });
        setTestResult({
          success: true,
          message: `✅ MMS sent to ${formData.testData.phone} with ${response.data?.mediaCount || 1} media attachment(s)!`
        });
      }
      else if (formData.testType === 'email') {
        addLog('info', 'Sending email test...', {
          endpoint: '/api/emails/send',
          email: formData.testData.email
        });

        response = await axios.post('/api/emails/send', {
          to: formData.testData.email,
          subject: formData.testData.subject || 'Test Email from AI Agent',
          body: formData.testData.message || 'This is a test email from your AI agent!',
          html: `<p>${formData.testData.message || 'This is a test email from your AI agent!'}</p>`
        });

        addLog('success', 'Email sent successfully!');
        setTestResult({
          success: true,
          message: `Email sent to ${formData.testData.email}. Check your inbox!`
        });
      }

      addLog('success', `Test completed! ${formData.testType} delivered.`, {
        response: response?.data
      });

    } catch (error) {
      console.error('Test error:', error);
      addLog('error', `Test failed: ${error.response?.data?.message || error.message}`, {
        error: error.toString(),
        details: error.response?.data
      });
      setTestResult({
        success: false,
        message: `Test failed: ${error.response?.data?.message || error.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Test Your Agent</p>
            <p className="text-blue-700 dark:text-blue-300">Choose a communication type below and enter your contact details. Click "Run Test" to receive a real test message from your agent.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Choose Test Type</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: 'call', icon: Phone, label: 'Voice Call', color: 'blue' },
            { type: 'sms', icon: MessageSquare, label: 'Text (SMS)', color: 'green' },
            { type: 'mms', icon: Upload, label: 'Media (MMS)', color: 'purple' },
            { type: 'email', icon: Mail, label: 'Email', color: 'orange' }
          ].map(({ type, icon: Icon, label, color }) => (
            <button
              key={type}
              onClick={() => setFormData({ ...formData, testType: type })}
              className={`p-4 border-2 rounded-lg transition-all ${
                formData.testType === type
                  ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950`
                  : 'border-border hover:border-gray-400'
              }`}
            >
              <Icon className={`h-6 w-6 mx-auto mb-2 text-${color}-600`} />
              <div className="text-sm font-medium">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {formData.testType === 'call' && (
        <div className="space-y-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium">Voice Call Test with ElevenLabs</h4>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Select ElevenLabs Agent</label>
            <select
              value={formData.testData?.elevenLabsAgentId || 'agent_9701k9xptd0kfr383djx5zk7300x'}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, elevenLabsAgentId: e.target.value } })}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            >
              <option value="agent_9701k9xptd0kfr383djx5zk7300x">Demo Agent (Default)</option>
              <option value="agent_8101ka4wyweke1s9np3je7npewrr">David - SMS Agent</option>
              <option value="agent_9301k802kktwfbhrbe9bam7f1spe">Granite Agent</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">🎙️ Choose which ElevenLabs voice agent will call you</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your Phone Number *</label>
            <input
              type="tel"
              value={formData.testData?.phone || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, phone: e.target.value } })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">📞 You'll receive a voice call from David at (602) 833-4780</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 The agent will use your custom prompt from the workflow if configured, otherwise it will use the agent's default prompt.
            </p>
          </div>
        </div>
      )}

      {formData.testType === 'sms' && (
        <div className="space-y-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <h4 className="font-medium">Text Message (SMS) Test</h4>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your Phone Number *</label>
            <input
              type="tel"
              value={formData.testData?.phone || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, phone: e.target.value } })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">💬 You'll receive a text message from your agent</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Custom Test Message (Optional)</label>
            <textarea
              value={formData.testData?.message || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, message: e.target.value } })}
              placeholder="Hello! This is a test message from my AI agent."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to use your agent's default message</p>
          </div>
        </div>
      )}

      {formData.testType === 'mms' && (
        <div className="space-y-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium">Media Message (MMS) Test</h4>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your Phone Number *</label>
            <input
              type="tel"
              value={formData.testData?.phone || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, phone: e.target.value } })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">📱 You'll receive a multimedia message with images/media</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Media URL (Optional)</label>
            <input
              type="url"
              value={formData.testData?.mediaUrl || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, mediaUrl: e.target.value } })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">Provide an image or video URL to include in the MMS</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message Text (Optional)</label>
            <textarea
              value={formData.testData?.message || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, message: e.target.value } })}
              placeholder="Check out this image!"
              rows={2}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
          </div>
        </div>
      )}

      {formData.testType === 'email' && (
        <div className="space-y-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-orange-600" />
            <h4 className="font-medium">Email Test</h4>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your Email Address *</label>
            <input
              type="email"
              value={formData.testData?.email || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, email: e.target.value } })}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">📧 You'll receive an email from your AI agent</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email Subject (Optional)</label>
            <input
              type="text"
              value={formData.testData?.subject || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, subject: e.target.value } })}
              placeholder="Test Email from AI Agent"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email Body (Optional)</label>
            <textarea
              value={formData.testData?.message || ''}
              onChange={(e) => setFormData({ ...formData, testData: { ...formData.testData, message: e.target.value } })}
              placeholder="Hello! This is a test email from my AI agent. Thank you for testing!"
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to use your agent's default email template</p>
          </div>
        </div>
      )}

      {formData.testType && (
        <div className="space-y-3">
          <button
            onClick={runTest}
            disabled={testing || (!formData.testData?.phone && !formData.testData?.email)}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg flex items-center justify-center gap-3 transition-all shadow-lg disabled:shadow-none font-medium text-lg"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Sending Test {formData.testType === 'call' ? 'Call' : formData.testType === 'sms' ? 'SMS' : formData.testType === 'mms' ? 'MMS' : 'Email'}...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Send Test {formData.testType === 'call' ? 'Call' : formData.testType === 'sms' ? 'SMS' : formData.testType === 'mms' ? 'MMS' : 'Email'}
              </>
            )}
          </button>
          {(!formData.testData?.phone && !formData.testData?.email) && (
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
              ⚠️ Please enter your contact information above
            </p>
          )}
        </div>
      )}

      {testResult && (
        <div className={`p-4 rounded-lg ${
          testResult.success
            ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
              {testResult.message}
            </span>
          </div>
        </div>
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
