import { Ticket, Prisma, TicketStatus, ResponseFormat } from '@prisma/client';
import logger from '../utils/logger.js';
import { CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';
import fs from 'fs/promises'; // Added for file deletion
import path from 'path'; // Added for path construction
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';

// Helper function to get absolute path for uploads
const getUploadPath = (relativePath: string): string => {
  // Assuming uploads are stored relative to the project root or a specific base directory
  // Adjust this logic based on your actual file storage setup
  // Example: Files are in `backend/uploads/` relative to where the server is run from.
  // If relativePath is like `/uploads/image.png`, we might need to strip `/uploads/`
  const filename = path.basename(relativePath); 
  // IMPORTANT: Determine the correct absolute base path for your uploads directory
  const uploadsBaseDir = path.resolve(process.cwd(), 'uploads'); 
  return path.join(uploadsBaseDir, filename);
};

export const ticketService = {
  // Hae kaikki tiketit
  getAllTickets: async () => {
    return prisma.ticket.findMany({
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
  },

  // Hae yksittäinen tiketti
  getTicketById: async (id: string) => {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: true,
        assignedTo: true,
        category: true,
        comments: {
          include: {
            author: true
          }
        },
        attachments: true
      }
    });
  },

  // Luo uusi tiketti
  createTicket: async (data: CreateTicketDTO, userId: string) => {
    // Create the ticket with its basic information
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        ...(data.device && { device: data.device }),
        ...(data.additionalInfo && { additionalInfo: data.additionalInfo }),
        ...(data.userProfile && { userProfile: data.userProfile }),
        priority: data.priority,
        responseFormat: data.responseFormat || 'TEKSTI',
        createdBy: {
          connect: { id: userId }
        },
        category: {
          connect: { id: data.categoryId }
        }
      },
      include: {
        createdBy: true,
        category: true
      }
    });

    // If there are attachments, create them and link to the ticket
    if (data.attachments && data.attachments.length > 0) {
      for (const attachment of data.attachments) {
        await prisma.attachment.create({
          data: {
            filename: attachment.filename,
            path: attachment.path,
            mimetype: attachment.mimetype,
            size: attachment.size,
            ticket: {
              connect: { id: ticket.id }
            }
          }
        });
      }

      // Re-fetch the ticket with its related data
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          createdBy: true,
          category: true
        }
      });

      // Also fetch the attachments separately
      const attachments = await prisma.attachment.findMany({
        where: {
          ticketId: ticket.id
        }
      });

      // Return the ticket with attachments
      return {
        ...updatedTicket,
        attachments
      };
    }

    return ticket;
  },

  // Päivitä tiketti
  updateTicket: async (id: string, data: UpdateTicketDTO) => {
    const updateData: any = { ...data };
    
    if (data.assignedToId) {
      updateData.assignedTo = { connect: { id: data.assignedToId } };
      delete updateData.assignedToId;
    }
    
    if (data.categoryId) {
      updateData.category = { connect: { id: data.categoryId } };
      delete updateData.categoryId;
    }

    if (data.responseFormat) {
      updateData.responseFormat = data.responseFormat;
    }

    return prisma.ticket.update({
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
    });
  },

  // Poista tiketti, siihen liittyvät liitteet, kommentit ja KnowledgeArticle (jos AI-generoitu)
  deleteTicket: async (id: string) => {
    // Haetaan ensin tiketti, jotta tiedetään onko se AI-generoitu
    const ticketToDelete = await prisma.ticket.findUnique({
      where: { id },
      select: { isAiGenerated: true } // Valitaan vain tarvittava kenttä
    });

    // Käytetään transaktiota varmistamaan, että kaikki poistot onnistuvat tai mikään ei onnistu
    logger.info(`Attempting to delete ticket ${id} and related data within a transaction.`);
    return prisma.$transaction(async (tx) => {
      
      // 1. Käsittele ja poista tikettiin liittyvät liitteet (tiedostot + tietueet)
      const attachmentsToDelete = await tx.attachment.findMany({
        where: { ticketId: id },
        select: { id: true, path: true } // Select path needed for file deletion
      });
      
      if (attachmentsToDelete.length > 0) {
        logger.info(`Found ${attachmentsToDelete.length} attachments for ticket ${id}. Attempting file deletion...`);
        for (const attachment of attachmentsToDelete) {
          try {
            const filePath = getUploadPath(attachment.path); // Use helper to get absolute path
            await fs.unlink(filePath);
            logger.info(`Successfully deleted attachment file: ${filePath}`);
          } catch (fileError: any) {
            // Log file deletion errors but don't stop the transaction
            logger.error(`Failed to delete attachment file ${attachment.path} for attachment ID ${attachment.id}:`, fileError.message);
            // Consider more robust error handling/logging here if needed
          }
        }
        
        // Delete attachment records from DB
        const deletedAttachments = await tx.attachment.deleteMany({
          where: {
            ticketId: id
          }
        });
        logger.info(`Deleted ${deletedAttachments.count} attachment records from DB for ticket ${id}.`);
      } else {
        logger.info(`No attachments found for ticket ${id}.`);
      }

      // 2. Poista tikettiin liittyvät kommentit
      const deletedComments = await tx.comment.deleteMany({
        where: {
          ticketId: id
        }
      });
      logger.info(`Deleted ${deletedComments.count} comments related to ticket ${id}.`);

      // 3. Poista tikettiin liittyvät ilmoitukset
      const deletedNotifications = await tx.notification.deleteMany({
        where: {
          ticketId: id
        }
      });
      logger.info(`Deleted ${deletedNotifications.count} notifications related to ticket ${id}.`);

      // 4. Poista tikettiin liittyvät AI-interaktiot
      const deletedAIInteractions = await tx.aIAssistantInteraction.deleteMany({
        where: {
          ticketId: id
        }
      });
      logger.info(`Deleted ${deletedAIInteractions.count} AI interactions related to ticket ${id}.`);

      // 5. Jos tiketti on AI-generoitu, poista siihen liittyvä KnowledgeArticle
      if (ticketToDelete?.isAiGenerated) {
        logger.info(`Ticket ${id} is AI-generated. Attempting to delete related KnowledgeArticle.`);
        const relatedArticles = await tx.knowledgeArticle.findMany({
          where: { relatedTicketIds: { has: id } },
          select: { id: true } // Valitaan vain ID
        });

        if (relatedArticles.length > 0) {
          const articleIdsToDelete = relatedArticles.map(article => article.id);
          logger.info(`Found ${relatedArticles.length} KnowledgeArticle(s) to delete with IDs: ${articleIdsToDelete.join(', ')}`);
          await tx.knowledgeArticle.deleteMany({ where: { id: { in: articleIdsToDelete } } });
        } else {
          logger.info(`No related KnowledgeArticle found for ticket ${id}.`);
        }
      } else {
         logger.info(`Ticket ${id} is not AI-generated. Skipping KnowledgeArticle deletion.`);
      }

      // NEW STEP: Poista tikettiin liittyvät SupportAssistantConversation-tietueet
      // This step is added to address the foreign key constraint P2003
      // when deleting tickets that have associated support assistant conversations.
      logger.info(`Attempting to delete SupportAssistantConversation records for ticket ${id}.`);
      const deletedSupportConversations = await tx.supportAssistantConversation.deleteMany({
        where: {
          ticketId: id
        }
      });
      logger.info(`Deleted ${deletedSupportConversations.count} SupportAssistantConversation records related to ticket ${id}.`);

      // 6. Poista itse tiketti
      logger.info(`Deleting ticket ${id} itself within transaction.`);
      const deletedTicket = await tx.ticket.delete({
        where: { id }
      });
      logger.info(`Successfully deleted ticket ${id} and related data within transaction.`);
      return deletedTicket; // Palautetaan poistettu tiketti transaktiosta
    });
  },

  // Päivitä tiketin tila
  updateTicketStatus: async (id: string, status: TicketStatus) => {
    return await prisma.ticket.update({
      where: { id },
      data: { status },
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
      }
    });
  },

  // Aseta tiketin käsittelijä
  assignTicket: async (id: string, assignedToId: string) => {
    return await prisma.ticket.update({
      where: { id },
      data: {
        assignedToId,
        status: TicketStatus.IN_PROGRESS
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
      }
    });
  },

  // Lisää kommentti tikettiin
  addCommentToTicket: async (ticketId: string, content: string, userId: string) => {
    // Haetaan tiketti ja tarkistetaan sen tila
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        comments: true,
        assignedTo: true
      }
    });

    if (!ticket) {
      throw new NotFoundError('Tikettiä ei löydy');
    }

    // Haetaan käyttäjä
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('Käyttäjää ei löydy');
    }

    // Tarkistetaan kommentointioikeudet
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      throw new ValidationError('Tiketti on ratkaistu tai suljettu - kommentointi ei ole mahdollista');
    }

    // Jos käyttäjä on tiketin luoja, saa aina kommentoida (paitsi jos tiketti on suljettu/ratkaistu)
    if (ticket.createdById === userId) {
      return await prisma.comment.create({
        data: {
          content,
          ticket: { connect: { id: ticketId } },
          author: { connect: { id: userId } }
        },
        include: {
          author: true
        }
      });
    }

    // Jos käyttäjä on tukihenkilö tai admin
    if (user.role === 'SUPPORT' || user.role === 'ADMIN') {
      // Admin voi aina kommentoida
      if (user.role === 'ADMIN') {
        return await prisma.comment.create({
          data: {
            content,
            ticket: { connect: { id: ticketId } },
            author: { connect: { id: userId } }
          },
          include: {
            author: true
          }
        });
      }

      // Tukihenkilö voi kommentoida vain jos tiketti on käsittelyssä ja hän on tiketin käsittelijä
      if (ticket.status === 'OPEN') {
        throw new AuthorizationError('Ota tiketti ensin käsittelyyn kommentoidaksesi');
      }

      if (ticket.status === 'IN_PROGRESS' && ticket.assignedToId !== userId) {
        throw new AuthorizationError('Vain tiketin käsittelijä voi kommentoida');
      }
    }

    // Jos kaikki tarkistukset menivät läpi, luodaan kommentti
    return await prisma.comment.create({
      data: {
        content,
        ticket: { connect: { id: ticketId } },
        author: { connect: { id: userId } }
      },
      include: {
        author: true
      }
    });
  }
};