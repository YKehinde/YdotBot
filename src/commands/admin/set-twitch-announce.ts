import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { configService } from '../../services/configService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('set-twitch-announce')
    .setDescription('Configure Twitch go-live announcement channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the channel for Twitch go-live announcements')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to announce go-live events')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('preview').setDescription('View current Twitch announcement settings')
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'channel') {
      const channel = interaction.options.getChannel('channel', true);
      configService.setTwitchAnnounceChannel(interaction.guildId, channel.id);
      await interaction.reply({
        content: `✅ Twitch go-live announcements will be sent to ${channel}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'preview') {
      const config = configService.getConfig(interaction.guildId);
      const channel = config.twitchAnnounceChannelId
        ? `<#${config.twitchAnnounceChannelId}>`
        : 'Not set';

      await interaction.reply({
        content: `**Twitch Announcement Channel:** ${channel}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
