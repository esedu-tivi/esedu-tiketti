import { Request, Response } from 'express';
import { discordSettingsService } from '../services/discordSettingsService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { z } from 'zod';
import logger from '../utils/logger.js';

// Validation schema for settings update
const updateSettingsSchema = z.object({
  cleanupTTLHours: z.number().min(1).max(168).optional(), // 1 hour to 1 week
  inactiveTTLHours: z.number().min(1).max(336).optional(), // 1 hour to 2 weeks
  statusRotationMs: z.number().min(5000).max(60000).optional(), // 5 seconds to 1 minute
  showTicketStats: z.boolean().optional(),
  showCleanupTimer: z.boolean().optional(),
  defaultCategoryName: z.string().min(1).max(50).optional(),
  allowUserClose: z.boolean().optional(),
  enableIntegration: z.boolean().optional(),
  broadcastChannelId: z.string().nullable().optional(), // Discord channel ID for broadcasts
  enableBroadcast: z.boolean().optional() // Enable/disable broadcast feature
});

export const discordSettingsController = {
  /**
   * Check if Discord bot is configured
   */
  async checkConfiguration(req: Request, res: Response) {
    try {
      const isConfigured = !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID);
      const hasToken = !!process.env.DISCORD_BOT_TOKEN;
      const hasClientId = !!process.env.DISCORD_CLIENT_ID;
      
      return successResponse(res, { 
        isConfigured,
        details: {
          hasToken,
          hasClientId
        }
      }, 'Discord configuration status');
    } catch (error) {
      logger.error('Error checking Discord configuration:', error);
      return errorResponse(res, 'Failed to check Discord configuration', 500);
    }
  },

  /**
   * Get Discord settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const settings = await discordSettingsService.getSettings();
      return successResponse(res, { settings }, 'Discord settings retrieved');
    } catch (error) {
      logger.error('Error fetching Discord settings:', error);
      return errorResponse(res, 'Failed to fetch Discord settings', 500);
    }
  },

  /**
   * Update Discord settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = updateSettingsSchema.parse(req.body);
      
      const settings = await discordSettingsService.updateSettings(validatedData);
      
      // If Discord bot is running, refresh its settings immediately
      const discordBot = (global as any).discordBot;
      logger.info(`Discord controller: Checking for bot instance...`, { botExists: !!discordBot });
      
      if (discordBot && discordBot.refreshSettings) {
        try {
          logger.info('Discord controller: Calling bot.refreshSettings()...');
          await discordBot.refreshSettings();
          logger.info('Discord controller: Bot settings refreshed successfully');
        } catch (error) {
          logger.error('Discord controller: Failed to refresh bot settings:', error);
          // Continue anyway - the bot will pick up changes on next cycle
        }
      } else {
        logger.warn('Discord controller: Bot not available or refreshSettings method missing');
      }
      
      // Also refresh cleanup service settings
      // Try global instance first, fallback to import
      let cleanupService = (global as any).discordChannelCleanup;
      if (!cleanupService) {
        const { discordChannelCleanup } = await import('../discord/channelCleanup.js');
        cleanupService = discordChannelCleanup;
      }
      
      logger.info('Discord controller: Checking for cleanup service...', { serviceExists: !!cleanupService });
      
      if (cleanupService && cleanupService.refreshSettings) {
        try {
          logger.info('Discord controller: Calling cleanup.refreshSettings()...');
          await cleanupService.refreshSettings();
          logger.info('Discord controller: Cleanup settings refreshed successfully');
        } catch (error) {
          logger.error('Discord controller: Failed to refresh cleanup settings:', error);
        }
      } else {
        logger.warn('Discord controller: Cleanup service not available');
      }
      
      return successResponse(res, { settings }, 'Discord settings updated');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse(res, 'Invalid settings data', 400, undefined, { errors: error.errors });
      }
      logger.error('Error updating Discord settings:', error);
      return errorResponse(res, 'Failed to update Discord settings', 500);
    }
  },

  /**
   * Reset Discord settings to defaults
   */
  async resetSettings(req: Request, res: Response) {
    try {
      const settings = await discordSettingsService.resetSettings();
      
      // If Discord bot is running, refresh its settings immediately
      const discordBot = (global as any).discordBot;
      logger.info(`Discord controller (reset): Checking for bot instance...`, { botExists: !!discordBot });
      
      if (discordBot && discordBot.refreshSettings) {
        try {
          logger.info('Discord controller (reset): Calling bot.refreshSettings()...');
          await discordBot.refreshSettings();
          logger.info('Discord controller (reset): Bot settings refreshed after reset');
        } catch (error) {
          logger.error('Discord controller (reset): Failed to refresh bot settings:', error);
        }
      } else {
        logger.warn('Discord controller (reset): Bot not available');
      }
      
      // Also refresh cleanup service settings
      // Try global instance first, fallback to import
      let cleanupService = (global as any).discordChannelCleanup;
      if (!cleanupService) {
        const { discordChannelCleanup } = await import('../discord/channelCleanup.js');
        cleanupService = discordChannelCleanup;
      }
      
      if (cleanupService && cleanupService.refreshSettings) {
        try {
          logger.info('Discord controller (reset): Calling cleanup.refreshSettings()...');
          await cleanupService.refreshSettings();
          logger.info('Discord controller (reset): Cleanup settings refreshed after reset');
        } catch (error) {
          logger.error('Discord controller (reset): Failed to refresh cleanup settings:', error);
        }
      } else {
        logger.warn('Discord controller (reset): Cleanup service not available');
      }
      
      return successResponse(res, { settings }, 'Discord settings reset to defaults');
    } catch (error) {
      logger.error('Error resetting Discord settings:', error);
      return errorResponse(res, 'Failed to reset Discord settings', 500);
    }
  },

  /**
   * Get Discord users
   */
  async getDiscordUsers(req: Request, res: Response) {
    try {
      const includeStats = req.query.includeStats !== 'false';
      const users = await discordSettingsService.getDiscordUsers(includeStats);
      return successResponse(res, { users }, 'Discord users retrieved');
    } catch (error) {
      logger.error('Error fetching Discord users:', error);
      return errorResponse(res, 'Failed to fetch Discord users', 500);
    }
  },

  /**
   * Get Discord statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const statistics = await discordSettingsService.getStatistics();
      return successResponse(res, { statistics }, 'Discord statistics retrieved');
    } catch (error) {
      logger.error('Error fetching Discord statistics:', error);
      return errorResponse(res, 'Failed to fetch Discord statistics', 500);
    }
  },

  /**
   * Toggle block status for a Discord user
   */
  async toggleBlockUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      
      if (typeof isBlocked !== 'boolean') {
        return errorResponse(res, 'isBlocked must be a boolean value', 400);
      }
      
      const updatedUser = await discordSettingsService.toggleBlockUser(id, isBlocked);
      return successResponse(res, { user: updatedUser }, `Discord user ${isBlocked ? 'blocked' : 'unblocked'} successfully`);
    } catch (error: any) {
      logger.error('Error toggling block status:', error);
      return errorResponse(res, error.message || 'Failed to toggle block status', 500);
    }
  },

  /**
   * Delete a Discord user
   */
  async deleteDiscordUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleteTickets = req.body.deleteTickets === true;
      
      await discordSettingsService.deleteDiscordUser(id, deleteTickets);
      return successResponse(res, null, 'Discord user deleted successfully');
    } catch (error: any) {
      logger.error('Error deleting Discord user:', error);
      if (error.message.includes('Cannot delete Discord user with existing tickets')) {
        return errorResponse(res, error.message, 400);
      }
      return errorResponse(res, 'Failed to delete Discord user', 500);
    }
  },

  /**
   * Sync Discord user data (fetch latest from Discord if bot is available)
   */
  async syncDiscordUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!user || !user.isDiscordUser || !user.discordId) {
        return errorResponse(res, 'Discord user not found', 404);
      }
      
      // Try to sync with Discord bot if available
      const discordBot = (global as any).discordBot;
      if (discordBot && discordBot.isReady) {
        try {
          const discordUser = await discordBot.client.users.fetch(user.discordId);
          
          // Update user data
          const updatedUser = await prisma.user.update({
            where: { id },
            data: {
              name: discordUser.username,
              discordUsername: discordUser.username
            }
          });
          
          return successResponse(res, { user: updatedUser }, 'Discord user synced');
        } catch (discordError) {
          logger.warn('Could not fetch user from Discord:', discordError);
          return successResponse(res, { user }, 'Discord user exists but could not sync with Discord');
        }
      }
      
      return successResponse(res, { user }, 'Discord bot not available for sync');
    } catch (error) {
      logger.error('Error syncing Discord user:', error);
      return errorResponse(res, 'Failed to sync Discord user', 500);
    }
  },

  /**
   * Validate Discord channel ID
   * Checks if the provided channel ID is valid and accessible by the bot
   */
  async validateChannel(req: Request, res: Response) {
    try {
      const { channelId } = req.body;
      
      if (!channelId) {
        return errorResponse(res, 'Channel ID is required', 400);
      }
      
      // Check if Discord bot is available
      const discordBot = (global as any).discordBot;
      if (!discordBot || !discordBot.isRunning()) {
        return errorResponse(res, 'Discord bot is not running', 503);
      }
      
      try {
        // Try to fetch the channel
        const channel = discordBot.getClient().channels.cache.get(channelId);
        
        if (!channel) {
          return errorResponse(res, 'Channel not found or bot does not have access', 404);
        }
        
        // Check if it's a text channel
        if (!('send' in channel)) {
          return errorResponse(res, 'Channel is not a text channel', 400);
        }
        
        // Get channel details
        const channelInfo = {
          id: channel.id,
          name: (channel as any).name,
          type: channel.type,
          guild: (channel as any).guild?.name || 'Unknown Server'
        };
        
        return successResponse(res, { 
          valid: true, 
          channel: channelInfo 
        }, 'Channel is valid and accessible');
      } catch (error) {
        logger.error('Error validating Discord channel:', error);
        return errorResponse(res, 'Failed to validate channel', 500);
      }
    } catch (error) {
      logger.error('Error in validateChannel:', error);
      return errorResponse(res, 'Failed to validate channel', 500);
    }
  },

  /**
   * Get list of available Discord channels
   * Returns all text channels the bot has access to
   */
  async getAvailableChannels(req: Request, res: Response) {
    try {
      // Check if Discord bot is available
      const discordBot = (global as any).discordBot;
      if (!discordBot || !discordBot.isRunning()) {
        return errorResponse(res, 'Discord bot is not running', 503);
      }
      
      try {
        // Get all text channels the bot can see
        const channels = discordBot.getClient().channels.cache
          .filter((channel: any) => channel.type === 0 && channel.guild) // Type 0 is text channel
          .map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            guild: channel.guild.name,
            category: channel.parent?.name || 'No Category'
          }));
        
        // Sort by guild and then channel name
        channels.sort((a: any, b: any) => {
          if (a.guild !== b.guild) {
            return a.guild.localeCompare(b.guild);
          }
          return a.name.localeCompare(b.name);
        });
        
        return successResponse(res, { channels }, 'Available channels retrieved');
      } catch (error) {
        logger.error('Error getting Discord channels:', error);
        return errorResponse(res, 'Failed to get channels', 500);
      }
    } catch (error) {
      logger.error('Error in getAvailableChannels:', error);
      return errorResponse(res, 'Failed to get available channels', 500);
    }
  }
};

// Import prisma at the end to avoid circular dependency
import { prisma } from '../lib/prisma.js';