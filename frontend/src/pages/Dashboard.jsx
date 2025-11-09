import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await dashboardApi.getMetrics();
      return res.data;
    },
  });

  const { data: callsToday = [] } = useQuery({
    queryKey: ['calls-today'],
    queryFn: async () => {
      const res = await dashboardApi.getCallsToday();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your AI voice agents</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.agents?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.agents?.total || 0} total agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls This Month</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.thisMonth?.calls || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.calls?.successRate || 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.thisMonth?.leads || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.leads?.qualified || 0} qualified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.revenueImpact || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {metrics?.leads?.total || 0} total leads
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {callsToday && callsToday.length > 0 ? (
            <div className="space-y-4">
              {(callsToday || []).slice(0, 5).map((call) => (
                <div key={call._id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{call.callerName || call.callerPhone}</p>
                    <p className="text-sm text-muted-foreground">
                      {call.agentId?.name} - {call.status}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(call.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No calls today</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
