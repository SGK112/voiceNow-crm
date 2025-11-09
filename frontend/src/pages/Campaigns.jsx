import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Play, Pause, Eye, Trash2, Upload } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const campaignApi = {
  getAll: () => axios.get(`${API_URL}/campaigns`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }),
  delete: (id) => axios.delete(`${API_URL}/campaigns/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }),
  start: (id) => axios.post(`${API_URL}/campaigns/${id}/start`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }),
  pause: (id) => axios.post(`${API_URL}/campaigns/${id}/pause`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }),
  resume: (id) => axios.post(`${API_URL}/campaigns/${id}/resume`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }),
};

export default function Campaigns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await campaignApi.getAll();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: campaignApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
    },
  });

  const startMutation = useMutation({
    mutationFn: campaignApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: campaignApi.pause,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: campaignApi.resume,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
    },
  });

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'outline',
      running: 'default',
      paused: 'warning',
      completed: 'success',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleStart = async (campaignId) => {
    if (confirm('Are you sure you want to start this campaign?')) {
      await startMutation.mutateAsync(campaignId);
    }
  };

  const handlePause = async (campaignId) => {
    if (confirm('Are you sure you want to pause this campaign?')) {
      await pauseMutation.mutateAsync(campaignId);
    }
  };

  const handleResume = async (campaignId) => {
    await resumeMutation.mutateAsync(campaignId);
  };

  const handleDelete = async (campaignId) => {
    if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(campaignId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage batch calling campaigns for outbound and inbound calls
          </p>
        </div>
        <Button onClick={() => navigate('/app/campaigns/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first batch calling campaign to start reaching your contacts
            </p>
            <Button onClick={() => navigate('/app/campaigns/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns || []).map((campaign) => (
                <TableRow key={campaign._id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.agentId?.name || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>{campaign.stats.totalContacts}</TableCell>
                  <TableCell>{campaign.stats.completed}</TableCell>
                  <TableCell>
                    {campaign.stats.totalContacts > 0
                      ? ((campaign.stats.completed / campaign.stats.totalContacts) * 100).toFixed(1)
                      : 0}%
                  </TableCell>
                  <TableCell>${campaign.stats.totalCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/app/campaigns/${campaign._id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                          <DropdownMenuItem onClick={() => handleStart(campaign._id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Campaign
                          </DropdownMenuItem>
                        ) : null}

                        {campaign.status === 'running' ? (
                          <DropdownMenuItem onClick={() => handlePause(campaign._id)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Campaign
                          </DropdownMenuItem>
                        ) : null}

                        {campaign.status === 'paused' ? (
                          <DropdownMenuItem onClick={() => handleResume(campaign._id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume Campaign
                          </DropdownMenuItem>
                        ) : null}

                        {campaign.status !== 'running' ? (
                          <DropdownMenuItem
                            onClick={() => handleDelete(campaign._id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
