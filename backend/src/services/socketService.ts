import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import logger from '../utils/logger.js';

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

// Azure AD configuration
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

// Developer emails that bypass strict tenant validation
const DEVELOPER_EMAILS = process.env.DEVELOPER_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [];

// JWKS client for Azure AD
const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

const getKey = (header: any, callback: any) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
};

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

        let decoded: JWTPayload;
        
        // Always verify tokens - no exceptions!
        try {
          const tokenHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
          
          // First decode to check if it's a developer account
          const decodedForCheck = jwt.decode(token) as JWTPayload;
          const checkEmail = (decodedForCheck?.preferred_username || decodedForCheck?.upn || decodedForCheck?.email || '').toLowerCase();
          const isDeveloper = DEVELOPER_EMAILS.includes(checkEmail);
          
          // Check if it's an Azure AD token
          if (tokenHeader.kid && AZURE_CLIENT_ID) {
            if (isDeveloper) {
              // For developer accounts, skip strict verification
              logger.info('Developer WebSocket connection, bypassing strict JWT verification', { email: checkEmail });
              decoded = jwt.decode(token) as JWTPayload;
            } else {
              // Azure AD token - verify with JWKS for production users
              decoded = await new Promise((resolve, reject) => {
                jwt.verify(token, getKey as any, {
                  audience: AZURE_CLIENT_ID,
                  issuer: [`https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`, 
                           `https://sts.windows.net/${AZURE_TENANT_ID}/`]
                }, (err, decoded) => {
                  if (err) {
                    logger.error('WebSocket token verification failed', {
                      error: err.message,
                      audience: decodedForCheck?.aud,
                      expectedAudience: AZURE_CLIENT_ID
                    });
                    reject(err);
                  } else {
                    resolve(decoded as JWTPayload);
                  }
                });
              });
            }
          } else {
            // Local JWT - verify with secret
            if (!JWT_SECRET) {
              logger.error('JWT_SECRET not configured');
              return next(new Error('Authentication configuration error'));
            }
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
          }
          
          // Check token expiration
          if (decoded.exp && decoded.exp < Date.now() / 1000) {
            return next(new Error('Token expired'));
          }
          
          logger.debug('Token verified successfully', {
            upn: decoded?.upn,
            unique_name: decoded?.unique_name,
            hasToken: !!token,
            tokenLength: token.length
          });

          // Extract user email from verified token
          const userEmail = decoded?.preferred_username || decoded?.upn || decoded?.email || decoded?.unique_name;

          if (!decoded || !userEmail) {
            logger.error('Invalid token structure:', decoded);
            return next(new Error('Invalid token'));
          }

          socket.data.user = {
            email: userEmail
          };

          next();
        } catch (verifyError) {
          logger.error('Token verification error:', verifyError);
          return next(new Error('Invalid or expired token'));
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
    logger.debug('SocketService: Attempting to send notification', {
      userEmail,
      notification
    });

    const socketIds = this.userSockets.get(userEmail);
    logger.info('Found socket IDs for user:', socketIds);
    
    if (socketIds && socketIds.length > 0) {
      logger.debug(`Active socket connections found: ${socketIds.length}`);
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit('notification', {
          ...notification,
          timestamp: new Date().toISOString()
        });
      });
      logger.debug('Notification emitted successfully to all sockets');
    } else {
      logger.debug('No active socket connections found for user');
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