import tmi from 'tmi.js';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { queueService } from './queueService.js';

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

function registerCommand(name: string, handler: CommandHandler, modsOnly = false) {
  commands.set(name, { handler, modsOnly });
}

async function handleMessage(channel: string, userstate: tmi.ChatUserstate, message: string) {
  if (!message.startsWith('!')) return;

  const parts = message.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const isMod = !!(userstate.mod || userstate['user-type'] === 'mod' || userstate.badges?.moderator);

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
        username: 'YdotBot',
        password: `oauth:${env.twitchClientSecret}`,
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

  getClient() {
    return client;
  },
};
