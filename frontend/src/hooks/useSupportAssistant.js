import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportAssistantService } from '../services/supportAssistantService';
import { useAuth } from '../providers/AuthProvider';
import toast from 'react-hot-toast';

// Hook for support assistant question
export const useSupportAssistantQuestion = () => {
  const { userRole } = useAuth();
  const canUseAssistant = userRole === 'SUPPORT' || userRole === 'ADMIN';

  return useMutation({
    mutationFn: async ({ question, ticketContext }) => {
      if (!canUseAssistant) {
        throw new Error('No permission to use support assistant');
      }
      
      return await supportAssistantService.askQuestion(question, ticketContext);
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta käyttää tukiassistenttia');
      } else {
        toast.error('Kysymyksen käsittely epäonnistui');
      }
      console.error('Error with support assistant:', error);
    },
  });
};

// Hook for support assistant history
export const useSupportAssistantHistory = (ticketId) => {
  const { userRole } = useAuth();
  const canViewHistory = userRole === 'SUPPORT' || userRole === 'ADMIN';

  return useQuery({
    queryKey: ['support-assistant-history', ticketId],
    queryFn: async () => {
      return await supportAssistantService.getHistory(ticketId);
    },
    enabled: canViewHistory && !!ticketId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        console.debug('User does not have permission to view assistant history');
        return;
      }
      console.error('Error fetching assistant history:', error);
    },
  });
};

// Hook for support assistant feedback
export const useSupportAssistantFeedback = () => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const canProvideFeedback = userRole === 'SUPPORT' || userRole === 'ADMIN';

  return useMutation({
    mutationFn: async ({ interactionId, feedback }) => {
      if (!canProvideFeedback) {
        throw new Error('No permission to provide feedback');
      }
      
      return await supportAssistantService.provideFeedback(interactionId, feedback);
    },
    onSuccess: (data, variables) => {
      // Invalidate history if we have a ticket ID
      if (variables.ticketId) {
        queryClient.invalidateQueries(['support-assistant-history', variables.ticketId]);
      }
      toast.success('Palaute lähetetty');
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta antaa palautetta');
      } else {
        toast.error('Palautteen lähetys epäonnistui');
      }
      console.error('Error providing feedback:', error);
    },
  });
};

// Hook for streaming support assistant response
// Note: This returns a function, not a query, because streaming can't use React Query
export const useSupportAssistantStream = () => {
  const { userRole } = useAuth();
  const canUseAssistant = userRole === 'SUPPORT' || userRole === 'ADMIN';

  const streamQuestion = async (question, ticketContext, onChunk, onComplete, onError) => {
    if (!canUseAssistant) {
      onError(new Error('No permission to use support assistant'));
      return;
    }

    try {
      await supportAssistantService.streamQuestion(
        question,
        ticketContext,
        onChunk,
        onComplete,
        onError
      );
    } catch (error) {
      if (error?.response?.status === 403) {
        toast.error('Sinulla ei ole oikeutta käyttää tukiassistenttia');
      }
      onError(error);
    }
  };

  return { streamQuestion, canUseAssistant };
};