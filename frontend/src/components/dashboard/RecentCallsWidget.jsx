import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { formatDuration, formatPhoneNumber } from '@/lib/utils';

export default function RecentCallsWidget() {
  const { data: calls = [] } = useQuery({
    queryKey: ['recent-calls-widget'],
    queryFn: async () => {
      const res = await dashboardApi.getCallsToday();
      return Array.isArray(res.data) ? res.data.slice(0, 5) : [];
    }
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Recent Calls</span>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {calls.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-8">
            <div>
              <Phone className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">No recent calls</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div key={call._id} className="flex items-start gap-2 pb-3 border-b last:border-0">
                <div className="flex-shrink-0 mt-1">
                  {call.direction === 'inbound' ? (
                    <div className="p-1.5 bg-green-100 dark:bg-green-950 rounded">
                      <PhoneIncoming className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-950 rounded">
                      <PhoneOutgoing className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{call.callerName || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatPhoneNumber(call.phoneNumber || call.callerPhone)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={call.status === 'completed' ? 'success' : 'secondary'} className="text-xs">
                      {call.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
