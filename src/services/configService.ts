import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface GuildConfig {
  guildId: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  modLogChannelId?: string;
  twitchAnnounceChannelId?: string;
  automodEnabled?: boolean;
  automodSpamEnabled?: boolean;
  automodCapsEnabled?: boolean;
  automodLinksEnabled?: boolean;
  automodWordsEnabled?: boolean;
  bannedWords?: string[];
  spamThreshold?: number;
  capsThreshold?: number;
}

export interface UserWarnings {
  userId: string;
  guildId: string;
  count: number;
  lastWarningAt?: number;
}

const DATA_DIR = './data';
const CONFIG_FILE = path.join(DATA_DIR, 'guilds.json');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

function loadConfigs(): Map<string, GuildConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return new Map();
    }
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    const configs = JSON.parse(data) as Record<string, GuildConfig>;
    return new Map(Object.entries(configs));
  } catch (error) {
    logger.error('ConfigService', 'Failed to load configs', error);
    return new Map();
  }
}

function saveConfigs(configs: Map<string, GuildConfig>) {
  try {
    const obj = Object.fromEntries(configs);
    writeFileSync(CONFIG_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    logger.error('ConfigService', 'Failed to save configs', error);
  }
}

let configs = loadConfigs();
const warnings = new Map<string, UserWarnings>();

export const configService = {
  async init() {
    await ensureDataDir();
    configs = loadConfigs();
    logger.info('ConfigService', `Loaded config for ${configs.size} guild(s)`);
  },

  getConfig(guildId: string): GuildConfig {
    return configs.get(guildId) || { guildId };
  },

  setWelcomeChannel(guildId: string, channelId: string | null) {
    const config = this.getConfig(guildId);
    if (channelId) {
      config.welcomeChannelId = channelId;
    } else {
      delete config.welcomeChannelId;
    }
    configs.set(guildId, config);
    saveConfigs(configs);
    logger.info('ConfigService', `Set welcome channel for guild ${guildId}`);
  },

  setWelcomeMessage(guildId: string, message: string) {
    const config = this.getConfig(guildId);
    config.welcomeMessage = message;
    configs.set(guildId, config);
    saveConfigs(configs);
    logger.info('ConfigService', `Set welcome message for guild ${guildId}`);
  },

  setModLogChannel(guildId: string, channelId: string | null) {
    const config = this.getConfig(guildId);
    if (channelId) {
      config.modLogChannelId = channelId;
    } else {
      delete config.modLogChannelId;
    }
    configs.set(guildId, config);
    saveConfigs(configs);
  },

  setTwitchAnnounceChannel(guildId: string, channelId: string | null) {
    const config = this.getConfig(guildId);
    if (channelId) {
      config.twitchAnnounceChannelId = channelId;
    } else {
      delete config.twitchAnnounceChannelId;
    }
    configs.set(guildId, config);
    saveConfigs(configs);
  },

  enableAutomod(guildId: string) {
    const config = this.getConfig(guildId);
    config.automodEnabled = true;
    config.automodSpamEnabled = true;
    config.automodCapsEnabled = true;
    config.automodLinksEnabled = true;
    config.automodWordsEnabled = true;
    config.spamThreshold = config.spamThreshold || 5;
    config.capsThreshold = config.capsThreshold || 70;
    config.bannedWords = config.bannedWords || [];
    configs.set(guildId, config);
    saveConfigs(configs);
  },

  disableAutomod(guildId: string) {
    const config = this.getConfig(guildId);
    config.automodEnabled = false;
    configs.set(guildId, config);
    saveConfigs(configs);
  },

  setBannedWords(guildId: string, words: string[]) {
    const config = this.getConfig(guildId);
    config.bannedWords = words.map((w) => w.toLowerCase());
    configs.set(guildId, config);
    saveConfigs(configs);
  },

  getBannedWords(guildId: string): string[] {
    const config = this.getConfig(guildId);
    return config.bannedWords || [];
  },

  addWarning(userId: string, guildId: string): number {
    const key = `${guildId}-${userId}`;
    const userWarnings = warnings.get(key) || { userId, guildId, count: 0 };
    userWarnings.count += 1;
    userWarnings.lastWarningAt = Date.now();
    warnings.set(key, userWarnings);
    return userWarnings.count;
  },

  getWarnings(userId: string, guildId: string): number {
    const key = `${guildId}-${userId}`;
    return warnings.get(key)?.count || 0;
  },

  clearWarnings(userId: string, guildId: string) {
    const key = `${guildId}-${userId}`;
    warnings.delete(key);
  },
};
