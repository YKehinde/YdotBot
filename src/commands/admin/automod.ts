import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { configService } from '../../services/configService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable auto-moderation for this server')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable auto-moderation for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-word')
        .setDescription('Add a word to the banned words list')
        .addStringOption((opt) =>
          opt
            .setName('word')
            .setDescription('Word to ban')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-word')
        .setDescription('Remove a word from the banned words list')
        .addStringOption((opt) =>
          opt
            .setName('word')
            .setDescription('Word to unban')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list-words').setDescription('List all banned words')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('View auto-mod status and settings')
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'enable') {
      configService.enableAutomod(interaction.guildId);
      await interaction.reply({
        content: '✅ Auto-moderation enabled for this server.',
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'disable') {
      configService.disableAutomod(interaction.guildId);
      await interaction.reply({
        content: '✅ Auto-moderation disabled for this server.',
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'add-word') {
      const word = interaction.options.getString('word', true);
      const words = configService.getBannedWords(interaction.guildId);
      if (!words.includes(word.toLowerCase())) {
        words.push(word.toLowerCase());
        configService.setBannedWords(interaction.guildId, words);
        await interaction.reply({
          content: `✅ Added "${word}" to banned words.`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: `"${word}" is already banned.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (subcommand === 'remove-word') {
      const word = interaction.options.getString('word', true);
      let words = configService.getBannedWords(interaction.guildId);
      words = words.filter((w) => w !== word.toLowerCase());
      configService.setBannedWords(interaction.guildId, words);
      await interaction.reply({
        content: `✅ Removed "${word}" from banned words.`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'list-words') {
      const words = configService.getBannedWords(interaction.guildId);
      if (words.length === 0) {
        await interaction.reply({
          content: 'No banned words configured.',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: `**Banned words:** ${words.join(', ')}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (subcommand === 'status') {
      const config = configService.getConfig(interaction.guildId);
      const status = config.automodEnabled ? '✅ Enabled' : '❌ Disabled';
      const words = configService.getBannedWords(interaction.guildId);

      await interaction.reply({
        content: `**Auto-Moderation Status**
Status: ${status}
Spam Filter: ${config.automodSpamEnabled ? '✅' : '❌'} (threshold: ${config.spamThreshold || 5}/5s)
Caps Filter: ${config.automodCapsEnabled ? '✅' : '❌'} (threshold: ${config.capsThreshold || 70}%)
Links Filter: ${config.automodLinksEnabled ? '✅' : '❌'}
Banned Words Filter: ${config.automodWordsEnabled ? '✅' : '❌'} (${words.length} words)

⚠️ Escalation: 1 warning → message deleted, 2 warnings → timeout, 3 warnings → ban`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
