import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function UpcomingAppointmentsWidget() {
  const { data: appointments = [] } = useQuery({
    queryKey: ['upcoming-appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      const upcoming = res.data
        .filter(apt => new Date(apt.startTime) > new Date() && apt.status === 'scheduled')
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, 5);
      return upcoming;
    }
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Upcoming Appointments</span>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {appointments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-8">
            <div>
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt._id} className="pb-3 border-b last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{apt.title || apt.type}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(apt.startTime), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {apt.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{apt.location}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {apt.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
