import axios from 'axios';
import { authService } from './authService';

// Create an axios instance with auth header
const createAuthenticatedInstance = async () => {
  const token = await authService.acquireToken();
  return axios.create({
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

export const aiAnalyticsService = {
  // Get all dashboard data in a single request
  async getDashboardData(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/dashboard?range=${range}`);
    return response.data;
  },

  // Get usage statistics
  async getUsageStats(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/usage?range=${range}`);
    return response.data;
  },

  // Get category distribution
  async getCategoryStats(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/categories?range=${range}`);
    return response.data;
  },

  // Get agent usage statistics
  async getAgentUsageStats(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/agents?range=${range}`);
    return response.data;
  },

  // Get response time statistics
  async getResponseTimeStats(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/response-times?range=${range}`);
    return response.data;
  },

  // Get resolution time comparison
  async getResolutionTimeComparison(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/resolution-times?range=${range}`);
    return response.data;
  },

  // Get overall statistics
  async getOverallStats(range = '14d') {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/overall?range=${range}`);
    return response.data;
  },

  // Track a new AI assistant interaction
  async trackInteraction(data) {
    const api = await createAuthenticatedInstance();
    const response = await api.post('/api/ai-analytics/interactions', data);
    return response.data;
  },

  // Submit feedback for an interaction
  async submitFeedback(interactionId, data) {
    const api = await createAuthenticatedInstance();
    const response = await api.post(`/api/ai-analytics/interactions/${interactionId}/feedback`, data);
    return response.data;
  },

  // Get detailed statistics for a specific agent
  async getAgentDetails(agentId, range = '14d') {
    if (!agentId) {
      throw new Error('Agent ID is required for getAgentDetails');
    }
    
    // Ensure the agentId is properly URL encoded to handle special characters
    const encodedAgentId = encodeURIComponent(agentId);
    
    const api = await createAuthenticatedInstance();
    const response = await api.get(`/api/ai-analytics/agents/${encodedAgentId}/details?range=${range}`);
    return response.data;
  }
}; 