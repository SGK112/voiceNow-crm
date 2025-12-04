import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lead } from '../../types';
import api from '../../services/api';

interface LeadModalProps {
  lead: Lead | null;
  isVisible: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
  onLeadDeleted: () => void;
  onConvertToDeal: (lead: Lead) => void;
}

const LeadModal: React.FC<LeadModalProps> = ({ lead, isVisible, onClose, onLeadCreated, onLeadDeleted, onConvertToDeal }) => {
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    notes: '',
  });

  const createLead = async () => {
    if (!newLeadForm.name.trim() || !newLeadForm.email.trim()) {
      Alert.alert('Error', 'Please enter name and email');
      return;
    }

    try {
      await api.post('/leads', {
        ...newLeadForm,
        status: 'new',
      });
      setNewLeadForm({ name: '', email: '', phone: '', company: '', source: '', notes: '' });
      onLeadCreated();
    } catch (error) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', 'Failed to create lead');
    }
  };

  const deleteLead = async (leadId: string) => {
    Alert.alert(
      'Delete Lead',
      'Are you sure you want to delete this lead?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/leads/${leadId}`);
              onLeadDeleted();
            } catch (error) {
              console.error('Error deleting lead:', error);
              Alert.alert('Error', 'Failed to delete lead');
            }
          },
        },
      ]
    );
  };

  const renderLeadDetailModal = () => (
    <Modal visible={!!lead} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{lead?.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Email</Text>
              <Text style={styles.modalValue}>{lead?.email}</Text>
            </View>

            {lead?.phone && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Phone</Text>
                <Text style={styles.modalValue}>{lead?.phone}</Text>
              </View>
            )}

            {lead?.company && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Company</Text>
                <Text style={styles.modalValue}>{lead?.company}</Text>
              </View>
            )}

            {lead?.source && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Source</Text>
                <Text style={styles.modalValue}>{lead?.source}</Text>
              </View>
            )}

            {lead?.notes && (
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Notes</Text>
                <Text style={styles.modalValue}>{lead?.notes}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={() => lead && deleteLead(lead._id)}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.primaryButton]}
              onPress={() => lead && onConvertToDeal(lead)}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>Convert to Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNewLeadModal = () => (
    <Modal visible={isVisible && !lead} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Lead</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={newLeadForm.name}
                onChangeText={(text) => setNewLeadForm({ ...newLeadForm, name: text })}
                placeholder="Full name"
                placeholderTextColor="#6b7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={newLeadForm.email}
                onChangeText={(text) => setNewLeadForm({ ...newLeadForm, email: text })}
                placeholder="email@example.com"
                placeholderTextColor="#6b7280"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={newLeadForm.phone}
                onChangeText={(text) => setNewLeadForm({ ...newLeadForm, phone: text })}
                placeholder="Phone number"
                placeholderTextColor="#6b7280"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.input}
                value={newLeadForm.company}
                onChangeText={(text) => setNewLeadForm({ ...newLeadForm, company: text })}
                placeholder="Company name"
                placeholderTextColor="#6b7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Source</Text>
              <TextInput
                style={styles.input}
                value={newLeadForm.source}
                onChangeText={(text) => setNewLeadForm({ ...newLeadForm, source: text })}
                placeholder="e.g., Website, Referral, Ad"
                placeholderTextColor="#6b7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newLeadForm.notes}
                onChangeText={(text) => setNewLeadForm({ ...newLeadForm, notes: text })}
                placeholder="Additional notes..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={4}
              />
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
              onPress={createLead}
            >
              <Text style={styles.modalButtonText}>Add Lead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return lead ? renderLeadDetailModal() : renderNewLeadModal();
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
});

export default LeadModal;
