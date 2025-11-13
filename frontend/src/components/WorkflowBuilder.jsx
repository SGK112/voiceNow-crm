import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DynamicVariablePicker, extractVariables, VariableBadge } from './DynamicVariablePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Zap,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Webhook,
  Database,
  GitBranch,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  FileText,
  Send
} from 'lucide-react';

// Workflow trigger types
const TRIGGER_TYPES = {
  call_completed: {
    name: 'Call Completed',
    icon: Phone,
    description: 'When a voice agent call finishes',
    color: 'bg-blue-500',
  },
  lead_created: {
    name: 'Lead Created',
    icon: Users,
    description: 'When a new lead is added',
    color: 'bg-green-500',
  },
  lead_qualified: {
    name: 'Lead Qualified',
    icon: CheckCircle,
    description: 'When a lead is marked as qualified',
    color: 'bg-purple-500',
  },
  appointment_booked: {
    name: 'Appointment Booked',
    icon: Calendar,
    description: 'When appointment is scheduled',
    color: 'bg-orange-500',
  },
  deal_won: {
    name: 'Deal Won',
    icon: DollarSign,
    description: 'When a deal is closed/won',
    color: 'bg-yellow-500',
  },
  deal_lost: {
    name: 'Deal Lost',
    icon: FileText,
    description: 'When a deal is lost',
    color: 'bg-red-500',
  },
  schedule: {
    name: 'Schedule',
    icon: Clock,
    description: 'Run on a schedule (daily, weekly)',
    color: 'bg-indigo-500',
  },
  manual: {
    name: 'Manual Trigger',
    icon: Zap,
    description: 'Triggered manually',
    color: 'bg-gray-500',
  },
};

// Workflow action types
const ACTION_TYPES = {
  send_sms: {
    name: 'Send SMS',
    icon: MessageSquare,
    description: 'Send text message',
    color: 'bg-blue-500',
    fields: [
      { name: 'to', label: 'To Phone Number', type: 'text', placeholder: '{{lead_phone}}' },
      { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Hi {{lead_name}}, thanks for your interest!' },
    ],
  },
  send_email: {
    name: 'Send Email',
    icon: Mail,
    description: 'Send email message',
    color: 'bg-red-500',
    fields: [
      { name: 'to', label: 'To Email', type: 'text', placeholder: '{{lead_email}}' },
      { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Follow up from {{company_name}}' },
      { name: 'body', label: 'Body', type: 'textarea', placeholder: 'Hi {{lead_name}},...' },
    ],
  },
  create_lead: {
    name: 'Create Lead',
    icon: Users,
    description: 'Create a new lead',
    color: 'bg-green-500',
    fields: [
      { name: 'name', label: 'Name', type: 'text', placeholder: '{{lead_name}}' },
      { name: 'email', label: 'Email', type: 'text', placeholder: '{{lead_email}}' },
      { name: 'phone', label: 'Phone', type: 'text', placeholder: '{{lead_phone}}' },
      { name: 'source', label: 'Source', type: 'text', placeholder: 'workflow' },
    ],
  },
  update_lead: {
    name: 'Update Lead',
    icon: Database,
    description: 'Update lead information',
    color: 'bg-purple-500',
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
      { name: 'qualified', label: 'Mark as Qualified', type: 'checkbox' },
    ],
  },
  create_task: {
    name: 'Create Task',
    icon: CheckCircle,
    description: 'Create a follow-up task',
    color: 'bg-yellow-500',
    fields: [
      { name: 'title', label: 'Task Title', type: 'text', placeholder: 'Follow up with {{lead_name}}' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Contact regarding {{project_type}}' },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
    ],
  },
  schedule_call: {
    name: 'Schedule Call',
    icon: Phone,
    description: 'Schedule a voice agent call',
    color: 'bg-indigo-500',
    fields: [
      { name: 'agentId', label: 'Voice Agent', type: 'select', options: [] }, // Populated dynamically
      { name: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '{{lead_phone}}' },
      { name: 'scheduledTime', label: 'Schedule For', type: 'datetime-local' },
    ],
  },
  webhook: {
    name: 'Webhook',
    icon: Webhook,
    description: 'Call external API',
    color: 'bg-orange-500',
    fields: [
      { name: 'url', label: 'Webhook URL', type: 'text', placeholder: 'https://api.example.com/webhook' },
      { name: 'method', label: 'Method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
      { name: 'body', label: 'Request Body (JSON)', type: 'textarea', placeholder: '{"lead": "{{lead_name}}"}' },
    ],
  },
  slack_notification: {
    name: 'Slack Notification',
    icon: Send,
    description: 'Send Slack message',
    color: 'bg-pink-500',
    fields: [
      { name: 'channel', label: 'Channel', type: 'text', placeholder: '#sales' },
      { name: 'message', label: 'Message', type: 'textarea', placeholder: 'New lead: {{lead_name}} - {{lead_email}}' },
    ],
  },
  delay: {
    name: 'Delay',
    icon: Clock,
    description: 'Wait before next action',
    color: 'bg-gray-500',
    fields: [
      { name: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '60' },
    ],
  },
  condition: {
    name: 'Condition',
    icon: GitBranch,
    description: 'Branch based on conditions',
    color: 'bg-teal-500',
    fields: [
      { name: 'field', label: 'Field to Check', type: 'text', placeholder: 'qualified' },
      { name: 'operator', label: 'Operator', type: 'select', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'] },
      { name: 'value', label: 'Value', type: 'text', placeholder: 'true' },
    ],
  },
};

export function WorkflowBuilder({ workflow, onSave }) {
  const [name, setName] = useState(workflow?.name || 'New Workflow');
  const [description, setDescription] = useState(workflow?.description || '');
  const [trigger, setTrigger] = useState(workflow?.trigger || 'call_completed');
  const [actions, setActions] = useState(workflow?.actions || []);
  const [showActionPicker, setShowActionPicker] = useState(false);

  const addAction = (actionType) => {
    const newAction = {
      id: Date.now().toString(),
      type: actionType,
      config: {},
    };
    setActions([...actions, newAction]);
    setShowActionPicker(false);
  };

  const updateAction = (actionId, config) => {
    setActions(actions.map(action =>
      action.id === actionId ? { ...action, config } : action
    ));
  };

  const deleteAction = (actionId) => {
    setActions(actions.filter(action => action.id !== actionId));
  };

  const moveAction = (actionId, direction) => {
    const index = actions.findIndex(a => a.id === actionId);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < actions.length - 1)
    ) {
      const newActions = [...actions];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      setActions(newActions);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      description,
      trigger,
      actions,
    });
  };

  const TriggerIcon = TRIGGER_TYPES[trigger]?.icon || Zap;

  return (
    <div className="space-y-6">
      {/* Workflow Info */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Details</CardTitle>
          <CardDescription>Configure your workflow name and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Workflow Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Follow up qualified leads"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Trigger
          </CardTitle>
          <CardDescription>When should this workflow run?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_TYPES).map(([key, triggerType]) => {
                const Icon = triggerType.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{triggerType.name}</div>
                        <div className="text-xs text-muted-foreground">{triggerType.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Visual trigger card */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${TRIGGER_TYPES[trigger]?.color} text-white`}>
                <TriggerIcon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">{TRIGGER_TYPES[trigger]?.name}</h4>
                <p className="text-sm text-muted-foreground">{TRIGGER_TYPES[trigger]?.description}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actions</CardTitle>
              <CardDescription>What should happen when triggered?</CardDescription>
            </div>
            <Button onClick={() => setShowActionPicker(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No actions yet</p>
              <Button onClick={() => setShowActionPicker(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Action
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {actions.map((action, index) => {
                const actionType = ACTION_TYPES[action.type];
                const Icon = actionType?.icon || Zap;
                return (
                  <div key={action.id} className="relative">
                    {/* Connecting line */}
                    {index > 0 && (
                      <div className="absolute left-6 -top-4 w-0.5 h-4 bg-border" />
                    )}

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${actionType?.color} text-white`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{actionType?.name}</h4>
                              <p className="text-sm text-muted-foreground">{actionType?.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveAction(action.id, 'up')}
                              disabled={index === 0}
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveAction(action.id, 'down')}
                              disabled={index === actions.length - 1}
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAction(action.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {actionType?.fields.map((field) => (
                          <ActionField
                            key={field.name}
                            field={field}
                            value={action.config[field.name]}
                            onChange={(value) =>
                              updateAction(action.id, { ...action.config, [field.name]: value })
                            }
                          />
                        ))}

                        {/* Show used variables */}
                        {Object.values(action.config).some(v => v && typeof v === 'string' && v.includes('{{')) && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-2">Variables used:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.values(action.config)
                                .filter(v => v && typeof v === 'string')
                                .flatMap(v => extractVariables(v))
                                .filter((v, i, arr) => arr.indexOf(v) === i)
                                .map((variable) => (
                                  <VariableBadge key={variable} variable={`{{${variable}}}`} />
                                ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Picker Modal */}
      {showActionPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowActionPicker(false)}>
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Add Action</CardTitle>
              <CardDescription>Choose what to do when the workflow triggers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(ACTION_TYPES).map(([key, actionType]) => {
                  const Icon = actionType.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => addAction(key)}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <div className={`p-2 rounded-lg ${actionType.color} text-white flex-shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold">{actionType.name}</h4>
                        <p className="text-sm text-muted-foreground">{actionType.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Workflow
        </Button>
      </div>
    </div>
  );
}

function ActionField({ field, value, onChange }) {
  const handleInsertVariable = (variable) => {
    const currentValue = value || '';
    onChange(currentValue + variable);
  };

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{field.label}</Label>
          <DynamicVariablePicker onSelect={handleInsertVariable} buttonVariant="ghost" />
        </div>
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
        <Label>{field.label}</Label>
      </div>
    );
  }

  // Default: text input
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{field.label}</Label>
        <DynamicVariablePicker onSelect={handleInsertVariable} buttonVariant="ghost" />
      </div>
      <Input
        type={field.type || 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    </div>
  );
}
