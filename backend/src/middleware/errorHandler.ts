import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger.js';

// Custom error classes for better error categorization
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errorCode?: string) {
    super(message, 400, errorCode || 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Autentikointi vaaditaan', errorCode?: string) {
    super(message, 401, errorCode || 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Ei oikeuksia tähän toimintoon', errorCode?: string) {
    super(message, 403, errorCode || 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resurssia ei löytynyt', errorCode?: string) {
    super(message, 404, errorCode || 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode?: string) {
    super(message, 409, errorCode || 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Liikaa pyyntöjä', errorCode?: string) {
    super(message, 429, errorCode || 'RATE_LIMIT_ERROR');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Sisäinen palvelinvirhe', errorCode?: string) {
    super(message, 500, errorCode || 'INTERNAL_SERVER_ERROR');
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
    details?: any;
  };
}

// Helper function to determine if error should expose details
const shouldExposeErrorDetails = (error: Error): boolean => {
  return process.env.NODE_ENV !== 'production' || error instanceof AppError;
};

// Helper function to sanitize error for logging
const sanitizeErrorForLogging = (error: Error, req: Request) => {
  const sanitized: any = {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  };

  // Add user info if available (but not sensitive data)
  const user = (req as any).user;
  if (user) {
    sanitized.user = {
      email: user.email,
      oid: user.oid,
    };
  }

  // Add request body for non-sensitive endpoints (exclude auth routes)
  if (!req.path.includes('/auth') && req.body) {
    sanitized.body = req.body;
  }

  return sanitized;
};

// Main error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response has already been sent, pass to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Sisäinen palvelinvirhe';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.errorCode || 'APP_ERROR';
  } else if (error instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validointivirhe';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    errorCode = 'DATABASE_ERROR';
    
    switch (error.code) {
      case 'P2002':
        message = 'Tietue on jo olemassa';
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        message = 'Tietuetta ei löytynyt';
        statusCode = 404;
        errorCode = 'RECORD_NOT_FOUND';
        break;
      case 'P2003':
        message = 'Vieras avaimen rajoitevirhe';
        errorCode = 'FOREIGN_KEY_CONSTRAINT';
        break;
      case 'P2014':
        message = 'Tietokantayhteyden virhe';
        statusCode = 500;
        errorCode = 'DATABASE_CONNECTION_ERROR';
        break;
      default:
        message = 'Tietokantavirhe';
        statusCode = 500;
        break;
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    errorCode = 'DATABASE_UNKNOWN_ERROR';
    message = 'Tuntematon tietokantavirhe';
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    errorCode = 'DATABASE_PANIC_ERROR';
    message = 'Kriittinen tietokantavirhe';
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    errorCode = 'DATABASE_INIT_ERROR';
    message = 'Tietokannan alustusvirhe';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorCode = 'DATABASE_VALIDATION_ERROR';
    message = 'Tietokannan validointivirhe';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Virheellinen ID';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Virheellinen token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token on vanhentunut';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    message = 'Tiedoston latausvirhe';
    
    // Handle specific Multer errors
    const multerError = error as any;
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Tiedosto on liian suuri';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Liikaa tiedostoja';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Odottamaton tiedosto';
        break;
    }
  }

  // Log the error with request context
  const sanitizedError = sanitizeErrorForLogging(error, req);
  const requestLogger = logger.child({ requestId: req.requestId });
  
  if (statusCode >= 500) {
    requestLogger.error('Server Error', sanitizedError);
  } else if (statusCode === 404) {
    requestLogger.debug('Not Found', sanitizedError);
  } else if (statusCode >= 400) {
    requestLogger.warn('Client Error', sanitizedError);
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code: errorCode,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.requestId,
    },
  };

  // Add details in development or for operational errors
  if (shouldExposeErrorDetails(error) && details) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stack: error.stack,
    };
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler middleware (should be added before error handler)
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Reitti ${req.originalUrl} ei löytynyt`);
  next(error);
};

// Utility function to create standardized success responses
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};