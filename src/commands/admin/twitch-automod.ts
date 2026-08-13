import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { twitchAutomodService } from '../../services/twitchAutomodService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('twitch-automod')
    .setDescription('Configure auto-moderation for Twitch chat')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable auto-moderation for Twitch chat')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable auto-moderation for Twitch chat')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-word')
        .setDescription('Add a word to the banned words list')
        .addStringOption((opt) =>
          opt.setName('word').setDescription('Word to ban').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-word')
        .setDescription('Remove a word from the banned words list')
        .addStringOption((opt) =>
          opt.setName('word').setDescription('Word to unban').setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('list-words').setDescription('List all banned words'))
    .addSubcommand((sub) => sub.setName('status').setDescription('View auto-mod status and settings')) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction)) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'enable') {
      twitchAutomodService.enable();
      await interaction.reply({
        content:
          '✅ Twitch chat auto-moderation enabled. Make sure **YdotBot** is a moderator in your Twitch channel (`/mod YdotBot`), otherwise it cannot delete messages or time users out.',
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'disable') {
      twitchAutomodService.disable();
      await interaction.reply({
        content: '✅ Twitch chat auto-moderation disabled.',
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'add-word') {
      const word = interaction.options.getString('word', true);
      const words = twitchAutomodService.getBannedWords();
      if (!words.includes(word.toLowerCase())) {
        words.push(word.toLowerCase());
        twitchAutomodService.setBannedWords(words);
        await interaction.reply({ content: `✅ Added "${word}" to banned words.`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `"${word}" is already banned.`, flags: MessageFlags.Ephemeral });
      }
    } else if (subcommand === 'remove-word') {
      const word = interaction.options.getString('word', true);
      const words = twitchAutomodService.getBannedWords().filter((w) => w !== word.toLowerCase());
      twitchAutomodService.setBannedWords(words);
      await interaction.reply({ content: `✅ Removed "${word}" from banned words.`, flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'list-words') {
      const words = twitchAutomodService.getBannedWords();
      await interaction.reply({
        content: words.length === 0 ? 'No banned words configured.' : `**Banned words:** ${words.join(', ')}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'status') {
      const config = twitchAutomodService.getConfig();
      const status = config.enabled ? '✅ Enabled' : '❌ Disabled';

      await interaction.reply({
        content: `**Twitch Chat Auto-Moderation Status**
Status: ${status}
Spam Filter: ${config.spamEnabled ? '✅' : '❌'} (threshold: ${config.spamThreshold}/5s)
Caps Filter: ${config.capsEnabled ? '✅' : '❌'} (threshold: ${config.capsThreshold}%)
Links Filter: ${config.linksEnabled ? '✅' : '❌'}
Banned Words Filter: ${config.wordsEnabled ? '✅' : '❌'} (${config.bannedWords.length} words)

⚠️ Escalation: 1 warning → message deleted, 2 warnings → timeout, 3 warnings → ban
Mods and the broadcaster are always exempt.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
