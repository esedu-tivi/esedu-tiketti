import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getUnreadNotificationCount } from '../utils/api';

// Centralized hook for notifications to prevent duplicate API calls
export const useNotifications = () => {
  const queryClient = useQueryClient();
  
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  return {
    notifications: notificationsQuery.data || [],
    unreadCount: unreadCountQuery.data || 0,
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    refetch: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
    invalidate: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    }
  };
};