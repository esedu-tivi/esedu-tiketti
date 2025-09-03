import { TextChannel } from 'discord.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { discordBot } from './bot.js';

// Default configuration - will be overridden by database settings
const DEFAULT_CLEANUP_INTERVAL = 60 * 60 * 1000; // Default: check every hour

class DiscordChannelCleanup {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private settings: any = null;

  /**
   * Start the cleanup service
   */
  public async start() {
    // Load settings first
    await this.loadSettings();
    
    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, DEFAULT_CLEANUP_INTERVAL);

    logger.info(`Discord channel cleanup service started (checking every ${DEFAULT_CLEANUP_INTERVAL / 1000 / 60} minutes)`);
  }

  /**
   * Stop the cleanup service
   */
  public stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Discord channel cleanup service stopped');
    }
  }

  /**
   * Load settings from database
   */
  private async loadSettings() {
    try {
      // Get settings from database
      let settings = await prisma.discordSettings.findFirst();
      
      // Create default settings if none exist
      if (!settings) {
        settings = await prisma.discordSettings.create({
          data: {
            cleanupTTLHours: 24,
            inactiveTTLHours: 48,
            statusRotationMs: 10000,
            showTicketStats: true,
            showCleanupTimer: true,
            defaultCategoryName: 'Discord',
            allowUserClose: true,
            enableIntegration: false
          }
        });
      }
      
      this.settings = settings;
      logger.info('Discord cleanup settings loaded');
    } catch (error) {
      logger.error('Error loading Discord cleanup settings:', error);
      // Use defaults if settings can't be loaded
      this.settings = {
        cleanupTTLHours: 24,
        inactiveTTLHours: 48
      };
    }
  }

  /**
   * Refresh settings on demand
   */
  public async refreshSettings() {
    logger.info('Discord cleanup service: Refreshing settings...');
    await this.loadSettings();
    
    // Note: The cleanup interval is fixed at 1 hour by design
    // Only the TTL values (how old tickets need to be) change
    // This is intentional - we don't want to change how often we check
    logger.info(`Discord cleanup settings refreshed - Cleanup TTL: ${this.settings?.cleanupTTLHours}h, Inactive TTL: ${this.settings?.inactiveTTLHours}h`);
  }

  /**
   * Run the cleanup process
   */
  private async runCleanup() {
    try {
      logger.info('Starting Discord channel cleanup...');
      
      // Refresh settings before each cleanup run
      await this.loadSettings();

      const client = discordBot.getClient();
      if (!client || !client.isReady()) {
        logger.warn('Discord bot is not ready or not running, skipping cleanup');
        return;
      }

      // Get all tickets with Discord channels
      const discordTickets = await prisma.ticket.findMany({
        where: {
          discordChannelId: { not: null }
        },
        include: {
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      let deletedCount = 0;
      let skippedCount = 0;

      for (const ticket of discordTickets) {
        if (!ticket.discordChannelId) continue;

        try {
          const shouldDelete = await this.shouldDeleteChannel(ticket);

          if (shouldDelete) {
            await this.deleteChannel(ticket.discordChannelId, ticket.id);
            deletedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          logger.error(`Error processing channel for ticket ${ticket.id}:`, error);
        }
      }

      // Also check for orphaned channels (channels without tickets in DB)
      await this.cleanupOrphanedChannels(client);
      
      logger.info(`Discord cleanup completed: ${deletedCount} channels deleted, ${skippedCount} skipped`);
    } catch (error) {
      logger.error('Error during Discord channel cleanup:', error);
    }
  }

  /**
   * Determine if a channel should be deleted based on ticket status and activity
   */
  private async shouldDeleteChannel(ticket: any): Promise<boolean> {
    const now = Date.now();
    
    // Get TTL values from settings (convert hours to milliseconds)
    const closedTicketTTL = (this.settings?.cleanupTTLHours || 24) * 60 * 60 * 1000;
    const inactiveTicketTTL = (this.settings?.inactiveTTLHours || 48) * 60 * 60 * 1000;

    // Check if ticket is closed and past TTL
    if (ticket.status === 'CLOSED') {
      const closedAt = ticket.updatedAt.getTime();
      const timeSinceClosed = now - closedAt;

      if (timeSinceClosed > closedTicketTTL) {
        logger.info(`Ticket ${ticket.id} has been closed for ${Math.round(timeSinceClosed / 1000 / 60 / 60)} hours`);
        return true;
      }
    }

    // Check if ticket is inactive (no comments) for too long
    const lastActivity = ticket.comments.length > 0 
      ? ticket.comments[0].createdAt.getTime()
      : ticket.createdAt.getTime();
    
    const timeSinceActivity = now - lastActivity;

    if (timeSinceActivity > inactiveTicketTTL) {
      logger.info(`Ticket ${ticket.id} has been inactive for ${Math.round(timeSinceActivity / 1000 / 60 / 60)} hours`);
      return true;
    }

    return false;
  }

  /**
   * Delete a Discord channel and update the ticket
   */
  private async deleteChannel(channelId: string, ticketId: string) {
    try {
      const client = discordBot.getClient();
      if (!client || !client.isReady()) {
        logger.warn(`Cannot delete channel ${channelId} - bot not ready`);
        return;
      }
      
      const channel = await client.channels.fetch(channelId) as TextChannel;

      if (channel) {
        // Send final message before deletion
        await channel.send({
          content: '🗑️ Tämä kanava poistetaan automaattisesti vanhentuneena. / This channel will be automatically deleted as expired.',
        });

        // Wait a moment for the message to be sent
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Delete the channel
        await channel.delete('Automated cleanup - ticket expired');
        logger.info(`Deleted Discord channel ${channelId} for ticket ${ticketId}`);

        // Update ticket to remove Discord channel reference
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { 
            discordChannelId: null,
            // Ensure ticket is closed if it wasn't already
            status: 'CLOSED'
          }
        });
      } else {
        logger.warn(`Channel ${channelId} not found, updating ticket ${ticketId}`);
        
        // Channel doesn't exist, just clean up the database reference
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { discordChannelId: null }
        });
      }
    } catch (error) {
      logger.error(`Failed to delete channel ${channelId}:`, error);
      
      // If channel is already deleted or we don't have permissions, clean up database
      if ((error as any).code === 10003 || (error as any).code === 50001) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { discordChannelId: null }
        });
      }
    }
  }

  /**
   * Clean up orphaned Discord channels (channels without corresponding tickets)
   */
  private async cleanupOrphanedChannels(client: any) {
    try {
      logger.info('Checking for orphaned Discord channels...');
      
      // Get all text channels in all guilds the bot is in
      const guilds = client.guilds.cache;
      let orphanedCount = 0;
      
      for (const guild of guilds.values()) {
        const channels = guild.channels.cache.filter((channel: any) => 
          channel.type === 0 && // Text channel
          channel.name.startsWith('tukipyyntö-') // Ticket channel pattern
        );
        
        for (const channel of channels.values()) {
          // Check if this channel has a corresponding ticket in the database
          const ticket = await prisma.ticket.findUnique({
            where: { discordChannelId: channel.id }
          });
          
          if (!ticket) {
            // This is an orphaned channel - use the same TTL as inactive tickets
            const channelAge = Date.now() - channel.createdTimestamp;
            // Use inactiveTTL from settings (default 48 hours, but for orphaned channels we'll use a minimum of 1 hour)
            const orphanedTTL = Math.min(
              (this.settings?.inactiveTTLHours || 48) * 60 * 60 * 1000,
              60 * 60 * 1000 // Minimum 1 hour for orphaned channels
            );
            
            if (channelAge > orphanedTTL) {
              try {
                // Check if channel has any messages (besides bot messages)
                const messages = await channel.messages.fetch({ limit: 10 });
                const userMessages = messages.filter((msg: any) => !msg.author.bot);
                
                if (userMessages.size === 0) {
                  // No user activity, safe to delete
                  await channel.send('🗑️ Tämä kanava poistetaan, koska tiketti ei valmistunut. / This channel will be deleted as the ticket was not completed.');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  await channel.delete('Orphaned channel - no ticket created');
                  orphanedCount++;
                  logger.info(`Deleted orphaned channel ${channel.id} (${channel.name})`);
                } else {
                  // Has user messages but no ticket, this shouldn't happen normally
                  logger.warn(`Orphaned channel ${channel.id} has user messages but no ticket`);
                }
              } catch (error) {
                logger.error(`Error deleting orphaned channel ${channel.id}:`, error);
              }
            }
          }
        }
      }
      
      if (orphanedCount > 0) {
        logger.info(`Cleaned up ${orphanedCount} orphaned Discord channels`);
      }
    } catch (error) {
      logger.error('Error cleaning up orphaned channels:', error);
    }
  }

  /**
   * Manually trigger cleanup for a specific ticket
   */
  public async cleanupTicket(ticketId: string) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (ticket?.discordChannelId) {
        await this.deleteChannel(ticket.discordChannelId, ticket.id);
        logger.info(`Manually cleaned up Discord channel for ticket ${ticketId}`);
      }
    } catch (error) {
      logger.error(`Error during manual cleanup of ticket ${ticketId}:`, error);
    }
  }
}

// Export singleton instance
export const discordChannelCleanup = new DiscordChannelCleanup();

// Export configuration for external use (default values)
export const DISCORD_CLEANUP_CONFIG = {
  CLEANUP_INTERVAL: DEFAULT_CLEANUP_INTERVAL
};