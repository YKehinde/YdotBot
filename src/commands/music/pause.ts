import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current track'),

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

    if (status.isPaused) {
      await interaction.reply({
        content: 'Already paused.',
        ephemeral: true,
      });
      return;
    }

    musicService.pause(interaction.guildId);

    await interaction.reply('⏸️ Paused');
  },
};

export default command;
