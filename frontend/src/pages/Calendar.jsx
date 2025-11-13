import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, Clock, Users, Video, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function CalendarPage() {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    videoCalls: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks', {
        params: { type: 'appointment', sort: 'dueDate', order: 'asc' }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/tasks/stats');
      if (response.data) {
        setStats({
          today: response.data.today || 0,
          thisWeek: response.data.thisWeek || 0,
          thisMonth: response.data.thisMonth || 0,
          videoCalls: response.data.videoCalls || 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatTime = (date) => {
    if (!date) return 'No time set';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    const appointmentDate = new Date(date);
    return appointmentDate.toDateString() === today.toDateString();
  };

  const isThisWeek = (date) => {
    if (!date) return false;
    const today = new Date();
    const appointmentDate = new Date(date);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointmentDate >= today && appointmentDate <= weekFromNow;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Upcoming', variant: 'default' },
      in_progress: { label: 'In Progress', variant: 'secondary' },
      completed: { label: 'Completed', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'destructive' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const upcomingAppointments = appointments
    .filter(apt => apt.dueDate && new Date(apt.dueDate) > new Date() && apt.status !== 'completed')
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">Manage appointments and schedule meetings</p>
        </div>
        <Button onClick={() => window.location.href = '/app/tasks'}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground mt-1">Appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Total appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4 text-orange-600" />
              Video Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.videoCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your next scheduled meetings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading appointments...</div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">No upcoming appointments</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule your first appointment to get started
              </p>
              <Button onClick={() => window.location.href = '/app/tasks'}>
                <Plus className="h-4 w-4 mr-2" />
                Create Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/app/tasks?id=${appointment._id}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-lg ${
                      isToday(appointment.dueDate)
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-100 dark:bg-gray-800'
                    } flex items-center justify-center`}>
                      <CalendarIcon className={`h-6 w-6 ${
                        isToday(appointment.dueDate)
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{appointment.title || 'Untitled Appointment'}</p>
                        {getStatusBadge(appointment.status)}
                        {isToday(appointment.dueDate) && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">Today</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(appointment.dueDate)} at {formatTime(appointment.dueDate)}
                        </span>
                        {appointment.leadId?.name && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {appointment.leadId.name}
                          </span>
                        )}
                        {appointment.leadId?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {appointment.leadId.phone}
                          </span>
                        )}
                      </div>
                      {appointment.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/app/tasks?id=${appointment._id}`;
                  }}>
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Integration Notice */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Connect Google Calendar</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sync your appointments with Google Calendar for automatic reminders and seamless scheduling.
              </p>
              <Button size="sm" onClick={() => window.location.href = '/app/integrations'}>
                Set Up Integration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
