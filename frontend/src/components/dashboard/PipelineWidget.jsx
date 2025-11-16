import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

export default function PipelineWidget() {
  const navigate = useNavigate();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-pipeline'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data;
    }
  });

  const statusCounts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    proposal_sent: leads.filter(l => l.status === 'proposal_sent').length,
    negotiation: leads.filter(l => l.status === 'negotiation').length,
    converted: leads.filter(l => l.status === 'converted').length
  };

  const stages = [
    { key: 'new', label: 'New', color: 'bg-gray-500' },
    { key: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
    { key: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
    { key: 'proposal_sent', label: 'Proposal', color: 'bg-yellow-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
    { key: 'converted', label: 'Converted', color: 'bg-green-500' }
  ];

  return (
    <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/app/crm')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sales Pipeline</span>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
        <CardDescription>Lead distribution by stage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage) => {
            const count = statusCounts[stage.key];
            const percentage = leads.length > 0 ? (count / leads.length) * 100 : 0;

            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`${stage.color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
