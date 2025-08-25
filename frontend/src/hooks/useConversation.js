import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/authService';
import { useAuth } from '../providers/AuthProvider';
import toast from 'react-hot-toast';

// Hook for fetching ticket conversation
export const useTicketConversation = (ticketId) => {
  const { userRole } = useAuth();
  const canAccessConversations = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useQuery({
    queryKey: ['conversation', ticketId],
    queryFn: async () => {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/conversation`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: canAccessConversations && !!ticketId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        console.debug('User does not have permission to view conversations');
        return;
      }
      console.error('Error fetching conversation:', error);
    },
  });
};

// Hook for fetching ticket solution
export const useTicketSolution = (ticketId) => {
  const { userRole } = useAuth();
  const canAccessSolutions = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useQuery({
    queryKey: ['solution', ticketId],
    queryFn: async () => {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/solution`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: canAccessSolutions && !!ticketId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
};

// Hook for generating conversation summary
export const useGenerateSummary = () => {
  const { userRole } = useAuth();
  const canGenerateSummary = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useMutation({
    mutationFn: async (ticketId) => {
      if (!canGenerateSummary) {
        throw new Error('No permission to generate summaries');
      }
      
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/summarize`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Yhteenveto luotu onnistuneesti');
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta luoda yhteenvetoja');
      } else {
        toast.error('Yhteenvedon luonti epäonnistui');
      }
      console.error('Error generating summary:', error);
    },
  });
};