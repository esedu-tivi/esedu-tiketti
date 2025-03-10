import { authService } from './authService';
import axios from 'axios';

class UserService {
  constructor() {
    this.graphEndpoint = 'https://graph.microsoft.com/v1.0';
    this.profileCache = new Map(); // Cache profile pictures to avoid repeated requests
    this.currentUserEmail = null;
  }

  /**
   * Gets the Microsoft Graph API access token with the appropriate scopes
   */
  async getGraphToken() {
    try {
      const account = await authService.getActiveAccount();
      if (account) {
        this.currentUserEmail = account.username;
      }
      
      const token = await authService.msalInstance.acquireTokenSilent({
        scopes: ['User.Read'], // Only requesting access to current user's info
        account: account,
      });
      return token.accessToken;
    } catch (error) {
      console.error('Error acquiring Graph token:', error);
      return null;
    }
  }

  /**
   * Converts an ArrayBuffer to a base64 string
   * @param {ArrayBuffer} buffer - The array buffer to convert
   * @returns {string} - The base64 string
   */
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Fetches the user's profile picture
   * For the current user: try to get it from Microsoft Graph API and cache it on the backend
   * For other users: try to get it from the backend cache
   * 
   * @param {string} userEmail - The email of the user
   * @returns {Promise<string>} - The profile picture URL or null
   */
  async getUserProfilePicture(userEmail) {
    // Return from cache if available
    if (this.profileCache.has(userEmail)) {
      return this.profileCache.get(userEmail);
    }

    try {
      // First try to get the profile picture from our backend cache
      const token = await authService.acquireToken();
      const apiUrl = import.meta.env.VITE_API_URL;
      
      try {
        const response = await axios.get(
          `${apiUrl}/users/profile-picture/by-email/${encodeURIComponent(userEmail)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        const profilePicture = response.data.profilePicture;
        this.profileCache.set(userEmail, profilePicture);
        return profilePicture;
      } catch (error) {
        // If we get a 404, that means the user doesn't have a profile picture in our backend cache
        // If this is the current user, fetch from Microsoft Graph and cache it
        if (userEmail === this.currentUserEmail) {
          return this.updateProfilePictureFromMicrosoft();
        } else {
          // For other users, just return null - we can't fetch their Microsoft photos directly
          this.profileCache.set(userEmail, null);
          return null;
        }
      }
    } catch (error) {
      console.error('Error in getUserProfilePicture:', error);
      this.profileCache.set(userEmail, null);
      return null;
    }
  }
  
  /**
   * Fetches and updates the current user's profile picture from Microsoft Graph API
   * Also caches it on the backend for other users to see
   * If a profile picture already exists in the backend, it will be returned without fetching from Microsoft
   * @param {boolean} forceRefresh - Whether to force a refresh from Microsoft even if a cached version exists
   * @returns {Promise<string>} - The profile picture URL or null
   */
  async updateProfilePictureFromMicrosoft(forceRefresh = false) {
    try {
      // First check if we already have a profile picture in our backend
      if (!forceRefresh) {
        try {
          const backendToken = await authService.acquireToken();
          const apiUrl = import.meta.env.VITE_API_URL;
          
          const response = await axios.get(
            `${apiUrl}/users/profile-picture/by-email/${encodeURIComponent(this.currentUserEmail)}`,
            {
              headers: {
                Authorization: `Bearer ${backendToken}`,
              },
            }
          );
          
          // If we successfully got a picture from the backend, use that
          if (response.data.profilePicture) {
            console.log('Using profile picture from backend cache');
            this.profileCache.set(this.currentUserEmail, response.data.profilePicture);
            return response.data.profilePicture;
          }
        } catch (error) {
          // If we get an error, continue to fetch from Microsoft
          console.log('No cached profile picture found, fetching from Microsoft');
        }
      }
      
      // Get Microsoft Graph access token
      const graphToken = await this.getGraphToken();
      if (!graphToken) {
        this.profileCache.set(this.currentUserEmail, null);
        return null;
      }
      
      // Get backend access token
      const backendToken = await authService.acquireToken();
      const apiUrl = import.meta.env.VITE_API_URL;

      // Send the Microsoft Graph token to our backend to fetch and cache the profile picture
      const response = await axios.post(
        `${apiUrl}/users/profile-picture/microsoft`,
        { graphAccessToken: graphToken },
        {
          headers: {
            Authorization: `Bearer ${backendToken}`,
          },
        }
      );
      
      // If we got a profile picture, cache and return it
      if (response.data.profilePicture) {
        this.profileCache.set(this.currentUserEmail, response.data.profilePicture);
        return response.data.profilePicture;
      }
      
      // No profile picture available
      this.profileCache.set(this.currentUserEmail, null);
      return null;
    } catch (error) {
      console.error('Error in updateProfilePictureFromMicrosoft:', error);
      this.profileCache.set(this.currentUserEmail, null);
      return null;
    }
  }

  /**
   * Uploads a profile picture to the backend
   * @param {File} file - The image file to upload
   * @returns {Promise<Object>} - Response with the profile picture URL
   */
  async uploadProfilePicture(file) {
    try {
      const token = await authService.acquireToken();
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const formData = new FormData();
      formData.append('media', file);
      
      const response = await axios.post(
        `${apiUrl}/users/profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Clear the cache for the current user
      if (this.currentUserEmail) {
        this.profileCache.delete(this.currentUserEmail);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }

  /**
   * Generates initials from a user's name
   * @param {string} name - The user's full name
   * @returns {string} - The user's initials
   */
  getUserInitials(name) {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Clears the profile picture cache
   */
  clearProfileCache() {
    this.profileCache.clear();
  }
}

export const userService = new UserService();
export default userService; 