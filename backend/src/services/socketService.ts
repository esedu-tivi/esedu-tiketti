import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: string;
  email: string;
}

class SocketService {
  private io: Server;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 30000,
      pingInterval: 25000,
      transports: ['websocket']
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          console.error('No token provided');
          return next(new Error('Authentication error'));
        }

        try {
          // Decode token to get user info (MSAL token)
          const decoded = jwt.decode(token) as any;
          console.log('Decoded token:', {
            upn: decoded?.upn,
            unique_name: decoded?.unique_name,
            hasToken: !!token,
            tokenLength: token.length
          });

          // Check for email in upn or unique_name fields
          const userEmail = decoded?.upn || decoded?.unique_name;

          if (!decoded || !userEmail) {
            console.error('Invalid token structure:', decoded);
            return next(new Error('Invalid token'));
          }

          socket.data.user = {
            email: userEmail
          };

          next();
        } catch (decodeError) {
          console.error('Token decode error:', decodeError);
          return next(new Error('Invalid token'));
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.data.user?.email);

      // Store socket connection
      const userEmail = socket.data.user?.email;
      if (userEmail) {
        const currentSockets = this.userSockets.get(userEmail) || [];
        this.userSockets.set(userEmail, [...currentSockets, socket.id]);
        console.log(`User ${userEmail} connected with socket ${socket.id}`);
        console.log('Current socket connections:', this.userSockets);
      }

      // Handle ping from client
      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.data.user?.email);
        if (userEmail) {
          const currentSockets = this.userSockets.get(userEmail) || [];
          const updatedSockets = currentSockets.filter(id => id !== socket.id);
          
          if (updatedSockets.length === 0) {
            this.userSockets.delete(userEmail);
          } else {
            this.userSockets.set(userEmail, updatedSockets);
          }
          
          console.log(`User ${userEmail} disconnected socket ${socket.id}`);
          console.log('Updated socket connections:', this.userSockets);
        }
      });
    });
  }

  // Send notification to specific user
  sendNotificationToUser(userEmail: string, notification: any) {
    console.log('SocketService: Attempting to send notification');
    console.log('User email:', userEmail);
    console.log('Notification:', notification);

    const socketIds = this.userSockets.get(userEmail);
    console.log('Found socket IDs for user:', socketIds);
    
    if (socketIds && socketIds.length > 0) {
      console.log('Active socket connections found:', socketIds.length);
      socketIds.forEach(socketId => {
        console.log('Emitting to socket:', socketId);
        this.io.to(socketId).emit('notification', {
          ...notification,
          timestamp: new Date().toISOString()
        });
        console.log('Notification emitted successfully');
      });
    } else {
      console.log('No active socket connections found for user');
    }
  }

  // Send notification to multiple users
  sendNotificationToUsers(userEmails: string[], notification: any) {
    console.log('Sending notification to multiple users:', userEmails);
    userEmails.forEach(email => this.sendNotificationToUser(email, notification));
  }

  // Broadcast notification to all connected users
  broadcastNotification(notification: any) {
    console.log('Broadcasting notification to all users');
    console.log('Notification data:', notification);
    this.io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Emit a new comment event to specific user sockets
  emitNewCommentToUser(userEmail: string, commentData: any) {
    const socketIds = this.userSockets.get(userEmail);
    if (socketIds && socketIds.length > 0) {
      console.log(`[SocketService] Emitting newComment event to user ${userEmail} on sockets: ${socketIds.join(', ')}`);
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit('newComment', commentData);
      });
    } else {
      console.log(`[SocketService] No active sockets found for user ${userEmail} to send newComment.`);
    }
  }

  // Emit a typing status update event to specific user sockets
  emitTypingStatus(userEmail: string, typingStatus: { isTyping: boolean, ticketId: string }) {
    const socketIds = this.userSockets.get(userEmail);
    if (socketIds && socketIds.length > 0) {
      console.log(`[SocketService] Emitting updateTypingStatus (${typingStatus.isTyping}) for ticket ${typingStatus.ticketId} to user ${userEmail} on sockets: ${socketIds.join(', ')}`);
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit('updateTypingStatus', typingStatus);
      });
    } else {
      console.log(`[SocketService] No active sockets found for user ${userEmail} to send typing status.`);
    }
  }
}

let instance: SocketService | null = null;

export const initializeSocketService = (httpServer: HttpServer) => {
  instance = new SocketService(httpServer);
  return instance;
};

export const getSocketService = () => {
  if (!instance) {
    throw new Error('Socket service not initialized');
  }
  return instance;
}; 