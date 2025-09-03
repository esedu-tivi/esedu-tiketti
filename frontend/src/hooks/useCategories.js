import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../utils/api';

// Centralized hook for categories to prevent duplicate API calls
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // Categories don't change often - fresh for 10 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch categories on window focus
  });
};