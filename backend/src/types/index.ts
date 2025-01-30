import { Request } from 'express';
import { Ticket, User, Priority, TicketStatus } from '@prisma/client';

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
}

export interface CreateCommentDTO {
  content: string;
  ticketId: string;
}

export interface UpdateCommentDTO {
  content: string;
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