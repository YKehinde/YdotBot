import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('sinfo')
    .setDescription('Show info about the currently playing song'),

  execute: async (interaction: CommandInteraction) => {
    if (!interaction.guildId) return;

    const track = musicService.getCurrentTrack(interaction.guildId);

    if (!track) {
      await interaction.reply({
        content: 'No track is currently playing.',
        ephemeral: true,
      });
      return;
    }

    const duration = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;

    const embed = new EmbedBuilder()
      .setColor('#00d4ff')
      .setTitle('🎵 Now Playing')
      .setDescription(track.title)
      .addFields(
        {
          name: 'Duration',
          value: duration,
          inline: true,
        },
        {
          name: 'URL',
          value: `[Listen](${track.url})`,
          inline: true,
        }
      );

    if (track.channel) {
      embed.addFields({
        name: 'Channel',
        value: track.channel,
        inline: true,
      });
    }

    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
