import axios from 'axios'
import { authService } from '../services/authService'

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL
})

// Lisätään token jokaiseen pyyntöön
api.interceptors.request.use(async (config) => {
  try {
    const token = await authService.acquireToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error adding auth token to request:', error);
    // Jos token-virhe, ohjataan käyttäjä kirjautumaan uudelleen
    await authService.login();
    throw error;
  }
});

// Handle 401 responses globally - user not authorized by backend
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.error('Backend rejected authentication - user not authorized');
      
      // Only show alert once per session
      const alertShown = sessionStorage.getItem('authAlertShown');
      if (!alertShown) {
        sessionStorage.setItem('authAlertShown', 'true');
        alert('Access denied: Your account is not authorized to access this system. Please contact an administrator.');
      }
      
      // Force logout
      try {
        await authService.logout();
      } catch (logoutError) {
        console.error('Logout failed:', logoutError);
        // Force redirect to login page even if logout fails
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Prioriteetin muunnos numerosta enum-arvoksi
const mapPriorityToEnum = (priority) => {
  switch (priority) {
    case 1: return 'LOW'
    case 2: return 'MEDIUM'
    case 3: return 'HIGH'
    case 4: return 'CRITICAL'
    default: return 'MEDIUM'
  }
}

// Helper function to map content type to response format
const mapContentTypeToResponseFormat = (contentType) => {
  switch (contentType) {
    case 'text':
      return 'TEKSTI'
    case 'image':
      return 'KUVA'
    case 'video':
      return 'VIDEO'
    default:
      return 'TEKSTI'
  }
}

export const fetchTickets = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();

    const { data } = await api.get('/tickets', { params: filters });
    return data;
  } catch (error) {
    throw new Error('Tikettien haku epäonnistui');
  }
};

export const fetchCategories = async () => {
  try {
    const { data } = await api.get('/categories')
    // Backend returns { categories: [...] }
    return data.categories || []
  } catch (error) {
    throw new Error('Kategorioiden haku epäonnistui')
  }
}

export const createTicket = async (ticketData) => {
  // For file uploads, we need to use FormData
  const formData = new FormData();
  
  // Add the basic ticket data
  formData.append('title', ticketData.subject);
  formData.append('description', ticketData.description);
  formData.append('device', ticketData.device || '');
  formData.append('additionalInfo', ticketData.additionalInfo || '');
  formData.append('priority', mapPriorityToEnum(ticketData.priority));
  formData.append('categoryId', ticketData.categoryId);
  formData.append('responseFormat', mapContentTypeToResponseFormat(ticketData.contentType));
  formData.append('userProfile', ticketData.userProfile || 'student');
  
  // Add any attachments if present
  if (ticketData.attachment && ticketData.attachment.length > 0) {
    ticketData.attachment.forEach(file => {
      formData.append('attachments', file);
    });
  }

  try {
    const { data } = await api.post('/tickets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin luonti epäonnistui');
    }
    throw new Error('Tiketin luonti epäonnistui');
  }
};

export const updateTicket = async (id, ticketData) => {
  // Jos päivityksessä on prioriteetti, muunnetaan se
  const transformedData = {
    ...ticketData,
    priority: ticketData.priority ? mapPriorityToEnum(ticketData.priority) : undefined
  };

  try {
    const { data } = await api.put(`/tickets/${id}`, transformedData)
    return data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin päivitys epäonnistui')
    }
    throw new Error('Tiketin päivitys epäonnistui')
  }
}

export const deleteTicket = async (id) => {
  try {
    const { data } = await api.delete(`/tickets/${id}`)
    return data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin poisto epäonnistui')
    }
    throw new Error('Tiketin poisto epäonnistui')
  }
}

// yksittäisen tiketin haku
export const fetchTicket = async (id) => {
  try {
    const { data } = await api.get(`/tickets/${id}`)
    return data
  } catch (error) {
    throw new Error('Tiketin haku epäonnistui')
  }
};

// Käyttäjän omien tikettien haku
export const fetchMyTickets = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const { data } = await api.get('/tickets/my-tickets', { params: filters });
    return data;
  } catch (error) {
    throw new Error('Tikettien haku epäonnistui');
  }
};

// Tiketin tilan päivitys (vain admin)
export const updateTicketStatus = async (id, status) => {
  try {
    const { data } = await api.put(`/tickets/${id}/status`, { status })
    return data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin tilan päivitys epäonnistui')
    }
    throw new Error('Tiketin tilan päivitys epäonnistui')
  }
}

// Tiketin käsittelijän asetus (vain admin)
export const assignTicket = async (id, assignedToId) => {
  try {
    const { data } = await api.put(`/tickets/${id}/assign`, { assignedToId })
    return data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin käsittelijän asetus epäonnistui')
    }
    throw new Error('Tiketin käsittelijän asetus epäonnistui')
  }
}

// Kommentin lisääminen tikettiin
export const addComment = async (ticketId, content) => {
  try {
    const { data } = await api.post(`/tickets/${ticketId}/comments`, { content })
    return data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Kommentin lisääminen epäonnistui')
    }
    throw new Error('Kommentin lisääminen epäonnistui')
  }
}

// Mediasisältöisen kommentin lisääminen tikettiin (kuva tai video)
export const addMediaComment = async (ticketId, formData) => {
  try {
    const token = await authService.acquireToken()
    const { data } = await axios.post(
      `${API_BASE_URL}/tickets/${ticketId}/comments/media`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      }
    )
    return data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Median lisääminen epäonnistui')
    }
    throw new Error('Median lisääminen epäonnistui')
  }
}

// Ota tiketti käsittelyyn
export const takeTicketIntoProcessing = async (ticketId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/take`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await authService.acquireToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to take ticket into processing');
    }

    return response.json();
  } catch (error) {
    console.error('Error taking ticket into processing:', error);
    throw error;
  }
};

// Vapauta tiketti käsittelystä
export const releaseTicket = async (ticketId) => {
  try {
    const { data } = await api.put(`/tickets/${ticketId}/release`);
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin vapauttaminen epäonnistui');
    }
    throw new Error('Tiketin vapauttaminen epäonnistui');
  }
};

// Siirrä tiketti toiselle tukihenkilölle
export const transferTicket = async (ticketId, targetUserId) => {
  try {
    const { data } = await api.put(`/tickets/${ticketId}/transfer`, { targetUserId });
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin siirtäminen epäonnistui');
    }
    throw new Error('Tiketin siirtäminen epäonnistui');
  }
};

// Päivitä tiketin tila
export const updateTicketStatusWithComment = async (ticketId, status) => {
  try {
    const { data } = await api.put(`/tickets/${ticketId}/status`, { status });
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Tiketin tilan päivitys epäonnistui');
    }
    throw new Error('Tiketin tilan päivitys epäonnistui');
  }
};

// Hae tukihenkilöt
export const fetchSupportUsers = async () => {
  try {
    const response = await api.get('/users/support');
    return response.data;
  } catch (error) {
    throw new Error('Tukihenkilöiden hakeminen epäonnistui');
  }
};

// Notification API calls
export const getNotifications = async () => {
  try {
    const { data } = await api.get('/notifications');
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to fetch notifications');
    }
    throw new Error('Failed to fetch notifications');
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const { data } = await api.get('/notifications/unread/count');
    return data.count;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to fetch unread count');
    }
    throw new Error('Failed to fetch unread count');
  }
};

export const markNotificationAsRead = async (id) => {
  try {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to mark notification as read');
    }
    throw new Error('Failed to mark notification as read');
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const { data } = await api.put('/notifications/read/all');
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to mark all notifications as read');
    }
    throw new Error('Failed to mark all notifications as read');
  }
};

export const deleteNotification = async (id) => {
  try {
    const { data } = await api.delete(`/notifications/${id}`);
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to delete notification');
    }
    throw new Error('Failed to delete notification');
  }
};

// Notification settings API calls
export const getNotificationSettings = async () => {
  try {
    const { data } = await api.get('/notification-settings');
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to fetch notification settings');
    }
    throw new Error('Failed to fetch notification settings');
  }
};

export const updateNotificationSettings = async (settings) => {
  try {
    const { data } = await api.put('/notification-settings', settings);
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to update notification settings');
    }
    throw new Error('Failed to update notification settings');
  }
};