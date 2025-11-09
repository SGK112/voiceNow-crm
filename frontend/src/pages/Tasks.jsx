import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, leadApi, dealApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const TASK_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'demo', label: 'Demo' },
  { value: 'task', label: 'Task' },
  { value: 'reminder', label: 'Reminder' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export default function Tasks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    dueDate: '',
    relatedContact: 'none',
    relatedDeal: 'none',
  });
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filterStatus],
    queryFn: async () => {
      const res = await taskApi.getTasks(filterStatus ? { status: filterStatus } : {});
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: stats = {} } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: async () => {
      const res = await taskApi.getStats();
      return res.data || {};
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await leadApi.getLeads();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const res = await dealApi.getDeals();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setIsCreateOpen(false);
      setFormData({
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        dueDate: '',
        relatedContact: 'none',
        relatedDeal: 'none',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      relatedContact: formData.relatedContact === 'none' ? undefined : formData.relatedContact,
      relatedDeal: formData.relatedDeal === 'none' ? undefined : formData.relatedDeal,
    };
    createMutation.mutate(taskData);
  };

  const handleComplete = (taskId) => {
    updateMutation.mutate({ id: taskId, data: { status: 'completed' } });
  };

  const getPriorityColor = (priority) => {
    return PRIORITIES.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.pending;
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < new Date();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task or activity</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(TASK_TYPES || []).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                      {(PRIORITIES || []).map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relatedContact">Related Contact (Optional)</Label>
                  <Select
                    value={formData.relatedContact}
                    onValueChange={(value) => setFormData({ ...formData, relatedContact: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(leads || []).map((lead) => (
                        <SelectItem key={lead._id} value={lead._id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="relatedDeal">Related Deal (Optional)</Label>
                  <Select
                    value={formData.relatedDeal}
                    onValueChange={(value) => setFormData({ ...formData, relatedDeal: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(deals || []).map((deal) => (
                        <SelectItem key={deal._id} value={deal._id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue || 0}</div>
              <p className="text-xs text-muted-foreground">Need immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending || 0}</div>
              <p className="text-xs text-muted-foreground">To be started</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus?.completed || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Related To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tasks || []).length > 0 ? (
                (tasks || []).map((task) => (
                  <TableRow key={task._id} className={isOverdue(task) ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">
                      {task.title}
                      {isOverdue(task) && (
                        <Badge className="ml-2 bg-red-500">Overdue</Badge>
                      )}
                    </TableCell>
                    <TableCell>{TASK_TYPES.find(t => t.value === task.type)?.label}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? formatDateTime(task.dueDate) : 'No due date'}
                    </TableCell>
                    <TableCell>
                      {task.relatedContact?.name && (
                        <div className="text-sm">{task.relatedContact.name}</div>
                      )}
                      {task.relatedDeal?.title && (
                        <div className="text-xs text-muted-foreground">{task.relatedDeal.title}</div>
                      )}
                      {!task.relatedContact && !task.relatedDeal && 'N/A'}
                    </TableCell>
                    <TableCell>
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleComplete(task._id)}
                          disabled={updateMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No tasks yet. Create your first task to get started.
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
