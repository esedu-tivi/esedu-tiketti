import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './providers/AuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Data is fresh for 30 seconds (better for real-time)
      cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: true, // DO refetch on window focus for fresh data
      refetchOnReconnect: 'always', // Refetch on reconnect
      retry: 1, // Only retry failed requests once
      retryDelay: 1000, // Wait 1 second before retry
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
})

// Make queryClient available globally for AuthProvider
window.__REACT_QUERY_CLIENT__ = queryClient;

// Only use StrictMode in development to catch issues, not in production
const AppWrapper = ({ children }) => {
  if (import.meta.env.MODE === 'development') {
    return <React.StrictMode>{children}</React.StrictMode>;
  }
  return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppWrapper>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </AppWrapper>,
) 