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
  createSubscription: (planName) => api.post('/subscription/create', { planName }),
  cancelSubscription: () => api.post('/subscription/cancel'),
  updateSubscription: (planName) => api.patch('/subscription/update', { planName }),
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

export default api;
