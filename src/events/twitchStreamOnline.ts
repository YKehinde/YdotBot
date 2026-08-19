import { Client, TextChannel } from 'discord.js';
import { twitchApiService } from '../services/twitchApiService.js';
import { configService } from '../services/configService.js';
import { logger } from '../utils/logger.js';

export async function handleTwitchStreamOnline(client: Client, event: any) {
  try {
    const broadcasterUserId = event.broadcaster_user_id;
    const broadcasterLogin = event.broadcaster_user_login;

    logger.info('TwitchStreamOnline', `${broadcasterLogin} went live!`);

    const stream = await twitchApiService.getStreamInfo(broadcasterUserId);

    if (!stream) {
      logger.warn('TwitchStreamOnline', 'Could not fetch stream info');
      return;
    }

    const content = `🔴 **${stream.user_name}** is live on Twitch!\n@everyone\nhttps://twitch.tv/${stream.user_login}`;

    for (const guild of client.guilds.cache.values()) {
      const config = configService.getConfig(guild.id);

      if (!config.twitchAnnounceChannelId) {
        continue;
      }

      const channel = guild.channels.cache.get(config.twitchAnnounceChannelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.warn(
          'TwitchStreamOnline',
          `Announcement channel ${config.twitchAnnounceChannelId} not found in guild ${guild.id}`
        );
        continue;
      }

      try {
        await channel.send({ content });
      } catch (error) {
        logger.error(
          'TwitchStreamOnline',
          `Failed to send announcement in guild ${guild.id}`,
          error
        );
      }
    }
  } catch (error) {
    logger.error('TwitchStreamOnline', 'Failed to handle stream.online event', error);
  }
}
