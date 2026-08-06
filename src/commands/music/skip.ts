import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { musicService } from '../../services/musicService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  execute: async (interaction: CommandInteraction) => {
    if (!interaction.guildId) return;

    const status = musicService.getStatus(interaction.guildId);

    if (!status.currentTrack) {
      await interaction.reply({
        content: 'Nothing is currently playing.',
        ephemeral: true,
      });
      return;
    }

    musicService.skip(interaction.guildId);

    await interaction.reply(`⏭️ Skipped **${status.currentTrack.title}**`);
  },
};

export default command;
