import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import messageService, { Thread } from '../services/MessageService';

export function useMessageThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThreads = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    try {
      const { data, error } = await messageService.getMessageThreads(isRefreshing);
      if (data) {
        setThreads(data);
      }
      if (error && !isRefreshing) {
        Alert.alert('Error', 'Failed to fetch messages. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThreads(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchThreads(true);
  }, []);

  return {
    threads,
    loading,
    refreshing,
    onRefresh,
    fetchThreads,
  };
}
