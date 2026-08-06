import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../../utils/types.js';
import { logger } from '../../utils/logger.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('dadjoke')
    .setDescription('Get a random dad joke'),

  execute: async (interaction: CommandInteraction) => {
    try {
      const response = await fetch('https://icanhazdadjoke.com/', {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        await interaction.reply('Failed to fetch a joke. Try again later!');
        return;
      }

      const data = (await response.json()) as { joke: string };

      await interaction.reply(`😄 ${data.joke}`);
    } catch (error) {
      logger.error('DadJoke', 'Failed to fetch joke', error);
      await interaction.reply('Something went wrong while fetching a joke.');
    }
  },
};

export default command;
