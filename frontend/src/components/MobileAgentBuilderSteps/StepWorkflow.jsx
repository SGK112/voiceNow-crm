import React, { useState, useEffect } from 'react';
import { Check, Zap, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import axios from 'axios';

const StepWorkflow = ({ agentData, updateAgentData, nextStep, prevStep }) => {
  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(agentData.workflowId || null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
  }, []);

  const loadWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkflows(response.data);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/workflows/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const createWorkflowFromTemplate = async (templateKey) => {
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const template = templates[templateKey];

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/workflows`,
        {
          name: template.name,
          description: template.description,
          type: templateKey,
          template: templateKey
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Reload workflows
      await loadWorkflows();

      // Select the newly created workflow
      setSelectedWorkflow(response.data.workflow._id);
      setShowTemplates(false);

    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Failed to create workflow. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (workflowId) => {
    setSelectedWorkflow(workflowId);
    const workflow = workflows.find(w => w._id === workflowId);
    if (workflow) {
      updateAgentData({
        workflowId: workflow._id,
        webhookUrl: `${import.meta.env.VITE_N8N_WEBHOOK_URL}/${workflow.n8nWorkflowId}`
      });
    }
  };

  const handleContinue = () => {
    if (selectedWorkflow) {
      nextStep();
    }
  };

  const handleSkip = () => {
    updateAgentData({ workflowId: null, webhookUrl: null });
    nextStep();
  };

  const getWorkflowIcon = (type) => {
    const icons = {
      lead_generation: '🎯',
      appointment_booking: '📅',
      customer_support: '💬',
      sales_pipeline: '💰',
      follow_up: '📞'
    };
    return icons[type] || '⚡';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Connect Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Automate what happens after calls with pre-built workflows
        </p>
      </div>

      {/* Existing Workflows */}
      {workflows.length > 0 && !showTemplates && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Your Workflows</h3>
            <button
              onClick={() => setShowTemplates(true)}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>

          {workflows.map((workflow) => (
            <Card
              key={workflow._id}
              onClick={() => handleSelect(workflow._id)}
              className={`cursor-pointer transition-all ${
                selectedWorkflow === workflow._id
                  ? 'border-primary border-2 bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{getWorkflowIcon(workflow.type)}</span>
                      <h4 className="font-semibold text-foreground text-sm truncate">
                        {workflow.name}
                      </h4>
                      {workflow.enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    {workflow.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                  </div>

                  {selectedWorkflow === workflow._id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Workflow Templates */}
      {(showTemplates || workflows.length === 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Workflow Templates</h3>
            {workflows.length > 0 && (
              <button
                onClick={() => setShowTemplates(false)}
                className="text-sm text-muted-foreground"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3">
            {Object.entries(templates).map(([key, template]) => (
              <Card
                key={key}
                onClick={() => setSelectedTemplate(key)}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === key
                    ? 'border-primary border-2 bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{template.icon || getWorkflowIcon(template.category)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm mb-1">
                        {template.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags && template.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedTemplate === key && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        createWorkflowFromTemplate(key);
                      }}
                      disabled={creating}
                      className="mt-3 w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Create & Connect
                        </>
                      )}
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      {selectedWorkflow && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Workflow Connected
                </h4>
                <p className="text-xs text-blue-700">
                  Your agent will automatically trigger this workflow after each call to process leads, send notifications, and more.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex gap-3">
          <button
            onClick={prevStep}
            className="flex-1 py-3 px-4 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors"
          >
            Back
          </button>

          {selectedWorkflow ? (
            <button
              onClick={handleContinue}
              className="flex-1 py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="flex-1 py-3 px-4 rounded-lg border border-border text-muted-foreground font-medium hover:bg-accent transition-colors"
            >
              Skip for Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepWorkflow;
