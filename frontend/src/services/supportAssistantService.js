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

  // Get feedback history for messages in a ticket
  async getFeedbackHistory(ticketId) {
    const api = await createAuthenticatedInstance();
    const response = await api.get(`${import.meta.env.VITE_API_URL}/ai-analytics/interactions/feedback/ticket/${ticketId}`);
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
  },

  // Send a message to the support assistant with streaming response
  async sendMessageStream(ticketId, supportQuestion, supportUserId, onChunk, onComplete, onError) {
    try {
      const token = await authService.acquireToken();
      
      if (!token) {
        throw new Error('Failed to acquire authentication token');
      }
      
      // Use fetch with ReadableStream for POST with auth
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/support-assistant/stream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ supportQuestion, supportUserId })
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please refresh and try again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.chunk) {
                fullResponse += data.chunk;
                onChunk(data.chunk);
              }
              
              if (data.done) {
                onComplete(fullResponse, data.interactionId);
              }
              
              if (data.error) {
                onError(new Error(data.error));
                reader.releaseLock();
                return;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
        
        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
      }
      
      reader.releaseLock();
      return fullResponse;
      
    } catch (error) {
      console.error('Streaming error:', error);
      onError(error);
      throw error;
    }
  }
}; 