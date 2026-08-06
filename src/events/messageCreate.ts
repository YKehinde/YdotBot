import { Message } from 'discord.js';
import { automodService } from '../services/automodService.js';
import { configService } from '../services/configService.js';
import { logModAction } from '../services/moderationService.js';
import { logger } from '../utils/logger.js';

export async function handleMessageCreate(message: Message) {
  if (message.author.bot || !message.guild) return;

  try {
    const violations = automodService.checkMessage(
      message.author.id,
      message.guild.id,
      message.content
    );

    if (violations.length === 0) return;

    const highSeverity = violations.some((v) => v.severity === 'high');
    const mediumSeverity = violations.some((v) => v.severity === 'medium');

    const reason = violations.map((v) => v.reason).join('; ');
    const warningCount = configService.addWarning(message.author.id, message.guild.id);

    await logModAction(message.guild, {
      action: 'warn',
      targetUser: message.author,
      moderator: message.client.user!,
      reason: `[AUTO-MOD] ${reason}`,
    });

    try {
      await message.delete();
    } catch (error) {
      logger.warn('MessageCreate', 'Failed to delete message', error);
    }

    let action = '';

    if (highSeverity && warningCount >= 3) {
      try {
        await message.member?.ban({ reason: `Auto-mod escalation: ${warningCount} warnings` });
        action = 'banned';
      } catch (error) {
        logger.error('MessageCreate', 'Failed to ban user', error);
      }
    } else if (highSeverity && warningCount >= 2) {
      try {
        await message.member?.timeout(300000, `Auto-mod escalation: ${warningCount} warnings`);
        action = 'timed out for 5 minutes';
      } catch (error) {
        logger.error('MessageCreate', 'Failed to timeout user', error);
      }
    } else if (mediumSeverity && warningCount >= 2) {
      try {
        await message.member?.timeout(60000, `Auto-mod escalation: ${warningCount} warnings`);
        action = 'timed out for 1 minute';
      } catch (error) {
        logger.error('MessageCreate', 'Failed to timeout user', error);
      }
    }

    const reply = action
      ? `⚠️ ${message.author}, your message was deleted. ${action.toUpperCase()}. (Warnings: ${warningCount})`
      : `⚠️ ${message.author}, your message was deleted. (Warnings: ${warningCount})`;

    if (!message.channel.isDMBased()) {
      const msg = await message.channel.send(reply);
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    }
  } catch (error) {
    logger.error('MessageCreate', 'Error in auto-mod handler', error);
  }
}
