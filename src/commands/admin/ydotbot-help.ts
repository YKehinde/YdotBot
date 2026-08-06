import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../utils/types.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ydotbot-help')
    .setDescription('View all YdotBot commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  execute: async (interaction: CommandInteraction) => {
    const embeds = [
      new EmbedBuilder()
        .setColor('#00d4ff')
        .setTitle('🤖 YdotBot Command Guide')
        .setDescription('Complete list of available commands')
        .addFields(
          {
            name: '🎵 Music Commands (All Users)',
            value: `\`/play [song]\` — Queue a song from YouTube
\`/queue\` — View music queue
\`/playlist\` — See up to 10 upcoming songs
\`/sinfo\` — Show currently playing song info`,
            inline: false,
          },
          {
            name: '🎮 Gaming Queue Commands (Twitch Chat)',
            value: `\`!join\` — Add yourself to gaming queue
\`!leave\` — Remove yourself from queue
\`!queue\` — View gaming queue (top 5)`,
            inline: false,
          },
          {
            name: '🎵 Music Playback (Mods Only)',
            value: `\`/skip\` — Skip current track
\`/pause\` — Pause playback
\`/resume\` — Resume playback
\`/stop\` — Stop and disconnect`,
            inline: false,
          },
          {
            name: '🎮 Gaming Queue Moderation (Mods Only)',
            value: `\`!next\` — Call next player and advance queue
\`!remove @user\` — Remove someone from queue
\`!clear\` — Empty entire queue
\`!lock\` — Prevent new joins
\`!unlock\` — Allow new joins`,
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#00d4ff')
        .addFields(
          {
            name: '👥 Community Commands',
            value: `\`/rank me\` — View your level and rank
\`/rank leaderboard\` — See top 10 members
\`/dadjoke\` — Get a random dad joke`,
            inline: false,
          },
          {
            name: '⚙️ Configuration (Mods Only)',
            value: `\`/set-welcome channel #channel\` — Set member welcome channel
\`/set-welcome message [text]\` — Set welcome message
\`/set-modlog channel #channel\` — Set mod-log channel
\`/set-twitch-announce channel #channel\` — Set Twitch announcement channel`,
            inline: false,
          },
          {
            name: '🚨 Moderation (Mods Only)',
            value: `\`/kick @user [reason]\` — Kick a member
\`/ban @user [reason]\` — Ban a member
\`/timeout @user [duration] [reason]\` — Mute a member
\`/warn @user [reason]\` — Warn a member
\`/purge [amount] [@user]\` — Delete messages`,
            inline: false,
          },
          {
            name: '🤖 Auto-Moderation (Mods Only)',
            value: `\`/automod enable\` — Turn on auto-moderation
\`/automod disable\` — Turn off auto-moderation
\`/automod add-word [word]\` — Ban a word
\`/automod remove-word [word]\` — Unban a word
\`/automod status\` — View auto-mod settings`,
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#00d4ff')
        .addFields(
          {
            name: '🎫 Support (All Users)',
            value: `\`/ticket create [subject]\` — Open a support ticket`,
            inline: false,
          },
          {
            name: '🎫 Support Management (Mods Only)',
            value: `\`/ticket close\` — Close a support ticket (in ticket channel)`,
            inline: false,
          },
          {
            name: '📢 Announcements (Mods Only)',
            value: `\`/stream-starting [time] [url]\` — Announce stream start time`,
            inline: false,
          },
          {
            name: '💡 Tips',
            value: `• Welcome messages support \`{user}\` placeholder
• Auto-mod warning escalation: 1st → delete, 2nd → timeout, 3rd → ban
• Music requests from Twitch chat: \`!play [song]\`
• Gaming queue visible on OBS overlay at special URL`,
            inline: false,
          }
        ),
    ];

    await interaction.reply({
      embeds,
      ephemeral: true,
    });
  },
};

export default command;
