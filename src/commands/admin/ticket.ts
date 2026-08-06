import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { ticketService } from '../../services/ticketService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create or manage support tickets')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new support ticket')
        .addStringOption((opt) =>
          opt
            .setName('subject')
            .setDescription('What do you need help with?')
            .setRequired(true)
            .setMaxLength(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close a support ticket')
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const subject = interaction.options.getString('subject', true);

      try {
        const channel = await interaction.guild!.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          topic: `Support ticket from ${interaction.user.tag}`,
          permissionOverwrites: [
            {
              id: interaction.guild!.id,
              deny: ['ViewChannel'],
            },
            {
              id: interaction.user.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
          ],
        });

        const ticket = ticketService.createTicket(
          channel.id,
          interaction.user.id,
          interaction.guildId,
          subject
        );

        const embed = new EmbedBuilder()
          .setColor('#00d4ff')
          .setTitle('🎫 Support Ticket Created')
          .addFields(
            {
              name: 'Ticket ID',
              value: ticket.id,
              inline: true,
            },
            {
              name: 'Subject',
              value: subject,
              inline: true,
            },
            {
              name: 'Channel',
              value: channel.toString(),
              inline: true,
            }
          );

        await channel.send({
          content: `${interaction.user} — Your support ticket has been opened. Mods will respond shortly.`,
          embeds: [embed],
        });

        await interaction.reply({
          content: `✅ Ticket created: ${channel}`,
          ephemeral: true,
        });
      } catch (error) {
        logger.error('Ticket', 'Failed to create ticket', error);
        await interaction.reply({
          content: 'Failed to create ticket.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'close') {
      try {
        const ticket = ticketService.getTicketByChannel(interaction.channelId);

        if (!ticket) {
          await interaction.reply({
            content: 'This is not a ticket channel.',
            ephemeral: true,
          });
          return;
        }

        if (ticket.isClosed) {
          await interaction.reply({
            content: 'This ticket is already closed.',
            ephemeral: true,
          });
          return;
        }

        ticketService.closeTicket(ticket.id);

        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('🎫 Ticket Closed')
          .addFields({
            name: 'Ticket ID',
            value: ticket.id,
            inline: true,
          });

        await interaction.channel!.send({ embeds: [embed] });

        await interaction.reply({
          content: '✅ Ticket closed. This channel will be deleted in 5 seconds.',
          ephemeral: true,
        });

        setTimeout(() => {
          interaction.channel?.delete().catch(() => {});
        }, 5000);
      } catch (error) {
        logger.error('Ticket', 'Failed to close ticket', error);
        await interaction.reply({
          content: 'Failed to close ticket.',
          ephemeral: true,
        });
      }
    }
  },
};

export default command;
