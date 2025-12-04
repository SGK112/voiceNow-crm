import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Types for UI actions from backend
export interface UIAction {
  type: 'show_list' | 'confirm_sms' | 'confirm_email' | 'confirm_appointment' | 'confirm_memory' | 'error';
  listType?: 'leads' | 'contacts' | 'appointments';
  data: any;
}

interface Props {
  visible: boolean;
  uiAction: UIAction | null;
  onClose: () => void;
  onAction?: (action: string, data: any) => void;
}

const AriaResponseModal: React.FC<Props> = ({ visible, uiAction, onClose, onAction }) => {
  if (!uiAction) return null;

  const renderListItem = (item: any, type: string) => {
    const getIcon = () => {
      switch (type) {
        case 'leads': return 'person-add';
        case 'contacts': return 'person';
        case 'appointments': return 'calendar';
        default: return 'ellipse';
      }
    };

    const getStatusColor = (status?: string) => {
      switch (status?.toLowerCase()) {
        case 'hot': return '#EF4444';
        case 'warm': return '#F59E0B';
        case 'new': return '#10B981';
        case 'cold': return '#6B7280';
        default: return '#3B82F6';
      }
    };

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => onAction?.('select_item', { type, item })}
      >
        <View style={[styles.listItemIcon, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getIcon()} size={20} color={getStatusColor(item.status)} />
        </View>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>{item.name || item.title || 'Unknown'}</Text>
          {item.phone && <Text style={styles.listItemSubtitle}>{item.phone}</Text>}
          {item.email && <Text style={styles.listItemSubtitle}>{item.email}</Text>}
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          )}
          {type === 'appointments' && item.startTime && (
            <Text style={styles.listItemSubtitle}>
              {new Date(item.startTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    switch (uiAction.type) {
      case 'show_list':
        return (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Ionicons
                name={uiAction.listType === 'leads' ? 'people' : uiAction.listType === 'contacts' ? 'person' : 'calendar'}
                size={24}
                color="#3B82F6"
              />
              <Text style={styles.listTitle}>
                {uiAction.listType === 'leads' ? 'Leads' : uiAction.listType === 'contacts' ? 'Contacts' : 'Appointments'}
                {uiAction.data.query && ` for "${uiAction.data.query}"`}
              </Text>
              <Text style={styles.listCount}>{uiAction.data.count} found</Text>
            </View>
            {uiAction.data.items && uiAction.data.items.length > 0 ? (
              <FlatList
                data={uiAction.data.items.slice(0, 10)}
                keyExtractor={(item, index) => item._id || item.id || index.toString()}
                renderItem={({ item }) => renderListItem(item, uiAction.listType!)}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#6B7280" />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            )}
          </View>
        );

      case 'confirm_sms':
        return (
          <View style={styles.confirmContainer}>
            <View style={[styles.confirmIcon, { backgroundColor: uiAction.data.status === 'sent' ? '#10B98120' : '#EF444420' }]}>
              <Ionicons
                name={uiAction.data.status === 'sent' ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={uiAction.data.status === 'sent' ? '#10B981' : '#EF4444'}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {uiAction.data.status === 'sent' ? 'SMS Sent!' : 'SMS Failed'}
            </Text>
            <View style={styles.messagePreview}>
              <Text style={styles.messageLabel}>To: {uiAction.data.contactName || uiAction.data.to}</Text>
              <Text style={styles.messageContent}>{uiAction.data.message}</Text>
            </View>
            {uiAction.data.status === 'sent' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onAction?.('view_conversation', uiAction.data)}
              >
                <Text style={styles.actionButtonText}>View Conversation</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'confirm_email':
        return (
          <View style={styles.confirmContainer}>
            <View style={[styles.confirmIcon, { backgroundColor: uiAction.data.status === 'sent' ? '#10B98120' : '#EF444420' }]}>
              <Ionicons
                name={uiAction.data.status === 'sent' ? 'mail' : 'mail-unread'}
                size={48}
                color={uiAction.data.status === 'sent' ? '#10B981' : '#EF4444'}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {uiAction.data.status === 'sent' ? 'Email Sent!' : 'Email Failed'}
            </Text>
            <View style={styles.messagePreview}>
              <Text style={styles.messageLabel}>To: {uiAction.data.to}</Text>
              <Text style={styles.messageLabel}>Subject: {uiAction.data.subject}</Text>
              <ScrollView style={styles.emailBody}>
                <Text style={styles.messageContent}>{uiAction.data.body}</Text>
              </ScrollView>
            </View>
          </View>
        );

      case 'confirm_appointment':
        return (
          <View style={styles.confirmContainer}>
            <View style={[styles.confirmIcon, { backgroundColor: uiAction.data.status === 'scheduled' ? '#10B98120' : '#EF444420' }]}>
              <Ionicons
                name={uiAction.data.status === 'scheduled' ? 'calendar-outline' : 'calendar'}
                size={48}
                color={uiAction.data.status === 'scheduled' ? '#10B981' : '#EF4444'}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {uiAction.data.status === 'scheduled' ? 'Appointment Scheduled!' : 'Scheduling Failed'}
            </Text>
            {uiAction.data.appointment && (
              <View style={styles.appointmentDetails}>
                <Text style={styles.appointmentTitle}>{uiAction.data.appointment.title}</Text>
                {uiAction.data.appointment.startTime && (
                  <Text style={styles.appointmentTime}>
                    {new Date(uiAction.data.appointment.startTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                )}
                {uiAction.data.appointment.contactName && (
                  <Text style={styles.appointmentContact}>
                    With: {uiAction.data.appointment.contactName}
                  </Text>
                )}
              </View>
            )}
            {uiAction.data.status === 'scheduled' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onAction?.('view_calendar', uiAction.data)}
              >
                <Text style={styles.actionButtonText}>View in Calendar</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'confirm_memory':
        return (
          <View style={styles.confirmContainer}>
            <View style={[styles.confirmIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="sparkles" size={48} color="#3B82F6" />
            </View>
            <Text style={styles.confirmTitle}>Got it!</Text>
            <Text style={styles.memoryText}>
              I'll remember that {uiAction.data.key}: {uiAction.data.value}
            </Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.confirmContainer}>
            <View style={[styles.confirmIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{uiAction.data.message}</Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => onAction?.('retry', uiAction.data)}
            >
              <Text style={styles.actionButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#1a1a1b', '#0a0a0b']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.ariaIcon}>
                  <Ionicons name="sparkles" size={16} color="#3B82F6" />
                </View>
                <Text style={styles.headerTitle}>Aria</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {renderContent()}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    paddingBottom: 34, // Safe area
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2E',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ariaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2E',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dismissText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  // List styles
  listContainer: {
    maxHeight: 400,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  listCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  list: {
    maxHeight: 320,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2E',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  // Confirm styles
  confirmContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  messagePreview: {
    width: '100%',
    backgroundColor: '#1F1F20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  emailBody: {
    maxHeight: 150,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Appointment styles
  appointmentDetails: {
    width: '100%',
    backgroundColor: '#1F1F20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appointmentTime: {
    fontSize: 15,
    color: '#10B981',
    marginBottom: 4,
  },
  appointmentContact: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Memory styles
  memoryText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Error styles
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});

export default AriaResponseModal;
