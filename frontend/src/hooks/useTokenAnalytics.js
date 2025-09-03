import { useQuery } from '@tanstack/react-query';
import { tokenAnalyticsService } from '../services/tokenAnalyticsService';

export const useTokenAnalytics = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['tokenAnalytics', params],
    queryFn: () => tokenAnalyticsService.getTokenAnalytics(params),
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
    ...options
  });
};

export const useDailyTokenUsage = (days = 30, options = {}) => {
  return useQuery({
    queryKey: ['dailyTokenUsage', days],
    queryFn: () => tokenAnalyticsService.getDailyTokenUsage(days),
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
    ...options
  });
};

export const useTopUsersByTokenUsage = (limit = 10, options = {}) => {
  return useQuery({
    queryKey: ['topUsersByTokenUsage', limit],
    queryFn: () => tokenAnalyticsService.getTopUsersByTokenUsage(limit),
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
    ...options
  });
};

export const useTokenUsageSummary = (options = {}) => {
  return useQuery({
    queryKey: ['tokenUsageSummary'],
    queryFn: () => tokenAnalyticsService.getTokenUsageSummary(),
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
    ...options
  });
};