import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
  Interaction,
  ActivityType,
} from 'discord.js';
import { env, validateEnv } from './utils/env.js';
import { logger } from './utils/logger.js';
import { loadCommands } from './utils/commandLoader.js';
import { Command } from './utils/types.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

(client as any).commands = new Collection<string, Command>();

async function registerCommands() {
  try {
    const commands = await loadCommands();

    (client as any).commands = new Collection();

    const commandData = commands.map((cmd) => cmd.data.toJSON());

    for (const command of commands) {
      (client as any).commands.set(command.data.name, command);
    }

    const rest = new REST().setToken(env.discordToken);

    logger.info('Bot', `Registering ${commands.length} command(s)...`);

    const data = (await rest.put(Routes.applicationCommands(env.discordClientId), {
      body: commandData,
    })) as any;

    logger.info('Bot', `Successfully registered ${data.length} command(s).`);
  } catch (error) {
    logger.error('Bot', 'Failed to register commands', error);
    process.exit(1);
  }
}

client.once('ready', async () => {
  logger.info('Bot', `Logged in as ${client.user?.tag}`);
  logger.info('Bot', `Connected to ${client.guilds.cache.size} guild(s)`);
  if (client.user) {
    await client.user.setActivity('your stream | /ping', { type: ActivityType.Watching });
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = (client as any).commands.get(interaction.commandName);

  if (!command) {
    logger.warn('Bot', `Unknown command: ${interaction.commandName}`);
    await interaction.reply({
      content: "That command doesn't exist!",
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error('Bot', `Error executing ${interaction.commandName}`, error);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true,
    });
  }
});

async function start() {
  try {
    validateEnv();
    logger.info('Bot', 'Environment validation passed');

    await registerCommands();
    await client.login(env.discordToken);
  } catch (error) {
    logger.error('Bot', 'Failed to start bot', error);
    process.exit(1);
  }
}

start();
