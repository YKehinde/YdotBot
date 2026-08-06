import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../../utils/types.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Respond with pong!'),
  execute: async (interaction: CommandInteraction) => {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true,
    });

    const latency =
      sent.createdTimestamp - interaction.createdTimestamp ||
      interaction.client.ws.ping;

    await interaction.editReply(
      `Pong! 🏓 Latency is ${latency}ms. WS ping is ${Math.round(interaction.client.ws.ping)}ms`
    );
  },
};

export default command;
