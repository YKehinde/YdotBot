import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface UserLevel {
  userId: string;
  guildId: string;
  xp: number;
  level: number;
}

const DATA_DIR = './data';
const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');
const XP_PER_LEVEL = 100;

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

function loadLevels(): Map<string, UserLevel> {
  try {
    if (!existsSync(LEVELS_FILE)) {
      return new Map();
    }
    const data = readFileSync(LEVELS_FILE, 'utf-8');
    const levels = JSON.parse(data) as Record<string, UserLevel>;
    return new Map(Object.entries(levels));
  } catch (error) {
    logger.error('LevelingService', 'Failed to load levels', error);
    return new Map();
  }
}

function saveLevels(levels: Map<string, UserLevel>) {
  try {
    const obj = Object.fromEntries(levels);
    writeFileSync(LEVELS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    logger.error('LevelingService', 'Failed to save levels', error);
  }
}

let levels = loadLevels();

function getKey(userId: string, guildId: string): string {
  return `${guildId}-${userId}`;
}

function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL);
}

export const levelingService = {
  async init() {
    await ensureDataDir();
    levels = loadLevels();
    logger.info('LevelingService', `Loaded levels for ${levels.size} user(s)`);
  },

  addXP(userId: string, guildId: string, amount: number): { newLevel: boolean; currentLevel: number } {
    const key = getKey(userId, guildId);
    const userLevel = levels.get(key) || { userId, guildId, xp: 0, level: 0 };

    const oldLevel = userLevel.level;
    userLevel.xp += amount;
    userLevel.level = calculateLevel(userLevel.xp);

    levels.set(key, userLevel);
    saveLevels(levels);

    const leveledUp = userLevel.level > oldLevel;

    return {
      newLevel: leveledUp,
      currentLevel: userLevel.level,
    };
  },

  getLevel(userId: string, guildId: string): UserLevel | null {
    const key = getKey(userId, guildId);
    return levels.get(key) || null;
  },

  getLeaderboard(guildId: string, limit: number = 10): UserLevel[] {
    const guildLevels = Array.from(levels.values())
      .filter((u) => u.guildId === guildId)
      .sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }
        return b.xp - a.xp;
      })
      .slice(0, limit);

    return guildLevels;
  },

  getRank(userId: string, guildId: string): number | null {
    const leaderboard = this.getLeaderboard(guildId, 1000);
    const rankIndex = leaderboard.findIndex((u) => u.userId === userId);

    return rankIndex === -1 ? null : rankIndex + 1;
  },
};
