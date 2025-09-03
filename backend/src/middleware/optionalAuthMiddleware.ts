import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Optional authentication middleware for rate limiting purposes.
 * Attempts to extract user information from JWT if present,
 * but doesn't fail if no token is provided.
 * This allows rate limiters to differentiate between authenticated 
 * and non-authenticated users in school environments with shared IPs.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No auth header - continue without setting user
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      // No token - continue without setting user
      return next();
    }

    // Try to decode token to extract user info
    // We only need the email for rate limiting, not full verification
    try {
      const decoded = jwt.decode(token) as any;
      
      if (decoded) {
        // Extract email from various possible fields
        const email = decoded.preferred_username || 
                     decoded.upn || 
                     decoded.email || 
                     decoded.unique_name ||
                     decoded.sub;
        
        if (email) {
          // Set minimal user info for rate limiting
          req.user = { email, name: decoded.name, oid: decoded.oid } as any;
          logger.debug('Optional auth: User identified for rate limiting', { 
            email,
            requestId: (req as any).requestId 
          });
        }
    }
    } catch (decodeError) {
      // Failed to decode - continue without user
      logger.debug('Optional auth: Failed to decode token', { 
        error: decodeError,
        requestId: (req as any).requestId 
      });
    }
  } catch (error) {
    // Any error - continue without user
    logger.debug('Optional auth: Error processing auth', { 
      error,
      requestId: (req as any).requestId 
    });
  }
  
  // Always continue to next middleware
  next();
};