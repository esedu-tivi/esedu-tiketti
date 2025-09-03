import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/authService';
import { useAuth } from '../providers/AuthProvider';
import toast from 'react-hot-toast';

// Hook for AI ticket configuration
export const useAIConfig = () => {
  const { userRole } = useAuth();
  const canAccessAI = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/ai/config`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: canAccessAI,
    staleTime: 10 * 60 * 1000, // Config doesn't change often
    cacheTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        console.debug('User does not have permission to access AI config');
        return;
      }
      console.error('Error fetching AI config:', error);
    },
  });
};

// Hook for generating ticket preview
export const useGenerateTicketPreview = () => {
  const { userRole } = useAuth();
  const canGenerateTickets = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useMutation({
    mutationFn: async (params) => {
      if (!canGenerateTickets) {
        throw new Error('No permission to generate tickets');
      }
      
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/generate-ticket/preview`,
        params,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta generoida tikettejä');
      } else {
        toast.error('Tiketin esikatselu epäonnistui');
      }
      console.error('Error generating ticket preview:', error);
    },
  });
};

// Hook for confirming ticket creation
export const useConfirmTicketCreation = () => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const canGenerateTickets = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useMutation({
    mutationFn: async (ticketData) => {
      if (!canGenerateTickets) {
        throw new Error('No permission to create tickets');
      }
      
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/generate-ticket/confirm`,
        ticketData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate tickets list
      queryClient.invalidateQueries(['tickets']);
      toast.success(`Tiketti #${data.ticketNumber} luotu onnistuneesti`);
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta luoda tikettejä');
      } else {
        toast.error('Tiketin luonti epäonnistui');
      }
      console.error('Error creating ticket:', error);
    },
  });
};

// Hook for rerolling ticket generation
export const useRerollTicket = () => {
  const { userRole } = useAuth();
  const canGenerateTickets = userRole === 'ADMIN' || userRole === 'SUPPORT';

  return useMutation({
    mutationFn: async (params) => {
      if (!canGenerateTickets) {
        throw new Error('No permission to reroll tickets');
      }
      
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/generate-ticket/reroll`,
        params,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta generoida tikettejä');
      } else {
        toast.error('Uudelleengenerointi epäonnistui');
      }
      console.error('Error rerolling ticket:', error);
    },
  });
};