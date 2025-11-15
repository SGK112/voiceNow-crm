import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Plus,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Maximize2,
  RefreshCw,
  ShoppingBag,
  Workflow as WorkflowIcon
} from 'lucide-react';
import api from '../services/api';

export default function WorkflowsNew() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showN8n, setShowN8n] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    executions: 0,
    successRate: 0
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/workflows');
      const workflowData = response.data || [];
      setWorkflows(workflowData);

      // Calculate stats
      const active = workflowData.filter(w => w.enabled).length;
      const totalExecutions = workflowData.reduce((sum, w) => sum + (w.executionCount || 0), 0);
      const totalSuccess = workflowData.reduce((sum, w) => sum + (w.successCount || 0), 0);
      const successRate = totalExecutions > 0 ? ((totalSuccess / totalExecutions) * 100).toFixed(1) : 0;

      setStats({
        total: workflowData.length,
        active,
        executions: totalExecutions,
        successRate
      });
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId, currentState) => {
    try {
      const endpoint = currentState ? `/workflows/${workflowId}/deactivate` : `/workflows/${workflowId}/activate`;
      await api.post(endpoint);
      fetchWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
      alert('Failed to update workflow status');
    }
  };

  const deleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await api.delete(`/workflows/${workflowId}`);
      fetchWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert('Failed to delete workflow');
    }
  };

  const openN8nEditor = (workflow = null) => {
    setSelectedWorkflow(workflow);
    setShowN8n(true);
  };

  const getN8nUrl = () => {
    const baseUrl = import.meta.env.VITE_N8N_URL || 'http://5.183.8.119:5678';

    if (selectedWorkflow?.n8nWorkflowId) {
      return `${baseUrl}/workflow/${selectedWorkflow.n8nWorkflowId}`;
    }

    return baseUrl;
  };

  const getTypeIcon = (type) => {
    const icons = {
      save_lead: '📝',
      send_sms: '💬',
      send_email: '📧',
      slack_notification: '💬',
      book_appointment: '📅',
      custom: '⚡'
    };
    return icons[type] || '🔄';
  };

  const getTypeName = (type) => {
    const names = {
      save_lead: 'Save Lead',
      send_sms: 'Send SMS',
      send_email: 'Send Email',
      slack_notification: 'Slack Notification',
      book_appointment: 'Book Appointment',
      custom: 'Custom Workflow'
    };
    return names[type] || type;
  };

  if (showN8n) {
    const n8nUrl = getN8nUrl();

    return (
      <div className="h-screen flex flex-col">
        {/* n8n Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowN8n(false)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
            >
              ← Back to Workflows
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden md:block"></div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedWorkflow ? `Editing: ${selectedWorkflow.name}` : 'n8n Workflow Editor'}
            </h2>
          </div>

          <button
            onClick={() => window.open(n8nUrl, '_blank')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
        </div>

        {/* n8n iframe with fallback */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mb-4">
                <ExternalLink className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Open n8n in a New Window
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Due to security restrictions (X-Frame-Options), n8n cannot be embedded directly in the app.
                Click the button below to open the workflow editor in a new tab.
              </p>

              <button
                onClick={() => window.open(n8nUrl, '_blank', 'width=1400,height=900')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                Open n8n Workflow Editor
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <strong>n8n URL:</strong>
                </p>
                <code className="text-xs bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 inline-block">
                  {n8nUrl}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <WorkflowIcon className="w-8 h-8 text-blue-600" />
              Workflows
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automate your business processes with powerful workflows
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/marketplace')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Marketplace
            </button>
            <button
              onClick={() => openN8nEditor()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Workflows</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <WorkflowIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Executions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.executions}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.successRate}%</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <WorkflowIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No workflows yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 px-4">
            Create your first workflow or browse the marketplace
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap px-4">
            <button
              onClick={() => openN8nEditor()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </button>
            <button
              onClick={() => navigate('/app/marketplace')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Marketplace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {workflows.map(workflow => (
            <div
              key={workflow._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getTypeIcon(workflow.type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">
                        {workflow.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{getTypeName(workflow.type)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleWorkflow(workflow._id, workflow.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      workflow.enabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        workflow.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                {workflow.description && (
                  <p className="text-gray-600 text-sm mb-4">{workflow.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Executions</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">
                      {workflow.executionCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Success</p>
                    <p className="text-lg font-semibold text-green-600">
                      {workflow.successCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Failed</p>
                    <p className="text-lg font-semibold text-red-600">
                      {workflow.failureCount || 0}
                    </p>
                  </div>
                </div>

                {/* Last Executed */}
                {workflow.lastExecutedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <Clock className="w-4 h-4" />
                    Last executed: {new Date(workflow.lastExecutedAt).toLocaleString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openN8nEditor(workflow)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Edit
                  </button>

                  {workflow.n8nWorkflowId && (
                    <button
                      onClick={() => window.open(`http://5.183.8.119:5678/workflow/${workflow.n8nWorkflowId}`, '_blank')}
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Open in n8n"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteWorkflow(workflow._id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete workflow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-6 py-3 border-t ${
                workflow.enabled
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={workflow.enabled ? 'text-green-700' : 'text-gray-600 dark:text-gray-400'}>
                    {workflow.enabled ? '● Active' : '○ Inactive'}
                  </span>
                  {workflow.marketplaceId && (
                    <span className="text-purple-600 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      From Marketplace
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-6 md:mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Powered by n8n
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Create powerful automation workflows with 500+ integrations. Connect your tools, automate tasks, and build custom workflows without code.
            </p>
            <button
              onClick={() => openN8nEditor()}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Open Workflow Editor →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
