import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';
import play from 'play-dl';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Song name or YouTube URL')
        .setRequired(true)
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const query = interaction.options.getString('query', true);

    await interaction.deferReply();

    try {
      const voiceChannel = interaction.member?.voice.channel;

      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.editReply('You must be in a voice channel to use this command!');
        return;
      }

      await musicService.join(voiceChannel, interaction.guildId);

      let url = query;

      if (!query.startsWith('http')) {
        const results = await play.search(query, { limit: 1 });

        if (results.length === 0) {
          await interaction.editReply('No results found for that query.');
          return;
        }

        url = results[0].url;
      }

      const track = await musicService.queue(url, interaction.guildId);

      if (!track) {
        await interaction.editReply('Failed to queue that track.');
        return;
      }

      const queueSize = musicService.getQueue(interaction.guildId).length;

      await interaction.editReply(
        `✅ Queued **${track.title}** (${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}) - Position: #${queueSize}`
      );
    } catch (error) {
      logger.error('Play', 'Failed to play track', error);
      await interaction.editReply('Failed to queue that track.');
    }
  },
};

export default command;
