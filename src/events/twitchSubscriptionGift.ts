import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { twitchChatService } from '../services/twitchChatService.js';

export async function handleSubscriptionGift(event: any) {
  try {
    const gifter = event.user_login;
    const total = event.total;

    if (total >= 5) {
      const message = `🎁 Big thanks to @${gifter} for gifting ${total} subs to the community! Go check them out!`;
      await twitchChatService.say(env.twitchChannel, message);
      logger.info('TwitchSubscriptionGift', `Shoutout: @${gifter} gifted ${total} subs`);
    }
  } catch (error) {
    logger.error('TwitchSubscriptionGift', 'Failed to handle subscription gift', error);
  }
}
