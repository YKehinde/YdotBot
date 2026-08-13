import tmi from 'tmi.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { queueService } from './queueService.js';
import { twitchAutomodService } from './twitchAutomodService.js';

type CommandHandler = (
  channel: string,
  userstate: tmi.ChatUserstate,
  message: string,
  isMod: boolean
) => Promise<void>;

interface ChatCommand {
  handler: CommandHandler;
  modsOnly?: boolean;
}

const commands = new Map<string, ChatCommand>();
let client: tmi.Client | null = null;
const greetedUsers = new Set<string>();
let reminderInterval: NodeJS.Timeout | null = null;

const REMINDER_INTERVAL_MS = 20 * 60 * 1000;
const REMINDER_MESSAGE =
  "Thank you for watching the stream. If you're enjoying it, please give me a follow and come back whenever you can. I also appreciate everyone lurking";

function registerCommand(name: string, handler: CommandHandler, modsOnly = false) {
  commands.set(name, { handler, modsOnly });
}

async function handleMessage(channel: string, userstate: tmi.ChatUserstate, message: string) {
  const username = userstate.username!;

  // Ignore messages from the bot itself
  if (username.toLowerCase() === env.twitchChannel.toLowerCase()) return;

  const isMod = !!(userstate.mod || userstate['user-type'] === 'mod' || userstate.badges?.moderator);
  const isBroadcaster = userstate.badges?.broadcaster === '1';

  if (client && !isMod && !isBroadcaster) {
    const actioned = await twitchAutomodService.moderate(client, channel, userstate, message);
    if (actioned) return;
  }

  // First interaction greeting
  if (!greetedUsers.has(username) && !message.startsWith('!')) {
    greetedUsers.add(username);
    await client?.say(channel, `Hey @${username}, welcome to the stream! 👋`);
  }

  if (!message.startsWith('!')) return;

  const parts = message.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();

  const command = commands.get(cmd);
  if (!command) return;

  if (command.modsOnly && !isMod) {
    await client?.say(channel, `@${userstate.username} Only mods can use !${cmd}`);
    return;
  }

  try {
    await command.handler(channel, userstate, message, isMod);
  } catch (error) {
    logger.error('TwitchChatService', `Error handling !${cmd}`, error);
  }
}

export const twitchChatService = {
  async init() {
    client = new tmi.Client({
      identity: {
        username: env.twitchChannel,
        password: `oauth:${env.twitchOAuthToken}`,
      },
      channels: [env.twitchChannel],
    });

    client.on('connected', () => {
      logger.info('TwitchChatService', `Connected to ${env.twitchChannel}`);
    });

    client.on('message', handleMessage);

    client.on('disconnected', () => {
      logger.warn('TwitchChatService', 'Disconnected from Twitch chat');
    });

    registerCommand('queue', async (channel) => {
      const queue = queueService.getQueue(env.twitchChannel);
      const locked = queueService.isLocked(env.twitchChannel);

      if (queue.length === 0) {
        await client?.say(channel, 'Gaming queue is empty.');
        return;
      }

      const queueList = queue
        .slice(0, 5)
        .map((m, i) => `#${i + 1} ${m.username}`)
        .join(' → ');

      const status = locked ? ' [LOCKED]' : '';
      await client?.say(channel, `Queue${status}: ${queueList}${queue.length > 5 ? ` +${queue.length - 5}` : ''}`);
    });

    registerCommand('discord', async (channel) => {
      if (env.discordServerUrl) {
        await client?.say(channel, `🎮 Join our Discord: ${env.discordServerUrl}`);
      } else {
        await client?.say(
          channel,
          'Discord server link not configured. Contact the streamer!'
        );
      }
    });

    registerCommand('so', async (channel, userstate, message) => {
      const targetUser = message.slice(4).trim();

      if (!targetUser) {
        await client?.say(channel, `@${userstate.username} Usage: !so <username>`);
        return;
      }

      await client?.say(
        channel,
        `🎉 Big shoutout to @${targetUser}! Go check out their stream at https://twitch.tv/${targetUser.toLowerCase()}`
      );
    });

    registerCommand('lurk', async (channel, userstate) => {
      await client?.say(channel, `Thanks for lurking @${userstate.username}! 🤫 Appreciate you being here!`);
    });

    registerCommand('join', async (channel, userstate) => {
      const username = userstate.username!;
      const userId = userstate['user-id']!;

      const joined = queueService.join(channel, username, userId);

      if (joined) {
        const size = queueService.getSize(channel);
        await client?.say(
          channel,
          `@${username} joined the queue! You are #${size} in line. 📍`
        );
      } else if (queueService.isLocked(channel)) {
        await client?.say(channel, `@${username} The queue is currently locked.`);
      } else {
        await client?.say(channel, `@${username} You are already in the queue!`);
      }
    });

    registerCommand('leave', async (channel, userstate) => {
      const username = userstate.username!;
      const userId = userstate['user-id']!;

      const left = queueService.leave(channel, userId);

      if (left) {
        await client?.say(channel, `@${username} left the queue. 👋`);
      } else {
        await client?.say(channel, `@${username} You are not in the queue.`);
      }
    });

    registerCommand(
      'next',
      async (channel) => {
        const next = queueService.next(channel);

        if (next) {
          await client?.say(
            channel,
            `🎮 Next up: @${next.username}! Get ready! Good luck! monkaS`
          );
        } else {
          await client?.say(channel, 'The queue is empty!');
        }
      },
      true
    );

    registerCommand('queue', async (channel) => {
      const queue = queueService.getQueue(channel);

      if (queue.length === 0) {
        await client?.say(channel, 'The queue is empty!');
      } else if (queue.length <= 5) {
        const list = queue.map((m, i) => `#${i + 1} ${m.username}`).join(' → ');
        await client?.say(channel, `Queue: ${list}`);
      } else {
        const top5 = queue
          .slice(0, 5)
          .map((m, i) => `#${i + 1} ${m.username}`)
          .join(' → ');
        await client?.say(channel, `Queue (top 5): ${top5} ... +${queue.length - 5} more`);
      }
    });

    registerCommand(
      'remove',
      async (channel, userstate, message) => {
        const target = message.split(/\s+/)[1];

        if (!target) {
          await client?.say(channel, 'Usage: !remove <username>');
          return;
        }

        const queue = queueService.getQueue(channel);
        const member = queue.find((m) => m.username.toLowerCase() === target.toLowerCase());

        if (member) {
          queueService.remove(channel, member.userId);
          await client?.say(channel, `Removed @${member.username} from the queue.`);
        } else {
          await client?.say(channel, `@${target} is not in the queue.`);
        }
      },
      true
    );

    registerCommand(
      'clear',
      async (channel) => {
        queueService.clear(channel);
        await client?.say(channel, 'Queue cleared! 🗑️');
      },
      true
    );

    registerCommand(
      'lock',
      async (channel) => {
        queueService.lock(channel);
        await client?.say(channel, '🔒 Queue is now LOCKED. No new joins allowed.');
      },
      true
    );

    registerCommand(
      'unlock',
      async (channel) => {
        queueService.unlock(channel);
        await client?.say(channel, '🔓 Queue is now UNLOCKED. New joins allowed.');
      },
      true
    );

    await client.connect();
  },

  disconnect() {
    if (client) {
      client.disconnect();
      client = null;
    }
  },

  isConnected(): boolean {
    return client?.readyState?.() === 'OPEN' || false;
  },

  startPeriodicReminder(channel: string) {
    if (reminderInterval) return;
    reminderInterval = setInterval(() => {
      client?.say(channel, REMINDER_MESSAGE);
    }, REMINDER_INTERVAL_MS);
    logger.info('TwitchChatService', 'Started periodic reminder');
  },

  stopPeriodicReminder() {
    if (reminderInterval) {
      clearInterval(reminderInterval);
      reminderInterval = null;
      logger.info('TwitchChatService', 'Stopped periodic reminder');
    }
  },

  getClient() {
    return client;
  },

  async say(channel: string, message: string) {
    if (client) {
      await client.say(channel, message);
    }
  },
};
