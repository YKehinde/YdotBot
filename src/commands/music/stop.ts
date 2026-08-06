import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and disconnect from voice'),

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

    musicService.stop(interaction.guildId);
    musicService.disconnect(interaction.guildId);

    await interaction.reply('⏹️ Stopped and disconnected');
  },
};

export default command;
