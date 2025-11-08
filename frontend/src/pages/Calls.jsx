import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatDateTime, formatPhoneNumber } from '@/lib/utils';

export default function Calls() {
  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: () => callApi.getCalls().then(res => res.data),
  });

  const calls = data?.calls || [];

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      failed: 'destructive',
      'no-answer': 'secondary',
      busy: 'warning',
      canceled: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Call History</h1>
        <p className="text-muted-foreground">View all voice agent calls</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call._id}>
                    <TableCell className="text-sm">
                      {formatDateTime(call.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {call.agentId?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{call.callerName || 'Unknown'}</TableCell>
                    <TableCell>{formatPhoneNumber(call.callerPhone)}</TableCell>
                    <TableCell className="capitalize">{call.direction}</TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No calls yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
