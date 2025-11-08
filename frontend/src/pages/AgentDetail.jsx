import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { agentApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatDateTime } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: agent } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentApi.getAgentById(id).then(res => res.data),
  });

  const { data: calls } = useQuery({
    queryKey: ['agent-calls', id],
    queryFn: () => agentApi.getAgentCalls(id).then(res => res.data),
  });

  const { data: performance } = useQuery({
    queryKey: ['agent-performance', id],
    queryFn: () => agentApi.getAgentPerformance(id).then(res => res.data),
  });

  if (!agent) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground capitalize">{agent.type.replace('_', ' ')} Agent</p>
        </div>
        <Badge variant={agent.enabled ? 'success' : 'secondary'} className="ml-auto">
          {agent.enabled ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.totalCalls || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.successRate || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(performance?.averageDuration || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Script</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{agent.script}</pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {calls && calls.length > 0 ? (
            <div className="space-y-4">
              {calls.slice(0, 10).map((call) => (
                <div key={call._id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{call.callerName || call.callerPhone}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(call.createdAt)} - {formatDuration(call.duration)}
                    </p>
                  </div>
                  <Badge variant={call.status === 'completed' ? 'success' : 'secondary'}>
                    {call.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No calls yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
