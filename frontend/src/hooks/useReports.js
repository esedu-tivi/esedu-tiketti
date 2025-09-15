import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/authService';

// Create axios instance with auth
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await authService.acquireToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error adding auth token:', error);
    throw error;
  }
});

// Fetch categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch work report
export const useWorkReport = (filters) => {
  const { startDate, endDate, categoryId, priority } = filters;
  
  return useQuery({
    queryKey: ['work-report', startDate, endDate, categoryId, priority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (categoryId) params.append('categoryId', categoryId);
      if (priority) params.append('priority', priority);
      
      const response = await api.get(`/reports/my-work?${params}`);
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Export report mutation
export const useExportReport = () => {
  return useMutation({
    mutationFn: async ({ format, filters }) => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.priority) params.append('priority', filters.priority);
      
      let endpoint;
      let responseType = 'json';
      
      switch (format) {
        case 'pdf':
          endpoint = '/reports/export/pdf';
          responseType = 'blob';
          break;
        case 'csv':
          endpoint = '/reports/export/csv';
          responseType = 'blob';
          break;
        case 'json':
          endpoint = '/reports/export/json';
          responseType = 'json';
          break;
        default:
          throw new Error('Invalid export format');
      }
      
      const response = await api.get(`${endpoint}?${params}`, {
        responseType
      });
      
      if (format === 'json') {
        // For JSON, create a blob and download
        const jsonBlob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json'
        });
        return { blob: jsonBlob, format: 'json' };
      }
      
      return { blob: response.data, format };
    }
  });
};