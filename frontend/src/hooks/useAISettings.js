import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/authService';
import { useAuth } from '../providers/AuthProvider';
import toast from 'react-hot-toast';

// Centralized hook for AI settings
export const useAISettings = () => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  
  // Only admins can access AI settings
  const canAccessSettings = userRole === 'ADMIN';

  const settingsQuery = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/ai/settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    },
    enabled: canAccessSettings,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
    onError: (error) => {
      if (error?.response?.status === 403) {
        console.debug('User does not have permission to access AI settings');
        return;
      }
      console.error('Error fetching AI settings:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings) => {
      const token = await authService.acquireToken();
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/ai/settings`,
        newSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-settings'], data);
      toast.success('AI-asetukset päivitetty onnistuneesti');
    },
    onError: (error) => {
      toast.error('AI-asetusten päivitys epäonnistui');
      console.error('Failed to update AI settings:', error);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/settings/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-settings'], data);
      toast.success('AI-asetukset palautettu oletusarvoihin');
    },
    onError: (error) => {
      toast.error('Asetusten palautus epäonnistui');
      console.error('Failed to reset AI settings:', error);
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isLoading,
    resetSettings: resetMutation.mutate,
    isResetting: resetMutation.isLoading,
    refetch: settingsQuery.refetch,
  };
};