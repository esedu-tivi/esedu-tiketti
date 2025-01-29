import { Request, Response } from 'express';
import { ticketService } from '../services/ticketService.js';
import { TypedRequest, CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ticketController = {
  // Hae kaikki tiketit
  getAllTickets: async (req: Request, res: Response) => {
    try {
      const tickets = await ticketService.getAllTickets();
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
        // TODO: Tähän tulee myöhemmin käyttäjän ID MSAL:sta
      // Haetaan väliaikaisesti ensimmäinen käyttäjä ja yleinen kategoria
      const user = await prisma.user.findFirst({
        where: { role: 'USER' }
      });

      if (!user) {
        return res.status(500).json({ error: 'Required data not found' });
      }

      // Käytetään suoraan frontendiltä tulevia tietoja
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
  }
}; 