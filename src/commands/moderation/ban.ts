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
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to ban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for ban').setMaxLength(512)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('delete_days')
        .setDescription('Delete messages from the last N days (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    try {
      const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

      if (member && !member.bannable) {
        await interaction.reply({
          content: "I don't have permission to ban that user.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.guild!.bans.create(target.id, { deleteMessageSeconds: deleteDays * 86400, reason });

      await logModAction(interaction.guild!, {
        action: 'ban',
        targetUser: target,
        moderator: interaction.user,
        reason,
      });

      await interaction.reply({
        content: `✅ Banned ${target.tag} from the server.\nReason: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content: 'Failed to ban user.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
