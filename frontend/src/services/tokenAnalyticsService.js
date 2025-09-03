import axios from 'axios';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create an axios instance with auth header
const createAuthenticatedInstance = async () => {
  const token = await authService.acquireToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

export const tokenAnalyticsService = {
  /**
   * Get comprehensive token analytics with filters
   */
  async getTokenAnalytics(params = {}) {
    const api = await createAuthenticatedInstance();
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.agentType) queryParams.append('agentType', params.agentType);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.ticketId) queryParams.append('ticketId', params.ticketId);
    
    const response = await api.get(`/ai/token-analytics?${queryParams}`);
    return response.data;
  },

  /**
   * Get daily token usage for charts
   */
  async getDailyTokenUsage(days = 30) {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/ai/token-analytics/daily?days=${days}`);
    return response.data;
  },

  /**
   * Get top users by token usage
   */
  async getTopUsersByTokenUsage(limit = 10) {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/ai/token-analytics/top-users?limit=${limit}`);
    return response.data;
  },

  /**
   * Get current month's summary with comparison
   */
  async getTokenUsageSummary() {
    const api = await createAuthenticatedInstance();
    const response = await api.get('/ai/token-analytics/summary');
    return response.data;
  }
};