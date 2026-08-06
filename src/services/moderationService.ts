import {
  Guild,
  TextChannel,
  EmbedBuilder,
  User,
  ColorResolvable,
} from 'discord.js';
import { configService } from './configService.js';
import { logger } from '../utils/logger.js';

export interface ModAction {
  action: 'kick' | 'ban' | 'timeout' | 'warn' | 'purge';
  targetUser?: User;
  moderator: User;
  reason?: string;
  duration?: string;
  messageCount?: number;
}

export async function logModAction(guild: Guild, modAction: ModAction) {
  try {
    const config = configService.getConfig(guild.id);

    if (!config.modLogChannelId) {
      return;
    }

    const channel = guild.channels.cache.get(config.modLogChannelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.warn(
        'ModerationService',
        `Mod-log channel ${config.modLogChannelId} not found in guild ${guild.id}`
      );
      return;
    }

    const actionColors: Record<string, ColorResolvable> = {
      kick: '#FFA500',
      ban: '#FF0000',
      timeout: '#FFD700',
      warn: '#FFFF00',
      purge: '#808080',
    };

    const actionEmojis: Record<string, string> = {
      kick: '🦶',
      ban: '🔨',
      timeout: '⏱️',
      warn: '⚠️',
      purge: '🗑️',
    };

    const embed = new EmbedBuilder()
      .setColor(actionColors[modAction.action] as ColorResolvable)
      .setTitle(`${actionEmojis[modAction.action]} ${modAction.action.toUpperCase()}`)
      .setAuthor({
        name: modAction.moderator.tag,
        iconURL: modAction.moderator.displayAvatarURL(),
      })
      .setTimestamp();

    if (modAction.targetUser) {
      embed.addFields({
        name: 'User',
        value: `${modAction.targetUser.tag} (${modAction.targetUser.id})`,
        inline: true,
      });
    }

    if (modAction.reason) {
      embed.addFields({
        name: 'Reason',
        value: modAction.reason,
        inline: false,
      });
    }

    if (modAction.duration) {
      embed.addFields({
        name: 'Duration',
        value: modAction.duration,
        inline: true,
      });
    }

    if (modAction.messageCount) {
      embed.addFields({
        name: 'Messages Deleted',
        value: modAction.messageCount.toString(),
        inline: true,
      });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('ModerationService', 'Failed to log moderation action', error);
  }
}
