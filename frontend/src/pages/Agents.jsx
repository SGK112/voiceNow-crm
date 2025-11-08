import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Phone, BarChart } from 'lucide-react';

const AGENT_TYPES = {
  lead_gen: { name: 'Lead Generation', color: 'bg-blue-500' },
  booking: { name: 'Appointment Booking', color: 'bg-green-500' },
  collections: { name: 'Collections', color: 'bg-yellow-500' },
  promo: { name: 'Promotions', color: 'bg-purple-500' },
  support: { name: 'Support', color: 'bg-red-500' },
};

export default function Agents() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgentType, setNewAgentType] = useState('lead_gen');
  const [newAgentName, setNewAgentName] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentApi.getAgents().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => agentApi.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
      setIsCreateOpen(false);
      setNewAgentName('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => agentApi.updateAgent(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
    },
  });

  const handleCreateAgent = () => {
    createMutation.mutate({
      type: newAgentType,
      name: newAgentName || undefined,
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Agents</h1>
          <p className="text-muted-foreground">Manage your AI voice agents</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>Choose an agent type to get started</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Agent Type</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                >
                  {Object.entries(AGENT_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Agent Name (Optional)</Label>
                <Input
                  placeholder="Leave empty for default name"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                />
              </div>

              <Button onClick={handleCreateAgent} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents?.map((agent) => (
          <Card key={agent._id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${AGENT_TYPES[agent.type]?.color}`} />
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </div>
                <Switch
                  checked={agent.enabled}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: agent._id, enabled: checked })}
                />
              </div>
              <CardDescription className="capitalize">{agent.type.replace('_', ' ')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Calls</span>
                  <span className="font-medium">{agent.performance.totalCalls}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-medium">
                    {agent.performance.totalCalls > 0
                      ? ((agent.performance.successfulCalls / agent.performance.totalCalls) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Leads Generated</span>
                  <span className="font-medium">{agent.performance.leadsGenerated}</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/agents/${agent._id}`)}
                  >
                    <BarChart className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI voice agent to get started</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
