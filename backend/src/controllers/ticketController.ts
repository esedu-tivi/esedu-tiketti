import { Request, Response } from 'express';
import { ticketService } from '../services/ticketService.js';
import { TypedRequest, CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';
import { PrismaClient, TicketStatus, Priority, UserRole } from '@prisma/client';
import { createNotification } from './notificationController.js';
import axios from 'axios';
import { getSocketService } from '../services/socketService.js';

const prisma = new PrismaClient();

export const ticketController = {
  // Haetaan kaikki tiketit, jos suodattimia määritelty, niin haetaan niiden mukaan
  getAllTickets: async (req: Request, res: Response) => {
    try {
      const { status, priority, category, subject, user, device, startDate, endDate } = req.query;
      
      // Muutetaan priority oikeiksi enum-arvoiksi
      const priorityEnum = Array.isArray(priority)
        ? priority.map((p) => typeof p === 'string' && Object.values(Priority).includes(p.toUpperCase() as Priority) ? p.toUpperCase() as Priority : undefined).filter(Boolean) as Priority[]
        : typeof priority === 'string' && Object.values(Priority).includes(priority.toUpperCase() as Priority)
        ? [priority.toUpperCase() as Priority]
        : undefined;

      // Muutetaan status oikeiksi enum-arvoiksi
      const statusEnum = Array.isArray(status)
        ? status.map((s) => typeof s === 'string' && Object.values(TicketStatus).includes(s.toUpperCase() as TicketStatus) ? s.toUpperCase() as TicketStatus : undefined).filter(Boolean) as TicketStatus[]
        : typeof status === 'string' && Object.values(TicketStatus).includes(status.toUpperCase() as TicketStatus)
        ? [status.toUpperCase() as TicketStatus]
        : undefined;

      // Muutetaan category oikeanmuotoiseksi taulukoksi
      const categoryArray: string[] | undefined = Array.isArray(category)
        ? category.filter((c) => typeof c === 'string') as string[]
        : typeof category === 'string'
        ? [category]
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
          ...(statusEnum && statusEnum.length > 0 && { status: { in: statusEnum } }), // Suodatus tilan mukaan
          ...(priorityEnum && priorityEnum.length > 0 && { priority: { in: priorityEnum } }), // Suodatus prioriteetin mukaan
          ...(categoryArray && categoryArray.length > 0 && { 
            category: { 
                name: { in: categoryArray, mode: 'insensitive' }
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

      // Process any uploaded files
      const attachmentData = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          attachmentData.push({
            filename: file.originalname,
            path: `/uploads/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size
          });
        }
      }

      // Add attachment data to request body
      req.body.attachments = attachmentData;

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

      // Muutetaan priority oikeiksi enum-arvoiksi (tuetaan monivalintaa)
      const priorityEnum = Array.isArray(priority)
        ? priority.map((p) => typeof p === 'string' && Object.values(Priority).includes(p.toUpperCase() as Priority) ? p.toUpperCase() as Priority : undefined).filter(Boolean) as Priority[]
        : typeof priority === 'string' && Object.values(Priority).includes(priority.toUpperCase() as Priority)
        ? [priority.toUpperCase() as Priority]
        : undefined;

      // Muutetaan status oikeiksi enum-arvoiksi (tuetaan monivalintaa)
      const statusEnum = Array.isArray(status)
        ? status.map((s) => typeof s === 'string' && Object.values(TicketStatus).includes(s.toUpperCase() as TicketStatus) ? s.toUpperCase() as TicketStatus : undefined).filter(Boolean) as TicketStatus[]
        : typeof status === 'string' && Object.values(TicketStatus).includes(status.toUpperCase() as TicketStatus)
        ? [status.toUpperCase() as TicketStatus]
        : undefined;

      // Muutetaan category oikeanmuotoiseksi taulukoksi
      const categoryArray: string[] | undefined = Array.isArray(category)
        ? category.filter((c) => typeof c === 'string') as string[]
        : typeof category === 'string'
        ? [category]
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
          ...(statusEnum && statusEnum.length > 0 && { status: { in: statusEnum } }), // Suodatus tilan mukaan
          ...(priorityEnum && priorityEnum.length > 0 && { priority: { in: priorityEnum } }), // Suodatus prioriteetin mukaan
          ...(categoryArray && categoryArray.length > 0 && { 
            category: { 
                name: { in: categoryArray, mode: 'insensitive' }
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

      // Create notification for the ticket creator
      await createNotification(
        ticket.createdById,
        'STATUS_CHANGED',
        `Tiketin "${ticket.title}" tila on muuttunut: ${status}`,
        ticket.id
      );

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

      // Create notification for the assigned user
      await createNotification(
        assignedToId,
        'TICKET_ASSIGNED',
        `Sinulle on osoitettu uusi tiketti: ${ticket.title}`,
        ticket.id
      );

      res.json({ ticket });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Tiketin kommentin lisääminen
  addCommentToTicket: async (req: Request, res: Response) => {
    let ticketDetails: any = null;
    let user: any = null;
    let comment: any = null;
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
      user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Käyttäjää ei löydy' });
      }

      try {
        // Etsi @-maininnat kommentista
        const mentionRegex = /@([a-zA-Z0-9äöåÄÖÅ\s]+)/g;
        const mentionsIterator = content.matchAll(mentionRegex);
        const mentionedNames = Array.from(mentionsIterator, (match: RegExpMatchArray) => match[1].trim());

        console.log('Found mentions:', mentionedNames);

        // Hae mainitut käyttäjät
        const mentionedUsers = await prisma.user.findMany({
          where: {
            OR: mentionedNames.map((name: string) => ({
              name: {
                equals: name,
                mode: 'insensitive'  // Case-insensitive haku
              }
            }))
          }
        });

        console.log('Found mentioned users:', mentionedUsers);

        // Hae tiketti ennen kommentin luontia (include assignedTo and createdBy for socket emission)
        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            category: true,
            assignedTo: { select: { email: true } }, // Get assigned user email
            createdBy: { select: { email: true } } // Get creator email
          }
        });

        if (!ticket) {
          return res.status(404).json({ error: 'Tikettiä ei löydy' });
        }

        // Assign ticket details for later use (notifications, socket)
        ticketDetails = ticket;

        // Tarkista käyttäjän oikeudet kommentoida tikettiin
        if (user.role === 'SUPPORT' && ticket.responseFormat !== 'TEKSTI' && ticket.assignedToId === user.id) {
          // Tarkista onko käyttäjä jo lisännyt mediavastauksen
          const existingMediaComments = await prisma.comment.findMany({
            where: {
              ticketId: id,
              authorId: user.id,
              mediaUrl: { not: null },
              mediaType: { not: null }
            }
          });
          
          // Jos mediavastausta ei ole vielä lisätty, estä tekstikommentin lisääminen
          if (existingMediaComments.length === 0) {
            return res.status(400).json({ 
              error: `Tämä tiketti vaatii ${ticket.responseFormat === 'KUVA' ? 'kuvan' : 'videon'} sisältävän vastauksen.\n                     Käytä media-kommenttitoimintoa vastaamiseen.`
            });
          }
        }

        // Luo kommentti
        comment = await prisma.comment.create({
          data: {
            content,
            ticket: { connect: { id } },
            author: { connect: { id: user.id } }
          },
          include: {
            author: true // Include author details in the created comment
          }
        });

        console.log('Created comment:', comment);

        // Store AI generation details if needed
        let aiGenerationNeeded = false;
        let aiApiUrl = '';
        let aiToken = '';
        let aiPayload = {};

        // Check if this is an AI-generated ticket and the comment is from a support agent
        // If so, prepare to trigger an AI response as the ticket creator
        if (
          ticketDetails?.isAiGenerated &&
          (user.role === 'SUPPORT' || user.role === 'ADMIN') &&
          user.id !== ticketDetails.createdById
        ) {
          aiGenerationNeeded = true;
          aiApiUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Assuming API route is accessible via frontend URL structure
          aiToken = req.headers.authorization?.split(' ')[1] || '';
          aiPayload = {
            ticketId: id,
            commentText: content, // The user comment text
            supportUserId: user.id
          };
          console.log('AI response generation will be triggered for ticket:', id);
        }

        // Respond to the client first
        res.status(201).json(comment);

        // --- Notifications and Socket Emission START ---
        try {
            const socketService = getSocketService();
            const recipients = new Set<string>();

            // Add ticket creator if they are not the commenter
            if (ticketDetails.createdBy?.email && ticketDetails.createdBy.email !== user.email) {
              recipients.add(ticketDetails.createdBy.email);
              const creatorNotification = await createNotification(
                ticketDetails.createdById,
                'COMMENT_ADDED',
                `Uusi kommentti tiketissä "${ticketDetails.title}"`,
                id,
                { commentId: comment.id }
              );
              console.log('Created notification for ticket creator:', creatorNotification);
            }

            // Add assigned user if they exist and are not the commenter
            if (ticketDetails.assignedTo?.email && ticketDetails.assignedTo.email !== user.email) {
              recipients.add(ticketDetails.assignedTo.email);
              // Optionally, send notification to assigned user as well
            }

            // Add mentioned users (if they are not the commenter)
            for (const mentionedUser of mentionedUsers) {
              if (mentionedUser.email !== user.email) {
                recipients.add(mentionedUser.email);
                console.log('Creating mention notification for user:', mentionedUser.email);
                const mentionNotification = await createNotification(
                  mentionedUser.id,
                  'MENTIONED',
                  `${user.name} mainitsi sinut kommentissa tiketissä "${ticketDetails?.title}"`,
                  id,
                  {
                    commentId: comment.id,
                    mentionedBy: user.name,
                    mentionedByEmail: user.email
                  }
                );
                console.log('Created mention notification:', mentionNotification);
              }
            }
            
            // Emit socket event to all unique recipients
            recipients.forEach(email => {
                socketService.emitNewCommentToUser(email, comment); 
            });

        } catch (socketError) {
          console.error('[Socket/Notification Error] Failed to send updates:', socketError);
        }
        // --- Notifications and Socket Emission END ---

        // Trigger AI generation *after* responding and sending updates, if needed
        if (aiGenerationNeeded && aiToken) {
          try {
            console.log('Triggering background AI response generation...');
            // Use a non-blocking call, but without setTimeout to avoid race condition
            axios.post(
              `${aiApiUrl}/api/ai/tickets/${id}/generate-response`,
              aiPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${aiToken}`
                },
                // Optional: Set a timeout for the AI request itself
                timeout: 30000 // e.g., 30 seconds
              }
            ).then(response => {
              console.log('Background AI response generation successful:', response.status);
            }).catch(aiError => {
              // Log the error for background task failure
              console.error('Error during background AI response generation:', aiError.response?.data || aiError.message);
            });
          } catch (error) {
            // Catch potential immediate errors from initiating the axios call
             console.error('Error initiating background AI response generation call:', error);
          }
        }

      } catch (error) { // Inner catch for processing logic
        console.error('Error during comment processing logic:', error);
        // Ensure a response is sent if not already handled
        if (!res.headersSent) {
           if (error instanceof Error) {
             // Specific business logic errors
             if (error.message.includes('Tiketti on ratkaistu') || error.message.includes('Tiketti vaatii')) {
               return res.status(403).json({ error: error.message });
             }
           }
           // Rethrow unexpected errors to be caught by the outer catch
           throw error;
        }
      }
    } catch (error) { // Outer catch for general/unexpected errors
      console.error('Virhe kommentin lisäämisessä (outer catch):', error);
      // Ensure a response is sent if not already handled by inner logic/catches
      if (!res.headersSent) {
          res.status(500).json({ error: 'Kommentin lisääminen epäonnistui' });
      }
    }
  },

  // Lisää kommentti mediasisällöllä (kuva tai video)
  addMediaCommentToTicket: async (req: Request, res: Response) => {
    let ticket: any = null;
    let user: any = null;
    let comment: any = null;
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      // Tarkistetaan, että tiedosto on ladattu
      if (!req.file) {
        return res.status(400).json({ error: 'Media-tiedosto puuttuu' });
      }
      
      if (!content) {
        return res.status(400).json({ error: 'Kommentin sisältö puuttuu' });
      }

      if (!req.user?.email) {
        return res.status(401).json({ error: 'Käyttäjän tiedot puuttuvat' });
      }

      // Haetaan käyttäjä sähköpostiosoitteen perusteella
      user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Käyttäjää ei löydy' });
      }
      
      // Haetaan tiketti (include assignedTo and createdBy for socket emission)
      ticket = await prisma.ticket.findUnique({
        where: { id },
         include: {
            assignedTo: { select: { email: true } }, // Get assigned user email
            createdBy: { select: { email: true } } // Get creator email
          }
      });
      
      if (!ticket) {
        return res.status(404).json({ error: 'Tikettiä ei löydy' });
      }
      
      // Tarkista käyttöoikeudet:
      if (user.role !== 'SUPPORT' && user.role !== 'ADMIN' && ticket.createdById !== user.id) {
        return res.status(403).json({ error: 'Vain tukihenkilöt, järjestelmänvalvojat tai tiketin luoja voivat lisätä mediasisältöä' });
      }
      
      if (ticket.createdById === user.id && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) {
        return res.status(403).json({ error: 'Et voi lisätä mediasisältöä suljettuun tai ratkaistuun tikettiin' });
      }
      
      if (user.role === 'SUPPORT' && ticket.status === 'IN_PROGRESS' && ticket.assignedToId !== user.id) {
        return res.status(403).json({ error: 'Vain tiketin käsittelijä voi lisätä mediasisältöä' });
      }
      
      // Määritä mediatyyppi tiedostopäätteen perusteella
      const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      // Luo tiedostopolku
      const mediaUrl = `/uploads/${req.file.filename}`;
      
      // Luo kommentti mediasisällöllä
      comment = await prisma.comment.create({
        data: {
          content,
          mediaUrl,
          mediaType,
          ticket: { connect: { id } },
          author: { connect: { id: user.id } }
        },
        include: {
          author: true // Include author details in the created comment
        }
      });

      // Respond to client first
      res.status(201).json(comment);
      
      // --- Notifications and Socket Emission START ---
      try {
        const socketService = getSocketService();
        const recipients = new Set<string>();
        
        // Add ticket creator if they are not the commenter
        if (ticket.createdBy?.email && ticket.createdBy.email !== user.email) {
            recipients.add(ticket.createdBy.email);
            await createNotification(
                ticket.createdById,
                'COMMENT_ADDED',
                `Uusi ${mediaType === 'image' ? 'kuva' : 'video'}-vastaus tiketissä "${ticket.title}"`,
                id,
                { commentId: comment.id }
            );
        }

        // Add assigned user if they exist and are not the commenter
        if (ticket.assignedTo?.email && ticket.assignedTo.email !== user.email) {
              recipients.add(ticket.assignedTo.email);
              // Optionally, send notification to assigned user as well
        }
      
        // Käsitellään maininnat (Use matchAll here too)
        const mentionRegex = /@([a-zA-Z0-9äöåÄÖÅ\s]+)/g;
        const mentionsIterator = content.matchAll(mentionRegex);
        const mentionedNames = Array.from(mentionsIterator, (match: RegExpMatchArray) => match[1].trim());
      
        if (mentionedNames.length > 0) {
          console.log('Found media comment mentions:', mentionedNames);
          const mentionedUsers = await prisma.user.findMany({
            where: {
              OR: mentionedNames.map((name: string) => ({
                name: {
                  equals: name,
                  mode: 'insensitive'
                }
              }))
            }
          });
        
          // Add mentioned users to recipients and send notifications
          for (const mentionedUser of mentionedUsers) {
             if (mentionedUser.email !== user.email) {
                recipients.add(mentionedUser.email);
                await createNotification(
                    mentionedUser.id,
                    'MENTIONED',
                    `${user.name} mainitsi sinut kommentissa tiketissä "${ticket.title}"`,
                    id,
                    { 
                      commentId: comment.id,
                      mentionedBy: user.name,
                      mentionedByEmail: user.email
                    }
                );
             }
          }
        }

        // Emit socket event to all unique recipients
        recipients.forEach(email => {
            socketService.emitNewCommentToUser(email, comment);
        });

      } catch(socketError) {
        console.error('[Socket/Notification Error] Failed to send media comment updates:', socketError);
      }
       // --- Notifications and Socket Emission END ---
      
    } catch (error) {
      console.error('Virhe media-kommentin lisäämisessä:', error);
       if (!res.headersSent) {
          // Handle specific business errors
          if (error instanceof Error && (error.message.includes('Vain tukihenkilöt') || error.message.includes('Et voi lisätä mediasisältöä'))) {
              return res.status(403).json({ error: error.message });
          }
          res.status(500).json({ error: 'Media-kommentin lisääminen epäonnistui' });
       }
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

      // Create notification for the assigned user
      await createNotification(
        user.id,
        'TICKET_ASSIGNED',
        `Sinulle on osoitettu uusi tiketti: ${updatedTicket.title}`,
        updatedTicket.id
      );

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

      // Create notification for the ticket creator
      await createNotification(
        ticket.createdById,
        'STATUS_CHANGED',
        `Tiketin "${ticket.title}" tila on muuttunut: OPEN`,
        ticket.id
      );

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
      } else if (status === TicketStatus.CLOSED && ticket.createdById === user.id) {
        // Tiketin luoja voi sulkea oman tikettinsä
        // Jatketaan suoraan eteenpäin
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

      // Create notification for the ticket creator
      await createNotification(
        ticket.createdById,
        'STATUS_CHANGED',
        `Tiketin "${ticket.title}" tila on muuttunut: ${status}`,
        ticket.id
      );

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

      // Päivitä tiketin käsittelijä ja lisää kommentit
      const [updatedTicket, userComment, systemComment] = await prisma.$transaction([
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
            content: `Tiketti siirretty tukihenkilöltä ${user.name} tukihenkilölle ${targetUser.name}`,
            ticket: { connect: { id: req.params.id } },
            author: { connect: { id: user.id } }
          },
          include: {
            author: true
          }
        }),
        prisma.comment.create({
          data: {
            content: `Tiketin käsittelijä vaihdettu: ${user.name} → ${targetUser.name}`,
            ticket: { connect: { id: req.params.id } },
            author: { connect: { id: systemUser.id } }
          },
          include: {
            author: true
          }
        })
      ]);

      // Lisää uudet kommentit tiketin tietoihin
      updatedTicket.comments.push(userComment, systemComment);

      // Create notification for the assigned user
      await createNotification(
        targetUserId,
        'TICKET_ASSIGNED',
        `Sinulle on osoitettu uusi tiketti: ${updatedTicket.title}`,
        updatedTicket.id
      );

      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error('Error transferring ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },


};
