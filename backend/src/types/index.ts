import { Request } from 'express';
import { Ticket, User, Priority, TicketStatus, ResponseFormat } from '@prisma/client';

// MSAL käyttäjän tyyppi
export interface MSALUser {
  email: string;
  name: string;
  oid: string;
}

// Laajennetaan Express tyypityksiä
declare global {
  namespace Express {
    interface Request {
      user?: MSALUser;
      requestId?: string;
    }
  }
}

// Tyypitetty pyyntö jossa on body
export interface TypedRequest<T> extends Request {
  body: T;
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  device?: string;
  additionalInfo?: string;
  priority: Priority;
  categoryId: string;
  responseFormat?: ResponseFormat;
  userProfile?: string;
  attachments?: Array<{
    filename: string;
    path: string;
    mimetype: string;
    size: number;
  }>;
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
  device?: string;
  additionalInfo?: string;
  status?: TicketStatus;
  priority?: Priority;
  assignedToId?: string;
  categoryId?: string;
  responseFormat?: ResponseFormat;
}

export interface CreateCommentDTO {
  content: string;
  ticketId: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface UpdateCommentDTO {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  role?: string;
}

export type NotificationType = 
  | 'TICKET_ASSIGNED'
  | 'COMMENT_ADDED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'MENTIONED'
  | 'DEADLINE_APPROACHING';

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  ticketId?: string;
  metadata?: Record<string, any>;
}

// Pagination metadata interface
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Standard API response types for consistent API responses
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
  meta?: PaginationMeta;
}

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