import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function AIInsightsWidget() {
  const { data: insights = [] } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const res = await api.get('/ai-conversations');
      const conversations = res.data;

      // Generate insights from recent conversations
      const recentConversations = conversations.slice(0, 10);
      const insights = [];

      const positiveCount = recentConversations.filter(c => c.sentiment === 'positive').length;
      const negativeCount = recentConversations.filter(c => c.sentiment === 'negative').length;

      if (positiveCount > negativeCount) {
        insights.push({
          type: 'success',
          title: 'Positive Sentiment Trend',
          description: `${positiveCount} out of last ${recentConversations.length} conversations were positive`
        });
      }

      if (negativeCount > 3) {
        insights.push({
          type: 'warning',
          title: 'Attention Needed',
          description: `${negativeCount} conversations had negative sentiment. Consider follow-up.`
        });
      }

      const actionItems = conversations.flatMap(c => c.actionItems || []).filter(a => !a.completed);
      if (actionItems.length > 0) {
        insights.push({
          type: 'info',
          title: 'Pending Action Items',
          description: `${actionItems.length} action items need attention`
        });
      }

      return insights;
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      default: return TrendingUp;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span>AI Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {insights.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-8">
            <div>
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">No insights available yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const Icon = getIcon(insight.type);
              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${getColor(insight.type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
