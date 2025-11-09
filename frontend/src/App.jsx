import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Calls from './pages/Calls';
import Leads from './pages/Leads';
import Workflows from './pages/Workflows';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Campaigns from './pages/Campaigns';
import CampaignNew from './pages/CampaignNew';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';

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

function App() {
  return (
    <Routes>
      {/* Root path is handled by backend serving static HTML from public/index.html */}
      {/* React router should not handle / - only /login, /signup, /app/* */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />

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
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/new" element={<CampaignNew />} />
        <Route path="calls" element={<Calls />} />
        <Route path="leads" element={<Leads />} />
        <Route path="deals" element={<Deals />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Redirect old paths to new /app paths */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}

export default App;
