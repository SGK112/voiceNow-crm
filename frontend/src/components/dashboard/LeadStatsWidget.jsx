import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

export default function LeadStatsWidget() {
  const { data: stats } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => {
      const res = await api.get('/leads/stats');
      return res.data;
    }
  });

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Lead Statistics</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-lg font-semibold text-green-600">{stats?.qualifiedLeads || 0}</div>
              <p className="text-xs text-muted-foreground">Qualified</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{stats?.convertedLeads || 0}</div>
              <p className="text-xs text-muted-foreground">Converted</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Conversion Rate</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{stats?.conversionRate || 0}%</span>
                {stats?.conversionRate > 50 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
