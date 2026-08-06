import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { levelingService } from '../../services/levelingService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your rank or the server leaderboard')
    .addSubcommand((sub) =>
      sub.setName('me').setDescription('View your rank and XP')
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('View top 10 members by level')
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'me') {
      const userLevel = levelingService.getLevel(interaction.user.id, interaction.guildId);
      const rank = levelingService.getRank(interaction.user.id, interaction.guildId);

      if (!userLevel) {
        await interaction.reply({
          content: 'You have no XP yet. Start chatting to gain XP!',
          ephemeral: true,
        });
        return;
      }

      const xpForNextLevel = (userLevel.level + 1) * 100;
      const xpProgress = userLevel.xp - userLevel.level * 100;

      const embed = new EmbedBuilder()
        .setColor('#00d4ff')
        .setTitle(`${interaction.user.username}'s Rank`)
        .addFields(
          {
            name: 'Level',
            value: userLevel.level.toString(),
            inline: true,
          },
          {
            name: 'Rank',
            value: rank ? `#${rank}` : 'Unranked',
            inline: true,
          },
          {
            name: 'XP Progress',
            value: `${xpProgress}/${100} XP`,
            inline: true,
          },
          {
            name: 'Total XP',
            value: userLevel.xp.toString(),
            inline: true,
          }
        )
        .setThumbnail(interaction.user.displayAvatarURL());

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'leaderboard') {
      const leaderboard = levelingService.getLeaderboard(interaction.guildId, 10);

      if (leaderboard.length === 0) {
        await interaction.reply({
          content: 'No one has earned XP yet!',
          ephemeral: true,
        });
        return;
      }

      const leaderboardText = leaderboard
        .map((user, i) => {
          return `**#${i + 1}** — <@${user.userId}> | Level **${user.level}** (${user.xp} XP)`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('#00d4ff')
        .setTitle('🏆 Server Leaderboard')
        .setDescription(leaderboardText);

      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default command;
