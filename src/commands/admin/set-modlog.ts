import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { configService } from '../../services/configService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('set-modlog')
    .setDescription('Configure moderation log channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the moderation log channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for moderation logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('preview').setDescription('View current modlog settings')) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'channel') {
      const channel = interaction.options.getChannel('channel', true);
      configService.setModLogChannel(interaction.guildId, channel.id);
      await interaction.reply({
        content: `✅ Moderation logs will be sent to ${channel}`,
        ephemeral: true,
      });
    } else if (subcommand === 'preview') {
      const config = configService.getConfig(interaction.guildId);
      const channel = config.modLogChannelId ? `<#${config.modLogChannelId}>` : 'Not set';

      await interaction.reply({
        content: `**Moderation Log Channel:** ${channel}`,
        ephemeral: true,
      });
    }
  },
};

export default command;
