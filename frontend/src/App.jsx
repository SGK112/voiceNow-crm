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
import AgentDetailResponsive from './pages/AgentDetailResponsive';
import AgentTester from './pages/AgentTester';
import VoiceFlowBuilder from './components/VoiceFlowBuilder';
import VoiceFlowBuilderResponsive from './components/VoiceFlowBuilderResponsive';
import Conversations from './pages/Conversations';
import CRM from './pages/CRM';
import LeadDetail from './pages/LeadDetail';
import Marketplace from './pages/Marketplace';
import AgentMarketplace from './pages/AgentMarketplace';
import UnifiedMarketplace from './pages/UnifiedMarketplace';
import AIBuilder from './pages/AIBuilder';
import Leads from './pages/Leads';
import Business from './pages/Business';
import Messages from './pages/Messages';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import PhoneNumbers from './pages/PhoneNumbers';
import Home from './pages/Home';
import GoogleCallback from './pages/GoogleCallback';
import IntegrationCallback from './pages/IntegrationCallback';
import AgentLibrary from './pages/AgentLibrary';
import AgentSetup from './pages/AgentSetup';
import WorkflowMarketplace from './pages/WorkflowMarketplace';
import CustomizableDashboard from './pages/CustomizableDashboard';
import CRMWorkflowBuilder from './pages/CRMWorkflowBuilder';
import CRMWorkflowBuilderHybrid from './pages/CRMWorkflowBuilderHybrid';
import CRMWorkflowStudio from './pages/CRMWorkflowStudio';
import CollaborativeAgentBuilder from './components/CollaborativeAgentBuilder';
import AgentDashboardResponsive from './components/AgentDashboardResponsive';
import AgentsListSimple from './pages/AgentsListSimple';
import PremiumAgentRequest from './components/PremiumAgentRequest';
import AIConversationalAgentBuilder from './components/AIConversationalAgentBuilder';
import PhoneNumberMarketplace from './pages/PhoneNumberMarketplace';
import VoiceLibraryBrowser from './components/VoiceLibraryBrowser';
import MyVoices from './pages/MyVoices';
import CreateAgent from './pages/CreateAgent';
import CreditsDashboard from './pages/CreditsDashboard';
import Credits from './pages/Credits';
import Checkout from './pages/Checkout';
import MultimodalAgentDemo from './pages/MultimodalAgentDemo';
import Onboarding from './pages/Onboarding';
import RemodelStudio from './components/RemodelStudio';
import Contacts from './pages/Contacts';

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
      <Route path="/checkout" element={<Checkout />} />
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
        {/* Redirect root /app to Dashboard */}
        <Route index element={<Navigate to="/app/dashboard" replace />} />

        {/* Onboarding flow for new users */}
        <Route path="onboarding" element={<Onboarding />} />

        {/* Dashboard as main landing page */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/custom" element={<CustomizableDashboard />} />

        {/* Legacy CRM-style agent management (available for power users) */}
        <Route path="agent-library-crm" element={<AgentsUnified />} />
        <Route path="agent-library/setup/:templateId" element={<AgentSetup />} />

        {/* Core 5 Sections - Voice Workflow CRM */}
        <Route path="agents" element={<AgentsListSimple />} />
        <Route path="agents/create" element={<CreateAgent />} />
        <Route path="agents/:id" element={<AgentDetailResponsive />} />
        <Route path="agents/:id/test" element={<AgentTester />} />
        <Route path="agents/:id/edit" element={<CollaborativeAgentBuilder />} />
        <Route path="agent-builder" element={<CollaborativeAgentBuilder />} />
        <Route path="ai-agent-builder" element={<AIConversationalAgentBuilder />} />
        <Route path="premium-agent-request" element={<PremiumAgentRequest />} />
        <Route path="voice-library" element={<VoiceLibraryBrowser />} />
        <Route path="my-voices" element={<MyVoices />} />
        {/* UNIFIED VoiceFlow Builder - consolidates agent studio and workflow builder */}
        <Route path="voiceflow-builder" element={<VoiceFlowBuilderResponsive />} />
        <Route path="voiceflow-builder/:id" element={<VoiceFlowBuilderResponsive />} />

        {/* Redirects from old separate builders to unified VoiceFlow Builder */}
        <Route path="agent-studio" element={<Navigate to="/app/voiceflow-builder" replace />} />
        <Route path="agent-studio/*" element={<Navigate to="/app/voiceflow-builder" replace />} />
        <Route path="workflows" element={<Navigate to="/app/voiceflow-builder" replace />} />
        <Route path="workflows/:id" element={<Navigate to="/app/voiceflow-builder" replace />} />

        <Route path="credits" element={<Credits />} />
        <Route path="credits-dashboard" element={<CreditsDashboard />} />
        <Route path="multimodal-agent" element={<MultimodalAgentDemo />} />
        <Route path="studio" element={<RemodelStudio />} />
        <Route path="crm" element={<CRM />} />
        <Route path="crm/leads/:id" element={<LeadDetail />} />
        <Route path="crm/workflows" element={<CRMWorkflowStudio />} />
        <Route path="crm/workflows/basic" element={<CRMWorkflowBuilder />} />
        <Route path="marketplace" element={<UnifiedMarketplace />} />
        <Route path="marketplace-agents-old" element={<AgentMarketplace />} />
        <Route path="marketplace-old" element={<Marketplace />} />
        <Route path="ai-builder" element={<AIBuilder />} />
        <Route path="settings" element={<Settings />} />

        {/* Contacts - synced from mobile app */}
        <Route path="contacts" element={<Contacts />} />

        {/* Legacy Pages (kept for backwards compatibility) */}
        <Route path="leads" element={<Leads />} />
        <Route path="deals" element={<Deals />} />
        <Route path="business" element={<Business />} />
        <Route path="messages" element={<Messages />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="phone-numbers" element={<PhoneNumbers />} />
        <Route path="phone-marketplace" element={<PhoneNumberMarketplace />} />

        {/* Legacy redirects - redirect old pages to new consolidated pages */}
        <Route path="agent-library" element={<Navigate to="/app/agents" replace />} />
        <Route path="my-agents" element={<Navigate to="/app/agents" replace />} />
        <Route path="ai-agents" element={<Navigate to="/app/agents" replace />} />
        <Route path="calls" element={<Navigate to="/app/agents" replace />} />
        <Route path="billing" element={<Navigate to="/app/settings" replace />} />
        <Route path="usage" element={<Navigate to="/app/settings" replace />} />
        <Route path="projects" element={<Navigate to="/app/crm" replace />} />
        <Route path="invoices" element={<Navigate to="/app/crm" replace />} />
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
