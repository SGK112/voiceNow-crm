import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealApi, leadApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export default function Deals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    contact: '',
    value: 0,
    stage: 'lead',
    expectedCloseDate: '',
    priority: 'medium'
  });
  const queryClient = useQueryClient();

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealApi.getDeals().then(res => res.data),
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadApi.getLeads().then(res => res.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['deals', 'summary'],
    queryFn: () => dealApi.getPipelineSummary().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => dealApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      setIsCreateOpen(false);
      setFormData({ title: '', contact: '', value: 0, stage: 'lead', expectedCloseDate: '', priority: 'medium' });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }) => dealApi.moveStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleStageChange = (dealId, newStage) => {
    updateStageMutation.mutate({ id: dealId, stage: newStage });
  };

  const getStageColor = (stage) => {
    return STAGES.find(s => s.value === stage)?.color || 'bg-gray-500';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
              <DialogDescription>Add a new opportunity to your pipeline</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="title">Deal Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={formData.contact}
                  onValueChange={(value) => setFormData({ ...formData, contact: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads?.map((lead) => (
                      <SelectItem key={lead._id} value={lead._id}>
                        {lead.name} ({lead.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">Deal Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Summary */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.overall?.totalValue || 0)}</div>
              <p className="text-xs text-muted-foreground">{summary.overall?.totalDeals || 0} active deals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.overall?.weightedValue || 0)}</div>
              <p className="text-xs text-muted-foreground">Based on probability</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.stages?.won?.totalValue || 0)}</div>
              <p className="text-xs text-muted-foreground">{summary.stages?.won?.count || 0} deals closed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals?.map((deal) => (
                <TableRow key={deal._id}>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>{deal.contact?.name || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(deal.value)}</TableCell>
                  <TableCell>
                    <Badge className={getStageColor(deal.stage)}>
                      {STAGES.find(s => s.value === deal.stage)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(deal.priority)}>
                      {deal.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{deal.probability}%</TableCell>
                  <TableCell>
                    {deal.expectedCloseDate ? formatDateTime(deal.expectedCloseDate).split(',')[0] : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={deal.stage}
                      onValueChange={(value) => handleStageChange(deal._id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {(!deals || deals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No deals yet. Create your first deal to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
