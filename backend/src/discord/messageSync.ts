import { TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { getSocketService } from '../services/socketService.js';
import { discordBot } from './bot.js';
import path from 'path';
import fs from 'fs/promises';

// Store active message collectors for each channel
const activeCollectors = new Map<string, any>();

/**
 * Restore Discord sync for all active tickets with Discord channels
 * Called on server startup
 */
export async function restoreDiscordSync() {
  try {
    logger.info('Restoring Discord sync for existing tickets...');
    
    // Get Discord client
    const client = discordBot.getClient();
    if (!client.isReady()) {
      logger.warn('Discord bot is not ready, skipping sync restoration');
      return;
    }

    // Find all tickets with Discord channels that are not closed
    const activeDiscordTickets = await prisma.ticket.findMany({
      where: {
        discordChannelId: { not: null },
        status: { not: 'CLOSED' }
      },
      select: {
        id: true,
        discordChannelId: true
      }
    });

    logger.info(`Found ${activeDiscordTickets.length} active Discord tickets to restore`);

    // Setup sync for each active ticket
    for (const ticket of activeDiscordTickets) {
      try {
        if (!ticket.discordChannelId) continue;
        
        const channel = await client.channels.fetch(ticket.discordChannelId) as TextChannel;
        if (channel) {
          await setupChannelSync(channel, ticket.id);
          logger.info(`Restored sync for ticket ${ticket.id} in channel ${ticket.discordChannelId}`);
        } else {
          logger.warn(`Channel ${ticket.discordChannelId} not found for ticket ${ticket.id}`);
        }
      } catch (error) {
        logger.error(`Error restoring sync for ticket ${ticket.id}:`, error);
      }
    }

    logger.info('Discord sync restoration completed');
  } catch (error) {
    logger.error('Error restoring Discord sync:', error);
  }
}

/**
 * Setup bidirectional message sync between Discord channel and web app
 */
export async function setupChannelSync(channel: TextChannel, ticketId: string) {
  // Don't create duplicate collectors
  if (activeCollectors.has(channel.id)) {
    logger.warn(`Collector already exists for channel ${channel.id}`);
    return;
  }

  // Create message collector for this channel
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot, // Ignore bot messages
  });

  activeCollectors.set(channel.id, collector);

  collector.on('collect', async (message) => {
    try {
      // Get or create Discord user
      const discordUser = await getOrCreateDiscordUser(message.author, channel.guild.id);

      // Handle attachments
      let mediaUrl = null;
      let mediaType = null;
      
      if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment) {
          mediaUrl = attachment.url;
          mediaType = attachment.contentType?.startsWith('image/') ? 'image' : 
                     attachment.contentType?.startsWith('video/') ? 'video' : null;
        }
      }

      // Create comment in database
      const comment = await prisma.comment.create({
        data: {
          ticketId: ticketId,
          content: message.content || '(Liite / Attachment)',
          authorId: discordUser.id,
          mediaUrl,
          mediaType,
          discordMessageId: message.id,
          isFromDiscord: true,
        },
        include: {
          author: true,
        }
      });

      // Notify web app via WebSocket - emit newComment event for real-time sync
      const socketService = getSocketService();
      
      // Get ticket details to find all relevant users
      const ticketWithUsers = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          createdBy: true,
          assignedTo: true
        }
      });

      // Emit to all relevant users
      const recipients = new Set<string>();
      if (ticketWithUsers?.createdBy?.email) {
        recipients.add(ticketWithUsers.createdBy.email);
      }
      if (ticketWithUsers?.assignedTo?.email) {
        recipients.add(ticketWithUsers.assignedTo.email);
      }

      // Emit newComment event (same as regular comments)
      recipients.forEach(email => {
        socketService.emitNewCommentToUser(email, {
          ticketId,
          comment: {
            id: comment.id,
            content: comment.content,
            author: {
              id: comment.author.id,
              name: comment.author.name,
              email: comment.author.email,
            },
            createdAt: comment.createdAt,
            mediaUrl: comment.mediaUrl,
            mediaType: comment.mediaType,
            isFromDiscord: true,
          }
        });
      });

      // Also broadcast general ticket update
      socketService.broadcastTicketUpdate(ticketId, {
        type: 'NEW_COMMENT',
        comment: {
          id: comment.id,
          content: comment.content,
          author: {
            id: comment.author.id,
            name: comment.author.name,
            email: comment.author.email,
          },
          createdAt: comment.createdAt,
          mediaUrl: comment.mediaUrl,
          mediaType: comment.mediaType,
          isFromDiscord: true,
        }
      });

      logger.info(`Discord message synced to ticket ${ticketId} from user ${message.author.username}`);
    } catch (error) {
      logger.error('Error syncing Discord message to web app:', error);
      
      // Send error message to Discord (optional)
      await channel.send('⚠️ Viesti tallennettiin, mutta synkronointi epäonnistui / Message saved but sync failed');
    }
  });

  collector.on('end', (_collected, reason) => {
    activeCollectors.delete(channel.id);
    logger.info(`Message collector ended for channel ${channel.id}, reason: ${reason}`);
  });

  logger.info(`Channel sync setup for ticket ${ticketId} in channel ${channel.id}`);
}

/**
 * Send a message from web app to Discord channel
 */
export async function sendMessageToDiscord(
  ticketId: string,
  message: string,
  authorName: string,
  authorRole?: string,
  mediaUrl?: string | null,
  mediaType?: string | null
) {
  try {
    // Get ticket with Discord channel ID
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { discordChannelId: true }
    });

    if (!ticket?.discordChannelId) {
      logger.debug(`Ticket ${ticketId} has no Discord channel`);
      return;
    }

    // Get Discord client
    const client = discordBot.getClient();
    if (!client.isReady()) {
      logger.warn('Discord bot is not ready');
      return;
    }

    // Fetch the channel
    const channel = await client.channels.fetch(ticket.discordChannelId) as TextChannel;
    if (!channel) {
      logger.error(`Discord channel ${ticket.discordChannelId} not found`);
      return;
    }

    // Create embed for support message
    const roleColor = authorRole === 'ADMIN' ? 0xff0000 : 
                     authorRole === 'SUPPORT' ? 0x0099ff : 0x808080;
    
    const roleText = authorRole === 'ADMIN' ? 'Admin' :
                    authorRole === 'SUPPORT' ? 'Tuki' : 'Staff';

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: `${authorName} (${roleText})`,
        iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' // Default avatar
      })
      .setDescription(message || '(Media)')
      .setColor(roleColor)
      .setTimestamp();

    // Handle media files - send as attachments for local development
    const files = [];
    let attachmentBuilder = null;
    
    if (mediaUrl && mediaUrl.startsWith('/uploads/')) {
      try {
        // Extract filename from URL
        const filename = mediaUrl.replace('/uploads/', '');
        const filePath = path.join(process.cwd(), 'uploads', filename);
        
        // Check if file exists
        try {
          await fs.access(filePath);
          
          // Create attachment
          attachmentBuilder = new AttachmentBuilder(filePath, { name: filename });
          files.push(attachmentBuilder);
          
          // For images, set the attachment in the embed
          if (mediaType?.startsWith('image/')) {
            embed.setImage(`attachment://${filename}`);
          }
          
          logger.info(`Attaching file from ${filePath} for Discord`);
        } catch (err) {
          logger.error(`File not found: ${filePath}`);
          // Fallback to URL method for production environments
          const port = process.env.PORT || 3001;
          const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
          const absoluteMediaUrl = `${baseUrl}${mediaUrl}`;
          
          if (mediaType?.startsWith('image/')) {
            embed.setImage(absoluteMediaUrl);
          } else if (mediaType?.startsWith('video/')) {
            embed.addFields({ name: '📹 Video', value: absoluteMediaUrl });
          }
        }
      } catch (error) {
        logger.error('Error processing media file:', error);
      }
    }

    // Prepare message payload with files if any
    const messagePayload: any = { 
      embeds: [embed],
      ...(files.length > 0 && { files })
    };

    await channel.send(messagePayload);

    logger.info(`Message sent to Discord channel ${ticket.discordChannelId} for ticket ${ticketId}`);
  } catch (error) {
    logger.error('Error sending message to Discord:', error);
  }
}

/**
 * Send status update to Discord channel
 */
export async function sendStatusUpdateToDiscord(
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  updatedBy: string
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { discordChannelId: true }
    });

    if (!ticket?.discordChannelId) return;

    const client = discordBot.getClient();
    if (!client.isReady()) return;

    const channel = await client.channels.fetch(ticket.discordChannelId) as TextChannel;
    if (!channel) return;

    const statusColors: Record<string, number> = {
      'OPEN': 0x00ff00,
      'IN_PROGRESS': 0xffff00,
      'RESOLVED': 0x0099ff,
      'CLOSED': 0x808080,
    };

    const statusTranslations: Record<string, string> = {
      'OPEN': 'Avoin',
      'IN_PROGRESS': 'Käsittelyssä',
      'RESOLVED': 'Ratkaistu',
      'CLOSED': 'Suljettu',
    };

    const embed = new EmbedBuilder()
      .setTitle('📊 Tilan päivitys')
      .addFields(
        { name: 'Edellinen', value: statusTranslations[oldStatus] || oldStatus, inline: true },
        { name: 'Uusi', value: statusTranslations[newStatus] || newStatus, inline: true },
        { name: 'Päivittäjä', value: updatedBy, inline: true }
      )
      .setColor(statusColors[newStatus] || 0x808080)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Handle CLOSED and RESOLVED statuses - remove send permissions
    if (newStatus === 'CLOSED' || newStatus === 'RESOLVED') {
      const isResolved = newStatus === 'RESOLVED';
      
      const statusEmbed = new EmbedBuilder()
        .setTitle(isResolved ? '✅ Tiketti ratkaistu' : '🔒 Tiketti suljettu')
        .setDescription(
          isResolved 
            ? 'Tiketti on merkitty ratkaistuksi. Et voi enää lähettää viestejä.'
            : 'Tiketti on suljettu. Kanava poistetaan 24 tunnin kuluttua.'
        )
        .setColor(isResolved ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      await channel.send({ embeds: [statusEmbed] });

      // Stop the message collector for this channel
      const collector = activeCollectors.get(channel.id);
      if (collector) {
        collector.stop(isResolved ? 'ticket_resolved' : 'ticket_closed');
      }

      // Remove user's permission to send messages (but they can still view)
      try {
        // Get the ticket to find the creator
        const ticket = await prisma.ticket.findUnique({
          where: { discordChannelId: channel.id },
          include: { createdBy: true }
        });

        if (ticket?.createdBy?.discordId) {
          await channel.permissionOverwrites.edit(ticket.createdBy.discordId, {
            SendMessages: false,
            ViewChannel: true
          });
          logger.info(`Removed send permissions for user ${ticket.createdBy.discordId} in channel ${channel.id} (status: ${newStatus})`);
        }
      } catch (error) {
        logger.error('Error removing permissions:', error);
      }

      // Channel will be automatically deleted by the cleanup service after 24 hours for closed tickets
    } else if ((newStatus === 'OPEN' || newStatus === 'IN_PROGRESS') && (oldStatus === 'CLOSED' || oldStatus === 'RESOLVED')) {
      // Ticket is being reopened - restore permissions and sync
      logger.info(`Ticket reopened from ${oldStatus} to ${newStatus}, restoring Discord permissions`);
      
      try {
        const ticket = await prisma.ticket.findUnique({
          where: { discordChannelId: channel.id },
          include: { createdBy: true }
        });

        if (ticket?.createdBy?.discordId) {
          // Restore send permissions using the set method for reliability
          try {
            await channel.permissionOverwrites.set([
              {
                id: channel.guild.id, // @everyone stays denied
                deny: ['ViewChannel'] as any,
              },
              {
                id: ticket.createdBy.discordId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] as any, // Restore all permissions
              },
              {
                id: discordBot.getClient().user!.id,
                allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ManageRoles', 'ReadMessageHistory'] as any,
              },
            ]);
            logger.info(`Restored all permissions for user ${ticket.createdBy.discordId} in channel ${channel.id}`);
            
            // Send a message to notify the user
            const reopenEmbed = new EmbedBuilder()
              .setTitle('🔓 Tiketti avattu uudelleen')
              .setDescription('Voit nyt jatkaa keskustelua.')
              .setColor(0x00ff00)
              .setTimestamp();
            
            await channel.send({ embeds: [reopenEmbed] });
          } catch (permError) {
            logger.error('Failed to restore permissions:', permError);
            // Try simpler edit method as fallback
            await channel.permissionOverwrites.edit(ticket.createdBy.discordId, {
              SendMessages: true,
              ViewChannel: true,
              ReadMessageHistory: true
            });
          }
        }

        // Re-setup the message sync if it was stopped
        const collector = activeCollectors.get(channel.id);
        if (!collector) {
          await setupChannelSync(channel, ticket!.id);
          logger.info(`Re-established sync for reopened ticket ${ticket!.id}`);
        }
      } catch (error) {
        logger.error('Error restoring permissions on reopen:', error);
      }
    }

  } catch (error) {
    logger.error('Error sending status update to Discord:', error);
  }
}

/**
 * Helper function to get or create Discord user
 */
async function getOrCreateDiscordUser(discordUser: any, serverId: string) {
  const email = `discord_${discordUser.id}@discord.local`;
  
  return await prisma.user.upsert({
    where: { email },
    update: {
      name: discordUser.username,
      discordUsername: discordUser.username,
    },
    create: {
      email,
      name: discordUser.username,
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordServerId: serverId,
      isDiscordUser: true,
      role: 'USER',
    },
  });
}