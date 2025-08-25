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
      
      // Check if we already have cached data from React Query
      const queryClient = window.__REACT_QUERY_CLIENT__;
      const cachedData = queryClient?.getQueryData(['user', 'me']);
      
      if (cachedData) {
        console.log('Using cached user data from React Query');
        setUserRole(cachedData.role);
        setUser(prevUser => ({
          ...prevUser,
          id: cachedData.id,
          email: cachedData.email,
          name: cachedData.name
        }));
        return cachedData.role;
      }
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const userData = response.data.data || response.data;
      console.log('Received user data:', userData);
      
      // Cache the data in React Query
      if (queryClient) {
        queryClient.setQueryData(['user', 'me'], userData);
      }
      
      setUserRole(userData.role);
      setUser(prevUser => ({
        ...prevUser,
        id: userData.id,
        email: userData.email,
        name: userData.name
      }));
      return userData.role;
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      
      // If backend rejects the user (401), log them out immediately
      if (error.response?.status === 401) {
        console.error('User not authorized by backend, logging out');
        alert('Access denied: Your account is not authorized to access this system. Please contact an administrator.');
        // Force logout
        try {
          await msalInstance.logoutRedirect();
        } catch (logoutError) {
          console.error('Logout failed:', logoutError);
          // Force redirect to login page even if logout fails
          window.location.href = '/login';
        }
        return null;
      }
      
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
        const userData = await authService.handleAuthenticationSuccess(account);
        // If handleAuthenticationSuccess returns user data, use it directly
        if (userData?.data || userData?.user) {
          const user = userData.data || userData.user || userData;
          setUserRole(user.role);
          setUser(prevUser => ({
            ...prevUser,
            id: user.id,
            email: user.email,
            name: user.name
          }));
          console.log('User role set from login response:', user.role);
        } else {
          // Fallback to fetching user role if login didn't return complete data
          const role = await fetchUserRole(account.username);
          console.log('User role set from /me endpoint:', role);
        }

        // Check if we should refresh the profile picture from Microsoft
        const lastRefresh = localStorage.getItem('lastProfilePictureRefresh');
        const now = Date.now();
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        // Refresh if:
        // 1. We've never refreshed before or
        // 2. It's been more than a week since the last refresh
        if (!lastRefresh || (now - parseInt(lastRefresh, 10)) > oneWeekInMs) {
          console.log('Fetching profile picture from Microsoft during login');
          await userService.updateProfilePictureFromMicrosoft(true); // Force refresh from Microsoft
          localStorage.setItem('lastProfilePictureRefresh', now.toString());
        } else {
          // Just load from backend cache
          console.log('Using cached profile picture from backend');
          await userService.updateProfilePictureFromMicrosoft(false); // Don't force refresh
        }
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