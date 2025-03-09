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
   * Fetches the user's profile picture from Microsoft Graph API
   * @param {string} userEmail - The email of the user
   * @returns {Promise<string>} - The profile picture URL as a base64 data URL or null
   */
  async getUserProfilePicture(userEmail) {
    // Return from cache if available
    if (this.profileCache.has(userEmail)) {
      return this.profileCache.get(userEmail);
    }

    // Only fetch profile picture for the current user to avoid permission issues
    if (userEmail !== this.currentUserEmail) {
      this.profileCache.set(userEmail, null);
      return null;
    }
    
    try {
      const token = await this.getGraphToken();
      if (!token) {
        this.profileCache.set(userEmail, null);
        return null;
      }
      
      try {
        // Use the /me endpoint which only works for the current user
        const response = await axios.get(
          `${this.graphEndpoint}/me/photo/$value`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            responseType: 'arraybuffer',
          }
        );
        
        // Convert arraybuffer to base64
        const base64 = this.arrayBufferToBase64(response.data);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        
        // Cache the result
        this.profileCache.set(userEmail, dataUrl);
        return dataUrl;
      } catch (error) {
        console.error('Error fetching profile picture:', error);
        // Cache null to avoid repeated failed requests
        this.profileCache.set(userEmail, null);
        return null;
      }
    } catch (error) {
      console.error('Error in getUserProfilePicture:', error);
      this.profileCache.set(userEmail, null);
      return null;
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