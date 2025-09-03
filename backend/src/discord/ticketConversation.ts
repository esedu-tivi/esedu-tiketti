import { TextChannel, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { setupChannelSync } from './messageSync.js';

interface TicketData {
  title: string;
  description: string;
  device: string;
  categoryId?: string;
}

export async function startTicketConversation(
  channel: TextChannel,
  user: User,
  serverId: string
) {
  // Check if user is blocked
  const dbUser = await prisma.user.findUnique({
    where: { discordId: user.id }
  });
  
  if (dbUser?.isBlocked) {
    await channel.send('❌ **Tilisi on estetty.** Et voi luoda tukipyyntöjä tällä hetkellä.');
    setTimeout(() => channel.delete().catch(() => {}), 10000); // Delete channel after 10 seconds
    return;
  }

  const ticketData: Partial<TicketData> = {};
  let step = 'TITLE';
  let messageCount = 0;
  const maxWaitTime = 600000; // 10 minutes timeout

  // Create cancel button
  const cancelRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('cancel_ticket_creation')
        .setLabel('🚫 Peruuta')
        .setStyle(ButtonStyle.Danger)
    );

  // Send initial prompt with cancel button
  const initialMessage = await channel.send({
    content: '**Mikä on ongelmasi lyhyesti?**\n_(Esim: "Tulostin ei toimi")_',
    components: [cancelRow]
  });

  // Button collector for cancel button - handled in bot.ts handleButtonInteraction
  // We just need to stop the message collector when cancelled
  const buttonCollector = channel.createMessageComponentCollector({
    filter: (i) => i.user.id === user.id && i.customId === 'cancel_ticket_creation',
    time: maxWaitTime,
  });

  buttonCollector.on('collect', async () => {
    // Stop collectors when cancel is clicked (actual handling is in bot.ts)
    collector.stop('cancelled');
    buttonCollector.stop();
  });

  // Create message collector
  const collector = channel.createMessageCollector({
    filter: (m) => m.author.id === user.id,
    time: maxWaitTime,
  });

  collector.on('collect', async (message) => {
    messageCount++;

    try {
      switch (step) {
        case 'TITLE':
          ticketData.title = message.content.slice(0, 100); // Limit title length
          
          await channel.send({
            content: '**Kuvaile ongelmaa tarkemmin:**\n_(Mitä tapahtui? Milloin ongelma alkoi?)_',
            components: [cancelRow]
          });
          step = 'DESCRIPTION';
          break;

        case 'DESCRIPTION':
          ticketData.description = message.content;
          
          await channel.send({
            content: '**Mikä laite/ohjelma on kyseessä?**\n_(Voit myös kirjoittaa "ei tiedossa")_',
            components: [cancelRow]
          });
          step = 'DEVICE';
          break;

        case 'DEVICE':
          ticketData.device = message.content || 'Ei määritelty';
          
          // Remove cancel button as we're about to create the ticket
          buttonCollector.stop();
          
          // Get or create Discord user in database
          const discordUser = await getOrCreateDiscordUser(user, serverId);
          
          // Double-check if user got blocked during creation
          if (discordUser.isBlocked) {
            await channel.send('❌ **Tilisi on estetty.** Tukipyyntöä ei voitu luoda.');
            collector.stop('blocked');
            setTimeout(() => channel.delete().catch(() => {}), 5000);
            return;
          }
          
          // Get Discord settings for category name
          const settings = await prisma.discordSettings.findFirst();
          const categoryName = settings?.defaultCategoryName || 'Discord';
          
          // Get default category (or create one if it doesn't exist)
          const defaultCategory = await prisma.category.findFirst({
            where: { name: categoryName }
          }) || await prisma.category.create({
            data: {
              name: categoryName,
              description: 'Tickets created from Discord'
            }
          });

          // Create the ticket
          const ticket = await prisma.ticket.create({
            data: {
              title: ticketData.title!,
              description: `${ticketData.description}\n\n---\n**Discord käyttäjä / Discord User:** ${user.username}\n**Palvelin / Server:** ${channel.guild.name}`,
              device: ticketData.device,
              createdById: discordUser.id,
              categoryId: defaultCategory.id,
              status: 'OPEN',
              priority: 'MEDIUM',
              sourceType: 'DISCORD',
              discordChannelId: channel.id,
              discordServerId: serverId,
            },
            include: {
              createdBy: true,
              category: true,
            }
          });

          // Send success message with ticket details
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Tukipyyntö luotu!')
            .setColor(0x00ff00)
            .addFields(
              { name: 'Tiketti ID', value: `#${ticket.id}`, inline: true },
              { name: 'Tila', value: 'Avoin', inline: true },
              { name: 'Prioriteetti', value: 'Keskitaso', inline: true },
              { name: 'Otsikko', value: ticket.title },
              { name: 'Kategoria', value: ticket.category.name }
            )
            .setFooter({ text: 'Tukihenkilö vastaa tähän kanavaan' })
            .setTimestamp();

          // Get settings to check if user close is allowed
          const allowUserClose = settings?.allowUserClose !== false; // Default to true if not set
          
          // Only add close button if allowed by settings
          if (allowUserClose) {
            const row = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('close_ticket')
                  .setLabel('Sulje tiketti')
                  .setStyle(ButtonStyle.Danger)
                  .setEmoji('🔒')
              );

            await channel.send({ 
              embeds: [successEmbed],
              components: [row]
            });
          } else {
            // Send without the close button
            await channel.send({ 
              embeds: [successEmbed]
            });
          }

          // Stop the collector
          collector.stop('completed');

          // Setup ongoing message sync between Discord and web app
          await setupChannelSync(channel, ticket.id);

          // Update Discord bot's status immediately
          const { discordBot } = await import('./bot.js');
          await discordBot.onTicketChanged('created', undefined, ticket.status);

          // Emit WebSocket event for new ticket so it appears in admin/my-work views
          const { getSocketService } = await import('../services/socketService.js');
          const socketService = getSocketService();
          socketService.emitTicketCreated(ticket);

          logger.info(`Ticket ${ticket.id} created from Discord by ${user.username}`);
          break;
      }
    } catch (error) {
      logger.error('Error in ticket conversation:', error);
      await channel.send('❌ Virhe tukipyynnön käsittelyssä. Yritä uudelleen.');
      collector.stop('error');
    }
  });

  collector.on('end', async (_collected, reason) => {
    if (reason === 'time') {
      await channel.send('⏱️ Aika loppui. Kanava poistetaan...');
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    } else if (reason === 'cancelled') {
      // Cancellation already handled
    } else if (reason === 'blocked') {
      // Block message already sent
    } else if (reason === 'error') {
      // Error message already sent
    }
    // If reason is 'completed', success message was already sent
  });
}

async function getOrCreateDiscordUser(discordUser: User, serverId: string) {
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