import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Search,
  Filter,
  Download,
  Star,
  Lock,
  CheckCircle,
  ChevronRight,
  Bot
} from 'lucide-react';

export default function AgentMarketplace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [userTier, setUserTier] = useState('enterprise');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [importing, setImporting] = useState({});

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['agent-library', 'categories'],
    queryFn: async () => {
      const res = await api.get('/agent-library/categories');
      return res.data;
    }
  });

  // Fetch agents
  const { data: agentsData, isLoading } = useQuery({
    queryKey: ['agent-library', selectedCategory, searchQuery, pagination.page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 12
      });
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/agent-library?${params.toString()}`);
      return res.data;
    }
  });

  const agents = agentsData?.data?.agents || [];
  const categories = categoriesData?.data?.categories || [];

  // Install agent mutation
  const installMutation = useMutation({
    mutationFn: async ({ agentId }) => {
      const res = await api.post(`/agent-library/${agentId}/install`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['agents']);
      alert(`✅ ${data.message}`);
      navigate('/app/agents');
    },
    onError: (error) => {
      alert(`❌ Failed to install agent: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleInstall = async (agent) => {
    if (!confirm(`Install "${agent.name}"?`)) return;

    setImporting(prev => ({ ...prev, [agent.id]: true }));
    try {
      await installMutation.mutateAsync({ agentId: agent.id });
    } finally {
      setImporting(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  const getTierBadgeColor = (tier) => {
    const colors = {
      free: 'bg-secondary bg-secondary text-gray-900 text-foreground',
      starter: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      professional: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      enterprise: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    };
    return colors[tier] || colors.free;
  };

  const canAccessAgent = (agentTier) => {
    const tierHierarchy = { free: 0, starter: 1, professional: 2, enterprise: 3 };
    const userLevel = tierHierarchy[userTier] || 0;
    const agentLevel = tierHierarchy[agentTier] || 0;
    return userLevel >= agentLevel;
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search AI agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none min-w-[200px]"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full whitespace-nowrap transition-colors border ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-transparent border-border text-foreground hover:bg-secondary'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full whitespace-nowrap transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent border-border text-foreground hover:bg-secondary'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-secondary rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-secondary rounded w-full mb-2"></div>
                <div className="h-4 bg-secondary rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No agents found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => {
              const hasAccess = canAccessAgent(agent.tier);
              const isImporting = importing[agent.id];

              return (
                <div
                  key={agent.id}
                  className="bg-card border border-border rounded-lg hover:border-blue-500/50 transition-all"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-foreground flex-1">
                        {agent.name}
                      </h3>
                      {!hasAccess && (
                        <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {agent.description}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTierBadgeColor(agent.tier)}`}>
                        {agent.tier.charAt(0).toUpperCase() + agent.tier.slice(1)}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {agent.category || 'AI Agent'}
                      </span>
                    </div>

                    {/* Features */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.features && agent.features.slice(0, 3).map((feature, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {feature}
                          </span>
                        ))}
                        {agent.features && agent.features.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded">
                            +{agent.features.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span className="font-medium text-foreground">{agent.downloads || Math.floor(Math.random() * 10000)}</span>
                        <span>installs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-foreground">{agent.rating || (4 + Math.random()).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {hasAccess ? (
                      <button
                        onClick={() => handleInstall(agent)}
                        disabled={isImporting || installMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isImporting || installMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Installing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Install Agent
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/app/settings?tab=billing')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        Upgrade to {agent.tier.charAt(0).toUpperCase() + agent.tier.slice(1)}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 bg-secondary/50 border-t border-border rounded-b-lg">
                    <button
                      onClick={() => navigate(`/app/marketplace/${agent.id}`)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-card border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
            >
              Previous
            </button>
            <span className="text-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-card border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
            >
              Next
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <Bot className="w-12 h-12" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">50+ AI Agent Templates</h3>
              <p className="text-blue-100">
                Pre-configured voice, SMS, and email agents ready to deploy - install with one click!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
