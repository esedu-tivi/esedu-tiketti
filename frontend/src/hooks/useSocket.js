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
      console.log('Reusing existing socket connection');
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
        console.log('Creating new socket connection');
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
          
          // Remove all existing listeners before re-subscribing
          socketInstance.removeAllListeners();
          
          // Re-subscribe all listeners after reconnection
          subscribersRef.current.forEach((callbacks, event) => {
            console.log(`Re-subscribing to event: ${event}`);
            callbacks.forEach(callback => {
              const wrappedCallback = (data) => {
                console.log(`Received ${event} event:`, data);
                callback(data);
              };
              socketInstance.on(event, wrappedCallback);
            });
          });
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
          console.log('Received pong from server');
        });

        // Debug all incoming events
        socketInstance.onAny((eventName, ...args) => {
          console.log(`Received event ${eventName}:`, args);
        });
      }

      return socketInstance;

    } catch (error) {
      console.error('Error in socket connection:', error);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      console.log('Disconnecting socket');
      // Remove all listeners for this instance
      subscribersRef.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          socketInstance.off(event, callback);
        });
      });
      subscribersRef.current.clear();
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const subscribe = useCallback(async (event, callback) => {
    console.log(`Subscribing to event: ${event}`);
    
    const socket = await connect();
    if (!socket) {
      console.error('Failed to connect socket');
      return () => {
        console.log('No cleanup needed - connection failed');
      };
    }

    // Remove existing listeners for this event
    socket.removeAllListeners(event);

    // Store callback in subscribers map
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    } else {
      // Clear existing callbacks for this event
      subscribersRef.current.get(event).clear();
    }
    subscribersRef.current.get(event).add(callback);

    // Add listener to socket with debug wrapper
    const wrappedCallback = (data) => {
      console.log(`Received ${event} event with data:`, data);
      callback(data);
    };
    
    socket.on(event, wrappedCallback);

    // Return cleanup function
    return () => {
      console.log(`Unsubscribing from event: ${event}`);
      // Remove callback from subscribers map
      const callbacks = subscribersRef.current.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscribersRef.current.delete(event);
        }
      }
      // Remove listener from socket if it exists
      if (socket) {
        socket.off(event, wrappedCallback);
      }
    };
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { subscribe };
}; 