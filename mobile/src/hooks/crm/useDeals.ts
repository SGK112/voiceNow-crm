import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Deal } from '../../types';

const fetchDeals = async (): Promise<Deal[]> => {
  const response = await api.get('/deals');
  const dealsData = Array.isArray(response.data)
    ? response.data
    : (response.data?.deals || response.data?.data || []);
  return dealsData;
};

export const useDeals = () => {
  return useQuery<Deal[], Error>({
    queryKey: ['deals'],
    queryFn: fetchDeals,
  });
};
