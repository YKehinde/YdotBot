import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { logModAction } from '../../services/moderationService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to warn').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for warning').setMaxLength(512)
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('⚠️ Warning')
        .setDescription(`You have been warned in **${interaction.guild!.name}**`)
        .addFields({
          name: 'Reason',
          value: reason,
        });

      await target.send({ embeds: [embed] }).catch(() => {});

      await logModAction(interaction.guild!, {
        action: 'warn',
        targetUser: target,
        moderator: interaction.user,
        reason,
      });

      await interaction.reply({
        content: `✅ Warned ${target.tag}.\nReason: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: 'Failed to warn user.',
        ephemeral: true,
      });
    }
  },
};

export default command;
