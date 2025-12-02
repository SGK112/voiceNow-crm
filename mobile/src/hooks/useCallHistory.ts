import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import callHistoryService, { Call } from '../services/CallHistoryService';

export function useCallHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalls = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    try {
      const { data, error } = await callHistoryService.getCallHistory(isRefreshing);
      if (data) {
        setCalls(data);
      }
      if (error && !isRefreshing) {
        Alert.alert('Error', 'Failed to fetch call history. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalls(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCalls(true);
  }, []);

  return {
    calls,
    loading,
    refreshing,
    onRefresh,
    fetchCalls,
  };
}
