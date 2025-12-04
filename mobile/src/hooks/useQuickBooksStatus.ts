import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface QuickBooksStatus {
  connected: boolean;
  status?: string;
  syncStatus?: {
    status: string;
    lastSyncAt: string | null;
    error?: string;
  };
  lastSyncAt?: string | null;
}

export function useQuickBooksStatus() {
  const [qbStatus, setQbStatus] = useState<QuickBooksStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/quickbooks/status');
      setQbStatus(response.data);
    } catch (error) {
      console.error('Error fetching QuickBooks status:', error);
      setQbStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!qbStatus.connected || syncing) return;

    setSyncing(true);
    try {
      await api.post('/api/quickbooks/sync');
      await fetchStatus();
      return true;
    } catch (error) {
      console.error('Error syncing with QuickBooks:', error);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [qbStatus.connected, syncing, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    connected: qbStatus.connected,
    syncStatus: qbStatus.syncStatus,
    lastSyncAt: qbStatus.lastSyncAt || qbStatus.syncStatus?.lastSyncAt,
    loading,
    syncing,
    refresh: fetchStatus,
    syncNow,
  };
}
