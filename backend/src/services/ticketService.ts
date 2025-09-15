import { Ticket, Prisma, TicketStatus, ResponseFormat } from '@prisma/client';
import logger from '../utils/logger.js';
import { CreateTicketDTO, UpdateTicketDTO } from '../types/index.js';
import fs from 'fs/promises'; // Added for file deletion
import path from 'path'; // Added for path construction
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';
import { discordChannelCleanup } from '../discord/channelCleanup.js';

// Check if Discord is configured
const isDiscordEnabled = process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID;

// Dynamically import Discord bot if enabled
let discordBot: any = null;
if (isDiscordEnabled) {
  import('../discord/bot.js').then(module => {
    discordBot = module.discordBot;
    logger.info('Discord bot integration loaded for ticket service');
  }).catch(err => {
    logger.warn('Discord bot not available for ticket service:', err.message);
  });
}

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
  // Bulk delete tickets
  bulkDeleteTickets: async (ticketIds: string[]) => {
    logger.info(`Starting bulk deletion of ${ticketIds.length} tickets`);
    
    if (!ticketIds || ticketIds.length === 0) {
      throw new ValidationError('No ticket IDs provided for bulk deletion');
    }

    // Limit to prevent accidental massive deletions
    const MAX_BULK_DELETE = 100;
    if (ticketIds.length > MAX_BULK_DELETE) {
      throw new ValidationError(`Cannot delete more than ${MAX_BULK_DELETE} tickets at once`);
    }

    // Get tickets to check their properties before deletion
    const ticketsToDelete = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      select: {
        id: true,
        isAiGenerated: true,
        discordChannelId: true,
        status: true,
        attachments: {
          select: {
            id: true,
            path: true
          }
        }
      }
    });

    if (ticketsToDelete.length !== ticketIds.length) {
      const foundIds = ticketsToDelete.map(t => t.id);
      const notFoundIds = ticketIds.filter(id => !foundIds.includes(id));
      logger.warn(`Some tickets not found for bulk deletion: ${notFoundIds.join(', ')}`);
    }

    // Collect all attachment files to delete
    const attachmentFiles: { id: string; path: string }[] = [];
    ticketsToDelete.forEach(ticket => {
      ticket.attachments.forEach(attachment => {
        attachmentFiles.push(attachment);
      });
    });

    // Use transaction for atomic bulk deletion
    const result = await prisma.$transaction(async (tx) => {
      // Delete attachment files
      if (attachmentFiles.length > 0) {
        logger.info(`Deleting ${attachmentFiles.length} attachment files for bulk deletion`);
        for (const attachment of attachmentFiles) {
          try {
            const filePath = getUploadPath(attachment.path);
            await fs.unlink(filePath);
            logger.info(`Deleted attachment file: ${filePath}`);
          } catch (fileError: any) {
            logger.error(`Failed to delete attachment file ${attachment.path}:`, fileError.message);
          }
        }
      }

      // Delete all related data in correct order
      const deletedAttachments = await tx.attachment.deleteMany({
        where: { ticketId: { in: ticketIds } }
      });
      logger.info(`Deleted ${deletedAttachments.count} attachments`);

      const deletedComments = await tx.comment.deleteMany({
        where: { ticketId: { in: ticketIds } }
      });
      logger.info(`Deleted ${deletedComments.count} comments`);

      const deletedNotifications = await tx.notification.deleteMany({
        where: { ticketId: { in: ticketIds } }
      });
      logger.info(`Deleted ${deletedNotifications.count} notifications`);

      // Delete AI-related data
      const deletedAIInteractions = await tx.aIAssistantInteraction.deleteMany({
        where: { ticketId: { in: ticketIds } }
      });
      logger.info(`Deleted ${deletedAIInteractions.count} AI interactions`);

      // Delete SupportAssistantConversation records
      const deletedSupportConversations = await tx.supportAssistantConversation.deleteMany({
        where: { ticketId: { in: ticketIds } }
      });
      logger.info(`Deleted ${deletedSupportConversations.count} support conversations`);

      // Delete KnowledgeArticles for AI-generated tickets
      const aiTicketIds = ticketsToDelete
        .filter(t => t.isAiGenerated)
        .map(t => t.id);
      
      if (aiTicketIds.length > 0) {
        // Find articles that reference these tickets
        const relatedArticles = await tx.knowledgeArticle.findMany({
          where: { 
            relatedTicketIds: { 
              hasSome: aiTicketIds 
            } 
          },
          select: { id: true }
        });

        if (relatedArticles.length > 0) {
          const articleIds = relatedArticles.map(a => a.id);
          await tx.knowledgeArticle.deleteMany({
            where: { id: { in: articleIds } }
          });
          logger.info(`Deleted ${relatedArticles.length} knowledge articles`);
        }
      }

      // Delete the tickets themselves
      const deletedTickets = await tx.ticket.deleteMany({
        where: { id: { in: ticketIds } }
      });
      logger.info(`Successfully deleted ${deletedTickets.count} tickets`);

      return {
        deletedCount: deletedTickets.count,
        deletedTicketIds: ticketsToDelete.map(t => t.id)
      };
    });

    // Clean up Discord channels if applicable
    const discordTickets = ticketsToDelete.filter(t => t.discordChannelId);
    if (discordTickets.length > 0 && isDiscordEnabled) {
      for (const ticket of discordTickets) {
        try {
          await discordChannelCleanup.cleanupTicket(ticket.id);
          logger.info(`Cleaned up Discord channel ${ticket.discordChannelId} for ticket ${ticket.id}`);
        } catch (error) {
          logger.error(`Failed to cleanup Discord channel for ticket ${ticket.id}:`, error);
        }
      }
    }

    // Update Discord bot status if available
    if (discordBot && result.deletedCount > 0) {
      try {
        const remainingTickets = await prisma.ticket.count({
          where: { status: { not: 'CLOSED' } }
        });
        if (discordBot.updateBotStatus) {
          await discordBot.updateBotStatus(remainingTickets);
          logger.debug('Discord bot status updated after bulk deletion');
        }
      } catch (error) {
        logger.warn('Failed to update Discord bot status after bulk deletion:', error);
      }
    }

    return result;
  },

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

    // Update Discord bot status if available
    if (discordBot && ticket.sourceType !== 'DISCORD') {
      // Only update for non-Discord tickets (Discord tickets already update)
      await discordBot.onTicketChanged('created', undefined, ticket.status);
      logger.debug('Discord bot status updated for new ticket creation');
    }

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
    // Get the old ticket status for cache update
    const oldTicket = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true }
    });

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

    const updatedTicket = await prisma.ticket.update({
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

    // Update Discord bot status if status changed
    if (discordBot && data.status && oldTicket && oldTicket.status !== data.status) {
      await discordBot.onTicketChanged('statusChanged', oldTicket.status, data.status);
      logger.debug(`Discord bot status updated for status change: ${oldTicket.status} -> ${data.status}`);
    }

    return updatedTicket;
  },

  // Poista tiketti, siihen liittyvät liitteet, kommentit ja KnowledgeArticle (jos AI-generoitu)
  deleteTicket: async (id: string) => {
    // Haetaan ensin tiketti, jotta tiedetään onko se AI-generoitu ja onko sillä Discord-kanava
    const ticketToDelete = await prisma.ticket.findUnique({
      where: { id },
      select: { 
        isAiGenerated: true,
        discordChannelId: true, // Tarvitaan Discord-kanavan poistoon
        status: true // Tarvitaan cache päivitykseen
      }
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

      // NEW STEP: Delete Discord channel if it exists
      // This must be done before deleting the ticket to access the discordChannelId
      if (ticketToDelete?.discordChannelId) {
        logger.info(`Ticket ${id} has Discord channel ${ticketToDelete.discordChannelId}. Attempting to delete it.`);
        try {
          await discordChannelCleanup.cleanupTicket(id);
          logger.info(`Successfully deleted Discord channel for ticket ${id}.`);
        } catch (error) {
          // Log error but don't fail the transaction - Discord channel might already be deleted
          logger.error(`Failed to delete Discord channel for ticket ${id}:`, error);
        }
      }

      // 6. Poista itse tiketti
      logger.info(`Deleting ticket ${id} itself within transaction.`);
      const deletedTicket = await tx.ticket.delete({
        where: { id }
      });
      logger.info(`Successfully deleted ticket ${id} and related data within transaction.`);
      return deletedTicket; // Palautetaan poistettu tiketti transaktiosta
    }).then(async result => {
      // Update Discord bot status after successful deletion
      if (discordBot && ticketToDelete?.status) {
        await discordBot.onTicketChanged('deleted', ticketToDelete.status, undefined);
        logger.debug(`Discord bot status updated for deleted ticket with status: ${ticketToDelete.status}`);
      }
      return result;
    });
  },

  // Päivitä tiketin tila
  updateTicketStatus: async (id: string, status: TicketStatus, additionalData?: any) => {
    // Get the old status for Discord bot update
    const oldTicket = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true }
    });

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { status, ...additionalData },
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

    // Update Discord bot status if status changed
    if (discordBot && oldTicket && oldTicket.status !== status) {
      await discordBot.onTicketChanged('statusChanged', oldTicket.status, status);
      logger.debug(`Discord bot status updated for status change: ${oldTicket.status} -> ${status}`);
    }

    return updatedTicket;
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