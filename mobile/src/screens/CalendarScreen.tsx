import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Calendar from 'expo-calendar';
import api from '../utils/api';
import { Deal, STAGES, PRIORITIES } from '../types';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  isAllDay?: boolean;
  // CRM-specific fields
  type?: 'calendar' | 'deal' | 'task';
  dealId?: string;
  value?: number;
  stage?: string;
  priority?: 'low' | 'medium' | 'high';
  contactName?: string;
}

interface DayEvents {
  date: string;
  dayName: string;
  dayNum: number;
  events: CalendarEvent[];
  isToday: boolean;
}

export default function CalendarScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());

  function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    loadEvents();
  }, [currentWeekStart]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      // Request calendar permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const calendarIds = calendars.map(c => c.id);

        // Get events for current week + next 2 weeks
        const start = new Date(currentWeekStart);
        const end = new Date(currentWeekStart);
        end.setDate(end.getDate() + 21);

        const calendarEvents = await Calendar.getEventsAsync(calendarIds, start, end);

        const formattedEvents: CalendarEvent[] = calendarEvents.map(e => ({
          id: e.id,
          title: e.title,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
          location: e.location || undefined,
          notes: e.notes || undefined,
          isAllDay: e.allDay,
        }));

        setEvents(formattedEvents);
      }

      // Also try to fetch from backend
      try {
        const res = await api.get('/api/mobile/calendar/events');
        if (res.data.events) {
          const backendEvents: CalendarEvent[] = res.data.events.map((e: any) => ({
            id: e._id || e.id,
            title: e.title,
            startDate: new Date(e.startDate || e.start),
            endDate: new Date(e.endDate || e.end),
            location: e.location,
            notes: e.description || e.notes,
            type: 'calendar' as const,
          }));
          setEvents(prev => [...prev, ...backendEvents]);
        }
      } catch (err) {
        // Backend events optional
      }

      // Fetch CRM deals with due dates
      try {
        const dealsRes = await api.get('/deals');
        const deals: Deal[] = dealsRes.data || [];
        const dealsWithDueDates = deals.filter(deal => deal.dueDate);

        const dealEvents: CalendarEvent[] = dealsWithDueDates.map(deal => {
          const dueDate = new Date(deal.dueDate!);
          return {
            id: `deal-${deal._id}`,
            title: `📊 ${deal.title}`,
            startDate: dueDate,
            endDate: dueDate,
            isAllDay: true,
            type: 'deal' as const,
            dealId: deal._id,
            value: deal.value,
            stage: deal.stage,
            priority: deal.priority,
            contactName: deal.contact?.name,
            notes: deal.description,
          };
        });

        setEvents(prev => [...prev, ...dealEvents]);
      } catch (err) {
        console.log('Could not fetch CRM deals:', err);
      }

    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [currentWeekStart]);

  const goToPrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
    setSelectedDate(new Date());
  };

  const getWeekDays = (): DayEvents[] => {
    const days: DayEvents[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.startDate);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === date.getTime();
      }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      days.push({
        date: date.toISOString(),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        events: dayEvents,
        isToday: date.getTime() === today.getTime(),
      });
    }

    return days;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getEventColor = (event: CalendarEvent, index: number) => {
    // Use priority-based colors for deals
    if (event.type === 'deal') {
      const priorityColors: Record<string, string> = {
        high: '#EF4444',
        medium: '#F59E0B',
        low: '#6B7280',
      };
      return priorityColors[event.priority || 'medium'] || '#A855F7';
    }
    // Default colors for calendar events
    const eventColors = ['#3B82F6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    return eventColors[index % eventColors.length];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageLabel = (stageKey: string) => {
    const stage = STAGES.find(s => s.key === stageKey);
    return stage?.label || stageKey;
  };

  const weekDays = getWeekDays();
  const monthYear = new Date(currentWeekStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading && events.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
        <TouchableOpacity onPress={goToToday} style={[styles.todayBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevWeek} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>{monthYear}</Text>
        <TouchableOpacity onPress={goToNextWeek} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Week Days Header */}
      <View style={[styles.weekHeader, { borderBottomColor: colors.border }]}>
        {weekDays.map((day) => (
          <TouchableOpacity
            key={day.date}
            style={[
              styles.dayHeader,
              day.isToday && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedDate(new Date(day.date))}
          >
            <Text style={[styles.dayName, { color: day.isToday ? '#fff' : colors.textSecondary }]}>
              {day.dayName}
            </Text>
            <Text style={[styles.dayNum, { color: day.isToday ? '#fff' : colors.text }]}>
              {day.dayNum}
            </Text>
            {day.events.length > 0 && !day.isToday && (
              <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.eventsList}
        contentContainerStyle={styles.eventsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {weekDays.map((day, dayIndex) => (
          <View key={day.date}>
            {day.events.length > 0 && (
              <View style={styles.daySection}>
                <Text style={[styles.daySectionTitle, { color: colors.textSecondary }]}>
                  {day.isToday ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>
                {day.events.map((event, eventIndex) => (
                  <View
                    key={event.id}
                    style={[
                      styles.eventCard,
                      { backgroundColor: colors.card, borderLeftColor: getEventColor(event, eventIndex) },
                    ]}
                  >
                    <View style={styles.eventTime}>
                      <Text style={[styles.eventTimeText, { color: colors.textSecondary }]}>
                        {event.isAllDay ? 'All Day' : formatTime(event.startDate)}
                      </Text>
                    </View>
                    <View style={styles.eventDetails}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                      {/* Show deal-specific info */}
                      {event.type === 'deal' && (
                        <View style={styles.dealInfo}>
                          {event.value !== undefined && event.value > 0 && (
                            <Text style={[styles.dealValue, { color: colors.primary }]}>
                              {formatCurrency(event.value)}
                            </Text>
                          )}
                          <View style={styles.dealMeta}>
                            {event.stage && (
                              <View style={[styles.dealBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.dealBadgeText, { color: colors.primary }]}>
                                  {getStageLabel(event.stage)}
                                </Text>
                              </View>
                            )}
                            {event.contactName && (
                              <View style={styles.eventLocation}>
                                <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                                <Text style={[styles.eventLocationText, { color: colors.textTertiary }]}>
                                  {event.contactName}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                      {/* Show location for regular calendar events */}
                      {event.location && event.type !== 'deal' && (
                        <View style={styles.eventLocation}>
                          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                          <Text style={[styles.eventLocationText, { color: colors.textTertiary }]}>
                            {event.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {events.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your calendar events will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 20,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 150,
    textAlign: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  eventsList: {
    flex: 1,
  },
  eventsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  daySection: {
    marginBottom: 20,
  },
  daySectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  eventTime: {
    width: 60,
  },
  eventTimeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocationText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dealInfo: {
    marginTop: 4,
  },
  dealValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  dealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dealBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
