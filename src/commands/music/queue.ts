import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the music queue'),

  execute: async (interaction: CommandInteraction) => {
    if (!interaction.guildId) return;

    const current = musicService.getCurrentTrack(interaction.guildId);
    const queue = musicService.getQueue(interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor('#00d4ff')
      .setTitle('🎵 Music Queue');

    if (current) {
      embed.addFields({
        name: 'Now Playing',
        value: `**${current.title}**\n${Math.floor(current.duration / 60)}:${String(current.duration % 60).padStart(2, '0')}`,
      });
    }

    if (queue.length === 0) {
      embed.addFields({
        name: 'Queue',
        value: 'Empty',
      });
    } else {
      const queueText = queue
        .slice(0, 10)
        .map((track, i) => {
          const duration = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
          return `${i + 1}. **${track.title}** (${duration})`;
        })
        .join('\n');

      embed.addFields({
        name: `Queue (${queue.length} tracks)`,
        value: queueText + (queue.length > 10 ? `\n... and ${queue.length - 10} more` : ''),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
