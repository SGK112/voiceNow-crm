import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import AIAgents from './pages/AIAgents';
import Calls from './pages/Calls';
import Leads from './pages/Leads';
import Workflows from './pages/Workflows';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Campaigns from './pages/Campaigns';
import CampaignNew from './pages/CampaignNew';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Integrations from './pages/Integrations';
import Calendar from './pages/Calendar';
import Invoices from './pages/Invoices';
import Usage from './pages/Usage';
import Projects from './pages/Projects';
import ProjectNew from './pages/ProjectNew';
import Home from './pages/Home';
import GoogleCallback from './pages/GoogleCallback';
import IntegrationCallback from './pages/IntegrationCallback';

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
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="ai-agents" element={<AIAgents />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/new" element={<CampaignNew />} />
        <Route path="calls" element={<Calls />} />
        <Route path="leads" element={<Leads />} />
        <Route path="deals" element={<Deals />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="billing" element={<Billing />} />
        <Route path="usage" element={<Usage />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<ProjectNew />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Redirect old paths to new /app paths */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/agents/:id" element={<AgentRedirect />} />
      <Route path="/ai-agents" element={<Navigate to="/app/ai-agents" replace />} />
      <Route path="/calls" element={<Navigate to="/app/calls" replace />} />
      <Route path="/leads" element={<Navigate to="/app/leads" replace />} />
      <Route path="/campaigns" element={<Navigate to="/app/campaigns" replace />} />
      <Route path="/deals" element={<Navigate to="/app/deals" replace />} />
      <Route path="/tasks" element={<Navigate to="/app/tasks" replace />} />
      <Route path="/workflows" element={<Navigate to="/app/workflows" replace />} />
      <Route path="/billing" element={<Navigate to="/app/billing" replace />} />
      <Route path="/usage" element={<Navigate to="/app/usage" replace />} />
      <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
      <Route path="/integrations" element={<Navigate to="/app/integrations" replace />} />
      <Route path="/calendar" element={<Navigate to="/app/calendar" replace />} />
      <Route path="/invoices" element={<Navigate to="/app/invoices" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
    </Routes>
  );
}

export default App;
