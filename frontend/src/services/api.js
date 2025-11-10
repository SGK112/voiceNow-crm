import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (credential) => api.post('/auth/google', { credential }),
  getMe: () => api.get('/auth/me'),
};

export const subscriptionApi = {
  getPlans: () => api.get('/subscription/plans'),
  createSubscription: (data) => api.post('/subscription/create', data),
  cancelSubscription: () => api.post('/subscription/cancel'),
  updateSubscription: (data) => api.patch('/subscription/update', data),
  getInvoices: () => api.get('/subscription/invoices'),
};

export const dashboardApi = {
  getMetrics: () => api.get('/dashboard/metrics'),
  getCallsToday: () => api.get('/dashboard/calls-today'),
  getLeadsThisMonth: () => api.get('/dashboard/leads-this-month'),
};

export const agentApi = {
  getAgents: () => api.get('/agents'),
  getAgentById: (id) => api.get(`/agents/${id}`),
  createAgent: (data) => api.post('/agents/create', data),
  updateAgent: (id, data) => api.patch(`/agents/${id}`, data),
  deleteAgent: (id) => api.delete(`/agents/${id}`),
  getAgentCalls: (id) => api.get(`/agents/${id}/calls`),
  getAgentPerformance: (id) => api.get(`/agents/${id}/performance`),
};

export const callApi = {
  getCalls: (params) => api.get('/calls', { params }),
  getCallById: (id) => api.get(`/calls/${id}`),
  initiateCall: (data) => api.post('/calls/initiate', data),
  deleteCall: (id) => api.delete(`/calls/${id}`),
};

export const leadApi = {
  getLeads: (params) => api.get('/leads', { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.patch(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  exportLeads: () => api.get('/leads/export', { responseType: 'blob' }),
};

export const workflowApi = {
  getWorkflows: () => api.get('/workflows'),
  getWorkflowById: (id) => api.get(`/workflows/${id}`),
  createWorkflow: (data) => api.post('/workflows', data),
  updateWorkflow: (id, data) => api.patch(`/workflows/${id}`, data),
  activateWorkflow: (id) => api.post(`/workflows/${id}/activate`),
  deactivateWorkflow: (id) => api.post(`/workflows/${id}/deactivate`),
  deleteWorkflow: (id) => api.delete(`/workflows/${id}`),
  getTemplates: () => api.get('/workflows/templates'),
};

export const dealApi = {
  getDeals: (params) => api.get('/deals', { params }),
  getDealById: (id) => api.get(`/deals/${id}`),
  createDeal: (data) => api.post('/deals', data),
  updateDeal: (id, data) => api.patch(`/deals/${id}`, data),
  deleteDeal: (id) => api.delete(`/deals/${id}`),
  getPipelineSummary: () => api.get('/deals/pipeline/summary'),
  moveStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }),
};

export const taskApi = {
  getTasks: (params) => api.get('/tasks', { params }),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get('/tasks/stats'),
};

export const noteApi = {
  getNotes: (params) => api.get('/notes', { params }),
  getNoteById: (id) => api.get(`/notes/${id}`),
  createNote: (data) => api.post('/notes', data),
  updateNote: (id, data) => api.patch(`/notes/${id}`, data),
  deleteNote: (id) => api.delete(`/notes/${id}`),
  togglePin: (id) => api.patch(`/notes/${id}/pin`),
};

export const emailApi = {
  getEmails: (params) => api.get('/emails', { params }),
  getEmailById: (id) => api.get(`/emails/${id}`),
  sendEmail: (data) => api.post('/emails/send', data),
  getStats: () => api.get('/emails/stats'),
};

export const settingsApi = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.patch('/settings', data),
  getApiKeys: () => api.get('/settings/api-keys'),
  updateApiKeys: (data) => api.patch('/settings/api-keys', data),
  addPhoneNumber: (data) => api.post('/settings/phone-numbers', data),
  removePhoneNumber: (id) => api.delete(`/settings/phone-numbers/${id}`),
  addTeamMember: (data) => api.post('/settings/team-members', data),
  removeTeamMember: (id) => api.delete(`/settings/team-members/${id}`),
};

export const userApiKeyApi = {
  getUserApiKeys: () => api.get('/api-keys'),
  createUserApiKey: (data) => api.post('/api-keys', data),
  updateUserApiKey: (keyId, data) => api.put(`/api-keys/${keyId}`, data),
  deleteUserApiKey: (keyId) => api.delete(`/api-keys/${keyId}`),
};

export const usageApi = {
  getCurrentUsage: () => api.get('/usage/current'),
  getUsageHistory: (params) => api.get('/usage/history', { params }),
  getUsageByMonth: (month) => api.get(`/usage/${month}`),
};

export const billingApi = {
  getCurrentUsage: () => api.get('/billing/usage/current'),
  getUsageHistory: (params) => api.get('/billing/usage/history', { params }),
  getPlanDetails: () => api.get('/billing/plan'),
  getUpcomingInvoice: () => api.get('/billing/invoice/upcoming'),
  getInvoiceHistory: () => api.get('/billing/invoice/history'),
};

export const aiAgentApi = {
  getAIAgents: () => api.get('/ai-agents'),
  getAIAgentById: (id) => api.get(`/ai-agents/${id}`),
  createAIAgent: (data) => api.post('/ai-agents/create', data),
  updateAIAgent: (id, data) => api.patch(`/ai-agents/${id}`, data),
  deleteAIAgent: (id) => api.delete(`/ai-agents/${id}`),
  chatWithAgent: (id, messages) => api.post(`/ai-agents/${id}/chat`, { messages }),
  deployAIAgent: (id) => api.post(`/ai-agents/${id}/deploy`),
  pauseAIAgent: (id) => api.post(`/ai-agents/${id}/pause`),
  testAIAgent: (id, testMessage) => api.post(`/ai-agents/${id}/test`, { testMessage }),
  getAvailableModels: () => api.get('/ai-agents/helpers/models'),
  getAIAgentTemplates: () => api.get('/ai-agents/helpers/templates'),
};

export default api;
