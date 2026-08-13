import {
  SlashCommandBuilder,
  CommandInteraction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../utils/types.js';
import { logModAction } from '../../services/moderationService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages from the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Only delete messages from this user')
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!(interaction instanceof ChatInputCommandInteraction) || !interaction.guildId) return;

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');

    if (interaction.channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: 'This command can only be used in text channels.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 100 });

      let toDelete = Array.from(messages.values());
      if (targetUser) {
        toDelete = toDelete.filter((msg) => msg.author.id === targetUser.id);
      }
      toDelete = toDelete.slice(0, amount);

      const deleted = await channel.bulkDelete(toDelete, true);

      await logModAction(interaction.guild!, {
        action: 'purge',
        moderator: interaction.user,
        messageCount: deleted.size,
      });

      await interaction.reply({
        content: `✅ Deleted ${deleted.size} message(s).`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content: 'Failed to delete messages.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
