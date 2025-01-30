import React, { createContext, useContext, useEffect, useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../config/msal';
import { authService } from '../services/authService';

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
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const handleUserAccount = async (account) => {
    if (account) {
      setUser(account);
      try {
        await authService.handleAuthenticationSuccess(account);
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
      await msalInstance.logoutRedirect();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const value = {
    user,
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