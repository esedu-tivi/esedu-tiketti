import { Request, Response } from 'express';
import { ticketService } from '../services/ticketService.js';
import { TypedRequest, CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';
import { PrismaClient, TicketStatus, Priority, UserRole } from '@prisma/client';

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
  
      // Muutetaan startDate ja endDate päivämääräobjekteiksi
      const startDateObj = startDate ? new Date(startDate as string + 'T00:00:00') : undefined;
      const endDateObj = endDate ? new Date(endDate as string + 'T23:59:59') : undefined;

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (endDateObj && endDateObj > today) {
        return res.status(400).json({ error: 'End date can not be in the future!' });
      }
      if (startDateObj && endDateObj && startDateObj > endDateObj) {
        return res.status(400).json({ error: 'Start date can not be after end date!' });
      }
  
      // Haetaan tiketit suodattimilla, jos ne on määritelty
      const tickets = await prisma.ticket.findMany({
        where: {
          ...(statusEnum && { status: statusEnum }), // Suodatus tilan mukaan
          ...(priorityEnum && { priority: priorityEnum }), // Suodatus prioriteetin mukaan
          ...(category && { 
            category: { 
              name: { 
                equals: category as string,
                mode: 'insensitive'
              }
            } 
          }), // Suodatus kategorian mukaan
          ...(subject && { title: { contains: subject as string, mode: 'insensitive' } }), // Suodatus aiheen mukaan
          ...(user && { createdBy: { name: { contains: user as string, mode: 'insensitive' } } }), // Suodatus käyttäjän mukaan
          ...(device && { device: { contains: device as string, mode: 'insensitive' } }), // Suodatus laitteen mukaan
          ...(startDateObj && { createdAt: { gte: startDateObj } }), // Suodatus päivämäärän mukaan (alku)
          ...(endDateObj && { createdAt: { lte: endDateObj } }), // Suodatus päivämäärän mukaan (loppu)
        },
        include: {
          createdBy: true,
          assignedTo: true,
          category: true,
          comments: {
            include: {
              author: true
            }
          }
        }
      });
      //console.log('Tickets fetched:', tickets);
  
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

      // Muutetaan startDate ja endDate päivämääräobjekteiksi
      const startDateObj = startDate ? new Date(startDate as string + 'T00:00:00') : undefined;
      const endDateObj = endDate ? new Date(endDate as string + 'T23:59:59') : undefined;

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (endDateObj && endDateObj > today) {
        return res.status(400).json({ error: 'End date can not be in the future!' });
      }
      if (startDateObj && endDateObj && startDateObj > endDateObj) {
        return res.status(400).json({ error: 'Start date can not be after end date!' });
      }

      // Rakennetaan Prisma-kysely, jossa suodattimet otetaan huomioon
      const tickets = await prisma.ticket.findMany({
        where: {
          createdById: user.id, // Haetaan vain käyttäjän omat tiketit
          ...(statusEnum && { status: statusEnum }), // Suodatus tilan mukaan
          ...(priorityEnum && { priority: priorityEnum }), // Suodatus prioriteetin mukaan
          ...(category && { 
            category: { 
              name: { 
                equals: category as string,
                mode: 'insensitive'
              }
            } 
          }), // Suodatus kategorian mukaan
          ...(subject && { title: { contains: subject as string, mode: 'insensitive' } }), // Suodatus aiheen mukaan
          ...(device && { device: { contains: device as string, mode: 'insensitive' } }), // Suodatus laitteen mukaan
          ...(startDateObj && { createdAt: { gte: startDateObj } }), // Suodatus päivämäärän mukaan (alku)
          ...(endDateObj && { createdAt: { lte: endDateObj } }), // Suodatus päivämäärän mukaan (loppu)
        },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      //console.log('Tickets fetched:', tickets);

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

      if (!content) {
        return res.status(400).json({ error: 'Kommentin sisältö puuttuu' });
      }

      if (!req.user?.email) {
        return res.status(401).json({ error: 'Käyttäjän tiedot puuttuvat' });
      }

      // Haetaan käyttäjä sähköpostiosoitteen perusteella
      const user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Käyttäjää ei löydy' });
      }

      try {
        const comment = await ticketService.addCommentToTicket(id, content, user.id);
        res.status(201).json(comment);
      } catch (error) {
        // Jos virhe on businesslogiikasta (esim. ei oikeuksia), palautetaan 403
        if (error instanceof Error) {
          return res.status(403).json({ error: error.message });
        }
        throw error; // Heitetään muut virheet catch-lohkoon
      }
    } catch (error) {
      console.error('Virhe kommentin lisäämisessä:', error);
      res.status(500).json({ error: 'Kommentin lisääminen epäonnistui' });
    }
  },

  // Ota tiketti käsittelyyn
  takeTicketIntoProcessing: async (req: Request, res: Response) => {
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

      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Tarkista että tiketti on OPEN tilassa
      if (ticket.status !== TicketStatus.OPEN) {
        return res.status(400).json({ 
          error: 'Ticket cannot be taken into processing. It must be in OPEN status.',
          currentStatus: ticket.status
        });
      }

      // Tarkista ettei tiketti ole jo jonkun käsittelyssä
      if (ticket.assignedToId) {
        return res.status(400).json({ 
          error: 'Ticket is already assigned to someone',
          assignedTo: ticket.assignedTo
        });
      }

      // Aseta arvioitu valmistumisaika prioriteetin mukaan
      let estimatedCompletionTime = new Date();
      switch (ticket.priority) {
        case Priority.CRITICAL:
          estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 4);
          break;
        case Priority.HIGH:
          estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 8);
          break;
        case Priority.MEDIUM:
          estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 24);
          break;
        case Priority.LOW:
          estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 48);
          break;
      }

      // Päivitä tiketin tila ja aseta käsittelijä
      const [updatedTicket, comment] = await prisma.$transaction([
        prisma.ticket.update({
          where: { id: req.params.id },
          data: {
            status: TicketStatus.IN_PROGRESS,
            assignedTo: {
              connect: { id: user.id }
            },
            processingStartedAt: new Date(),
            estimatedCompletionTime
          },
          include: {
            createdBy: true,
            assignedTo: true,
            category: true,
            comments: {
              include: {
                author: true
              }
            }
          }
        }),
        prisma.comment.create({
          data: {
            content: `Tiketti otettu käsittelyyn. Arvioitu valmistumisaika: ${estimatedCompletionTime.toLocaleString('fi-FI')}`,
            ticket: { connect: { id: req.params.id } },
            author: { connect: { id: user.id } }
          },
          include: {
            author: true
          }
        })
      ]);

      // Lisää uusi kommentti tiketin tietoihin
      updatedTicket.comments.push(comment);

      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error('Error taking ticket into processing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Vapauta tiketti käsittelystä
  releaseTicket: async (req: Request, res: Response) => {
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

      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Tarkista että tiketti on käsittelyssä ja käsittelijä on nykyinen käyttäjä
      if (ticket.status !== TicketStatus.IN_PROGRESS) {
        return res.status(400).json({ 
          error: 'Ticket must be in IN_PROGRESS status to be released',
          currentStatus: ticket.status
        });
      }

      if (ticket.assignedToId !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ 
          error: 'Only the assigned support person or admin can release the ticket'
        });
      }

      // Päivitä tiketin tila ja poista käsittelijä
      const [updatedTicket, comment] = await prisma.$transaction([
        prisma.ticket.update({
          where: { id: req.params.id },
          data: {
            status: TicketStatus.OPEN,
            assignedTo: {
              disconnect: true
            }
          },
          include: {
            createdBy: true,
            assignedTo: true,
            category: true,
            comments: {
              include: {
                author: true
              }
            }
          }
        }),
        prisma.comment.create({
          data: {
            content: `Tiketti vapautettu käsittelystä käyttäjän ${user.name} toimesta.`,
            ticket: { connect: { id: req.params.id } },
            author: { connect: { id: user.id } }
          },
          include: {
            author: true
          }
        })
      ]);

      // Lisää uusi kommentti tiketin tietoihin
      updatedTicket.comments.push(comment);

      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error('Error releasing ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Päivitä tiketin tila ja lisää automaattinen kommentti
  updateTicketStatusWithComment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!req.user?.email) {
        return res.status(401).json({ error: 'Unauthorized: User email not found' });
      }

      const user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      if (!Object.values(TicketStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          assignedTo: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Tarkista että käyttäjällä on oikeus muuttaa tilaa
      if (status === TicketStatus.IN_PROGRESS && 
          (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED)) {
        // Jos tiketti avataan uudelleen, tukihenkilö tai admin voi tehdä sen
        if (user.role !== UserRole.SUPPORT && user.role !== UserRole.ADMIN) {
          return res.status(403).json({ 
            error: 'Only support personnel or admin can reopen tickets'
          });
        }
      } else if (ticket.assignedToId !== user.id && user.role !== UserRole.ADMIN) {
        // Muissa tapauksissa vain tiketin käsittelijä tai admin voi muuttaa tilaa
        return res.status(403).json({ 
          error: 'Only the assigned support person or admin can update the status'
        });
      }

      // Hae tai luo järjestelmäkäyttäjä automaattisia kommentteja varten
      const systemUser = await prisma.user.upsert({
        where: { email: 'system@esedu.fi' },
        update: {},
        create: {
          email: 'system@esedu.fi',
          name: 'Järjestelmä',
          role: UserRole.ADMIN
        }
      });

      // Jos tiketti avataan uudelleen
      let updateData = {};
      if (status === TicketStatus.IN_PROGRESS && (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED)) {
        updateData = {
          status,
          processingEndedAt: null,
          assignedTo: {
            connect: { id: user.id }
          }
        };
      } else if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
        // Jos tiketti suljetaan tai ratkaistaan
        updateData = {
          status,
          processingEndedAt: new Date(),
          assignedTo: {
            disconnect: true
          }
        };
      } else {
        // Muut tilamuutokset
        updateData = {
          status,
          ...(status === TicketStatus.IN_PROGRESS ? {
            processingEndedAt: null
          } : {})
        };
      }

      // Päivitä tila ja lisää kommentti
      const [updatedTicket, comment] = await prisma.$transaction([
        prisma.ticket.update({
          where: { id },
          data: updateData,
          include: {
            createdBy: true,
            assignedTo: true,
            category: true,
            comments: {
              include: {
                author: true
              }
            }
          }
        }),
        prisma.comment.create({
          data: {
            content: `Tiketin tila muutettu: ${status} (${user.name})`,
            ticket: { connect: { id } },
            author: { connect: { id: systemUser.id } }
          },
          include: {
            author: true
          }
        })
      ]);

      // Lisää uusi kommentti tiketin tietoihin
      updatedTicket.comments.push(comment);

      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Siirrä tiketti toiselle tukihenkilölle
  transferTicket: async (req: Request, res: Response) => {
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

      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: 'Target user ID is required' });
      }

      // Tarkista että kohdehenkilö on olemassa ja on tukihenkilö
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      if (targetUser.role !== UserRole.SUPPORT && targetUser.role !== UserRole.ADMIN) {
        return res.status(400).json({ error: 'Target user must be a support person or admin' });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Tarkista että tiketti on käsittelyssä ja siirtäjä on tiketin käsittelijä tai admin
      if (ticket.status !== TicketStatus.IN_PROGRESS) {
        return res.status(400).json({ 
          error: 'Only tickets in IN_PROGRESS status can be transferred',
          currentStatus: ticket.status
        });
      }

      if (ticket.assignedToId !== user.id && user.role !== UserRole.ADMIN) {
        return res.status(403).json({ 
          error: 'Only the assigned support person or admin can transfer the ticket'
        });
      }

      // Päivitä tiketin käsittelijä ja lisää kommentti
      const [updatedTicket, comment] = await prisma.$transaction([
        prisma.ticket.update({
          where: { id: req.params.id },
          data: {
            assignedTo: {
              connect: { id: targetUserId }
            }
          },
          include: {
            createdBy: true,
            assignedTo: true,
            category: true,
            comments: {
              include: {
                author: true
              }
            }
          }
        }),
        prisma.comment.create({
          data: {
            content: `Tiketti siirretty käyttäjältä ${user.name} käyttäjälle ${targetUser.name}`,
            ticket: { connect: { id: req.params.id } },
            author: { connect: { id: user.id } }
          },
          include: {
            author: true
          }
        })
      ]);

      // Lisää uusi kommentti tiketin tietoihin
      updatedTicket.comments.push(comment);

      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error('Error transferring ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
