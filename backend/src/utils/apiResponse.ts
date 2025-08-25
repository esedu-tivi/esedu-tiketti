import { Response } from 'express';

// Pagination metadata interface
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Standard success response structure
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
  meta?: PaginationMeta;
}

// Standard error response structure
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    method?: string;
    details?: any;
  };
}

/**
 * Creates a standardized success response
 * @param res Express Response object
 * @param data Data to return
 * @param message Success message
 * @param statusCode HTTP status code (default: 200)
 * @param meta Additional metadata (e.g., pagination)
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Operation successful',
  statusCode: number = 200,
  meta?: PaginationMeta
): Response<ApiSuccessResponse<T>> => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta })
  };

  return res.status(statusCode).json(response);
};

/**
 * Creates a standardized paginated success response
 * @param res Express Response object
 * @param data Array of data items
 * @param pagination Pagination metadata
 * @param message Success message
 * @param statusCode HTTP status code (default: 200)
 */
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message: string = 'Data retrieved successfully',
  statusCode: number = 200
): Response<ApiSuccessResponse<T[]>> => {
  return successResponse(res, data, message, statusCode, pagination);
};

/**
 * Creates a standardized error response
 * @param res Express Response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 500)
 * @param code Optional error code
 * @param details Optional error details
 * @param path Request path (optional)
 * @param method Request method (optional)
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any,
  path?: string,
  method?: string
): Response<ApiErrorResponse> => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(code && { code }),
      ...(details && { details }),
      ...(path && { path }),
      ...(method && { method })
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Common error response helpers
 */
export const errorResponses = {
  badRequest: (res: Response, message: string = 'Bad request', details?: any) =>
    errorResponse(res, message, 400, 'BAD_REQUEST', details),

  unauthorized: (res: Response, message: string = 'Unauthorized') =>
    errorResponse(res, message, 401, 'UNAUTHORIZED'),

  forbidden: (res: Response, message: string = 'Forbidden') =>
    errorResponse(res, message, 403, 'FORBIDDEN'),

  notFound: (res: Response, message: string = 'Resource not found') =>
    errorResponse(res, message, 404, 'NOT_FOUND'),

  conflict: (res: Response, message: string = 'Conflict', details?: any) =>
    errorResponse(res, message, 409, 'CONFLICT', details),

  validationError: (res: Response, message: string = 'Validation failed', details?: any) =>
    errorResponse(res, message, 422, 'VALIDATION_ERROR', details),

  internalServerError: (res: Response, message: string = 'Internal server error', details?: any) =>
    errorResponse(res, message, 500, 'INTERNAL_SERVER_ERROR', details)
};

/**
 * Helper to create pagination metadata
 * @param page Current page number
 * @param limit Items per page
 * @param totalItems Total number of items
 */
export const createPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems,
    limit,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

/**
 * Helper to parse and validate pagination parameters
 * @param page Page parameter from query
 * @param limit Limit parameter from query
 * @param maxLimit Maximum allowed limit (default: 100)
 * @param defaultLimit Default limit if not provided (default: 25)
 */
export const parsePaginationParams = (
  page?: string | number,
  limit?: string | number,
  maxLimit: number = 100,
  defaultLimit: number = 25
) => {
  const pageNumber = Math.max(1, parseInt(String(page)) || 1);
  const limitNumber = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(limit)) || defaultLimit)
  );
  const skip = (pageNumber - 1) * limitNumber;

  return {
    page: pageNumber,
    limit: limitNumber,
    skip
  };
};