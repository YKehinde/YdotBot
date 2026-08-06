import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { twitchApiService } from '../services/twitchApiService.js';
import { configService } from '../services/configService.js';
import { env } from '../utils/env.js';
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

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle(`🔴 ${stream.user_name} is now live on Twitch!`)
      .setDescription(stream.title)
      .addFields(
        {
          name: 'Game',
          value: stream.game_name || 'No category',
          inline: true,
        },
        {
          name: 'Viewers',
          value: stream.viewer_count.toString(),
          inline: true,
        }
      )
      .setImage(stream.thumbnail_url)
      .setURL(`https://twitch.tv/${stream.user_login}`)
      .setTimestamp();

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
        await channel.send({ embeds: [embed] });
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
