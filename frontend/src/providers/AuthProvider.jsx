import React, { createContext, useContext, useEffect, useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../config/msal';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Luodaan MSAL-instanssi
const msalInstance = new PublicClientApplication(msalConfig);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Haetaan käyttäjän rooli backendistä
  const fetchUserRole = async (email) => {
    try {
      console.log('Fetching user role for email:', email);
      const token = await authService.acquireToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Received user data:', response.data);
      setUserRole(response.data.role);
      setUser(prevUser => ({
        ...prevUser,
        id: response.data.id,
        email: response.data.email,
        name: response.data.name
      }));
      return response.data.role;
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      return null;
    }
  };

  const handleUserAccount = async (account) => {
    if (account) {
      console.log('Handling user account:', account);
      setUser(account);
      
      // Set the current user email in userService for profile picture fetching
      userService.currentUserEmail = account.username;
      
      try {
        await authService.handleAuthenticationSuccess(account);
        // Haetaan käyttäjän rooli kun käyttäjä on autentikoitu
        const role = await fetchUserRole(account.username);
        console.log('User role set to:', role);
      } catch (error) {
        console.error('Failed to sync user with backend:', error);
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();
        const response = await msalInstance.handleRedirectPromise();
        
        if (response) {
          await handleUserAccount(response.account);
        } else {
          const currentAccount = msalInstance.getAllAccounts()[0];
          if (currentAccount) {
            await handleUserAccount(currentAccount);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async () => {
    if (!initialized) {
      console.error('MSAL not initialized yet');
      return;
    }
    try {
      await msalInstance.loginRedirect();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!initialized) {
      console.error('MSAL not initialized yet');
      return;
    }
    try {
      // Clear profile picture cache before logout
      userService.clearProfileCache();
      userService.currentUserEmail = null;
      
      await msalInstance.logoutRedirect();
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    login,
    logout,
    loading,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <MsalProvider instance={msalInstance}>
        {children}
      </MsalProvider>
    </AuthContext.Provider>
  );
} 