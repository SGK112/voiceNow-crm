import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Play, Pause, Settings, TrendingUp, Phone, DollarSign, Clock, Loader2 } from 'lucide-react';
import agentLibraryApi from '../services/agentLibraryApi';

const MyAgents = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await agentLibraryApi.getMyAgents();
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAgent = async (agentId, e) => {
    e.stopPropagation();
    try {
      await agentLibraryApi.pauseAgent(agentId);
      fetchAgents();
    } catch (error) {
      console.error('Error pausing agent:', error);
    }
  };

  const handleResumeAgent = async (agentId, e) => {
    e.stopPropagation();
    try {
      await agentLibraryApi.resumeAgent(agentId);
      fetchAgents();
    } catch (error) {
      console.error('Error resuming agent:', error);
    }
  };

  const handleAgentClick = (agentId) => {
    navigate(`/app/my-agents/${agentId}`);
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = !searchQuery ||
      (agent.customName || agent.template?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalCalls = agents.reduce((sum, a) => sum + (a.stats?.totalCalls || 0), 0);
  const totalBilling = agents.reduce((sum, a) => {
    // Simple calculation - could call calculateCurrentCost for each
    return sum + (a.billing?.basePrice || 0);
  }, 0);

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-secondary text-gray-700',
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      archived: 'bg-red-100 text-red-700'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Agents</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your AI agent team</p>
            </div>
            <button
              onClick={() => navigate('/app/agent-library')}
              className="w-full sm:w-auto flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Add New Agent
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Settings className="w-6 sm:w-8 h-6 sm:h-8 opacity-80" />
                <span className="text-xl sm:text-2xl font-bold">{totalAgents}</span>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm">Total Agents</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Play className="w-6 sm:w-8 h-6 sm:h-8 opacity-80" />
                <span className="text-xl sm:text-2xl font-bold">{activeAgents}</span>
              </div>
              <p className="text-green-100 text-xs sm:text-sm">Active Agents</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Phone className="w-6 sm:w-8 h-6 sm:h-8 opacity-80" />
                <span className="text-xl sm:text-2xl font-bold">{totalCalls}</span>
              </div>
              <p className="text-purple-100 text-xs sm:text-sm">Total Calls</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 sm:w-8 h-6 sm:h-8 opacity-80" />
                <span className="text-xl sm:text-2xl font-bold">${totalBilling}</span>
              </div>
              <p className="text-orange-100 text-xs sm:text-sm">Monthly Base</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 sm:w-5 h-4 sm:h-5" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-border bg-secondary text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-border bg-secondary text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Agents List */}
        {filteredAgents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Settings className="w-16 h-16 text-gray-700 dark:text-gray-100 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {agents.length === 0 ? 'No agents yet' : 'No agents found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {agents.length === 0
                ? 'Get started by adding your first AI agent from the library'
                : 'Try adjusting your search or filters'}
            </p>
            {agents.length === 0 && (
              <button
                onClick={() => navigate('/app/agent-library')}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Browse Agent Library
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAgents.map(agent => (
              <div
                key={agent._id}
                onClick={() => handleAgentClick(agent._id)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${agent.template?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}>
                      {agent.template?.icon || '🤖'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                        {agent.customName || agent.template?.name || 'Unnamed Agent'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 capitalize">
                        {agent.template?.category || 'Agent'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 pt-3 sm:pt-4 border-t border-gray-200">
                  <div>
                    <div className="flex items-center text-gray-600 text-xs mb-1">
                      <Phone className="w-3 h-3 mr-1" />
                      Calls
                    </div>
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      {agent.stats?.totalCalls || 0}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center text-gray-600 text-xs mb-1">
                      <Clock className="w-3 h-3 mr-1" />
                      Minutes
                    </div>
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      {Math.round(agent.stats?.totalMinutes || 0)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center text-gray-600 text-xs mb-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Leads
                    </div>
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      {agent.stats?.leadsGenerated || 0}
                    </p>
                  </div>
                </div>

                {/* Billing */}
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Period</span>
                    <span className="text-lg font-semibold text-foreground">
                      ${agent.billing?.basePrice || 0}
                      <span className="text-sm text-gray-600 font-normal">/mo</span>
                    </span>
                  </div>
                  {agent.billing?.currentPeriodCalls > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      {agent.billing.currentPeriodCalls} calls this period
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {agent.status === 'active' ? (
                    <button
                      onClick={(e) => handlePauseAgent(agent._id, e)}
                      className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <Pause className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2" />
                      Pause
                    </button>
                  ) : agent.status === 'paused' ? (
                    <button
                      onClick={(e) => handleResumeAgent(agent._id, e)}
                      className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <Play className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/my-agents/${agent._id}`);
                      }}
                      className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <Settings className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 sm:mr-2" />
                      Configure
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/my-agents/${agent._id}`);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center px-3 sm:px-4 py-2 border border-border bg-secondary text-foreground text-gray-700 rounded-lg hover:bg-secondary/50 hover:bg-secondary/80 transition-colors text-xs sm:text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>

                {/* Last Activity */}
                {agent.stats?.lastCallAt && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                    Last call: {new Date(agent.stats.lastCallAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAgents;
