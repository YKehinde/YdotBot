import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
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
            name: '👥 Community Commands (Discord)',
            value: `\`/rank me\` — View your level and rank
\`/rank leaderboard\` — See top 10 members
\`/dadjoke\` — Get a random dad joke
\`/ping\` — Check bot latency`,
            inline: false,
          },
          {
            name: '🎫 Support (Discord)',
            value: `\`/ticket create [subject]\` — Open a support ticket
\`/ticket close\` — Close a support ticket (mods only, in ticket channel)`,
            inline: false,
          },
          {
            name: '🎮 Gaming Queue (Twitch Chat, all viewers)',
            value: `\`!join\` — Add yourself to the gaming queue
\`!leave\` — Remove yourself from the queue
\`!queue\` — View the gaming queue (top 5)`,
            inline: false,
          },
          {
            name: '💬 Community Commands (Twitch Chat, all viewers)',
            value: `\`!discord\` — Post the Discord invite link
\`!so <username>\` — Shout out another streamer
\`!lurk\` — Let chat know you're lurking`,
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#00d4ff')
        .addFields(
          {
            name: '🎮 Gaming Queue Moderation (Twitch Chat, mods only)',
            value: `\`!next\` — Call next player and advance queue
\`!remove <username>\` — Remove someone from queue
\`!clear\` — Empty entire queue
\`!lock\` — Prevent new joins
\`!unlock\` — Allow new joins`,
            inline: false,
          },
          {
            name: '🚨 Moderation (Discord, mods only)',
            value: `\`/kick @user [reason]\` — Kick a member
\`/ban @user [reason] [delete_days]\` — Ban a member
\`/timeout @user [duration] [reason]\` — Mute a member
\`/warn @user [reason]\` — Warn a member
\`/purge [amount] [@user]\` — Delete messages`,
            inline: false,
          },
          {
            name: '🤖 Discord Auto-Moderation (mods only)',
            value: `\`/automod enable\` / \`disable\` — Toggle auto-moderation
\`/automod add-word [word]\` / \`remove-word [word]\` — Manage banned words
\`/automod list-words\` — List banned words
\`/automod status\` — View auto-mod settings`,
            inline: false,
          },
          {
            name: '🤖 Twitch Chat Auto-Moderation (mods only)',
            value: `\`/twitch-automod enable\` / \`disable\` — Toggle auto-moderation for Twitch chat
\`/twitch-automod add-word [word]\` / \`remove-word [word]\` — Manage banned words
\`/twitch-automod list-words\` — List banned words
\`/twitch-automod status\` — View auto-mod settings`,
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#00d4ff')
        .addFields(
          {
            name: '⚙️ Configuration (Discord, mods only)',
            value: `\`/set-welcome channel #channel\` — Set member welcome channel
\`/set-welcome message [text]\` — Set welcome message (\`{user}\` placeholder supported)
\`/set-welcome preview\` — Preview current welcome settings
\`/set-modlog channel #channel\` — Set mod-log channel
\`/set-modlog preview\` — Preview current modlog settings
\`/set-twitch-announce channel #channel\` — Set Twitch go-live announcement channel
\`/set-twitch-announce preview\` — Preview current Twitch announcement settings`,
            inline: false,
          },
          {
            name: '📢 Announcements (Discord, mods only)',
            value: `\`/stream-starting [time] [url]\` — Announce stream start time`,
            inline: false,
          },
          {
            name: '💡 Tips',
            value: `• Welcome messages support \`{user}\` placeholder
• Discord and Twitch auto-mod escalation: 1st → delete, 2nd → timeout, 3rd → ban
• Go-live announcements ping @everyone in the configured channel
• A reminder message posts in Twitch chat every 20 minutes while you're live
• New Twitch chatters get a one-time welcome greeting
• Gaming queue visible on OBS overlay at the configured overlay URL`,
            inline: false,
          }
        ),
    ];

    await interaction.reply({
      embeds,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
