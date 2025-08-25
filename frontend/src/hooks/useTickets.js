import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchTickets as getTickets, 
  fetchMyTickets as getMyTickets, 
  fetchTicket as getTicket, 
  createTicket, 
  updateTicket,
  deleteTicket 
} from '../utils/api';

// Hook for all tickets (admin/support view)
export const useAllTickets = (filters = {}) => {
  return useQuery({
    queryKey: ['tickets', 'all', filters],
    queryFn: () => getTickets(filters),
    staleTime: 30 * 1000, // Fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Hook for user's own tickets
export const useMyTickets = () => {
  return useQuery({
    queryKey: ['tickets', 'my'],
    queryFn: getMyTickets,
    staleTime: 30 * 1000, // Fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Hook for single ticket
export const useTicket = (ticketId) => {
  return useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: () => getTicket(ticketId),
    enabled: !!ticketId,
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

// Hook for ticket mutations
export const useTicketMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      // Invalidate all ticket lists
      queryClient.invalidateQueries(['tickets']);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateTicket(id, data),
    onSuccess: (data, variables) => {
      // Update specific ticket cache
      queryClient.setQueryData(['tickets', variables.id], data);
      // Invalidate lists
      queryClient.invalidateQueries(['tickets', 'all']);
      queryClient.invalidateQueries(['tickets', 'my']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
    },
  });

  return {
    createTicket: createMutation.mutate,
    updateTicket: updateMutation.mutate,
    deleteTicket: deleteMutation.mutate,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
};