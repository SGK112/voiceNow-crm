import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Lead } from '../../types';

const fetchLeads = async (): Promise<Lead[]> => {
  const response = await api.get('/leads');
  const leadsData = Array.isArray(response.data)
    ? response.data
    : (response.data?.leads || response.data?.data || []);
  return leadsData;
};

export const useLeads = () => {
  return useQuery<Lead[], Error>({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  });
};
