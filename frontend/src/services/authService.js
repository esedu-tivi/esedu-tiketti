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

    const userData = {
      email: account.username,
      name: `${account.name}`,
    };

    try {
      // Tarkista onko käyttäjä jo olemassa ja luo uusi jos ei ole
      await axios.post(`${API_BASE_URL}/auth/login`, userData);
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw error;
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
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          await this.ensureInitialized();
          const response = await this.msalInstance.acquireTokenRedirect(loginRequest);
          return response.accessToken;
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