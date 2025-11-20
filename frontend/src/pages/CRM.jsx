import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealApi, leadApi } from '@/services/api';
import api from '../services/api';
import {
  Users,
  Plus,
  Bot,
  Phone,
  Mail,
  DollarSign,
  User,
  Search,
  LayoutGrid,
  LayoutList,
  Trash2,
  TrendingUp,
  Zap,
  ChevronRight,
  Building2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import LeadImporter from '@/components/LeadImporter';

const LEAD_STAGES = [
  { id: 'new', name: 'New', color: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' },
  { id: 'contacted', name: 'Contacted', color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700' },
  { id: 'qualified', name: 'Qualified', color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700' },
  { id: 'proposal', name: 'Proposal', color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700' },
  { id: 'won', name: 'Won', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700' },
  { id: 'lost', name: 'Lost', color: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700' }
];

const DEAL_STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export default function CRM() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' or 'deals'
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
    stage: 'new',
    source: ''
  });
  const [newDeal, setNewDeal] = useState({
    title: '',
    contact: 'none',
    value: 0,
    stage: 'lead',
    expectedCloseDate: '',
    priority: 'medium'
  });

  const queryClient = useQueryClient();

  // Leads data
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data?.leads || res.data || [];
    },
  });

  // Deals data
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const res = await dealApi.getDeals();
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    },
  });

  // Agents data
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get('/agents');
      return res.data || [];
    },
  });

  // Deal pipeline summary
  const { data: dealSummary } = useQuery({
    queryKey: ['deals', 'summary'],
    queryFn: async () => {
      const res = await dealApi.getPipelineSummary();
      return res.data;
    },
  });

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: (data) => api.post('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setShowAddLeadModal(false);
      setNewLead({ name: '', email: '', phone: '', company: '', value: '', stage: 'new', source: '' });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: (data) => dealApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      setShowAddDealModal(false);
      setNewDeal({ title: '', contact: 'none', value: 0, stage: 'lead', expectedCloseDate: '', priority: 'medium' });
    },
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/leads/${id}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });

  const updateDealStageMutation = useMutation({
    mutationFn: ({ id, stage }) => dealApi.moveStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });

  const assignAgentMutation = useMutation({
    mutationFn: ({ leadId, agentId }) => api.patch(`/leads/${leadId}`, {
      assignedAgent: agentId,
      aiAssigned: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setShowAssignAgentModal(false);
      setSelectedLead(null);
    },
  });

  // Handlers - Memoized to prevent re-creation on every render
  const handleAddLead = useCallback((e) => {
    e.preventDefault();
    createLeadMutation.mutate(newLead);
  }, [createLeadMutation, newLead]);

  const handleAddDeal = useCallback((e) => {
    e.preventDefault();
    const dealData = {
      ...newDeal,
      contact: newDeal.contact === 'none' ? undefined : newDeal.contact,
    };
    createDealMutation.mutate(dealData);
  }, [createDealMutation, newDeal]);

  const handleAssignAgent = useCallback((agentId) => {
    assignAgentMutation.mutate({ leadId: selectedLead._id, agentId });
  }, [assignAgentMutation, selectedLead]);

  const handleDeleteLead = useCallback((leadId) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(leadId);
    }
  }, [deleteLeadMutation]);

  // Filtering - Memoized for performance
  const filteredLeads = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return leads;

    return leads.filter(lead =>
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query) ||
      lead.company?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  const filteredDeals = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return deals;

    return deals.filter(deal =>
      deal.title?.toLowerCase().includes(query) ||
      deal.contact?.name?.toLowerCase().includes(query) ||
      deal.contact?.email?.toLowerCase().includes(query)
    );
  }, [deals, searchQuery]);

  // Memoized stage filtering functions
  const getLeadsByStage = useCallback((stageId) => {
    return filteredLeads.filter(lead => (lead.stage || 'new') === stageId);
  }, [filteredLeads]);

  const getDealsByStage = useCallback((stageValue) => {
    return filteredDeals.filter(deal => (deal.stage || 'lead') === stageValue);
  }, [filteredDeals]);

  // Stats - Memoized to avoid recalculation on every render
  const leadStats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.stage === 'new').length,
    inProgress: leads.filter(l => ['contacted', 'qualified', 'proposal'].includes(l.stage)).length,
    won: leads.filter(l => l.stage === 'won').length,
    aiAssigned: leads.filter(l => l.aiAssigned || l.assignedAgent).length,
    totalValue: leads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0)
  }), [leads]);

  const dealStats = useMemo(() => ({
    total: deals.length,
    totalValue: dealSummary?.overall?.totalValue || 0,
    weightedValue: dealSummary?.overall?.weightedValue || 0,
    wonValue: dealSummary?.stages?.won?.totalValue || 0,
    wonCount: dealSummary?.stages?.won?.count || 0
  }), [deals, dealSummary]);

  const isLoading = leadsLoading || dealsLoading;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - WorkflowStudio style */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            CRM
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Leads & Deals Management
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'leads'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            Leads ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'deals'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            Deals ({deals.length})
          </button>
        </div>

        {/* Stats Summary */}
        <div className="p-4 space-y-3 border-b border-border">
          {activeTab === 'leads' ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New</span>
                <Badge variant="secondary">{leadStats.new}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">In Progress</span>
                <Badge variant="secondary">{leadStats.inProgress}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Won</span>
                <Badge className="bg-green-600">{leadStats.won}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI Assigned</span>
                <Badge className="bg-purple-600">{leadStats.aiAssigned}</Badge>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">Total Value</div>
                <div className="text-lg font-bold">${leadStats.totalValue.toLocaleString()}</div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Deals</span>
                <Badge variant="secondary">{dealStats.total}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Won This Month</span>
                <Badge className="bg-green-600">{dealStats.wonCount}</Badge>
              </div>
              <div className="pt-2 border-t border-border space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Pipeline Value</div>
                  <div className="text-lg font-bold">{formatCurrency(dealStats.totalValue)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Won Value</div>
                  <div className="text-sm font-semibold text-green-600">{formatCurrency(dealStats.wonValue)}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          <Button
            onClick={() => activeTab === 'leads' ? setShowAddLeadModal(true) : setShowAddDealModal(true)}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'leads' ? 'Lead' : 'Deal'}
          </Button>
          {activeTab === 'leads' && (
            <>
              <LeadImporter
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['leads'] });
                  queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
                }}
              />
              <Button
                onClick={() => navigate('/app/crm/workflows')}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Workflow Builder
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                  viewMode === 'pipeline'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                  viewMode === 'table'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading {activeTab}...</p>
              </div>
            </div>
          ) : activeTab === 'leads' ? (
            viewMode === 'pipeline' ? (
              // Leads Pipeline View
              <div className="flex gap-4 overflow-x-auto pb-4">
                {LEAD_STAGES.map(stage => {
                  const stageLeads = getLeadsByStage(stage.id);
                  return (
                    <div key={stage.id} className="flex-shrink-0 w-80">
                      <div className={`rounded-t-lg border-2 ${stage.color} p-3 mb-3`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{stage.name}</h3>
                          <Badge variant="secondary">{stageLeads.length}</Badge>
                        </div>
                      </div>
                      <div className="space-y-3 min-h-[500px]">
                        {stageLeads.map(lead => (
                          <Card
                            key={lead._id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/app/crm/leads/${lead._id}`)}
                          >
                            <CardContent className="p-4">
                              {(lead.aiAssigned || lead.assignedAgent) && (
                                <Badge className="mb-2 bg-green-600">
                                  <Bot className="w-3 h-3 mr-1" />
                                  AI Assigned
                                </Badge>
                              )}
                              <h4 className="font-semibold mb-2">{lead.name}</h4>
                              <div className="space-y-1 text-sm text-muted-foreground mb-3">
                                {lead.company && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    {lead.company}
                                  </div>
                                )}
                                {lead.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {lead.email}
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {lead.phone}
                                  </div>
                                )}
                                {lead.value && (
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    ${parseFloat(lead.value).toLocaleString()}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLead(lead);
                                    setShowAssignAgentModal(true);
                                  }}
                                >
                                  <Bot className="w-3 h-3 mr-1" />
                                  {lead.aiAssigned ? 'Change' : 'Assign AI'}
                                </Button>
                                <div onClick={(e) => e.stopPropagation()} className="flex-1">
                                  <Select
                                    value={lead.stage || 'new'}
                                    onValueChange={(value) => updateLeadStageMutation.mutate({ id: lead._id, stage: value })}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {LEAD_STAGES.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLead(lead._id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {stageLeads.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No leads in this stage
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Leads Table View
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Company</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">AI Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredLeads.map(lead => (
                          <tr key={lead._id} className="hover:bg-muted/50">
                            <td className="px-6 py-4 text-sm font-medium">{lead.name}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              <div>{lead.email}</div>
                              <div>{lead.phone}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{lead.company || '-'}</td>
                            <td className="px-6 py-4 text-sm font-semibold">
                              {lead.value ? `$${parseFloat(lead.value).toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <Badge variant="secondary">
                                {LEAD_STAGES.find(s => s.id === lead.stage)?.name || 'New'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {lead.aiAssigned || lead.assignedAgent ? (
                                <Badge className="bg-green-600">
                                  <Bot className="w-3 h-3 mr-1" />
                                  AI Assigned
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Manual</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setShowAssignAgentModal(true);
                                  }}
                                >
                                  <Bot className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteLead(lead._id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredLeads.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        No leads found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            viewMode === 'pipeline' ? (
              // Deals Pipeline View
              <div className="flex gap-4 overflow-x-auto pb-4">
                {DEAL_STAGES.map(stage => {
                  const stageDeals = getDealsByStage(stage.value);
                  return (
                    <div key={stage.value} className="flex-shrink-0 w-80">
                      <div className={`rounded-t-lg border-2 border-${stage.color} p-3 mb-3 bg-${stage.color}/10`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{stage.label}</h3>
                          <Badge variant="secondary">{stageDeals.length}</Badge>
                        </div>
                      </div>
                      <div className="space-y-3 min-h-[500px]">
                        {stageDeals.map(deal => (
                          <Card key={deal._id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-2">{deal.title}</h4>
                              <div className="space-y-1 text-sm text-muted-foreground mb-3">
                                {deal.contact && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {deal.contact.name}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  {formatCurrency(deal.value)}
                                </div>
                                {deal.expectedCloseDate && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {formatDateTime(deal.expectedCloseDate).split(',')[0]}
                                  </div>
                                )}
                                <Badge className={`${deal.priority === 'urgent' ? 'bg-red-600' : deal.priority === 'high' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                                  {deal.priority}
                                </Badge>
                              </div>
                              <div className="pt-3 border-t">
                                <Select
                                  value={deal.stage}
                                  onValueChange={(value) => updateDealStageMutation.mutate({ id: deal._id, stage: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DEAL_STAGES.map(s => (
                                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {stageDeals.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No deals in this stage
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Deals Table View
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Expected Close</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredDeals.map(deal => (
                          <tr key={deal._id} className="hover:bg-muted/50">
                            <td className="px-6 py-4 text-sm font-medium">{deal.title}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{deal.contact?.name || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(deal.value)}</td>
                            <td className="px-6 py-4 text-sm">
                              <Badge className={DEAL_STAGES.find(s => s.value === deal.stage)?.color}>
                                {DEAL_STAGES.find(s => s.value === deal.stage)?.label}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <Badge variant="secondary">{deal.priority}</Badge>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {deal.expectedCloseDate ? formatDateTime(deal.expectedCloseDate).split(',')[0] : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <Select
                                value={deal.stage}
                                onValueChange={(value) => updateDealStageMutation.mutate({ id: deal._id, stage: value })}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DEAL_STAGES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredDeals.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        No deals found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Create a new lead in your pipeline</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="value">Deal Value ($)</Label>
              <Input
                id="value"
                type="number"
                value={newLead.value}
                onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                placeholder="e.g., Website, Referral"
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddLeadModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createLeadMutation.isPending}>
                {createLeadMutation.isPending ? 'Creating...' : 'Add Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Deal Modal */}
      <Dialog open={showAddDealModal} onOpenChange={setShowAddDealModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>Add a new opportunity to your pipeline</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDeal} className="space-y-4">
            <div>
              <Label htmlFor="deal-title">Deal Title *</Label>
              <Input
                id="deal-title"
                required
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="deal-contact">Contact</Label>
              <Select
                value={newDeal.contact}
                onValueChange={(value) => setNewDeal({ ...newDeal, contact: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead._id} value={lead._id}>
                      {lead.name} ({lead.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deal-value">Deal Value ($) *</Label>
              <Input
                id="deal-value"
                type="number"
                required
                value={newDeal.value}
                onChange={(e) => setNewDeal({ ...newDeal, value: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="deal-stage">Stage</Label>
              <Select
                value={newDeal.stage}
                onValueChange={(value) => setNewDeal({ ...newDeal, stage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deal-priority">Priority</Label>
              <Select
                value={newDeal.priority}
                onValueChange={(value) => setNewDeal({ ...newDeal, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deal-close-date">Expected Close Date</Label>
              <Input
                id="deal-close-date"
                type="date"
                value={newDeal.expectedCloseDate}
                onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddDealModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createDealMutation.isPending}>
                {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Agent Modal */}
      <Dialog open={showAssignAgentModal} onOpenChange={setShowAssignAgentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign AI Agent to {selectedLead?.name}</DialogTitle>
            <DialogDescription>
              Select an AI agent to handle this lead. The agent will take over communications automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {agents.filter(a => a.enabled).map(agent => (
              <button
                key={agent._id}
                onClick={() => handleAssignAgent(agent._id)}
                className="w-full flex items-center gap-3 p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.description || 'Voice agent'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
            {agents.filter(a => a.enabled).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active agents available. Deploy an agent first.
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowAssignAgentModal(false);
              setSelectedLead(null);
            }}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
