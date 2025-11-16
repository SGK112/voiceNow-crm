import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function RevenueChartWidget() {
  const { data: revenue } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: async () => {
      const res = await api.get('/leads');
      const leads = res.data;
      const totalRevenue = leads.reduce((sum, lead) => sum + (lead.totalRevenue || 0), 0);
      const estimatedValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

      // Calculate monthly revenue for last 6 months
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthLeads = leads.filter(l => {
          const leadDate = new Date(l.createdAt);
          return leadDate.getMonth() === date.getMonth() &&
                 leadDate.getFullYear() === date.getFullYear();
        });
        const revenue = monthLeads.reduce((sum, lead) => sum + (lead.totalRevenue || 0), 0);
        monthlyRevenue.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue
        });
      }

      return { totalRevenue, estimatedValue, monthlyRevenue };
    }
  });

  const maxRevenue = Math.max(...(revenue?.monthlyRevenue || []).map(m => m.revenue), 1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Revenue Overview</span>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
        <CardDescription>Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(revenue?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(revenue?.estimatedValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Est. Pipeline</p>
            </div>
          </div>

          <div className="space-y-2">
            {revenue?.monthlyRevenue?.map((month, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{month.month}</span>
                  <span className="font-medium">{formatCurrency(month.revenue)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                    style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
