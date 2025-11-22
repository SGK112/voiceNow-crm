import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDuration, formatDateTime, formatPhoneNumber } from '@/lib/utils';
import { PhoneIncoming, PhoneOutgoing, Filter, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Calls() {
  const [filters, setFilters] = useState({
    direction: 'all',
    status: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const res = await callApi.getCalls();
      return res.data;
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => callApi.syncConversations(),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['calls']);
      toast.success(`Synced ${data.data.synced} conversations from ElevenLabs`);
    },
    onError: (error) => {
      toast.error(`Failed to sync: ${error.message}`);
    }
  });

  const calls = data?.calls && Array.isArray(data.calls) ? data.calls : [];

  // Filter calls based on selected filters
  const filteredCalls = calls.filter(call => {
    // Direction filter
    if (filters.direction !== 'all' && call.direction !== filters.direction) {
      return false;
    }

    // Status filter
    if (filters.status !== 'all' && call.status !== filters.status) {
      return false;
    }

    // Search filter (phone, name, agent)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesPhone = (call.phoneNumber || '').toLowerCase().includes(searchLower);
      const matchesName = (call.callerName || '').toLowerCase().includes(searchLower);
      const matchesAgent = (call.agentId?.name || '').toLowerCase().includes(searchLower);

      if (!matchesPhone && !matchesName && !matchesAgent) {
        return false;
      }
    }

    return true;
  });

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      failed: 'destructive',
      'no-answer': 'secondary',
      busy: 'warning',
      canceled: 'secondary',
      'in-progress': 'default',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getDirectionIndicator = (direction) => {
    if (direction === 'inbound') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" title="Inbound" />
          <PhoneIncoming className="h-4 w-4 text-green-600" />
          <span className="hidden sm:inline text-green-600 font-medium">Inbound</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" title="Outbound" />
          <PhoneOutgoing className="h-4 w-4 text-red-600" />
          <span className="hidden sm:inline text-red-600 font-medium">Outbound</span>
        </div>
      );
    }
  };

  const clearFilters = () => {
    setFilters({
      direction: 'all',
      status: 'all',
      search: ''
    });
  };

  const hasActiveFilters = filters.direction !== 'all' || filters.status !== 'all' || filters.search !== '';

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading calls...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call History</h1>
          <p className="text-muted-foreground">
            View all voice agent calls ({filteredCalls.length} {filteredCalls.length === 1 ? 'call' : 'calls'})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync from ElevenLabs</span>
          </Button>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {[filters.direction !== 'all', filters.status !== 'all', filters.search !== ''].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Phone, name, or agent..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="text-base"
                />
              </div>

              {/* Direction Filter */}
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <select
                  id="direction"
                  value={filters.direction}
                  onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-base"
                >
                  <option value="all">All Directions</option>
                  <option value="inbound">Inbound Only</option>
                  <option value="outbound">Outbound Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-base"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="canceled">Canceled</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCalls.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Agent</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call._id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(call.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getDirectionIndicator(call.direction)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPhoneNumber(call.phoneNumber || call.callerPhone || 'N/A')}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {call.callerName || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {call.agentId?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDuration(call.duration)}
                      </TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : hasActiveFilters ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No calls match your filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No calls yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
