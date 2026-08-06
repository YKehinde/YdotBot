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
};
