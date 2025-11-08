import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Workflow as WorkflowIcon } from 'lucide-react';

export default function Workflows() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('save_lead');
  const queryClient = useQueryClient();

  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowApi.getWorkflows().then(res => res.data),
  });

  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowApi.getTemplates().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (type) => workflowApi.createWorkflow({ type }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows']);
      setIsCreateOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) =>
      enabled ? workflowApi.activateWorkflow(id) : workflowApi.deactivateWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows']);
    },
  });

  const handleCreate = () => {
    createMutation.mutate(selectedTemplate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Automate tasks with n8n workflows</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>Choose a pre-built workflow template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  {templates && Object.entries(templates).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows?.map((workflow) => (
          <Card key={workflow._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription className="capitalize">{workflow.type.replace('_', ' ')}</CardDescription>
                </div>
                <Switch
                  checked={workflow.enabled}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: workflow._id, enabled: checked })}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Executions</span>
                  <span className="font-medium">{workflow.executionCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-medium">
                    {workflow.executionCount > 0
                      ? ((workflow.successCount / workflow.executionCount) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <Badge variant={workflow.enabled ? 'success' : 'secondary'} className="mt-2">
                  {workflow.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <WorkflowIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-4">Create your first automation workflow</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
