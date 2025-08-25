import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID tracking middleware
 * Generates a unique ID for each request and adds it to:
 * - Request object for use in controllers and services
 * - Response headers (X-Request-ID) for client tracking
 * 
 * This helps with debugging and tracing requests through the system.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check if request already has an ID (from client or load balancer)
  const existingRequestId = req.headers['x-request-id'] || req.headers['X-Request-ID'];
  
  // Generate new ID or use existing one
  const requestId = (Array.isArray(existingRequestId) ? existingRequestId[0] : existingRequestId) || uuidv4();
  
  // Add to request object for internal use
  (req as any).requestId = requestId;
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', requestId);
  
  next();
};