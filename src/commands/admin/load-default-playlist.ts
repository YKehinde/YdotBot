import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { musicService } from '../../services/musicService.js';
import { logger } from '../../utils/logger.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('load-default-playlist')
    .setDescription('Load and shuffle the default playlist for streaming (mod only)')
    .setDefaultMemberPermissions(0),

  async execute(interaction: CommandInteraction) {
    if (!interaction.memberPermissions?.has('ModerateMembers')) {
      await interaction.reply({
        content: 'You need moderator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    try {
      const channel = interaction.guildId;
      if (!channel) {
        await interaction.reply({
          content: 'Could not determine guild. Please try again.',
          ephemeral: true,
        });
        return;
      }

      musicService.loadDefaultPlaylistFromFile(channel);

      await interaction.reply({
        content: '✅ Default playlist loaded and shuffled. Ready for stream!',
        ephemeral: true,
      });

      logger.info('Command', `Default playlist loaded by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Command', 'Failed to load default playlist', error);
      await interaction.reply({
        content: 'Failed to load default playlist. Check the console for details.',
        ephemeral: true,
      });
    }
  },
};
