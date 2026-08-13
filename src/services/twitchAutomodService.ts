import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import tmi from 'tmi.js';
import { logger } from '../utils/logger.js';

export type ViolationType = 'spam' | 'caps' | 'links' | 'banned_word';

export interface Violation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface TwitchAutomodConfig {
  enabled: boolean;
  spamEnabled: boolean;
  capsEnabled: boolean;
  linksEnabled: boolean;
  wordsEnabled: boolean;
  spamThreshold: number;
  capsThreshold: number;
  bannedWords: string[];
}

const DATA_DIR = './data';
const CONFIG_FILE = path.join(DATA_DIR, 'twitch-automod.json');

const DEFAULT_CONFIG: TwitchAutomodConfig = {
  enabled: false,
  spamEnabled: true,
  capsEnabled: false,
  linksEnabled: true,
  wordsEnabled: true,
  spamThreshold: 5,
  capsThreshold: 70,
  bannedWords: [],
};

let config: TwitchAutomodConfig = { ...DEFAULT_CONFIG };
const spamCache = new Map<string, number[]>();
const warnings = new Map<string, number>();

function loadConfig(): TwitchAutomodConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    logger.error('TwitchAutomodService', 'Failed to load config', error);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    logger.error('TwitchAutomodService', 'Failed to save config', error);
  }
}

function getSpamTimestamps(username: string): number[] {
  return spamCache.get(username) || [];
}

function recordSpamTimestamp(username: string) {
  const now = Date.now();
  const timestamps = getSpamTimestamps(username);
  timestamps.push(now);
  spamCache.set(username, timestamps);

  setTimeout(() => {
    const updated = getSpamTimestamps(username).filter((t) => now - t < 5000);
    if (updated.length === 0) {
      spamCache.delete(username);
    } else {
      spamCache.set(username, updated);
    }
  }, 5000);
}

function detectSpam(username: string, threshold: number): boolean {
  recordSpamTimestamp(username);
  return getSpamTimestamps(username).length >= threshold;
}

function detectExcessiveCaps(text: string, threshold: number): boolean {
  const letters = text.match(/[a-z]/gi) || [];
  if (letters.length < 5) return false;

  const caps = text.match(/[A-Z]/g) || [];
  const capsPercentage = (caps.length / letters.length) * 100;
  return capsPercentage >= threshold;
}

function detectLinks(text: string): boolean {
  return /(https?:\/\/|www\.)\S+/i.test(text);
}

function detectBannedWords(text: string, bannedWords: string[]): string | null {
  const lowerText = text.toLowerCase();

  for (const word of bannedWords) {
    if (lowerText.includes(word.toLowerCase())) {
      return word;
    }
  }

  return null;
}

function checkMessage(username: string, text: string): Violation[] {
  const violations: Violation[] = [];

  if (!config.enabled) {
    return violations;
  }

  if (config.spamEnabled && detectSpam(username, config.spamThreshold)) {
    violations.push({
      type: 'spam',
      severity: 'high',
      reason: `Sending messages too fast (${config.spamThreshold}+ in 5s)`,
    });
  }

  if (config.capsEnabled && detectExcessiveCaps(text, config.capsThreshold)) {
    violations.push({
      type: 'caps',
      severity: 'low',
      reason: `Excessive caps (>${config.capsThreshold}%)`,
    });
  }

  if (config.linksEnabled && detectLinks(text)) {
    violations.push({
      type: 'links',
      severity: 'medium',
      reason: 'Contains a link',
    });
  }

  if (config.wordsEnabled && config.bannedWords.length > 0) {
    const foundWord = detectBannedWords(text, config.bannedWords);
    if (foundWord) {
      violations.push({
        type: 'banned_word',
        severity: 'high',
        reason: `Contains banned word: ${foundWord}`,
      });
    }
  }

  return violations;
}

export const twitchAutomodService = {
  async init() {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    config = loadConfig();
    logger.info('TwitchAutomodService', `Loaded config (enabled: ${config.enabled})`);
  },

  getConfig(): TwitchAutomodConfig {
    return { ...config };
  },

  enable() {
    config.enabled = true;
    config.spamEnabled = true;
    config.capsEnabled = true;
    config.linksEnabled = true;
    config.wordsEnabled = true;
    saveConfig();
  },

  disable() {
    config.enabled = false;
    saveConfig();
  },

  setBannedWords(words: string[]) {
    config.bannedWords = words.map((w) => w.toLowerCase());
    saveConfig();
  },

  getBannedWords(): string[] {
    return config.bannedWords;
  },

  async moderate(
    client: tmi.Client,
    channel: string,
    userstate: tmi.ChatUserstate,
    message: string
  ): Promise<boolean> {
    const username = userstate.username!;
    const violations = checkMessage(username, message);

    if (violations.length === 0) return false;

    const highSeverity = violations.some((v) => v.severity === 'high');
    const mediumSeverity = violations.some((v) => v.severity === 'medium');
    const reason = violations.map((v) => v.reason).join('; ');

    const warningCount = (warnings.get(username) || 0) + 1;
    warnings.set(username, warningCount);

    logger.info('TwitchAutomodService', `[AUTO-MOD] @${username}: ${reason} (warning ${warningCount})`);

    const messageId = userstate.id;
    if (messageId) {
      try {
        await client.deletemessage(channel, messageId);
      } catch (error) {
        logger.warn('TwitchAutomodService', 'Failed to delete message', error);
      }
    }

    let action = '';

    if (highSeverity && warningCount >= 3) {
      try {
        await client.ban(channel, username, `Auto-mod escalation: ${warningCount} warnings`);
        action = 'banned';
      } catch (error) {
        logger.error('TwitchAutomodService', 'Failed to ban user', error);
      }
    } else if (highSeverity && warningCount >= 2) {
      try {
        await client.timeout(channel, username, 300, `Auto-mod escalation: ${warningCount} warnings`);
        action = 'timed out for 5 minutes';
      } catch (error) {
        logger.error('TwitchAutomodService', 'Failed to timeout user', error);
      }
    } else if (mediumSeverity && warningCount >= 2) {
      try {
        await client.timeout(channel, username, 60, `Auto-mod escalation: ${warningCount} warnings`);
        action = 'timed out for 1 minute';
      } catch (error) {
        logger.error('TwitchAutomodService', 'Failed to timeout user', error);
      }
    }

    const reply = action
      ? `@${username} your message was removed. ${action.toUpperCase()}. (Warnings: ${warningCount})`
      : `@${username} your message was removed. (Warnings: ${warningCount})`;

    try {
      await client.say(channel, reply);
    } catch (error) {
      logger.warn('TwitchAutomodService', 'Failed to send warning message', error);
    }

    return true;
  },

  clearWarnings(username: string) {
    warnings.delete(username);
  },
};
