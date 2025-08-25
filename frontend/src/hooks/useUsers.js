import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/authService';
import { useAuth } from '../providers/AuthProvider';

// Helper hook to check if user can access users list
export const useCanAccessUsers = () => {
  const { userRole } = useAuth();
  return userRole === 'ADMIN' || userRole === 'SUPPORT';
};

// Centralized hook for users list
export const useUsers = () => {
  const { userRole } = useAuth();
  const canFetchUsers = useCanAccessUsers();
  
  // Always call useQuery to respect React hooks rules
  // But disable fetching for unauthorized users
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Handle both array response and object with users property
      const users = response.data.data || (Array.isArray(response.data) 
        ? response.data 
        : (response.data.users || []));
      
      return users;
    },
    enabled: canFetchUsers, // Only fetch if user has permission
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: [], // Always return empty array as placeholder
  });
};