import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '../utils/logger.js';
import {
  verifyAzureToken,
  extractUser,
  decodeUnsafe,
  AUTH_VERIFY_MODE,
  TokenVerificationError
} from '../middleware/azureTokenVerifier.js';

interface SocketUser {
  id: string;
  email: string;
}

interface JWTPayload {
  preferred_username?: string;
  upn?: string;
  email?: string;
  unique_name?: string;
  name?: string;
  given_name?: string;
  oid?: string;
  sub?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  [key: string]: unknown;
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
          logger.error('No token provided');
          return next(new Error('Authentication error'));
        }

        try {
          // Sama tarkistus kuin HTTP-pyynnöissä (authMiddleware).
          // Aiemmin tässä vain purettiin token tarkistamatta allekirjoitusta,
          // jolloin WebSocket-yhteyden sai kenen tahansa nimissä.
          const payload = await verifyAzureToken(token);
          const user = extractUser(payload);

          socket.data.user = { email: user.email };

          logger.info('WebSocket authenticated for user:', user.email);
          next();
        } catch (verifyError) {
          const code = verifyError instanceof TokenVerificationError ? verifyError.code : 'UNKNOWN';
          const message = verifyError instanceof Error ? verifyError.message : String(verifyError);

          if (AUTH_VERIFY_MODE === 'warn') {
            const decoded = decodeUnsafe(token);
            const email =
              decoded?.preferred_username || decoded?.upn || decoded?.email || decoded?.unique_name;

            logger.warn(
              `⚠️  WebSocket token verification failed but WARN mode is active: ` +
                `${code} - ${message} [aud=${decoded?.aud}, iss=${decoded?.iss}, email=${email}]`,
              { code, reason: message, tokenAudience: decoded?.aud, tokenIssuer: decoded?.iss, email }
            );

            if (email) {
              socket.data.user = { email };
              return next();
            }
          }

          logger.warn(`WebSocket token verification failed: ${code} - ${message}`, { code, reason: message });
          return next(new Error('Invalid token'));
        }
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('Client connected:', socket.data.user?.email);

      // Store socket connection
      const userEmail = socket.data.user?.email;
      if (userEmail) {
        const currentSockets = this.userSockets.get(userEmail) || [];
        this.userSockets.set(userEmail, [...currentSockets, socket.id]);
        logger.info(`User ${userEmail} connected with socket ${socket.id}`);
        logger.debug('Current socket connections:', this.userSockets);
      }

      // Handle ping from client
      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected:', socket.data.user?.email);
        if (userEmail) {
          const currentSockets = this.userSockets.get(userEmail) || [];
          const updatedSockets = currentSockets.filter(id => id !== socket.id);
          
          if (updatedSockets.length === 0) {
            this.userSockets.delete(userEmail);
          } else {
            this.userSockets.set(userEmail, updatedSockets);
          }
          
          logger.info(`User ${userEmail} disconnected socket ${socket.id}`);
          logger.debug('Updated socket connections:', this.userSockets);
        }
      });
    });
  }

  // Send notification to specific user
  sendNotificationToUser(userEmail: string, notification: any) {
    logger.info('SocketService: Attempting to send notification');
    logger.info('User email:', userEmail);
    logger.info('Notification:', notification);

    const socketIds = this.userSockets.get(userEmail);
    logger.info('Found socket IDs for user:', socketIds);
    
    if (socketIds && socketIds.length > 0) {
      logger.info('Active socket connections found:', socketIds.length);
      socketIds.forEach(socketId => {
        logger.info('Emitting to socket:', socketId);
        this.io.to(socketId).emit('notification', {
          ...notification,
          timestamp: new Date().toISOString()
        });
        logger.info('Notification emitted successfully');
      });
    } else {
      logger.info('No active socket connections found for user');
    }
  }

  // Send notification to multiple users
  sendNotificationToUsers(userEmails: string[], notification: any) {
    logger.info('Sending notification to multiple users:', userEmails);
    userEmails.forEach(email => this.sendNotificationToUser(email, notification));
  }

  // Broadcast notification to all connected users
  broadcastNotification(notification: any) {
    logger.info('Broadcasting notification to all users');
    logger.info('Notification data:', notification);
    this.io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Emit a new comment event to specific user sockets
  emitNewCommentToUser(userEmail: string, commentData: any) {
    const socketIds = this.userSockets.get(userEmail);
    if (socketIds && socketIds.length > 0) {
      logger.info(`[SocketService] Emitting newComment event to user ${userEmail} on sockets: ${socketIds.join(', ')}`);
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit('newComment', commentData);
      });
    } else {
      logger.info(`[SocketService] No active sockets found for user ${userEmail} to send newComment.`);
    }
  }

  // Emit a typing status update event to specific user sockets
  emitTypingStatus(userEmail: string, typingStatus: { isTyping: boolean, ticketId: string }) {
    const socketIds = this.userSockets.get(userEmail);
    if (socketIds && socketIds.length > 0) {
      logger.info(`[SocketService] Emitting updateTypingStatus (${typingStatus.isTyping}) for ticket ${typingStatus.ticketId} to user ${userEmail} on sockets: ${socketIds.join(', ')}`);
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit('updateTypingStatus', typingStatus);
      });
    } else {
      logger.info(`[SocketService] No active sockets found for user ${userEmail} to send typing status.`);
    }
  }

  // Emit ticket created event to all connected users (for new tickets list)
  emitTicketCreated(ticketData: any) {
    logger.info(`[SocketService] Broadcasting ticketCreated event for ticket ${ticketData.id}`);
    this.io.emit('ticketCreated', ticketData);
  }

  // Emit ticket updated event to all connected users
  emitTicketUpdated(ticketData: any) {
    logger.info(`[SocketService] Broadcasting ticketUpdated event for ticket ${ticketData.id}`);
    this.io.emit('ticketUpdated', ticketData);
  }

  // Emit ticket status changed event to all connected users
  emitTicketStatusChanged(ticketData: any) {
    logger.info(`[SocketService] Broadcasting ticketStatusChanged event for ticket ${ticketData.id} with status ${ticketData.status}`);
    this.io.emit('ticketStatusChanged', ticketData);
  }

  // Emit ticket assigned event to specific user and all admins/support
  emitTicketAssigned(ticketData: any, assignedUserEmail?: string) {
    logger.info(`[SocketService] Broadcasting ticketAssigned event for ticket ${ticketData.id}`);
    // Emit to all users for list updates
    this.io.emit('ticketAssigned', ticketData);
    
    // Also emit specific event to assigned user if provided
    if (assignedUserEmail) {
      const socketIds = this.userSockets.get(assignedUserEmail);
      if (socketIds && socketIds.length > 0) {
        socketIds.forEach(socketId => {
          this.io.to(socketId).emit('ticketAssignedToYou', ticketData);
        });
      }
    }
  }

  // Emit ticket deleted event
  emitTicketDeleted(ticketId: string) {
    logger.info(`[SocketService] Broadcasting ticketDeleted event for ticket ${ticketId}`);
    this.io.emit('ticketDeleted', { ticketId });
  }

  // Broadcast ticket update event (generic)
  broadcastTicketUpdate(ticketId: string, updateData: any) {
    logger.info(`[SocketService] Broadcasting ticket update for ticket ${ticketId}`, updateData);
    this.io.emit('ticketUpdate', {
      ticketId,
      ...updateData,
      timestamp: new Date().toISOString()
    });
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