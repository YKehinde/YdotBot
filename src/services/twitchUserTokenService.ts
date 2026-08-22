import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const DATA_DIR = './data';
const TOKEN_FILE = path.join(DATA_DIR, 'twitch-user-token.json');

const REFRESH_MARGIN_MS = 10 * 60 * 1000;

let current: StoredToken | null = null;
let refreshTimer: NodeJS.Timeout | null = null;

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

function loadStoredToken(): StoredToken | null {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8')) as StoredToken;
  } catch (error) {
    logger.error('TwitchUserToken', 'Failed to read stored token', error);
    return null;
  }
}

async function saveStoredToken(token: StoredToken) {
  await ensureDataDir();
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf-8');
}

async function refresh(refreshToken: string): Promise<StoredToken> {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.twitchClientId,
      client_secret: env.twitchClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to refresh Twitch user token: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const token: StoredToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await saveStoredToken(token);
  return token;
}

function scheduleRefresh(token: StoredToken) {
  if (refreshTimer) clearTimeout(refreshTimer);

  const delay = Math.max(token.expiresAt - Date.now() - REFRESH_MARGIN_MS, 60_000);
  refreshTimer = setTimeout(async () => {
    try {
      current = await refresh(current!.refreshToken);
      logger.info('TwitchUserToken', 'Refreshed Twitch user access token');
      scheduleRefresh(current);
    } catch (error) {
      logger.error('TwitchUserToken', 'Scheduled refresh failed, will retry', error);
      refreshTimer = setTimeout(() => scheduleRefresh(current!), 60_000);
    }
  }, delay);
}

export const twitchUserTokenService = {
  async init() {
    const stored = loadStoredToken();
    const seedRefreshToken = stored?.refreshToken || env.twitchRefreshToken;

    if (!seedRefreshToken) {
      logger.error(
        'TwitchUserToken',
        'No TWITCH_REFRESH_TOKEN configured and no stored token found. Twitch chat login and gift-sub alerts will not work.'
      );
      return;
    }

    try {
      current = await refresh(seedRefreshToken);
      logger.info('TwitchUserToken', 'Twitch user access token ready');
      scheduleRefresh(current);
    } catch (error) {
      logger.error('TwitchUserToken', 'Failed to obtain initial Twitch user access token', error);
    }
  },

  async getAccessToken(): Promise<string> {
    if (current && current.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      return current.accessToken;
    }
    if (!current) {
      logger.error('TwitchUserToken', 'getAccessToken called before a token was available');
      return '';
    }
    try {
      current = await refresh(current.refreshToken);
      scheduleRefresh(current);
    } catch (error) {
      logger.error('TwitchUserToken', 'On-demand refresh failed, reusing last known token', error);
    }
    return current.accessToken;
  },

  isReady(): boolean {
    return current !== null;
  },
};
