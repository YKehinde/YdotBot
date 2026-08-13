import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { logModAction } from '../../services/moderationService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to kick').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for kick').setMaxLength(512)
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild!.members.fetch(target.id);

      if (!member.kickable) {
        await interaction.reply({
          content: "I don't have permission to kick that user.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await member.kick(reason);

      await logModAction(interaction.guild!, {
        action: 'kick',
        targetUser: target,
        moderator: interaction.user,
        reason,
      });

      await interaction.reply({
        content: `✅ Kicked ${target.tag} from the server.\nReason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content: 'Failed to kick user.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
