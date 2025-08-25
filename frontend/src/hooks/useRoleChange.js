import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

// Hook for changing user role (development only)
export const useRoleChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRole) => {
      const token = await authService.acquireToken();
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/users/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate user data and reload
      queryClient.invalidateQueries(['user']);
      toast.success('Rooli vaihdettu onnistuneesti');
      // Reload to refresh all role-based UI
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      console.error('Error changing role:', error);
      toast.error('Roolin vaihto epäonnistui');
    },
  });
};

// Hook for updating another user's role (admin only)
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const token = await authService.acquireToken();
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/users/${userId}/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries(['users']);
      toast.success('Käyttäjän rooli päivitetty');
    },
    onError: (error) => {
      console.error('Error updating user role:', error);
      toast.error('Roolin päivitys epäonnistui');
    },
  });
};