import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole, TicketStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const canModifyTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Admins can always modify tickets
    if (user.role === UserRole.ADMIN) {
      return next();
    }

    const ticketId = req.params.id;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Jos käyttäjä on tiketin luoja ja yrittää sulkea tikettiä, salli se
    const isClosingOwnTicket = ticket.createdById === user.id && 
                              req.method === 'PUT' && 
                              req.body.status === TicketStatus.CLOSED;
    
    if (isClosingOwnTicket) {
      return next();
    }

    // If ticket is assigned to someone, only that person can modify it
    if (ticket.assignedToId && ticket.assignedToId !== user.id) {
      return res.status(403).json({ error: 'This ticket is being handled by another support person' });
    }

    next();
  } catch (error) {
    console.error('Error in canModifyTicket middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 