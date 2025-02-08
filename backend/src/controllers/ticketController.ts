import { Request, Response } from 'express';
import { ticketService } from '../services/ticketService.js';
import { TypedRequest, CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';
import { PrismaClient, TicketStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

export const ticketController = {
  // Haetaan kaikki tiketit, jos suodattimia määritelty, niin haetaan niiden mukaan
  getAllTickets: async (req: Request, res: Response) => {
    try {
      const { status, priority, category, subject, user, device, startDate, endDate } = req.query;
      
      // Muutetaan priority oikeaksi enum-arvoksi
      const priorityEnum: Priority | undefined = typeof priority === 'string' && Object.values(Priority).includes(priority.toUpperCase() as Priority)
        ? (priority.toUpperCase() as Priority)
        : undefined;
  
        // Muutetaan status oikeaksi enum-arvoksi
      const statusEnum: TicketStatus | undefined = typeof status === 'string' && Object.values(TicketStatus).includes(status.toUpperCase() as TicketStatus)
        ? (status.toUpperCase() as TicketStatus)
        : undefined;
  
      // Muutetaan category-arvo merkkijonoksi, jos se on olemassa (EI TOIMI TÄLLÄ HETKELLÄ)
      const categoryEnum: string | undefined = typeof category === 'string' ? category.toLowerCase() : undefined;

      // Muutetaan startDate ja endDate päivämääräobjekteiksi
      const startDateObj = startDate ? new Date(startDate as string + 'T00:00:00') : undefined;
      const endDateObj = endDate ? new Date(endDate as string + 'T23:59:59') : undefined;
  
      // Haetaan tiketit suodattimilla, jos ne on määritelty
      const tickets = await prisma.ticket.findMany({
        where: {
          ...(statusEnum && { status: statusEnum }), // Suodatus tilan mukaan
          ...(priorityEnum && { priority: priorityEnum }), // Suodatus prioriteetin mukaan
          ...(categoryEnum && { category: { name: categoryEnum } }), // Suodatus kategorian mukaan (EI TOIMI TÄLLÄ HETKELLÄ)
          ...(subject && { title: { contains: subject as string, mode: 'insensitive' } }), // Suodatus aiheen mukaan
          ...(user && { createdById: user as string }), // Suodatus käyttäjän mukaan
          ...(device && { device: { contains: device as string, mode: 'insensitive' } }), // Suodatus laitteen mukaan
          ...(startDateObj && { createdAt: { gte: startDateObj } }), // Suodatus päivämäärn mukaan (alku)
          ...(endDateObj && { createdAt: { lte: endDateObj } }), // Suodatus päivämäärn mukaan (loppu)
        },
      });
      console.log('Tickets fetched:', tickets);
  
      res.json({ tickets });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Hae yksittäinen tiketti
  getTicketById: async (req: Request, res: Response) => {
    try {
      const ticket = await ticketService.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      res.json({ ticket });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Luo uusi tiketti
  createTicket: async (req: TypedRequest<CreateTicketDTO>, res: Response) => {
    try {
      // Debug lokitus
      console.log('Create ticket request user:', req.user);
      console.log('Create ticket request headers:', req.headers);

      if (!req.user?.email) {
        return res.status(401).json({ error: 'Unauthorized: User email not found' });
      }

      // Haetaan käyttäjä sähköpostiosoitteen perusteella
      const user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      // Käytetään autentikoidun käyttäjän ID:tä
      const ticket = await ticketService.createTicket(req.body, user.id);
      res.status(201).json({ ticket });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Päivitä tiketti
  updateTicket: async (req: TypedRequest<UpdateTicketDTO>, res: Response) => {
    try {
      const ticket = await ticketService.updateTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      res.json({ ticket });
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Poista tiketti
  deleteTicket: async (req: Request, res: Response) => {
    try {
      await ticketService.deleteTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Haetaan kaikki omat tiketit, jos suodattimia määritelty, niin haetaan niiden mukaan
  getMyTickets: async (req: Request, res: Response) => {
    try {
      if (!req.user?.email) {
        return res.status(401).json({ error: 'Unauthorized: User email not found' });
      }

      const user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      const { category, priority, status, subject, device, startDate, endDate } = req.query;

      // Muutetaan priority oikeaksi enum-arvoksi
      const priorityEnum: Priority | undefined = typeof priority === 'string' && Object.values(Priority).includes(priority.toUpperCase() as Priority)
        ? (priority.toUpperCase() as Priority)
        : undefined;

      // Muutetaan status oikeaksi enum-arvoksi
      const statusEnum: TicketStatus | undefined = typeof status === 'string' && Object.values(TicketStatus).includes(status.toUpperCase() as TicketStatus)
        ? (status.toUpperCase() as TicketStatus)
        : undefined;

      // Muutetaan category-arvo merkkijonoksi, jos se on olemassa (EI TOIMI TÄLLÄ HETKELLÄ)
      const categoryEnum: string | undefined = typeof category === 'string' ? category.toLowerCase() : undefined;

      // Muutetaan startDate ja endDate päivämääräobjekteiksi
      const startDateObj = startDate ? new Date(startDate as string + 'T00:00:00') : undefined;
      const endDateObj = endDate ? new Date(endDate as string + 'T23:59:59') : undefined;

      // Rakennetaan Prisma-kysely, jossa suodattimet otetaan huomioon
      const tickets = await prisma.ticket.findMany({
        where: {
          createdById: user.id, // Haetaan vain käyttäjän omat tiketit
          ...(statusEnum && { status: statusEnum }), // Suodatus tilan mukaan
          ...(priorityEnum && { priority: priorityEnum }), // Suodatus prioriteetin mukaan
          ...(categoryEnum && { category: { name: categoryEnum } }), // Suodatus kategorian mukaan (EI TOIMI TÄLLÄ HETKELLÄ)
          ...(subject && { title: { contains: subject as string, mode: 'insensitive' } }), // Suodatus aiheen mukaan
          ...(device && { device: { contains: device as string, mode: 'insensitive' } }), // Suodatus laitteen mukaan
          ...(startDateObj && { createdAt: { gte: startDateObj } }), // Suodatus päivämäärän mukaan (alku)
          ...(endDateObj && { createdAt: { lte: endDateObj } }), // Suodatus päivämäärän mukaan (loppu)
        },
      });
      console.log('Tickets fetched:', tickets);

      res.json({ tickets });
    } catch (error) {
      console.error('Error fetching user tickets with filters:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Aseta tiketin tila (vain admin)
  updateTicketStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(TicketStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const ticket = await ticketService.updateTicketStatus(id, status);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.json({ ticket });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Aseta tiketin käsittelijä (vain admin)
  assignTicket: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;

      if (!assignedToId) {
        return res.status(400).json({ error: 'AssignedToId is required' });
      }

      const ticket = await ticketService.assignTicket(id, assignedToId);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.json({ ticket });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Tiketin kommentin lisääminen
  addCommentToTicket: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user?.oid || '';
  
      if (!content) {
        return res.status(400).json({ error: 'Kommentin sisältö puuttuu' });
      }
  
      const comment = await ticketService.addCommentToTicket(id, content, userId);
      res.status(201).json(comment);
    } catch (error) {
      console.error('Virhe kommentin lisäämisessä:', error);
      res.status(500).json({ error: 'Kommentin lisääminen epäonnistui' });
    }
  }
};
