import { GuildMember, TextChannel } from 'discord.js';
import { configService } from '../services/configService.js';
import { logger } from '../utils/logger.js';

export async function handleGuildMemberAdd(member: GuildMember) {
  try {
    const config = configService.getConfig(member.guild.id);

    if (!config.welcomeChannelId || !config.welcomeMessage) {
      return;
    }

    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.warn(
        'GuildMemberAdd',
        `Welcome channel ${config.welcomeChannelId} not found in guild ${member.guild.id}`
      );
      return;
    }

    const message = config.welcomeMessage.replace(/{user}/g, member.toString());

    await channel.send(message);
    logger.info(
      'GuildMemberAdd',
      `Sent welcome message to ${member.user.tag} in ${member.guild.name}`
    );
  } catch (error) {
    logger.error('GuildMemberAdd', `Failed to send welcome message`, error);
  }
}
