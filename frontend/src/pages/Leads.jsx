import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi, callApi, agentApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Phone } from 'lucide-react';
import { formatDateTime, formatCurrency, formatPhoneNumber } from '@/lib/utils';

export default function Leads() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('none');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', value: 0 });
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await leadApi.getLeads();
      // Handle multiple possible response formats
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.leads && Array.isArray(res.data.leads)) return res.data.leads;
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await agentApi.getAgents();
      if (Array.isArray(res.data)) return res.data;
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => leadApi.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setIsCreateOpen(false);
      setFormData({ name: '', email: '', phone: '', value: 0 });
    },
  });

  const callMutation = useMutation({
    mutationFn: (data) => callApi.initiateCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['calls']);
      setIsCallOpen(false);
      setSelectedLead(null);
      setSelectedAgent('none');
      alert('Call initiated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to initiate call');
    },
  });

  const getStatusBadge = (status) => {
    const variants = {
      new: 'default',
      contacted: 'secondary',
      qualified: 'success',
      converted: 'success',
      lost: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleExport = async () => {
    const response = await leadApi.exportLeads();
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leads.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleCallLead = (lead) => {
    setSelectedLead(lead);
    setIsCallOpen(true);
  };

  const handleInitiateCall = () => {
    if (!selectedAgent || selectedAgent === 'none') {
      alert('Please select an agent');
      return;
    }
    callMutation.mutate({
      leadId: selectedLead._id,
      agentId: selectedAgent,
      phoneNumber: selectedLead.phone
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your sales leads</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-initial">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-initial">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Lead</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>Manually add a lead to your CRM</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                    placeholder="1000"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Lead'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {(leads || []).length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Phone</TableHead>
                    <TableHead className="min-w-[100px]">Source</TableHead>
                    <TableHead className="min-w-[100px]">Value</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[100px]">Qualified</TableHead>
                    <TableHead className="min-w-[140px]">Created</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leads || []).map((lead) => (
                    <TableRow key={lead._id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="text-sm">{formatPhoneNumber(lead.phone)}</TableCell>
                      <TableCell className="capitalize text-sm">{lead.source.replace('_', ' ')}</TableCell>
                      <TableCell>{formatCurrency(lead.value)}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        <Badge variant={lead.qualified ? 'success' : 'secondary'}>
                          {lead.qualified ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(lead.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallLead(lead)}
                        >
                          <Phone className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Call</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No leads yet</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCallOpen} onOpenChange={setIsCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Call</DialogTitle>
            <DialogDescription>
              Select an agent to call {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lead Information</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{selectedLead?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLead?.phone}</p>
                <p className="text-sm text-muted-foreground">{selectedLead?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select an agent</SelectItem>
                  {(agents || []).map((agent) => (
                    <SelectItem key={agent._id} value={agent._id}>
                      {agent.name} ({agent.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(agents || []).length === 0 && (
              <p className="text-sm text-amber-600">
                No agents available. Please create an agent first in the Agents page.
              </p>
            )}
            <Button
              onClick={handleInitiateCall}
              className="w-full"
              disabled={callMutation.isPending || !selectedAgent || selectedAgent === 'none'}
            >
              {callMutation.isPending ? 'Initiating Call...' : 'Initiate Call'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
