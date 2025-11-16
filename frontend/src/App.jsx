import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import AgentsUnified from './pages/AgentsUnified';
import AgentDetail from './pages/AgentDetail';
import VoiceFlowBuilder from './components/VoiceFlowBuilder';
import Conversations from './pages/Conversations';
import Leads from './pages/Leads';
import Business from './pages/Business';
import Messages from './pages/Messages';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Campaigns from './pages/Campaigns';
import WorkflowStudio from './components/WorkflowStudio';
import Settings from './pages/Settings';
import PhoneNumbers from './pages/PhoneNumbers';
import Home from './pages/Home';
import GoogleCallback from './pages/GoogleCallback';
import IntegrationCallback from './pages/IntegrationCallback';
import AgentLibrary from './pages/AgentLibrary';
import AgentSetup from './pages/AgentSetup';
import WorkflowMarketplace from './pages/WorkflowMarketplace';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function AgentRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/agents/${id}`} replace />;
}

function App() {
  return (
    <Routes>
      {/* Marketing homepage */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/auth/integration/callback" element={<IntegrationCallback />} />

      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* VoiceFlow Builder - Build, Test, Deploy AI Voice Agents */}
        <Route path="agents" element={<VoiceFlowBuilder />} />
        <Route path="agents/:id" element={<AgentDetail />} />

        {/* Legacy CRM-style agent management (available at /app/agent-library for power users) */}
        <Route path="agent-library-crm" element={<AgentsUnified />} />
        <Route path="agent-library/setup/:templateId" element={<AgentSetup />} />

        {/* Main Pages */}
        <Route path="leads" element={<Leads />} />
        <Route path="business" element={<Business />} />
        <Route path="messages" element={<Messages />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="workflows" element={<WorkflowStudio />} />
        <Route path="workflows/:id" element={<WorkflowStudio />} />
        <Route path="marketplace" element={<WorkflowMarketplace />} />
        <Route path="phone-numbers" element={<PhoneNumbers />} />
        <Route path="settings" element={<Settings />} />

        {/* Legacy redirects - redirect old pages to new unified pages */}
        <Route path="agent-library" element={<Navigate to="/app/agents" replace />} />
        <Route path="my-agents" element={<Navigate to="/app/agents" replace />} />
        <Route path="ai-agents" element={<Navigate to="/app/agents" replace />} />
        <Route path="calls" element={<Navigate to="/app/conversations" replace />} />
        <Route path="billing" element={<Navigate to="/app/settings" replace />} />
        <Route path="usage" element={<Navigate to="/app/settings" replace />} />
        <Route path="projects" element={<Navigate to="/app/business" replace />} />
        <Route path="invoices" element={<Navigate to="/app/business" replace />} />
        <Route path="deals" element={<Navigate to="/app/business" replace />} />
        <Route path="workflow-builder" element={<Navigate to="/app/workflows" replace />} />
        <Route path="workflow-builder/:id" element={<Navigate to="/app/workflows/:id" replace />} />
      </Route>

      {/* Redirect old paths to new /app paths */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/agents/:id" element={<AgentRedirect />} />
      <Route path="/ai-agents" element={<Navigate to="/app/ai-agents" replace />} />
      <Route path="/calls" element={<Navigate to="/app/calls" replace />} />
      <Route path="/leads" element={<Navigate to="/app/leads" replace />} />
      <Route path="/campaigns" element={<Navigate to="/app/campaigns" replace />} />
      <Route path="/deals" element={<Navigate to="/app/business" replace />} />
      <Route path="/tasks" element={<Navigate to="/app/tasks" replace />} />
      <Route path="/workflows" element={<Navigate to="/app/workflows" replace />} />
      <Route path="/billing" element={<Navigate to="/app/billing" replace />} />
      <Route path="/usage" element={<Navigate to="/app/usage" replace />} />
      <Route path="/projects" element={<Navigate to="/app/business" replace />} />
      <Route path="/integrations" element={<Navigate to="/app/integrations" replace />} />
      <Route path="/calendar" element={<Navigate to="/app/calendar" replace />} />
      <Route path="/invoices" element={<Navigate to="/app/business" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
    </Routes>
  );
}

export default App;
