import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  notes?: string;
  selected: boolean;
}

export default function CalendarImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        loadCalendarEvents();
      } else {
        setPermissionGranted(false);
      }
    } catch (err) {
      console.error('Error requesting calendar permission:', err);
      Alert.alert('Error', 'Failed to request calendar permission');
    }
  };

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);

      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) {
        Alert.alert('No Calendars', 'No calendars found on your device');
        setLoading(false);
        return;
      }

      // Get events from the next 90 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const allEvents = [];
      for (const calendar of calendars) {
        const events = await Calendar.getEventsAsync(
          [calendar.id],
          startDate,
          endDate
        );
        allEvents.push(...events);
      }

      // Format and filter events
      const formattedEvents: CalendarEvent[] = allEvents
        .filter((event) => event.title && event.startDate)
        .map((event) => ({
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location || undefined,
          notes: event.notes || undefined,
          selected: false,
        }))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      setCalendarEvents(formattedEvents);
    } catch (err) {
      console.error('Error loading calendar events:', err);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (id: string) => {
    setCalendarEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, selected: !event.selected } : event
      )
    );
  };

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setCalendarEvents((prev) =>
      prev.map((event) => ({ ...event, selected: newSelectAll }))
    );
  };

  const getSelectedCount = () => {
    return calendarEvents.filter((e) => e.selected).length;
  };

  const handleImport = async () => {
    const selectedEvents = calendarEvents.filter((e) => e.selected);

    if (selectedEvents.length === 0) {
      Alert.alert('No Selection', 'Please select at least one event to import');
      return;
    }

    Alert.alert(
      'Import Calendar Events',
      `Import ${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Import',
          onPress: confirmImport,
        },
      ]
    );
  };

  const confirmImport = async () => {
    try {
      setImporting(true);

      const selectedEvents = calendarEvents.filter((e) => e.selected);

      const response = await api.post(
        '/api/mobile/calendar/import',
        { events: selectedEvents }
      );

      if (response.data.success) {
        Alert.alert(
          'Success',
          `Successfully imported ${response.data.imported} event${
            response.data.imported > 1 ? 's' : ''
          }`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Error importing calendar events:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to import calendar events. Please try again.'
      );
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const renderPermissionRequest = () => (
    <View style={styles.permissionContainer}>
      <Ionicons name="calendar" size={80} color={colors.primary} />
      <Text style={[styles.permissionTitle, { color: colors.text }]}>Access Your Calendar</Text>
      <Text style={[styles.permissionText, { color: colors.text }]}>
        VoiceNow CRM needs permission to access your calendar to import events.
      </Text>
      <Text style={[styles.permissionSubtext, { color: colors.textSecondary }]}>
        Your calendar data is private and only stored in your CRM.
      </Text>
      <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
        <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
        <Text style={styles.permissionButtonText}>Grant Permission</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEventItem = ({ item }: { item: CalendarEvent }) => (
    <TouchableOpacity
      style={[styles.eventItem, { borderBottomColor: colors.border }]}
      onPress={() => toggleEvent(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.checkbox}>
        {item.selected ? (
          <Ionicons name="checkbox" size={28} color={colors.primary} />
        ) : (
          <Ionicons name="square-outline" size={28} color={colors.textTertiary} />
        )}
      </View>

      <View style={[styles.eventIconContainer, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="calendar-outline" size={24} color={colors.primary} />
      </View>

      <View style={styles.eventInfo}>
        <Text style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.eventDate, { color: colors.textSecondary }]}>{formatDate(item.startDate)}</Text>
        {item.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.eventLocation, { color: colors.textTertiary }]}>{item.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!permissionGranted) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}>{renderPermissionRequest()}</View>;
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading calendar events...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Import Calendar</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Selection Controls */}
      <View style={[styles.controlsContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
          <Ionicons
            name={selectAll ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {selectAll ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
          {getSelectedCount()} of {calendarEvents.length} selected
        </Text>
      </View>

      {/* Events List */}
      <FlatList
        data={calendarEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No upcoming calendar events found</Text>
          </View>
        }
      />

      {/* Import Button */}
      {getSelectedCount() > 0 && (
        <View style={[styles.importButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: colors.primary }]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="download" size={24} color="#ffffff" />
                <Text style={styles.importButtonText}>
                  Import {getSelectedCount()} Event{getSelectedCount() > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButton: {
    width: 40,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  selectedCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  listContent: {
    paddingBottom: 100,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  checkbox: {
    marginRight: 12,
  },
  eventIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  importButtonContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#0a0a0b',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1b',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
