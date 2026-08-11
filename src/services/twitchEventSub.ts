import WebSocket from 'ws';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { twitchApiService } from './twitchApiService.js';

interface EventSubMessage {
  metadata: {
    message_id: string;
    message_type: 'session_welcome' | 'notification' | 'session_keepalive' | 'session_reconnect' | 'revocation';
    message_timestamp: string;
    subscription_type?: string;
  };
  payload: {
    session?: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: number;
      reconnect_url?: string;
    };
    subscription?: {
      id: string;
      type: string;
      version: string;
      status: string;
      created_at: string;
      cost: number;
      condition: Record<string, string>;
      transport: {
        method: string;
        session_id: string;
      };
    };
    event?: Record<string, any>;
  };
}

const MAX_RECONNECT_DELAY_MS = 30000;

let ws: WebSocket | null = null;
let sessionId: string | null = null;
let twitchUserId: string | null = null;
let reconnectUrl: string | null = null;
let heartbeatTimeout: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let intentionalDisconnect = false;
let onStreamOnline: ((event: any) => void) | null = null;
let onSubscriptionGift: ((event: any) => void) | null = null;

function scheduleReconnect() {
  if (reconnectTimeout) return;

  const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS);
  reconnectAttempts += 1;
  logger.warn('TwitchEventSub', `Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, delay);
}

function resetHeartbeatTimeout() {
  if (heartbeatTimeout) clearTimeout(heartbeatTimeout);

  heartbeatTimeout = setTimeout(() => {
    logger.warn('TwitchEventSub', 'Heartbeat timeout, reconnecting...');
    disconnect();
    connect();
  }, 15000);
}

async function subscribeToStreamOnline() {
  if (!twitchUserId) {
    logger.error('TwitchEventSub', 'No Twitch user ID available for subscription');
    return;
  }

  try {
    const token = await (await import('./twitchApiService.js')).twitchApiService
      .getUserByLogin(env.twitchChannel)
      .catch(() => null);

    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Client-ID': env.twitchClientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'stream.online',
        version: '1',
        condition: {
          broadcaster_user_id: twitchUserId,
        },
        transport: {
          method: 'websocket',
          session_id: sessionId,
        },
      }),
    });

    if (response.ok) {
      logger.info('TwitchEventSub', `Subscribed to stream.online for ${env.twitchChannel}`);
    } else {
      logger.warn(
        'TwitchEventSub',
        `Failed to subscribe to stream.online: ${response.statusText}`
      );
    }
  } catch (error) {
    logger.error('TwitchEventSub', 'Failed to subscribe to stream.online', error);
  }
}

async function subscribeToSubscriptionGift() {
  if (!twitchUserId) {
    logger.error('TwitchEventSub', 'No Twitch user ID available for subscription');
    return;
  }

  try {
    const token = await (await import('./twitchApiService.js')).twitchApiService
      .getUserByLogin(env.twitchChannel)
      .catch(() => null);

    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Client-ID': env.twitchClientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.subscription.gift',
        version: '1',
        condition: {
          broadcaster_user_id: twitchUserId,
        },
        transport: {
          method: 'websocket',
          session_id: sessionId,
        },
      }),
    });

    if (response.ok) {
      logger.info('TwitchEventSub', `Subscribed to channel.subscription.gift for ${env.twitchChannel}`);
    } else {
      logger.warn(
        'TwitchEventSub',
        `Failed to subscribe to channel.subscription.gift: ${response.statusText}`
      );
    }
  } catch (error) {
    logger.error('TwitchEventSub', 'Failed to subscribe to channel.subscription.gift', error);
  }
}

function handleMessage(data: string) {
  try {
    const message = JSON.parse(data) as EventSubMessage;

    if (message.metadata.message_type === 'session_welcome') {
      sessionId = message.payload.session!.id;
      reconnectAttempts = 0;
      logger.info('TwitchEventSub', `Connected to EventSub (session: ${sessionId})`);
      resetHeartbeatTimeout();
      subscribeToStreamOnline();
      subscribeToSubscriptionGift();
    } else if (message.metadata.message_type === 'notification') {
      resetHeartbeatTimeout();
      if (message.metadata.subscription_type === 'stream.online' && onStreamOnline) {
        onStreamOnline(message.payload.event);
      }
      if (message.metadata.subscription_type === 'channel.subscription.gift' && onSubscriptionGift) {
        onSubscriptionGift(message.payload.event);
      }
    } else if (message.metadata.message_type === 'session_keepalive') {
      resetHeartbeatTimeout();
    } else if (message.metadata.message_type === 'session_reconnect') {
      reconnectUrl = message.payload.session?.reconnect_url || null;
      if (reconnectUrl) {
        logger.info('TwitchEventSub', 'Reconnect requested, reconnecting...');
        disconnect();
        connect();
      }
    }
  } catch (error) {
    logger.error('TwitchEventSub', 'Failed to parse message', error);
  }
}

export const twitchEventSub = {
  async connect() {
    intentionalDisconnect = false;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    try {
      const user = await twitchApiService.getUserByLogin(env.twitchChannel);
      if (!user) {
        logger.error('TwitchEventSub', `Could not find Twitch user ${env.twitchChannel}`);
        scheduleReconnect();
        return;
      }

      twitchUserId = user.id;

      ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

      ws.on('open', () => {
        logger.info('TwitchEventSub', 'WebSocket connected');
      });

      ws.on('message', handleMessage);

      ws.on('error', (error) => {
        logger.error('TwitchEventSub', 'WebSocket error', error);
      });

      ws.on('close', () => {
        logger.warn('TwitchEventSub', 'WebSocket disconnected');
        if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
        ws = null;
        if (!intentionalDisconnect) scheduleReconnect();
      });
    } catch (error) {
      logger.error('TwitchEventSub', 'Failed to connect to EventSub', error);
      scheduleReconnect();
    }
  },

  disconnect() {
    intentionalDisconnect = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
  },

  onStreamOnline(callback: (event: any) => void) {
    onStreamOnline = callback;
  },

  onSubscriptionGift(callback: (event: any) => void) {
    onSubscriptionGift = callback;
  },

  isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN;
  },
};

const connect = twitchEventSub.connect;
const disconnect = twitchEventSub.disconnect;
