import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

interface TwitchAccessToken {
  access_token: string;
  expires_at: number;
}

interface TwitchStream {
  id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
}

let accessToken: TwitchAccessToken | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken && accessToken.expires_at > Date.now()) {
    return accessToken.access_token;
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.twitchClientId,
        client_secret: env.twitchClientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    accessToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000 - 60000,
    };

    logger.info('TwitchApiService', 'Got new access token');
    return accessToken.access_token;
  } catch (error) {
    logger.error('TwitchApiService', 'Failed to get access token', error);
    throw error;
  }
}

async function getUserByLogin(login: string): Promise<TwitchUser | null> {
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
      headers: {
        'Client-ID': env.twitchClientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error('TwitchApiService', `Failed to get user ${login}: ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as any;
    return data.data[0] || null;
  } catch (error) {
    logger.error('TwitchApiService', `Failed to get user ${login}`, error);
    return null;
  }
}

async function getStreamInfo(userId: string): Promise<TwitchStream | null> {
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, {
      headers: {
        'Client-ID': env.twitchClientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.error('TwitchApiService', `Failed to get stream info: ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as any;
    return data.data[0] || null;
  } catch (error) {
    logger.error('TwitchApiService', 'Failed to get stream info', error);
    return null;
  }
}

export const twitchApiService = {
  getUserByLogin,
  getStreamInfo,
};
