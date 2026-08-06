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
    .setName('set-welcome')
    .setDescription('Configure welcome messages for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the welcome message channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to send welcome messages to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set the welcome message text')
        .addStringOption((opt) =>
          opt
            .setName('text')
            .setDescription('Welcome message (use {user} for the member mention)')
            .setRequired(true)
            .setMaxLength(2000)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('preview').setDescription('Preview current welcome settings')
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction)) return;
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server!',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'channel') {
      const channel = interaction.options.getChannel('channel', true);
      configService.setWelcomeChannel(interaction.guildId, channel.id);
      await interaction.reply({
        content: `✅ Welcome messages will be sent to ${channel}`,
        ephemeral: true,
      });
    } else if (subcommand === 'message') {
      const text = interaction.options.getString('text', true);
      configService.setWelcomeMessage(interaction.guildId, text);
      await interaction.reply({
        content: `✅ Welcome message updated!`,
        ephemeral: true,
      });
    } else if (subcommand === 'preview') {
      const config = configService.getConfig(interaction.guildId);
      const channel = config.welcomeChannelId
        ? `<#${config.welcomeChannelId}>`
        : 'Not set';
      const message = config.welcomeMessage || 'Not set';

      await interaction.reply({
        content: `**Welcome Channel:** ${channel}\n**Welcome Message:** ${message}`,
        ephemeral: true,
      });
    }
  },
};

export default command;
