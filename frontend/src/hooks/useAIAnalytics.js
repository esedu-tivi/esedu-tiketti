import { useQuery } from '@tanstack/react-query';
import { aiAnalyticsService } from '../services/aiAnalyticsService';
import { useAuth } from '../providers/AuthProvider';

// Hook for AI analytics dashboard data
export const useAIAnalytics = () => {
  const { userRole } = useAuth();
  
  // Only admins can access AI analytics
  const canAccessAnalytics = userRole === 'ADMIN';

  return useQuery({
    queryKey: ['ai-analytics', 'overall-stats'],
    queryFn: async () => {
      return await aiAnalyticsService.getOverallStats();
    },
    enabled: canAccessAnalytics,
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
    cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        console.debug('User does not have permission to access AI analytics');
        return;
      }
      console.error('Error fetching AI analytics:', error);
    },
  });
};

// Hook for AI usage stats by date range
export const useAIUsageStats = (startDate, endDate) => {
  const { userRole } = useAuth();
  const canAccessAnalytics = userRole === 'ADMIN';

  return useQuery({
    queryKey: ['ai-analytics', 'usage-stats', startDate, endDate],
    queryFn: async () => {
      return await aiAnalyticsService.getUsageStats(startDate, endDate);
    },
    enabled: canAccessAnalytics && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
};

// Hook for agent performance data
export const useAgentPerformance = (agentType) => {
  const { userRole } = useAuth();
  const canAccessAnalytics = userRole === 'ADMIN';

  return useQuery({
    queryKey: ['ai-analytics', 'agent-performance', agentType],
    queryFn: async () => {
      return await aiAnalyticsService.getAgentPerformance(agentType);
    },
    enabled: canAccessAnalytics && !!agentType,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
};

// Hook for conversation success metrics
export const useConversationMetrics = () => {
  const { userRole } = useAuth();
  const canAccessAnalytics = userRole === 'ADMIN';

  return useQuery({
    queryKey: ['ai-analytics', 'conversation-metrics'],
    queryFn: async () => {
      return await aiAnalyticsService.getConversationMetrics();
    },
    enabled: canAccessAnalytics,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
};