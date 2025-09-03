import { prisma } from '../lib/prisma.js';
import { DiscordSettings } from '@prisma/client';
import logger from '../utils/logger.js';

// Cache for settings to avoid frequent DB queries
let settingsCache: DiscordSettings | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

export const discordSettingsService = {
  /**
   * Get Discord settings (with caching)
   */
  async getSettings(): Promise<DiscordSettings> {
    // Check cache
    if (settingsCache && Date.now() < cacheExpiry) {
      return settingsCache;
    }

    // Get from database
    let settings = await prisma.discordSettings.findFirst();
    
    // Create default settings if none exist
    if (!settings) {
      logger.info('Creating default Discord settings');
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

    // Update cache
    settingsCache = settings;
    cacheExpiry = Date.now() + CACHE_TTL;
    
    return settings;
  },

  /**
   * Update Discord settings
   */
  async updateSettings(data: Partial<Omit<DiscordSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DiscordSettings> {
    const currentSettings = await this.getSettings();
    
    const updatedSettings = await prisma.discordSettings.update({
      where: { id: currentSettings.id },
      data
    });

    // Clear cache
    settingsCache = null;
    cacheExpiry = 0;

    logger.info('Discord settings updated', { data });
    
    return updatedSettings;
  },

  /**
   * Reset to default settings
   */
  async resetSettings(): Promise<DiscordSettings> {
    const currentSettings = await this.getSettings();
    
    const defaultSettings = await prisma.discordSettings.update({
      where: { id: currentSettings.id },
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

    // Clear cache
    settingsCache = null;
    cacheExpiry = 0;

    logger.info('Discord settings reset to defaults');
    
    return defaultSettings;
  },

  /**
   * Get Discord users with statistics
   */
  async getDiscordUsers(includeStats: boolean = true) {
    const users = await prisma.user.findMany({
      where: {
        isDiscordUser: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        discordId: true,
        discordUsername: true,
        isBlocked: true,
        createdAt: true,
        ...(includeStats ? {
          tickets: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              tickets: true,
              comments: true
            }
          }
        } : {})
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return users;
  },

  /**
   * Get Discord integration statistics
   */
  async getStatistics() {
    const [
      totalUsers,
      totalTickets,
      activeChannels,
      recentActivity
    ] = await Promise.all([
      // Total Discord users
      prisma.user.count({
        where: { isDiscordUser: true }
      }),
      
      // Total Discord tickets
      prisma.ticket.count({
        where: { sourceType: 'DISCORD' }
      }),
      
      // Active Discord channels (open/in_progress tickets)
      prisma.ticket.count({
        where: {
          sourceType: 'DISCORD',
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          },
          discordChannelId: {
            not: null
          }
        }
      }),
      
      // Recent activity (last 7 days)
      prisma.ticket.findMany({
        where: {
          sourceType: 'DISCORD',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true,
              discordUsername: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
    ]);

    // Calculate average response time for Discord tickets
    const discordTicketsWithComments = await prisma.ticket.findMany({
      where: {
        sourceType: 'DISCORD',
        comments: {
          some: {
            isFromDiscord: false // Support response
          }
        }
      },
      include: {
        comments: {
          where: {
            isFromDiscord: false
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 1
        }
      }
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    discordTicketsWithComments.forEach(ticket => {
      if (ticket.comments[0]) {
        const responseTime = ticket.comments[0].createdAt.getTime() - ticket.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const avgResponseTimeMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);

    // Get daily activity for the past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyActivity: { [key: string]: number } = {};
    
    // Initialize all days with 0
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyActivity[dateKey] = 0;
    }
    
    // Get tickets created in last 7 days grouped by day
    const ticketsLast7Days = await prisma.ticket.findMany({
      where: {
        sourceType: 'DISCORD',
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true
      }
    });
    
    // Count tickets per day
    ticketsLast7Days.forEach(ticket => {
      const dateKey = ticket.createdAt.toISOString().split('T')[0];
      if (dailyActivity[dateKey] !== undefined) {
        dailyActivity[dateKey]++;
      }
    });
    
    // Convert to array format for chart
    const activityChart = Object.entries(dailyActivity)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date,
        count,
        dayName: new Date(date).toLocaleDateString('fi', { weekday: 'short' })
      }));

    return {
      totalUsers,
      totalTickets,
      activeChannels,
      avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
      recentActivity,
      activityChart,
      lastUpdated: new Date()
    };
  },

  /**
   * Toggle block status for a Discord user
   */
  async toggleBlockUser(userId: string, isBlocked: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isDiscordUser) {
      throw new Error('User not found or not a Discord user');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked },
      select: {
        id: true,
        name: true,
        discordUsername: true,
        isBlocked: true
      }
    });

    logger.info(`Discord user ${userId} ${isBlocked ? 'blocked' : 'unblocked'}`);
    return updatedUser;
  },

  /**
   * Delete a Discord user (with options for ticket handling)
   */
  async deleteDiscordUser(userId: string, deleteTickets: boolean = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tickets: true
      }
    });

    if (!user || !user.isDiscordUser) {
      throw new Error('User not found or not a Discord user');
    }

    if (deleteTickets) {
      // Get all tickets created by this user with Discord channel IDs
      const userTickets = await prisma.ticket.findMany({
        where: { createdById: userId },
        select: { 
          id: true,
          discordChannelId: true,
          title: true
        }
      });
      
      const ticketIds = userTickets.map(t => t.id);
      
      if (ticketIds.length > 0) {
        // First, try to delete Discord channels if bot is available
        const discordBot = (global as any).discordBot;
        if (discordBot && discordBot.client && discordBot.client.isReady()) {
          for (const ticket of userTickets) {
            if (ticket.discordChannelId) {
              try {
                const channel = await discordBot.client.channels.fetch(ticket.discordChannelId);
                if (channel && channel.deletable) {
                  await channel.delete(`Käyttäjä ${user.name || user.discordUsername} poistettu järjestelmästä`);
                  logger.info(`Deleted Discord channel ${ticket.discordChannelId} for ticket ${ticket.id}`);
                }
              } catch (error) {
                logger.warn(`Could not delete Discord channel ${ticket.discordChannelId}:`, error);
              }
            }
          }
        }
        
        // Delete all related data in the correct order due to foreign key constraints
        
        // 1. Delete notifications related to these tickets
        await prisma.notification.deleteMany({
          where: { ticketId: { in: ticketIds } }
        });
        
        // 2. Delete attachments
        await prisma.attachment.deleteMany({
          where: { ticketId: { in: ticketIds } }
        });
        
        // 3. Delete comments
        await prisma.comment.deleteMany({
          where: { ticketId: { in: ticketIds } }
        });
        
        // 4. Delete AI assistant interactions
        await prisma.aIAssistantInteraction.deleteMany({
          where: { ticketId: { in: ticketIds } }
        });
        
        // 5. Finally delete the tickets
        await prisma.ticket.deleteMany({
          where: { id: { in: ticketIds } }
        });
      }
    } else if (user.tickets.length > 0) {
      // If user has tickets and we're not deleting them, prevent deletion
      throw new Error('Cannot delete Discord user with existing tickets. Delete tickets first or use deleteTickets option.');
    }

    // Delete any remaining comments by this user (on other tickets)
    await prisma.comment.deleteMany({
      where: { authorId: userId }
    });
    
    // Delete any notifications for this user
    await prisma.notification.deleteMany({
      where: { userId: userId }
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    logger.info(`Discord user ${userId} deleted`, { deleteTickets });
  },

  /**
   * Check if Discord integration is enabled
   */
  async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.enableIntegration;
  }
};