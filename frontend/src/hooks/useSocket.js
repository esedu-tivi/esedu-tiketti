import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { authService } from '../services/authService';

// Singleton instance for socket
let socketInstance = null;

export const useSocket = () => {
  const subscribersRef = useRef(new Map());
  const pingIntervalRef = useRef(null);

  const connect = useCallback(async () => {
    if (socketInstance?.connected) {
      // Socket already connected, reuse it
      return socketInstance;
    }

    try {
      const token = await authService.acquireToken();
      if (!token) {
        console.error('No token available');
        return null;
      }

      const baseUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : 'http://localhost:3001';

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');

      // Create new socket instance only if it doesn't exist
      if (!socketInstance) {
        socketInstance = io(baseUrl, {
          auth: { token: cleanToken },
          transports: ['websocket'],
          path: '/socket.io/',
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          withCredentials: true
        });

        socketInstance.on('connect', () => {
          console.log('Connected to WebSocket server');
          console.log('Socket ID:', socketInstance.id);
          // Socket.IO automatically re-subscribes to events on reconnection
          // so we don't need to manually re-subscribe
        });

        socketInstance.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          console.log('Connection details:', {
            baseUrl,
            token: cleanToken ? 'Present' : 'Missing',
            tokenLength: cleanToken ? cleanToken.length : 0
          });
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Disconnected from WebSocket server:', reason);
        });

        // Add ping/pong to keep connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        pingIntervalRef.current = setInterval(() => {
          if (socketInstance?.connected) {
            socketInstance.emit('ping');
          }
        }, 25000);

        socketInstance.on('pong', () => {
          // Server is alive, no need to log every pong
        });

        // Debug only important incoming events
        socketInstance.onAny((eventName, ...args) => {
          if (eventName === 'ticketCreated' || eventName === 'ticketDeleted' || eventName === 'error') {
            console.log(`Received event ${eventName}:`, args);
          }
        });
      }

      return socketInstance;

    } catch (error) {
      console.error('Error in socket connection:', error);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    // Don't actually disconnect the socket - just clean up references
    // The socket should stay connected as it's a singleton
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const subscribe = useCallback(async (event, callback) => {
    const socket = await connect();
    if (!socket) {
      console.error('Failed to connect socket');
      return () => {
        console.log('No cleanup needed - connection failed');
      };
    }

    // Create a unique key for this subscription
    const subscriptionKey = `${event}_${callback.toString().substring(0, 50)}`;
    
    // Check if we already have this exact subscription
    if (subscribersRef.current.has(subscriptionKey)) {
      // Already subscribed, return existing cleanup
      return subscribersRef.current.get(subscriptionKey);
    }

    // Add listener to socket
    const wrappedCallback = (data) => {
      // Only log important events, not every single one
      if (event === 'ticketCreated' || event === 'ticketDeleted') {
        console.log(`Received ${event} event`);
      }
      callback(data);
    };
    
    socket.on(event, wrappedCallback);

    // Create and store cleanup function
    const cleanup = () => {
      subscribersRef.current.delete(subscriptionKey);
      if (socket) {
        socket.off(event, wrappedCallback);
      }
    };
    
    // Store the cleanup function
    subscribersRef.current.set(subscriptionKey, cleanup);

    return cleanup;
  }, [connect]);

  // Initialize socket connection when first used
  // No need to disconnect on unmount since it's a singleton
  
  return { subscribe };
}; 