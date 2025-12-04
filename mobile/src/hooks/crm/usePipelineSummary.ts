import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { PipelineSummary } from '../../types';

const fetchPipelineSummary = async (): Promise<PipelineSummary> => {
  const response = await api.get('/deals/pipeline/summary');
  return response.data || null;
};

export const usePipelineSummary = () => {
  return useQuery<PipelineSummary, Error>({
    queryKey: ['pipelineSummary'],
    queryFn: fetchPipelineSummary,
  });
};
