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

export const supportAssistantService = {
  // Get conversation history between student and support assistant
  async getConversationHistory(ticketId, supportUserId) {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/support-assistant/history/${supportUserId}`);
    return response.data;
  },

  // Clear conversation history between student and support assistant
  async clearConversationHistory(ticketId, supportUserId) {
    const api = await createAuthenticatedInstance();
    const response = await api.delete(`${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/support-assistant/history/${supportUserId}`);
    return response.data;
  },

  // Send a message to the support assistant
  async sendMessage(ticketId, supportQuestion, supportUserId) {
    const api = await createAuthenticatedInstance();
    const response = await api.post(
      `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/support-assistant`,
      { supportQuestion, supportUserId }
    );
    return response.data;
  }
}; 