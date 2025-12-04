import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { InvoiceItem, InvoiceType, Lead } from '../types';

interface RouteParams {
  type?: InvoiceType;
  leadId?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const EstimateFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams | undefined;

  const documentType: InvoiceType = params?.type || 'estimate';
  const isInvoice = documentType === 'invoice';

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'issue' | 'due' | 'valid'>('issue');

  // Form state
  const [form, setForm] = useState({
    type: documentType,
    client: {
      name: '',
      email: '',
      phone: '',
      company: '',
    },
    lead: params?.leadId || '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }] as InvoiceItem[],
    discount: 0,
    discountType: 'fixed' as 'percentage' | 'fixed',
    taxRate: 0,
    issueDate: new Date(),
    dueDate: null as Date | null,
    validUntil: null as Date | null,
    notes: '',
    terms: '',
    paymentInstructions: '',
  });

  // Calculated totals
  const subtotal = form.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = form.discountType === 'percentage'
    ? subtotal * (form.discount / 100)
    : form.discount;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (form.taxRate / 100);
  const total = taxableAmount + taxAmount;

  useEffect(() => {
    fetchLeads();
    if (params?.leadId) {
      fetchLeadDetails(params.leadId);
    }
  }, [params?.leadId]);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads', { params: { limit: 100 } });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchLeadDetails = async (leadId: string) => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      const lead = response.data;
      setForm(prev => ({
        ...prev,
        lead: lead._id,
        client: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone || '',
          company: lead.company || '',
        },
      }));
    } catch (error) {
      console.error('Error fetching lead details:', error);
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...form.items];
    (newItems[index] as any)[field] = value;

    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? (value as number) : newItems[index].quantity;
      const rate = field === 'rate' ? (value as number) : newItems[index].rate;
      newItems[index].amount = qty * rate;
    }

    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', quantity: 1, rate: 0, amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (form.items.length === 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const selectLead = (lead: Lead) => {
    setForm({
      ...form,
      lead: lead._id,
      client: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        company: lead.company || '',
      },
    });
    setShowLeadPicker(false);
  };

  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (datePickerMode === 'issue') {
        setForm({ ...form, issueDate: selectedDate });
      } else if (datePickerMode === 'due') {
        setForm({ ...form, dueDate: selectedDate });
      } else {
        setForm({ ...form, validUntil: selectedDate });
      }
    }
  };

  const openDatePicker = (mode: 'issue' | 'due' | 'valid') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.client.name.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }
    if (!form.client.email.trim()) {
      Alert.alert('Error', 'Please enter client email');
      return;
    }
    if (form.items.length === 0 || !form.items.some(item => item.description.trim())) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: form.type,
        client: form.client,
        lead: form.lead || undefined,
        items: form.items.filter(item => item.description.trim()),
        discount: form.discount,
        discountType: form.discountType,
        taxRate: form.taxRate,
        issueDate: form.issueDate.toISOString(),
        dueDate: form.dueDate?.toISOString(),
        validUntil: form.validUntil?.toISOString(),
        notes: form.notes,
        terms: form.terms,
        paymentInstructions: form.paymentInstructions,
        status: 'draft',
      };

      await api.post('/invoices', payload);
      Alert.alert('Success', `${isInvoice ? 'Invoice' : 'Estimate'} created successfully`);
      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating document:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const formatDateShort = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          New {isInvoice ? 'Invoice' : 'Estimate'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Client Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Client</Text>
              <TouchableOpacity
                style={styles.selectLeadButton}
                onPress={() => setShowLeadPicker(!showLeadPicker)}
              >
                <Ionicons name="people-outline" size={18} color="#a855f7" />
                <Text style={styles.selectLeadText}>Select from leads</Text>
              </TouchableOpacity>
            </View>

            {showLeadPicker && (
              <View style={styles.leadPicker}>
                <ScrollView style={styles.leadList} nestedScrollEnabled>
                  {leads.map((lead) => (
                    <TouchableOpacity
                      key={lead._id}
                      style={styles.leadItem}
                      onPress={() => selectLead(lead)}
                    >
                      <Text style={styles.leadName}>{lead.name}</Text>
                      <Text style={styles.leadEmail}>{lead.email}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.client.name}
                  onChangeText={(text) => setForm({
                    ...form,
                    client: { ...form.client, name: text }
                  })}
                  placeholder="Client name"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={form.client.email}
                  onChangeText={(text) => setForm({
                    ...form,
                    client: { ...form.client, email: text }
                  })}
                  placeholder="client@example.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={form.client.phone}
                  onChangeText={(text) => setForm({
                    ...form,
                    client: { ...form.client, phone: text }
                  })}
                  placeholder="Phone number"
                  placeholderTextColor="#6b7280"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Company</Text>
                <TextInput
                  style={styles.input}
                  value={form.client.company}
                  onChangeText={(text) => setForm({
                    ...form,
                    client: { ...form.client, company: text }
                  })}
                  placeholder="Company name"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>
          </View>

          {/* Dates Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openDatePicker('issue')}
              >
                <Text style={styles.dateLabel}>Issue Date</Text>
                <Text style={styles.dateValue}>{formatDateShort(form.issueDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openDatePicker(isInvoice ? 'due' : 'valid')}
              >
                <Text style={styles.dateLabel}>{isInvoice ? 'Due Date' : 'Valid Until'}</Text>
                <Text style={styles.dateValue}>
                  {formatDateShort(isInvoice ? form.dueDate : form.validUntil)}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={
                  datePickerMode === 'issue'
                    ? form.issueDate
                    : datePickerMode === 'due'
                      ? (form.dueDate || new Date())
                      : (form.validUntil || new Date())
                }
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateSelect}
                themeVariant="dark"
              />
            )}
          </View>

          {/* Items Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                <Ionicons name="add" size={20} color="#a855f7" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {form.items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>Item {index + 1}</Text>
                  {form.items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.input}
                  value={item.description}
                  onChangeText={(text) => updateItem(index, 'description', text)}
                  placeholder="Description"
                  placeholderTextColor="#6b7280"
                />

                <View style={styles.itemRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity.toString()}
                      onChangeText={(text) => updateItem(index, 'quantity', parseInt(text) || 0)}
                      placeholder="1"
                      placeholderTextColor="#6b7280"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Rate</Text>
                    <TextInput
                      style={styles.input}
                      value={item.rate.toString()}
                      onChangeText={(text) => updateItem(index, 'rate', parseFloat(text) || 0)}
                      placeholder="0.00"
                      placeholderTextColor="#6b7280"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Amount</Text>
                    <View style={[styles.input, styles.amountDisplay]}>
                      <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Discount & Tax Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adjustments</Text>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Discount</Text>
                <TextInput
                  style={styles.input}
                  value={form.discount.toString()}
                  onChangeText={(text) => setForm({ ...form, discount: parseFloat(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.discountTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeBtn,
                      form.discountType === 'fixed' && styles.discountTypeBtnActive
                    ]}
                    onPress={() => setForm({ ...form, discountType: 'fixed' })}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      form.discountType === 'fixed' && styles.discountTypeTextActive
                    ]}>$</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeBtn,
                      form.discountType === 'percentage' && styles.discountTypeBtnActive
                    ]}
                    onPress={() => setForm({ ...form, discountType: 'percentage' })}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      form.discountType === 'percentage' && styles.discountTypeTextActive
                    ]}>%</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={form.taxRate.toString()}
                  onChangeText={(text) => setForm({ ...form, taxRate: parseFloat(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Totals Section */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: '#22c55e' }]}>
                  -{formatCurrency(discountAmount)}
                </Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({form.taxRate}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(taxAmount)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                placeholder="Notes to client..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Terms & Conditions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.terms}
                onChangeText={(text) => setForm({ ...form, terms: text })}
                placeholder="Payment terms, warranty info..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={3}
              />
            </View>

            {isInvoice && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Instructions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.paymentInstructions}
                  onChangeText={(text) => setForm({ ...form, paymentInstructions: text })}
                  placeholder="Bank details, payment methods..."
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  selectLeadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectLeadText: {
    fontSize: 14,
    color: '#a855f7',
  },
  leadPicker: {
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 200,
  },
  leadList: {
    padding: 8,
  },
  leadItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3e3e4e',
  },
  leadName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  leadEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2e2e3e',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#2e2e3e',
    borderRadius: 10,
    padding: 14,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    color: '#a855f7',
  },
  itemCard: {
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  amountDisplay: {
    justifyContent: 'center',
    backgroundColor: '#1e1e2e',
  },
  amountText: {
    fontSize: 15,
    color: '#22c55e',
    fontWeight: '600',
  },
  discountTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#2e2e3e',
    borderRadius: 10,
    overflow: 'hidden',
  },
  discountTypeBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  discountTypeBtnActive: {
    backgroundColor: '#a855f7',
  },
  discountTypeText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  discountTypeTextActive: {
    color: '#fff',
  },
  totalsSection: {
    backgroundColor: '#1e1e2e',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  totalValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
  },
});

export default EstimateFormScreen;
