import { useState, useEffect } from 'react';
import { Plus, Search, Building2, DollarSign, TrendingUp, CheckCircle, FileText, AlertCircle, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import { dealApi, leadApi } from '@/services/api';
import { invoiceApi } from '@/services/invoiceApi';

// Unified stages that combine Deals → Projects → Invoices workflow
const BUSINESS_STAGES = [
  { id: 'lead', name: 'New Lead', color: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600', icon: Users },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700', icon: TrendingUp },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700', icon: FileText },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700', icon: DollarSign },
  { id: 'won', name: 'Won/Project', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700', icon: CheckCircle },
  { id: 'in_progress', name: 'In Progress', color: 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700', icon: Building2 },
  { id: 'completed', name: 'Completed', color: 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700', icon: CheckCircle },
  { id: 'invoiced', name: 'Invoiced', color: 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700', icon: FileText },
  { id: 'paid', name: 'Paid', color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700', icon: CheckCircle },
  { id: 'lost', name: 'Lost', color: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700', icon: AlertCircle },
];

export default function Business() {
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    totalValue: 0,
    byStage: {}
  });

  const [formData, setFormData] = useState({
    title: '',
    contact: '',
    contactName: '',
    value: 0,
    stage: 'lead',
    description: '',
    projectType: '',
    priority: 'medium',
    expectedCloseDate: '',
    startDate: '',
    estimatedEndDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch deals, projects, and invoices in parallel
      const [dealsRes, projectsRes, invoicesRes, leadsRes] = await Promise.allSettled([
        dealApi.getDeals().catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
        invoiceApi.getInvoices({}).catch(() => ({ data: { invoices: [] } })),
        leadApi.getLeads().catch(() => ({ data: [] }))
      ]);

      // Extract leads
      const leadsData = leadsRes.status === 'fulfilled'
        ? (Array.isArray(leadsRes.value?.data) ? leadsRes.value.data : [])
        : [];
      setLeads(leadsData);

      // Transform deals
      const deals = dealsRes.status === 'fulfilled'
        ? (Array.isArray(dealsRes.value?.data) ? dealsRes.value.data : [])
        : [];
      const transformedDeals = deals.map(deal => ({
        _id: deal._id,
        title: deal.title,
        type: 'deal',
        stage: deal.stage || 'lead',
        value: deal.value || 0,
        contact: deal.contact,
        contactName: deal.contact?.name || '',
        priority: deal.priority || 'medium',
        expectedCloseDate: deal.expectedCloseDate,
        description: deal.description || '',
        createdAt: deal.createdAt
      }));

      // Transform projects
      const projects = projectsRes.status === 'fulfilled'
        ? (Array.isArray(projectsRes.value?.data) ? projectsRes.value.data : [])
        : [];
      const transformedProjects = projects.map(project => ({
        _id: project._id,
        title: project.name,
        type: 'project',
        stage: project.status === 'pending' ? 'won'
             : project.status === 'in_progress' ? 'in_progress'
             : project.status === 'completed' ? 'completed'
             : project.status === 'cancelled' ? 'lost'
             : 'won',
        value: project.estimate?.total || 0,
        contact: project.leadId,
        contactName: project.leadId?.name || '',
        projectType: project.projectType || '',
        startDate: project.startDate,
        estimatedEndDate: project.estimatedEndDate,
        description: project.description || '',
        teamMembers: project.teamMembers || [],
        milestones: project.milestones || [],
        createdAt: project.createdAt
      }));

      // Transform invoices
      const invoices = invoicesRes.status === 'fulfilled'
        ? (invoicesRes.value?.data?.invoices || [])
        : [];
      const transformedInvoices = invoices.map(invoice => ({
        _id: invoice._id,
        title: invoice.invoiceNumber || 'Invoice',
        type: 'invoice',
        stage: invoice.status === 'paid' ? 'paid'
             : invoice.status === 'sent' || invoice.status === 'viewed' ? 'invoiced'
             : invoice.status === 'cancelled' ? 'lost'
             : 'invoiced',
        value: invoice.total || 0,
        contact: null,
        contactName: invoice.client?.name || '',
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        invoiceStatus: invoice.status,
        description: `Invoice for ${invoice.client?.company || invoice.client?.name || 'client'}`,
        createdAt: invoice.createdAt
      }));

      // Combine all items
      const allItems = [...transformedDeals, ...transformedProjects, ...transformedInvoices];
      setItems(allItems);

      // Calculate stats
      const statsData = {
        total: allItems.length,
        totalValue: allItems.reduce((sum, item) => sum + (item.value || 0), 0),
        byStage: {}
      };

      BUSINESS_STAGES.forEach(stage => {
        const stageItems = allItems.filter(item => item.stage === stage.id);
        statsData.byStage[stage.id] = {
          count: stageItems.length,
          value: stageItems.reduce((sum, item) => sum + (item.value || 0), 0)
        };
      });

      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (selectedItem) {
        // Update existing item based on type
        if (selectedItem.type === 'deal') {
          await dealApi.updateDeal(selectedItem._id, {
            title: formData.title,
            contact: formData.contact || undefined,
            value: formData.value,
            stage: formData.stage,
            description: formData.description,
            priority: formData.priority,
            expectedCloseDate: formData.expectedCloseDate
          });
        } else if (selectedItem.type === 'project') {
          await api.put(`/projects/${selectedItem._id}`, {
            name: formData.title,
            leadId: formData.contact || undefined,
            estimate: { total: formData.value },
            status: formData.stage === 'won' ? 'pending'
                   : formData.stage === 'in_progress' ? 'in_progress'
                   : formData.stage === 'completed' ? 'completed'
                   : 'pending',
            description: formData.description,
            projectType: formData.projectType,
            startDate: formData.startDate,
            estimatedEndDate: formData.estimatedEndDate
          });
        }
        toast.success('Updated successfully');
      } else {
        // Create new deal (starting point)
        await dealApi.createDeal({
          title: formData.title,
          contact: formData.contact || undefined,
          value: formData.value,
          stage: formData.stage,
          description: formData.description,
          priority: formData.priority,
          expectedCloseDate: formData.expectedCloseDate
        });
        toast.success('Created successfully');
      }

      setShowAddModal(false);
      setSelectedItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save item');
    }
  };

  const handleStageChange = async (item, newStage) => {
    try {
      if (item.type === 'deal') {
        // If moving from 'won' stage, we need to create a project
        if (newStage === 'won' || newStage === 'in_progress') {
          // Create project from deal
          await api.post('/projects', {
            name: item.title,
            leadId: item.contact?._id,
            estimate: { total: item.value },
            status: newStage === 'won' ? 'pending' : 'in_progress',
            description: item.description,
            projectType: 'custom'
          });
          toast.success('Deal converted to project');
        } else {
          await dealApi.moveStage(item._id, newStage);
        }
      } else if (item.type === 'project') {
        const projectStatus = newStage === 'won' ? 'pending'
                            : newStage === 'in_progress' ? 'in_progress'
                            : newStage === 'completed' ? 'completed'
                            : newStage === 'lost' ? 'cancelled'
                            : 'pending';

        await api.put(`/projects/${item._id}`, { status: projectStatus });
      }

      fetchData();
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('Failed to move item');
    }
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      contact: item.contact?._id || '',
      contactName: item.contactName,
      value: item.value || 0,
      stage: item.stage,
      description: item.description || '',
      projectType: item.projectType || '',
      priority: item.priority || 'medium',
      expectedCloseDate: item.expectedCloseDate || '',
      startDate: item.startDate || '',
      estimatedEndDate: item.estimatedEndDate || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      contact: '',
      contactName: '',
      value: 0,
      stage: 'lead',
      description: '',
      projectType: '',
      priority: 'medium',
      expectedCloseDate: '',
      startDate: '',
      estimatedEndDate: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredItems = items.filter(item =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading business pipeline...</div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Business Pipeline
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage deals, projects, and invoices in one unified workflow
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedItem(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Opportunity
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Pipeline</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active Deals</p>
          <p className="text-2xl font-bold text-blue-600">
            {(stats.byStage.lead?.count || 0) + (stats.byStage.qualified?.count || 0) + (stats.byStage.proposal?.count || 0) + (stats.byStage.negotiation?.count || 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-cyan-600">{stats.byStage.in_progress?.count || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Revenue (Paid)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.byStage.paid?.value || 0)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search opportunities, contacts, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Pipeline View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-6 overflow-x-auto">
        {BUSINESS_STAGES.map((stage) => {
          const stageItems = filteredItems.filter(item => item.stage === stage.id);
          const StageIcon = stage.icon;

          return (
            <div key={stage.id} className="min-w-[280px]">
              {/* Stage Header */}
              <div className={`${stage.color} border-2 rounded-lg p-3 mb-3`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StageIcon className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {stageItems.length}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {formatCurrency(stats.byStage[stage.id]?.value || 0)}
                </p>
              </div>

              {/* Items in this stage */}
              <div className="space-y-3">
                {stageItems.map((item) => (
                  <Card
                    key={item._id}
                    className="cursor-pointer hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    onClick={() => handleCardClick(item)}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                          {item.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-700 dark:text-blue-300 mb-3">
                        {item.contactName && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span className="truncate">{item.contactName}</span>
                          </div>
                        )}
                        {item.value > 0 && (
                          <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100">
                            <DollarSign className="w-3 h-3" />
                            <span>{formatCurrency(item.value)}</span>
                          </div>
                        )}
                        {item.expectedCloseDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">{formatDate(item.expectedCloseDate)}</span>
                          </div>
                        )}
                        {item.priority && item.type === 'deal' && (
                          <Badge className={`text-xs ${
                            item.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                            item.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {item.priority}
                          </Badge>
                        )}
                      </div>

                      {/* Stage Actions */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Select
                          value={item.stage}
                          onValueChange={(newStage) => handleStageChange(item, newStage)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {stageItems.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-white dark:bg-gray-800 sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {selectedItem ? 'Edit Opportunity' : 'New Opportunity'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title" className="text-gray-900 dark:text-gray-100">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter opportunity name"
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <Label htmlFor="contact" className="text-gray-900 dark:text-gray-100">Contact</Label>
              <Select
                value={formData.contact}
                onValueChange={(value) => setFormData({ ...formData, contact: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800">
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
              <Label htmlFor="value" className="text-gray-900 dark:text-gray-100">Value ($) *</Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <Label htmlFor="stage" className="text-gray-900 dark:text-gray-100">Stage</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800">
                  {BUSINESS_STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedItem && (
              <div>
                <Label htmlFor="priority" className="text-gray-900 dark:text-gray-100">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add notes or description"
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="expectedCloseDate" className="text-gray-900 dark:text-gray-100">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateOrUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!formData.title || formData.value < 0}
              >
                {selectedItem ? 'Update' : 'Create'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedItem(null);
                  resetForm();
                }}
                variant="outline"
                className="flex-1 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
