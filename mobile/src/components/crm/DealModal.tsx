import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Deal, STAGES, PRIORITIES } from '../../types';
import api from '../../services/api';
import TaskList from './TaskList';

interface DealModalProps {
  deal: Deal | null;
  dealToCreate?: Partial<Deal> | null;
  isVisible: boolean;
  onClose: () => void;
  onDealCreated: () => void;
  onDealUpdated: () => void;
  onDealDeleted: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const DealModal: React.FC<DealModalProps> = ({ deal, dealToCreate, isVisible, onClose, onDealCreated, onDealUpdated, onDealDeleted }) => {
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    value: '',
    stage: 'lead',
    priority: 'medium',
    description: '',
    dueDate: null as Date | null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (dealToCreate) {
      setNewDealForm({
        title: dealToCreate.title || '',
        value: dealToCreate.value?.toString() || '',
        stage: dealToCreate.stage || 'lead',
        priority: dealToCreate.priority || 'medium',
        description: dealToCreate.description || '',
        dueDate: dealToCreate.dueDate ? new Date(dealToCreate.dueDate) : null,
      });
    } else {
      setNewDealForm({
        title: '',
        value: '',
        stage: 'lead',
        priority: 'medium',
        description: '',
        dueDate: null,
      });
    }
  }, [dealToCreate]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewDealForm({ ...newDealForm, dueDate: selectedDate });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const clearDueDate = () => {
    setNewDealForm({ ...newDealForm, dueDate: null });
  };

  const createDeal = async () => {
    if (!newDealForm.title.trim()) {
      Alert.alert('Error', 'Please enter a deal title');
      return;
    }

    try {
      const dealData = {
        title: newDealForm.title,
        value: parseFloat(newDealForm.value) || 0,
        stage: newDealForm.stage,
        priority: newDealForm.priority,
        description: newDealForm.description,
        dueDate: newDealForm.dueDate?.toISOString() || null,
        probability: newDealForm.stage === 'lead' ? 10 :
                     newDealForm.stage === 'qualified' ? 25 :
                     newDealForm.stage === 'proposal' ? 50 :
                     newDealForm.stage === 'negotiation' ? 75 : 100,
        contact: dealToCreate?.contact,
      };

      await api.post('/deals', dealData);
      setNewDealForm({ title: '', value: '', stage: 'lead', priority: 'medium', description: '', dueDate: null });
      onDealCreated();
    } catch (error) {
      console.error('Error creating deal:', error);
      Alert.alert('Error', 'Failed to create deal');
    }
  };

  const updateDealStage = async (dealId: string, newStage: string) => {
    try {
      await api.patch(`/deals/${dealId}/stage`, { stage: newStage });
      onDealUpdated();
    } catch (error) {
      console.error('Error updating deal stage:', error);
      Alert.alert('Error', 'Failed to update deal stage');
    }
  };

  const deleteDeal = async (dealId: string) => {
    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this deal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/deals/${dealId}`);
              onDealDeleted();
            } catch (error) {
              console.error('Error deleting deal:', error);
              Alert.alert('Error', 'Failed to delete deal');
            }
          },
        },
      ]
    );
  };

  const renderDealDetailModal = () => (
    <Modal visible={!!deal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{deal?.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Value</Text>
              <Text style={styles.modalValue}>{formatCurrency(deal?.value || 0)}</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Stage</Text>
              <View style={styles.stageSelector}>
                {STAGES.map(stage => (
                  <TouchableOpacity
                    key={stage.key}
                    style={[
                      styles.stageSelectorBtn,
                      deal?.stage === stage.key && { backgroundColor: stage.color }
                    ]}
                    onPress={() => {
                      if (deal && deal.stage !== stage.key) {
                        updateDealStage(deal._id, stage.key);
                      }
                    }}
                  >
                    <Text style={[
                      styles.stageSelectorText,
                      deal?.stage === stage.key && { color: '#fff' }
                    ]}>
                      {stage.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Probability</Text>
              <Text style={styles.modalValue}>{deal?.probability}%</Text>
            </View>

            {deal?.contact && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Contact</Text>
                <View>
                  <Text style={styles.modalValue}>{deal.contact.name}</Text>
                  <Text style={styles.modalSubvalue}>{deal.contact.email}</Text>
                </View>
              </View>
            )}

            {deal?.description && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalValue}>{deal.description}</Text>
              </View>
            )}

            {deal?.dueDate && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Due Date</Text>
                <View style={styles.dueDateDisplay}>
                  <Ionicons name="calendar-outline" size={18} color="#a855f7" />
                  <Text style={styles.modalValue}>
                    {new Date(deal.dueDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={() => deal && deleteDeal(deal._id)}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNewDealModal = () => (
    <Modal visible={isVisible && !deal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Deal</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newDealForm.title}
                onChangeText={(text) => setNewDealForm({ ...newDealForm, title: text })}
                placeholder="Deal title"
                placeholderTextColor="#6b7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={styles.input}
                value={newDealForm.value}
                onChangeText={(text) => setNewDealForm({ ...newDealForm, value: text })}
                placeholder="0"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stage</Text>
              <View style={styles.optionGroup}>
                {STAGES.slice(0, 4).map(stage => (
                  <TouchableOpacity
                    key={stage.key}
                    style={[
                      styles.optionBtn,
                      newDealForm.stage === stage.key && { backgroundColor: stage.color }
                    ]}
                    onPress={() => setNewDealForm({ ...newDealForm, stage: stage.key })}
                  >
                    <Text style={[
                      styles.optionText,
                      newDealForm.stage === stage.key && { color: '#fff' }
                    ]}>
                      {stage.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.optionGroup}>
                {PRIORITIES.map(priority => (
                  <TouchableOpacity
                    key={priority.key}
                    style={[
                      styles.optionBtn,
                      newDealForm.priority === priority.key && { backgroundColor: priority.color }
                    ]}
                    onPress={() => setNewDealForm({ ...newDealForm, priority: priority.key })}
                  >
                    <Text style={[
                      styles.optionText,
                      newDealForm.priority === priority.key && { color: '#fff' }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newDealForm.description}
                onChangeText={(text) => setNewDealForm({ ...newDealForm, description: text })}
                placeholder="Deal description..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due Date</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#a855f7" />
                  <Text style={styles.dateButtonText}>{formatDate(newDealForm.dueDate)}</Text>
                </TouchableOpacity>
                {newDealForm.dueDate && (
                  <TouchableOpacity style={styles.clearDateButton} onPress={clearDueDate}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={newDealForm.dueDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  themeVariant="dark"
                />
              )}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.primaryButton]}
              onPress={createDeal}
            >
              <Text style={styles.modalButtonText}>Create Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return deal ? renderDealDetailModal() : renderNewDealModal();
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalRow: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalValue: {
    fontSize: 16,
    color: '#fff',
  },
  modalSubvalue: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  stageSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  stageSelectorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2e2e3e',
  },
  stageSelectorText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#2e2e3e',
  },
  primaryButton: {
    backgroundColor: '#a855f7',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2e2e3e',
  },
  optionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  clearDateButton: {
    padding: 8,
  },
  dueDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
});

export default DealModal;
