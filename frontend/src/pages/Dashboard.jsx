import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  PhoneCall,
  UserPlus,
  Library,
  Settings,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  BarChart3,
  Activity,
  LayoutDashboard
} from 'lucide-react';
import { formatCurrency, formatDuration, formatPhoneNumber } from '@/lib/utils';
import AIInsightsCard from '@/components/AIInsightsCard';

export default function Dashboard() {
  const navigate = useNavigate();

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

  const { data: callTrends = [] } = useQuery({
    queryKey: ['call-trends'],
    queryFn: async () => {
      const res = await dashboardApi.getCallTrends(7);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: agentPerformance = [] } = useQuery({
    queryKey: ['agent-performance'],
    queryFn: async () => {
      const res = await dashboardApi.getAgentPerformance();
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Loading state at the top with navigation still visible
  const renderLoadingState = () => (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    </div>
  );

  const quickActions = [
    { label: 'Deploy AI Agent', icon: Library, path: '/app/agents', color: 'bg-blue-500' },
    { label: 'Add Lead', icon: UserPlus, path: '/app/leads', color: 'bg-green-500' },
    { label: 'View Calls', icon: PhoneCall, path: '/app/conversations', color: 'bg-purple-500' },
    { label: 'Create Workflow', icon: TrendingUp, path: '/app/workflows', color: 'bg-orange-500' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Toolbar - Workflow Builder Style */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Real-time analytics and insights</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.path)}
              className="hidden md:flex items-center gap-2"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/app/settings')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content Area */}
      {isLoading ? renderLoadingState() : (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">

      {/* Key Metrics - Improved Mobile Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Agents */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.agents?.active || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.agents?.total || 0} total • {metrics?.agents?.paused || 0} paused
            </p>
            <Button
              variant="link"
              className="p-0 h-auto mt-2 text-xs"
              onClick={() => navigate('/app/agents')}
            >
              View all agents <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Calls This Month */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls This Month</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
              <PhoneCall className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.thisMonth?.calls || 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {metrics?.calls?.successRate || 0}% success rate
              </p>
              {metrics?.thisMonth?.callsGrowth !== undefined && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${
                  metrics.thisMonth.callsGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {metrics.thisMonth.callsGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(metrics.thisMonth.callsGrowth)}%</span>
                </div>
              )}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto mt-2 text-xs"
              onClick={() => navigate('/app/conversations')}
            >
              View conversations <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Leads Generated */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads This Month</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.thisMonth?.leads || 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {metrics?.leads?.qualified || 0} qualified • {metrics?.leads?.total || 0} total
              </p>
              {metrics?.thisMonth?.leadsGrowth !== undefined && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${
                  metrics.thisMonth.leadsGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {metrics.thisMonth.leadsGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(metrics.thisMonth.leadsGrowth)}%</span>
                </div>
              )}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto mt-2 text-xs"
              onClick={() => navigate('/app/leads')}
            >
              View all leads <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Revenue Impact */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(metrics?.revenueImpact || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {metrics?.leads?.total || 0} leads
            </p>
            <Button
              variant="link"
              className="p-0 h-auto mt-2 text-xs"
              onClick={() => navigate('/app/deals')}
            >
              View deals <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <AIInsightsCard />

      {/* Call Trends & Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Call Activity (Last 7 Days)</CardTitle>
            <CardDescription>Daily call volume and success rate</CardDescription>
          </CardHeader>
          <CardContent>
            {callTrends && callTrends.length > 0 ? (
              <div className="space-y-4">
                {callTrends.map((day, index) => {
                  const successRate = day.total > 0 ? ((day.successful / day.total) * 100).toFixed(0) : 0;
                  const maxCalls = Math.max(...callTrends.map(d => d.total), 1);
                  const barWidth = (day.total / maxCalls) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium w-24">
                          {new Date(day._id).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full flex items-center justify-end px-2"
                              style={{ width: `${barWidth}%` }}
                            >
                              {day.total > 0 && (
                                <span className="text-xs font-medium text-white">{day.total}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant={successRate >= 70 ? 'success' : successRate >= 50 ? 'default' : 'secondary'} className="w-14 justify-center">
                            {successRate}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-medium">No call data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Top performing agents this month</CardDescription>
          </CardHeader>
          <CardContent>
            {agentPerformance && agentPerformance.length > 0 ? (
              <div className="space-y-4">
                {agentPerformance.slice(0, 5).map((agent, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium truncate">{agent.agentName || 'Unknown Agent'}</p>
                        <Badge variant="outline" className="text-xs">
                          {agent.totalCalls} calls
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              agent.successRate >= 80 ? 'bg-green-500' :
                              agent.successRate >= 60 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${agent.successRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold w-12 text-right">
                          {agent.successRate?.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-medium">No agent data available</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/app/agents')}
                >
                  Set up your agents
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Calls</CardTitle>
                <CardDescription>Latest activity from your agents</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/calls')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {callsToday && callsToday.length > 0 ? (
              <div className="space-y-4">
                {callsToday.slice(0, 5).map((call) => (
                  <div
                    key={call._id}
                    className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                  >
                    {/* Direction Indicator */}
                    <div className="flex-shrink-0 pt-1">
                      {call.direction === 'inbound' ? (
                        <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                          <PhoneIncoming className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                          <PhoneOutgoing className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                      )}
                    </div>

                    {/* Call Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {call.callerName || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {formatPhoneNumber(call.phoneNumber || call.callerPhone)}
                          </p>
                        </div>
                        <Badge variant={call.status === 'completed' ? 'success' : 'secondary'}>
                          {call.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {call.agentId?.name || 'Unknown Agent'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.duration)}
                        </span>
                        <span>{new Date(call.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No calls today</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/app/agent-library')}
                >
                  Set up your first agent
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Key metrics this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Call Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Total Calls</span>
                <span className="font-bold text-foreground">{metrics?.thisMonth?.calls || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((metrics?.thisMonth?.calls || 0) / 100 * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Success Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Success Rate</span>
                <span className="font-bold text-foreground">{metrics?.calls?.successRate || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${metrics?.calls?.successRate || 0}%` }}
                />
              </div>
            </div>

            {/* Qualified Leads */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Qualified Leads</span>
                <span className="font-bold text-foreground">{metrics?.leads?.qualified || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${metrics?.leads?.total ? Math.min((metrics.leads.qualified / metrics.leads.total) * 100, 100) : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Average Call Duration */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Avg Call Duration</p>
                <p className="text-2xl font-bold text-foreground">{formatDuration(metrics?.calls?.avgDuration || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Total Minutes */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Minutes</p>
                <p className="text-2xl font-bold">{Math.round((metrics?.calls?.totalDuration || 0) / 60)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
      )}
    </div>
  );
}
