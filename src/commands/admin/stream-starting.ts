import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { configService } from '../../services/configService.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('stream-starting')
    .setDescription('Announce that the stream is starting at a specific time')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName('time')
        .setDescription('Stream start time (e.g., "3:30 PM EST" or "15:30")')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('url')
        .setDescription('Twitch stream URL')
        .setRequired(false)
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const time = interaction.options.getString('time', true);
    const url = interaction.options.getString('url') || 'https://www.twitch.tv/ydot_k';

    try {
      const config = configService.getConfig(interaction.guildId);

      if (!config.twitchAnnounceChannelId) {
        await interaction.reply({
          content:
            'No announcement channel configured. Use `/set-twitch-announce channel` first.',
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.guild!.channels.cache.get(config.twitchAnnounceChannelId);

      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          content: 'Announcement channel not found or is not a text channel.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle('🔴 Stream Starting!')
        .setDescription(`Join us live on Twitch`)
        .addFields(
          {
            name: 'Start Time',
            value: time,
            inline: true,
          },
          {
            name: 'Link',
            value: `[Watch on Twitch](${url})`,
            inline: true,
          }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      await interaction.reply({
        content: `✅ Stream announcement posted to ${channel}`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('StreamStarting', 'Failed to post stream announcement', error);
      await interaction.reply({
        content: 'Failed to post stream announcement.',
        ephemeral: true,
      });
    }
  },
};

export default command;
