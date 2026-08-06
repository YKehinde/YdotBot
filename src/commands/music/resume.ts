import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume playback')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  execute: async (interaction: CommandInteraction) => {
    if (!interaction.guildId) return;

    const status = musicService.getStatus(interaction.guildId);

    if (!status.isConnected) {
      await interaction.reply({
        content: 'Bot is not connected to a voice channel.',
        ephemeral: true,
      });
      return;
    }

    if (!status.isPaused) {
      await interaction.reply({
        content: 'Already playing.',
        ephemeral: true,
      });
      return;
    }

    musicService.resume(interaction.guildId);

    await interaction.reply('▶️ Resumed');
  },
};

export default command;
