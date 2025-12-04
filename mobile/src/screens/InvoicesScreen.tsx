import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { Invoice, Payment, InvoiceStats, INVOICE_STATUSES, PAYMENT_METHODS } from '../types';
import { useQuickBooksStatus } from '../hooks/useQuickBooksStatus';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const InvoicesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { connected: qbConnected, syncing: qbSyncing, syncNow } = useQuickBooksStatus();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'other' as string,
    paymentType: 'partial' as string,
    notes: '',
    paymentDate: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const [invoicesRes, statsRes] = await Promise.all([
        api.get('/invoices', { params: { type: 'invoice', limit: 50 } }),
        api.get('/invoices/stats')
      ]);
      setInvoices(invoicesRes.data.invoices || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      Alert.alert('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchPayments = async (invoiceId: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/payments`);
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const getStatusInfo = (status: string) => {
    return INVOICE_STATUSES.find(s => s.key === status) || { label: status, color: '#6b7280' };
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      setActionLoading(true);
      await api.post(`/invoices/${invoice._id}/send`);
      Alert.alert('Success', 'Invoice sent to client');
      fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.amountDue.toString(),
      paymentMethod: 'other',
      paymentType: invoice.amountPaid === 0 ? 'deposit' : 'partial',
      notes: '',
      paymentDate: new Date(),
    });
    fetchPayments(invoice._id);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > selectedInvoice.amountDue) {
      Alert.alert('Error', `Amount cannot exceed ${formatCurrency(selectedInvoice.amountDue)}`);
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/invoices/${selectedInvoice._id}/payment`, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        paymentType: paymentForm.paymentType,
        notes: paymentForm.notes,
        paymentDate: paymentForm.paymentDate.toISOString(),
      });
      Alert.alert('Success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      Alert.alert('Error', 'Cannot delete paid invoices');
      return;
    }

    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete(`/invoices/${invoice._id}`);
              Alert.alert('Success', 'Invoice deleted');
              setShowDetailModal(false);
              fetchInvoices();
            } catch (error) {
              console.error('Error deleting invoice:', error);
              Alert.alert('Error', 'Failed to delete invoice');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              {formatCurrency(stats.outstandingBalance)}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{stats.paidInvoices}</Text>
            <Text style={styles.miniStatLabel}>Paid</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Text style={[styles.miniStatValue, { color: '#f59e0b' }]}>{stats.pendingInvoices}</Text>
            <Text style={styles.miniStatLabel}>Pending</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Text style={[styles.miniStatValue, { color: '#ef4444' }]}>{stats.overdueInvoices}</Text>
            <Text style={styles.miniStatLabel}>Overdue</Text>
          </View>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{stats.draftInvoices}</Text>
            <Text style={styles.miniStatLabel}>Draft</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInvoiceCard = ({ item }: { item: Invoice }) => {
    const statusInfo = getStatusInfo(item.status);
    const progressPercent = item.total > 0 ? (item.amountPaid / item.total) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedInvoice(item);
          fetchPayments(item._id);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
            <Text style={styles.clientName}>{item.client.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.amountContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.total)}</Text>
          </View>

          <View style={styles.dueContainer}>
            <Text style={styles.dueLabel}>Due</Text>
            <Text style={[styles.dueAmount, item.amountDue > 0 ? { color: '#f59e0b' } : { color: '#22c55e' }]}>
              {formatCurrency(item.amountDue)}
            </Text>
          </View>
        </View>

        {/* Payment Progress Bar */}
        {item.amountPaid > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progressPercent)}% paid
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.dateText}>
              {formatDate(item.issueDate)}
            </Text>
          </View>

          {item.dueDate && (
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={14} color={item.status === 'overdue' ? '#ef4444' : '#6b7280'} />
              <Text style={[styles.dateText, item.status === 'overdue' && { color: '#ef4444' }]}>
                Due {formatDate(item.dueDate)}
              </Text>
            </View>
          )}
        </View>

        {item.syncStatus === 'synced' && (
          <View style={styles.syncBadge}>
            <Ionicons name="cloud-done-outline" size={12} color="#22c55e" />
            <Text style={styles.syncText}>QB</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedInvoice) return null;

    const statusInfo = getStatusInfo(selectedInvoice.status);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedInvoice.invoiceNumber}</Text>
                <Text style={styles.modalSubtitle}>{selectedInvoice.client.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status and Amounts */}
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusText}>{statusInfo.label}</Text>
                  </View>
                  {selectedInvoice.syncStatus === 'synced' && (
                    <View style={styles.qbBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                      <Text style={styles.qbText}>QuickBooks Synced</Text>
                    </View>
                  )}
                </View>

                <View style={styles.amountSummary}>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Total</Text>
                    <Text style={styles.amountBoxValue}>{formatCurrency(selectedInvoice.total)}</Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Paid</Text>
                    <Text style={[styles.amountBoxValue, { color: '#22c55e' }]}>
                      {formatCurrency(selectedInvoice.amountPaid)}
                    </Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Due</Text>
                    <Text style={[styles.amountBoxValue, { color: selectedInvoice.amountDue > 0 ? '#f59e0b' : '#22c55e' }]}>
                      {formatCurrency(selectedInvoice.amountDue)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {selectedInvoice.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                      <Text style={styles.itemQty}>
                        {item.quantity} x {formatCurrency(item.rate)}
                      </Text>
                    </View>
                    <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>

              {/* Payments History */}
              {payments.length > 0 && (
                <View style={styles.paymentsSection}>
                  <Text style={styles.sectionTitle}>Payment History</Text>
                  {payments.map((payment, index) => (
                    <View key={index} style={styles.paymentRow}>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                        <Text style={styles.paymentMethod}>
                          {PAYMENT_METHODS.find(m => m.key === payment.paymentMethod)?.label || payment.paymentMethod}
                        </Text>
                      </View>
                      <Text style={styles.paymentDate}>{formatDate(payment.paymentDate)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              {selectedInvoice.status === 'draft' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton]}
                    onPress={() => handleSendInvoice(selectedInvoice)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Send</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteInvoice(selectedInvoice)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              )}

              {selectedInvoice.amountDue > 0 && selectedInvoice.status !== 'draft' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.paymentButton, { flex: 1 }]}
                  onPress={() => {
                    setShowDetailModal(false);
                    setTimeout(() => openPaymentModal(selectedInvoice), 300);
                  }}
                >
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Record Payment</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPaymentModal = () => {
    if (!selectedInvoice) return null;

    return (
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Payment</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedInvoice.invoiceNumber} - Due: {formatCurrency(selectedInvoice.amountDue)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={paymentForm.amount}
                  onChangeText={(text) => setPaymentForm({ ...paymentForm, amount: text })}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Payment Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Type</Text>
                <View style={styles.optionGroup}>
                  {[
                    { key: 'deposit', label: 'Deposit' },
                    { key: 'partial', label: 'Partial' },
                    { key: 'final', label: 'Final' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.optionBtn,
                        paymentForm.paymentType === type.key && styles.optionBtnActive
                      ]}
                      onPress={() => setPaymentForm({ ...paymentForm, paymentType: type.key })}
                    >
                      <Text style={[
                        styles.optionText,
                        paymentForm.paymentType === type.key && styles.optionTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodGrid}>
                  {PAYMENT_METHODS.slice(0, 6).map((method) => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        styles.methodBtn,
                        paymentForm.paymentMethod === method.key && styles.methodBtnActive
                      ]}
                      onPress={() => setPaymentForm({ ...paymentForm, paymentMethod: method.key })}
                    >
                      <Ionicons
                        name={method.icon as any}
                        size={20}
                        color={paymentForm.paymentMethod === method.key ? '#fff' : '#9ca3af'}
                      />
                      <Text style={[
                        styles.methodText,
                        paymentForm.paymentMethod === method.key && styles.methodTextActive
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#a855f7" />
                  <Text style={styles.dateButtonText}>
                    {paymentForm.paymentDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={paymentForm.paymentDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) {
                        setPaymentForm({ ...paymentForm, paymentDate: date });
                      }
                    }}
                    maximumDate={new Date()}
                    themeVariant="dark"
                  />
                )}
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={paymentForm.notes}
                  onChangeText={(text) => setPaymentForm({ ...paymentForm, notes: text })}
                  placeholder="Payment reference, check number, etc."
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.paymentButton]}
                onPress={handleRecordPayment}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoices</Text>
        <View style={styles.headerRight}>
          {qbConnected && (
            <TouchableOpacity
              style={styles.qbHeaderButton}
              onPress={syncNow}
              disabled={qbSyncing}
            >
              {qbSyncing ? (
                <ActivityIndicator size="small" color="#2CA01C" />
              ) : (
                <Ionicons name="logo-usd" size={18} color="#2CA01C" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => (navigation as any).navigate('EstimateForm', { type: 'invoice' })}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoiceCard}
        ListHeaderComponent={renderStatsCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a855f7"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyTitle}>No Invoices</Text>
            <Text style={styles.emptyText}>
              Create your first invoice or convert an estimate
            </Text>
          </View>
        }
      />

      {renderDetailModal()}
      {renderPaymentModal()}
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
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qbHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2CA01C20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clientName: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountContainer: {},
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  dueContainer: {
    alignItems: 'flex-end',
  },
  dueLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  dueAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#2e2e3e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
    paddingTop: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: 16,
    right: 100,
  },
  syncText: {
    fontSize: 10,
    color: '#22c55e',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  qbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qbText: {
    fontSize: 12,
    color: '#22c55e',
  },
  amountSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  amountBox: {
    flex: 1,
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  amountBoxLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  amountBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e',
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: '#fff',
  },
  itemQty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  paymentsSection: {
    marginTop: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e',
  },
  paymentInfo: {},
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
  },
  paymentButton: {
    backgroundColor: '#22c55e',
  },
  cancelButton: {
    backgroundColor: '#2e2e3e',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    flex: 0,
    paddingHorizontal: 16,
  },
  actionButtonText: {
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2e2e3e',
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: '#a855f7',
  },
  optionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodBtn: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#2e2e3e',
    alignItems: 'center',
    gap: 4,
  },
  methodBtnActive: {
    backgroundColor: '#a855f7',
  },
  methodText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  methodTextActive: {
    color: '#fff',
  },
  dateButton: {
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
});

export default InvoicesScreen;
