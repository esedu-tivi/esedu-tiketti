import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder, TextChannel, MessageFlags, ActivityType } from 'discord.js';
import logger from '../utils/logger.js';
import { startTicketConversation } from './ticketConversation.js';
import { restoreDiscordSync } from './messageSync.js';
import { discordChannelCleanup, DISCORD_CLEANUP_CONFIG } from './channelCleanup.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const TICKET_CATEGORY_ID = process.env.DISCORD_TICKET_CATEGORY_ID; // Optional: Discord category for tickets

class DiscordBot {
  private client: Client;
  private isReady: boolean = false;
  private statusIndex: number = 0;
  private statusInterval: NodeJS.Timeout | null = null;
  private settings: any = null;
  
  // Simple in-memory ticket counts (updated on changes)
  private ticketCounts = {
    open: 0,
    inProgress: 0,
    total: 0
  };

  constructor() {
    // Client will be created when starting
    this.client = null as any;
  }
  
  private createClient() {
    // Create a fresh client instance
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once('ready', async () => {
      logger.info(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
      this.registerCommands();
      
      // Start rotating status
      this.startStatusRotation();
      
      // Restore Discord sync for existing tickets
      setTimeout(async () => {
        await restoreDiscordSync();
        // Start the channel cleanup service and make it globally accessible
        (global as any).discordChannelCleanup = discordChannelCleanup;
        discordChannelCleanup.start();
        logger.info('Discord cleanup service started and globally accessible');
      }, 2000); // Wait 2 seconds to ensure everything is initialized
    });

    this.client.on('interactionCreate', async (interaction) => {
      // Check if integration is enabled before handling any interactions
      if (!this.settings?.enableIntegration) {
        if (interaction.isRepliable()) {
          await interaction.reply({
            content: '❌ Discord integration is currently disabled / Discord-integraatio on pois käytöstä',
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }
      
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'tiketti') {
          await this.handleTicketCommand(interaction);
        }
      } else if (interaction.isButton()) {
        // Handle button interactions
        await this.handleButtonInteraction(interaction);
      }
    });

    this.client.on('error', (error) => {
      logger.error('Discord bot error:', error);
    });
  }

  private async registerCommands() {
    if (!DISCORD_CLIENT_ID || !DISCORD_BOT_TOKEN) {
      logger.warn('Discord client ID or bot token not configured, skipping command registration');
      return;
    }
    
    // Always register commands - they'll show "disabled" message if integration is off
    // This prevents "Unknown Integration" errors

    const commands = [
      new SlashCommandBuilder()
        .setName('tiketti')
        .setDescription('Luo uusi tukipyyntö / Create a new support ticket')
        .toJSON(),
    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

    try {
      logger.info('Started refreshing Discord application (/) commands.');

      // Register commands globally (for all servers the bot is in)
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
        body: commands,
      });

      logger.info('Successfully reloaded Discord application (/) commands.');
    } catch (error) {
      logger.error('Error registering Discord commands:', error);
    }
  }
  
  private async unregisterCommands() {
    if (!DISCORD_CLIENT_ID || !DISCORD_BOT_TOKEN) {
      return;
    }
    
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
    
    try {
      logger.info('Discord bot: Unregistering all commands...');
      
      // Remove all commands globally
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
        body: [],
      });
      
      logger.info('Discord bot: All commands unregistered');
    } catch (error) {
      logger.error('Error unregistering Discord commands:', error);
    }
  }

  private async handleButtonInteraction(interaction: any) {
    try {
      // Handle cancel button during ticket creation (no ticket exists yet)
      if (interaction.customId === 'cancel_ticket_creation') {
        await interaction.reply('🚫 Tukipyynnön luonti peruutettu.');
        
        // Delete the channel after a short delay
        setTimeout(async () => {
          try {
            await interaction.channel.delete('Käyttäjä peruutti tukipyynnön luonnin');
          } catch (error) {
            logger.error('Error deleting cancelled ticket channel:', error);
          }
        }, 3000);
        return;
      }

      // Get ticket ID from the channel
      const channel = interaction.channel;
      if (!channel) return;

      // Import prisma to query the ticket
      const { prisma } = await import('../lib/prisma.js');
      
      // Find ticket by Discord channel ID
      const ticket = await prisma.ticket.findUnique({
        where: { discordChannelId: channel.id },
        include: { createdBy: true }
      });

      if (!ticket) {
        await interaction.reply({
          content: '❌ Tiketti ei löydy',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Check if user is the ticket creator
      const isCreator = ticket.createdBy.discordId === interaction.user.id;

      if (interaction.customId === 'close_ticket') {
        if (!isCreator) {
          await interaction.reply({
            content: '❌ Vain tiketin luoja voi sulkea sen',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        // Update ticket status to CLOSED and create status change comment
        const [updatedTicket, statusComment] = await prisma.$transaction([
          prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: 'CLOSED' },
            include: {
              createdBy: true,
              assignedTo: true,
              category: true
            }
          }),
          prisma.comment.create({
            data: {
              content: `Tiketti suljettu Discordista (${interaction.user.username})`,
              ticketId: ticket.id,
              authorId: ticket.createdBy.id, // Use ticket creator as author since Discord users might not have separate accounts
              isFromDiscord: true
            }
          })
        ]);
        
        // Update bot's status immediately (ticket closed)
        await this.onTicketChanged('statusChanged', ticket.status, 'CLOSED');

        // Send status update to Discord channel
        const { sendStatusUpdateToDiscord } = await import('./messageSync.js');
        await sendStatusUpdateToDiscord(ticket.id, ticket.status, 'CLOSED', interaction.user.username);

        // Emit real-time update to web app via WebSocket
        const { getSocketService } = await import('../services/socketService.js');
        const socketService = getSocketService();

        // Emit ticket status changed event to all connected users
        socketService.emitTicketStatusChanged({
          ticketId: updatedTicket.id,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          assignedToId: updatedTicket.assignedToId,
          updatedAt: updatedTicket.updatedAt
        });

        // Also broadcast general ticket update
        socketService.broadcastTicketUpdate(updatedTicket.id, {
          type: 'STATUS_CHANGED',
          status: 'CLOSED',
          updatedBy: interaction.user.username
        });

        // Emit the status change comment for timeline
        socketService.emitNewCommentToUser(ticket.createdBy.email, {
          ticketId: ticket.id,
          comment: {
            id: statusComment.id,
            content: statusComment.content,
            author: {
              id: ticket.createdBy.id,
              name: ticket.createdBy.name,
              email: ticket.createdBy.email,
            },
            createdAt: statusComment.createdAt,
            isFromDiscord: true,
          }
        });

        await interaction.reply({
          content: '✅ Tiketti suljettu',
          flags: MessageFlags.Ephemeral
        });

        logger.info(`Ticket ${ticket.id} closed by Discord user ${interaction.user.username}`);
      }
    } catch (error) {
      logger.error('Error handling button interaction:', error);
      await interaction.reply({
        content: '❌ Virhe käsittelyssä',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  private async handleTicketCommand(interaction: any) {
    try {
      // Check if user is blocked BEFORE deferring
      const { prisma } = await import('../lib/prisma.js');
      const dbUser = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        select: { isBlocked: true }
      });
      
      if (dbUser?.isBlocked) {
        await interaction.reply({
          content: '❌ **Tilisi on estetty.** Et voi luoda tukipyyntöjä tällä hetkellä.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Defer reply immediately to avoid timeout
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Check if bot has required permissions
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply('This command can only be used in a server.');
        return;
      }

      const botMember = guild.members.cache.get(this.client.user!.id);
      if (!botMember) {
        await interaction.editReply('❌ Bot member not found in server.');
        return;
      }

      // Check if we're using a category
      if (TICKET_CATEGORY_ID) {
        try {
          const category = guild.channels.cache.get(TICKET_CATEGORY_ID);
          if (!category) {
            logger.warn(`Category ${TICKET_CATEGORY_ID} not found`);
            // Continue without category
          } else {
            // Check permissions in the category
            const categoryPerms = category.permissionsFor(botMember);
            const requiredCategoryPerms = [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageRoles,
              PermissionFlagsBits.SendMessages
            ];
            
            const missingCategoryPerms = requiredCategoryPerms.filter(perm => !categoryPerms?.has(perm));
            if (missingCategoryPerms.length > 0) {
              await interaction.editReply({
                content: `❌ Bot is missing permissions in the ticket category. Please grant the bot these permissions in the category settings:\n• View Channels\n• Manage Channels\n• Manage Roles\n• Send Messages`,
              });
              return;
            }
          }
        } catch (error) {
          logger.error('Error checking category permissions:', error);
        }
      }

      // Check general server permissions
      const requiredPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ];

      const missingPermissions = requiredPermissions.filter(perm => !botMember.permissions.has(perm));
      
      if (missingPermissions.length > 0) {
        const permissionNames = missingPermissions.map(perm => {
          switch(perm) {
            case PermissionFlagsBits.ViewChannel: return 'View Channels';
            case PermissionFlagsBits.ManageChannels: return 'Manage Channels';
            case PermissionFlagsBits.ManageRoles: return 'Manage Roles';
            case PermissionFlagsBits.SendMessages: return 'Send Messages';
            case PermissionFlagsBits.EmbedLinks: return 'Embed Links';
            default: return 'Unknown';
          }
        });

        await interaction.editReply({
          content: `❌ Bot is missing required permissions:\n${permissionNames.map(p => `• ${p}`).join('\n')}\n\nPlease ask an administrator to grant these permissions to the bot.`,
        });
        return;
      }

      // Create private channel

      const channelName = `ticket-${interaction.user.username}-${Date.now().toString(36)}`;
      
      // Simplified channel creation - let Discord handle permissions initially
      const channelOptions: any = {
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Ticket by ${interaction.user.username} - ID: ${interaction.user.id}`,
      };

      // If category ID is configured, add the channel to that category
      if (TICKET_CATEGORY_ID) {
        channelOptions.parent = TICKET_CATEGORY_ID;
      }

      let channel;
      try {
        channel = await guild.channels.create(channelOptions);
        logger.info(`Successfully created channel ${channel.id} for user ${interaction.user.username}`);
        
        // Now set permissions after channel is created
        // Use edit instead of create for @everyone, and set them all at once
        try {
          await channel.permissionOverwrites.set([
            {
              id: guild.id, // @everyone
              deny: ['ViewChannel'],
            },
            {
              id: interaction.user.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
            {
              id: this.client.user!.id,
              allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ManageRoles', 'ReadMessageHistory'],
            },
          ]);
          logger.info('Successfully set channel permissions - channel is now private');
        } catch (permError: any) {
          logger.error('Failed to set channel permissions:', permError.message);
          
          // Try alternative method - edit existing @everyone permissions
          try {
            await channel.permissionOverwrites.edit(guild.id, {
              ViewChannel: false,
            });
            await channel.permissionOverwrites.edit(interaction.user.id, {
              ViewChannel: true,
              SendMessages: true,
            });
            logger.info('Set permissions using edit method');
          } catch (editError: any) {
            logger.error('Failed to edit permissions:', editError.message);
            
            // Send warning message in the channel
            await channel.send(
              '⚠️ **Huomio:**\n' +
              'Kanava luotiin, mutta sitä ei voitu tehdä yksityiseksi.\n\n' +
              '**Syy:** Botilla ei ole "Manage Roles" oikeutta.\n' +
              '**Ratkaisu:** Anna botille "Administrator" oikeus.'
            );
          }
          
          // Continue anyway - channel is created, just not private
        }
      } catch (channelError: any) {
        logger.error('Failed to create channel:', channelError.message || channelError);
        logger.error('Error code:', channelError.code);
        logger.error('Bot permissions:', botMember.permissions.toArray().join(', '));
        
        // Check if bot can manage channels in general
        const canManage = botMember.permissions.has(PermissionFlagsBits.ManageChannels);
        const canView = botMember.permissions.has(PermissionFlagsBits.ViewChannel);
        const canManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);
        
        logger.error(`Permission check - ManageChannels: ${canManage}, ViewChannel: ${canView}, ManageRoles: ${canManageRoles}`);
        
        // More specific error message
        if (channelError.code === 50013) {
          let errorMsg = '❌ Bot lacks permissions to create channels.\n\n';
          errorMsg += 'Please check:\n';
          errorMsg += '1. Bot role is high enough in role hierarchy (drag it up in Server Settings → Roles)\n';
          errorMsg += '2. Bot has "Manage Channels" permission\n';
          errorMsg += '3. No channel permission overwrites blocking the bot\n';
          
          if (TICKET_CATEGORY_ID) {
            errorMsg += '4. Bot has permissions in the ticket category\n';
          }
          
          await interaction.editReply(errorMsg);
        } else {
          await interaction.editReply(`❌ Failed to create channel: ${channelError.message}`);
        }
        return;
      }

      // Send initial message in the new channel
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎫 Tukipyyntö')
        .setDescription('Tervetuloa! Autan sinua luomaan tukipyynnön.')
        .setColor(0x00ff00)
        .setTimestamp();

      await channel.send({ embeds: [welcomeEmbed] });

      // Start conversation flow
      await startTicketConversation(channel as TextChannel, interaction.user, guild.id);

      // Reply to the original interaction
      await interaction.editReply({
        content: `✅ Tukipyyntökanava luotu!\n📍 Siirry kanavalle: ${channel}`,
      });

    } catch (error) {
      logger.error('Error handling ticket command:', error);
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Virhe tukipyynnön luomisessa.');
      } else {
        await interaction.reply({
          content: '❌ Virhe tukipyynnön luomisessa.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  public async start() {
    if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) {
      if (!DISCORD_BOT_TOKEN) {
        logger.info('Discord bot token not configured, Discord integration disabled');
      }
      if (!DISCORD_CLIENT_ID) {
        logger.info('Discord client ID not configured, Discord integration disabled');
      }
      return;
    }
    
    // Check if already running
    if (this.isReady) {
      logger.info('Discord bot: Already running');
      return;
    }
    
    // Load settings first to check if integration is enabled
    await this.loadSettings();
    
    if (!this.settings?.enableIntegration) {
      logger.info('Discord bot: Integration is disabled in settings, not starting');
      return;
    }

    try {
      // Create a fresh client instance for each start
      this.createClient();
      
      await this.client.login(DISCORD_BOT_TOKEN);
      logger.info('Discord bot starting with fresh client...');
    } catch (error) {
      logger.error('Failed to start Discord bot:', error);
    }
  }

  public async stop() {
    if (this.isReady || this.client) {
      logger.info('Discord bot: Stopping bot...');
      this.isReady = false;
      
      // Stop status rotation
      if (this.statusInterval) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
      }
      
      // Stop the cleanup service
      discordChannelCleanup.stop();
      
      // Destroy the client if it exists
      if (this.client) {
        await this.client.destroy();
        this.client = null as any; // Clear the client reference
      }
      
      // Reset ticket counts
      this.ticketCounts = { open: 0, inProgress: 0, total: 0 };
      
      logger.info('Discord bot: Bot fully stopped and client destroyed');
    } else {
      logger.info('Discord bot: Already stopped');
    }
  }

  public getClient(): Client {
    return this.client;
  }
  
  public isRunning(): boolean {
    return this.isReady && this.client && this.client.isReady();
  }

  // Called when ticket changes - updates counts and triggers status update
  public async onTicketChanged(changeType: 'created' | 'deleted' | 'statusChanged', oldStatus?: string, newStatus?: string) {
    if (!this.isReady) return;
    
    // Update counts based on change type
    if (changeType === 'created') {
      this.ticketCounts.total++;
      if (newStatus === 'OPEN') this.ticketCounts.open++;
      else if (newStatus === 'IN_PROGRESS') this.ticketCounts.inProgress++;
    } else if (changeType === 'deleted') {
      this.ticketCounts.total--;
      if (oldStatus === 'OPEN') this.ticketCounts.open--;
      else if (oldStatus === 'IN_PROGRESS') this.ticketCounts.inProgress--;
    } else if (changeType === 'statusChanged' && oldStatus && newStatus) {
      // Handle status change
      if (oldStatus === 'OPEN') this.ticketCounts.open--;
      else if (oldStatus === 'IN_PROGRESS') this.ticketCounts.inProgress--;
      
      if (newStatus === 'OPEN') this.ticketCounts.open++;
      else if (newStatus === 'IN_PROGRESS') this.ticketCounts.inProgress++;
    }
    
    // Ensure counts don't go negative
    this.ticketCounts.open = Math.max(0, this.ticketCounts.open);
    this.ticketCounts.inProgress = Math.max(0, this.ticketCounts.inProgress);
    this.ticketCounts.total = Math.max(0, this.ticketCounts.total);
    
    logger.debug(`Discord bot counts updated: Open=${this.ticketCounts.open}, InProgress=${this.ticketCounts.inProgress}, Total=${this.ticketCounts.total}`);
    
    // Update status display immediately
    await this.updateStatus();
  }

  private async startStatusRotation() {
    // Initialize counts from database once on startup
    await this.initializeCounts();
    
    // Load initial settings
    await this.loadSettings();
    
    // Update status immediately, then rotate based on settings
    await this.updateStatus();
    this.scheduleNextRotation();
  }

  private async loadSettings() {
    try {
      const { discordSettingsService } = await import('../services/discordSettingsService.js');
      this.settings = await discordSettingsService.getSettings();
      logger.info('Discord bot settings loaded:', {
        statusRotationMs: this.settings.statusRotationMs,
        showTicketStats: this.settings.showTicketStats,
        showCleanupTimer: this.settings.showCleanupTimer,
        allowUserClose: this.settings.allowUserClose,
        enableIntegration: this.settings.enableIntegration,
        defaultCategoryName: this.settings.defaultCategoryName
      });
    } catch (error) {
      logger.error('Error loading Discord settings:', error);
      // Use defaults if settings can't be loaded
      this.settings = {
        statusRotationMs: 10000,
        showTicketStats: true,
        showCleanupTimer: true,
        allowUserClose: true,
        enableIntegration: false
      };
      logger.info('Using default Discord bot settings');
    }
  }

  private scheduleNextRotation() {
    // Clear existing interval if any
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      logger.info('Discord bot: Cleared previous status rotation interval');
    }
    
    // Schedule based on current settings
    const rotationMs = this.settings?.statusRotationMs || 10000;
    this.statusInterval = setInterval(() => {
      this.updateStatus();
    }, rotationMs);
    logger.info(`Discord bot: Status rotation scheduled every ${rotationMs}ms (${rotationMs/1000}s)`);
  }

  // Public method to refresh settings on demand
  public async refreshSettings() {
    logger.info('Discord bot: refreshSettings() called - Starting settings refresh...');
    const oldEnableIntegration = this.settings?.enableIntegration;
    const oldRotationMs = this.settings?.statusRotationMs;
    
    await this.loadSettings();
    
    // Check if we need to stop or start the bot based on enableIntegration
    if (oldEnableIntegration !== this.settings?.enableIntegration) {
      logger.info(`Discord bot: Integration toggled from ${oldEnableIntegration} to ${this.settings?.enableIntegration}`);
      
      if (!this.settings?.enableIntegration) {
        // Integration disabled - stop the bot
        logger.info('Discord bot: Integration disabled, stopping bot...');
        await this.stop();
        return; // Exit early since bot is stopped
      } else if (!this.isReady) {
        // Integration enabled but bot not running - start it
        logger.info('Discord bot: Integration enabled, starting bot...');
        await this.start();
        return; // Start will handle everything
      }
    }
    
    // If bot is not enabled, don't do anything else
    if (!this.settings?.enableIntegration) {
      logger.info('Discord bot: Integration is disabled, skipping refresh');
      return;
    }
    
    // Only update rotation and status if bot is running
    if (this.isReady) {
      // Reschedule status rotation with new interval
      if (oldRotationMs !== this.settings?.statusRotationMs) {
        logger.info(`Discord bot: Rotation interval changed from ${oldRotationMs}ms to ${this.settings?.statusRotationMs}ms`);
      }
      this.scheduleNextRotation();
      
      // Update status immediately with new settings
      logger.info('Discord bot: Updating status immediately with new settings');
      await this.updateStatus();
    }
    
    logger.info('Discord bot: Settings refresh completed successfully');
  }
  
  private async initializeCounts() {
    try {
      const { prisma } = await import('../lib/prisma.js');
      
      // Query DB once on startup to get initial counts
      const [openCount, inProgressCount, totalCount] = await Promise.all([
        prisma.ticket.count({ where: { status: 'OPEN' } }),
        prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.ticket.count()
      ]);
      
      this.ticketCounts = {
        open: openCount,
        inProgress: inProgressCount,
        total: totalCount
      };
      
      logger.info(`Discord bot initialized with counts: Open=${openCount}, InProgress=${inProgressCount}, Total=${totalCount}`);
    } catch (error) {
      logger.error('Error initializing Discord bot ticket counts:', error);
      // Start with zeros if initialization fails
      this.ticketCounts = { open: 0, inProgress: 0, total: 0 };
    }
  }

  private async updateStatus() {
    try {
      // Check if integration is enabled
      if (this.settings && !this.settings.enableIntegration) {
        this.client.user?.setActivity('Discord integration disabled', { type: ActivityType.Custom });
        return;
      }

      // Use in-memory counts instead of querying DB
      const { open, inProgress, total } = this.ticketCounts;

      const statuses = [];
      
      // Add ticket statistics if enabled
      if (!this.settings || this.settings.showTicketStats) {
        statuses.push({
          name: `📊 Avoin: ${open} | Käsittelyssä: ${inProgress} | Yhteensä: ${total}`,
          type: ActivityType.Custom
        });
      }
      
      // Add cleanup timer if enabled
      if (!this.settings || this.settings.showCleanupTimer) {
        statuses.push({
          name: this.getNextCleanupStatus(),
          type: ActivityType.Custom
        });
      }
      
      // Always show help command
      statuses.push({
        name: '/tiketti - Luo uusi tukipyyntö',
        type: ActivityType.Custom
      });

      // Rotate through statuses if we have any
      if (statuses.length > 0) {
        const status = statuses[this.statusIndex % statuses.length];
        this.client.user?.setActivity(status.name, { type: status.type });
        this.statusIndex++;
      }
    } catch (error) {
      logger.error('Error updating Discord bot status:', error);
    }
  }

  private getNextCleanupStatus(): string {
    const now = Date.now();
    const intervalMs = DISCORD_CLEANUP_CONFIG.CLEANUP_INTERVAL;
    const nextCleanup = Math.ceil(now / intervalMs) * intervalMs;
    const timeUntilCleanup = nextCleanup - now;
    
    const hours = Math.floor(timeUntilCleanup / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilCleanup % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `🧹 Seuraava siivous: ${hours}h ${minutes}min`;
    } else {
      return `🧹 Seuraava siivous: ${minutes}min`;
    }
  }
}

// Export singleton instance
export const discordBot = new DiscordBot();