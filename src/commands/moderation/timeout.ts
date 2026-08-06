import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { logModAction } from '../../services/moderationService.js';

const parseDuration = (duration: string): number | null => {
  const match = duration.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return amount * (multipliers[unit] || 0);
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to timeout').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Duration (e.g., 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for timeout').setMaxLength(512)
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const target = interaction.options.getUser('user', true);
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const seconds = parseDuration(durationStr);

    if (!seconds || seconds > 2419200) {
      await interaction.reply({
        content: 'Invalid duration. Use format like: 10s, 5m, 1h, 7d (max 28 days)',
        ephemeral: true,
      });
      return;
    }

    try {
      const member = await interaction.guild!.members.fetch(target.id);

      if (!member.moderatable) {
        await interaction.reply({
          content: "I don't have permission to timeout that user.",
          ephemeral: true,
        });
        return;
      }

      await member.timeout(seconds * 1000, reason);

      await logModAction(interaction.guild!, {
        action: 'timeout',
        targetUser: target,
        moderator: interaction.user,
        reason,
        duration: durationStr,
      });

      await interaction.reply({
        content: `✅ Timed out ${target.tag} for ${durationStr}.\nReason: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: 'Failed to timeout user.',
        ephemeral: true,
      });
    }
  },
};

export default command;
