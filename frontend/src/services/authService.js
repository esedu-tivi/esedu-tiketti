import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/msal';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

class AuthService {
  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
    this.isInitialized = false;
    this.initializePromise = null;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = (async () => {
      try {
        await this.msalInstance.initialize();
        const response = await this.msalInstance.handleRedirectPromise();
        if (response) {
          await this.handleAuthenticationSuccess(response.account);
        }
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize MSAL:', error);
        throw error;
      }
    })();

    return this.initializePromise;
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async login() {
    try {
      await this.ensureInitialized();
      await this.msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.ensureInitialized();
      await this.msalInstance.logoutRedirect();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async getActiveAccount() {
    await this.ensureInitialized();
    const activeAccount = this.msalInstance.getActiveAccount();
    if (!activeAccount && this.msalInstance.getAllAccounts().length > 0) {
      this.msalInstance.setActiveAccount(this.msalInstance.getAllAccounts()[0]);
      return this.msalInstance.getAllAccounts()[0];
    }
    return activeAccount;
  }

  async handleAuthenticationSuccess(account) {
    if (!account) return;

    console.log('Handling user account:', account);

    const userData = {
      email: account.username,
      name: `${account.name}`,
      jobTitle: account.idTokenClaims?.jobTitle || null,
    };

    console.log('Calling /auth/login with userData:', userData);
    
    try {
      // Tarkista onko käyttäjä jo olemassa ja luo uusi jos ei ole
      const token = await this.acquireToken();
      const response = await axios.post(`${API_BASE_URL}/auth/login`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Login successful, user created/updated:', response.data);
      
      // Return the user data from login response - no need for separate /me call
      return response.data;
      
    } catch (error) {
      console.error('Error syncing user data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // If user is not authorized (401), immediately reject and logout
      if (error.response?.status === 401) {
        console.error('User not authorized - rejecting login immediately');
        alert('Access denied: Your account is not authorized to access this system. Please contact an administrator.');
        
        // Clear any stored auth data
        sessionStorage.clear();
        localStorage.removeItem('lastProfilePictureRefresh');
        
        // Force logout
        try {
          await this.msalInstance.logoutRedirect();
        } catch (logoutError) {
          console.error('Logout failed:', logoutError);
          window.location.href = '/login';
        }
        
        // Throw error to stop further processing
        throw new Error('User not authorized');
      }
      
      // For other errors, don't throw - let the user continue
      // The /me endpoint will handle user creation as a fallback
    }
  }

  async acquireToken() {
    try {
      await this.ensureInitialized();
      const account = await this.getActiveAccount();
      if (!account) {
        throw new Error('No active account');
      }

      const response = await this.msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      // Use idToken instead of accessToken - it has the correct audience for our backend
      return response.idToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          await this.ensureInitialized();
          const response = await this.msalInstance.acquireTokenRedirect(loginRequest);
          // Use idToken for redirect flow as well
          return response.idToken;
        } catch (err) {
          console.error('Error acquiring token:', err);
          throw err;
        }
      }
      console.error('Error acquiring token silently:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService; 