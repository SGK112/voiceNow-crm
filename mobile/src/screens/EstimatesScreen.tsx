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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Invoice, ESTIMATE_STATUSES } from '../types';
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

const EstimatesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { connected: qbConnected, syncing: qbSyncing, syncNow } = useQuickBooksStatus();
  const [estimates, setEstimates] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEstimates = useCallback(async () => {
    try {
      const response = await api.get('/invoices', {
        params: { type: 'estimate', limit: 50 }
      });
      setEstimates(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      Alert.alert('Error', 'Failed to load estimates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEstimates();
  }, [fetchEstimates]);

  const getStatusInfo = (status: string) => {
    return ESTIMATE_STATUSES.find(s => s.key === status) || { label: status, color: '#6b7280' };
  };

  const handleSendEstimate = async (estimate: Invoice) => {
    try {
      setActionLoading(true);
      await api.post(`/invoices/${estimate._id}/send`);
      Alert.alert('Success', 'Estimate sent to client');
      fetchEstimates();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error sending estimate:', error);
      Alert.alert('Error', 'Failed to send estimate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptEstimate = async (estimate: Invoice) => {
    try {
      setActionLoading(true);
      await api.post(`/invoices/${estimate._id}/accept`);
      Alert.alert('Success', 'Estimate marked as accepted');
      fetchEstimates();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error accepting estimate:', error);
      Alert.alert('Error', 'Failed to accept estimate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async (estimate: Invoice) => {
    Alert.alert(
      'Convert to Invoice',
      'This will create a new invoice from this estimate. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await api.post(`/invoices/${estimate._id}/convert`);
              Alert.alert(
                'Success',
                `Invoice #${response.data.invoiceNumber} created from estimate`
              );
              fetchEstimates();
              setShowDetailModal(false);
            } catch (error) {
              console.error('Error converting estimate:', error);
              Alert.alert('Error', 'Failed to convert estimate to invoice');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteEstimate = async (estimate: Invoice) => {
    Alert.alert(
      'Delete Estimate',
      'Are you sure you want to delete this estimate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete(`/invoices/${estimate._id}`);
              Alert.alert('Success', 'Estimate deleted');
              fetchEstimates();
              setShowDetailModal(false);
            } catch (error) {
              console.error('Error deleting estimate:', error);
              Alert.alert('Error', 'Failed to delete estimate');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderEstimateCard = ({ item }: { item: Invoice }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedEstimate(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.estimateNumber}>{item.invoiceNumber}</Text>
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

          {item.items.length > 0 && (
            <Text style={styles.itemsCount}>
              {item.items.length} item{item.items.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.dateText}>
              Created {formatDate(item.createdAt)}
            </Text>
          </View>

          {item.validUntil && (
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.dateText}>
                Valid until {formatDate(item.validUntil)}
              </Text>
            </View>
          )}
        </View>

        {item.syncStatus === 'synced' && (
          <View style={styles.syncBadge}>
            <Ionicons name="cloud-done-outline" size={12} color="#22c55e" />
            <Text style={styles.syncText}>QB Synced</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedEstimate) return null;

    const statusInfo = getStatusInfo(selectedEstimate.status);

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
                <Text style={styles.modalTitle}>{selectedEstimate.invoiceNumber}</Text>
                <Text style={styles.modalSubtitle}>{selectedEstimate.client.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                  <Text style={styles.statusText}>{statusInfo.label}</Text>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedEstimate.total)}</Text>
              </View>

              {/* Items */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {selectedEstimate.items.map((item, index) => (
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

              {/* Totals */}
              <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedEstimate.subtotal)}</Text>
                </View>
                {selectedEstimate.discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <Text style={[styles.totalValue, { color: '#22c55e' }]}>
                      -{formatCurrency(selectedEstimate.discount)}
                    </Text>
                  </View>
                )}
                {selectedEstimate.taxAmount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax ({selectedEstimate.taxRate}%)</Text>
                    <Text style={styles.totalValue}>{formatCurrency(selectedEstimate.taxAmount)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(selectedEstimate.total)}</Text>
                </View>
              </View>

              {/* Client Info */}
              <View style={styles.clientSection}>
                <Text style={styles.sectionTitle}>Client</Text>
                <Text style={styles.clientInfo}>{selectedEstimate.client.name}</Text>
                <Text style={styles.clientInfo}>{selectedEstimate.client.email}</Text>
                {selectedEstimate.client.phone && (
                  <Text style={styles.clientInfo}>{selectedEstimate.client.phone}</Text>
                )}
              </View>

              {/* Notes */}
              {selectedEstimate.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.notesText}>{selectedEstimate.notes}</Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              {selectedEstimate.status === 'draft' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton]}
                    onPress={() => handleSendEstimate(selectedEstimate)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Send</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteEstimate(selectedEstimate)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}

              {(selectedEstimate.status === 'sent' || selectedEstimate.status === 'viewed') && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptEstimate(selectedEstimate)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-outline" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.convertButton]}
                    onPress={() => handleConvertToInvoice(selectedEstimate)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="swap-horizontal-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Convert</Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedEstimate.status === 'accepted' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.convertButton, { flex: 1 }]}
                  onPress={() => handleConvertToInvoice(selectedEstimate)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="swap-horizontal-outline" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Convert to Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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
        <Text style={styles.headerTitle}>Estimates</Text>
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
            onPress={() => (navigation as any).navigate('EstimateForm')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {estimates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#6b7280" />
          <Text style={styles.emptyTitle}>No Estimates</Text>
          <Text style={styles.emptyText}>
            Create your first estimate to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => (navigation as any).navigate('EstimateForm')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Estimate</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={estimates}
          keyExtractor={(item) => item._id}
          renderItem={renderEstimateCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a855f7"
            />
          }
        />
      )}

      {renderDetailModal()}
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
  estimateNumber: {
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
    color: '#22c55e',
  },
  itemsCount: {
    fontSize: 14,
    color: '#6b7280',
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
    right: 16,
  },
  syncText: {
    fontSize: 10,
    color: '#22c55e',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a855f7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    marginTop: 16,
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
  totalsSection: {
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 14,
    color: '#fff',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#3e3e4e',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  clientSection: {
    marginBottom: 16,
  },
  clientInfo: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  notesSection: {
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
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
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  convertButton: {
    backgroundColor: '#a855f7',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default EstimatesScreen;
