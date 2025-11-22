import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Sparkles, Brain, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import api from '../lib/api';

export default function AIInsightsCard() {
  const [aiAvailable, setAiAvailable] = useState(false);

  // Check AI availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const response = await api.get('/ai/availability');
        setAiAvailable(response.data.available);
      } catch (err) {
        console.error('Failed to check AI availability:', err);
        setAiAvailable(false);
      }
    };
    checkAvailability();
  }, []);

  // Fetch AI insights
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const response = await api.get('/ai/insights');
      return response.data;
    },
    enabled: aiAvailable,
    refetchInterval: 60000 // Refetch every minute
  });

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />;
  };

  if (!aiAvailable) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <CardDescription>Get AI-powered recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-muted/50">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Configure an AI provider (OpenAI, Anthropic, or Google AI) to enable smart insights and recommendations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <CardDescription>Analyzing your call data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription className="text-sm">
              {error?.response?.data?.message || 'Failed to load insights'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30">
            Powered by {insights.provider || 'openai'}
          </Badge>
        </div>
        <CardDescription className="text-foreground">Smart analytics from your call data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        {insights.insights && insights.insights.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {insights.insights.map((insight, index) => (
              <div key={index} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 dark:backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">{insight.title}</span>
                  {getTrendIcon(insight.trend)}
                </div>
                <div className="text-2xl font-bold text-foreground">{insight.value}</div>
                <p className="text-xs font-medium text-foreground mt-1">{insight.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {insights.message || 'Not enough call data yet. Start making calls to get AI-powered insights!'}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        {insights.totalCalls > 0 && (
          <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 space-y-2 dark:backdrop-blur-sm">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Last 30 Days Overview
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-foreground text-xs font-semibold">Total Calls</div>
                <div className="font-bold text-lg text-foreground">{insights.totalCalls}</div>
              </div>
              <div>
                <div className="text-foreground text-xs font-semibold">Successful</div>
                <div className="font-bold text-lg text-green-600 dark:text-green-400">{insights.successfulCalls}</div>
              </div>
              <div>
                <div className="text-foreground text-xs font-semibold">Avg Duration</div>
                <div className="font-bold text-lg text-foreground">{insights.avgDuration}s</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
